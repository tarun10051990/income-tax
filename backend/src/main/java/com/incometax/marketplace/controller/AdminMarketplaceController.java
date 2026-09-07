package com.incometax.marketplace.controller;

import com.incometax.common.ApiResponse;
import com.incometax.common.PageResponse;
import com.incometax.entity.User;
import com.incometax.exception.ApiException;
import com.incometax.marketplace.dto.MarketplaceRequests.*;
import com.incometax.marketplace.dto.MarketplaceViews.*;
import com.incometax.marketplace.entity.*;
import com.incometax.marketplace.repository.*;
import com.incometax.marketplace.service.*;
import com.incometax.security.CurrentUser;
import com.incometax.security.Permission;
import com.incometax.security.RbacService;
import com.incometax.service.AuditService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/admin/marketplace")
@RequiredArgsConstructor
@Tag(name = "Admin: marketplace")
public class AdminMarketplaceController {

    private final ConsultantProfileService profileService;
    private final BookingService bookingService;
    private final PayoutService payoutService;
    private final PricingService pricingService;
    private final ProfessionalTypeRepository typeRepository;
    private final ConsultationCategoryRepository categoryRepository;
    private final ConsultantReviewRepository reviewRepository;
    private final CouponRepository couponRepository;
    private final ConsultantServiceRepository serviceRepository;
    private final AvailabilityRuleRepository availabilityRepository;
    private final RbacService rbacService;
    private final AuditService auditService;
    private final MarketplaceMapper mapper;
    private final CurrentUser currentUser;

    @GetMapping("/stats")
    public ApiResponse<MarketplaceStats> stats() {
        return ApiResponse.ok(payoutService.stats(currentUser.require()));
    }

    /* ---------- consultants ---------- */

