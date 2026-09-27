package com.incometax.controller;

import com.incometax.common.ApiResponse;
import com.incometax.dto.AdminRequests;
import com.incometax.dto.Responses;
import com.incometax.entity.TaxType;
import com.incometax.integration.FilingSubmission;
import com.incometax.security.CurrentUser;
import com.incometax.service.FilingIntegrationService;
import com.incometax.service.ResponseMapper;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.Map;

/**
 * Boundary with the official portals. When no official adapter is configured the platform prepares
 * the return and stops: the acknowledgement can only be recorded from what the portal actually
 * returned to the operator.
 */
@RestController
@RequestMapping("/api/admin/integration")
@RequiredArgsConstructor
@Tag(name = "Admin government filing integration")
public class AdminIntegrationController {

    private final FilingIntegrationService filingIntegrationService;
    private final ResponseMapper responseMapper;
    private final CurrentUser currentUser;

    @GetMapping("/status")
    @Operation(summary = "Whether an official filing adapter is configured for each tax type")
    public ApiResponse<Map<String, Boolean>> status() {
        return ApiResponse.ok(Map.of(
                TaxType.INCOME_TAX.name(), filingIntegrationService.isConfigured(TaxType.INCOME_TAX),
                TaxType.GST.name(), filingIntegrationService.isConfigured(TaxType.GST)));
    }

    @PostMapping("/cases/{caseId}/submit")
    @Operation(summary = "Hand a prepared return to the configured adapter, or report that manual filing is required")
    public ApiResponse<FilingSubmission> submit(@PathVariable String caseId) {
        return ApiResponse.ok(filingIntegrationService.submit(caseId, currentUser.require()));
    }

    @PostMapping("/cases/{caseId}/acknowledgement")
    @Operation(summary = "Record the acknowledgement number the official portal returned")
    public ApiResponse<Responses.CaseSummary> acknowledgement(
            @PathVariable String caseId, @Valid @RequestBody AdminRequests.RecordAcknowledgement request) {
        return ApiResponse.ok(responseMapper.filingCase(filingIntegrationService.recordAcknowledgement(
                caseId, request.getAcknowledgementNumber(), request.getFiledAt(), currentUser.require())));
    }
}
