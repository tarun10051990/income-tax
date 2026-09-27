package com.incometax.dto;

import com.incometax.entity.PaymentRecord;
import com.incometax.entity.TaxRule;
import com.incometax.entity.TaxType;
import com.incometax.entity.User;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;
import lombok.Data;

import java.math.BigDecimal;
import java.time.LocalDate;

public final class AdminRequests {

    private AdminRequests() {
    }

    @Data
    public static class CreateStaffUser {
        @NotBlank
        private String name;
        @NotNull
        @Email
        private String email;
        private String phone;
        @NotNull
        private User.Role role;
        @NotBlank
        private String password;
    }

    @Data
    public static class UpdateUser {
        private String name;
        private String phone;
        private User.Role role;
        private Boolean active;
    }

    @Data
    public static class RaiseInvoice {
        @NotBlank
        private String customerId;
        private String caseId;
        @NotBlank
        private String description;
        @NotNull
        @Positive
        private BigDecimal amount;
        private BigDecimal taxAmount;
        private LocalDate dueDate;
    }

    @Data
    public static class RecordPaymentOutcome {
        @NotNull
        private PaymentRecord.Status status;
        private String providerReference;
        private String failureReason;
    }

    @Data
    public static class UpsertTaxRule {
        @NotBlank
        private String ruleKey;
        @NotNull
        private TaxType taxType;
        @NotNull
        private TaxRule.Category category;
        private String description;
        @NotNull
        private LocalDate effectiveFrom;
        private LocalDate effectiveTo;
        @NotBlank
        private String configuration;
        private Boolean active;
        private String approvedBy;
    }

    @Data
    public static class UpsertNotificationTemplate {
        @NotBlank
        private String eventKey;
        @NotBlank
        private String subject;
        @NotBlank
        private String body;
        private boolean inApp = true;
        private boolean email;
        private boolean sms;
        private boolean active = true;
    }

    @Data
    public static class RecordAcknowledgement {
        /** The number the official portal returned; the platform never generates one. */
        @NotBlank
        private String acknowledgementNumber;
        private java.time.LocalDateTime filedAt;
    }

    @Data
    public static class VerifyDocument {
        private boolean approve;
        private String reason;
    }
}
