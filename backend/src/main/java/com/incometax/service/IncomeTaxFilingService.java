package com.incometax.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.incometax.dto.IncomeTaxRequests;
import com.incometax.entity.DeductionEntry;
import com.incometax.entity.FilingCase;
import com.incometax.entity.FilingStatus;
import com.incometax.entity.IncomeSource;
import com.incometax.entity.IncomeTaxFiling;
import com.incometax.entity.ReturnType;
import com.incometax.entity.TaxPaymentEntry;
import com.incometax.entity.TaxType;
import com.incometax.entity.TaxpayerType;
import com.incometax.entity.User;
import com.incometax.exception.ApiException;
import com.incometax.common.ApiResponse;
import com.incometax.repository.IncomeTaxFilingRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;

@Service
@RequiredArgsConstructor
public class IncomeTaxFilingService {

    private final IncomeTaxFilingRepository filingRepository;
    private final FilingCaseService filingCaseService;
    private final IncomeTaxComputationService computationService;
    private final WorkflowService workflowService;
    private final AuditService auditService;
    private final ObjectMapper objectMapper;

    @Transactional
    public IncomeTaxFiling create(User customer, IncomeTaxRequests.CreateFiling request) {
        ReturnType returnType = request.getReturnType() == null
                ? suggestReturnType(request.getTaxpayerType(), List.of())
                : request.getReturnType();
        FilingCase filingCase = filingCaseService.create(customer, TaxType.INCOME_TAX, returnType,
                request.getFinancialYear(), request.getAssessmentYear(), null, request.getState());

        IncomeTaxFiling filing = filingRepository.save(IncomeTaxFiling.builder()
                .filingCase(filingCase)
                .taxpayerType(request.getTaxpayerType() == null ? TaxpayerType.INDIVIDUAL : request.getTaxpayerType())
                .selectedRegime(request.getSelectedRegime())
                .build());
        auditService.record("IT_FILING_CREATED", "IncomeTaxFiling", filing.getId(), null,
                Map.of("caseId", filingCase.getId()));
        return filing;
    }

    public IncomeTaxFiling requireForCase(String caseId, User actor) {
        filingCaseService.requireReadable(caseId, actor);
        return filingRepository.findByFilingCaseId(caseId)
                .orElseThrow(() -> ApiException.notFound("Income tax filing for case", caseId));
    }

    @Transactional
    public IncomeTaxFiling update(String caseId, IncomeTaxRequests.UpdateFiling request, User actor) {
        filingCaseService.requireEditable(caseId, actor);
        IncomeTaxFiling filing = filingRepository.findByFilingCaseId(caseId)
                .orElseThrow(() -> ApiException.notFound("Income tax filing for case", caseId));

        if (request.getTaxpayerType() != null) {
            filing.setTaxpayerType(request.getTaxpayerType());
        }
        if (request.getSelectedRegime() != null) {
            filing.setSelectedRegime(request.getSelectedRegime().toUpperCase());
        }
        filing.setBasicSalary(orExisting(request.getBasicSalary(), filing.getBasicSalary()));
        filing.setHraReceived(orExisting(request.getHraReceived(), filing.getHraReceived()));
        filing.setRentPaid(orExisting(request.getRentPaid(), filing.getRentPaid()));

        if (request.getIncomeSources() != null) {
            filing.getIncomeSources().clear();
            request.getIncomeSources().forEach(source -> filing.getIncomeSources().add(IncomeSource.builder()
                    .filing(filing)
                    .type(source.getType())
                    .description(source.getDescription())
                    .amount(source.getAmount())
                    .deductibleAmount(source.getDeductibleAmount() == null
                            ? BigDecimal.ZERO : source.getDeductibleAmount())
                    .build()));
        }
        if (request.getDeductions() != null) {
            filing.getDeductions().clear();
            request.getDeductions().forEach(deduction -> filing.getDeductions().add(DeductionEntry.builder()
                    .filing(filing)
                    .section(deduction.getSection().toUpperCase())
                    .description(deduction.getDescription())
                    .amount(deduction.getAmount())
                    .build()));
        }
        if (request.getTaxPayments() != null) {
            filing.getTaxPayments().clear();
            request.getTaxPayments().forEach(payment -> filing.getTaxPayments().add(TaxPaymentEntry.builder()
                    .filing(filing)
                    .type(payment.getType())
                    .amount(payment.getAmount())
                    .deductorTan(payment.getDeductorTan())
                    .challanNumber(payment.getChallanNumber())
                    .paidOn(payment.getPaidOn())
                    .build()));
        }

        filing.setUpdatedAt(LocalDateTime.now());
        IncomeTaxFiling saved = filingRepository.save(filing);
        FilingCase filingCase = saved.getFilingCase();
        filingCase.setReturnType(suggestReturnType(saved.getTaxpayerType(), saved.getIncomeSources()));
        auditService.record("IT_FILING_UPDATED", "IncomeTaxFiling", saved.getId(), null,
                Map.of("caseId", caseId));
        return saved;
    }

