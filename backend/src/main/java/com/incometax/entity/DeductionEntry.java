package com.incometax.entity;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;

@Entity
@Table(name = "deductions")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class DeductionEntry {
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private String id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "filing_id")
    private IncomeTaxFiling filing;

    /** Section code as configured in tax rules, e.g. 80C, 80D, 80G, 24B. */
    @Column(nullable = false)
    private String section;

    private String description;

    @Column(nullable = false)
    private BigDecimal amount;
}
