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
 * GST on one kind of goods or service (HSN / SAC) for a period. A rate change (e.g. GST 2.0 on 22 Sep 2025)
 * is a new row with a later {@code effectiveFrom}; the older row keeps applying to invoices dated before it.
 */
@Entity
@Table(name = "gst_rate_categories",
        uniqueConstraints = @UniqueConstraint(name = "uk_gst_rate_code_from", columnNames = {"code", "effectiveFrom"}),
        indexes = @Index(name = "idx_gst_rate_business", columnList = "businessType"))
@Data
@Builder(toBuilder = true)
@NoArgsConstructor
@AllArgsConstructor
public class GstRateCategory {
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private String id;

    /** Stable key used by forms and invoices, e.g. RESTAURANT_DINE_IN. */
    @Column(nullable = false, length = 40)
    private String code;

    /** Type of business the item belongs to, e.g. TRADER, RESTAURANT, IT_SERVICES. */
    @Column(nullable = false, length = 30)
    private String businessType;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 8)
    private Kind kind;

    /** HSN chapter/heading for goods or SAC for services, e.g. 2106 or 9963. */
    @Column(length = 20)
    private String hsnSac;

    @Column(nullable = false)
    private String name;

    @Column(length = 1000)
    private String hint;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 10)
    private Treatment treatment;

    /** Total GST (CGST + SGST, or IGST) as a fraction, e.g. 0.1800. */
    @Column(nullable = false, precision = 6, scale = 4)
    private BigDecimal rate;

    /** Compensation cess as a fraction of the taxable value, if any. */
    @Column(precision = 6, scale = 4)
    private BigDecimal cessRate;

    /** Tax is paid by the buyer (reverse charge, section 9(3)/9(4)) rather than the seller. */
    @Builder.Default
    private boolean reverseCharge = false;

    /** Whether the seller may take credit for GST paid on purchases when supplying at this rate. */
    @Builder.Default
    private boolean itcAllowed = true;

    @Column(nullable = false)
    private LocalDate effectiveFrom;

    private LocalDate effectiveTo;

    @Builder.Default
    private boolean active = true;

    private int sortOrder;

    private String updatedBy;

    private LocalDateTime updatedAt;

    public enum Kind { GOODS, SERVICE }

    /** TAXABLE uses {@link #rate}; NIL and EXEMPT carry no tax; ZERO_RATED is exports / SEZ supplies. */
    public enum Treatment { TAXABLE, NIL, EXEMPT, ZERO_RATED }

    public boolean appliesOn(LocalDate date) {
        return active && !date.isBefore(effectiveFrom) && (effectiveTo == null || !date.isAfter(effectiveTo));
    }
}
