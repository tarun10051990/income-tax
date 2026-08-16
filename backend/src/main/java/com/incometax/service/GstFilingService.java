package com.incometax.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.incometax.common.ApiResponse;
import com.incometax.dto.GstRequests;
import com.incometax.entity.FilingCase;
import com.incometax.entity.FilingStatus;
import com.incometax.entity.GstFiling;
import com.incometax.entity.GstInvoice;
import com.incometax.entity.GstProfile;
import com.incometax.entity.GstReconciliationEntry;
import com.incometax.entity.ReturnType;
import com.incometax.entity.TaxType;
import com.incometax.entity.User;
import com.incometax.exception.ApiException;
import com.incometax.repository.GstFilingRepository;
import com.incometax.repository.GstInvoiceRepository;
import com.incometax.repository.GstProfileRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;

@Service
@RequiredArgsConstructor
public class GstFilingService {

    private final GstFilingRepository gstFilingRepository;
    private final GstInvoiceRepository gstInvoiceRepository;
    private final GstProfileRepository gstProfileRepository;
    private final FilingCaseService filingCaseService;
    private final GstComputationService computationService;
    private final GstReconciliationService reconciliationService;
    private final WorkflowService workflowService;
    private final AuditService auditService;
    private final ObjectMapper objectMapper;

    @Transactional
    public GstFiling create(User customer, GstRequests.CreateFiling request) {
        GstProfile profile = gstProfileRepository.findById(request.getGstProfileId())
                .orElseThrow(() -> ApiException.notFound("GST profile", request.getGstProfileId()));
        if (!profile.getUser().getId().equals(customer.getId())) {
            throw ApiException.forbidden("The GST profile belongs to another taxpayer");
        }
        if (request.getReturnType().getTaxType() != TaxType.GST) {
            throw ApiException.badRequest("RETURN_TYPE_MISMATCH", request.getReturnType() + " is not a GST return");
        }

        FilingCase filingCase = filingCaseService.create(customer, TaxType.GST, request.getReturnType(),
                request.getFinancialYear(), null, request.getPeriod(), profile.getState());

        GstFiling filing = gstFilingRepository.save(GstFiling.builder()
                .filingCase(filingCase)
                .gstProfile(profile)
                .build());
        auditService.record("GST_FILING_CREATED", "GstFiling", filing.getId(), null,
                Map.of("caseId", filingCase.getId(), "returnType", request.getReturnType().name()));
        return filing;
    }

    public GstFiling requireForCase(String caseId, User actor) {
        filingCaseService.requireReadable(caseId, actor);
        return gstFilingRepository.findByFilingCaseId(caseId)
                .orElseThrow(() -> ApiException.notFound("GST filing for case", caseId));
    }

    @Transactional
    public GstInvoice addInvoice(String caseId, GstRequests.InvoiceInput input, User actor) {
        filingCaseService.requireEditable(caseId, actor);
        GstFiling filing = gstFilingRepository.findByFilingCaseId(caseId)
                .orElseThrow(() -> ApiException.notFound("GST filing for case", caseId));
        GstInvoice invoice = toInvoice(filing, input);
        if (gstInvoiceRepository.existsByFilingIdAndDocumentTypeAndSourceAndInvoiceNumberAndCounterpartyGstin(
                filing.getId(), invoice.getDocumentType(), invoice.getSource(), invoice.getInvoiceNumber(),
                invoice.getCounterpartyGstin())) {
            throw ApiException.conflict("DUPLICATE_INVOICE",
                    "Invoice " + invoice.getInvoiceNumber() + " has already been recorded for this return");
        }
        GstInvoice saved = gstInvoiceRepository.save(invoice);
        auditService.record("GST_INVOICE_ADDED", "GstInvoice", saved.getId(), null,
                Map.of("caseId", caseId, "invoiceNumber", saved.getInvoiceNumber()));
        return saved;
    }

