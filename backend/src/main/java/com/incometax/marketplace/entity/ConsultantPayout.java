package com.incometax.marketplace.entity;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDateTime;

/** Settlement of a consultant's earned, completed consultations. */
@Entity
@Table(name = "consultant_payouts", indexes = @Index(name = "idx_payout_consultant", columnList = "consultant_id"))
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ConsultantPayout {
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private String id;

    @Column(nullable = false, unique = true)
    private String reference;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "consultant_id")
    private ConsultantProfile consultant;

    @Column(nullable = false)
    private BigDecimal grossAmount;

    @Column(nullable = false)
    private BigDecimal commissionAmount;

    @Column(nullable = false)
    private BigDecimal netAmount;

    @Builder.Default
    private int bookingCount = 0;

    @Enumerated(EnumType.STRING)
    @Builder.Default
    private Status status = Status.PENDING;

    private String paymentReference;

    private LocalDateTime paidAt;

    @Builder.Default
    private LocalDateTime createdAt = LocalDateTime.now();

    public enum Status {
        PENDING,
        PAID,
        FAILED
    }
}
