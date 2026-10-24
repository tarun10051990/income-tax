/**
 * Reads the financial documents a taxpayer uploads (bank / post-office statements, Sukanya
 * Samriddhi, PPF, ELSS / mutual-fund statements, LIC and health-insurance receipts, NPS, home-loan
 * and FD interest certificates, fee and donation receipts, Form 16) and turns them into
 * suggested numbers for the ITR fields. Everything runs in the browser; nothing is uploaded.
 *
 * Extraction is heuristic, so every number carries the line it came from and the user confirms or
 * edits it before it is used.
 */
import { extractTextFromPDF, parseForm16Text } from "@/lib/form16-parser";
import { Form16Data } from "@/lib/types";

export type FillField =
  | "section80C"
  | "section80CCD1B"
  | "section80D"
  | "section80TTA"
  | "section24"
  | "otherDeductions"
  | "savingsInterest"
  | "fdInterest"
  | "rdInterest"
  | "capitalGainsSTCG"
  | "capitalGainsLTCG"
  | "rentalIncome"
  | "otherTds"
  | "advanceTax";

export type DocumentKind =
  | "form16"
  | "sukanya"
  | "ppf"
  | "elss"
  | "mutualFund"
  | "lifeInsurance"
  | "healthInsurance"
  | "nps"
  | "homeLoan"
  | "fixedDeposit"
  | "bankStatement"
  | "tuitionFee"
  | "donation"
  | "rent"
  | "taxChallan"
  | "unknown";

export interface DocumentFill {
  id: string;
  field: FillField;
  amount: number;
  /** Plain-language sentence, e.g. "Money you put into Sukanya Samriddhi this year". */
  label: string;
  /** Line(s) of the document the amount came from. */
  evidence: string;
  /** Whether the user wants this number used. */
  include: boolean;
}

export interface ReadDocument {
  id: string;
  fileName: string;
  kind: DocumentKind;
  /** Plain-language name of what we think the document is. */
  title: string;
  fills: DocumentFill[];
  /** Simple remarks for the user ("we could not find a total, please type it"). */
  notes: string[];
  confidence: "high" | "medium" | "low";
  form16?: Form16Data;
  /** Characters of text we managed to read (0 = scanned image with no OCR text). */
  textLength: number;
}

export const FILL_FIELD_LABELS: Record<FillField, string> = {
  section80C: "Tax-saving investments (PPF, Sukanya, LIC, ELSS, school fees…)",
  section80CCD1B: "Extra pension saving (NPS)",
  section80D: "Health insurance premium",
  section80TTA: "Savings account interest (tax-free part)",
  section24: "Home loan interest",
  otherDeductions: "Other tax-saving amounts (donations etc.)",
  savingsInterest: "Interest earned on savings account",
  fdInterest: "Interest earned on fixed deposits",
  rdInterest: "Interest earned on recurring deposits",
  capitalGainsSTCG: "Profit on shares / funds sold within a year",
  capitalGainsLTCG: "Profit on shares / funds held over a year",
  rentalIncome: "Rent you received",
  otherTds: "Tax already cut by bank / others (TDS)",
  advanceTax: "Advance tax / self-assessment tax you paid",
};

export const DOCUMENT_TITLES: Record<DocumentKind, string> = {
  form16: "Form 16 from your employer",
  sukanya: "Sukanya Samriddhi account statement",
  ppf: "PPF (Public Provident Fund) statement",
  elss: "Tax-saver (ELSS) mutual fund statement",
  mutualFund: "Mutual fund statement",
  lifeInsurance: "Life insurance premium receipt",
  healthInsurance: "Health insurance premium receipt",
  nps: "NPS (pension) statement",
  homeLoan: "Home loan interest certificate",
  fixedDeposit: "Fixed deposit / interest certificate",
  bankStatement: "Bank / post-office statement",
  tuitionFee: "School / college fee receipt",
  donation: "Donation receipt",
  rent: "Rent receipt",
  taxChallan: "Tax payment challan",
  unknown: "Document we could not recognise",
};

let counter = 0;
const nextId = () => `doc-${Date.now().toString(36)}-${(counter++).toString(36)}`;

// ---------------------------------------------------------------------------------------------
// Text extraction
// ---------------------------------------------------------------------------------------------

