import type { Form16Data } from "./types";

/**
 * Extract text content from a PDF file using pdfjs-dist.
 * Runs entirely client-side — no server round-trip required.
 */
export async function extractTextFromPDF(file: File): Promise<string> {
  const pdfjsLib = await import("pdfjs-dist");

  // Use the bundled worker
  pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
    "pdfjs-dist/build/pdf.worker.min.mjs",
    import.meta.url
  ).toString();

  const arrayBuffer = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;

  const pages: string[] = [];
  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const content = await page.getTextContent();
    const strings = content.items
      .filter((item) => "str" in item && typeof (item as Record<string, unknown>).str === "string")
      .map((item) => (item as Record<string, unknown>).str as string);
    pages.push(strings.join(" "));
  }

  return pages.join("\n");
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Find a number following a label pattern. Returns 0 when not found. */
function findAmount(text: string, patterns: RegExp[]): number {
  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match) {
      const raw = (match[1] || match[2] || "").replace(/,/g, "").trim();
      const num = parseFloat(raw);
      if (!isNaN(num)) return Math.round(num);
    }
  }
  return 0;
}

/** Extract the first match for a set of patterns. */
function findText(text: string, patterns: RegExp[], fallback = ""): string {
  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match) {
      return (match[1] || "").trim();
    }
  }
  return fallback;
}

/** Validate PAN format (AAAAA0000A). */
function isValidPAN(s: string): boolean {
  return /^[A-Z]{5}[0-9]{4}[A-Z]$/.test(s);
}

/** Validate TAN format (AAAA00000A). */
function isValidTAN(s: string): boolean {
  return /^[A-Z]{4}[0-9]{5}[A-Z]$/.test(s);
}

// ---------------------------------------------------------------------------
// Parsing
// ---------------------------------------------------------------------------

/**
 * Parse raw Form 16 text into structured data.
 *
 * Form 16 has two parts:
 *   Part A — TDS certificate with employer/employee details, TDS amounts.
 *   Part B — Salary breakdown, deductions under Chapter VI-A, tax computation.
 *
 * We use a collection of regex patterns to handle variations across employers
 * (different software vendors produce slightly different layouts). The patterns
 * are deliberately broad so they work with OCR-extracted text that may have
 * minor whitespace or formatting artefacts.
 */
