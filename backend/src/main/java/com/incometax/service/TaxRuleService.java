package com.incometax.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.incometax.entity.TaxRule;
import com.incometax.entity.TaxType;
import com.incometax.exception.ApiException;
import com.incometax.repository.TaxRuleRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

/**
 * Reads effective-dated tax configuration. No slab, limit, rate or deadline is hard-coded in
 * business logic: everything is resolved through this service so a regulation change is a data
 * change.
 */
@Service
@RequiredArgsConstructor
public class TaxRuleService {

    public static final String IT_SLABS_OLD = "income_tax.slabs.OLD";
    public static final String IT_SLABS_NEW = "income_tax.slabs.NEW";
    public static final String IT_PARAMETERS = "income_tax.parameters";
    public static final String IT_DEDUCTION_LIMITS = "income_tax.deduction_limits";
    public static final String IT_DEADLINES = "income_tax.deadlines";
    public static final String GST_INTEREST_AND_FEES = "gst.interest_and_fees";
    public static final String GST_DEADLINES = "gst.deadlines";
    public static final String WORKFLOW_PREFIX = "workflow.";

    private final TaxRuleRepository taxRuleRepository;
    private final ObjectMapper objectMapper;
    private final Map<String, JsonNode> cache = new ConcurrentHashMap<>();

    public JsonNode configuration(String ruleKey, LocalDate on) {
        return cache.computeIfAbsent(ruleKey + "@" + on, ignored -> parse(effectiveRule(ruleKey, on)));
    }

    public JsonNode configuration(String ruleKey) {
        return configuration(ruleKey, LocalDate.now());
    }

    public TaxRule effectiveRule(String ruleKey, LocalDate on) {
        List<TaxRule> rules = taxRuleRepository.findEffective(ruleKey, on);
        if (rules.isEmpty()) {
            throw new ApiException(org.springframework.http.HttpStatus.INTERNAL_SERVER_ERROR,
                    "TAX_RULE_MISSING", "No active tax rule configured for " + ruleKey + " on " + on);
        }
        return rules.get(0);
    }

    public List<Slab> slabs(String regime, LocalDate on) {
        String ruleKey = "NEW".equalsIgnoreCase(regime) ? IT_SLABS_NEW : IT_SLABS_OLD;
        JsonNode node = configuration(ruleKey, on);
        List<Slab> slabs = new ArrayList<>();
        for (JsonNode slab : node.path("slabs")) {
            slabs.add(new Slab(
                    slab.path("from").decimalValue(),
                    slab.hasNonNull("to") ? slab.path("to").decimalValue() : null,
                    slab.path("rate").decimalValue()));
        }
        if (slabs.isEmpty()) {
            throw new ApiException(org.springframework.http.HttpStatus.INTERNAL_SERVER_ERROR,
                    "TAX_RULE_INVALID", "Slab configuration for " + ruleKey + " is empty");
        }
        return slabs;
    }

    public BigDecimal parameter(String regime, String name, LocalDate on) {
        JsonNode node = configuration(IT_PARAMETERS, on).path(regime.toUpperCase());
        if (!node.hasNonNull(name)) {
            throw new ApiException(org.springframework.http.HttpStatus.INTERNAL_SERVER_ERROR,
                    "TAX_RULE_INVALID", "Parameter " + regime + "." + name + " is not configured");
        }
        return node.path(name).decimalValue();
    }

    public BigDecimal deductionLimit(String section, String regime, LocalDate on) {
        JsonNode limits = configuration(IT_DEDUCTION_LIMITS, on);
        JsonNode sectionNode = limits.path(section.toUpperCase());
        if (sectionNode.isMissingNode()) {
            return BigDecimal.ZERO;
        }
        if (!sectionNode.path("regimes").isMissingNode()
                && !sectionNode.path("regimes").toString().contains(regime.toUpperCase())) {
            return BigDecimal.ZERO;
        }
        return sectionNode.path("limit").decimalValue();
    }

    public JsonNode gstInterestAndFees(LocalDate on) {
        return configuration(GST_INTEREST_AND_FEES, on);
    }

    /**
     * Monthly GST due date: the configured day of the month following the return period, e.g.
     * period 2026-07 with dueDayOfMonth 11 resolves to 2026-08-11.
     */
    public LocalDate gstDueDate(String returnType, String period, LocalDate on) {
        JsonNode node = configuration(GST_DEADLINES, on).path(returnType).path("dueDayOfMonth");
        if (node.isMissingNode() || period == null || !period.matches("\\d{4}-\\d{2}")) {
            return null;
        }
        LocalDate periodStart = LocalDate.parse(period + "-01").plusMonths(1);
        int day = Math.min(node.asInt(), periodStart.lengthOfMonth());
        return periodStart.withDayOfMonth(day);
    }

    public LocalDate deadline(TaxType taxType, String returnTypeOrYear, LocalDate on) {
        JsonNode node = configuration(taxType == TaxType.GST ? GST_DEADLINES : IT_DEADLINES, on);
        JsonNode value = node.path(returnTypeOrYear);
        return value.isMissingNode() || value.isNull() ? null : LocalDate.parse(value.asText());
    }

    @Transactional
    public TaxRule save(TaxRule rule) {
        TaxRule saved = taxRuleRepository.save(rule);
        cache.clear();
        return saved;
    }

    public void evictCache() {
        cache.clear();
    }

    private JsonNode parse(TaxRule rule) {
        try {
            return objectMapper.readTree(rule.getConfiguration());
        } catch (Exception ex) {
            throw new ApiException(org.springframework.http.HttpStatus.INTERNAL_SERVER_ERROR,
                    "TAX_RULE_INVALID", "Configuration for " + rule.getRuleKey() + " is not valid JSON");
        }
    }

    /** An inclusive-from, inclusive-to income band; {@code to} is null for the top band. */
    public record Slab(BigDecimal from, BigDecimal to, BigDecimal rate) {
    }
}
