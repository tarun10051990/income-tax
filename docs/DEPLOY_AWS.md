# Deploying TaxFilr on AWS

Target layout (all in one region, e.g. `ap-south-1` Mumbai):

```
Route 53 ─► CloudFront (optional) ─► ALB (HTTPS, ACM cert)
                                       ├─ /api/*  ─► ECS Fargate: backend  (Spring Boot, :8080)
                                       └─ /*      ─► ECS Fargate: frontend (Next.js, :3000)
ECS backend ─► RDS MySQL 8 (private subnets)      ─ schema from backend/src/main/resources/db/mysql/schema.sql
            ─► EFS (uploaded documents)           ─ mounted at /app/data/documents
Secrets Manager: JWT_SECRET, DATABASE_PASSWORD     ECR: two images
```

A single EC2 instance running `docker compose` is also fine for a pilot; see "Option B" at the end.

## 0. Prerequisites

- AWS CLI v2 configured (`aws configure`), Docker installed locally.
- A domain in Route 53 (e.g. `taxfilr.in`) and an ACM certificate for `taxfilr.in` + `api.taxfilr.in`
  (or a single host with path routing — this guide uses two hostnames).

```bash
export AWS_REGION=ap-south-1
export ACCOUNT=$(aws sts get-caller-identity --query Account --output text)
```

## 1. Database: RDS MySQL 8

```bash
aws rds create-db-instance \
  --db-instance-identifier taxfilr-mysql \
  --engine mysql --engine-version 8.4 \
  --db-instance-class db.t4g.small \
  --allocated-storage 50 --storage-type gp3 --storage-encrypted \
  --master-username taxfilr_admin --master-user-password '<STRONG-PASSWORD>' \
  --db-name taxfilr \
  --vpc-security-group-ids <sg-db> --db-subnet-group-name <private-subnet-group> \
  --backup-retention-period 7 --no-publicly-accessible \
  --character-set-name utf8mb4
```

Security group `sg-db` must allow port 3306 **only** from the ECS tasks' security group.

Create the schema and an application user (from a bastion / Cloud9 / `aws ssm start-session` port-forward):

```bash
mysql -h taxfilr-mysql.xxxx.ap-south-1.rds.amazonaws.com -u taxfilr_admin -p \
  < backend/src/main/resources/db/mysql/schema.sql

mysql -h taxfilr-mysql.xxxx.ap-south-1.rds.amazonaws.com -u taxfilr_admin -p -e "
  CREATE USER 'taxfilr'@'%' IDENTIFIED BY '<APP-PASSWORD>';
  GRANT SELECT, INSERT, UPDATE, DELETE ON taxfilr.* TO 'taxfilr'@'%';
  FLUSH PRIVILEGES;"
```

`schema.sql` contains the `CREATE TABLE` statement for every table (41) plus all foreign keys and
unique indexes. The API runs with `SPRING_PROFILES_ACTIVE=mysql`, which uses `ddl-auto=validate`
— it refuses to start if the schema does not match the code, so the schema file is the single source
of truth. When you upgrade the application, apply the new `schema.sql` diff first.

## 2. Secrets

```bash
aws secretsmanager create-secret --name taxfilr/jwt-secret \
  --secret-string "$(openssl rand -base64 48)"
aws secretsmanager create-secret --name taxfilr/db-password \
  --secret-string '<APP-PASSWORD>'
```

## 3. Container images: ECR

```bash
aws ecr create-repository --repository-name taxfilr/backend
aws ecr create-repository --repository-name taxfilr/frontend
aws ecr get-login-password | docker login --username AWS --password-stdin $ACCOUNT.dkr.ecr.$AWS_REGION.amazonaws.com

# Backend
docker build -t $ACCOUNT.dkr.ecr.$AWS_REGION.amazonaws.com/taxfilr/backend:1.0.0 backend
docker push     $ACCOUNT.dkr.ecr.$AWS_REGION.amazonaws.com/taxfilr/backend:1.0.0

# Frontend — the public API URL is baked in at build time
docker build --build-arg NEXT_PUBLIC_API_URL=https://api.taxfilr.in/api \
  -t $ACCOUNT.dkr.ecr.$AWS_REGION.amazonaws.com/taxfilr/frontend:1.0.0 frontend
docker push $ACCOUNT.dkr.ecr.$AWS_REGION.amazonaws.com/taxfilr/frontend:1.0.0
```

