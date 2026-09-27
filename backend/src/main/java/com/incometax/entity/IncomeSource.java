package com.incometax.entity;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;

@Entity
@Table(name = "income_sources")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class IncomeSource {
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private String id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "filing_id")
    private IncomeTaxFiling filing;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private Type type;

    private String description;

    @Column(nullable = false)
    private BigDecimal amount;

    /** Expenses/exemptions attributable to this source. */
    @Builder.Default
    private BigDecimal deductibleAmount = BigDecimal.ZERO;

    public enum Type {
        SALARY,
        BUSINESS,
        PROFESSIONAL,
        INTEREST,
        RENTAL,
        CAPITAL_GAINS_SHORT_TERM,
        CAPITAL_GAINS_LONG_TERM,
        DIVIDEND,
        OTHER
    }
}
