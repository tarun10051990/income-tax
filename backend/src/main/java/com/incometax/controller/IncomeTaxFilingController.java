package com.incometax.controller;

import com.incometax.common.ApiResponse;
import com.incometax.dto.IncomeTaxRequests;
import com.incometax.dto.Responses;
import com.incometax.security.CurrentUser;
import com.incometax.service.IncomeTaxComputationService;
import com.incometax.service.IncomeTaxFilingService;
import com.incometax.service.ResponseMapper;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/income-tax")
@RequiredArgsConstructor
@Tag(name = "Income tax filing")
public class IncomeTaxFilingController {

    private final IncomeTaxFilingService filingService;
    private final ResponseMapper responseMapper;
    private final CurrentUser currentUser;

    @PostMapping("/filings")
    @Operation(summary = "Open an income tax filing for an assessment year")
    public ApiResponse<Responses.CaseSummary> create(@Valid @RequestBody IncomeTaxRequests.CreateFiling request) {
        return ApiResponse.ok(responseMapper.filingCase(
                filingService.create(currentUser.require(), request).getFilingCase()));
    }

    @PutMapping("/filings/{caseId}")
    @Operation(summary = "Save income, deductions and taxes paid")
    public ApiResponse<Responses.CaseSummary> update(@PathVariable String caseId,
                                                    @Valid @RequestBody IncomeTaxRequests.UpdateFiling request) {
        return ApiResponse.ok(responseMapper.filingCase(
                filingService.update(caseId, request, currentUser.require()).getFilingCase()));
    }

    @GetMapping("/filings/{caseId}/computation")
    @Operation(summary = "Old and new regime computation with the recommended regime")
    public ApiResponse<IncomeTaxComputationService.Comparison> compute(@PathVariable String caseId) {
        return ApiResponse.ok(filingService.compute(caseId, currentUser.require()));
    }

    @PostMapping("/filings/{caseId}/submit")
    @Operation(summary = "Validate the filing and submit it for review")
    public ApiResponse<Responses.CaseSummary> submit(@PathVariable String caseId) {
        return ApiResponse.ok(responseMapper.filingCase(filingService.submit(caseId, currentUser.require())));
    }
}
