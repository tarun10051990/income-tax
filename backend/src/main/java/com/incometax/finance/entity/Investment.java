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

@Entity
@Table(name = "investments", indexes = {
        @Index(name = "idx_inv_owner_fy", columnList = "owner_id, financialYear"),
        @Index(name = "idx_inv_status", columnList = "verificationStatus")
})
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class Investment {
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private String id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "owner_id")
    private User owner;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private Type type;

    private String name;

    @Column(nullable = false)
    private BigDecimal amount;

    @Column(nullable = false)
    private LocalDate investedOn;

    @Column(nullable = false, length = 7)
    private String financialYear;

    /** Chapter VI-A section the client claims (80C, 80CCD1B, 80D…); null when not tax-saving. */
    private String section;

    @Column(nullable = false)
    @Builder.Default
    private BigDecimal taxSavingEligibleAmount = BigDecimal.ZERO;

    private BigDecimal expectedReturn;
    private BigDecimal actualReturn;
    private LocalDate maturityDate;

    @Column(length = 2000)
    private String notes;

    /** Uploaded proof, if any; the document itself stays under the owner's document controls. */
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
        MUTUAL_FUND,
        STOCKS,
        PPF,
        ELSS,
        NPS,
        INSURANCE,
        FIXED_DEPOSIT,
        BONDS,
        OTHER
    }
}
