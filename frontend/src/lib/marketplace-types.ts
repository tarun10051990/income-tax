/** Response shapes for the consultant marketplace (mirrors backend MarketplaceViews). */

export type ConsultationMode = "VIDEO" | "PHONE" | "CHAT" | "IN_PERSON";
export const CONSULTATION_MODES: ConsultationMode[] = ["VIDEO", "PHONE", "CHAT", "IN_PERSON"];
export const DAYS_OF_WEEK = ["MONDAY", "TUESDAY", "WEDNESDAY", "THURSDAY", "FRIDAY", "SATURDAY", "SUNDAY"] as const;

export interface ProfessionalTypeView {
  id: string;
  code: string;
  label: string;
  designation: string | null;
  regulator: string;
  active: boolean;
  sortOrder: number;
}

export interface CategoryView {
  id: string;
  slug: string;
  name: string;
  domain: string;
  description: string | null;
  recommendedTypes: string[];
  startingFee: number | null;
  active: boolean;
  sortOrder: number;
}

export interface ServiceView {
  id: string;
  title: string;
  description: string | null;
  categorySlug: string | null;
  categoryName: string | null;
  fee: number;
  durationMinutes: number;
  modes: ConsultationMode[];
  active: boolean;
}

export interface ConsultantPublicView {
  id: string;
  name: string;
  designation: string | null;
  professionalType: string;
  professionalTypeCode: string;
  registrationNumber: string | null;
  qualification: string | null;
  experienceYears: number;
  specializations: string[];
  categorySlugs: string[];
  city: string | null;
  state: string | null;
  languages: string[];
  photoUrl: string | null;
  bio: string | null;
  consultationModes: ConsultationMode[];
  startingFee: number;
  slotDurationMinutes: number;
  verified: boolean;
  averageRating: number | null;
  reviewCount: number;
  completedConsultations: number;
  services: ServiceView[];
  nextAvailableAt: string | null;
}

export interface ConsultantPrivateView {
  profile: ConsultantPublicView;
  userId: string;
  email: string;
  phone: string | null;
  status: string;
  verificationNotes: string | null;
  verifiedAt: string | null;
  bankAccountName: string | null;
  bankAccountNumberMasked: string | null;
  bankIfsc: string | null;
  upiId: string | null;
  accountActive: boolean;
  createdAt: string;
}

export interface AvailabilityRuleView {
  id: string;
  dayOfWeek: string;
  startTime: string;
  endTime: string;
}

export interface HolidayView {
  id: string;
  date: string;
  reason: string | null;
}

export interface SlotView {
  start: string;
  end: string;
}

export interface DaySlots {
  date: string;
  slots: SlotView[];
}

export interface QuoteView {
  consultationFee: number;
  urgentSurcharge: number;
  modeSurcharge: number;
  platformFee: number;
  taxAmount: number;
  discount: number;
  total: number;
  couponCode: string | null;
  durationMinutes: number;
  estimate: boolean;
}

export interface BookingView {
  id: string;
  reference: string;
  status: string;
  paymentStatus: string;
  consultantId: string;
  consultantName: string;
  consultantType: string;
  clientId: string;
  clientName: string;
  serviceTitle: string | null;
  categoryName: string | null;
  mode: ConsultationMode;
  scheduledStart: string;
  scheduledEnd: string;
  urgent: boolean;
  clientNotes: string | null;
  consultantNotes: string | null;
  consultationFee: number;
  platformFee: number;
  taxAmount: number;
  discount: number;
  totalAmount: number;
  consultantEarning: number | null;
  invoiceNumber: string | null;
  meetingLink: string | null;
  paymentReference: string | null;
  paidAt: string | null;
  completedAt: string | null;
  cancellationReason: string | null;
  reviewed: boolean;
  createdAt: string;
}

export interface MessageView {
  id: string;
  senderId: string;
  senderName: string;
  mine: boolean;
  body: string;
  attachmentDocumentId: string | null;
  readAt: string | null;
  createdAt: string;
}

export interface SharedDocumentView {
  shareId: string;
  documentId: string;
  fileName: string;
  category: string;
  sizeBytes: number;
  sharedByName: string;
  sharedAt: string;
}

export interface ReviewView {
  id: string;
  bookingId: string;
  consultantId: string;
  clientName: string;
  rating: number;
  comment: string | null;
  moderation: string;
  createdAt: string;
}

export interface PayoutView {
  id: string;
  reference: string;
  consultantId: string;
  consultantName: string;
  grossAmount: number;
  commissionAmount: number;
  netAmount: number;
  bookingCount: number;
  status: string;
  paymentReference: string | null;
  paidAt: string | null;
  createdAt: string;
}

export interface PricingRuleView {
  code: string;
  label: string;
  description: string | null;
  valueType: string;
  value: number;
  updatedAt: string | null;
  updatedBy: string | null;
}

export interface CouponView {
  id: string;
  code: string;
  description: string | null;
  percentOff: number | null;
  amountOff: number | null;
  validFrom: string | null;
  validTo: string | null;
  maxRedemptions: number | null;
  redemptions: number;
  active: boolean;
}

export interface ConsultantDashboard {
  counts: Record<string, number>;
  totalEarnings: number;
  pendingEarnings: number;
  paidOut: number;
  averageRating: number | null;
  reviewCount: number;
  profileStatus: string;
  verified: boolean;
  upcoming: BookingView[];
  newRequests: BookingView[];
}

export interface MarketplaceStats {
  consultants: Record<string, number>;
  bookings: Record<string, number>;
  grossRevenue: number;
  platformRevenue: number;
  consultantEarnings: number;
  payoutsPaid: number;
}

export interface ConsultationInvoice {
  invoiceNumber: string;
  bookingReference: string;
  issuedAt: string;
  clientName: string;
  consultantName: string;
  consultantType: string;
  serviceTitle: string | null;
  mode: ConsultationMode;
  scheduledStart: string;
  consultationFee: number;
  platformFee: number;
  taxAmount: number;
  discount: number;
  totalAmount: number;
  paymentReference: string | null;
}

export function modeLabel(mode: ConsultationMode | string): string {
  switch (mode) {
    case "VIDEO":
      return "Video call";
    case "PHONE":
      return "Phone call";
    case "CHAT":
      return "Chat";
    case "IN_PERSON":
      return "In person";
    default:
      return mode;
  }
}

export function formatDateTime(value: string | null | undefined): string {
  if (!value) {
    return "—";
  }
  return new Date(value).toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}
