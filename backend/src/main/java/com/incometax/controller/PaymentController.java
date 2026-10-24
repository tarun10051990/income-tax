package com.incometax.controller;

import com.incometax.common.ApiResponse;
import com.incometax.common.PageResponse;
import com.incometax.dto.Responses;
import com.incometax.security.CurrentUser;
import com.incometax.service.PaymentService;
import com.incometax.service.ResponseMapper;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

/** Professional service fees. Tax payable to the government is never collected here. */
@RestController
@RequestMapping("/api/payments")
@RequiredArgsConstructor
@Tag(name = "Service fee payments")
public class PaymentController {

    private final PaymentService paymentService;
    private final ResponseMapper responseMapper;
    private final CurrentUser currentUser;

    @GetMapping
    @Operation(summary = "Service fee invoices raised against the signed in taxpayer")
    public ApiResponse<PageResponse<Responses.PaymentView>> mine(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {
        return ApiResponse.ok(PageResponse.of(paymentService.forCustomer(currentUser.require().getId(),
                        PageRequest.of(page, size, Sort.by(Sort.Direction.DESC, "createdAt"))),
                responseMapper::payment));
    }
}