const IMAGE_TYPES = new Set(["image/png", "image/jpeg", "image/jpg", "image/webp", "image/bmp"]);

async function ocrImage(file: File): Promise<string> {
  const { recognize } = await import("tesseract.js");
  const result = await recognize(file, "eng");
  return result.data.text;
}

export async function extractTextFromFile(file: File): Promise<string> {
  const name = file.name.toLowerCase();
  if (file.type === "application/pdf" || name.endsWith(".pdf")) {
    const text = await extractTextFromPDF(file);
    return text;
  }
  if (IMAGE_TYPES.has(file.type) || /\.(png|jpe?g|webp|bmp)$/.test(name)) {
    return ocrImage(file);
  }
  if (file.type.startsWith("text/") || /\.(txt|csv)$/.test(name)) {
    return file.text();
  }
  throw new Error(`Unsupported file type: ${file.type || name}`);
}

// ---------------------------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------------------------

const AMOUNT_RE = /(?:rs\.?|inr|₹)?\s*(\d{1,3}(?:,\d{2,3})+(?:\.\d{1,2})?|\d+(?:\.\d{1,2})?)/gi;

/** All rupee-looking numbers on a line, left to right (years and account numbers filtered out). */
function amountsOn(line: string): number[] {
  const out: number[] = [];
  const cleaned = line.replace(/\d{2}[-/.]\d{2}[-/.]\d{2,4}/g, " ").replace(/\b\d{9,}\b/g, " ");
  for (const m of cleaned.matchAll(AMOUNT_RE)) {
    const raw = m[1].replace(/,/g, "");
    const n = Number(raw);
    if (!Number.isFinite(n) || n <= 0) continue;
    if (!m[1].includes(",") && !m[1].includes(".") && n >= 1900 && n <= 2100) continue; // a year
    if (n < 10) continue;
    out.push(n);
  }
  return out;
}

const lines = (text: string) => text.split(/\r?\n/).map((l) => l.replace(/\s+/g, " ").trim()).filter(Boolean);

function has(text: string, ...words: (string | RegExp)[]): boolean {
  const lower = text.toLowerCase();
  return words.some((w) => (typeof w === "string" ? lower.includes(w) : w.test(lower)));
}

function count(text: string, re: RegExp): number {
  return (text.match(re) ?? []).length;
}

/** First amount on the first line that matches any of the patterns. */
function amountAfter(allLines: string[], patterns: RegExp[]): { amount: number; line: string } | null {
  for (const re of patterns) {
    for (const line of allLines) {
      if (!re.test(line)) continue;
      const nums = amountsOn(line);
      if (nums.length) return { amount: nums[nums.length - 1], line };
    }
  }
  return null;
}

/**
 * Sums the transaction amount on every line that matches `re`. Statement rows usually end with the
 * running balance, so when a row has two or more numbers the one before the last is the transaction.
 */
function sumRows(allLines: string[], re: RegExp, skip?: RegExp): { total: number; rows: string[] } {
  let total = 0;
  const rows: string[] = [];
  for (const line of allLines) {
    if (!re.test(line) || (skip && skip.test(line))) continue;
    const nums = amountsOn(line);
    if (!nums.length) continue;
    const txn = nums.length >= 2 ? nums[nums.length - 2] : nums[0];
    total += txn;
    rows.push(line);
  }
  return { total: Math.round(total), rows };
}

const fill = (field: FillField, amount: number, label: string, evidence: string | string[]): DocumentFill => ({
  id: nextId(),
  field,
  amount: Math.round(amount),
  label,
  evidence: Array.isArray(evidence) ? evidence.slice(0, 4).join(" | ") : evidence,
  include: amount > 0,
});

// ---------------------------------------------------------------------------------------------
// Classification
// ---------------------------------------------------------------------------------------------

