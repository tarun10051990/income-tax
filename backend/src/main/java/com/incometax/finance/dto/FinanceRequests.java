package com.incometax.finance.dto;

import com.incometax.entity.TaxType;
import com.incometax.finance.entity.Investment;
import com.incometax.finance.entity.TaxPayment;
import com.incometax.finance.entity.TaxRefund;
import com.incometax.finance.entity.VerificationStatus;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

import java.math.BigDecimal;
import java.time.LocalDate;

public final class FinanceRequests {

    private FinanceRequests() {
    }

    public static final String FY_PATTERN = "^\\d{4}-\\d{2}$";

    public record InvestmentRequest(
            @NotNull Investment.Type type,
            @Size(max = 160) String name,
            @NotNull @DecimalMin(value = "0.01") BigDecimal amount,
            @NotNull LocalDate investedOn,
            @Size(max = 20) String section,
            @DecimalMin(value = "0") BigDecimal taxSavingEligibleAmount,
            BigDecimal expectedReturn,
            BigDecimal actualReturn,
            LocalDate maturityDate,
            @Size(max = 2000) String notes,
            String proofDocumentId) {
    }

    public record TaxPaymentRequest(
            @NotNull TaxPayment.Type type,
            @NotNull @DecimalMin(value = "0.01") BigDecimal amount,
            @NotNull LocalDate paidOn,
            @Pattern(regexp = FY_PATTERN) String assessmentYear,
            @Size(max = 60) String challanNumber,
            @Size(max = 60) String paymentMethod,
            @Size(max = 2000) String notes,
            String proofDocumentId) {
    }

    /** Staff decision on a client-entered record. Staff may also correct the amount while verifying. */
    public record VerificationDecision(
            @NotNull VerificationStatus status,
            @Size(max = 1000) String note,
            @DecimalMin(value = "0.01") BigDecimal correctedAmount,
            @DecimalMin(value = "0") BigDecimal correctedEligibleAmount) {
    }

    public record LiabilityRequest(
            @NotBlank String ownerId,
            @NotBlank @Pattern(regexp = FY_PATTERN) String financialYear,
            @NotNull TaxType taxType,
            @Size(max = 20) String period,
            @NotNull @DecimalMin(value = "0") BigDecimal amount,
            LocalDate dueDate,
            @Size(max = 2000) String notes) {
    }

    public record RefundRequest(
            @NotBlank String ownerId,
            @NotBlank @Pattern(regexp = FY_PATTERN) String financialYear,
            @NotNull TaxType taxType,
            @NotNull @DecimalMin(value = "0") BigDecimal amountClaimed,
            @DecimalMin(value = "0") BigDecimal amountReceived,
            TaxRefund.Status status,
            @Size(max = 60) String referenceNumber,
            LocalDate claimedOn,
            LocalDate receivedOn,
            String filingCaseId,
            @Size(max = 2000) String notes) {
    }

    public record RefundUpdate(
            @DecimalMin(value = "0") BigDecimal amountClaimed,
            @DecimalMin(value = "0") BigDecimal amountReceived,
            TaxRefund.Status status,
            @Size(max = 60) String referenceNumber,
            LocalDate receivedOn,
            @Size(max = 2000) String notes) {
    }

    public record FinancialYearRequest(
            @NotBlank @Pattern(regexp = FY_PATTERN) String code,
            Boolean open,
            @Size(max = 500) String notes) {
    }
}
