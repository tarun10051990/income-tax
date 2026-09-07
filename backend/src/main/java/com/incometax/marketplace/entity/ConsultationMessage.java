package com.incometax.marketplace.entity;

import com.incometax.entity.User;
import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

/** Booking-scoped conversation between the client and the consultant. */
@Entity
@Table(name = "consultation_messages", indexes = @Index(name = "idx_message_booking", columnList = "booking_id"))
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ConsultationMessage {
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private String id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "booking_id")
    private ConsultationBooking booking;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "sender_id")
    private User sender;

    @Column(nullable = false, length = 4000)
    private String body;

    /** Optional attachment; access is governed by the document share, not the message. */
    private String attachmentDocumentId;

    private LocalDateTime readAt;

    @Builder.Default
    private LocalDateTime createdAt = LocalDateTime.now();
}
