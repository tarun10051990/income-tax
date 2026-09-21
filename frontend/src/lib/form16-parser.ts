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
    const items = content.items.filter(
      (item) => "str" in item && typeof (item as Record<string, unknown>).str === "string"
    ) as Array<{ str: string; transform: number[] }>;

    // Preserve line breaks by detecting Y-position changes
    let lastY: number | null = null;
    const lines: string[] = [];
    let currentLine = "";
    for (const item of items) {
      const y = item.transform?.[5] ?? 0;
      if (lastY !== null && Math.abs(y - lastY) > 2) {
        lines.push(currentLine.trim());
        currentLine = item.str;
      } else {
        currentLine += (currentLine ? " " : "") + item.str;
      }
      lastY = y;
    }
    if (currentLine.trim()) lines.push(currentLine.trim());
    pages.push(lines.join("\n"));
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

/** Extract all PAN-format strings from text. */
function findAllPANs(text: string): string[] {
  return (text.match(/[A-Z]{5}[0-9]{4}[A-Z]/g) || []).filter(isValidPAN);
}

/** Extract all TAN-format strings from text. */
function findAllTANs(text: string): string[] {
  return (text.match(/[A-Z]{4}[0-9]{5}[A-Z]/g) || []).filter(isValidTAN);
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
 * Many employers only issue Part A digitally. When Part B is missing we derive
 * salary from the "Amount paid/credited" total in Part A's quarterly summary.
 */
export function parseForm16Text(text: string): Form16Data {
  // Keep original text with newlines for line-based parsing
  const original = text;
  // Also create a single-line version for simpler regex matching
  const t = text.replace(/\s+/g, " ");

  // -- Extract all PANs and TANs first ------------------------------------
  const allPANs = findAllPANs(t);
  const allTANs = findAllTANs(t);

  // -- Employer details ---------------------------------------------------

  // Try line-based extraction first (most reliable with preserved line breaks)
  let employerName = "";
  const lines = original.split("\n").map(l => l.trim()).filter(Boolean);
  for (let i = 0; i < lines.length; i++) {
    if (/Name\s+and\s+address\s+of\s+the\s+Employer/i.test(lines[i]) ||
        /Name.*Employer.*Specified\s+Bank/i.test(lines[i])) {
      // The employer name is typically on the next line
      if (i + 1 < lines.length) {
        const nextLine = lines[i + 1].trim();
        // Skip if next line is still part of the label
        if (nextLine && !nextLine.match(/^(PAN|TAN|Name|Address)/i)) {
          employerName = nextLine;
          break;
        }
      }
      // Or it could be on the same line after the label
      const sameLine = lines[i].replace(/.*(?:Employer|Specified\s+Bank)\s*/i, "").trim();
      if (sameLine && sameLine.length > 3) {
        employerName = sameLine;
        break;
      }
    }
  }

  // Fallback to single-line regex if line-based extraction failed
  if (!employerName) {
    employerName = findText(t, [
      /Name\s+(?:and\s+address\s+)?of\s+the\s+(?:Employer|Deductor)[:\s]*([A-Z][A-Za-z0-9 &.,()-]+?)(?:\s+Address|TAN|PAN|\n)/i,
      /Employer\s*(?:Name)?[:\s]+([A-Z][A-Za-z0-9 &.,()-]+?)(?:\s+Address|\s{2,}|TAN|PAN|\n)/i,
    ]);
  }

  // Clean up: remove address fragments (after first comma or at city/pincode)
  if (employerName) {
    const commaIdx = employerName.indexOf(",");
    if (commaIdx > 5) employerName = employerName.substring(0, commaIdx).trim();
    // Remove trailing city/state names after the employer name if too long
    if (employerName.length > 50) {
      employerName = employerName.replace(/\s+[A-Z]{2,10}\s*[-\d].*$/, "").trim();
    }
  }

  // TAN — look for labelled value then fall back to all TANs found
  let employerTAN = findText(t, [
    /TAN\s+(?:of\s+(?:the\s+)?)?(?:Deductor|Employer)[:\s]*([A-Z]{4}[0-9]{5}[A-Z])/i,
    /TAN\s+of\s+Employer[:\s]*([A-Z]{4}[0-9]{5}[A-Z])/i,
    /Tax\s+Deduction.*?Account.*?Number[:\s]*([A-Z]{4}[0-9]{5}[A-Z])/i,
  ]);
  if (!isValidTAN(employerTAN) && allTANs.length > 0) {
    employerTAN = allTANs[0];
  }

  // Employer PAN
  let employerPAN = findText(t, [
    /PAN\s+(?:of\s+(?:the\s+)?)?(?:Deductor|Employer)[:\s]*([A-Z]{5}[0-9]{4}[A-Z])/i,
  ]);
  if (!isValidPAN(employerPAN) && allPANs.length > 0) {
    // First PAN is typically employer's in Form 16
    employerPAN = allPANs[0];
  }

  const employerAddress = findText(t, [
    /Address[:\s]+(.+?)(?=\s+TAN|\s+PAN|\s+Employee|\s+Certificate|\s+Name\s+of)/i,
  ]);

  // -- Employee details ---------------------------------------------------

  // Try line-based extraction for employee name
  let employeeName = "";
  for (let i = 0; i < lines.length; i++) {
    if (/Name\s+and\s+address\s+of\s+the\s+Employee/i.test(lines[i]) ||
        /Name.*Employee.*Specified\s+senior/i.test(lines[i])) {
      // The employee name is typically on the next line
      if (i + 1 < lines.length) {
        const nextLine = lines[i + 1].trim();
        if (nextLine && !nextLine.match(/^(PAN|TAN|Name|Address|ward)/i)) {
          // Take just the name part (first word or words before address)
          employeeName = nextLine.replace(/\s+ward\b.*$/i, "")
            .replace(/\s+\d+.*$/, "")
            .replace(/\s+[a-z].*$/, "")
            .trim();
          break;
        }
      }
      // Or same line
      const sameLine = lines[i].replace(/.*(?:Employee|senior\s+citizen)\s*/i, "").trim();
      if (sameLine && sameLine.length > 2) {
        employeeName = sameLine.replace(/\s+ward\b.*$/i, "")
          .replace(/\s+\d+.*$/, "")
          .replace(/\s+[a-z].*$/, "")
          .trim();
        break;
      }
    }
  }

  // Fallback to single-line regex
  if (!employeeName) {
    employeeName = findText(t, [
      /Name\s+and\s+address\s+of\s+the\s+Employee(?:\/Specified\s+senior\s+citizen)?\s+([A-Z][A-Za-z .]+?)(?:\s+ward|\s+\d|\s+[a-z])/i,
      /Name\s+(?:of\s+(?:the\s+)?)?Employee[:\s]*([A-Za-z .]+?)(?:\s{2,}|PAN|Designation)/i,
      /Employee\s*(?:Name)?[:\s]+([A-Za-z .]+?)(?:\s{2,}|PAN|Designation)/i,
    ]);
  }

  // Clean up employee name - remove address fragments
  if (employeeName && /\d/.test(employeeName)) {
    employeeName = employeeName.replace(/\s+\d.*$/, "").trim();
  }

  // Employee PAN — usually labelled; fall back to PAN that is not employer's
  let employeePAN = findText(t, [
    /PAN\s+(?:of\s+(?:the\s+)?)?(?:Employee|Specified\s+senior)[^A-Z]*([A-Z]{5}[0-9]{4}[A-Z])/i,
    /PAN\s+of\s+Employee[:\s]*([A-Z]{5}[0-9]{4}[A-Z])/i,
  ]);
  if (!isValidPAN(employeePAN)) {
    const remaining = allPANs.filter(p => p !== employerPAN && p !== employerTAN);
    if (remaining.length > 0) employeePAN = remaining[0];
  }

  const employeeAadhaar = findText(t, [
    /Aadhaar[:\s]*([\dX]{4}[\s-]?[\dX]{4}[\s-]?[\dX]{4})/i,
  ]);

  const designation = findText(t, [
    /Designation[:\s]*([A-Za-z ]+?)(?:\s{2,}|\n|$)/i,
  ]);

  // -- Part A: Quarterly summary (Amount paid/credited) --------------------
  // Pattern: "Total (Rs.) <TDS> <deposited> <amount_paid>"
  let partATotalPaid = 0;
  let partATDS = 0;
  const totalLineMatch = t.match(
    /Total\s*\(?Rs\.?\)?\s+([\d,.]+)\s+([\d,.]+)\s+([\d,.]+)/i
  );
  if (totalLineMatch) {
    partATDS = Math.round(parseFloat(totalLineMatch[1].replace(/,/g, "")));
    partATotalPaid = Math.round(parseFloat(totalLineMatch[3].replace(/,/g, "")));
  }

  // -- Salary components (Part B — Annexure) ------------------------------

  const grossSalary = findAmount(t, [
    /Gross\s+Salary[\s:]*[\u20B9Rs.]*\s*([\d,]+)/i,
    /1\.\s*Gross\s+Salary[^0-9]*([\d,]+)/i,
    /Total\s+(?:Gross\s+)?Salary[^0-9]*([\d,]+)/i,
    /Gross\s+Total\s+Income[^0-9]*([\d,]+)/i,
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

  // Determine gross salary: prefer Part B breakdown, fall back to Part A total
  const effectiveGross = grossSalary || partATotalPaid;

  // If we got grossSalary but not individual components, estimate
  const totalComponents = basicSalary + hra + specialAllowance + bonus + leaveEncashment;
  let otherAllowances = 0;
  if (effectiveGross > 0 && totalComponents > 0 && effectiveGross > totalComponents) {
    otherAllowances = effectiveGross - totalComponents;
  }

  // If no individual breakdowns were found but gross salary was, make basic = gross
  const finalBasic = basicSalary || effectiveGross;

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
  ]) || 75000; // 75000 is default for FY 2024-25

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

  // Prefer the Part A total line TDS over regex matches (more reliable)
  const tdsDeducted = partATDS || findAmount(t, [
    /(?:Tax\s+Deducted\s+at\s+Source|TDS)[^0-9]*([\d,]+)/i,
    /Total\s+(?:Tax\s+)?(?:Deducted|TDS)[^0-9]*([\d,]+)/i,
  ]);

  // Tax deposited: in Part A, the second column of Total line = deposited
  let taxDeposited = 0;
  if (totalLineMatch) {
    taxDeposited = Math.round(parseFloat(totalLineMatch[2].replace(/,/g, "")));
  }
  if (!taxDeposited) {
    taxDeposited = findAmount(t, [
      /Tax\s+Deposited[^0-9]*([\d,]+)/i,
      /Total\s+Tax\s+Deposited[^0-9]*([\d,]+)/i,
    ]) || tdsDeducted;
  }

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
      taxableIncome: taxableIncome || (effectiveGross - standardDeduction),
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
