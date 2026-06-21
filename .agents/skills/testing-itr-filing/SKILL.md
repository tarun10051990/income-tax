---
name: testing-itr-filing
description: Test the ITR filing platform end-to-end. Use when verifying Form 16 upload, PDF extraction, tax computation, or filing flow changes.
---

# Testing the ITR Filing Platform

## Quick Start

```bash
cd frontend
npm install
npm run dev  # Starts at http://localhost:3000
```

The frontend works standalone — no backend needed for the filing flow. It has built-in mock auth and tax engine.

## Demo Credentials

- **User:** `demo@taxfiler.in` (any password) — role: user, name: Rahul Sharma
- **Admin:** `admin@taxfiler.in` (any password) — role: admin

## Key Flows to Test

### 1. PDF Extraction Flow (Critical Path)
Login → Onboarding (3 steps) → Upload Form 16 PDF → Click "Extract with AI" → Review page shows extracted data

**How to verify extraction works (not returning mock data):**
- Upload a PDF with known values (e.g. employer "Infosys", employee "Priya Nair")
- On the review page, verify the displayed values match the PDF content
- Mock/sample data shows: TCS / Rahul Sharma / Basic ₹6L / TDS ₹1.2L
- If you see mock values after uploading a real PDF, extraction is broken

### 2. Sample Data Fallback
On upload page → Click "Use Sample Data" → Should show TCS/Rahul Sharma mock data

### 3. Tax Computation
Continue from review → Additional Income → Compute Tax → Verify Gross Salary matches what was extracted

## File Upload via Playwright (CDP)

The file input is hidden. To upload programmatically:

```python
from playwright.sync_api import sync_playwright

with sync_playwright() as p:
    browser = p.chromium.connect_over_cdp('http://localhost:29229')
    context = browser.contexts[0]
    page = context.pages[0]
    
    # Navigate to upload page (must be logged in first)
    page.goto('http://localhost:3000/filing/upload')
    
    # Make file input visible and set file
    file_input = page.query_selector('input[type="file"]')
    file_input.evaluate('el => { el.style.display = "block"; el.style.opacity = "1"; }')
    file_input.set_input_files('/path/to/test-form16.pdf')
```

**Important:** `page.locator('input[type="file"]').set_input_files(...)` may timeout because the input is hidden. Use `page.query_selector` + `evaluate` to make it visible first, then `set_input_files` on the element handle.

## Generating Test PDFs

Use Python's `fpdf2` to generate Form 16 PDFs with known values:

```python
from fpdf import FPDF
pdf = FPDF()
pdf.add_page()
pdf.set_font("Helvetica", size=12)
# Add Form 16 fields in standard layout...
pdf.output("test-form16.pdf")
```

Key fields the parser looks for (regex-based):
- "Name of the Employer" / "Name and address of the Employer"
- "TAN" with format validation (4 letters + 5 digits + 1 letter)
- "PAN" with format validation (5 letters + 4 digits + 1 letter)
- Salary amounts with Rs./INR prefix or ₹ symbol
- "Tax Deducted at Source" / "TDS"

## Session State

The app uses React context for state. Navigating directly to `/filing/upload` without being logged in redirects to login. After login, onboarding must be completed before the dashboard shows. State resets on page refresh (no persistent storage).

## Architecture Notes

- Frontend: Next.js 16 (Turbopack), React 19, TypeScript, Tailwind v4
- PDF extraction: `pdfjs-dist` (client-side) → regex parsing in `src/lib/form16-parser.ts`
- Tax engine: `src/lib/tax-engine.ts` — dual regime computation
- State: React Context in `src/context/TaxFilingContext.tsx`
- No external API calls — everything runs client-side

## Known Issues

- Old Regime "Refund" label might show a positive value when it should say "Tax Due" (when Total Tax > TDS)
- The regex parser works with standard Form 16 layouts but may not parse heavily customized employer formats
- Session state resets on browser refresh (no localStorage persistence)

## Devin Secrets Needed

None — the app uses demo credentials with any password accepted.
