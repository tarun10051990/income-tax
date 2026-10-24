package com.incometax.controller;

import com.incometax.common.ApiResponse;
import com.incometax.common.PageResponse;
import com.incometax.dto.AdminRequests;
import com.incometax.dto.Responses;
import com.incometax.entity.PaymentRecord;
import com.incometax.security.CurrentUser;
import com.incometax.service.PaymentService;
import com.incometax.service.ResponseMapper;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

/** Service fee billing. Government tax payments are made by the taxpayer on the official portal. */
@RestController
@RequestMapping("/api/admin/payments")
@RequiredArgsConstructor
@Tag(name = "Admin service fee payments")
public class AdminPaymentController {

    private final PaymentService paymentService;
    private final ResponseMapper responseMapper;
    private final CurrentUser currentUser;

    @GetMapping
    @Operation(summary = "All service fee invoices, optionally filtered by status")
    public ApiResponse<PageResponse<Responses.PaymentView>> list(
            @RequestParam(required = false) PaymentRecord.Status status,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {
        return ApiResponse.ok(PageResponse.of(paymentService.all(status,
                        PageRequest.of(page, size, Sort.by(Sort.Direction.DESC, "createdAt"))),
                responseMapper::payment));
    }

    @PostMapping
    @Operation(summary = "Raise a service fee invoice")
    public ApiResponse<Responses.PaymentView> raise(@Valid @RequestBody AdminRequests.RaiseInvoice request) {
        return ApiResponse.ok(responseMapper.payment(paymentService.raiseInvoice(request.getCustomerId(),
                request.getCaseId(), request.getDescription(), request.getAmount(), request.getTaxAmount(),
                request.getDueDate(), currentUser.require())));
    }

    @PostMapping("/{paymentId}/outcome")
    @Operation(summary = "Record the outcome reported by the payment provider")
    public ApiResponse<Responses.PaymentView> outcome(@PathVariable String paymentId,
                                                     @Valid @RequestBody AdminRequests.RecordPaymentOutcome request) {
        return ApiResponse.ok(responseMapper.payment(paymentService.recordOutcome(paymentId, request.getStatus(),
                request.getProviderReference(), request.getFailureReason(), currentUser.require())));
    }
}
