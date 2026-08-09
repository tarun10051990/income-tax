package com.incometax.entity;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;

/**
 * Professional/platform service fee only. Tax payable to the government is tracked on the
 * filing computation and is never represented by this entity.
 */
@Entity
@Table(name = "payments", indexes = @Index(name = "idx_payment_customer", columnList = "customer_id"))
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class PaymentRecord {
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private String id;

    @Column(nullable = false, unique = true)
    private String invoiceNumber;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "customer_id")
    private User customer;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "case_id")
    private FilingCase filingCase;

    @Column(nullable = false)
    private String description;

    @Column(nullable = false)
    private BigDecimal amount;

    @Builder.Default
    private BigDecimal taxAmount = BigDecimal.ZERO;

    @Enumerated(EnumType.STRING)
    @Builder.Default
    private Status status = Status.PENDING;

    private String providerReference;

    private LocalDate dueDate;

    private LocalDateTime paidAt;

    private String failureReason;

    @Version
    private Long version;

    @Builder.Default
    private LocalDateTime createdAt = LocalDateTime.now();

    public BigDecimal totalAmount() {
        return amount.add(taxAmount == null ? BigDecimal.ZERO : taxAmount);
    }

    public enum Status {
        PENDING,
        PAID,
        FAILED,
        REFUNDED,
        CANCELLED
    }
}
