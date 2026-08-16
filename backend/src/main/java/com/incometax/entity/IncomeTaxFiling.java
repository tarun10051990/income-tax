package com.incometax.entity;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

@Entity
@Table(name = "income_tax_filings")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class IncomeTaxFiling {
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private String id;

    @OneToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "case_id", unique = true)
    private FilingCase filingCase;

    @Enumerated(EnumType.STRING)
    @Builder.Default
    private TaxpayerType taxpayerType = TaxpayerType.INDIVIDUAL;

    /** OLD or NEW; null until the taxpayer picks a regime. */
    private String selectedRegime;

    @OneToMany(mappedBy = "filing", cascade = CascadeType.ALL, orphanRemoval = true)
    @Builder.Default
    private List<IncomeSource> incomeSources = new ArrayList<>();

    @OneToMany(mappedBy = "filing", cascade = CascadeType.ALL, orphanRemoval = true)
    @Builder.Default
    private List<DeductionEntry> deductions = new ArrayList<>();

    @OneToMany(mappedBy = "filing", cascade = CascadeType.ALL, orphanRemoval = true)
    @Builder.Default
    private List<TaxPaymentEntry> taxPayments = new ArrayList<>();

    private BigDecimal hraReceived;
    private BigDecimal rentPaid;
    private BigDecimal basicSalary;

    /** Snapshot of the last computation, as JSON. */
    @Column(columnDefinition = "TEXT")
    private String computationJson;

    @Version
    private Long version;

    @Builder.Default
    private LocalDateTime createdAt = LocalDateTime.now();

    private LocalDateTime updatedAt;
}
