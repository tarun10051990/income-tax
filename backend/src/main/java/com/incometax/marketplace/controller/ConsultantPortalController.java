package com.incometax.marketplace.controller;

import com.incometax.common.ApiResponse;
import com.incometax.common.PageResponse;
import com.incometax.entity.User;
import com.incometax.marketplace.dto.MarketplaceRequests.*;
import com.incometax.marketplace.dto.MarketplaceViews.*;
import com.incometax.marketplace.entity.ConsultantProfile;
import com.incometax.marketplace.entity.ConsultantReview;
import com.incometax.marketplace.entity.ConsultationBooking;
import com.incometax.marketplace.repository.ConsultantReviewRepository;
import com.incometax.marketplace.service.*;
import com.incometax.security.CurrentUser;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.PageRequest;
import org.springframework.web.bind.annotation.*;

import java.util.EnumSet;
import java.util.List;
import java.util.Set;

/** Consultant Portal API. Route-level security restricts /api/consultant/** to the CONSULTANT role. */
@RestController
@RequestMapping("/api/consultant")
@RequiredArgsConstructor
@Tag(name = "Consultant portal")
public class ConsultantPortalController {

    private final ConsultantProfileService profileService;
    private final BookingService bookingService;
    private final PayoutService payoutService;
    private final ConsultantReviewRepository reviewRepository;
    private final MarketplaceMapper mapper;
    private final CurrentUser currentUser;

    private ConsultantProfile me() {
        return profileService.requireByUser(currentUser.require());
    }

    @GetMapping("/dashboard")
    public ApiResponse<ConsultantDashboard> dashboard() {
        User user = currentUser.require();
        return ApiResponse.ok(payoutService.dashboard(profileService.requireByUser(user), user));
    }

    /* ---------- profile ---------- */

    @GetMapping("/profile")
    public ApiResponse<ConsultantPrivateView> profile() {
        return ApiResponse.ok(mapper.privateView(me()));
    }

    @PutMapping("/profile")
    public ApiResponse<ConsultantPrivateView> updateProfile(@Valid @RequestBody ConsultantProfileUpdate request) {
        return ApiResponse.ok(mapper.privateView(profileService.updateOwn(currentUser.require(), request)));
    }

    @PutMapping("/profile/bank")
    public ApiResponse<ConsultantPrivateView> bank(@Valid @RequestBody BankDetailsRequest request) {
        return ApiResponse.ok(mapper.privateView(profileService.updateBankDetails(currentUser.require(), request)));
    }

    /* ---------- services ---------- */

    @GetMapping("/services")
    public ApiResponse<List<ServiceView>> services() {
        return ApiResponse.ok(profileService.services(me()).stream().map(mapper::service).toList());
    }

    @PostMapping("/services")
    public ApiResponse<ServiceView> addService(@Valid @RequestBody ServiceRequest request) {
        return ApiResponse.ok(mapper.service(profileService.saveService(currentUser.require(), null, request)));
    }

    @PutMapping("/services/{id}")
    public ApiResponse<ServiceView> editService(@PathVariable String id, @Valid @RequestBody ServiceRequest request) {
        return ApiResponse.ok(mapper.service(profileService.saveService(currentUser.require(), id, request)));
    }

    @DeleteMapping("/services/{id}")
    public ApiResponse<Void> deleteService(@PathVariable String id) {
        profileService.deleteService(currentUser.require(), id);
        return ApiResponse.ok(null);
    }

    /* ---------- availability ---------- */

    @GetMapping("/availability")
    public ApiResponse<List<AvailabilityRuleView>> availability() {
        return ApiResponse.ok(profileService.rules(me()).stream().map(mapper::rule).toList());
    }

    @PutMapping("/availability")
    @Operation(summary = "Replace the weekly availability rules")
    public ApiResponse<List<AvailabilityRuleView>> setAvailability(@Valid @RequestBody AvailabilityUpdate request) {
        return ApiResponse.ok(profileService.replaceRules(me(), request).stream().map(mapper::rule).toList());
    }

