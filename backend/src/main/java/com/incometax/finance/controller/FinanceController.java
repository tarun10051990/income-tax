package com.incometax.finance.controller;

import com.incometax.common.ApiResponse;
import com.incometax.entity.User;
import com.incometax.finance.dto.FinanceRequests.InvestmentRequest;
import com.incometax.finance.dto.FinanceRequests.TaxPaymentRequest;
import com.incometax.finance.dto.FinanceViews.*;
import com.incometax.finance.service.FinanceAnalyticsService;
import com.incometax.finance.service.FinanceLedgerService;
import com.incometax.finance.service.FinanceMapper;
import com.incometax.finance.service.FinancialYearService;
import com.incometax.security.CurrentUser;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.util.List;

/** Customer-facing finance module: dashboard, investments, tax payments, tracking, savings, refunds. */
@RestController
@RequestMapping("/api/finance")
@RequiredArgsConstructor
public class FinanceController {

    private final CurrentUser currentUser;
    private final FinanceLedgerService ledger;
    private final FinanceAnalyticsService analytics;
    private final FinancialYearService financialYears;
    private final FinanceMapper mapper;

    @GetMapping("/financial-years")
    public ApiResponse<List<FinancialYearView>> financialYears() {
        return ApiResponse.ok(financialYears.all().stream().map(financialYears::view).toList());
    }

    @GetMapping("/dashboard")
    public ApiResponse<ClientDashboard> dashboard(@RequestParam(required = false) String period,
                                                  @RequestParam(required = false) String fy,
                                                  @RequestParam(required = false) String month,
                                                  @RequestParam(required = false) Integer quarter,
                                                  @RequestParam(required = false)
                                                  @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate from,
                                                  @RequestParam(required = false)
                                                  @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate to,
                                                  @RequestParam(required = false) String groupBy) {
        User user = currentUser.require();
        PeriodView window = financialYears.resolve(period, fy, month, quarter, from, to, groupBy);
        return ApiResponse.ok(analytics.clientDashboard(user, window));
    }

    /* ---------- investments ---------- */

    @GetMapping("/investments")
    public ApiResponse<List<InvestmentView>> investments(@RequestParam(required = false) String fy) {
        return ApiResponse.ok(ledger.investments(currentUser.require(), fy).stream()
                .map(i -> mapper.investment(i, false)).toList());
    }

    @PostMapping("/investments")
    public ApiResponse<InvestmentView> addInvestment(@Valid @RequestBody InvestmentRequest request) {
        return ApiResponse.ok(mapper.investment(ledger.addInvestment(currentUser.require(), request), false));
    }

    @PutMapping("/investments/{id}")
    public ApiResponse<InvestmentView> updateInvestment(@PathVariable String id,
                                                        @Valid @RequestBody InvestmentRequest request) {
        return ApiResponse.ok(mapper.investment(ledger.updateInvestment(currentUser.require(), id, request),
                false));
    }

    @DeleteMapping("/investments/{id}")
    public ApiResponse<Void> deleteInvestment(@PathVariable String id) {
        ledger.deleteInvestment(currentUser.require(), id);
        return ApiResponse.ok(null);
    }

    /* ---------- tax payments ---------- */

    @GetMapping("/tax-payments")
    public ApiResponse<List<TaxPaymentView>> payments(@RequestParam(required = false) String fy) {
        return ApiResponse.ok(ledger.payments(currentUser.require(), fy).stream()
                .map(p -> mapper.payment(p, false)).toList());
    }

    @PostMapping("/tax-payments")
    public ApiResponse<TaxPaymentView> addPayment(@Valid @RequestBody TaxPaymentRequest request) {
        return ApiResponse.ok(mapper.payment(ledger.addPayment(currentUser.require(), request), false));
    }

    @PutMapping("/tax-payments/{id}")
    public ApiResponse<TaxPaymentView> updatePayment(@PathVariable String id,
                                                     @Valid @RequestBody TaxPaymentRequest request) {
        return ApiResponse.ok(mapper.payment(ledger.updatePayment(currentUser.require(), id, request), false));
    }

    @DeleteMapping("/tax-payments/{id}")
    public ApiResponse<Void> deletePayment(@PathVariable String id) {
        ledger.deletePayment(currentUser.require(), id);
        return ApiResponse.ok(null);
    }

    /* ---------- tracking / savings / refunds ---------- */

    @GetMapping("/tracking")
    public ApiResponse<List<TrackingRow>> tracking(@RequestParam(required = false) String fy) {
        return ApiResponse.ok(analytics.tracking(currentUser.require(), blankToNull(fy)));
    }

    @GetMapping("/savings")
    public ApiResponse<SavingsView> savings(@RequestParam(required = false) String fy) {
        return ApiResponse.ok(analytics.savings(currentUser.require(), fy));
    }

    @GetMapping("/refunds")
    public ApiResponse<List<RefundView>> refunds(@RequestParam(required = false) String fy) {
        User user = currentUser.require();
        return ApiResponse.ok(ledger.customerRefunds(user, blankToNull(fy)).stream()
                .map(r -> mapper.refund(r, false)).toList());
    }

    private static String blankToNull(String value) {
        return value == null || value.isBlank() ? null : value;
    }
}
