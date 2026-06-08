# TaxFilr — AI-Powered Indian ITR Filing Platform

An intelligent, modern income tax return filing platform for Indian taxpayers. Upload Form 16, get AI-powered tax-saving suggestions, compare tax regimes, and generate ITR forms ready for e-filing.

## Features

- **Smart Form 16 Upload** — AI OCR extracts employer, salary, deduction, and TDS details automatically
- **Tax Computation Engine** — Side-by-side Old vs New regime comparison with recommendation
- **AI Tax-Saving Advisor** — Personalized investment suggestions (80C, 80D, NPS, etc.)
- **Investment Recommendations** — Risk-categorized options with expected returns and lock-in periods
- **ITR Generation** — Auto-generate ITR-1/2/3/4 forms (JSON, Excel, PDF)
- **AI Financial Chatbot** — Ask tax questions and get personalized answers
- **Admin Dashboard** — User management, filing analytics, tax rule configuration
- **Secure** — JWT authentication, RBAC, encryption-ready

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | Next.js 16, React, TypeScript, Tailwind CSS |
| Backend | Java 17, Spring Boot 3.2, Spring Security |
| Database | PostgreSQL (H2 for dev) |
| Auth | JWT + BCrypt |
| AI | OCR Engine, LLM-powered advisor (pluggable) |

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

### Demo Credentials

| Role | Email | Password |
|------|-------|----------|
| User | demo@taxfiler.in | any |
| Admin | admin@taxfiler.in | any |

## Tax Filing Flow

1. **Login** — Email/password, Mobile OTP, or Google OAuth
2. **Onboarding** — Select FY, employment type, regime preference
3. **Upload Form 16** — PDF/Image upload with AI OCR extraction
4. **Review Data** — Verify extracted salary, deductions, TDS
5. **Additional Income** — Interest, capital gains, rental income
6. **Tax Computation** — Old vs New regime comparison
7. **Tax-Saving Tips** — Personalized investment recommendations
8. **Generate ITR** — Download ITR-1/2/3/4 in JSON/Excel/PDF

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/auth/register` | Register new user |
| POST | `/api/auth/login` | Login with credentials |
| POST | `/api/tax/compute` | Compute tax (old + new regime) |
| GET | `/api/tax/slabs` | Get current tax slabs |

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