export function parseForm16Text(text: string): Form16Data {
  // Normalise whitespace for easier matching
  const t = text.replace(/\s+/g, " ");

  // -- Employer details ---------------------------------------------------

  const employerName = findText(t, [
    /Name\s+(?:and\s+address\s+)?of\s+the\s+(?:Employer|Deductor)[:\s]*([A-Z][A-Za-z0-9 &.,()-]+?)(?:\s+Address|TAN|PAN|\n)/i,
    /Employer\s*(?:Name)?[:\s]+([A-Z][A-Za-z0-9 &.,()-]+?)(?:\s+Address|\s{2,}|TAN|PAN|\n)/i,
  ]);

  // TAN — look for labelled value or standalone TAN-format strings
  let employerTAN = findText(t, [
    /TAN\s+(?:of\s+(?:the\s+)?(?:Deductor|Employer))?[:\s]*([A-Z]{4}[0-9]{5}[A-Z])/i,
    /Tax\s+Deduction.*?Account.*?Number[:\s]*([A-Z]{4}[0-9]{5}[A-Z])/i,
  ]);
  if (!isValidTAN(employerTAN)) {
    const tanMatch = t.match(/\b([A-Z]{4}[0-9]{5}[A-Z])\b/);
    if (tanMatch) employerTAN = tanMatch[1];
  }

  // Employer PAN
  let employerPAN = findText(t, [
    /PAN\s+(?:of\s+(?:the\s+)?(?:Deductor|Employer))[:\s]*([A-Z]{5}[0-9]{4}[A-Z])/i,
  ]);
  if (!isValidPAN(employerPAN)) {
    // look for PAN with company-type 4th char (A, B, C, F, G, H, L, J, P, T, K)
    const panMatches = t.match(/\b[A-Z]{5}[0-9]{4}[A-Z]\b/g) || [];
    for (const p of panMatches) {
      if (isValidPAN(p) && p !== employerTAN) {
        employerPAN = p;
        break;
      }
    }
  }

  const employerAddress = findText(t, [
    /Address[:\s]+(.+?)(?=\s+TAN|\s+PAN|\s+Employee|\s+Certificate|\s+Name of)/i,
  ]);

  // -- Employee details ---------------------------------------------------

  const employeeName = findText(t, [
    /Name\s+(?:of\s+(?:the\s+)?)?Employee[:\s]*([A-Za-z ]+?)(?:\s{2,}|PAN|Designation)/i,
    /Employee\s*(?:Name)?[:\s]+([A-Za-z ]+?)(?:\s{2,}|PAN|Designation)/i,
  ]);

  // Employee PAN — usually labelled; fall back to second PAN in doc
  let employeePAN = findText(t, [
    /PAN\s+(?:of\s+(?:the\s+)?)?Employee[:\s]*([A-Z]{5}[0-9]{4}[A-Z])/i,
  ]);
  if (!isValidPAN(employeePAN)) {
    const allPANs = (t.match(/\b[A-Z]{5}[0-9]{4}[A-Z]\b/g) || []).filter(
      (p) => isValidPAN(p) && p !== employerTAN && p !== employerPAN
    );
    if (allPANs.length > 0) employeePAN = allPANs[0];
  }

  const employeeAadhaar = findText(t, [
    /Aadhaar[:\s]*([\dX]{4}[\s-]?[\dX]{4}[\s-]?[\dX]{4})/i,
  ]);

  const designation = findText(t, [
    /Designation[:\s]*([A-Za-z ]+?)(?:\s{2,}|\n|$)/i,
  ]);

  // -- Salary components (Part B — Annexure) ------------------------------

  const grossSalary = findAmount(t, [
    /Gross\s+Salary[\s:]*[\u20B9Rs.]*\s*([\d,]+)/i,
    /1\.\s*Gross\s+Salary[^0-9]*([\d,]+)/i,
    /Total\s+(?:Gross\s+)?Salary[^0-9]*([\d,]+)/i,
  ]);

  const basicSalary = findAmount(t, [
    /Basic\s+(?:Salary|Pay)[^0-9]*([\d,]+)/i,
    /Salary\s+as\s+per\s+.*?17\(1\)[^0-9]*([\d,]+)/i,
  ]);

  const hra = findAmount(t, [
    /House\s+Rent\s+Allowance[^0-9]*([\d,]+)/i,
    /HRA[^0-9]*([\d,]+)/i,
  ]);

  const specialAllowance = findAmount(t, [
    /Special\s+Allowance[^0-9]*([\d,]+)/i,
    /Other\s+Allowance[^0-9]*([\d,]+)/i,
  ]);

  const bonus = findAmount(t, [
    /Bonus[^0-9]*([\d,]+)/i,
    /Performance\s+(?:Bonus|Incentive)[^0-9]*([\d,]+)/i,
  ]);

  const leaveEncashment = findAmount(t, [
    /Leave\s+Encashment[^0-9]*([\d,]+)/i,
  ]);

  // If we got grossSalary but not individual components, estimate
  const totalComponents = basicSalary + hra + specialAllowance + bonus + leaveEncashment;
  let otherAllowances = 0;
  if (grossSalary > 0 && totalComponents > 0 && grossSalary > totalComponents) {
    otherAllowances = grossSalary - totalComponents;
  }

  // If no individual breakdowns were found but gross salary was, make basic = gross
  const finalBasic = basicSalary || grossSalary;

  // -- Deductions ---------------------------------------------------------

  const pfContribution = findAmount(t, [
    /(?:Provident\s+Fund|PF|EPF)\s*(?:Contribution)?[^0-9]*([\d,]+)/i,
    /Deduction.*?(?:PF|Provident)[^0-9]*([\d,]+)/i,
  ]);

  const professionalTax = findAmount(t, [
    /Professional\s+Tax[^0-9]*([\d,]+)/i,
    /Tax\s+on\s+(?:Employment|Profession)[^0-9]*([\d,]+)/i,
  ]);

  const standardDeduction = findAmount(t, [
    /Standard\s+Deduction[^0-9]*([\d,]+)/i,
  ]) || 50000; // 50000 is default for FY 2024-25

  const section80C = findAmount(t, [
    /(?:Section\s+)?80C[^0-9D]*([\d,]+)/i,
    /Chapter\s+VI-?A.*?80C[^0-9]*([\d,]+)/i,
  ]);

  const section80D = findAmount(t, [
    /(?:Section\s+)?80D[^0-9]*([\d,]+)/i,
  ]);

  const otherDeductions = findAmount(t, [
    /Other\s+Deductions[^0-9]*([\d,]+)/i,
    /Total\s+Deduction.*?Chapter\s+VI[^0-9]*([\d,]+)/i,
  ]);

  // -- Tax ----------------------------------------------------------------

  const tdsDeducted = findAmount(t, [
    /(?:Tax\s+Deducted\s+at\s+Source|TDS)[^0-9]*([\d,]+)/i,
    /Total\s+(?:Tax\s+)?(?:Deducted|TDS)[^0-9]*([\d,]+)/i,
  ]);

  const taxDeposited = findAmount(t, [
    /Tax\s+Deposited[^0-9]*([\d,]+)/i,
    /Total\s+Tax\s+Deposited[^0-9]*([\d,]+)/i,
  ]) || tdsDeducted; // often same value

  const taxableIncome = findAmount(t, [
    /(?:Total\s+)?Taxable\s+Income[^0-9]*([\d,]+)/i,
    /Net\s+Taxable\s+Income[^0-9]*([\d,]+)/i,
  ]);

  // -- Assemble result ----------------------------------------------------

  return {
    employer: {
      name: employerName || "Unknown Employer",
      tan: employerTAN || "",
      pan: employerPAN || "",
      address: employerAddress || "",
    },
    employee: {
      name: employeeName || "Unknown Employee",
      pan: employeePAN || "",
      aadhaar: employeeAadhaar || undefined,
      designation: designation || "",
    },
    salary: {
      basicSalary: finalBasic,
      hra,
      specialAllowance,
      bonus,
      leaveEncashment,
      otherAllowances,
    },
    deductions: {
      pfContribution: pfContribution || section80C,
      professionalTax,
      standardDeduction,
      otherDeductions: otherDeductions || section80D,
    },
    tax: {
      tdsDeducted,
      taxDeposited,
      taxableIncome,
    },
  };
}

/**
 * High-level: take a PDF File, extract text, parse into Form16Data.
 * Returns the parsed data plus the raw text (useful for debugging / display).
 */
export async function parseForm16PDF(
  file: File
): Promise<{ data: Form16Data; rawText: string }> {
  const rawText = await extractTextFromPDF(file);
  const data = parseForm16Text(rawText);
  return { data, rawText };
}
