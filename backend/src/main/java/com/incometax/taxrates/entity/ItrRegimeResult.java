package com.incometax.taxrates.entity;

import com.fasterxml.jackson.annotation.JsonIgnore;
import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.EqualsAndHashCode;
import lombok.NoArgsConstructor;
import lombok.ToString;

import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.List;

/** Totals for one regime (OLD / NEW) of a computation. */
@Entity
@Table(name = "itr_regime_results",
        uniqueConstraints = @UniqueConstraint(name = "uk_itr_regime_result", columnNames = {"computation_id", "regime"}))
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ItrRegimeResult {
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private String id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "computation_id", nullable = false)
    @JsonIgnore
    @ToString.Exclude
    @EqualsAndHashCode.Exclude
    private ItrTaxComputation computation;

    @Column(nullable = false, length = 3)
    private String regime;

    @Column(nullable = false, precision = 15, scale = 2) private BigDecimal grossTotalIncome;
    @Column(nullable = false, precision = 15, scale = 2) private BigDecimal standardDeduction;
    @Column(nullable = false, precision = 15, scale = 2) private BigDecimal hraExemption;
    @Column(nullable = false, precision = 15, scale = 2) private BigDecimal totalDeductions;
    @Column(nullable = false, precision = 15, scale = 2) private BigDecimal slabIncome;
    @Column(nullable = false, precision = 15, scale = 2) private BigDecimal taxableIncome;
    @Column(nullable = false, precision = 15, scale = 2) private BigDecimal slabTax;
    @Column(nullable = false, precision = 15, scale = 2) private BigDecimal specialRateTax;
    @Column(nullable = false, precision = 15, scale = 2) private BigDecimal rebate87A;
    @Column(nullable = false, precision = 15, scale = 2) private BigDecimal surcharge;
    @Column(nullable = false, precision = 6, scale = 4) private BigDecimal surchargeRate;
    @Column(nullable = false, precision = 15, scale = 2) private BigDecimal cess;
    @Column(nullable = false, precision = 15, scale = 2) private BigDecimal totalTax;
    @Column(nullable = false, precision = 15, scale = 2) private BigDecimal taxesPaid;
    @Column(nullable = false, precision = 15, scale = 2) private BigDecimal netPayable;
    @Column(nullable = false, precision = 15, scale = 2) private BigDecimal refund;
    @Column(nullable = false, precision = 8, scale = 4) private BigDecimal effectiveRate;

    @OneToMany(mappedBy = "result", cascade = CascadeType.ALL, orphanRemoval = true)
    @OrderBy("sortOrder ASC")
    @Builder.Default
    private List<ItrTaxLine> lines = new ArrayList<>();
}
