import { PageResult, Scope, apiRequest, queryString } from "@/lib/api";
import {
  AvailabilityRuleView,
  BookingView,
  CategoryView,
  ConsultantDashboard,
  ConsultantPrivateView,
  ConsultantPublicView,
  ConsultationInvoice,
  CouponView,
  DaySlots,
  HolidayView,
  MarketplaceStats,
  MessageView,
  PayoutView,
  PricingRuleView,
  ProfessionalTypeView,
  QuoteView,
  ReviewView,
  ServiceView,
  SharedDocumentView,
} from "@/lib/marketplace-types";

type Params = Record<string, string | number | undefined | null>;

/* Public marketplace (no auth) -------------------------------------------------------- */

export const marketplaceApi = {
  professionalTypes: () => apiRequest<ProfessionalTypeView[]>("/public/marketplace/professional-types"),
  categories: () => apiRequest<CategoryView[]>("/public/marketplace/categories"),
  pricing: () => apiRequest<Record<string, number>>("/public/marketplace/pricing"),
  consultants: (params: Params = {}) =>
    apiRequest<PageResult<ConsultantPublicView>>(`/public/marketplace/consultants${queryString({ size: 12, ...params })}`),
  consultant: (id: string) => apiRequest<ConsultantPublicView>(`/public/marketplace/consultants/${id}`),
  slots: (id: string, params: { from?: string; days?: number; duration?: number } = {}) =>
    apiRequest<DaySlots[]>(`/public/marketplace/consultants/${id}/slots${queryString(params)}`),
  reviews: (id: string, params: Params = {}) =>
    apiRequest<PageResult<ReviewView>>(`/public/marketplace/consultants/${id}/reviews${queryString(params)}`),
  quote: (body: { consultantId: string; serviceId?: string; mode: string; urgent: boolean; couponCode?: string }) =>
    apiRequest<QuoteView>("/public/marketplace/quote", { method: "POST", body }),
};

/* Bookings: shared by the client (customer scope) and the consultant (consultant scope) -- */

export function bookingApi(scope: Scope) {
  const opts = { scope };
  return {
    mine: (params: Params = {}) =>
      apiRequest<PageResult<BookingView>>(`/bookings${queryString({ size: 50, ...params })}`, opts),
    create: (body: Record<string, unknown>) => apiRequest<BookingView>("/bookings", { ...opts, method: "POST", body }),
    detail: (id: string) => apiRequest<BookingView>(`/bookings/${id}`, opts),
    confirmPayment: (id: string, paymentReference: string) =>
      apiRequest<BookingView>(`/bookings/${id}/confirm-payment`, { ...opts, method: "POST", body: { paymentReference } }),
    reschedule: (id: string, scheduledStart: string) =>
      apiRequest<BookingView>(`/bookings/${id}/reschedule`, { ...opts, method: "POST", body: { scheduledStart } }),
    cancel: (id: string, reason: string) =>
      apiRequest<BookingView>(`/bookings/${id}/cancel`, { ...opts, method: "POST", body: { reason } }),
    invoice: (id: string) => apiRequest<ConsultationInvoice>(`/bookings/${id}/invoice`, opts),
    messages: (id: string) => apiRequest<MessageView[]>(`/bookings/${id}/messages`, opts),
    send: (id: string, body: string, attachmentDocumentId?: string) =>
      apiRequest<MessageView>(`/bookings/${id}/messages`, { ...opts, method: "POST", body: { body, attachmentDocumentId } }),
    documents: (id: string) => apiRequest<SharedDocumentView[]>(`/bookings/${id}/documents`, opts),
    share: (id: string, documentId: string) =>
      apiRequest<SharedDocumentView>(`/bookings/${id}/documents`, { ...opts, method: "POST", body: { documentId } }),
    revoke: (id: string, shareId: string) =>
      apiRequest<void>(`/bookings/${id}/documents/${shareId}`, { ...opts, method: "DELETE" }),
    review: (id: string, rating: number, comment: string) =>
      apiRequest<ReviewView>(`/bookings/${id}/review`, { ...opts, method: "POST", body: { rating, comment } }),
  };
}

