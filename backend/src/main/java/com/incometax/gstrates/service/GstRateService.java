package com.incometax.gstrates.service;

import com.incometax.entity.User;
import com.incometax.exception.ApiException;
import com.incometax.gstrates.dto.GstRateDtos;
import com.incometax.gstrates.entity.GstRateCategory;
import com.incometax.gstrates.entity.GstRule;
import com.incometax.gstrates.repository.GstRateCategoryRepository;
import com.incometax.gstrates.repository.GstRuleRepository;
import com.incometax.service.AuditService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.Comparator;
import java.util.List;
import java.util.Map;
import java.util.Set;

/** Reads GST rates and rules from the database and works out the GST on a bill line. */
@Service
@RequiredArgsConstructor
public class GstRateService {

    private static final Set<User.Role> EDITORS = Set.of(User.Role.SUPER_ADMIN, User.Role.ADMIN);
    private static final BigDecimal TWO = BigDecimal.valueOf(2);

    private final GstRateCategoryRepository categoryRepository;
    private final GstRuleRepository ruleRepository;
    private final AuditService auditService;

    /** Rates and rules in force on {@code asOf}; with {@code asOf == null}, every row including past ones. */
    @Transactional(readOnly = true)
    public GstRateDtos.RateBook rateBook(LocalDate asOf) {
        List<GstRateCategory> categories = categoryRepository.findAllByOrderBySortOrderAscEffectiveFromDesc();
        List<GstRule> rules = ruleRepository.findAllByOrderByKindAscSortOrderAscEffectiveFromDesc();
        if (asOf != null) {
            categories = categories.stream().filter(c -> c.appliesOn(asOf)).toList();
            rules = rules.stream().filter(r -> r.appliesOn(asOf)).toList();
        }
        return new GstRateDtos.RateBook(asOf, categories, rules);
    }

    /** The rate row for {@code code} that applies on {@code date}. */
    @Transactional(readOnly = true)
    public GstRateCategory resolve(String code, LocalDate date) {
        return categoryRepository.findByCodeOrderByEffectiveFromDesc(code).stream()
                .filter(c -> c.appliesOn(date))
                .max(Comparator.comparing(GstRateCategory::getEffectiveFrom))
                .orElseThrow(() -> ApiException.badRequest("UNKNOWN_GST_CATEGORY",
                        "No GST rate for '" + code + "' on " + date));
    }

    @Transactional(readOnly = true)
    public GstRateDtos.Calculation calculate(GstRateDtos.CalculateRequest request) {
        LocalDate date = request.invoiceDate() == null ? LocalDate.now() : request.invoiceDate();
        return calculate(resolve(request.categoryCode(), date), request.taxableValue(), date,
                Boolean.TRUE.equals(request.interState()));
    }

    /**
     * Same-state sale: the rate is split equally into CGST and SGST (each rounded to the paisa).
     * Other-state sale, import or SEZ: the full rate is IGST. Cess is added on top. Nil, exempt and zero-rated
     * items carry no tax.
     */
    public static GstRateDtos.Calculation calculate(GstRateCategory category, BigDecimal taxableValue,
                                                    LocalDate date, boolean interState) {
        BigDecimal value = money(taxableValue);
        boolean taxable = category.getTreatment() == GstRateCategory.Treatment.TAXABLE;
        BigDecimal rate = taxable ? category.getRate() : BigDecimal.ZERO;
        BigDecimal cessRate = taxable && category.getCessRate() != null ? category.getCessRate() : BigDecimal.ZERO;
        BigDecimal cgst = BigDecimal.ZERO.setScale(2);
        BigDecimal sgst = BigDecimal.ZERO.setScale(2);
        BigDecimal igst = BigDecimal.ZERO.setScale(2);
        if (interState) {
            igst = money(value.multiply(rate));
        } else {
            cgst = money(value.multiply(rate).divide(TWO, 6, RoundingMode.HALF_UP));
            sgst = cgst;
        }
        BigDecimal cess = money(value.multiply(cessRate));
        BigDecimal total = cgst.add(sgst).add(igst).add(cess);
        return new GstRateDtos.Calculation(category.getCode(), category.getName(), category.getHsnSac(),
                category.getTreatment(), date, interState, rate, cessRate, value, cgst, sgst, igst, cess, total,
                value.add(total), category.isReverseCharge(), category.isItcAllowed());
    }