    @GetMapping("/consultants")
    public ApiResponse<PageResponse<ConsultantPrivateView>> consultants(
            @RequestParam(required = false) ConsultantProfile.Status status,
            @RequestParam(required = false) String q,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {
        return ApiResponse.ok(PageResponse.of(profileService.adminList(currentUser.require(), status, q,
                PageRequest.of(page, size, Sort.by("createdAt").descending())), mapper::privateView));
    }

    @GetMapping("/consultants/{id}")
    public ApiResponse<ConsultantPrivateView> consultant(@PathVariable String id) {
        rbacService.require(currentUser.require(), Permission.CONSULTANT_MANAGE);
        return ApiResponse.ok(mapper.privateView(profileService.require(id)));
    }

    @GetMapping("/consultants/{id}/services")
    public ApiResponse<List<ServiceView>> consultantServices(@PathVariable String id) {
        rbacService.require(currentUser.require(), Permission.CONSULTANT_MANAGE);
        return ApiResponse.ok(serviceRepository.findByConsultantIdOrderByFeeAsc(id).stream().map(mapper::service)
                .toList());
    }

    @GetMapping("/consultants/{id}/availability")
    public ApiResponse<List<AvailabilityRuleView>> consultantAvailability(@PathVariable String id) {
        rbacService.require(currentUser.require(), Permission.CONSULTANT_MANAGE);
        return ApiResponse.ok(availabilityRepository.findByConsultantIdOrderByDayOfWeekAscStartTimeAsc(id).stream()
                .map(mapper::rule).toList());
    }

    @PutMapping("/consultants/{id}/availability")
    public ApiResponse<List<AvailabilityRuleView>> setAvailability(@PathVariable String id,
                                                                   @Valid @RequestBody AvailabilityUpdate request) {
        rbacService.require(currentUser.require(), Permission.CONSULTANT_MANAGE);
        return ApiResponse.ok(profileService.replaceRules(profileService.require(id), request).stream()
                .map(mapper::rule).toList());
    }

    @PutMapping("/consultants/{id}")
    public ApiResponse<ConsultantPrivateView> edit(@PathVariable String id,
                                                   @Valid @RequestBody ConsultantProfileUpdate request) {
        return ApiResponse.ok(mapper.privateView(profileService.adminUpdate(currentUser.require(), id, request)));
    }

    @PostMapping("/consultants/{id}/review")
    @Operation(summary = "Move to UNDER_REVIEW")
    public ApiResponse<ConsultantPrivateView> review(@PathVariable String id,
                                                     @RequestBody(required = false) VerificationDecision d) {
        return transition(id, ConsultantProfile.Status.UNDER_REVIEW, d);
    }

    @PostMapping("/consultants/{id}/approve")
    @Operation(summary = "Verify and activate the profile (becomes publicly visible)")
    public ApiResponse<ConsultantPrivateView> approve(@PathVariable String id,
                                                      @RequestBody(required = false) VerificationDecision d) {
        return transition(id, ConsultantProfile.Status.APPROVED, d);
    }

    @PostMapping("/consultants/{id}/reject")
    public ApiResponse<ConsultantPrivateView> reject(@PathVariable String id,
                                                     @RequestBody(required = false) VerificationDecision d) {
        return transition(id, ConsultantProfile.Status.REJECTED, d);
    }

    @PostMapping("/consultants/{id}/suspend")
    public ApiResponse<ConsultantPrivateView> suspend(@PathVariable String id,
                                                      @RequestBody(required = false) VerificationDecision d) {
        return transition(id, ConsultantProfile.Status.SUSPENDED, d);
    }

    @PostMapping("/consultants/{id}/reactivate")
    public ApiResponse<ConsultantPrivateView> reactivate(@PathVariable String id,
                                                         @RequestBody(required = false) VerificationDecision d) {
        return transition(id, ConsultantProfile.Status.ACTIVE, d);
    }

    @PostMapping("/consultants/{id}/account")
    @Operation(summary = "Enable or disable the consultant's login")
    public ApiResponse<ConsultantPrivateView> account(@PathVariable String id, @RequestParam boolean active) {
        return ApiResponse.ok(mapper.privateView(profileService.setAccountActive(currentUser.require(), id, active)));
    }

    private ApiResponse<ConsultantPrivateView> transition(String id, ConsultantProfile.Status target,
                                                          VerificationDecision decision) {
        return ApiResponse.ok(mapper.privateView(profileService.transition(currentUser.require(), id, target,
                decision == null ? null : decision.getNotes())));
    }

    /* ---------- configuration ---------- */

    @GetMapping("/professional-types")
    public ApiResponse<List<ProfessionalTypeView>> types() {
        rbacService.require(currentUser.require(), Permission.MARKETPLACE_CONFIG_MANAGE);
        return ApiResponse.ok(typeRepository.findAllByOrderBySortOrderAscLabelAsc().stream().map(mapper::type).toList());
    }

    @PostMapping("/professional-types")
    @Transactional
    public ApiResponse<ProfessionalTypeView> saveType(@Valid @RequestBody ProfessionalTypeRequest request) {
        User actor = currentUser.require();
        rbacService.require(actor, Permission.MARKETPLACE_CONFIG_MANAGE);
        ProfessionalType type = typeRepository.findByCode(request.getCode())
                .orElseGet(() -> ProfessionalType.builder().code(request.getCode()).build());
        type.setLabel(request.getLabel().trim());
        type.setDesignation(request.getDesignation());
        type.setRegulator(request.getRegulator());
        type.setActive(request.isActive());
        type.setSortOrder(request.getSortOrder());
        ProfessionalType saved = typeRepository.save(type);
        auditService.record("PROFESSIONAL_TYPE_SAVED", "ProfessionalType", saved.getId(), null,
                Map.of("code", saved.getCode()));
        return ApiResponse.ok(mapper.type(saved));
    }

    @GetMapping("/categories")
    public ApiResponse<List<CategoryView>> categories() {
        rbacService.require(currentUser.require(), Permission.MARKETPLACE_CONFIG_MANAGE);
        return ApiResponse.ok(categoryRepository.findAllByOrderByDomainAscSortOrderAscNameAsc().stream()
                .map(mapper::category).toList());
    }

    @PostMapping("/categories")
    @Transactional
    public ApiResponse<CategoryView> saveCategory(@Valid @RequestBody CategoryRequest request) {
        User actor = currentUser.require();
        rbacService.require(actor, Permission.MARKETPLACE_CONFIG_MANAGE);
        ConsultationCategory category = categoryRepository.findBySlug(request.getSlug())
                .orElseGet(() -> ConsultationCategory.builder().slug(request.getSlug()).build());
        category.setName(request.getName().trim());
        category.setDomain(request.getDomain());
        category.setDescription(request.getDescription());
        category.setRecommendedTypes(MarketplaceMapper.join(request.getRecommendedTypes()));
        category.setStartingFee(request.getStartingFee());
        category.setActive(request.isActive());
        category.setSortOrder(request.getSortOrder());
        ConsultationCategory saved = categoryRepository.save(category);
        auditService.record("CATEGORY_SAVED", "ConsultationCategory", saved.getId(), null,
                Map.of("slug", saved.getSlug()));
        return ApiResponse.ok(mapper.category(saved));
    }

    @GetMapping("/pricing-rules")
    public ApiResponse<List<PricingRuleView>> pricing() {
        rbacService.require(currentUser.require(), Permission.MARKETPLACE_CONFIG_MANAGE);
        return ApiResponse.ok(pricingService.all().stream().map(mapper::pricingRule).toList());
    }

    @PutMapping("/pricing-rules/{code}")
    public ApiResponse<PricingRuleView> updatePricing(@PathVariable String code,
                                                      @Valid @RequestBody PricingRuleUpdate request) {
        User actor = currentUser.require();
        rbacService.require(actor, Permission.MARKETPLACE_CONFIG_MANAGE);
        return ApiResponse.ok(mapper.pricingRule(pricingService.update(code, request.getValue(), actor)));
    }

    @GetMapping("/coupons")
    public ApiResponse<List<CouponView>> coupons() {
        rbacService.require(currentUser.require(), Permission.MARKETPLACE_CONFIG_MANAGE);
        return ApiResponse.ok(couponRepository.findAllByOrderByCodeAsc().stream().map(mapper::coupon).toList());
    }

    @PostMapping("/coupons")
    @Transactional
    public ApiResponse<CouponView> saveCoupon(@Valid @RequestBody CouponRequest request) {
        User actor = currentUser.require();
        rbacService.require(actor, Permission.MARKETPLACE_CONFIG_MANAGE);
        if (request.getPercentOff() == null && request.getAmountOff() == null) {
            throw ApiException.badRequest("COUPON_VALUE_REQUIRED", "Provide either percentOff or amountOff");
        }
        Coupon coupon = couponRepository.findByCodeIgnoreCase(request.getCode())
                .orElseGet(() -> Coupon.builder().code(request.getCode()).build());
        coupon.setDescription(request.getDescription());
        coupon.setPercentOff(request.getPercentOff());
        coupon.setAmountOff(request.getAmountOff());
        coupon.setValidFrom(request.getValidFrom());
        coupon.setValidTo(request.getValidTo());
        coupon.setMaxRedemptions(request.getMaxRedemptions());
        coupon.setActive(request.isActive());
        Coupon saved = couponRepository.save(coupon);
        auditService.record("COUPON_SAVED", "Coupon", saved.getId(), null, Map.of("code", saved.getCode()));
        return ApiResponse.ok(mapper.coupon(saved));
    }

    /* ---------- bookings, payouts, reviews ---------- */

    @GetMapping("/bookings")
    public ApiResponse<PageResponse<BookingView>> bookings(
            @RequestParam(required = false) ConsultationBooking.Status status,
            @RequestParam(required = false) String consultantId,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {
        User actor = currentUser.require();
        return ApiResponse.ok(PageResponse.of(
                bookingService.adminList(actor, status, consultantId, PageRequest.of(page, size)),
                b -> mapper.booking(b, actor)));
    }

    @GetMapping("/bookings/{id}")
    public ApiResponse<BookingView> booking(@PathVariable String id) {
        User actor = currentUser.require();
        return ApiResponse.ok(mapper.booking(bookingService.view(actor, id), actor));
    }

    @GetMapping("/bookings/{id}/messages")
    @Operation(summary = "Read a consultation's conversation for complaint handling (audited)")
    public ApiResponse<List<MessageView>> bookingMessages(@PathVariable String id) {
        User actor = currentUser.require();
        rbacService.require(actor, Permission.BOOKING_MANAGE);
        auditService.record("BOOKING_MESSAGES_VIEWED", "ConsultationBooking", id, null, null);
        return ApiResponse.ok(bookingService.messages(actor, id).stream().map(m -> mapper.message(m, actor)).toList());
    }

    @PostMapping("/bookings/{id}/cancel")
    public ApiResponse<BookingView> cancelBooking(@PathVariable String id,
                                                  @RequestBody(required = false) CancelRequest request) {
        User actor = currentUser.require();
        return ApiResponse.ok(mapper.booking(bookingService.cancel(actor, id, request), actor));
    }

    @PostMapping("/bookings/{id}/refund")
    public ApiResponse<BookingView> refund(@PathVariable String id, @RequestBody(required = false) RefundRequest req) {
        User actor = currentUser.require();
        return ApiResponse.ok(mapper.booking(bookingService.refund(actor, id, req), actor));
    }

    @GetMapping("/payouts")
    public ApiResponse<PageResponse<PayoutView>> payouts(@RequestParam(required = false) String consultantId,
                                                         @RequestParam(defaultValue = "0") int page,
                                                         @RequestParam(defaultValue = "20") int size) {
        return ApiResponse.ok(PageResponse.of(
                payoutService.all(currentUser.require(), consultantId, PageRequest.of(page, size)),
                mapper::payout));
    }

    @PostMapping("/consultants/{id}/payouts")
    @Operation(summary = "Generate a payout for all completed, unpaid consultations of the consultant")
    public ApiResponse<PayoutView> generatePayout(@PathVariable String id) {
        return ApiResponse.ok(mapper.payout(payoutService.generate(currentUser.require(), id)));
    }

    @PostMapping("/payouts/{id}/settle")
    public ApiResponse<PayoutView> settle(@PathVariable String id, @Valid @RequestBody PayoutSettleRequest request) {
        return ApiResponse.ok(mapper.payout(payoutService.settle(currentUser.require(), id,
                request.getPaymentReference())));
    }

    @GetMapping("/reviews")
    public ApiResponse<PageResponse<ReviewView>> reviews(@RequestParam(defaultValue = "0") int page,
                                                         @RequestParam(defaultValue = "20") int size) {
        rbacService.require(currentUser.require(), Permission.REVIEW_MODERATE);
        return ApiResponse.ok(PageResponse.of(reviewRepository.findAllByOrderByCreatedAtDesc(PageRequest.of(page, size)),
                mapper::review));
    }

    @PostMapping("/reviews/{id}/moderate")
    public ApiResponse<ReviewView> moderate(@PathVariable String id, @Valid @RequestBody ReviewModerationRequest req) {
        return ApiResponse.ok(mapper.review(bookingService.moderate(currentUser.require(), id, req)));
    }
}