    @GetMapping("/holidays")
    public ApiResponse<List<HolidayView>> holidays() {
        return ApiResponse.ok(profileService.holidays(me()).stream().map(mapper::holiday).toList());
    }

    @PostMapping("/holidays")
    public ApiResponse<HolidayView> addHoliday(@Valid @RequestBody HolidayRequest request) {
        return ApiResponse.ok(mapper.holiday(profileService.addHoliday(me(), request)));
    }

    @DeleteMapping("/holidays/{id}")
    public ApiResponse<Void> removeHoliday(@PathVariable String id) {
        profileService.removeHoliday(me(), id);
        return ApiResponse.ok(null);
    }

    /* ---------- bookings ---------- */

    @GetMapping("/bookings")
    @Operation(summary = "My bookings; filter=requests|upcoming|past|all")
    public ApiResponse<PageResponse<BookingView>> bookings(@RequestParam(defaultValue = "all") String filter,
                                                           @RequestParam(defaultValue = "0") int page,
                                                           @RequestParam(defaultValue = "20") int size) {
        User user = currentUser.require();
        Set<ConsultationBooking.Status> statuses = switch (filter) {
            case "requests" -> EnumSet.of(ConsultationBooking.Status.REQUESTED,
                    ConsultationBooking.Status.PAYMENT_PENDING);
            case "upcoming" -> EnumSet.of(ConsultationBooking.Status.CONFIRMED,
                    ConsultationBooking.Status.RESCHEDULED, ConsultationBooking.Status.IN_PROGRESS);
            case "past" -> EnumSet.of(ConsultationBooking.Status.COMPLETED, ConsultationBooking.Status.CANCELLED,
                    ConsultationBooking.Status.NO_SHOW, ConsultationBooking.Status.REFUNDED,
                    ConsultationBooking.Status.REFUND_REQUESTED);
            default -> Set.of();
        };
        return ApiResponse.ok(PageResponse.of(bookingService.forConsultant(profileService.requireByUser(user),
                statuses, PageRequest.of(page, size)), b -> mapper.booking(b, user)));
    }

    @PostMapping("/bookings/{id}/start")
    public ApiResponse<BookingView> start(@PathVariable String id) {
        User user = currentUser.require();
        return ApiResponse.ok(mapper.booking(bookingService.start(user, id), user));
    }

    @PostMapping("/bookings/{id}/complete")
    public ApiResponse<BookingView> complete(@PathVariable String id,
                                             @RequestBody(required = false) ConsultantNotesRequest notes) {
        User user = currentUser.require();
        return ApiResponse.ok(mapper.booking(bookingService.complete(user, id, notes), user));
    }

    @PostMapping("/bookings/{id}/no-show")
    public ApiResponse<BookingView> noShow(@PathVariable String id) {
        User user = currentUser.require();
        return ApiResponse.ok(mapper.booking(bookingService.noShow(user, id), user));
    }

    @PutMapping("/bookings/{id}/notes")
    public ApiResponse<BookingView> notes(@PathVariable String id, @Valid @RequestBody ConsultantNotesRequest req) {
        User user = currentUser.require();
        return ApiResponse.ok(mapper.booking(bookingService.saveConsultantNotes(user, id, req), user));
    }

    /* ---------- earnings, payouts, reviews ---------- */

    @GetMapping("/payouts")
    public ApiResponse<PageResponse<PayoutView>> payouts(@RequestParam(defaultValue = "0") int page,
                                                         @RequestParam(defaultValue = "20") int size) {
        return ApiResponse.ok(PageResponse.of(payoutService.forConsultant(me(), PageRequest.of(page, size)),
                mapper::payout));
    }

    @GetMapping("/reviews")
    public ApiResponse<PageResponse<ReviewView>> reviews(@RequestParam(defaultValue = "0") int page,
                                                         @RequestParam(defaultValue = "20") int size) {
        return ApiResponse.ok(PageResponse.of(reviewRepository.findByConsultantIdAndModerationOrderByCreatedAtDesc(
                me().getId(), ConsultantReview.Moderation.PUBLISHED, PageRequest.of(page, size)), mapper::review));
    }
}
