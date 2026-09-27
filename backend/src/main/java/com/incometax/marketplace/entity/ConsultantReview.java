package com.incometax.marketplace.entity;

import com.incometax.entity.User;
import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Entity
@Table(name = "consultant_reviews", indexes = @Index(name = "idx_review_consultant", columnList = "consultant_id"))
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ConsultantReview {
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private String id;

    @OneToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "booking_id", unique = true)
    private ConsultationBooking booking;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "consultant_id")
    private ConsultantProfile consultant;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "client_id")
    private User client;

    @Column(nullable = false)
    private int rating;

    @Column(length = 2000)
    private String comment;

    @Enumerated(EnumType.STRING)
    @Builder.Default
    private Moderation moderation = Moderation.PUBLISHED;

    private String moderationNote;

    @Builder.Default
    private LocalDateTime createdAt = LocalDateTime.now();

    public enum Moderation {
        PUBLISHED,
        HIDDEN
    }
}
