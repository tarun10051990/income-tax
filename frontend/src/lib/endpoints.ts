import { PageResult, apiDownload, apiRequest, queryString } from "@/lib/api";
import {
  AuditView,
  CaseDetail,
  CaseSummary,
  DashboardView,
  DocumentView,
  FilingSubmission,
  GstComputation,
  GstProfileView,
  ImportResult,
  IncomeTaxComparison,
  InvoiceView,
  NotificationTemplate,
  NotificationView,
  PaymentView,
  QueryView,
  ReconciliationView,
  ReportData,
  TaxRuleView,
  TaxpayerProfileView,
  UserSummary,
} from "@/lib/platform-types";

/* Taxpayer portal ------------------------------------------------------------------ */

export const customerApi = {
  profile: () => apiRequest<TaxpayerProfileView>("/profile"),
  updateProfile: (body: Record<string, unknown>) =>
    apiRequest<TaxpayerProfileView>("/profile", { method: "PUT", body }),

  gstProfiles: () => apiRequest<GstProfileView[]>("/profile/gst"),
  createGstProfile: (body: Record<string, unknown>) =>
    apiRequest<GstProfileView>("/profile/gst", { method: "POST", body }),
  updateGstProfile: (profileId: string, body: Record<string, unknown>) =>
    apiRequest<GstProfileView>(`/profile/gst/${profileId}`, { method: "PUT", body }),

  cases: (params: { taxType?: string; status?: string; page?: number; size?: number } = {}) =>
    apiRequest<PageResult<CaseSummary>>(`/cases${queryString({ size: 50, ...params })}`),
  caseDetail: (caseId: string) => apiRequest<CaseDetail>(`/cases/${caseId}`),
  comment: (caseId: string, message: string) =>
    apiRequest<unknown>(`/cases/${caseId}/comments`, { method: "POST", body: { message } }),

  createGstFiling: (body: { gstProfileId: string; returnType: string; period: string; financialYear?: string }) =>
    apiRequest<CaseSummary>("/gst/filings", { method: "POST", body }),
  gstInvoices: (caseId: string, params: { documentType?: string; source?: string; page?: number; size?: number } = {}) =>
    apiRequest<PageResult<InvoiceView>>(`/gst/filings/${caseId}/invoices${queryString({ size: 100, ...params })}`),
  addGstInvoice: (caseId: string, body: Record<string, unknown>) =>
    apiRequest<InvoiceView>(`/gst/filings/${caseId}/invoices`, { method: "POST", body }),
  importGstCsv: (caseId: string, file: File, source?: string) => {
    const form = new FormData();
    form.append("file", file);
    if (source !== undefined) {
      form.append("source", source);
    }
    return apiRequest<ImportResult>(`/gst/filings/${caseId}/invoices/import-csv`, { method: "POST", form });
  },
  runReconciliation: (caseId: string) =>
    apiRequest<ReconciliationView[]>(`/gst/filings/${caseId}/reconciliation`, { method: "POST" }),
  reconciliationSummary: (caseId: string) =>
    apiRequest<Record<string, number>>(`/gst/filings/${caseId}/reconciliation`),
  gstComputation: (caseId: string) => apiRequest<GstComputation>(`/gst/filings/${caseId}/computation`),
  submitGstFiling: (caseId: string) =>
    apiRequest<CaseSummary>(`/gst/filings/${caseId}/submit`, { method: "POST" }),

  createIncomeTaxFiling: (body: Record<string, unknown>) =>
    apiRequest<CaseSummary>("/income-tax/filings", { method: "POST", body }),
  incomeTaxComputation: (caseId: string) =>
    apiRequest<IncomeTaxComparison>(`/income-tax/filings/${caseId}/computation`),

  documents: (caseId: string) => apiRequest<DocumentView[]>(`/documents${queryString({ caseId })}`),
  queries: (caseId: string) => apiRequest<QueryView[]>(`/queries${queryString({ caseId })}`),
  respondToQuery: (queryId: string, message: string, documentId?: string) =>
    apiRequest<unknown>(`/queries/${queryId}/responses`, { method: "POST", body: { message, documentId } }),

  payments: (params: { page?: number; size?: number } = {}) =>
    apiRequest<PageResult<PaymentView>>(`/payments${queryString({ size: 50, ...params })}`),

  notifications: (params: { unreadOnly?: string; page?: number; size?: number } = {}) =>
    apiRequest<PageResult<NotificationView>>(`/notifications${queryString({ size: 50, ...params })}`),
  unreadCount: () => apiRequest<number>("/notifications/unread-count"),
  markRead: (notificationId: string) =>
    apiRequest<NotificationView>(`/notifications/${notificationId}/read`, { method: "POST" }),
  markAllRead: () => apiRequest<number>("/notifications/read-all", { method: "POST" }),
};

/* Administration portal ------------------------------------------------------------ */

const admin = { scope: "admin" as const };

