import { BookingView } from "@/lib/marketplace-types";
import {
  AuditView,
  CaseSummary,
  DocumentView,
  GstProfileView,
  NotificationView,
  TaxpayerProfileView,
  UserSummary,
} from "@/lib/platform-types";

export type VerificationStatus = "PENDING" | "VERIFIED" | "REJECTED";

export const INVESTMENT_TYPES = [
  "MUTUAL_FUND",
  "STOCKS",
  "PPF",
  "ELSS",
  "NPS",
  "INSURANCE",
  "FIXED_DEPOSIT",
  "BONDS",
  "OTHER",
] as const;
export type InvestmentType = (typeof INVESTMENT_TYPES)[number];

export const TAX_PAYMENT_TYPES = ["ADVANCE_TAX", "SELF_ASSESSMENT_TAX", "TDS", "GST", "OTHER"] as const;
export type TaxPaymentType = (typeof TAX_PAYMENT_TYPES)[number];

export const REFUND_STATUSES = ["CLAIMED", "PROCESSING", "ISSUED", "PARTIALLY_ISSUED", "ADJUSTED", "REJECTED"] as const;
export type RefundStatus = (typeof REFUND_STATUSES)[number];

export type TaxType = "INCOME_TAX" | "GST";

export interface QuarterView {
  number: number;
  label: string;
  start: string;
  end: string;
}

export interface FinancialYearView {
  id: string;
  code: string;
  assessmentYear: string;
  startDate: string;
  endDate: string;
  open: boolean;
  current: boolean;
  notes: string | null;
  quarters: QuarterView[];
}

export interface PeriodView {
  type: string;
  label: string;
  from: string;
  to: string;
  financialYear: string | null;
  groupBy: string;
}

export interface InvestmentView {
  id: string;
  ownerId?: string;
  ownerName?: string;
  type: InvestmentType;
  name: string | null;
  amount: number;
  investedOn: string;
  financialYear: string;
  section: string | null;
  taxSavingEligibleAmount: number;
  expectedReturn: number | null;
  actualReturn: number | null;
  maturityDate: string | null;
  notes: string | null;
  proofDocumentId: string | null;
  verificationStatus: VerificationStatus;
  verificationNote: string | null;
  verifiedAt: string | null;
  createdAt: string;
}

export interface TaxPaymentView {
  id: string;
  ownerId?: string;
  ownerName?: string;
  financialYear: string;
  assessmentYear: string;
  type: TaxPaymentType;
  amount: number;
  paidOn: string;
  challanNumber: string | null;
  paymentMethod: string | null;
  notes: string | null;
  proofDocumentId: string | null;
  verificationStatus: VerificationStatus;
  verificationNote: string | null;
  verifiedAt: string | null;
  createdAt: string;
}

export interface LiabilityView {
  id: string;
  ownerId: string;
  financialYear: string;
  assessmentYear: string;
  taxType: TaxType;
  period: string | null;
  amount: number;
  dueDate: string | null;
  source: "FILING" | "MANUAL";
  filingCaseId: string | null;
  notes: string | null;
  updatedAt: string;
}

export interface RefundView {
  id: string;
  ownerId?: string;
  ownerName?: string;
  financialYear: string;
  assessmentYear: string;
  taxType: TaxType;
  amountClaimed: number;
  amountReceived: number;
  status: RefundStatus;
  referenceNumber: string | null;
  claimedOn: string | null;
  receivedOn: string | null;
  filingCaseId: string | null;
  notes: string | null;
  updatedAt: string;
}

export interface TrackingRow {
  financialYear: string;
  assessmentYear: string;
  taxType: TaxType;
  liability: number;
  verifiedPaid: number;
  unverifiedPaid: number;
  outstanding: number;
  refundClaimed: number;
  refundReceived: number;
  paymentStatus: string;
  filingStatus: string | null;
  dueDate: string | null;
  filedOn: string | null;
  paidByType: Record<string, number>;
  liabilities: LiabilityView[];
}

export interface SavingsSection {
  section: string;
  invested: number;
  verifiedInvested: number;
  limit: number | null;
  eligible: number;
  verifiedEligible: number;
  regimes: string[];
}

export interface SavingsView {
  financialYear: string;
  sections: SavingsSection[];
  totalInvested: number;
  taxSavingInvested: number;
  eligibleDeduction: number;
  verifiedEligibleDeduction: number;
  marginalRate: number;
  cessRate: number;
  rateBasis: string;
  estimatedTaxBenefit: number;
  actualTaxSaved: number | null;
  actualBasis: string;
  disclaimer: string;
}

export interface TrendPoint {
  label: string;
  from: string | null;
  to: string | null;
  value: number;
}

export interface TrendSeries {
  key: string;
  name: string;
  points: TrendPoint[];
}

export interface ClientDashboard {
  period: PeriodView;
  amounts: Record<string, number>;
  counts: Record<string, number>;
  itrStatus: string | null;
  gstStatus: string | null;
  series: TrendSeries[];
  tracking: TrackingRow[];
  recentInvestments: InvestmentView[];
  refunds: RefundView[];
}

export interface AdminAnalytics {
  period: PeriodView;
  counts: Record<string, number>;
  amounts: Record<string, number>;
  series: TrendSeries[];
  consultantTypes: Record<string, number>;
}

export interface Client360 {
  user: UserSummary;
  taxpayerProfile: TaxpayerProfileView | null;
  gstProfile: GstProfileView | null;
  cases: CaseSummary[];
  documents: DocumentView[];
  investments: InvestmentView[];
  payments: TaxPaymentView[];
  tracking: TrackingRow[];
  savings: SavingsView;
  refunds: RefundView[];
  consultations: BookingView[];
  notifications: NotificationView[];
  activity: AuditView[];
  totals: Record<string, number>;
}

export interface PeriodQuery {
  period?: "MONTH" | "QUARTER" | "FY" | "CUSTOM" | "ALL";
  fy?: string;
  month?: string;
  quarter?: number;
  from?: string;
  to?: string;
  groupBy?: string;
}

export interface InvestmentRequest {
  type: InvestmentType;
  name?: string;
  amount: number;
  investedOn: string;
  section?: string;
  taxSavingEligibleAmount?: number;
  expectedReturn?: number;
  actualReturn?: number;
  maturityDate?: string;
  notes?: string;
  proofDocumentId?: string;
}

export interface TaxPaymentRequest {
  type: TaxPaymentType;
  amount: number;
  paidOn: string;
  assessmentYear?: string;
  challanNumber?: string;
  paymentMethod?: string;
  notes?: string;
  proofDocumentId?: string;
}

export interface VerificationDecision {
  status: VerificationStatus;
  note?: string;
  correctedAmount?: number;
  correctedEligibleAmount?: number;
}

export interface LiabilityRequest {
  ownerId: string;
  financialYear: string;
  taxType: TaxType;
  period?: string;
  amount: number;
  dueDate?: string;
  notes?: string;
}

export interface RefundRequest {
  ownerId: string;
  financialYear: string;
  taxType: TaxType;
  amountClaimed: number;
  amountReceived?: number;
  status?: RefundStatus;
  referenceNumber?: string;
  claimedOn?: string;
  receivedOn?: string;
  filingCaseId?: string;
  notes?: string;
}

export interface RefundUpdate {
  amountClaimed?: number;
  amountReceived?: number;
  status?: RefundStatus;
  referenceNumber?: string;
  receivedOn?: string;
  notes?: string;
}

export function labelize(value: string | null | undefined): string {
  if (!value) return "-";
  return value
    .toLowerCase()
    .split("_")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}