    /** Bulk import; duplicates are skipped and reported rather than failing the whole batch. */
    @Transactional
    public ImportResult importInvoices(String caseId, List<GstRequests.InvoiceInput> inputs, User actor) {
        filingCaseService.requireEditable(caseId, actor);
        GstFiling filing = gstFilingRepository.findByFilingCaseId(caseId)
                .orElseThrow(() -> ApiException.notFound("GST filing for case", caseId));

        List<GstInvoice> toSave = new ArrayList<>();
        List<ApiResponse.FieldError> rejected = new ArrayList<>();
        int duplicates = 0;

        for (int index = 0; index < inputs.size(); index++) {
            GstRequests.InvoiceInput input = inputs.get(index);
            try {
                GstInvoice invoice = toInvoice(filing, input);
                boolean duplicateInBatch = toSave.stream().anyMatch(candidate ->
                        candidate.getDocumentType() == invoice.getDocumentType()
                                && candidate.getSource() == invoice.getSource()
                                && candidate.getInvoiceNumber().equalsIgnoreCase(invoice.getInvoiceNumber())
                                && String.valueOf(candidate.getCounterpartyGstin())
                                        .equalsIgnoreCase(String.valueOf(invoice.getCounterpartyGstin())));
                boolean duplicateInDb = gstInvoiceRepository
                        .existsByFilingIdAndDocumentTypeAndSourceAndInvoiceNumberAndCounterpartyGstin(
                                filing.getId(), invoice.getDocumentType(), invoice.getSource(),
                                invoice.getInvoiceNumber(), invoice.getCounterpartyGstin());
                if (duplicateInBatch || duplicateInDb) {
                    duplicates++;
                    continue;
                }
                toSave.add(invoice);
            } catch (ApiException ex) {
                rejected.add(ApiResponse.FieldError.builder()
                        .field("row[" + index + "]")
                        .message(ex.getMessage())
                        .build());
            }
        }

        List<GstInvoice> saved = gstInvoiceRepository.saveAll(toSave);
        FilingCase filingCase = filing.getFilingCase();
        if (!saved.isEmpty() && workflowService.transitions(TaxType.GST, filingCase.getStatus()).stream()
                .anyMatch(transition -> transition.to() == FilingStatus.DATA_IMPORTED)) {
            workflowService.transition(filingCase, FilingStatus.DATA_IMPORTED, actor,
                    saved.size() + " documents imported");
        }
        auditService.record("GST_INVOICES_IMPORTED", "GstFiling", filing.getId(), null,
                Map.of("imported", saved.size(), "duplicates", duplicates, "rejected", rejected.size()));
        return new ImportResult(saved.size(), duplicates, rejected);
    }

    public Page<GstInvoice> invoices(String caseId, GstInvoice.DocumentType documentType, User actor,
                                    Pageable pageable) {
        GstFiling filing = requireForCase(caseId, actor);
        return documentType == null
                ? gstInvoiceRepository.findByFilingId(filing.getId(), pageable)
                : gstInvoiceRepository.findByFilingIdAndDocumentType(filing.getId(), documentType, pageable);
    }

    @Transactional
    public List<GstReconciliationEntry> reconcile(String caseId, User actor) {
        GstFiling filing = requireForCase(caseId, actor);
        List<GstReconciliationEntry> entries = reconciliationService.reconcile(filing);
        FilingCase filingCase = filing.getFilingCase();
        if (workflowService.transitions(TaxType.GST, filingCase.getStatus()).stream()
                .anyMatch(transition -> transition.to() == FilingStatus.RECONCILIATION_COMPLETED)) {
            workflowService.transition(filingCase, FilingStatus.RECONCILIATION_COMPLETED, actor,
                    entries.size() + " reconciliation entries produced");
        }
        return entries;
    }

    public GstComputationService.Computation compute(String caseId, User actor) {
        GstFiling filing = requireForCase(caseId, actor);
        return computationService.compute(filing, LocalDate.now());
    }

    @Transactional
    public FilingCase submit(String caseId, User actor) {
        GstFiling filing = requireForCase(caseId, actor);
        List<ApiResponse.FieldError> errors = validate(filing);
        if (!errors.isEmpty()) {
            throw ApiException.validation("Return contains validation errors", errors);
        }
        filing.setComputationJson(serialize(computationService.compute(filing, LocalDate.now())));
        filing.setUpdatedAt(LocalDateTime.now());
        gstFilingRepository.save(filing);

        FilingCase filingCase = filing.getFilingCase();
        FilingStatus target = workflowService.transitions(TaxType.GST, filingCase.getStatus()).stream()
                .map(WorkflowService.Transition::to)
                .filter(status -> status == FilingStatus.UNDER_REVIEW)
                .findFirst()
                .orElseThrow(() -> ApiException.badRequest("CASE_NOT_SUBMITTABLE",
                        "A case in " + filingCase.getStatus() + " cannot be submitted for review"));
        filingCase.setSubmittedAt(LocalDateTime.now());
        return workflowService.transition(filingCase, target, actor, "Submitted for review by taxpayer");
    }