Build on an x86_64 machine or pass `--platform linux/amd64` to match the Fargate task.

## 4. Document storage: EFS

Uploaded documents are written to `DOCUMENT_STORAGE_DIR`. Create an EFS file system in the same VPC
(mount targets in the private subnets, security group allowing NFS 2049 from the ECS tasks) and
mount it into the backend task at `/app/data/documents` (shown in the task definition below).

## 5. ECS Fargate

```bash
aws ecs create-cluster --cluster-name taxfilr
aws logs create-log-group --log-group-name /ecs/taxfilr-backend
aws logs create-log-group --log-group-name /ecs/taxfilr-frontend
```

Task execution role needs `AmazonECSTaskExecutionRolePolicy` plus `secretsmanager:GetSecretValue`
on the two secrets.

### Backend task definition (`backend-task.json`)

```json
{
  "family": "taxfilr-backend",
  "networkMode": "awsvpc",
  "requiresCompatibilities": ["FARGATE"],
  "cpu": "1024",
  "memory": "2048",
  "executionRoleArn": "arn:aws:iam::<ACCOUNT>:role/taxfilrTaskExecutionRole",
  "volumes": [
    { "name": "documents",
      "efsVolumeConfiguration": { "fileSystemId": "fs-xxxxxxxx", "transitEncryption": "ENABLED" } }
  ],
  "containerDefinitions": [{
    "name": "backend",
    "image": "<ACCOUNT>.dkr.ecr.ap-south-1.amazonaws.com/taxfilr/backend:1.0.0",
    "portMappings": [{ "containerPort": 8080 }],
    "mountPoints": [{ "sourceVolume": "documents", "containerPath": "/app/data/documents" }],
    "environment": [
      { "name": "SPRING_PROFILES_ACTIVE", "value": "mysql" },
      { "name": "DATABASE_URL",
        "value": "jdbc:mysql://taxfilr-mysql.xxxx.ap-south-1.rds.amazonaws.com:3306/taxfilr?useSSL=true&requireSSL=true&serverTimezone=UTC&characterEncoding=utf8" },
      { "name": "DATABASE_USERNAME", "value": "taxfilr" },
      { "name": "CORS_ALLOWED_ORIGINS", "value": "https://taxfilr.in,https://www.taxfilr.in" },
      { "name": "DOCUMENT_STORAGE_DIR", "value": "/app/data/documents" },
      { "name": "H2_CONSOLE_ENABLED", "value": "false" },
      { "name": "SEED_DEMO_USERS", "value": "false" }
    ],
    "secrets": [
      { "name": "JWT_SECRET",        "valueFrom": "arn:aws:secretsmanager:ap-south-1:<ACCOUNT>:secret:taxfilr/jwt-secret" },
      { "name": "DATABASE_PASSWORD", "valueFrom": "arn:aws:secretsmanager:ap-south-1:<ACCOUNT>:secret:taxfilr/db-password" }
    ],
    "healthCheck": {
      "command": ["CMD-SHELL", "curl -fs http://localhost:8080/api/public/cms || exit 1"],
      "interval": 30, "timeout": 5, "retries": 3, "startPeriod": 90
    },
    "logConfiguration": { "logDriver": "awslogs", "options": {
      "awslogs-group": "/ecs/taxfilr-backend", "awslogs-region": "ap-south-1", "awslogs-stream-prefix": "ecs" } }
  }]
}
```

First deployment only: set `SEED_DEMO_USERS=true` and add a `SEED_USER_PASSWORD` secret so the
staff accounts (`owner@taxfiler.in`, `admin@taxfiler.in`, …) are created; then redeploy with
seeding off. Staff sign in at `https://taxfilr.in/admin/login` and enrol MFA on first login.

### Frontend task definition (`frontend-task.json`)