export function detectDocumentKind(text: string): DocumentKind {
  const t = text.toLowerCase();
  if (has(t, "form no. 16", "form 16", "form no.16", /part\s*b.*salary/i, "certificate under section 203")) return "form16";
  if (has(t, "sukanya", "ssy", "samriddhi", "samridhi")) return "sukanya";
  if (has(t, "public provident fund", /\bppf\b/)) return "ppf";
  if (has(t, "challan", "itns 280", "self assessment tax", "advance tax")) return "taxChallan";
  if (has(t, "national pension", /\bnps\b/, "pran", "tier i", "tier-i", "tier 1")) return "nps";
  if (has(t, "elss", "tax saver", "tax-saver", "taxsaver", "long term equity")) return "elss";
  if (has(t, "mutual fund", "folio", "nav", "sip", "redemption", "capital gain")) return "mutualFund";
  if (has(t, "mediclaim", "health insurance", "health policy", "hospitalisation", "hospitalization", "star health", "care health", "niva bupa")) return "healthInsurance";
  if (has(t, "life insurance", /\blic\b/, "premium receipt", "policy no", "sum assured")) return "lifeInsurance";
  if (has(t, "home loan", "housing loan", "interest certificate", "provisional certificate", "principal repaid")) return "homeLoan";
  if (has(t, "fixed deposit", "term deposit", /\bfd\b/, "interest paid/accrued", "form 16a", "recurring deposit")) return "fixedDeposit";
  if (has(t, "tuition", "school fee", "college fee", "fee receipt", "academic year")) return "tuitionFee";
  if (has(t, "80g", "donation", "charitable", "pm cares")) return "donation";
  if (has(t, "rent receipt", "received from", "towards rent", "landlord")) return "rent";
  if (has(t, "statement of account", "account statement", "opening balance", "closing balance", "withdrawal", "deposit", "passbook", "txn", "transaction")) return "bankStatement";
  return "unknown";
}

// ---------------------------------------------------------------------------------------------
// Per-document readers
// ---------------------------------------------------------------------------------------------

const DEPOSIT_RE = /deposit|credit|\bcr\b|contribution|by cash|by transfer|by clg|neft|upi|imps/i;
const INTEREST_RE = /\binterest\b|\bint\b|int\.|intt/i;

function readSukanyaOrPpf(kind: "sukanya" | "ppf", ls: string[]): { fills: DocumentFill[]; notes: string[] } {
  const what = kind === "sukanya" ? "Sukanya Samriddhi" : "PPF";
  const notes: string[] = [];
  const fills: DocumentFill[] = [];

  const total = amountAfter(ls, [/total\s*(deposit|contribution|credit)/i, /(deposit|contribution)s?\s*(during|in|for)\s*(the\s*)?(year|fy)/i]);
  if (total) {
    fills.push(fill("section80C", total.amount, `Money you put into ${what} this year`, total.line));
  } else {
    const deposits = sumRows(ls, DEPOSIT_RE, INTEREST_RE);
    if (deposits.total > 0) {
      fills.push(fill("section80C", deposits.total, `Money you put into ${what} this year (${deposits.rows.length} deposits added up)`, deposits.rows));
    } else {
      notes.push(`We saw this is a ${what} statement but could not add up the deposits. Please type the total you put in this year.`);
    }
  }
  const interest = amountAfter(ls, [/interest\s*(credited|earned|for the year|paid)/i]) ?? (() => {
    const s = sumRows(ls, INTEREST_RE);
    return s.total > 0 ? { amount: s.total, line: s.rows.join(" | ") } : null;
  })();
  if (interest) {
    notes.push(`Interest of ₹${interest.amount.toLocaleString("en-IN")} shown here is tax-free — you do not pay tax on ${what} interest, so we have not added it to your income.`);
  }
  return { fills, notes };
}

function readMutualFund(kind: "elss" | "mutualFund", ls: string[], text: string): { fills: DocumentFill[]; notes: string[] } {
  const notes: string[] = [];
  const fills: DocumentFill[] = [];
  const isElss = kind === "elss" || has(text, "elss", "tax saver", "tax-saver");

  if (isElss) {
    const total = amountAfter(ls, [/total\s*(purchase|investment|invested|amount)/i, /amount\s*invested/i]);
    const purchases = total ? { total: total.amount, rows: [total.line] } : sumRows(ls, /purchase|sip|systematic|investment|buy/i, /redemption|redeem|switch.?out|dividend/i);
    if (purchases.total > 0) {
      fills.push(fill("section80C", purchases.total, "Money you put into tax-saver (ELSS) mutual funds this year", purchases.rows));
    } else {
      notes.push("This looks like a tax-saver fund statement but we could not find the amount invested. Please type it.");
    }
  } else {
    notes.push("Regular (non tax-saver) mutual funds do not reduce your tax. Only profit you booked by selling matters.");
  }

  const stcg = amountAfter(ls, [/short\s*term\s*(capital)?\s*gain/i, /\bstcg\b/i]);
  if (stcg) fills.push(fill("capitalGainsSTCG", stcg.amount, "Profit on fund units sold within 1 year", stcg.line));
  const ltcg = amountAfter(ls, [/long\s*term\s*(capital)?\s*gain/i, /\bltcg\b/i]);
  if (ltcg) fills.push(fill("capitalGainsLTCG", ltcg.amount, "Profit on fund units held more than 1 year", ltcg.line));
  if (!stcg && !ltcg && has(text, "redemption", "redeem")) {
    notes.push("You sold some units this year. If your fund house gave a 'capital gains statement', upload that too so we can fill the profit.");
  }
  return { fills, notes };
}