    @Transactional
    public GstRateCategory updateCategory(String id, GstRateDtos.CategoryUpdate update, User actor) {
        requireEditor(actor);
        GstRateCategory category = categoryRepository.findById(id)
                .orElseThrow(() -> ApiException.notFound("GST rate", id));
        checkDates(update.effectiveFrom(), update.effectiveTo());
        Map<String, Object> before = snapshot(category);
        category.setName(update.name().trim());
        category.setHint(blankToNull(update.hint()));
        category.setHsnSac(blankToNull(update.hsnSac()));
        category.setTreatment(update.treatment());
        category.setRate(update.treatment() == GstRateCategory.Treatment.TAXABLE
                ? fraction(update.rate()) : BigDecimal.ZERO);
        category.setCessRate(fraction(update.cessRate()));
        category.setReverseCharge(update.reverseCharge());
        category.setItcAllowed(update.itcAllowed());
        category.setEffectiveFrom(update.effectiveFrom());
        category.setEffectiveTo(update.effectiveTo());
        category.setActive(update.active());
        category.setUpdatedBy(actor.getEmail());
        category.setUpdatedAt(LocalDateTime.now());
        GstRateCategory saved = categoryRepository.save(category);
        auditService.record("GST_RATE_UPDATED", "GstRateCategory", id, before, snapshot(saved));
        return saved;
    }

    @Transactional
    public GstRule updateRule(String id, GstRateDtos.RuleUpdate update, User actor) {
        requireEditor(actor);
        GstRule rule = ruleRepository.findById(id).orElseThrow(() -> ApiException.notFound("GST rule", id));
        checkDates(update.effectiveFrom(), update.effectiveTo());
        Map<String, Object> before = snapshot(rule);
        rule.setName(update.name().trim());
        rule.setHint(blankToNull(update.hint()));
        rule.setSection(blankToNull(update.section()));
        rule.setRate(fraction(update.rate()));
        rule.setAmount(update.amount());
        rule.setSpecialStateAmount(update.specialStateAmount());
        rule.setMaxAmount(update.maxAmount());
        rule.setItc(update.itc());
        rule.setEffectiveFrom(update.effectiveFrom());
        rule.setEffectiveTo(update.effectiveTo());
        rule.setActive(update.active());
        rule.setUpdatedBy(actor.getEmail());
        rule.setUpdatedAt(LocalDateTime.now());
        GstRule saved = ruleRepository.save(rule);
        auditService.record("GST_RULE_UPDATED", "GstRule", id, before, snapshot(saved));
        return saved;
    }

    private static Map<String, Object> snapshot(GstRateCategory c) {
        return orderedMap("code", c.getCode(), "name", c.getName(), "hsnSac", c.getHsnSac(),
                "treatment", c.getTreatment(), "rate", c.getRate(), "cessRate", c.getCessRate(),
                "reverseCharge", c.isReverseCharge(), "itcAllowed", c.isItcAllowed(),
                "effectiveFrom", c.getEffectiveFrom(), "effectiveTo", c.getEffectiveTo(), "active", c.isActive());
    }

    private static Map<String, Object> snapshot(GstRule r) {
        return orderedMap("code", r.getCode(), "name", r.getName(), "section", r.getSection(),
                "rate", r.getRate(), "amount", r.getAmount(), "specialStateAmount", r.getSpecialStateAmount(),
                "maxAmount", r.getMaxAmount(), "itc", r.getItc(), "effectiveFrom", r.getEffectiveFrom(),
                "effectiveTo", r.getEffectiveTo(), "active", r.isActive());
    }

    private static Map<String, Object> orderedMap(Object... pairs) {
        Map<String, Object> map = new java.util.LinkedHashMap<>();
        for (int i = 0; i < pairs.length; i += 2) {
            map.put((String) pairs[i], pairs[i + 1] == null ? null : String.valueOf(pairs[i + 1]));
        }
        return map;
    }

    private static void checkDates(LocalDate from, LocalDate to) {
        if (to != null && to.isBefore(from)) {
            throw ApiException.badRequest("INVALID_DATES", "'Valid till' must be on or after 'Valid from'");
        }
    }

    private static void requireEditor(User actor) {
        if (actor == null || !EDITORS.contains(actor.getRole())) {
            throw ApiException.forbidden("Only an admin can change GST rates");
        }
    }

    /** Accepts 18 or 0.18 for 18%. */
    private static BigDecimal fraction(BigDecimal value) {
        if (value == null) {
            return null;
        }
        return value.compareTo(BigDecimal.ONE) > 0 ? value.movePointLeft(2) : value;
    }

    private static BigDecimal money(BigDecimal value) {
        return (value == null ? BigDecimal.ZERO : value).setScale(2, RoundingMode.HALF_UP);
    }

    private static String blankToNull(String value) {
        return value == null || value.isBlank() ? null : value.trim();
    }
}
