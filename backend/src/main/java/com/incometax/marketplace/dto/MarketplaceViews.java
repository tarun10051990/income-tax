package com.incometax.marketplace.dto;

import com.fasterxml.jackson.annotation.JsonInclude;

import java.math.BigDecimal;
import java.time.DayOfWeek;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.util.List;
import java.util.Map;

public final class MarketplaceViews {

    private MarketplaceViews() {
    }

    public record ProfessionalTypeView(String id, String code, String label, String designation, String regulator,
                                       boolean active, int sortOrder) {
    }

    public record CategoryView(String id, String slug, String name, String domain, String description,
                               List<String> recommendedTypes, BigDecimal startingFee, boolean active, int sortOrder) {
    }

    public record ServiceView(String id, String title, String description, String categorySlug, String categoryName,
                              BigDecimal fee, int durationMinutes, List<String> modes, boolean active) {
    }

    /** Public card / profile. Never exposes contact details or bank information. */
    @JsonInclude(JsonInclude.Include.NON_NULL)
    public record ConsultantPublicView(String id, String name, String designation, String professionalType,
                                       String professionalTypeCode, String registrationNumber, String qualification,
                                       int experienceYears, List<String> specializations, List<String> categorySlugs,
                                       String city, String state, List<String> languages, String photoUrl, String bio,
                                       List<String> consultationModes, BigDecimal startingFee, int slotDurationMinutes,
                                       boolean verified, BigDecimal averageRating, int reviewCount,
                                       int completedConsultations, List<ServiceView> services,
                                       LocalDateTime nextAvailableAt) {
    }

    /** Owner's / admin's view including status and private details. */
    @JsonInclude(JsonInclude.Include.NON_NULL)
    public record ConsultantPrivateView(ConsultantPublicView profile, String userId, String email, String phone,
                                        String status, String verificationNotes, LocalDateTime verifiedAt,
                                        String bankAccountName, String bankAccountNumberMasked, String bankIfsc,
                                        String upiId, boolean accountActive, LocalDateTime createdAt) {
    }

    public record AvailabilityRuleView(String id, DayOfWeek dayOfWeek, LocalTime startTime, LocalTime endTime) {
    }

    public record HolidayView(String id, LocalDate date, String reason) {
    }

    public record SlotView(LocalDateTime start, LocalDateTime end) {
    }

    public record DaySlots(LocalDate date, List<SlotView> slots) {
    }

    public record QuoteView(BigDecimal consultationFee, BigDecimal urgentSurcharge, BigDecimal modeSurcharge,
                            BigDecimal platformFee, BigDecimal taxAmount, BigDecimal discount, BigDecimal total,
                            String couponCode, int durationMinutes, boolean estimate) {
    }

    @JsonInclude(JsonInclude.Include.NON_NULL)
    public record BookingView(String id, String reference, String status, String paymentStatus,
                              String consultantId, String consultantName, String consultantType,
                              String clientId, String clientName, String serviceTitle, String categoryName,
                              String mode, LocalDateTime scheduledStart, LocalDateTime scheduledEnd, boolean urgent,
                              String clientNotes, String consultantNotes,
                              BigDecimal consultationFee, BigDecimal platformFee, BigDecimal taxAmount,
                              BigDecimal discount, BigDecimal totalAmount, BigDecimal consultantEarning,
                              String invoiceNumber, String meetingLink, String paymentReference,
                              LocalDateTime paidAt, LocalDateTime completedAt, String cancellationReason,
                              boolean reviewed, LocalDateTime createdAt) {
    }

    public record MessageView(String id, String senderId, String senderName, boolean mine, String body,
                              String attachmentDocumentId, LocalDateTime readAt, LocalDateTime createdAt) {
    }

    public record SharedDocumentView(String shareId, String documentId, String fileName, String category,
                                     long sizeBytes, String sharedByName, LocalDateTime sharedAt) {
    }

    public record ReviewView(String id, String bookingId, String consultantId, String clientName, int rating,
                             String comment, String moderation, LocalDateTime createdAt) {
    }

    public record PayoutView(String id, String reference, String consultantId, String consultantName,
                             BigDecimal grossAmount, BigDecimal commissionAmount, BigDecimal netAmount,
                             int bookingCount, String status, String paymentReference, LocalDateTime paidAt,
                             LocalDateTime createdAt) {
    }

    public record PricingRuleView(String code, String label, String description, String valueType, BigDecimal value,
                                  LocalDateTime updatedAt, String updatedBy) {
    }

    public record CouponView(String id, String code, String description, BigDecimal percentOff, BigDecimal amountOff,
                             LocalDate validFrom, LocalDate validTo, Integer maxRedemptions, int redemptions,
                             boolean active) {
    }

    public record ConsultantDashboard(Map<String, Long> counts, BigDecimal totalEarnings, BigDecimal pendingEarnings,
                                      BigDecimal paidOut, BigDecimal averageRating, int reviewCount,
                                      String profileStatus, boolean verified, List<BookingView> upcoming,
                                      List<BookingView> newRequests) {
    }

    public record MarketplaceStats(Map<String, Long> consultants, Map<String, Long> bookings,
                                   BigDecimal grossRevenue, BigDecimal platformRevenue,
                                   BigDecimal consultantEarnings, BigDecimal payoutsPaid) {
    }

    public record InvoiceView(String invoiceNumber, String bookingReference, LocalDateTime issuedAt,
                              String clientName, String consultantName, String consultantType,
                              String serviceTitle, String mode, LocalDateTime scheduledStart,
                              BigDecimal consultationFee, BigDecimal platformFee, BigDecimal taxAmount,
                              BigDecimal discount, BigDecimal totalAmount, String paymentReference) {
    }
}
