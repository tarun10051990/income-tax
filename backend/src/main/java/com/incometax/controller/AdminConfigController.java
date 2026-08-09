package com.incometax.controller;

import com.incometax.common.ApiResponse;
import com.incometax.dto.AdminRequests;
import com.incometax.dto.Responses;
import com.incometax.entity.NotificationTemplate;
import com.incometax.entity.TaxType;
import com.incometax.security.CurrentUser;
import com.incometax.service.ConfigurationAdminService;
import com.incometax.service.ResponseMapper;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/admin/config")
@RequiredArgsConstructor
@Tag(name = "Admin configuration")
public class AdminConfigController {

    private final ConfigurationAdminService configurationAdminService;
    private final ResponseMapper responseMapper;
    private final CurrentUser currentUser;

    @GetMapping("/tax-rules")
    @Operation(summary = "Effective dated tax rules, slabs, limits, deadlines and workflow definitions")
    public ApiResponse<List<Responses.TaxRuleView>> taxRules(@RequestParam(required = false) TaxType taxType) {
        return ApiResponse.ok(configurationAdminService.taxRules(taxType, currentUser.require()).stream()
                .map(responseMapper::taxRule)
                .toList());
    }

    @PostMapping("/tax-rules")
    @Operation(summary = "Publish a new version of a rule; existing versions are never mutated")
    public ApiResponse<Responses.TaxRuleView> upsertTaxRule(
            @Valid @RequestBody AdminRequests.UpsertTaxRule request) {
        return ApiResponse.ok(responseMapper.taxRule(
                configurationAdminService.publishTaxRule(request, currentUser.require())));
    }

    @GetMapping("/notification-templates")
    @Operation(summary = "Notification templates by event")
    public ApiResponse<List<NotificationTemplate>> templates() {
        return ApiResponse.ok(configurationAdminService.templates(currentUser.require()));
    }

    @PostMapping("/notification-templates")
    @Operation(summary = "Create or update a notification template")
    public ApiResponse<NotificationTemplate> upsertTemplate(
            @Valid @RequestBody AdminRequests.UpsertNotificationTemplate request) {
        return ApiResponse.ok(configurationAdminService.upsertTemplate(request, currentUser.require()));
    }
}
