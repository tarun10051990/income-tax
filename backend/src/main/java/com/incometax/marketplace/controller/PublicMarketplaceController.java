package com.incometax.marketplace.controller;

import com.incometax.common.ApiResponse;
import com.incometax.common.PageResponse;
import com.incometax.marketplace.dto.MarketplaceRequests.QuoteRequest;
import com.incometax.marketplace.dto.MarketplaceViews.*;
import com.incometax.marketplace.entity.ConsultantProfile;
import com.incometax.marketplace.entity.ConsultantReview;
import com.incometax.marketplace.entity.ConsultationMode;
import com.incometax.marketplace.repository.ConsultantReviewRepository;
import com.incometax.marketplace.repository.ConsultationCategoryRepository;
import com.incometax.marketplace.repository.ProfessionalTypeRepository;
import com.incometax.marketplace.service.*;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.Map;

/** Unauthenticated marketplace browsing: Find a CA / Lawyer / Consultant. */
@RestController
@RequestMapping("/api/public/marketplace")
@RequiredArgsConstructor
@Tag(name = "Marketplace (public)")
public class PublicMarketplaceController {

    private final ProfessionalTypeRepository typeRepository;
    private final ConsultationCategoryRepository categoryRepository;
    private final ConsultantReviewRepository reviewRepository;
    private final ConsultantProfileService profileService;
    private final BookingService bookingService;
    private final PricingService pricingService;
    private final SlotService slotService;
    private final MarketplaceMapper mapper;

    @GetMapping("/professional-types")
    public ApiResponse<List<ProfessionalTypeView>> types() {
        return ApiResponse.ok(typeRepository.findByActiveTrueOrderBySortOrderAscLabelAsc().stream()
                .map(mapper::type).toList());
    }

    @GetMapping("/categories")
    public ApiResponse<List<CategoryView>> categories() {
        return ApiResponse.ok(categoryRepository.findByActiveTrueOrderByDomainAscSortOrderAscNameAsc().stream()
                .map(mapper::category).toList());
    }

    @GetMapping("/pricing")
    @Operation(summary = "Public pricing parameters shown on the marketplace (minimum fee, GST, platform fee)")
    public ApiResponse<Map<String, BigDecimal>> pricing() {
        return ApiResponse.ok(Map.of(
                "minimumFee", pricingService.rule(com.incometax.marketplace.entity.PricingRule.MIN_CONSULTATION_FEE),
                "platformFee", pricingService.rule(com.incometax.marketplace.entity.PricingRule.PLATFORM_FEE_FIXED),
                "taxPercent", pricingService.rule(com.incometax.marketplace.entity.PricingRule.TAX_ON_FEES_PERCENT),
                "urgentSurchargePercent",
                pricingService.rule(com.incometax.marketplace.entity.PricingRule.URGENT_SURCHARGE_PERCENT),
                "fullRefundHours",
                pricingService.rule(com.incometax.marketplace.entity.PricingRule.CANCELLATION_FULL_REFUND_HOURS)));
    }

    @GetMapping("/consultants")
    @Operation(summary = "Search approved, active, verified professionals")
    public ApiResponse<PageResponse<ConsultantPublicView>> search(
            @RequestParam(required = false) String type,
            @RequestParam(required = false) String category,
            @RequestParam(required = false) String specialization,
            @RequestParam(required = false) String city,
            @RequestParam(required = false) String state,
            @RequestParam(required = false) String language,
            @RequestParam(required = false) Integer minExperience,
            @RequestParam(required = false) BigDecimal minRating,
            @RequestParam(required = false) BigDecimal maxFee,
            @RequestParam(required = false) ConsultationMode mode,
            @RequestParam(required = false) String q,
            @RequestParam(defaultValue = "rating") String sort,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "12") int size) {
        Sort order = switch (sort) {
            case "fee_asc" -> Sort.by("baseFee").ascending();
            case "fee_desc" -> Sort.by("baseFee").descending();
            case "experience" -> Sort.by("experienceYears").descending();
            default -> Sort.by("averageRating").descending().and(Sort.by("reviewCount").descending());
        };
        var filter = new ConsultantProfileService.SearchFilter(type, category, specialization, city, state, language,
                minExperience, minRating, maxFee, mode, q);
        var result = profileService.searchPublic(filter, PageRequest.of(page, Math.min(size, 50), order));
        return ApiResponse.ok(PageResponse.of(result, p -> mapper.publicView(p, null, false)));
    }

    @GetMapping("/consultants/{id}")
    public ApiResponse<ConsultantPublicView> profile(@PathVariable String id) {
        ConsultantProfile profile = profileService.requirePublic(id);
        return ApiResponse.ok(mapper.publicView(profile, slotService.nextAvailable(profile), true));
    }

    @GetMapping("/consultants/{id}/slots")
    @Operation(summary = "Free slots for the next N days (max 31) for the given duration")
    public ApiResponse<List<DaySlots>> slots(@PathVariable String id,
                                             @RequestParam(required = false)
                                             @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate from,
                                             @RequestParam(defaultValue = "7") int days,
                                             @RequestParam(required = false) Integer duration) {
        ConsultantProfile profile = profileService.requirePublic(id);
        int minutes = duration == null ? profile.getSlotDurationMinutes() : Math.max(15, Math.min(duration, 240));
        return ApiResponse.ok(slotService.slots(profile, from == null ? LocalDate.now() : from, days, minutes));
    }

    @GetMapping("/consultants/{id}/reviews")
    public ApiResponse<PageResponse<ReviewView>> reviews(@PathVariable String id,
                                                         @RequestParam(defaultValue = "0") int page,
                                                         @RequestParam(defaultValue = "10") int size) {
        profileService.requirePublic(id);
        return ApiResponse.ok(PageResponse.of(reviewRepository.findByConsultantIdAndModerationOrderByCreatedAtDesc(
                id, ConsultantReview.Moderation.PUBLISHED, PageRequest.of(page, Math.min(size, 50))), mapper::review));
    }

    @PostMapping("/quote")
    @Operation(summary = "Price breakdown for a consultant/service/mode before booking")
    public ApiResponse<QuoteView> quote(@Valid @RequestBody QuoteRequest request) {
        return ApiResponse.ok(pricingService.view(bookingService.quote(request)));
    }
}
