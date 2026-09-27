package com.incometax.dto;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;

/** Read models returned by the API; sensitive identifiers arrive masked unless PII_READ_FULL. */
public final class Responses {

    private Responses() {
    }

    public record UserSummary(String id, String name, String email, String phone, String pan, String role,
                              boolean active, boolean mfaEnabled, LocalDateTime createdAt,
                              LocalDateTime lastLoginAt) {
    }

    public record TaxpayerProfileView(String id, String pan, String aadhaar, String taxpayerType,
                                      LocalDate dateOfBirth, String addressLine1, String addressLine2, String city,
                                      String state, String pincode, String bankAccountNumber, String bankIfsc,
                                      String bankName, boolean metroCity) {
    }

    public record GstProfileView(String id, String gstin, String legalName, String tradeName, String businessType,
                                 String businessActivity, String registeredAddress, String state,
                                 String authorizedSignatory, String signatoryDesignation, String bankAccountNumber,
                                 LocalDate registrationDate, boolean compositionScheme, boolean active) {
    }

    public record CaseSummary(String id, String caseNumber, String taxType, String returnType, String status,
                              String priority, String financialYear, String assessmentYear, String period,
                              LocalDate dueDate, UserSummary customer, UserSummary assignedTo,
                              LocalDateTime createdAt, LocalDateTime updatedAt) {
    }

    public record CaseDetail(CaseSummary summary, Object filing, Object computation, List<DocumentView> documents,
                             List<QueryView> queries, List<CommentView> comments, List<EventView> events,
                             List<String> availableTransitions) {
    }

    public record DocumentView(String id, String fileName, String category, String status, String scanStatus,
                               int versionNumber, long sizeBytes, LocalDate expiresOn, String verifiedBy,
                               LocalDateTime verifiedAt, String rejectionReason, LocalDateTime createdAt,
                               String caseId, String caseNumber, String ownerName) {
    }

    public record QueryView(String id, String queryNumber, String caseId, String caseNumber, String category,
                            String question, String priority, String status, LocalDate dueDate, String raisedBy,
                            List<QueryResponseView> responses, LocalDateTime createdAt) {
    }

    public record QueryResponseView(String id, String message, String respondedBy, String documentId,
                                    LocalDateTime createdAt) {
    }

    public record CommentView(String id, String message, boolean internal, String author, LocalDateTime createdAt) {
    }

    public record EventView(String id, String action, String fromStatus, String toStatus, String actor, String note,
                            LocalDateTime createdAt) {
    }

    public record InvoiceView(String id, String documentType, String source, String supplyType, String invoiceNumber,
                              LocalDate invoiceDate, String counterpartyGstin, String counterpartyName,
                              String placeOfSupply, String hsnSacCode, BigDecimal taxableValue, BigDecimal cgst,
                              BigDecimal sgst, BigDecimal igst, BigDecimal cess, BigDecimal totalTax,
                              boolean reverseCharge, boolean itcEligible) {
    }

    public record ReconciliationView(String id, String status, String invoiceNumber, String counterpartyGstin,
                                     BigDecimal taxableValueDifference, BigDecimal taxDifference, String remarks,
                                     boolean resolved) {
    }

    public record PaymentView(String id, String invoiceNumber, String description, BigDecimal amount,
                              BigDecimal taxAmount, BigDecimal totalAmount, String status, String caseNumber,
                              LocalDate dueDate, LocalDateTime paidAt, String failureReason,
                              LocalDateTime createdAt) {
    }

    public record NotificationView(String id, String eventKey, String subject, String body, String caseId,
                                   String channel, boolean read, LocalDateTime createdAt) {
    }

    public record AuditView(String id, String actorEmail, String actorRole, String action, String entityType,
                            String entityId, String oldValue, String newValue, String ipAddress, String traceId,
                            LocalDateTime createdAt) {
    }

    public record TaxRuleView(String id, String ruleKey, String taxType, String category, String description,
                              LocalDate effectiveFrom, LocalDate effectiveTo, int version, String configuration,
                              boolean active, String createdBy, String approvedBy) {
    }

    public record KpiBlock(Map<String, Long> counts) {
    }

    public record ChartSeries(String name, List<ChartPoint> points) {
    }

    public record ChartPoint(String label, BigDecimal value) {
    }

    public record DashboardView(Map<String, Long> incomeTaxKpis, Map<String, Long> gstKpis,
                                List<ChartSeries> charts, List<CaseSummary> upcomingDeadlines,
                                Map<String, BigDecimal> revenue) {
    }
}