function readInsurance(kind: "lifeInsurance" | "healthInsurance", ls: string[]): { fills: DocumentFill[]; notes: string[] } {
  const prem = amountAfter(ls, [/total\s*premium/i, /premium\s*(amount|paid|received)/i, /amount\s*(paid|received)/i, /premium/i, /total/i]);
  if (!prem) return { fills: [], notes: ["We could not find the premium amount on this receipt. Please type it."] };
  if (kind === "healthInsurance") {
    return { fills: [fill("section80D", prem.amount, "Health insurance premium you paid", prem.line)], notes: [] };
  }
  return { fills: [fill("section80C", prem.amount, "Life insurance (LIC etc.) premium you paid", prem.line)], notes: [] };
}

function readNps(ls: string[]): { fills: DocumentFill[]; notes: string[] } {
  const total = amountAfter(ls, [/total\s*contribution/i, /contribution\s*(during|for)\s*(the\s*)?(year|fy)/i, /self\s*contribution/i]);
  const s = total ? { total: total.amount, rows: [total.line] } : sumRows(ls, /contribution|deposit|credit/i, /employer|interest/i);
  if (s.total <= 0) return { fills: [], notes: ["We saw an NPS statement but could not add up your own contributions. Please type them."] };
  return {
    fills: [fill("section80CCD1B", Math.min(s.total, 50000), "Your own money put into NPS this year (up to ₹50,000 counts extra)", s.rows)],
    notes: s.total > 50000 ? [`You put ₹${s.total.toLocaleString("en-IN")} into NPS; the extra saving counts only up to ₹50,000, the rest can go under the ₹1.5 lakh bucket.`] : [],
  };
}

function readHomeLoan(ls: string[]): { fills: DocumentFill[]; notes: string[] } {
  const interest = amountAfter(ls, [/interest\s*(component|paid|charged|amount|portion)/i, /total\s*interest/i, /interest/i]);
  const principal = amountAfter(ls, [/principal\s*(component|repaid|paid|amount|portion)/i, /total\s*principal/i]);
  const fills: DocumentFill[] = [];
  if (interest) fills.push(fill("section24", interest.amount, "Home loan interest you paid this year", interest.line));
  if (principal) fills.push(fill("section80C", principal.amount, "Home loan principal you repaid (counts in the ₹1.5 lakh bucket)", principal.line));
  return { fills, notes: fills.length ? [] : ["We could not read the interest / principal split. Please type them from the bank's certificate."] };
}

function readFixedDeposit(ls: string[], text: string): { fills: DocumentFill[]; notes: string[] } {
  const fills: DocumentFill[] = [];
  const interest = amountAfter(ls, [/total\s*interest/i, /interest\s*(paid|accrued|credited|earned|amount)/i, /interest/i]);
  const isRd = has(text, "recurring deposit", /\brd\b/);
  if (interest) fills.push(fill(isRd ? "rdInterest" : "fdInterest", interest.amount, `Interest your bank paid you on ${isRd ? "recurring" : "fixed"} deposits`, interest.line));
  const tds = amountAfter(ls, [/tds\s*(deducted|amount)?/i, /tax\s*deducted/i]);
  if (tds) fills.push(fill("otherTds", tds.amount, "Tax the bank already cut (TDS) — you get credit for it", tds.line));
  return { fills, notes: fills.length ? [] : ["We could not find the interest amount. Check the interest certificate from your bank's net-banking."] };
}

