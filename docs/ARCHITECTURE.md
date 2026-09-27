# TaxFilr Platform Architecture

Income Tax + GST filing platform with a customer portal and a separate admin portal.

## 1. Component view

```
frontend (Next.js)
├── customer portal   /dashboard, /filing/**, /gst/**, /payments, /notifications
└── admin portal      /admin/**            (separate layout, separate login, MFA)
                 |
                 v  REST /api/**
backend (Spring Boot)
├── identity        auth, users, roles, permissions (RBAC)
├── customer        taxpayer profile, GST profile
├── income-tax      filings, income sources, deductions, tax payments, computation
├── gst             invoices, import, reconciliation, GSTR-1/3B preparation
├── filing (core)   FilingCase, workflow engine, assignments, comments
├── document        upload/versioning/verification
├── query           queries + responses
├── notification    templates + in-app/email/SMS dispatch log
├── payment         service-fee invoices and payment status
├── config          tax rules / return schemas / deadlines (versioned)
├── integration     IncomeTaxIntegrationAdapter, GstIntegrationAdapter (+ manual fallback)
└── audit           immutable audit log for every sensitive operation
                 |
                 v
PostgreSQL (H2 in dev) + object storage for documents
```

Income Tax and GST business logic live in separate packages (`incometax`, `gst`) and only
share the `filing` core (case, workflow, status) so a change in one tax domain cannot break
the other.

## 2. ER model (logical)

```
users 1---* user_roles *---1 roles *---* permissions
users 1---1 taxpayer_profiles
users 1---* gst_profiles
users 1---* filing_cases

filing_cases 1---0..1 income_tax_filings
filing_cases 1---0..1 gst_filings
filing_cases 1---* documents
filing_cases 1---* filing_queries 1---* query_responses
filing_cases 1---* filing_comments
filing_cases 1---* case_events          (workflow history)
filing_cases 1---* payments             (service fee)

income_tax_filings 1---* income_sources
income_tax_filings 1---* deductions
income_tax_filings 1---* tax_payments

gst_filings 1---* gst_invoices          (SALES/PURCHASE/CREDIT_NOTE/DEBIT_NOTE/...)
gst_filings 1---* gst_reconciliation_entries
gst_invoices 0..1---0..1 gst_reconciliation_entries

tax_rules            (versioned, effective-dated configuration)
notifications, notification_templates
audit_logs           (append-only)
```

Every table carries `created_at`, `updated_at`; mutable business rows carry a `@Version`
column for optimistic locking, and `deleted` for soft deletion where history matters.

## 3. Filing case

A filing case is the single unit of work shared by both tax domains.

```
Case ID     TAX-2026-000123           (generated: TAX-<year>-<sequence>)
Customer    ABC Pvt Ltd
Tax Type    INCOME_TAX | GST
Return      ITR_1..ITR_4 | GSTR_1 | GSTR_3B
Period      AY 2025-26 | 2026-07
Assigned To user id (tax/GST professional)
Priority    LOW | MEDIUM | HIGH | URGENT
Status      see workflow
Due Date    from tax_rules deadline configuration
```

## 4. Workflows

Transitions are data, not code: `WorkflowDefinition` maps `(taxType, fromStatus) ->
allowed transitions`, each transition naming the roles permitted to perform it. The engine
rejects any transition not in the definition and records a `case_event` + audit log.

Income tax:

```
DRAFT → DOCUMENTS_PENDING → UNDER_REVIEW → QUERY_RAISED ⇄ USER_ACTION_REQUIRED
      → UNDER_REVIEW → APPROVED → READY_FOR_FILING → FILED
      → VERIFICATION_PENDING → VERIFIED → COMPLETED
any reviewable state → REJECTED
```

GST:

```
DRAFT → DATA_PENDING → DATA_IMPORTED → RECONCILIATION_PENDING → RECONCILIATION_COMPLETED
      → UNDER_REVIEW → QUERY_RAISED ⇄ USER_ACTION_REQUIRED → UNDER_REVIEW
      → APPROVED → READY_FOR_FILING → FILED → ACKNOWLEDGEMENT_RECEIVED → COMPLETED
any reviewable state → REJECTED
```

## 5. RBAC matrix

Permissions are fine-grained strings (`case:read:all`, `case:transition`, `filing:approve`,
…) granted to roles; the API authorizes on permissions, never on role names.

| Capability | SUPER_ADMIN | ADMIN | TAX_PROFESSIONAL | GST_PROFESSIONAL | REVIEWER | DATA_ENTRY | SUPPORT | CUSTOMER |
|---|---|---|---|---|---|---|---|---|
| Own data only | – | – | assigned | assigned | assigned | assigned | read | own |
| Read all cases | ✔ | ✔ | IT only | GST only | ✔ | ✔ | ✔ | – |
| Create/edit filing data | ✔ | ✔ | ✔ | ✔ | – | ✔ | – | own draft |
| Approve / reject filing | ✔ | ✔ | ✔ | ✔ | – | – | – | – |
| Transition case | ✔ | ✔ | ✔ | ✔ | review only | – | – | submit only |
| Raise query | ✔ | ✔ | ✔ | ✔ | ✔ | – | ✔ | – |
| Respond to query | – | – | – | – | – | – | – | ✔ |
| Manage users & roles | ✔ | ✔ (non-admin) | – | – | – | – | – | – |
| Tax configuration | ✔ | read | read | read | read | read | – | – |
| Read audit logs | ✔ | ✔ | – | – | – | – | – | – |
| Payments admin | ✔ | ✔ | – | – | – | – | read | own |

