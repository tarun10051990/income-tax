package com.incometax.gstrates.dto;

import com.incometax.gstrates.entity.GstRateCategory;
import com.incometax.gstrates.entity.GstRule;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.PositiveOrZero;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;

public final class GstRateDtos {
    private GstRateDtos() {
    }

    public record RateBook(LocalDate asOf, List<GstRateCategory> categories, List<GstRule> rules) {
    }

    /** Work out GST on one line of a bill. */
    public record CalculateRequest(
            @NotBlank String categoryCode,
            @NotNull @PositiveOrZero BigDecimal taxableValue,
            LocalDate invoiceDate,
            Boolean interState) {
    }

    public record Calculation(
            String categoryCode,
            String categoryName,
            String hsnSac,
            GstRateCategory.Treatment treatment,
            LocalDate invoiceDate,
            boolean interState,
            BigDecimal rate,
            BigDecimal cessRate,
            BigDecimal taxableValue,
            BigDecimal cgst,
            BigDecimal sgst,
            BigDecimal igst,
            BigDecimal cess,
            BigDecimal totalTax,
            BigDecimal invoiceTotal,
            boolean reverseCharge,
            boolean itcAllowed) {
    }

    public record CategoryUpdate(
            @NotBlank String name,
            String hint,
            String hsnSac,
            @NotNull GstRateCategory.Treatment treatment,
            @NotNull @PositiveOrZero BigDecimal rate,
            @PositiveOrZero BigDecimal cessRate,
            boolean reverseCharge,
            boolean itcAllowed,
            @NotNull LocalDate effectiveFrom,
            LocalDate effectiveTo,
            boolean active) {
    }

    public record RuleUpdate(
            @NotBlank String name,
            String hint,
            String section,
            @PositiveOrZero BigDecimal rate,
            @PositiveOrZero BigDecimal amount,
            @PositiveOrZero BigDecimal specialStateAmount,
            @PositiveOrZero BigDecimal maxAmount,
            GstRule.Itc itc,
            @NotNull LocalDate effectiveFrom,
            LocalDate effectiveTo,
            boolean active) {
    }
}
