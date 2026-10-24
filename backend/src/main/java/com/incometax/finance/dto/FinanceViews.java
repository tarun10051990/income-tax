package com.incometax.finance.dto;

import com.fasterxml.jackson.annotation.JsonInclude;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;

public final class FinanceViews {

    private FinanceViews() {
    }

    public record FinancialYearView(String id, String code, String assessmentYear, LocalDate startDate,
                                    LocalDate endDate, boolean open, boolean current, String notes,
                                    List<QuarterView> quarters) {
    }

    public record QuarterView(int number, String label, LocalDate start, LocalDate end) {
    }

    /** The resolved reporting window for a dashboard/analytics request. */
    public record PeriodView(String type, String label, LocalDate from, LocalDate to, String financialYear,
                             String groupBy) {
    }

    @JsonInclude(JsonInclude.Include.NON_NULL)
    public record InvestmentView(String id, String ownerId, String ownerName, String type, String name,
                                 BigDecimal amount, LocalDate investedOn, String financialYear, String section,
                                 BigDecimal taxSavingEligibleAmount, BigDecimal expectedReturn,
                                 BigDecimal actualReturn, LocalDate maturityDate, String notes,
                                 String proofDocumentId, String verificationStatus, String verificationNote,
                                 LocalDateTime verifiedAt, LocalDateTime createdAt) {
    }

    @JsonInclude(JsonInclude.Include.NON_NULL)
    public record TaxPaymentView(String id, String ownerId, String ownerName, String financialYear,
                                 String assessmentYear, String type, BigDecimal amount, LocalDate paidOn,
                                 String challanNumber, String paymentMethod, String notes, String proofDocumentId,
                                 String verificationStatus, String verificationNote, LocalDateTime verifiedAt,
                                 LocalDateTime createdAt) {
    }

    public record LiabilityView(String id, String ownerId, String financialYear, String assessmentYear,
                                String taxType, String period, BigDecimal amount, LocalDate dueDate, String source,
                                String filingCaseId, String notes, LocalDateTime updatedAt) {
    }

    @JsonInclude(JsonInclude.Include.NON_NULL)
    public record RefundView(String id, String ownerId, String ownerName, String financialYear,
                             String assessmentYear, String taxType, BigDecimal amountClaimed,
                             BigDecimal amountReceived, String status, String referenceNumber, LocalDate claimedOn,
                             LocalDate receivedOn, String filingCaseId, String notes, LocalDateTime updatedAt) {
    }

    /**
     * One row of the Tax Tracking table: the client's position for a FY and tax type.
     * outstanding = liability − verifiedPaid (floored at zero); refundExpected = max(verifiedPaid − liability, 0)
     * when the return is filed.
     */
    public record TrackingRow(String financialYear, String assessmentYear, String taxType, BigDecimal liability,
                              BigDecimal verifiedPaid, BigDecimal unverifiedPaid, BigDecimal outstanding,
                              BigDecimal refundClaimed, BigDecimal refundReceived, String paymentStatus,
                              String filingStatus, LocalDate dueDate, LocalDateTime filedOn,
                              Map<String, BigDecimal> paidByType, List<LiabilityView> liabilities) {
    }

    public record SavingsSection(String section, BigDecimal invested, BigDecimal verifiedInvested, BigDecimal limit,
                                 BigDecimal eligible, BigDecimal verifiedEligible, List<String> regimes) {
    }

    /** Estimated figures are always labelled as estimates in the UI; nothing here is a filed value. */
    public record SavingsView(String financialYear, List<SavingsSection> sections, BigDecimal totalInvested,
                              BigDecimal taxSavingInvested, BigDecimal eligibleDeduction,
                              BigDecimal verifiedEligibleDeduction, BigDecimal marginalRate, BigDecimal cessRate,
                              String rateBasis, BigDecimal estimatedTaxBenefit, BigDecimal actualTaxSaved,
                              String actualBasis, String disclaimer) {
    }

    public record TrendPoint(String label, LocalDate from, LocalDate to, BigDecimal value) {
    }

    public record TrendSeries(String key, String name, List<TrendPoint> points) {
    }

    public record ClientDashboard(PeriodView period, Map<String, BigDecimal> amounts, Map<String, Long> counts,
                                  String itrStatus, String gstStatus, List<TrendSeries> series,
                                  List<TrackingRow> tracking, List<InvestmentView> recentInvestments,
                                  List<RefundView> refunds) {
    }

    public record AdminAnalytics(PeriodView period, Map<String, Long> counts, Map<String, BigDecimal> amounts,
                                 List<TrendSeries> series, Map<String, Long> consultantTypes) {
    }

    public record Client360(Object user, Object taxpayerProfile, Object gstProfile, List<Object> cases,
                            List<Object> documents, List<InvestmentView> investments, List<TaxPaymentView> payments,
                            List<TrackingRow> tracking, SavingsView savings, List<RefundView> refunds,
                            List<Object> consultations, List<Object> notifications, List<Object> activity,
                            Map<String, BigDecimal> totals) {
    }
}
