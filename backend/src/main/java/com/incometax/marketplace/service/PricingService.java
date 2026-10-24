package com.incometax.marketplace.service;

import com.incometax.entity.User;
import com.incometax.exception.ApiException;
import com.incometax.marketplace.dto.MarketplaceViews.QuoteView;
import com.incometax.marketplace.entity.ConsultantProfile;
import com.incometax.marketplace.entity.ConsultantService;
import com.incometax.marketplace.entity.ConsultationMode;
import com.incometax.marketplace.entity.Coupon;
import com.incometax.marketplace.entity.PricingRule;
import com.incometax.marketplace.repository.CouponRepository;
import com.incometax.marketplace.repository.PricingRuleRepository;
import com.incometax.service.AuditService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;
import java.util.Optional;

/**
 * Consultation pricing. Every number comes from {@link PricingRule} rows (admin editable) or the
 * consultant's own fee schedule; nothing is hard-coded here beyond the seed defaults.
 */
@Service
@RequiredArgsConstructor
public class PricingService {

    private static final BigDecimal HUNDRED = new BigDecimal("100");

    private final PricingRuleRepository ruleRepository;
    private final CouponRepository couponRepository;
    private final AuditService auditService;

    public record Breakdown(BigDecimal consultationFee, BigDecimal urgentSurcharge, BigDecimal modeSurcharge,
                            BigDecimal platformFee, BigDecimal taxAmount, BigDecimal discount, BigDecimal total,
                            BigDecimal commission, BigDecimal consultantEarning, Coupon coupon, int durationMinutes) {
    }

    public BigDecimal rule(String code) {
        return ruleRepository.findByCode(code).map(PricingRule::getValue).orElse(BigDecimal.ZERO);
    }

    public List<PricingRule> all() {
        return ruleRepository.findAllByOrderByCodeAsc();
    }

    @Transactional
    public PricingRule update(String code, BigDecimal value, User actor) {
        PricingRule rule = ruleRepository.findByCode(code)
                .orElseThrow(() -> ApiException.notFound("PricingRule", code));
        if (rule.getValueType() == PricingRule.ValueType.PERCENT && value.compareTo(HUNDRED) > 0) {
            throw ApiException.badRequest("INVALID_PERCENT", "Percentages cannot exceed 100");
        }
        BigDecimal previous = rule.getValue();
        rule.setValue(value);
        rule.setUpdatedAt(LocalDateTime.now());
        rule.setUpdatedBy(actor.getEmail());
        auditService.record("PRICING_RULE_UPDATED", "PricingRule", rule.getId(),
                Map.of("value", previous.toPlainString()), Map.of("value", value.toPlainString()));
        return ruleRepository.save(rule);
    }

    /** Fee charged for a consultant/service pair, floored by the platform minimum. */
    public BigDecimal baseFee(ConsultantProfile consultant, ConsultantService service) {
        BigDecimal fee = service != null ? service.getFee() : consultant.getBaseFee();
        BigDecimal minimum = rule(PricingRule.MIN_CONSULTATION_FEE);
        return fee.max(minimum).setScale(2, RoundingMode.HALF_UP);
    }

    public Breakdown quote(ConsultantProfile consultant, ConsultantService service, ConsultationMode mode,
                           boolean urgent, String couponCode, LocalDate onDate) {
        BigDecimal base = baseFee(consultant, service);
        BigDecimal urgentSurcharge = urgent ? percentOf(base, rule(PricingRule.URGENT_SURCHARGE_PERCENT)) : zero();
        BigDecimal modeSurcharge = rule(modeRuleCode(mode)).setScale(2, RoundingMode.HALF_UP);
        BigDecimal consultationFee = base.add(urgentSurcharge).add(modeSurcharge);

        Coupon coupon = null;
        BigDecimal discount = zero();
        if (couponCode != null && !couponCode.isBlank()) {
            coupon = couponRepository.findByCodeIgnoreCase(couponCode.trim())
                    .filter(c -> c.isUsableOn(onDate))
                    .orElseThrow(() -> ApiException.badRequest("INVALID_COUPON",
                            "That coupon code is not valid"));
            discount = coupon.getAmountOff() != null
                    ? coupon.getAmountOff()
                    : percentOf(consultationFee, Optional.ofNullable(coupon.getPercentOff()).orElse(BigDecimal.ZERO));
            discount = discount.min(consultationFee).setScale(2, RoundingMode.HALF_UP);
        }

        BigDecimal platformFee = rule(PricingRule.PLATFORM_FEE_FIXED).setScale(2, RoundingMode.HALF_UP);
        BigDecimal taxable = consultationFee.subtract(discount).add(platformFee);
        BigDecimal tax = percentOf(taxable, rule(PricingRule.TAX_ON_FEES_PERCENT));
        BigDecimal total = taxable.add(tax);

        BigDecimal commission = percentOf(consultationFee.subtract(discount), rule(PricingRule.PLATFORM_COMMISSION_PERCENT));
        BigDecimal earning = consultationFee.subtract(discount).subtract(commission).max(zero());

        int duration = service != null ? service.getDurationMinutes() : consultant.getSlotDurationMinutes();
        return new Breakdown(consultationFee, urgentSurcharge, modeSurcharge, platformFee, tax, discount, total,
                commission, earning, coupon, duration);
    }

    public QuoteView view(Breakdown b) {
        return new QuoteView(b.consultationFee(), b.urgentSurcharge(), b.modeSurcharge(), b.platformFee(),
                b.taxAmount(), b.discount(), b.total(), b.coupon() == null ? null : b.coupon().getCode(),
                b.durationMinutes(), false);
    }

    static String modeRuleCode(ConsultationMode mode) {
        return switch (mode) {
            case VIDEO -> PricingRule.MODE_SURCHARGE_VIDEO;
            case PHONE -> PricingRule.MODE_SURCHARGE_PHONE;
            case CHAT -> PricingRule.MODE_SURCHARGE_CHAT;
            case IN_PERSON -> PricingRule.MODE_SURCHARGE_IN_PERSON;
        };
    }

    static BigDecimal percentOf(BigDecimal amount, BigDecimal percent) {
        return amount.multiply(percent).divide(HUNDRED, 2, RoundingMode.HALF_UP);
    }

    private static BigDecimal zero() {
        return BigDecimal.ZERO.setScale(2, RoundingMode.HALF_UP);
    }
}