/* Consultant portal ------------------------------------------------------------------- */

const consultant = { scope: "consultant" as const };

export const consultantApi = {
  dashboard: () => apiRequest<ConsultantDashboard>("/consultant/dashboard", consultant),
  profile: () => apiRequest<ConsultantPrivateView>("/consultant/profile", consultant),
  updateProfile: (body: Record<string, unknown>) =>
    apiRequest<ConsultantPrivateView>("/consultant/profile", { ...consultant, method: "PUT", body }),
  updateBank: (body: Record<string, unknown>) =>
    apiRequest<ConsultantPrivateView>("/consultant/profile/bank", { ...consultant, method: "PUT", body }),
  services: () => apiRequest<ServiceView[]>("/consultant/services", consultant),
  createService: (body: Record<string, unknown>) =>
    apiRequest<ServiceView>("/consultant/services", { ...consultant, method: "POST", body }),
  updateService: (id: string, body: Record<string, unknown>) =>
    apiRequest<ServiceView>(`/consultant/services/${id}`, { ...consultant, method: "PUT", body }),
  deleteService: (id: string) => apiRequest<void>(`/consultant/services/${id}`, { ...consultant, method: "DELETE" }),
  availability: () => apiRequest<AvailabilityRuleView[]>("/consultant/availability", consultant),
  saveAvailability: (rules: { dayOfWeek: string; startTime: string; endTime: string }[]) =>
    apiRequest<AvailabilityRuleView[]>("/consultant/availability", { ...consultant, method: "PUT", body: { rules } }),
  holidays: () => apiRequest<HolidayView[]>("/consultant/holidays", consultant),
  addHoliday: (body: { date: string; reason?: string }) =>
    apiRequest<HolidayView>("/consultant/holidays", { ...consultant, method: "POST", body }),
  removeHoliday: (id: string) => apiRequest<void>(`/consultant/holidays/${id}`, { ...consultant, method: "DELETE" }),
  bookings: (filter: string, params: Params = {}) =>
    apiRequest<PageResult<BookingView>>(`/consultant/bookings${queryString({ filter, size: 50, ...params })}`, consultant),
  start: (id: string) => apiRequest<BookingView>(`/consultant/bookings/${id}/start`, { ...consultant, method: "POST" }),
  complete: (id: string) =>
    apiRequest<BookingView>(`/consultant/bookings/${id}/complete`, { ...consultant, method: "POST" }),
  noShow: (id: string) => apiRequest<BookingView>(`/consultant/bookings/${id}/no-show`, { ...consultant, method: "POST" }),
  notes: (id: string, notes: string) =>
    apiRequest<BookingView>(`/consultant/bookings/${id}/notes`, { ...consultant, method: "PUT", body: { notes } }),
  payouts: () => apiRequest<PageResult<PayoutView>>(`/consultant/payouts${queryString({ size: 50 })}`, consultant),
  reviews: () => apiRequest<PageResult<ReviewView>>(`/consultant/reviews${queryString({ size: 50 })}`, consultant),
};

/* Admin marketplace ------------------------------------------------------------------- */

const admin = { scope: "admin" as const };

