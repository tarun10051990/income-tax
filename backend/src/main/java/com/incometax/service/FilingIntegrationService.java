package com.incometax.service;

import com.incometax.entity.FilingCase;
import com.incometax.entity.FilingStatus;
import com.incometax.entity.GstFiling;
import com.incometax.entity.TaxType;
import com.incometax.entity.User;
import com.incometax.exception.ApiException;
import com.incometax.integration.FilingSubmission;
import com.incometax.integration.GovernmentFilingAdapter;
import com.incometax.repository.GstFilingRepository;
import com.incometax.repository.IncomeTaxFilingRepository;
import com.incometax.security.Permission;
import com.incometax.security.RbacService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;

/**
 * Drives the lodgement step. When no official adapter is configured the case stays in
 * READY_FOR_FILING and the operator records the real acknowledgement obtained from the portal:
 * the platform never invents a submission or an acknowledgement.
 */
@Service
@RequiredArgsConstructor
public class FilingIntegrationService {

    private final List<GovernmentFilingAdapter> adapters;
    private final FilingCaseService filingCaseService;
    private final WorkflowService workflowService;
    private final IncomeTaxFilingRepository incomeTaxFilingRepository;
    private final GstFilingRepository gstFilingRepository;
    private final RbacService rbacService;
    private final AuditService auditService;

    public FilingSubmission submit(String caseId, User actor) {
        rbacService.require(actor, Permission.INTEGRATION_EXECUTE);
        FilingCase filingCase = filingCaseService.require(caseId);
        if (filingCase.getStatus() != FilingStatus.READY_FOR_FILING) {
            throw ApiException.badRequest("CASE_NOT_READY",
                    "Only a case in READY_FOR_FILING can be lodged");
        }
        GovernmentFilingAdapter adapter = adapter(filingCase.getTaxType());
        FilingSubmission submission = adapter.submit(filingCase, payload(filingCase));
        auditService.record("FILING_SUBMISSION_ATTEMPTED", "FilingCase", caseId, null,
                Map.of("outcome", submission.outcome().name(), "adapterConfigured", adapter.isConfigured()));
        return submission;
    }

    /** Records an acknowledgement that an authorised operator obtained from the official portal. */
    @Transactional
    public FilingCase recordAcknowledgement(String caseId, String acknowledgementNumber, LocalDateTime filedAt,
                                           User actor) {
        rbacService.require(actor, Permission.INTEGRATION_EXECUTE);
        if (acknowledgementNumber == null || acknowledgementNumber.isBlank()) {
            throw ApiException.badRequest("ACKNOWLEDGEMENT_REQUIRED",
                    "The acknowledgement number issued by the portal is required");
        }
        FilingCase filingCase = filingCaseService.require(caseId);

        if (filingCase.getTaxType() == TaxType.GST) {
            GstFiling filing = gstFilingRepository.findByFilingCaseId(caseId)
                    .orElseThrow(() -> ApiException.notFound("GST filing for case", caseId));
            filing.setAcknowledgementReference(acknowledgementNumber);
            gstFilingRepository.save(filing);
        }

        FilingStatus target = filingCase.getStatus() == FilingStatus.READY_FOR_FILING
                ? FilingStatus.FILED
                : nextAfterFiled(filingCase.getTaxType());
        FilingCase saved = workflowService.transition(filingCase, target, actor,
                "Acknowledgement " + acknowledgementNumber + " recorded"
                        + (filedAt == null ? "" : " for filing dated " + filedAt.toLocalDate()));
        auditService.record("FILING_ACKNOWLEDGEMENT_RECORDED", "FilingCase", caseId, null,
                Map.of("acknowledgementNumber", acknowledgementNumber));
        return saved;
    }

    public boolean isConfigured(TaxType taxType) {
        return adapter(taxType).isConfigured();
    }

    private FilingStatus nextAfterFiled(TaxType taxType) {
        return taxType == TaxType.GST ? FilingStatus.ACKNOWLEDGEMENT_RECEIVED : FilingStatus.VERIFICATION_PENDING;
    }

    private String payload(FilingCase filingCase) {
        if (filingCase.getTaxType() == TaxType.GST) {
            return gstFilingRepository.findByFilingCaseId(filingCase.getId())
                    .map(GstFiling::getComputationJson)
                    .orElse(null);
        }
        return incomeTaxFilingRepository.findByFilingCaseId(filingCase.getId())
                .map(com.incometax.entity.IncomeTaxFiling::getComputationJson)
                .orElse(null);
    }

    private GovernmentFilingAdapter adapter(TaxType taxType) {
        return adapters.stream()
                .filter(candidate -> candidate.taxType() == taxType)
                .max((left, right) -> Boolean.compare(left.isConfigured(), right.isConfigured()))
                .orElseThrow(() -> new ApiException(org.springframework.http.HttpStatus.NOT_IMPLEMENTED,
                        "NO_ADAPTER", "No filing adapter is registered for " + taxType));
    }
}
