package com.incometax.gstrates.entity;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;

/**
 * Every other GST rule a business meets: schemes (regular / composition), options (QRMP, LUT), turnover limits,
 * levies and charges (CGST, IGST, cess, TDS, TCS, interest, late fee) and how GST applies to things a business
 * buys or invests in (machinery, vehicles, building, shares ...).
 */
@Entity
@Table(name = "gst_rules",
        uniqueConstraints = @UniqueConstraint(name = "uk_gst_rule_code_from", columnNames = {"code", "effectiveFrom"}),
        indexes = @Index(name = "idx_gst_rule_kind", columnList = "kind"))
@Data
@Builder(toBuilder = true)
@NoArgsConstructor
@AllArgsConstructor
public class GstRule {
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private String id;

    @Column(nullable = false, length = 40)
    private String code;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 12)
    private Kind kind;

    /** CGST Act / IGST Act section or notification, e.g. 10(2A), 17(5)(a). */
    @Column(length = 40)
    private String section;

    @Column(nullable = false)
    private String name;

    @Column(length = 1000)
    private String hint;

    /** Rate as a fraction (composition 0.01, TDS 0.02, interest 0.18 a year ...). */
    @Column(precision = 6, scale = 4)
    private BigDecimal rate;

    /** Rupee amount: turnover limit, fee per day, consignment value ... */
    @Column(precision = 15, scale = 2)
    private BigDecimal amount;

    /** Lower limit for special category states (North-East, hill states), where one exists. */
    @Column(precision = 15, scale = 2)
    private BigDecimal specialStateAmount;

    /** Highest fee / amount where the rule has a cap. */
    @Column(precision = 15, scale = 2)
    private BigDecimal maxAmount;

    /** For INVESTMENT rows: FULL, BLOCKED or CONDITIONAL input tax credit. */
    @Enumerated(EnumType.STRING)
    @Column(length = 16)
    private Itc itc;

    @Column(nullable = false)
    private LocalDate effectiveFrom;

    private LocalDate effectiveTo;

    @Builder.Default
    private boolean active = true;

    private int sortOrder;

    private String updatedBy;

    private LocalDateTime updatedAt;

    public enum Kind { SCHEME, OPTION, THRESHOLD, LEVY, INVESTMENT }

    public enum Itc { FULL, BLOCKED, CONDITIONAL, NOT_APPLICABLE }

    public boolean appliesOn(LocalDate date) {
        return active && !date.isBefore(effectiveFrom) && (effectiveTo == null || !date.isAfter(effectiveTo));
    }
}
