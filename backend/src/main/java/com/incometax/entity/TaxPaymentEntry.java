package com.incometax.entity;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDate;

@Entity
@Table(name = "tax_payments")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class TaxPaymentEntry {
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private String id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "filing_id")
    private IncomeTaxFiling filing;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private Type type;

    @Column(nullable = false)
    private BigDecimal amount;

    /** TAN of the deductor for TDS/TCS entries. */
    private String deductorTan;

    private String challanNumber;

    private LocalDate paidOn;

    public enum Type {
        TDS,
        TCS,
        ADVANCE_TAX,
        SELF_ASSESSMENT_TAX
    }
}
