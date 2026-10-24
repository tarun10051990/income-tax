package com.incometax.finance.entity;

import com.incometax.entity.TaxType;
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
@Table(name = "tax_refunds", indexes = {
        @Index(name = "idx_tr_owner_fy", columnList = "owner_id, financialYear")
})
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class TaxRefund {
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
    private TaxType taxType;

    @Column(nullable = false)
    private BigDecimal amountClaimed;

    @Column(nullable = false)
    @Builder.Default
    private BigDecimal amountReceived = BigDecimal.ZERO;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    @Builder.Default
    private Status status = Status.CLAIMED;

    private String referenceNumber;
    private LocalDate claimedOn;
    private LocalDate receivedOn;
    private String filingCaseId;

    @Column(length = 2000)
    private String notes;

    private String updatedBy;

    @Column(nullable = false)
    @Builder.Default
    private LocalDateTime createdAt = LocalDateTime.now();
    private LocalDateTime updatedAt;

    public enum Status {
        CLAIMED,
        PROCESSING,
        ISSUED,
        PARTIALLY_ISSUED,
        ADJUSTED,
        REJECTED
    }
}
