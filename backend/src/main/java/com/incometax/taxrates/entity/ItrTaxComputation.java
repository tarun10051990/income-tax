package com.incometax.taxrates.entity;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

/** A user's ITR form for one financial year: every category they filled and the tax worked out from it. */
@Entity
@Table(name = "itr_tax_computations",
        uniqueConstraints = @UniqueConstraint(name = "uk_itr_computation_user_fy", columnNames = {"userId", "financialYear"}))
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ItrTaxComputation {
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private String id;

    @Column(nullable = false, length = 36)
    private String userId;

    @Column(nullable = false, length = 9)
    private String financialYear;

    @Column(nullable = false, length = 9)
    private String assessmentYear;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private TaxSlab.AgeGroup ageGroup;

    @Builder.Default
    private boolean metroCity = false;

    @Column(precision = 15, scale = 2)
    private BigDecimal basicSalary;

    @Column(precision = 15, scale = 2)
    private BigDecimal hraReceived;

    @Column(precision = 15, scale = 2)
    private BigDecimal rentPaid;

    @Column(precision = 15, scale = 2)
    private BigDecimal tdsOnSalary;

    @Column(precision = 15, scale = 2)
    private BigDecimal otherTds;

    @Column(precision = 15, scale = 2)
    private BigDecimal advanceTax;

    @Column(length = 3)
    private String recommendedRegime;

    @Column(precision = 15, scale = 2)
    private BigDecimal savings;

    @OneToMany(mappedBy = "computation", cascade = CascadeType.ALL, orphanRemoval = true)
    @OrderBy("sortOrder ASC")
    @Builder.Default
    private List<ItrIncomeEntry> entries = new ArrayList<>();

    @OneToMany(mappedBy = "computation", cascade = CascadeType.ALL, orphanRemoval = true)
    @Builder.Default
    private List<ItrRegimeResult> results = new ArrayList<>();

    @Builder.Default
    private LocalDateTime createdAt = LocalDateTime.now();

    @Builder.Default
    private LocalDateTime updatedAt = LocalDateTime.now();
}
