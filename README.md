# TaxFilr — Indian Income Tax and GST filing platform

Two portals over one API: a customer portal where taxpayers prepare income tax returns and GST
returns, and a staff portal where a practice reviews, queries, files and reports on those cases.

## Features

### Customer portal

- **Income tax filing** — Form 16 upload, income sources, deductions, old vs new regime comparison,
  ITR generation (JSON, Excel, PDF)
- **GST** — registrations, invoice book (sales, purchases, credit and debit notes, reverse charge,
  exempt, nil rated, zero rated), CSV import with duplicate detection, reconciliation against portal
  data, GSTR-1 and GSTR-3B preparation
- **Case tracking** — status, documents, queries from the practice, notifications
- **Professional fees** — service fee invoices, kept separate from government tax payable

### Staff portal (`/admin`)

- Separate sign in with mandatory authenticator based MFA and short lived tokens
- Work queues by tax type and state, case workspace with workflow transitions, assignment, priority,
  internal and customer visible comments
- Document verification, query review, fee invoicing, taxpayer directory
- Reports (filing status, liability, refunds, ITC, reconciliation, mismatches, workload) with CSV,
  Excel and PDF export
- Configurable slabs, limits, interest, late fees and deadlines, versioned by effective date
- Notification templates, staff and role administration, immutable audit trail

### Filing to the government

The platform does **not** submit to the official portals on its own and never generates an
acknowledgement number. A `GovernmentFilingAdapter` is the only place an official integration can be
plugged in; with no adapter configured, `GET /api/admin/integrations/status` reports the channel as
unavailable and cases follow the manual filing path, where a real acknowledgement number is recorded
by a staff member after filing on the portal.

Security: JWT authentication, role based permissions, mandatory MFA for staff, and an append only
audit trail of every state change.

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | Next.js 16, React, TypeScript, Tailwind CSS |
| Backend | Java 17, Spring Boot 3.2, Spring Security |
| Database | PostgreSQL (H2 for dev) |
| Auth | JWT + BCrypt, TOTP for staff |
| Docs | Springdoc OpenAPI |
| Exports | Apache POI (Excel), OpenPDF |

## Project Structure

```
income-tax/
├── frontend/           # Next.js application
│   ├── src/
│   │   ├── app/        # App Router pages
│   │   ├── components/ # Reusable UI components
│   │   ├── contexts/   # React contexts (Auth, Filing)
│   │   └── lib/        # Tax engine, types, utilities
│   └── package.json
├── backend/            # Spring Boot REST API
│   ├── src/main/java/com/incometax/
│   │   ├── config/     # Security, CORS config
│   │   ├── controller/ # REST controllers
│   │   ├── dto/        # Data transfer objects
│   │   ├── entity/     # JPA entities
│   │   ├── repository/ # Data repositories
│   │   ├── security/   # JWT filter, utilities
│   │   └── service/    # Business logic
│   └── pom.xml
├── docker-compose.yml
└── README.md
```

## Quick Start

### Frontend

```bash
cd frontend
npm install
npm run dev
# Open http://localhost:3000
```

### Backend

```bash
cd backend
mvn spring-boot:run
# API at http://localhost:8080
```

### Configuration

| Variable | Default | Purpose |
|----------|---------|---------|
| `JWT_SECRET` | dev value | Signing key; set a real secret outside development |
| `JWT_EXPIRATION` | `28800000` | Customer token lifetime in ms |
| `JWT_ADMIN_EXPIRATION` | `3600000` | Staff token lifetime in ms |
| `SEED_DEMO_USERS` | `false` | Seed demo customer and staff accounts |
| `SEED_USER_PASSWORD` | empty | Password for the seeded accounts; required when seeding |
| `NEXT_PUBLIC_API_URL` | `http://localhost:8080/api` | API base URL used by the frontend |

No credentials ship in the repository. For a local walkthrough, seed accounts with a password you
choose:

```bash
cd backend
mvn spring-boot:run -Dspring-boot.run.arguments="--app.seed-demo-users=true --app.seed-user-password=<your-local-password>"
```

The first staff sign in at `/admin/login` returns a TOTP secret that must be enrolled in an
authenticator app before the account can reach any admin endpoint.

## Filing flow

1. Taxpayer signs in, completes their profile, and starts an income tax or GST return
2. Documents are uploaded and scanned; invoices can be typed in or imported from CSV
3. The case moves into review; staff verify documents and raise queries the taxpayer answers
4. Computation is prepared (regime comparison for income tax, output tax, ITC and net liability for GST)
5. Staff approve, mark ready for filing, file on the official portal, and record the acknowledgement
6. Notifications, fee invoices and the audit trail follow the case throughout

## API

OpenAPI is served by the backend:

- Spec: `http://localhost:8080/v3/api-docs`
- Swagger UI: `http://localhost:8080/swagger-ui.html`

Every endpoint returns the same envelope: `{ "success", "data", "error", "timestamp" }`.

| Area | Base path |
|------|-----------|
| Auth (customer and staff) | `/api/auth/**` |
| Profile and GST registrations | `/api/profile/**` |
| Cases, documents, queries, notifications, payments | `/api/cases`, `/api/documents`, `/api/queries`, `/api/notifications`, `/api/payments` |
| Income tax filing | `/api/income-tax/**` |
| GST filing, invoices, reconciliation | `/api/gst/**` |
| Staff portal | `/api/admin/**` |

## Tests

```bash
cd backend && mvn test          # unit and API integration tests
cd frontend && npx eslint src/  # lint
cd frontend && npx next build   # typecheck and production build
```

## Tax Engine

The built-in tax computation engine supports:

- **FY 2024-25 (AY 2025-26)** tax slabs for both regimes
- HRA exemption calculation (metro/non-metro)
- Section 80C, 80CCD(1B), 80D, 80TTA, 24(b) deductions
- 4% Health & Education Cess
- Rebate u/s 87A (Old: ≤5L, New: ≤7L)
- Standard deduction (Old: 50K, New: 75K)

## License

MIT
