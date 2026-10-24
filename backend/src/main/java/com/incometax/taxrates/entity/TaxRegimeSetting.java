package com.incometax.taxrates.entity;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDateTime;

/** Per financial year and regime: standard deduction, section 87A rebate, cess and surcharge cap. */
@Entity
@Table(name = "tax_regime_settings",
        uniqueConstraints = @UniqueConstraint(name = "uk_regime_setting_fy", columnNames = {"financialYear", "regime"}))
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class TaxRegimeSetting {
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private String id;

    /** e.g. 2025-26 */
    @Column(nullable = false, length = 9)
    private String financialYear;

    @Column(nullable = false, length = 9)
    private String assessmentYear;

    /** OLD or NEW */
    @Column(nullable = false, length = 3)
    private String regime;

    @Column(nullable = false, precision = 15, scale = 2)
    private BigDecimal standardDeduction;

    @Column(nullable = false, precision = 15, scale = 2)
    private BigDecimal rebateIncomeLimit;

    @Column(nullable = false, precision = 15, scale = 2)
    private BigDecimal rebateMaxAmount;

    /** Tax on income just above the rebate limit may not exceed the excess (new regime). */
    @Builder.Default
    private boolean rebateMarginalRelief = false;

    @Column(nullable = false, precision = 6, scale = 4)
    private BigDecimal cessRate;

    @Column(nullable = false, precision = 6, scale = 4)
    private BigDecimal maxSurchargeRate;

    @Builder.Default
    private boolean active = true;

    private String updatedBy;

    @Builder.Default
    private LocalDateTime updatedAt = LocalDateTime.now();
}