function readBankStatement(ls: string[]): { fills: DocumentFill[]; notes: string[] } {
  const fills: DocumentFill[] = [];
  const notes: string[] = [];

  const interest = sumRows(ls, INTEREST_RE, /loan|emi|penal/i);
  if (interest.total > 0) {
    fills.push(fill("savingsInterest", interest.total, "Interest the bank credited to your savings account", interest.rows));
    fills.push(fill("section80TTA", Math.min(interest.total, 10000), "Savings interest that is tax-free (up to ₹10,000)", interest.rows));
  }

  const groups: Array<{ re: RegExp; field: FillField; label: string }> = [
    { re: /sukanya|ssy|samriddhi|samridhi/i, field: "section80C", label: "Sukanya Samriddhi deposits seen in your statement" },
    { re: /\bppf\b|public provident/i, field: "section80C", label: "PPF deposits seen in your statement" },
    { re: /\blic\b|life insurance|hdfc life|icici pru|sbi life|max life|bajaj allianz life/i, field: "section80C", label: "Life insurance premiums seen in your statement" },
    { re: /elss|tax saver|taxsaver/i, field: "section80C", label: "Tax-saver fund (ELSS) purchases seen in your statement" },
    { re: /\bnsc\b|national savings cert/i, field: "section80C", label: "NSC purchases seen in your statement" },
    { re: /tuition|school fee|college fee/i, field: "section80C", label: "School / college tuition fees seen in your statement" },
    { re: /\bnps\b|national pension|cra-nsdl|kfintech nps/i, field: "section80CCD1B", label: "NPS deposits seen in your statement" },
    { re: /mediclaim|health ins|star health|care health|niva bupa|hdfc ergo|icici lombard/i, field: "section80D", label: "Health insurance premiums seen in your statement" },
  ];
  for (const g of groups) {
    const s = sumRows(ls, g.re, /reversal|refund|interest/i);
    if (s.total > 0) fills.push(fill(g.field, s.total, g.label, s.rows));
  }

  const rent = sumRows(ls, /rent\s*(recd|received|from|credit)|rent\b.*\bcr\b/i, /rent\s*(paid|to)|debit|\bdr\b/i);
  if (rent.total > 0) fills.push(fill("rentalIncome", rent.total, "Rent that came into your account", rent.rows));

  if (!fills.length) notes.push("We read the statement but did not spot interest or tax-saving payments. You can still type them in the next step.");
  else notes.push("Please check each amount — statements sometimes list the balance next to the transaction and we may pick the wrong column.");
  return { fills, notes };
}

function readTuition(ls: string[]): { fills: DocumentFill[]; notes: string[] } {
  const amt = amountAfter(ls, [/tuition\s*fee/i, /total\s*(fee|amount|paid)/i, /amount\s*(paid|received)/i, /total/i]);
  if (!amt) return { fills: [], notes: ["We could not read the fee amount. Only the 'tuition fee' part counts, not bus, books or hostel."] };
  return { fills: [fill("section80C", amt.amount, "Tuition fees paid for your children (only the tuition part counts)", amt.line)], notes: ["Only the tuition-fee part counts, not bus, uniform, books or donation."] };
}

function readDonation(ls: string[]): { fills: DocumentFill[]; notes: string[] } {
  const amt = amountAfter(ls, [/donation\s*(amount|of|received)/i, /amount\s*(paid|received|donated)/i, /total/i, /rs|₹/i]);
  if (!amt) return { fills: [], notes: ["We could not read the donation amount. Please type it."] };
  return {
    fills: [fill("otherDeductions", Math.round(amt.amount / 2), "Donation you gave (half of it usually reduces your income)", amt.line)],
    notes: ["Most donations reduce your income by 50% of the amount; some government funds give 100%. We used 50% — edit if your receipt says 100%."],
  };
}

function readRent(ls: string[]): { fills: DocumentFill[]; notes: string[] } {
  const amt = amountAfter(ls, [/rent\s*(of|amount|for)/i, /received/i, /rs|₹/i]);
  return { fills: [], notes: amt ? [`This is a rent receipt for ₹${amt.amount.toLocaleString("en-IN")}. Enter your total yearly rent in the "House rent you pay" box on the next page — we do not add it automatically because receipts are usually monthly.`] : ["Rent receipt found. Enter your total yearly rent on the next page."] };
}