export const adminApi = {
  dashboard: () => apiRequest<DashboardView>("/admin/dashboard", admin),
  deadlines: (days = 30) => apiRequest<CaseSummary[]>(`/admin/dashboard/deadlines${queryString({ days })}`, admin),

  cases: (params: Record<string, string | number | undefined>) =>
    apiRequest<PageResult<CaseSummary>>(`/admin/cases${queryString({ size: 25, ...params })}`, admin),
  caseDetail: (caseId: string) => apiRequest<CaseDetail>(`/cases/${caseId}`, admin),
  transition: (caseId: string, body: { targetStatus: string; note?: string }) =>
    apiRequest<CaseSummary>(`/cases/${caseId}/transitions`, { ...admin, method: "POST", body }),
  comment: (caseId: string, body: { message: string; internal: boolean }) =>
    apiRequest<unknown>(`/cases/${caseId}/comments`, { ...admin, method: "POST", body }),
  assign: (caseId: string, assigneeId: string) =>
    apiRequest<CaseSummary>(`/admin/cases/${caseId}/assignment`, { ...admin, method: "POST", body: { assigneeId } }),
  setPriority: (caseId: string, priority: string) =>
    apiRequest<CaseSummary>(`/admin/cases/${caseId}/priority`, { ...admin, method: "POST", body: { priority } }),
  raiseQuery: (body: Record<string, unknown>) =>
    apiRequest<QueryView>("/admin/cases/queries", { ...admin, method: "POST", body }),
  reviewQuery: (queryId: string, body: { accept: boolean; note?: string }) =>
    apiRequest<QueryView>(`/admin/cases/queries/${queryId}/review`, { ...admin, method: "POST", body }),

  documents: (caseId: string) => apiRequest<DocumentView[]>(`/documents${queryString({ caseId })}`, admin),
  documentsByStatus: (params: { status?: string; page?: number; size?: number } = {}) =>
    apiRequest<PageResult<DocumentView>>(`/admin/documents${queryString({ size: 25, ...params })}`, admin),
  verifyDocument: (documentId: string, body: { approve: boolean; reason?: string }) =>
    apiRequest<DocumentView>(`/admin/documents/${documentId}/verification`, { ...admin, method: "POST", body }),
  queriesForCase: (caseId: string) => apiRequest<QueryView[]>(`/queries${queryString({ caseId })}`, admin),
  queriesByStatus: (params: { status?: string; page?: number; size?: number } = {}) =>
    apiRequest<PageResult<QueryView>>(`/admin/cases/queries${queryString({ size: 25, ...params })}`, admin),

  payments: (params: Record<string, string | number | undefined> = {}) =>
    apiRequest<PageResult<PaymentView>>(`/admin/payments${queryString({ size: 25, ...params })}`, admin),
  raiseInvoice: (body: Record<string, unknown>) =>
    apiRequest<PaymentView>("/admin/payments", { ...admin, method: "POST", body }),
  paymentOutcome: (paymentId: string, body: Record<string, unknown>) =>
    apiRequest<PaymentView>(`/admin/payments/${paymentId}/outcome`, { ...admin, method: "POST", body }),

  report: (reportKey: string, params: Record<string, string | undefined> = {}) =>
    apiRequest<ReportData>(`/admin/reports/${reportKey}${queryString(params)}`, admin),
  exportReport: (reportKey: string, format: string) =>
    apiDownload(`/admin/reports/${reportKey}/export${queryString({ format })}`),

  staff: () => apiRequest<UserSummary[]>("/admin/users/staff", admin),
  customers: (params: Record<string, string | number | undefined> = {}) =>
    apiRequest<PageResult<UserSummary>>(`/admin/users/customers${queryString({ size: 25, ...params })}`, admin),
  createStaff: (body: Record<string, unknown>) =>
    apiRequest<UserSummary>("/admin/users/staff", { ...admin, method: "POST", body }),
  updateUser: (userId: string, body: Record<string, unknown>) =>
    apiRequest<UserSummary>(`/admin/users/${userId}`, { ...admin, method: "PUT", body }),
  resetMfa: (userId: string) =>
    apiRequest<UserSummary>(`/admin/users/${userId}/mfa/reset`, { ...admin, method: "POST" }),
  roles: () => apiRequest<Record<string, string[]>>("/admin/users/roles", admin),

  taxRules: (taxType?: string) =>
    apiRequest<TaxRuleView[]>(`/admin/config/tax-rules${queryString({ taxType })}`, admin),
  publishTaxRule: (body: Record<string, unknown>) =>
    apiRequest<TaxRuleView>("/admin/config/tax-rules", { ...admin, method: "POST", body }),
  templates: () => apiRequest<NotificationTemplate[]>("/admin/config/notification-templates", admin),
  saveTemplate: (body: Record<string, unknown>) =>
    apiRequest<NotificationTemplate>("/admin/config/notification-templates", { ...admin, method: "POST", body }),

  auditLogs: (params: Record<string, string | number | undefined> = {}) =>
    apiRequest<PageResult<AuditView>>(`/admin/audit-logs${queryString({ size: 50, ...params })}`, admin),

  integrationStatus: () => apiRequest<Record<string, boolean>>("/admin/integration/status", admin),
  submitToGovernment: (caseId: string) =>
    apiRequest<FilingSubmission>(`/admin/integration/cases/${caseId}/submit`, { ...admin, method: "POST" }),
  recordAcknowledgement: (caseId: string, body: { acknowledgementNumber: string; filedAt?: string }) =>
    apiRequest<CaseSummary>(`/admin/integration/cases/${caseId}/acknowledgement`, {
      ...admin,
      method: "POST",
      body,
    }),
};
