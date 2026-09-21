package com.incometax.marketplace.entity;

import com.incometax.entity.User;
import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.EnumSet;
import java.util.Set;

@Entity
@Table(name = "consultation_bookings", indexes = {
        @Index(name = "idx_booking_client", columnList = "client_id"),
        @Index(name = "idx_booking_consultant", columnList = "consultant_id"),
        @Index(name = "idx_booking_start", columnList = "scheduledStart"),
        @Index(name = "idx_booking_status", columnList = "status")
})
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ConsultationBooking {

    /** Statuses that hold a slot; a new booking may not overlap any of these. */
    public static final Set<Status> SLOT_HOLDING = EnumSet.of(
            Status.REQUESTED, Status.PAYMENT_PENDING, Status.CONFIRMED, Status.IN_PROGRESS, Status.RESCHEDULED);

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private String id;

    @Column(nullable = false, unique = true)
    private String reference;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "client_id")
    private User client;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "consultant_id")
    private ConsultantProfile consultant;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "service_id")
    private ConsultantService service;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "category_id")
    private ConsultationCategory category;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private ConsultationMode mode;

    @Column(nullable = false)
    private LocalDateTime scheduledStart;

    @Column(nullable = false)
    private LocalDateTime scheduledEnd;

    @Builder.Default
    private boolean urgent = false;

    @Column(length = 2000)
    private String clientNotes;

    @Column(length = 2000)
    private String consultantNotes;

    /* Pricing snapshot at booking time; rules may change later without affecting this record. */
    @Column(nullable = false)
    private BigDecimal consultationFee;
    @Builder.Default
    private BigDecimal platformFee = BigDecimal.ZERO;
    @Builder.Default
    private BigDecimal taxAmount = BigDecimal.ZERO;
    @Builder.Default
    private BigDecimal discount = BigDecimal.ZERO;
    @Column(nullable = false)
    private BigDecimal totalAmount;
    private String couponCode;

    /** Platform commission retained from the consultation fee; consultant earns fee minus this. */
    @Builder.Default
    private BigDecimal commissionAmount = BigDecimal.ZERO;
    @Builder.Default
    private BigDecimal consultantEarning = BigDecimal.ZERO;

    @Enumerated(EnumType.STRING)
    @Builder.Default
    private Status status = Status.PAYMENT_PENDING;

    @Enumerated(EnumType.STRING)
    @Builder.Default
    private PaymentStatus paymentStatus = PaymentStatus.PENDING;

    private String paymentReference;
    private LocalDateTime paidAt;

    private String invoiceNumber;

    /** Meeting room path; only the booking's client and consultant can resolve it. */
    private String meetingLink;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "payout_id")
    private ConsultantPayout payout;

    private String cancellationReason;
    private LocalDateTime completedAt;

    @Version
    private Long version;

    @Builder.Default
    private LocalDateTime createdAt = LocalDateTime.now();

    private LocalDateTime updatedAt;

    public boolean holdsSlot() {
        return SLOT_HOLDING.contains(status);
    }

    public enum Status {
        REQUESTED,
        PAYMENT_PENDING,
        CONFIRMED,
        IN_PROGRESS,
        COMPLETED,
        CANCELLED,
        RESCHEDULED,
        NO_SHOW,
        REFUND_REQUESTED,
        REFUNDED
    }

    public enum PaymentStatus {
        PENDING,
        PAID,
        FAILED,
        REFUNDED
    }
}
