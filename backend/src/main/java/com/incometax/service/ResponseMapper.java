package com.incometax.service;

import com.incometax.dto.Responses;
import com.incometax.entity.CaseEvent;
import com.incometax.entity.DocumentRecord;
import com.incometax.entity.FilingCase;
import com.incometax.entity.FilingComment;
import com.incometax.entity.FilingQuery;
import com.incometax.entity.GstInvoice;
import com.incometax.entity.GstProfile;
import com.incometax.entity.GstReconciliationEntry;
import com.incometax.entity.NotificationRecord;
import com.incometax.entity.PaymentRecord;
import com.incometax.entity.QueryResponse;
import com.incometax.entity.TaxRule;
import com.incometax.entity.TaxpayerProfile;
import com.incometax.entity.User;
import com.incometax.security.CurrentUser;
import com.incometax.security.Permission;
import com.incometax.security.RbacService;
import com.incometax.util.MaskingUtil;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
@RequiredArgsConstructor
public class ResponseMapper {

    private final CurrentUser currentUser;
    private final RbacService rbacService;

    /** Full values are only revealed to callers holding PII_READ_FULL or to the data subject. */
    private boolean unmasked(String subjectUserId) {
        User actor = currentUser.find().orElse(null);
        if (actor == null) {
            return false;
        }
        return rbacService.has(actor, Permission.PII_READ_FULL) || actor.getId().equals(subjectUserId);
    }

    public Responses.UserSummary user(User user) {
        if (user == null) {
            return null;
        }
        boolean full = unmasked(user.getId());
        return new Responses.UserSummary(
                user.getId(),
                user.getName(),
                full ? user.getEmail() : MaskingUtil.maskEmail(user.getEmail()),
                full ? user.getPhone() : MaskingUtil.maskPhone(user.getPhone()),
                full ? user.getPan() : MaskingUtil.maskPan(user.getPan()),
                user.getRole().name(),
                user.isActive(),
                user.isMfaEnabled(),
                user.getCreatedAt(),
                user.getLastLoginAt());
    }

    public Responses.TaxpayerProfileView taxpayerProfile(TaxpayerProfile profile) {
        if (profile == null) {
            return null;
        }
        boolean full = unmasked(profile.getUser().getId());
        return new Responses.TaxpayerProfileView(
                profile.getId(),
                full ? profile.getPan() : MaskingUtil.maskPan(profile.getPan()),
                MaskingUtil.maskAadhaar(profile.getAadhaarLastFour()),
                profile.getTaxpayerType() == null ? null : profile.getTaxpayerType().name(),
                profile.getDateOfBirth(),
                profile.getAddressLine1(),
                profile.getAddressLine2(),
                profile.getCity(),
                profile.getState(),
                profile.getPincode(),
                full ? profile.getBankAccountNumber() : MaskingUtil.maskAccountNumber(profile.getBankAccountNumber()),
                profile.getBankIfsc(),
                profile.getBankName(),
                profile.isMetroCity());
    }

    public Responses.GstProfileView gstProfile(GstProfile profile) {
        if (profile == null) {
            return null;
        }
        boolean full = unmasked(profile.getUser().getId());
        return new Responses.GstProfileView(
                profile.getId(),
                full ? profile.getGstin() : MaskingUtil.maskGstin(profile.getGstin()),
                profile.getLegalName(),
                profile.getTradeName(),
                profile.getBusinessType(),
                profile.getBusinessActivity(),
                profile.getRegisteredAddress(),
                profile.getState(),
                profile.getAuthorizedSignatory(),
                profile.getSignatoryDesignation(),
                full ? profile.getBankAccountNumber() : MaskingUtil.maskAccountNumber(profile.getBankAccountNumber()),
                profile.getRegistrationDate(),
                profile.isCompositionScheme(),
                profile.isActive());
    }

    public Responses.CaseSummary filingCase(FilingCase filingCase) {
        if (filingCase == null) {
            return null;
        }
        return new Responses.CaseSummary(
                filingCase.getId(),
                filingCase.getCaseNumber(),
                filingCase.getTaxType().name(),
                filingCase.getReturnType() == null ? null : filingCase.getReturnType().name(),
                filingCase.getStatus().name(),
                filingCase.getPriority().name(),
                filingCase.getFinancialYear(),
                filingCase.getAssessmentYear(),
                filingCase.getPeriod(),
                filingCase.getDueDate(),
                user(filingCase.getCustomer()),
                user(filingCase.getAssignedTo()),
                filingCase.getCreatedAt(),
                filingCase.getUpdatedAt());
    }

    public Responses.DocumentView document(DocumentRecord document) {
        return new Responses.DocumentView(
                document.getId(),
                document.getFileName(),
                document.getCategory().name(),
                document.getStatus().name(),
                document.getScanStatus().name(),
                document.getVersionNumber(),
                document.getSizeBytes(),
                document.getExpiresOn(),
                document.getVerifiedBy() == null ? null : document.getVerifiedBy().getName(),
                document.getVerifiedAt(),
                document.getRejectionReason(),
                document.getCreatedAt(),
                document.getFilingCase() == null ? null : document.getFilingCase().getId(),
                document.getFilingCase() == null ? null : document.getFilingCase().getCaseNumber(),
                document.getOwner() == null ? null : document.getOwner().getName());
    }