    public List<ApiResponse.FieldError> validate(GstFiling filing) {
        List<ApiResponse.FieldError> errors = new ArrayList<>();
        List<GstInvoice> books = gstInvoiceRepository.findByFilingIdAndSource(
                filing.getId(), GstInvoice.Source.TAXPAYER_BOOKS);
        if (books.isEmpty()) {
            errors.add(field("invoices", "At least one document is required before filing"));
        }
        if (filing.getFilingCase().getPeriod() == null || filing.getFilingCase().getPeriod().isBlank()) {
            errors.add(field("period", "Return period is required"));
        }
        books.stream()
                .filter(invoice -> invoice.getSupplyType() == GstInvoice.SupplyType.TAXABLE
                        && invoice.totalTax().signum() == 0
                        && invoice.getTaxableValue().signum() > 0)
                .findFirst()
                .ifPresent(invoice -> errors.add(field("invoices",
                        "Taxable document " + invoice.getInvoiceNumber() + " carries no tax")));
        books.stream()
                .filter(invoice -> invoice.getDocumentType() == GstInvoice.DocumentType.SALES
                        && invoice.getPlaceOfSupply() == null)
                .findFirst()
                .ifPresent(invoice -> errors.add(field("invoices",
                        "Place of supply is required on sales document " + invoice.getInvoiceNumber())));
        if (filing.getFilingCase().getReturnType() == ReturnType.GSTR_3B
                && reconciliationService.summary(filing.getId())
                        .getOrDefault(GstReconciliationEntry.Status.MISMATCH, 0L) > 0) {
            errors.add(field("reconciliation", "Unresolved reconciliation mismatches remain"));
        }
        return errors;
    }

    private GstInvoice toInvoice(GstFiling filing, GstRequests.InvoiceInput input) {
        if (input.getInvoiceNumber() == null || input.getInvoiceNumber().isBlank()) {
            throw ApiException.badRequest("INVALID_INVOICE", "Invoice number is required");
        }
        if (input.getInvoiceDate() == null) {
            throw ApiException.badRequest("INVALID_INVOICE", "Invoice date is required");
        }
        return GstInvoice.builder()
                .filing(filing)
                .documentType(input.getDocumentType())
                .source(input.getSource() == null ? GstInvoice.Source.TAXPAYER_BOOKS : input.getSource())
                .supplyType(input.getSupplyType() == null ? GstInvoice.SupplyType.TAXABLE : input.getSupplyType())
                .invoiceNumber(input.getInvoiceNumber().trim())
                .invoiceDate(input.getInvoiceDate())
                .counterpartyGstin(input.getCounterpartyGstin())
                .counterpartyName(input.getCounterpartyName())
                .placeOfSupply(input.getPlaceOfSupply())
                .hsnSacCode(input.getHsnSacCode())
                .taxableValue(nz(input.getTaxableValue()))
                .cgst(nz(input.getCgst()))
                .sgst(nz(input.getSgst()))
                .igst(nz(input.getIgst()))
                .cess(nz(input.getCess()))
                .reverseCharge(Boolean.TRUE.equals(input.getReverseCharge()))
                .itcEligible(input.getItcEligible() == null || input.getItcEligible())
                .build();
    }

    private java.math.BigDecimal nz(java.math.BigDecimal value) {
        return value == null ? java.math.BigDecimal.ZERO : value;
    }

    private ApiResponse.FieldError field(String field, String message) {
        return ApiResponse.FieldError.builder().field(field).message(message).build();
    }

    private String serialize(Object value) {
        try {
            return objectMapper.writeValueAsString(value);
        } catch (Exception ex) {
            return null;
        }
    }

    public record ImportResult(int imported, int duplicates, List<ApiResponse.FieldError> rejected) {
    }
}
