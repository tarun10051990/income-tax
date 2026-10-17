package com.incometax.taxrates.controller;

import com.incometax.common.ApiResponse;
import com.incometax.security.CurrentUser;
import com.incometax.taxrates.dto.TaxRateDtos;
import com.incometax.taxrates.entity.TaxCategoryRate;
import com.incometax.taxrates.entity.TaxRegimeSetting;
import com.incometax.taxrates.entity.TaxSlab;
import com.incometax.taxrates.service.ItrComputationService;
import com.incometax.taxrates.service.TaxEngine;
import com.incometax.taxrates.service.TaxRateService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequiredArgsConstructor
@Tag(name = "Income-tax rates and ITR computation")
public class TaxRateController {

    private final TaxRateService taxRateService;
    private final ItrComputationService computationService;
    private final CurrentUser currentUser;

    @GetMapping("/api/public/tax/years")
    @Operation(summary = "Financial years that have tax rates in the database")
    public ApiResponse<List<TaxRateDtos.YearView>> years() {
        return ApiResponse.ok(taxRateService.years());
    }

    @GetMapping("/api/public/tax/rates")
    @Operation(summary = "Slabs, regime settings and every income / deduction category for a financial year")
    public ApiResponse<TaxRateDtos.RateBookView> rates(@RequestParam(required = false) String financialYear) {
        return ApiResponse.ok(taxRateService.view(financialYear == null ? taxRateService.latestYear() : financialYear, true));
    }

    @PostMapping("/api/public/tax/estimate")
    @Operation(summary = "Work out tax for both regimes without saving (calculator)")
    public ApiResponse<TaxEngine.Result> estimate(@Valid @RequestBody TaxRateDtos.ComputeRequest request) {
        return ApiResponse.ok(computationService.estimate(request));
    }

    @PostMapping("/api/itr/computations")
    @Operation(summary = "Work out tax from the ITR form and save every category and result for the signed-in user")
    public ApiResponse<TaxRateDtos.SavedComputation> compute(@Valid @RequestBody TaxRateDtos.ComputeRequest request) {
        return ApiResponse.ok(computationService.computeAndSave(request, currentUser.require()));
    }

    @GetMapping("/api/itr/computations")
    @Operation(summary = "The signed-in user's saved ITR computation for a financial year")
    public ApiResponse<TaxRateDtos.SavedComputation> saved(@RequestParam String financialYear) {
        return ApiResponse.ok(computationService.saved(financialYear, currentUser.require()).orElse(null));
    }

    @GetMapping("/api/admin/tax-rates")
    public ApiResponse<TaxRateDtos.RateBookView> adminRates(@RequestParam(required = false) String financialYear) {
        return ApiResponse.ok(taxRateService.adminView(financialYear, currentUser.require()));
    }

    @PutMapping("/api/admin/tax-rates/categories/{id}")
    public ApiResponse<TaxCategoryRate> updateCategory(@PathVariable String id, @Valid @RequestBody TaxRateDtos.CategoryUpdate update) {
        return ApiResponse.ok(taxRateService.updateCategory(id, update, currentUser.require()));
    }

    @PutMapping("/api/admin/tax-rates/settings/{id}")
    public ApiResponse<TaxRegimeSetting> updateSetting(@PathVariable String id, @Valid @RequestBody TaxRateDtos.SettingUpdate update) {
        return ApiResponse.ok(taxRateService.updateSetting(id, update, currentUser.require()));
    }

    @PutMapping("/api/admin/tax-rates/slabs/{id}")
    public ApiResponse<TaxSlab> updateSlab(@PathVariable String id, @Valid @RequestBody TaxRateDtos.SlabUpdate update) {
        return ApiResponse.ok(taxRateService.updateSlab(id, update, currentUser.require()));
    }

    @PostMapping("/api/admin/tax-rates/copy-year")
    @Operation(summary = "Start a new financial year from an existing year's rates")
    public ApiResponse<TaxRateDtos.RateBookView> copyYear(@Valid @RequestBody TaxRateDtos.CopyYearRequest request) {
        return ApiResponse.ok(taxRateService.copyYear(request, currentUser.require()));
    }
}