    public Responses.QueryView query(FilingQuery query) {
        return new Responses.QueryView(
                query.getId(),
                query.getQueryNumber(),
                query.getFilingCase().getId(),
                query.getFilingCase().getCaseNumber(),
                query.getCategory().name(),
                query.getQuestion(),
                query.getPriority().name(),
                query.getStatus().name(),
                query.getDueDate(),
                query.getRaisedBy() == null ? null : query.getRaisedBy().getName(),
                query.getResponses().stream().map(this::queryResponse).toList(),
                query.getCreatedAt());
    }

    public Responses.QueryResponseView queryResponse(QueryResponse response) {
        return new Responses.QueryResponseView(
                response.getId(),
                response.getMessage(),
                response.getRespondedBy() == null ? null : response.getRespondedBy().getName(),
                response.getDocument() == null ? null : response.getDocument().getId(),
                response.getCreatedAt());
    }

    public Responses.CommentView comment(FilingComment comment) {
        return new Responses.CommentView(
                comment.getId(),
                comment.getMessage(),
                comment.isInternal(),
                comment.getAuthor() == null ? null : comment.getAuthor().getName(),
                comment.getCreatedAt());
    }

    public Responses.EventView event(CaseEvent event) {
        return new Responses.EventView(
                event.getId(),
                event.getAction(),
                event.getFromStatus() == null ? null : event.getFromStatus().name(),
                event.getToStatus() == null ? null : event.getToStatus().name(),
                event.getActor() == null ? null : event.getActor().getName(),
                event.getNote(),
                event.getCreatedAt());
    }

    public Responses.InvoiceView invoice(GstInvoice invoice) {
        return new Responses.InvoiceView(
                invoice.getId(),
                invoice.getDocumentType().name(),
                invoice.getSource().name(),
                invoice.getSupplyType().name(),
                invoice.getInvoiceNumber(),
                invoice.getInvoiceDate(),
                invoice.getCounterpartyGstin(),
                invoice.getCounterpartyName(),
                invoice.getPlaceOfSupply(),
                invoice.getHsnSacCode(),
                invoice.getTaxableValue(),
                invoice.getCgst(),
                invoice.getSgst(),
                invoice.getIgst(),
                invoice.getCess(),
                invoice.totalTax(),
                invoice.isReverseCharge(),
                invoice.isItcEligible());
    }

    public Responses.ReconciliationView reconciliation(GstReconciliationEntry entry) {
        return new Responses.ReconciliationView(
                entry.getId(),
                entry.getStatus().name(),
                entry.getInvoiceNumber(),
                entry.getCounterpartyGstin(),
                entry.getTaxableValueDifference(),
                entry.getTaxDifference(),
                entry.getRemarks(),
                entry.isResolved());
    }

    public Responses.PaymentView payment(PaymentRecord payment) {
        return new Responses.PaymentView(
                payment.getId(),
                payment.getInvoiceNumber(),
                payment.getDescription(),
                payment.getAmount(),
                payment.getTaxAmount(),
                payment.totalAmount(),
                payment.getStatus().name(),
                payment.getFilingCase() == null ? null : payment.getFilingCase().getCaseNumber(),
                payment.getDueDate(),
                payment.getPaidAt(),
                payment.getFailureReason(),
                payment.getCreatedAt());
    }

    public Responses.NotificationView notification(NotificationRecord notification) {
        return new Responses.NotificationView(
                notification.getId(),
                notification.getEventKey(),
                notification.getSubject(),
                notification.getBody(),
                notification.getCaseId(),
                notification.getChannel().name(),
                notification.isRead(),
                notification.getCreatedAt());
    }

    public Responses.AuditView audit(com.incometax.entity.AuditLog log) {
        return new Responses.AuditView(
                log.getId(),
                log.getActorEmail(),
                log.getActorRole(),
                log.getAction(),
                log.getEntityType(),
                log.getEntityId(),
                log.getOldValue(),
                log.getNewValue(),
                log.getIpAddress(),
                log.getTraceId(),
                log.getCreatedAt());
    }

    public Responses.TaxRuleView taxRule(TaxRule rule) {
        return new Responses.TaxRuleView(
                rule.getId(),
                rule.getRuleKey(),
                rule.getTaxType().name(),
                rule.getCategory().name(),
                rule.getDescription(),
                rule.getEffectiveFrom(),
                rule.getEffectiveTo(),
                rule.getVersion(),
                rule.getConfiguration(),
                rule.isActive(),
                rule.getCreatedBy(),
                rule.getApprovedBy());
    }

    public List<Responses.InvoiceView> invoices(List<GstInvoice> invoices) {
        return invoices.stream().map(this::invoice).toList();
    }
}
