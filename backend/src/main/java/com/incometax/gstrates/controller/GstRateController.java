package com.incometax.gstrates.controller;

import com.incometax.common.ApiResponse;
import com.incometax.gstrates.dto.GstRateDtos;
import com.incometax.gstrates.entity.GstRateCategory;
import com.incometax.gstrates.entity.GstRule;
import com.incometax.gstrates.service.GstRateService;
import com.incometax.security.CurrentUser;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;

@RestController
@RequiredArgsConstructor
public class GstRateController {

    private final GstRateService gstRateService;
    private final CurrentUser currentUser;

    /** GST rates and rules in force on a date (today by default). */
    @GetMapping("/api/public/gst/rates")
    public ApiResponse<GstRateDtos.RateBook> rates(
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate date) {
        return ApiResponse.ok(gstRateService.rateBook(date == null ? LocalDate.now() : date));
    }

    @PostMapping("/api/public/gst/calculate")
    public ApiResponse<GstRateDtos.Calculation> calculate(@Valid @RequestBody GstRateDtos.CalculateRequest request) {
        return ApiResponse.ok(gstRateService.calculate(request));
    }

    /** Every row, including past rates, for the admin editor. */
    @GetMapping("/api/admin/gst-rates")
    public ApiResponse<GstRateDtos.RateBook> adminRates() {
        currentUser.require();
        return ApiResponse.ok(gstRateService.rateBook(null));
    }

    @PutMapping("/api/admin/gst-rates/categories/{id}")
    public ApiResponse<GstRateCategory> updateCategory(@PathVariable String id,
                                                       @Valid @RequestBody GstRateDtos.CategoryUpdate update) {
        return ApiResponse.ok(gstRateService.updateCategory(id, update, currentUser.require()));
    }

    @PutMapping("/api/admin/gst-rates/rules/{id}")
    public ApiResponse<GstRule> updateRule(@PathVariable String id, @Valid @RequestBody GstRateDtos.RuleUpdate update) {
        return ApiResponse.ok(gstRateService.updateRule(id, update, currentUser.require()));
    }
}
