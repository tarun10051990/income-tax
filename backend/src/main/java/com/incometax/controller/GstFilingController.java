package com.incometax.controller;

import com.incometax.common.ApiResponse;
import com.incometax.common.PageResponse;
import com.incometax.dto.GstRequests;
import com.incometax.dto.Responses;
import com.incometax.entity.GstInvoice;
import com.incometax.security.CurrentUser;
import com.incometax.service.GstComputationService;
import com.incometax.service.GstFilingService;
import com.incometax.service.GstReconciliationService;
import com.incometax.service.ResponseMapper;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.http.MediaType;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RequestPart;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/gst")
@RequiredArgsConstructor
@Tag(name = "GST filing")
public class GstFilingController {

    private final GstFilingService gstFilingService;
    private final GstReconciliationService reconciliationService;
    private final GstInvoiceCsvParser csvParser;
    private final ResponseMapper responseMapper;
    private final CurrentUser currentUser;

    @PostMapping("/filings")
    @Operation(summary = "Open a GSTR-1 or GSTR-3B return for a monthly period")
    public ApiResponse<Responses.CaseSummary> create(@Valid @RequestBody GstRequests.CreateFiling request) {
        return ApiResponse.ok(responseMapper.filingCase(
                gstFilingService.create(currentUser.require(), request).getFilingCase()));
    }

    @PostMapping("/filings/{caseId}/invoices")
    @Operation(summary = "Record a single sales, purchase, credit or debit document")
    public ApiResponse<Responses.InvoiceView> addInvoice(@PathVariable String caseId,
                                                        @Valid @RequestBody GstRequests.InvoiceInput input) {
        return ApiResponse.ok(responseMapper.invoice(
                gstFilingService.addInvoice(caseId, input, currentUser.require())));
    }

    @PostMapping("/filings/{caseId}/invoices/import")
    @Operation(summary = "Bulk import documents from JSON; duplicates are skipped and reported")
    public ApiResponse<GstFilingService.ImportResult> importInvoices(
            @PathVariable String caseId, @Valid @RequestBody GstRequests.ImportRequest request) {
        return ApiResponse.ok(gstFilingService.importInvoices(caseId, request.getInvoices(),
                currentUser.require()));
    }

    @PostMapping(value = "/filings/{caseId}/invoices/import-csv", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    @Operation(summary = "Bulk import documents from a CSV or Excel-exported CSV file")
    public ApiResponse<GstFilingService.ImportResult> importCsv(@PathVariable String caseId,
                                                               @RequestPart("file") MultipartFile file) {
        List<GstRequests.InvoiceInput> parsed = csvParser.parse(file);
        return ApiResponse.ok(gstFilingService.importInvoices(caseId, parsed, currentUser.require()));
    }

    @GetMapping("/filings/{caseId}/invoices")
    @Operation(summary = "Documents recorded against a return")
    public ApiResponse<PageResponse<Responses.InvoiceView>> invoices(
            @PathVariable String caseId,
            @RequestParam(required = false) GstInvoice.DocumentType documentType,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "50") int size) {
        return ApiResponse.ok(PageResponse.of(gstFilingService.invoices(caseId, documentType,
                        currentUser.require(),
                        PageRequest.of(page, size, Sort.by(Sort.Direction.DESC, "invoiceDate"))),
                responseMapper::invoice));
    }

    @PostMapping("/filings/{caseId}/reconciliation")
    @Operation(summary = "Reconcile the taxpayer's books against counterparty records")
    public ApiResponse<List<Responses.ReconciliationView>> reconcile(@PathVariable String caseId) {
        return ApiResponse.ok(gstFilingService.reconcile(caseId, currentUser.require()).stream()
                .map(responseMapper::reconciliation)
                .toList());
    }

    @GetMapping("/filings/{caseId}/reconciliation")
    @Operation(summary = "Reconciliation result summary by status")
    public ApiResponse<Map<String, Long>> reconciliationSummary(@PathVariable String caseId) {
        var filing = gstFilingService.requireForCase(caseId, currentUser.require());
        Map<String, Long> summary = new java.util.LinkedHashMap<>();
        reconciliationService.summary(filing.getId())
                .forEach((status, count) -> summary.put(status.name(), count));
        return ApiResponse.ok(summary);
    }

    @GetMapping("/filings/{caseId}/computation")
    @Operation(summary = "Output tax, input tax credit, reverse charge, interest and late fee")
    public ApiResponse<GstComputationService.Computation> compute(@PathVariable String caseId) {
        return ApiResponse.ok(gstFilingService.compute(caseId, currentUser.require()));
    }

    @PostMapping("/filings/{caseId}/submit")
    @Operation(summary = "Validate the return and submit it for review")
    public ApiResponse<Responses.CaseSummary> submit(@PathVariable String caseId) {
        return ApiResponse.ok(responseMapper.filingCase(gstFilingService.submit(caseId, currentUser.require())));
    }
}
