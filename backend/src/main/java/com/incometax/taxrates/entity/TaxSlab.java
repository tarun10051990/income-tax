package com.incometax.taxrates.entity;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;

/** One income band: income-tax slab or surcharge band for a year, regime and age group. */
@Entity
@Table(name = "tax_slabs", indexes = @Index(name = "idx_tax_slab_fy", columnList = "financialYear, regime, slabType"))
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class TaxSlab {
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private String id;

    @Column(nullable = false, length = 9)
    private String financialYear;

    @Column(nullable = false, length = 3)
    private String regime;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private SlabType slabType;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    @Builder.Default
    private AgeGroup ageGroup = AgeGroup.ALL;

    /** Exclusive lower bound: the band applies to income above this amount. */
    @Column(nullable = false, precision = 15, scale = 2)
    private BigDecimal incomeFrom;

    /** Inclusive upper bound; null for the top band. */
    @Column(precision = 15, scale = 2)
    private BigDecimal incomeTo;

    @Column(nullable = false, precision = 6, scale = 4)
    private BigDecimal rate;

    @Builder.Default
    private int sortOrder = 0;

    public enum SlabType { INCOME_TAX, SURCHARGE }

    public enum AgeGroup { ALL, BELOW_60, SENIOR, SUPER_SENIOR }
}
