import { PageResult, apiRequest, queryString } from "@/lib/api";
import {
  AdminAnalytics,
  Client360,
  ClientDashboard,
  FinancialYearView,
  InvestmentRequest,
  InvestmentView,
  LiabilityRequest,
  LiabilityView,
  PeriodQuery,
  RefundRequest,
  RefundUpdate,
  RefundView,
  SavingsView,
  TaxPaymentRequest,
  TaxPaymentView,
  TrackingRow,
  VerificationDecision,
} from "@/lib/finance-types";

type Params = Record<string, string | number | undefined | null>;

const customer = { scope: "customer" as const };
const admin = { scope: "admin" as const };

function periodParams(query: PeriodQuery): Params {
  return { ...query };
}

/* Customer: /api/finance ------------------------------------------------------------ */

export const financeApi = {
  financialYears: () => apiRequest<FinancialYearView[]>("/finance/financial-years", customer),
  dashboard: (query: PeriodQuery = {}) =>
    apiRequest<ClientDashboard>(`/finance/dashboard${queryString(periodParams(query))}`, customer),
  investments: (fy?: string) => apiRequest<InvestmentView[]>(`/finance/investments${queryString({ fy })}`, customer),
  createInvestment: (body: InvestmentRequest) =>
    apiRequest<InvestmentView>("/finance/investments", { ...customer, method: "POST", body }),
  updateInvestment: (id: string, body: InvestmentRequest) =>
    apiRequest<InvestmentView>(`/finance/investments/${id}`, { ...customer, method: "PUT", body }),
  deleteInvestment: (id: string) =>
    apiRequest<void>(`/finance/investments/${id}`, { ...customer, method: "DELETE" }),
  payments: (fy?: string) => apiRequest<TaxPaymentView[]>(`/finance/tax-payments${queryString({ fy })}`, customer),
  createPayment: (body: TaxPaymentRequest) =>
    apiRequest<TaxPaymentView>("/finance/tax-payments", { ...customer, method: "POST", body }),
  updatePayment: (id: string, body: TaxPaymentRequest) =>
    apiRequest<TaxPaymentView>(`/finance/tax-payments/${id}`, { ...customer, method: "PUT", body }),
  deletePayment: (id: string) =>
    apiRequest<void>(`/finance/tax-payments/${id}`, { ...customer, method: "DELETE" }),
  tracking: (fy?: string) => apiRequest<TrackingRow[]>(`/finance/tracking${queryString({ fy })}`, customer),
  savings: (fy?: string) => apiRequest<SavingsView>(`/finance/savings${queryString({ fy })}`, customer),
  refunds: (fy?: string) => apiRequest<RefundView[]>(`/finance/refunds${queryString({ fy })}`, customer),
};

/* Staff: /api/admin/finance --------------------------------------------------------- */

export const adminFinanceApi = {
  analytics: (query: PeriodQuery = {}) =>
    apiRequest<AdminAnalytics>(`/admin/finance/analytics${queryString(periodParams(query))}`, admin),
  financialYears: () => apiRequest<FinancialYearView[]>("/admin/finance/financial-years", admin),
  saveFinancialYear: (body: { code: string; open?: boolean; notes?: string }) =>
    apiRequest<FinancialYearView>("/admin/finance/financial-years", { ...admin, method: "POST", body }),
  investments: (params: Params = {}) =>
    apiRequest<PageResult<InvestmentView>>(`/admin/finance/investments${queryString({ size: 20, ...params })}`, admin),
  verifyInvestment: (id: string, body: VerificationDecision) =>
    apiRequest<InvestmentView>(`/admin/finance/investments/${id}/verify`, { ...admin, method: "POST", body }),
  payments: (params: Params = {}) =>
    apiRequest<PageResult<TaxPaymentView>>(`/admin/finance/tax-payments${queryString({ size: 20, ...params })}`, admin),
  verifyPayment: (id: string, body: VerificationDecision) =>
    apiRequest<TaxPaymentView>(`/admin/finance/tax-payments/${id}/verify`, { ...admin, method: "POST", body }),
  liabilities: (params: Params = {}) =>
    apiRequest<PageResult<LiabilityView>>(`/admin/finance/liabilities${queryString({ size: 20, ...params })}`, admin),
  createLiability: (body: LiabilityRequest) =>
    apiRequest<LiabilityView>("/admin/finance/liabilities", { ...admin, method: "POST", body }),
  deleteLiability: (id: string) =>
    apiRequest<void>(`/admin/finance/liabilities/${id}`, { ...admin, method: "DELETE" }),
  refunds: (params: Params = {}) =>
    apiRequest<PageResult<RefundView>>(`/admin/finance/refunds${queryString({ size: 20, ...params })}`, admin),
  createRefund: (body: RefundRequest) =>
    apiRequest<RefundView>("/admin/finance/refunds", { ...admin, method: "POST", body }),
  updateRefund: (id: string, body: RefundUpdate) =>
    apiRequest<RefundView>(`/admin/finance/refunds/${id}`, { ...admin, method: "PUT", body }),
  client360: (clientId: string, fy?: string) =>
    apiRequest<Client360>(`/admin/finance/clients/${clientId}/360${queryString({ fy })}`, admin),
};