Administrator logins require MFA (TOTP); customer logins do not.

## 6. API contracts

All responses use one envelope:

```json
{ "success": true, "data": {}, "traceId": "…" }
{ "success": false, "code": "FILING_VALIDATION_ERROR", "message": "…",
  "errors": [{ "field": "pan", "message": "Invalid PAN format" }], "traceId": "…" }
```

Collections are always paged: `?page=0&size=20&sort=createdAt,desc` returning
`{ content, page, size, totalElements, totalPages }`.

| Area | Endpoints |
|---|---|
| Auth | `POST /api/auth/register`, `/login`, `POST /api/auth/admin/login` (MFA), `GET /api/auth/me` |
| Profile | `GET/PUT /api/profile`, `GET/PUT /api/profile/gst/{id}`, `POST /api/profile/gst` |
| Income tax | `POST /api/income-tax/filings`, `GET /api/income-tax/filings`, `GET/PUT /api/income-tax/filings/{id}`, `POST …/{id}/income-sources`, `…/deductions`, `…/tax-payments`, `GET …/{id}/computation`, `POST …/{id}/submit` |
| GST | `POST /api/gst/filings`, `GET /api/gst/filings`, `GET /api/gst/filings/{id}`, `POST …/{id}/invoices`, `POST …/{id}/import` (CSV/JSON), `POST …/{id}/reconcile`, `GET …/{id}/reconciliation`, `GET …/{id}/computation`, `POST …/{id}/submit` |
| Cases | `GET /api/cases` (search/filter), `GET /api/cases/{id}`, `POST /api/cases/{id}/transition`, `/assign`, `/priority`, `/comments`, `GET /api/cases/{id}/events` |
| Documents | `POST /api/documents`, `GET /api/documents?caseId=`, `GET /api/documents/{id}/content`, `POST /api/documents/{id}/verify` |
| Queries | `POST /api/queries`, `GET /api/queries`, `POST /api/queries/{id}/respond`, `/accept`, `/reject` |
| Payments | `GET /api/payments`, `POST /api/payments/{id}/pay`, `POST /api/admin/payments/invoices` |
| Notifications | `GET /api/notifications`, `POST /api/notifications/{id}/read`, admin templates CRUD |
| Admin | `GET /api/admin/dashboard`, `/api/admin/customers`, `/api/admin/users`, `/api/admin/roles`, `/api/admin/audit-logs`, `/api/admin/config/tax-rules`, `/api/admin/reports/{report}` |
| Integration | `POST /api/admin/integration/{taxType}/{caseId}/{prepare|validate|submit|status|acknowledgement}` |

OpenAPI is served at `/v3/api-docs` and Swagger UI at `/swagger-ui.html`.

## 7. Frontend routes

```
Customer                                Admin
/dashboard                              /admin/login
/profile                                /admin
/filing/{upload,review,income,          /admin/customers
        compute,suggestions,summary,    /admin/income-tax/[bucket]
        generate}                       /admin/gst/[bucket]
/gst                                    /admin/cases/[id]
/gst/profile                            /admin/documents
/gst/invoices                           /admin/queries
/gst/reconciliation                     /admin/payments
/gst/returns                            /admin/reports
/payments                               /admin/notifications
/notifications                          /admin/users
/support                                /admin/config
                                        /admin/audit-logs
```

## 8. Security model

JWT bearer tokens (short-lived) + BCrypt password hashing; admin tokens carry an `mfa`
claim and are rejected by admin endpoints without it. Every request passes input
validation (Bean Validation + domain validators), a per-principal rate limiter, and an
authorization check on permissions. PAN, Aadhaar, GSTIN, bank accounts and document
contents are masked in every list/detail response unless the caller holds the
`pii:read:full` permission. Audit entries are append-only (no update/delete API).

## 9. Integration boundaries

`IncomeTaxIntegrationAdapter` and `GstIntegrationAdapter` define
`prepare/validate/submit/status/acknowledgement`. The only shipped implementation is
`ManualFilingAdapter`, which records a controlled manual filing workflow: it never claims
that a return was transmitted to a government system. Real adapters are expected to be
supplied per deployment with credentials from the secret store, with retries, idempotency
keys and full audit logging.

## 10. Compliance constraint

The platform performs tax **computation and return preparation** only. Filing status
values such as `FILED` and `ACKNOWLEDGEMENT_RECEIVED` are set by an operator recording a
real-world action or by a configured official adapter — the application never fabricates
acknowledgements, tax rules or compliance status. Tax rules are effective-dated
configuration so regulation changes are data changes.
