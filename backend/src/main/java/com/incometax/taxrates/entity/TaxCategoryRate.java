package com.incometax.taxrates.entity;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.Arrays;

/**
 * How one kind of income (salary, intraday trading, equity mutual fund gains, crypto ...) or one
 * deduction (80C, 80D ...) is treated in a financial year. The tax engine reads only these rows.
 */
@Entity
@Table(name = "tax_category_rates",
        uniqueConstraints = @UniqueConstraint(name = "uk_tax_category_fy_code", columnNames = {"financialYear", "code"}))
@Data
@Builder(toBuilder = true)
@NoArgsConstructor
@AllArgsConstructor
public class TaxCategoryRate {
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private String id;

    @Column(nullable = false, length = 9)
    private String financialYear;

    /** Stable key used by the forms, e.g. EQUITY_STCG_111A. */
    @Column(nullable = false, length = 40)
    private String code;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 12)
    private Kind kind;

    /** UI grouping, e.g. SHARES_FUNDS, TRADING, PROPERTY_GOLD. */
    @Column(nullable = false, length = 30)
    private String groupCode;

    /** SALARY, HOUSE_PROPERTY, BUSINESS, CAPITAL_GAINS, OTHER_SOURCES or DEDUCTION. */
    @Column(nullable = false, length = 20)
    private String incomeHead;

    /** Income-tax Act section, e.g. 111A, 80C. */
    @Column(length = 30)
    private String section;

    @Column(nullable = false)
    private String name;

    @Column(length = 1000)
    private String hint;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 15)
    private Treatment treatment;

    /** Flat rate for SPECIAL_RATE income, e.g. 0.2000. */
    @Column(precision = 6, scale = 4)
    private BigDecimal rate;

    /** Tax-free amount, shared across rows with the same exemptionGroup (e.g. ₹1.25 lakh for 112A). */
    @Column(precision = 15, scale = 2)
    private BigDecimal exemptionLimit;

    @Column(length = 20)
    private String exemptionGroup;

    /** Share of the income allowed as a flat deduction, e.g. 0.30 of rent for repairs (section 24(a)). */
    @Column(precision = 6, scale = 4)
    private BigDecimal standardDeductionRate;

    /** Unused basic exemption can be set off against this special-rate income (111A, 112, 112A). */
    @Builder.Default
    private boolean basicExemptionAdjustable = false;

    /** Regimes in which the section 87A rebate may be set off against tax on this income, e.g. "OLD,NEW". */
    @Column(length = 10)
    private String rebateRegimes;

    /** Highest surcharge rate that applies to tax on this income (15% for 111A / 112 / 112A). */
    @Column(precision = 6, scale = 4)
    private BigDecimal surchargeCap;

    /** Deduction ceiling; null = no ceiling. */
    @Column(precision = 15, scale = 2)
    private BigDecimal deductionLimit;

    /** Ceiling for taxpayers aged 60+, when different. */
    @Column(precision = 15, scale = 2)
    private BigDecimal seniorDeductionLimit;

    /** Regimes in which the income is taxed / the deduction is allowed, e.g. "OLD" or "OLD,NEW". */
    @Column(nullable = false, length = 10)
    @Builder.Default
    private String allowedRegimes = "OLD,NEW";

    /** Age groups this row applies to; null = everyone. */
    @Column(length = 40)
    private String ageGroups;

    /** Deduction filled automatically from these income codes (e.g. 80TTA from savings interest). */
    @Column(length = 200)
    private String autoFromCodes;

    @Builder.Default
    private int sortOrder = 0;

    @Builder.Default
    private boolean active = true;

    private String updatedBy;

    @Builder.Default
    private LocalDateTime updatedAt = LocalDateTime.now();

    public boolean allowedIn(String regime) {
        return contains(allowedRegimes, regime);
    }

    public boolean rebateAllowedIn(String regime) {
        return contains(rebateRegimes, regime);
    }

    public boolean appliesToAge(TaxSlab.AgeGroup ageGroup) {
        return ageGroups == null || ageGroups.isBlank() || contains(ageGroups, ageGroup.name());
    }

    private static boolean contains(String csv, String value) {
        return csv != null && Arrays.stream(csv.split(",")).map(String::trim).anyMatch(value::equalsIgnoreCase);
    }

    public enum Kind { INCOME, DEDUCTION }

    public enum Treatment { SLAB, SPECIAL_RATE, EXEMPT }
}
