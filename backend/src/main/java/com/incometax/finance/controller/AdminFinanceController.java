package com.incometax.finance.controller;

import com.incometax.common.ApiResponse;
import com.incometax.common.PageResponse;
import com.incometax.entity.TaxType;
import com.incometax.entity.User;
import com.incometax.finance.dto.FinanceRequests.*;
import com.incometax.finance.dto.FinanceViews.*;
import com.incometax.finance.entity.TaxRefund;
import com.incometax.finance.entity.VerificationStatus;
import com.incometax.finance.service.Client360Service;
import com.incometax.finance.service.FinanceAnalyticsService;
import com.incometax.finance.service.FinanceLedgerService;
import com.incometax.finance.service.FinanceMapper;
import com.incometax.finance.service.FinancialYearService;
import com.incometax.security.CurrentUser;
import com.incometax.security.Permission;
import com.incometax.security.RbacService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.PageRequest;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.util.List;

/** Staff finance module: analytics, financial years, verification queues, liabilities, refunds, client 360. */
@RestController
@RequestMapping("/api/admin/finance")
@RequiredArgsConstructor
public class AdminFinanceController {

    private final CurrentUser currentUser;
    private final RbacService rbacService;
    private final FinanceLedgerService ledger;
    private final FinanceAnalyticsService analytics;
    private final FinancialYearService financialYears;
    private final Client360Service client360;
    private final FinanceMapper mapper;

    @GetMapping("/analytics")
    public ApiResponse<AdminAnalytics> analytics(@RequestParam(required = false) String period,
                                                 @RequestParam(required = false) String fy,
                                                 @RequestParam(required = false) String month,
                                                 @RequestParam(required = false) Integer quarter,
                                                 @RequestParam(required = false)
                                                 @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate from,
                                                 @RequestParam(required = false)
                                                 @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate to,
                                                 @RequestParam(required = false) String groupBy) {
        PeriodView window = financialYears.resolve(period, fy, month, quarter, from, to, groupBy);
        return ApiResponse.ok(analytics.adminAnalytics(currentUser.require(), window));
    }

    /* ---------- financial years ---------- */

    @GetMapping("/financial-years")
    public ApiResponse<List<FinancialYearView>> financialYears() {
        rbacService.require(currentUser.require(), Permission.FINANCE_READ_ALL);
        return ApiResponse.ok(financialYears.all().stream().map(financialYears::view).toList());
    }

    @PostMapping("/financial-years")
    public ApiResponse<FinancialYearView> saveFinancialYear(@Valid @RequestBody FinancialYearRequest request) {
        rbacService.require(currentUser.require(), Permission.FINANCE_MANAGE);
        return ApiResponse.ok(financialYears.view(financialYears.save(request)));
    }

    /* ---------- verification queues ---------- */

    @GetMapping("/investments")
    public ApiResponse<PageResponse<InvestmentView>> investments(
            @RequestParam(required = false) VerificationStatus status,
            @RequestParam(defaultValue = "0") int page, @RequestParam(defaultValue = "20") int size) {
        return ApiResponse.ok(PageResponse.of(
                ledger.investmentQueue(currentUser.require(), status, PageRequest.of(page, size)),
                i -> mapper.investment(i, true)));
    }

    @PostMapping("/investments/{id}/verify")
    public ApiResponse<InvestmentView> verifyInvestment(@PathVariable String id,
                                                        @Valid @RequestBody VerificationDecision decision) {
        return ApiResponse.ok(mapper.investment(ledger.verifyInvestment(currentUser.require(), id, decision),
                true));
    }

    @GetMapping("/tax-payments")
    public ApiResponse<PageResponse<TaxPaymentView>> payments(
            @RequestParam(required = false) VerificationStatus status,
            @RequestParam(defaultValue = "0") int page, @RequestParam(defaultValue = "20") int size) {
        return ApiResponse.ok(PageResponse.of(
                ledger.paymentQueue(currentUser.require(), status, PageRequest.of(page, size)),
                p -> mapper.payment(p, true)));
    }

    @PostMapping("/tax-payments/{id}/verify")
    public ApiResponse<TaxPaymentView> verifyPayment(@PathVariable String id,
                                                     @Valid @RequestBody VerificationDecision decision) {
        return ApiResponse.ok(mapper.payment(ledger.verifyPayment(currentUser.require(), id, decision), true));
    }

    /* ---------- liabilities ---------- */

    @GetMapping("/liabilities")
    public ApiResponse<PageResponse<LiabilityView>> liabilities(
            @RequestParam(required = false) String fy, @RequestParam(required = false) TaxType taxType,
            @RequestParam(defaultValue = "0") int page, @RequestParam(defaultValue = "20") int size) {
        return ApiResponse.ok(PageResponse.of(
                ledger.liabilities(currentUser.require(), fy, taxType, PageRequest.of(page, size)),
                mapper::liability));
    }

    @PostMapping("/liabilities")
    public ApiResponse<LiabilityView> saveLiability(@Valid @RequestBody LiabilityRequest request) {
        return ApiResponse.ok(mapper.liability(ledger.saveManualLiability(currentUser.require(), request)));
    }

    @DeleteMapping("/liabilities/{id}")
    public ApiResponse<Void> deleteLiability(@PathVariable String id) {
        ledger.deleteLiability(currentUser.require(), id);
        return ApiResponse.ok(null);
    }

    /* ---------- refunds ---------- */

    @GetMapping("/refunds")
    public ApiResponse<PageResponse<RefundView>> refunds(
            @RequestParam(required = false) TaxRefund.Status status,
            @RequestParam(defaultValue = "0") int page, @RequestParam(defaultValue = "20") int size) {
        return ApiResponse.ok(PageResponse.of(
                ledger.refunds(currentUser.require(), status, PageRequest.of(page, size)),
                r -> mapper.refund(r, true)));
    }

    @PostMapping("/refunds")
    public ApiResponse<RefundView> addRefund(@Valid @RequestBody RefundRequest request) {
        return ApiResponse.ok(mapper.refund(ledger.addRefund(currentUser.require(), request), true));
    }

    @PutMapping("/refunds/{id}")
    public ApiResponse<RefundView> updateRefund(@PathVariable String id, @Valid @RequestBody RefundUpdate request) {
        return ApiResponse.ok(mapper.refund(ledger.updateRefund(currentUser.require(), id, request), true));
    }

    /* ---------- client 360 ---------- */

    @GetMapping("/clients/{clientId}/360")
    public ApiResponse<Client360> client360(@PathVariable String clientId,
                                            @RequestParam(required = false) String fy) {
        User staff = currentUser.require();
        return ApiResponse.ok(client360.view(staff, clientId, fy));
    }
}