export const adminMarketplaceApi = {
  stats: () => apiRequest<MarketplaceStats>("/admin/marketplace/stats", admin),
  consultants: (params: Params = {}) =>
    apiRequest<PageResult<ConsultantPrivateView>>(`/admin/marketplace/consultants${queryString({ size: 25, ...params })}`, admin),
  consultant: (id: string) => apiRequest<ConsultantPrivateView>(`/admin/marketplace/consultants/${id}`, admin),
  consultantServices: (id: string) => apiRequest<ServiceView[]>(`/admin/marketplace/consultants/${id}/services`, admin),
  consultantAvailability: (id: string) =>
    apiRequest<AvailabilityRuleView[]>(`/admin/marketplace/consultants/${id}/availability`, admin),
  updateConsultant: (id: string, body: Record<string, unknown>) =>
    apiRequest<ConsultantPrivateView>(`/admin/marketplace/consultants/${id}`, { ...admin, method: "PUT", body }),
  decide: (id: string, action: "review" | "approve" | "reject" | "suspend" | "reactivate", notes?: string) =>
    apiRequest<ConsultantPrivateView>(`/admin/marketplace/consultants/${id}/${action}`, {
      ...admin,
      method: "POST",
      body: { notes },
    }),
  account: (id: string, active: boolean) =>
    apiRequest<ConsultantPrivateView>(`/admin/marketplace/consultants/${id}/account${queryString({ active: `${active}` })}`, {
      ...admin,
      method: "POST",
    }),
  professionalTypes: () => apiRequest<ProfessionalTypeView[]>("/admin/marketplace/professional-types", admin),
  saveProfessionalType: (body: Record<string, unknown>) =>
    apiRequest<ProfessionalTypeView>("/admin/marketplace/professional-types", { ...admin, method: "POST", body }),
  categories: () => apiRequest<CategoryView[]>("/admin/marketplace/categories", admin),
  saveCategory: (body: Record<string, unknown>) =>
    apiRequest<CategoryView>("/admin/marketplace/categories", { ...admin, method: "POST", body }),
  pricingRules: () => apiRequest<PricingRuleView[]>("/admin/marketplace/pricing-rules", admin),
  updatePricingRule: (code: string, value: number) =>
    apiRequest<PricingRuleView>(`/admin/marketplace/pricing-rules/${code}`, { ...admin, method: "PUT", body: { value } }),
  coupons: () => apiRequest<CouponView[]>("/admin/marketplace/coupons", admin),
  saveCoupon: (body: Record<string, unknown>) =>
    apiRequest<CouponView>("/admin/marketplace/coupons", { ...admin, method: "POST", body }),
  bookings: (params: Params = {}) =>
    apiRequest<PageResult<BookingView>>(`/admin/marketplace/bookings${queryString({ size: 25, ...params })}`, admin),
  booking: (id: string) => apiRequest<BookingView>(`/admin/marketplace/bookings/${id}`, admin),
  bookingMessages: (id: string) => apiRequest<MessageView[]>(`/admin/marketplace/bookings/${id}/messages`, admin),
  cancelBooking: (id: string, reason: string) =>
    apiRequest<BookingView>(`/admin/marketplace/bookings/${id}/cancel`, { ...admin, method: "POST", body: { reason } }),
  refundBooking: (id: string, reason: string) =>
    apiRequest<BookingView>(`/admin/marketplace/bookings/${id}/refund`, { ...admin, method: "POST", body: { reason } }),
  payouts: (params: Params = {}) =>
    apiRequest<PageResult<PayoutView>>(`/admin/marketplace/payouts${queryString({ size: 50, ...params })}`, admin),
  generatePayout: (consultantId: string) =>
    apiRequest<PayoutView>(`/admin/marketplace/consultants/${consultantId}/payouts`, { ...admin, method: "POST" }),
  settlePayout: (id: string, paymentReference: string) =>
    apiRequest<PayoutView>(`/admin/marketplace/payouts/${id}/settle`, { ...admin, method: "POST", body: { paymentReference } }),
  reviews: () => apiRequest<PageResult<ReviewView>>(`/admin/marketplace/reviews${queryString({ size: 50 })}`, admin),
  moderate: (id: string, hidden: boolean, note?: string) =>
    apiRequest<ReviewView>(`/admin/marketplace/reviews/${id}/moderate`, { ...admin, method: "POST", body: { hidden, note } }),
};
