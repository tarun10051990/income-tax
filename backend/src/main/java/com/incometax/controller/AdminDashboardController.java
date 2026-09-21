package com.incometax.controller;

import com.incometax.common.ApiResponse;
import com.incometax.dto.Responses;
import com.incometax.security.CurrentUser;
import com.incometax.security.Permission;
import com.incometax.security.RbacService;
import com.incometax.service.DashboardService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/admin/dashboard")
@RequiredArgsConstructor
@Tag(name = "Admin dashboard")
public class AdminDashboardController {

    private final DashboardService dashboardService;
    private final RbacService rbacService;
    private final CurrentUser currentUser;

    @GetMapping
    @Operation(summary = "Income tax and GST KPIs, charts, deadlines and service fee revenue")
    public ApiResponse<Responses.DashboardView> dashboard() {
        rbacService.require(currentUser.require(), Permission.REPORT_READ);
        return ApiResponse.ok(dashboardService.dashboard());
    }

    @GetMapping("/deadlines")
    @Operation(summary = "Cases due within the requested number of days")
    public ApiResponse<List<Responses.CaseSummary>> deadlines(@RequestParam(defaultValue = "30") int days) {
        rbacService.require(currentUser.require(), Permission.REPORT_READ);
        return ApiResponse.ok(dashboardService.upcomingDeadlines(days));
    }
}
