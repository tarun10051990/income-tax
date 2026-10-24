package com.incometax.marketplace.dto;

import com.incometax.marketplace.entity.ConsultationCategory;
import com.incometax.marketplace.entity.ConsultationMode;
import com.incometax.marketplace.entity.ProfessionalType;
import jakarta.validation.constraints.*;
import lombok.Data;

import java.math.BigDecimal;
import java.time.DayOfWeek;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.util.List;

public final class MarketplaceRequests {

    private MarketplaceRequests() {
    }

    @Data
    public static class ConsultantRegisterRequest {
        @NotBlank
        private String name;
        @Email
        @NotBlank
        private String email;
        @Pattern(regexp = "^[0-9]{10}$", message = "Phone must be 10 digits")
        private String phone;
        @Size(min = 8, message = "Password must be at least 8 characters")
        @NotBlank
        private String password;
        @NotBlank
        private String professionalTypeCode;
        private String registrationNumber;
        private String qualification;
        @Min(0)
        @Max(60)
        private int experienceYears;
        private List<String> specializations;
        private List<String> categorySlugs;
        private String city;
        private String state;
        private List<String> languages;
        @Size(max = 4000)
        private String bio;
        private List<ConsultationMode> consultationModes;
        @DecimalMin("0")
        private BigDecimal baseFee;
    }

    @Data
    public static class ConsultantProfileUpdate {
        private String name;
        @Pattern(regexp = "^[0-9]{10}$", message = "Phone must be 10 digits")
        private String phone;
        private String registrationNumber;
        private String qualification;
        @Min(0)
        @Max(60)
        private Integer experienceYears;
        private List<String> specializations;
        private List<String> categorySlugs;
        private String city;
        private String state;
        private List<String> languages;
        private String photoUrl;
        @Size(max = 4000)
        private String bio;
        private List<ConsultationMode> consultationModes;
        @DecimalMin("0")
        private BigDecimal baseFee;
        @Min(15)
        @Max(180)
        private Integer slotDurationMinutes;
    }

    @Data
    public static class BankDetailsRequest {
        @NotBlank
        private String accountName;
        @Pattern(regexp = "^[0-9]{9,18}$", message = "Account number must be 9-18 digits")
        private String accountNumber;
        @Pattern(regexp = "^[A-Z]{4}0[A-Z0-9]{6}$", message = "Invalid IFSC")
        private String ifsc;
        private String upiId;
    }

    @Data
    public static class ServiceRequest {
        private String categorySlug;
        @NotBlank
        private String title;
        @Size(max = 2000)
        private String description;
        @NotNull
        @DecimalMin("0")
        private BigDecimal fee;
        @Min(15)
        @Max(240)
        private int durationMinutes = 30;
        private List<ConsultationMode> modes;
        private boolean active = true;
    }

    @Data
    public static class AvailabilityRuleRequest {
        @NotNull
        private DayOfWeek dayOfWeek;
        @NotNull
        private LocalTime startTime;
        @NotNull
        private LocalTime endTime;
    }

    @Data
    public static class AvailabilityUpdate {
        @NotNull
        private List<AvailabilityRuleRequest> rules;
    }

    @Data
    public static class HolidayRequest {
        @NotNull
        @FutureOrPresent
        private LocalDate date;
        private String reason;
    }

    @Data
    public static class QuoteRequest {
        @NotBlank
        private String consultantId;
        private String serviceId;
        @NotNull
        private ConsultationMode mode;
        private boolean urgent;
        private String couponCode;
    }

    @Data
    public static class BookingRequest {
        @NotBlank
        private String consultantId;
        private String serviceId;
        private String categorySlug;
        @NotNull
        private ConsultationMode mode;
        @NotNull
        @Future
        private LocalDateTime scheduledStart;
        private boolean urgent;
        private String couponCode;
        @Size(max = 2000)
        private String notes;
    }

    @Data
    public static class RescheduleRequest {
        @NotNull
        @Future
        private LocalDateTime scheduledStart;
    }

    @Data
    public static class CancelRequest {
        @Size(max = 1000)
        private String reason;
    }

    @Data
    public static class PaymentConfirmRequest {
        /** Gateway payment id returned by the payment provider. */
        @NotBlank
        private String paymentReference;
    }

    @Data
    public static class MessageRequest {
        @NotBlank
        @Size(max = 4000)
        private String body;
        private String attachmentDocumentId;
    }

    @Data
    public static class ShareDocumentRequest {
        @NotBlank
        private String documentId;
    }

    @Data
    public static class ReviewRequest {
        @Min(1)
        @Max(5)
        private int rating;
        @Size(max = 2000)
        private String comment;
    }

    @Data
    public static class ConsultantNotesRequest {
        @Size(max = 2000)
        private String notes;
    }

    /* ---------- admin ---------- */

    @Data
    public static class ProfessionalTypeRequest {
        @NotBlank
        @Pattern(regexp = "^[A-Z0-9_]{2,40}$", message = "Code must be upper-case letters, digits or underscores")
        private String code;
        @NotBlank
        private String label;
        private String designation;
        private ProfessionalType.Regulator regulator = ProfessionalType.Regulator.NONE;
        private boolean active = true;
        private int sortOrder;
    }

    @Data
    public static class CategoryRequest {
        @NotBlank
        @Pattern(regexp = "^[a-z0-9-]{2,60}$", message = "Slug must be lower-case letters, digits or dashes")
        private String slug;
        @NotBlank
        private String name;
        @NotNull
        private ConsultationCategory.Domain domain;
        private String description;
        private List<String> recommendedTypes;
        private BigDecimal startingFee;
        private boolean active = true;
        private int sortOrder;
    }

    @Data
    public static class VerificationDecision {
        @Size(max = 2000)
        private String notes;
    }

    @Data
    public static class PricingRuleUpdate {
        @NotNull
        @DecimalMin("0")
        private BigDecimal value;
    }

    @Data
    public static class CouponRequest {
        @NotBlank
        @Pattern(regexp = "^[A-Z0-9]{3,20}$", message = "Coupon codes are 3-20 upper-case letters or digits")
        private String code;
        private String description;
        @DecimalMin("0")
        @DecimalMax("100")
        private BigDecimal percentOff;
        @DecimalMin("0")
        private BigDecimal amountOff;
        private LocalDate validFrom;
        private LocalDate validTo;
        @Min(1)
        private Integer maxRedemptions;
        private boolean active = true;
    }

    @Data
    public static class PayoutSettleRequest {
        @NotBlank
        private String paymentReference;
    }

    @Data
    public static class RefundRequest {
        @Size(max = 1000)
        private String reason;
    }

    @Data
    public static class ReviewModerationRequest {
        @NotNull
        private Boolean hidden;
        private String note;
    }
}
