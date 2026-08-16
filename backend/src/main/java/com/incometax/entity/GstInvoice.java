package com.incometax.entity;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;

@Entity
@Table(name = "gst_invoices", indexes = {
        @Index(name = "idx_invoice_filing", columnList = "filing_id"),
        @Index(name = "idx_invoice_number", columnList = "invoiceNumber"),
        @Index(name = "idx_invoice_counterparty", columnList = "counterpartyGstin")
}, uniqueConstraints = @UniqueConstraint(name = "uk_invoice_identity",
        columnNames = {"filing_id", "documentType", "source", "invoiceNumber", "counterpartyGstin"}))
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class GstInvoice {
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private String id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "filing_id")
    private GstFiling filing;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private DocumentType documentType;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    @Builder.Default
    private Source source = Source.TAXPAYER_BOOKS;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    @Builder.Default
    private SupplyType supplyType = SupplyType.TAXABLE;

    @Column(nullable = false)
    private String invoiceNumber;

    @Column(nullable = false)
    private LocalDate invoiceDate;

    private String counterpartyGstin;

    private String counterpartyName;

    private String placeOfSupply;

    private String hsnSacCode;

    @Column(nullable = false)
    @Builder.Default
    private BigDecimal taxableValue = BigDecimal.ZERO;

    @Builder.Default
    private BigDecimal cgst = BigDecimal.ZERO;

    @Builder.Default
    private BigDecimal sgst = BigDecimal.ZERO;

    @Builder.Default
    private BigDecimal igst = BigDecimal.ZERO;

    @Builder.Default
    private BigDecimal cess = BigDecimal.ZERO;

    @Builder.Default
    private boolean reverseCharge = false;

    /** Whether input tax credit may be claimed on this purchase document. */
    @Builder.Default
    private boolean itcEligible = true;

    @Builder.Default
    private LocalDateTime createdAt = LocalDateTime.now();

    public BigDecimal totalTax() {
        return nz(cgst).add(nz(sgst)).add(nz(igst)).add(nz(cess));
    }

    public BigDecimal invoiceValue() {
        return nz(taxableValue).add(totalTax());
    }

    private static BigDecimal nz(BigDecimal value) {
        return value == null ? BigDecimal.ZERO : value;
    }

    /** Whether the document increases (SALES, DEBIT_NOTE) or reduces (CREDIT_NOTE, returns) a liability. */
    public boolean isOutward() {
        return documentType == DocumentType.SALES
                || documentType == DocumentType.CREDIT_NOTE
                || documentType == DocumentType.SALES_RETURN
                || documentType == DocumentType.DEBIT_NOTE_ISSUED;
    }

    public enum DocumentType {
        SALES,
        PURCHASE,
        CREDIT_NOTE,
        DEBIT_NOTE_ISSUED,
        DEBIT_NOTE_RECEIVED,
        SALES_RETURN,
        PURCHASE_RETURN
    }

    public enum SupplyType {
        TAXABLE,
        EXEMPT,
        NIL_RATED,
        NON_GST,
        ZERO_RATED
    }

    public enum Source {
        /** Entered or imported by the taxpayer. */
        TAXPAYER_BOOKS,
        /** Counterparty/portal record used as the reconciliation baseline. */
        COUNTERPARTY_RECORD
    }
}