```json
{
  "family": "taxfilr-frontend",
  "networkMode": "awsvpc",
  "requiresCompatibilities": ["FARGATE"],
  "cpu": "512",
  "memory": "1024",
  "executionRoleArn": "arn:aws:iam::<ACCOUNT>:role/taxfilrTaskExecutionRole",
  "containerDefinitions": [{
    "name": "frontend",
    "image": "<ACCOUNT>.dkr.ecr.ap-south-1.amazonaws.com/taxfilr/frontend:1.0.0",
    "portMappings": [{ "containerPort": 3000 }],
    "environment": [
      { "name": "CMS_API_URL", "value": "https://api.taxfilr.in/api" },
      { "name": "CMS_REVALIDATE_SECONDS", "value": "60" },
      { "name": "LEAD_WEBHOOK_URL", "value": "https://hooks.example.com/leads" }
    ],
    "logConfiguration": { "logDriver": "awslogs", "options": {
      "awslogs-group": "/ecs/taxfilr-frontend", "awslogs-region": "ap-south-1", "awslogs-stream-prefix": "ecs" } }
  }]
}
```

```bash
aws ecs register-task-definition --cli-input-json file://backend-task.json
aws ecs register-task-definition --cli-input-json file://frontend-task.json
```

### Load balancer

1. Create an internet-facing ALB in the public subnets, HTTPS :443 listener with the ACM cert,
   HTTP :80 redirect to HTTPS.
2. Target groups (type `ip`): `taxfilr-backend` port 8080, health check `/api/public/cms`;
   `taxfilr-frontend` port 3000, health check `/`.
3. Listener rules: host `api.taxfilr.in` → backend TG; default → frontend TG.

### Services

```bash
aws ecs create-service --cluster taxfilr --service-name backend \
  --task-definition taxfilr-backend --desired-count 2 --launch-type FARGATE \
  --network-configuration "awsvpcConfiguration={subnets=[<private-a>,<private-b>],securityGroups=[<sg-ecs>],assignPublicIp=DISABLED}" \
  --load-balancers "targetGroupArn=<backend-tg-arn>,containerName=backend,containerPort=8080" \
  --health-check-grace-period-seconds 120

aws ecs create-service --cluster taxfilr --service-name frontend \
  --task-definition taxfilr-frontend --desired-count 2 --launch-type FARGATE \
  --network-configuration "awsvpcConfiguration={subnets=[<private-a>,<private-b>],securityGroups=[<sg-ecs>],assignPublicIp=DISABLED}" \
  --load-balancers "targetGroupArn=<frontend-tg-arn>,containerName=frontend,containerPort=3000"
```

Private subnets need a NAT gateway (ECR pulls, Secrets Manager) or VPC endpoints for
`ecr.api`, `ecr.dkr`, `s3`, `logs`, `secretsmanager`.

## 6. DNS

Route 53 alias records: `taxfilr.in` and `www.taxfilr.in` → ALB, `api.taxfilr.in` → ALB.
Optionally front the frontend with CloudFront for caching of `/_next/static/*` and `/videos/*`.

## 7. Verify

```bash
curl https://api.taxfilr.in/api/public/cms           # {"success":true,...}
open https://taxfilr.in                              # marketing site
open https://taxfilr.in/admin/login                  # staff portal
open https://taxfilr.in/admin/cms                    # website content (after login) — click "Import bundled defaults"
```

## Upgrades

1. Apply any new statements from `schema.sql` to RDS (take a snapshot first).
2. Build/push new image tags, register new task-definition revisions, `aws ecs update-service --force-new-deployment`.

## Option B: single EC2 instance with docker compose (pilot)

```bash
# Ubuntu 22.04, t3.medium+, security group: 22 (your IP), 80/443
sudo apt-get update && sudo apt-get install -y docker.io docker-compose-v2 git
git clone https://github.com/tarun10051990/income-tax.git && cd income-tax
cat > .env <<EOF
JWT_SECRET=$(openssl rand -base64 48)
DATABASE_PASSWORD=<APP-PASSWORD>
MYSQL_ROOT_PASSWORD=<ROOT-PASSWORD>
NEXT_PUBLIC_API_URL=https://<your-domain>/api
CORS_ALLOWED_ORIGINS=https://<your-domain>
SEED_DEMO_USERS=true
SEED_USER_PASSWORD=<INITIAL-STAFF-PASSWORD>
EOF
sudo docker compose up -d --build
```

The compose file starts MySQL 8 (applying `schema.sql` on first boot), the API on :8080 and the
site on :3000. Put nginx or Caddy in front for TLS, proxying `/api/` to :8080 and everything else
to :3000. After the first start, set `SEED_DEMO_USERS=false` and `docker compose up -d`.
