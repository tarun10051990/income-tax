package com.incometax.finance.entity;

import com.incometax.entity.User;
import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;

/**
 * A payment the client says they made to the government. Only VERIFIED rows count towards "tax paid";
 * unverified manual entries are never treated as confirmed government payments.
 */
@Entity
@Table(name = "client_tax_payments", indexes = {
        @Index(name = "idx_tp_owner_fy", columnList = "owner_id, financialYear"),
        @Index(name = "idx_tp_status", columnList = "verificationStatus")
})
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class TaxPayment {
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private String id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "owner_id")
    private User owner;

    @Column(nullable = false, length = 7)
    private String financialYear;

    @Column(length = 7)
    private String assessmentYear;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private Type type;

    @Column(nullable = false)
    private BigDecimal amount;

    @Column(nullable = false)
    private LocalDate paidOn;

    private String challanNumber;
    private String paymentMethod;

    @Column(length = 2000)
    private String notes;

    private String proofDocumentId;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    @Builder.Default
    private VerificationStatus verificationStatus = VerificationStatus.PENDING;

    private String verificationNote;
    private String verifiedBy;
    private LocalDateTime verifiedAt;

    @Column(nullable = false)
    @Builder.Default
    private LocalDateTime createdAt = LocalDateTime.now();
    private LocalDateTime updatedAt;

    public enum Type {
        ADVANCE_TAX,
        SELF_ASSESSMENT_TAX,
        TDS,
        GST,
        OTHER
    }

    public boolean isGst() {
        return type == Type.GST;
    }
}