function readChallan(ls: string[]): { fills: DocumentFill[]; notes: string[] } {
  const amt = amountAfter(ls, [/total\s*(amount|tax)/i, /amount\s*(paid|₹|rs)/i, /tax\s*amount/i, /total/i]);
  if (!amt) return { fills: [], notes: ["We could not read the amount on the challan. Please type it under 'advance tax paid'."] };
  return { fills: [fill("advanceTax", amt.amount, "Tax you already paid through this challan", amt.line)], notes: [] };
}

// ---------------------------------------------------------------------------------------------
// Entry point
// ---------------------------------------------------------------------------------------------

export function readDocumentText(fileName: string, text: string): ReadDocument {
  const kind = detectDocumentKind(text);
  const ls = lines(text);
  let fills: DocumentFill[] = [];
  let notes: string[] = [];
  let form16: Form16Data | undefined;

  switch (kind) {
    case "form16": {
      form16 = parseForm16Text(text);
      const ok = form16.salary.basicSalary > 0 || form16.tax.tdsDeducted > 0;
      notes = ok
        ? ["We read your salary and the tax your employer already cut. You will see them on the 'Check salary details' page."]
        : ["This looks like a Form 16 but we could not read the salary numbers. Try the Part B PDF from your employer."];
      break;
    }
    case "sukanya":
    case "ppf": ({ fills, notes } = readSukanyaOrPpf(kind, ls)); break;
    case "elss":
    case "mutualFund": ({ fills, notes } = readMutualFund(kind, ls, text)); break;
    case "lifeInsurance":
    case "healthInsurance": ({ fills, notes } = readInsurance(kind, ls)); break;
    case "nps": ({ fills, notes } = readNps(ls)); break;
    case "homeLoan": ({ fills, notes } = readHomeLoan(ls)); break;
    case "fixedDeposit": ({ fills, notes } = readFixedDeposit(ls, text)); break;
    case "bankStatement": ({ fills, notes } = readBankStatement(ls)); break;
    case "tuitionFee": ({ fills, notes } = readTuition(ls)); break;
    case "donation": ({ fills, notes } = readDonation(ls)); break;
    case "rent": ({ fills, notes } = readRent(ls)); break;
    case "taxChallan": ({ fills, notes } = readChallan(ls)); break;
    default:
      notes = text.trim().length < 40
        ? ["We could not read any text in this file. If it is a photo, try a clearer, well-lit picture or the PDF from your bank/app."]
        : ["We could not tell what this document is. You can still type the numbers yourself on the next page."];
  }

  fills = fills.filter((f) => f.amount > 0);
  const confidence: ReadDocument["confidence"] =
    kind === "unknown" ? "low" : fills.length || form16 ? (kind === "bankStatement" ? "medium" : "high") : "low";

  return {
    id: nextId(),
    fileName,
    kind,
    title: DOCUMENT_TITLES[kind],
    fills,
    notes,
    confidence,
    form16,
    textLength: text.trim().length,
  };
}

export async function readDocument(file: File): Promise<ReadDocument> {
  const text = await extractTextFromFile(file);
  return readDocumentText(file.name, text);
}

/** Adds up the included fills of all documents, per ITR field. */
export function totalsByField(docs: ReadDocument[]): Partial<Record<FillField, number>> {
  const totals: Partial<Record<FillField, number>> = {};
  for (const doc of docs) {
    for (const f of doc.fills) {
      if (!f.include || f.amount <= 0) continue;
      totals[f.field] = (totals[f.field] ?? 0) + f.amount;
    }
  }
  if (totals.section80TTA) totals.section80TTA = Math.min(totals.section80TTA, 10000);
  if (totals.section80CCD1B) totals.section80CCD1B = Math.min(totals.section80CCD1B, 50000);
  return totals;
}

/** Which uploaded documents fed a given field — for "filled from …" hints. */
export function sourcesForField(docs: ReadDocument[], field: FillField): string[] {
  const names = new Set<string>();
  for (const doc of docs) for (const f of doc.fills) if (f.include && f.field === field && f.amount > 0) names.add(doc.fileName);
  return [...names];
}

export { count };
