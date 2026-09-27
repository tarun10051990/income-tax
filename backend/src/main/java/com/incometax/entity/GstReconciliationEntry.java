package com.incometax.entity;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Entity
@Table(name = "gst_reconciliation_entries", indexes = {
        @Index(name = "idx_recon_filing", columnList = "filing_id"),
        @Index(name = "idx_recon_status", columnList = "status")
})
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class GstReconciliationEntry {
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private String id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "filing_id")
    private GstFiling filing;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "book_invoice_id")
    private GstInvoice bookInvoice;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "counterparty_invoice_id")
    private GstInvoice counterpartyInvoice;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private Status status;

    private String invoiceNumber;

    private String counterpartyGstin;

    @Builder.Default
    private BigDecimal taxableValueDifference = BigDecimal.ZERO;

    @Builder.Default
    private BigDecimal taxDifference = BigDecimal.ZERO;

    @Column(length = 1000)
    private String remarks;

    @Builder.Default
    private boolean resolved = false;

    @Builder.Default
    private LocalDateTime createdAt = LocalDateTime.now();

    public enum Status {
        MATCHED,
        PARTIALLY_MATCHED,
        MISSING_IN_PORTAL,
        MISSING_IN_BOOKS,
        DUPLICATE,
        MISMATCH,
        NEEDS_REVIEW
    }
}
