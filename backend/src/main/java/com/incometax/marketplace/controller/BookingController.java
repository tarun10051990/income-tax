package com.incometax.marketplace.controller;

import com.incometax.common.ApiResponse;
import com.incometax.common.PageResponse;
import com.incometax.entity.User;
import com.incometax.marketplace.dto.MarketplaceRequests.*;
import com.incometax.marketplace.dto.MarketplaceViews.*;
import com.incometax.marketplace.service.BookingService;
import com.incometax.marketplace.service.MarketplaceMapper;
import com.incometax.security.CurrentUser;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.PageRequest;
import org.springframework.web.bind.annotation.*;

import java.util.List;

/**
 * Booking endpoints shared by clients and consultants. Every call is resource-scoped: a user only
 * ever sees bookings they are a party to.
 */
@RestController
@RequestMapping("/api/bookings")
@RequiredArgsConstructor
@Tag(name = "Consultation bookings")
public class BookingController {

    private final BookingService bookingService;
    private final MarketplaceMapper mapper;
    private final CurrentUser currentUser;

    @GetMapping
    @Operation(summary = "Client: my bookings")
    public ApiResponse<PageResponse<BookingView>> mine(@RequestParam(defaultValue = "0") int page,
                                                       @RequestParam(defaultValue = "20") int size) {
        User me = currentUser.require();
        return ApiResponse.ok(PageResponse.of(bookingService.forClient(me, PageRequest.of(page, size)),
                b -> mapper.booking(b, me)));
    }

    @PostMapping
    @Operation(summary = "Client: create a booking (status PAYMENT_PENDING) with a locked price breakdown")
    public ApiResponse<BookingView> create(@Valid @RequestBody BookingRequest request) {
        User me = currentUser.require();
        return ApiResponse.ok(mapper.booking(bookingService.create(me, request), me));
    }

    @GetMapping("/{id}")
    public ApiResponse<BookingView> view(@PathVariable String id) {
        User me = currentUser.require();
        return ApiResponse.ok(mapper.booking(bookingService.view(me, id), me));
    }

    @PostMapping("/{id}/confirm-payment")
    @Operation(summary = "Client: confirm gateway payment; booking becomes CONFIRMED and both parties are notified")
    public ApiResponse<BookingView> confirmPayment(@PathVariable String id,
                                                   @Valid @RequestBody PaymentConfirmRequest request) {
        User me = currentUser.require();
        return ApiResponse.ok(mapper.booking(bookingService.confirmPayment(me, id, request), me));
    }

    @PostMapping("/{id}/reschedule")
    public ApiResponse<BookingView> reschedule(@PathVariable String id, @Valid @RequestBody RescheduleRequest req) {
        User me = currentUser.require();
        return ApiResponse.ok(mapper.booking(bookingService.reschedule(me, id, req), me));
    }

    @PostMapping("/{id}/cancel")
    public ApiResponse<BookingView> cancel(@PathVariable String id, @RequestBody(required = false) CancelRequest req) {
        User me = currentUser.require();
        return ApiResponse.ok(mapper.booking(bookingService.cancel(me, id, req), me));
    }

    @GetMapping("/{id}/invoice")
    public ApiResponse<InvoiceView> invoice(@PathVariable String id) {
        return ApiResponse.ok(mapper.invoice(bookingService.invoice(currentUser.require(), id)));
    }

    @GetMapping("/{id}/messages")
    public ApiResponse<List<MessageView>> messages(@PathVariable String id) {
        User me = currentUser.require();
        return ApiResponse.ok(bookingService.messages(me, id).stream().map(m -> mapper.message(m, me)).toList());
    }

    @PostMapping("/{id}/messages")
    public ApiResponse<MessageView> send(@PathVariable String id, @Valid @RequestBody MessageRequest request) {
        User me = currentUser.require();
        return ApiResponse.ok(mapper.message(bookingService.sendMessage(me, id, request), me));
    }

    @GetMapping("/{id}/documents")
    public ApiResponse<List<SharedDocumentView>> documents(@PathVariable String id) {
        return ApiResponse.ok(bookingService.shares(currentUser.require(), id).stream().map(mapper::share).toList());
    }

    @PostMapping("/{id}/documents")
    @Operation(summary = "Client: share one of my documents with the consultant for this booking only")
    public ApiResponse<SharedDocumentView> share(@PathVariable String id, @Valid @RequestBody ShareDocumentRequest req) {
        return ApiResponse.ok(mapper.share(bookingService.shareDocument(currentUser.require(), id, req)));
    }

    @DeleteMapping("/{id}/documents/{shareId}")
    public ApiResponse<Void> revoke(@PathVariable String id, @PathVariable String shareId) {
        bookingService.revokeShare(currentUser.require(), id, shareId);
        return ApiResponse.ok(null);
    }

    @PostMapping("/{id}/review")
    @Operation(summary = "Client: rate a completed consultation")
    public ApiResponse<ReviewView> review(@PathVariable String id, @Valid @RequestBody ReviewRequest request) {
        return ApiResponse.ok(mapper.review(bookingService.review(currentUser.require(), id, request)));
    }
}