    public IncomeTaxComputationService.Comparison compute(String caseId, User actor) {
        IncomeTaxFiling filing = requireForCase(caseId, actor);
        return computationService.compute(filing, LocalDate.now());
    }

    /** Validates the filing and moves the case into review; the taxpayer's own submit action. */
    @Transactional
    public FilingCase submit(String caseId, User actor) {
        IncomeTaxFiling filing = requireForCase(caseId, actor);
        List<ApiResponse.FieldError> errors = validate(filing);
        if (!errors.isEmpty()) {
            throw ApiException.validation("Filing contains validation errors", errors);
        }

        IncomeTaxComputationService.Comparison comparison = computationService.compute(filing, LocalDate.now());
        filing.setComputationJson(serialize(comparison));
        filingRepository.save(filing);

        FilingCase filingCase = filing.getFilingCase();
        FilingStatus target = workflowService.transitions(TaxType.INCOME_TAX, filingCase.getStatus()).stream()
                .map(WorkflowService.Transition::to)
                .filter(status -> status == FilingStatus.UNDER_REVIEW)
                .findFirst()
                .orElseThrow(() -> ApiException.badRequest("CASE_NOT_SUBMITTABLE",
                        "A case in " + filingCase.getStatus() + " cannot be submitted for review"));
        filingCase.setSubmittedAt(LocalDateTime.now());
        return workflowService.transition(filingCase, target, actor, "Submitted for review by taxpayer");
    }

    public List<ApiResponse.FieldError> validate(IncomeTaxFiling filing) {
        List<ApiResponse.FieldError> errors = new ArrayList<>();
        FilingCase filingCase = filing.getFilingCase();
        if (filingCase.getAssessmentYear() == null || filingCase.getAssessmentYear().isBlank()) {
            errors.add(error("assessmentYear", "Assessment year is required"));
        }
        if (filing.getIncomeSources().isEmpty()) {
            errors.add(error("incomeSources", "At least one income source is required"));
        }
        filing.getIncomeSources().stream()
                .filter(source -> source.getAmount() == null || source.getAmount().signum() < 0)
                .findFirst()
                .ifPresent(source -> errors.add(error("incomeSources", "Income amounts cannot be negative")));
        filing.getDeductions().stream()
                .filter(deduction -> deduction.getAmount() == null || deduction.getAmount().signum() < 0)
                .findFirst()
                .ifPresent(deduction -> errors.add(error("deductions", "Deduction amounts cannot be negative")));
        filing.getTaxPayments().stream()
                .filter(payment -> payment.getType() == TaxPaymentEntry.Type.TDS
                        && (payment.getDeductorTan() == null || payment.getDeductorTan().isBlank()))
                .findFirst()
                .ifPresent(payment -> errors.add(error("taxPayments", "TDS entries require the deductor TAN")));
        return errors;
    }

    /** Chooses the ITR form from the taxpayer category and the income heads present. */
    public ReturnType suggestReturnType(TaxpayerType taxpayerType, List<IncomeSource> sources) {
        boolean hasBusiness = sources.stream().anyMatch(source ->
                source.getType() == IncomeSource.Type.BUSINESS
                        || source.getType() == IncomeSource.Type.PROFESSIONAL);
        boolean hasCapitalGains = sources.stream().anyMatch(source ->
                source.getType() == IncomeSource.Type.CAPITAL_GAINS_SHORT_TERM
                        || source.getType() == IncomeSource.Type.CAPITAL_GAINS_LONG_TERM);
        if (taxpayerType == TaxpayerType.BUSINESS || taxpayerType == TaxpayerType.PROFESSIONAL || hasBusiness) {
            return hasCapitalGains ? ReturnType.ITR_3 : ReturnType.ITR_4;
        }
        if (hasCapitalGains || taxpayerType == TaxpayerType.HUF) {
            return ReturnType.ITR_2;
        }
        return ReturnType.ITR_1;
    }

    private ApiResponse.FieldError error(String field, String message) {
        return ApiResponse.FieldError.builder().field(field).message(message).build();
    }

    private BigDecimal orExisting(BigDecimal candidate, BigDecimal existing) {
        return candidate == null ? existing : candidate;
    }

    private String serialize(Object value) {
        try {
            return objectMapper.writeValueAsString(value);
        } catch (Exception ex) {
            return null;
        }
    }
}
