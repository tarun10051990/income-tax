/** Read models returned by the Spring Boot filing API (see docs/ARCHITECTURE.md). */

export type TaxType = "INCOME_TAX" | "GST";

export interface UserSummary {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  pan: string | null;
  role: string;
  active: boolean;
  mfaEnabled: boolean;
  createdAt: string | null;
  lastLoginAt: string | null;
}

export interface TaxpayerProfileView {
  id: string;
  pan: string | null;
  aadhaar: string | null;
  taxpayerType: string | null;
  dateOfBirth: string | null;
  addressLine1: string | null;
  addressLine2: string | null;
  city: string | null;
  state: string | null;
  pincode: string | null;
  bankAccountNumber: string | null;
  bankIfsc: string | null;
  bankName: string | null;
  metroCity: boolean;
}

export interface GstProfileView {
  id: string;
  gstin: string;
  legalName: string;
  tradeName: string | null;
  businessType: string | null;
  businessActivity: string | null;
  registeredAddress: string | null;
  state: string | null;
  authorizedSignatory: string | null;
  signatoryDesignation: string | null;
  bankAccountNumber: string | null;
  registrationDate: string | null;
  compositionScheme: boolean;
  active: boolean;
}

export interface CaseSummary {
  id: string;
  caseNumber: string;
  taxType: TaxType;
  returnType: string | null;
  status: string;
  priority: string;
  financialYear: string | null;
  assessmentYear: string | null;
  period: string | null;
  dueDate: string | null;
  customer: UserSummary | null;
  assignedTo: UserSummary | null;
  createdAt: string | null;
  updatedAt: string | null;
}

export interface DocumentView {
  id: string;
  fileName: string;
  category: string;
  status: string;
  scanStatus: string;
  versionNumber: number;
  sizeBytes: number;
  expiresOn: string | null;
  verifiedBy: string | null;
  verifiedAt: string | null;
  rejectionReason: string | null;
  createdAt: string;
  caseId: string | null;
  caseNumber: string | null;
  ownerName: string | null;
}

export interface QueryResponseView {
  id: string;
  message: string;
  respondedBy: string | null;
  documentId: string | null;
  createdAt: string;
}

export interface QueryView {
  id: string;
  queryNumber: string;
  caseId: string;
  caseNumber: string;
  category: string;
  question: string;
  priority: string;
  status: string;
  dueDate: string | null;
  raisedBy: string | null;
  responses: QueryResponseView[];
  createdAt: string;
}

export interface CommentView {
  id: string;
  message: string;
  internal: boolean;
  author: string | null;
  createdAt: string;
}

export interface EventView {
  id: string;
  action: string | null;
  fromStatus: string | null;
  toStatus: string;
  actor: string | null;
  note: string | null;
  createdAt: string;
}

export interface CaseDetail {
  summary: CaseSummary;
  filing: unknown;
  computation: unknown;
  documents: DocumentView[];
  queries: QueryView[];
  comments: CommentView[];
  events: EventView[];
  availableTransitions: string[];
}

export interface InvoiceView {
  id: string;
  documentType: string;
  source: string;
  supplyType: string;
  invoiceNumber: string;
  invoiceDate: string;
  counterpartyGstin: string | null;
  counterpartyName: string | null;
  placeOfSupply: string | null;
  hsnSacCode: string | null;
  taxableValue: number;
  cgst: number;
  sgst: number;
  igst: number;
  cess: number;
  totalTax: number;
  reverseCharge: boolean;
  itcEligible: boolean;
}

export interface ReconciliationView {
  id: string;
  status: string;
  invoiceNumber: string | null;
  counterpartyGstin: string | null;
  taxableValueDifference: number;
  taxDifference: number;
  remarks: string | null;
  resolved: boolean;
}

export interface GstComputation {
  outputTaxableValue: number;
  outputTax: number;
  inputTaxCredit: number;
  reverseChargeLiability: number;
  exemptSupplies: number;
  nilRatedSupplies: number;
  nonGstSupplies: number;
  zeroRatedSupplies: number;
  creditUtilised: number;
  creditCarriedForward: number;
  taxPayable: number;
  interest: number;
  lateFee: number;
  daysLate: number;
  netLiability: number;
  invoiceCount: number;
}

export interface ImportResult {
  imported: number;
  duplicates: number;
  rejected: { field: string; message: string }[];
}

export interface PaymentView {
  id: string;
  invoiceNumber: string;
  description: string | null;
  amount: number;
  taxAmount: number;
  totalAmount: number;
  status: string;
  caseNumber: string | null;
  dueDate: string | null;
  paidAt: string | null;
  failureReason: string | null;
  createdAt: string;
}

export interface NotificationView {
  id: string;
  eventKey: string;
  subject: string;
  body: string;
  caseId: string | null;
  channel: string;
  read: boolean;
  createdAt: string;
}

export interface AuditView {
  id: string;
  actorEmail: string | null;
  actorRole: string | null;
  action: string;
  entityType: string | null;
  entityId: string | null;
  oldValue: string | null;
  newValue: string | null;
  ipAddress: string | null;
  traceId: string | null;
  createdAt: string;
}

export interface TaxRuleView {
  id: string;
  ruleKey: string;
  taxType: TaxType;
  category: string;
  description: string | null;
  effectiveFrom: string;
  effectiveTo: string | null;
  version: number;
  configuration: string;
  active: boolean;
  createdBy: string | null;
  approvedBy: string | null;
}

export interface NotificationTemplate {
  id: string;
  eventKey: string;
  subject: string;
  body: string;
  inApp: boolean;
  email: boolean;
  sms: boolean;
  active: boolean;
  createdAt: string | null;
  updatedAt: string | null;
}

export interface ChartSeries {
  name: string;
  points: { label: string; value: number }[];
}

export interface DashboardView {
  incomeTaxKpis: Record<string, number>;
  gstKpis: Record<string, number>;
  charts: ChartSeries[];
  upcomingDeadlines: CaseSummary[];
  revenue: Record<string, number>;
}

export interface ReportData {
  title: string;
  headers: string[];
  rows: (string | number | null)[][];
}

export interface RegimeComputation {
  regime: string;
  grossTotalIncome: number;
  standardDeduction: number;
  hraExemption: number;
  deductionsBySection: Record<string, number>;
  totalDeductions: number;
  taxableIncome: number;
  taxBeforeRebate: number;
  rebate: number;
  cess: number;
  totalTax: number;
  taxAlreadyPaid: number;
  refundDue: number;
  taxPayable: number;
}

export interface IncomeTaxComparison {
  oldRegime: RegimeComputation;
  newRegime: RegimeComputation;
  recommendedRegime: string;
  savings: number;
}

export interface FilingSubmission {
  outcome: "MANUAL_ACTION_REQUIRED" | "ACCEPTED" | "REJECTED";
  referenceNumber: string | null;
  acknowledgementNumber: string | null;
  acknowledgedAt: string | null;
  message: string;
}
