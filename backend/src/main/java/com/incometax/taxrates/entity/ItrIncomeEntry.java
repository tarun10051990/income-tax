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

/** One amount the user entered against a tax category (income or deduction). */
@Entity
@Table(name = "itr_income_entries")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ItrIncomeEntry {
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private String id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "computation_id", nullable = false)
    @JsonIgnore
    @ToString.Exclude
    @EqualsAndHashCode.Exclude
    private ItrTaxComputation computation;

    @Column(nullable = false, length = 40)
    private String categoryCode;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 12)
    private TaxCategoryRate.Kind kind;

    @Column(nullable = false, precision = 15, scale = 2)
    private BigDecimal amount;

    @Builder.Default
    private int sortOrder = 0;
}
