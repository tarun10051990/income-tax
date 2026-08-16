package com.incometax.entity;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Entity
@Table(name = "notifications", indexes = @Index(name = "idx_notification_recipient", columnList = "recipient_id"))
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class NotificationRecord {
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private String id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "recipient_id")
    private User recipient;

    @Column(nullable = false)
    private String eventKey;

    @Column(nullable = false)
    private String subject;

    @Column(nullable = false, length = 4000)
    private String body;

    private String caseId;

    @Enumerated(EnumType.STRING)
    @Builder.Default
    private Channel channel = Channel.IN_APP;

    @Builder.Default
    private boolean read = false;

    @Builder.Default
    private LocalDateTime createdAt = LocalDateTime.now();

    private LocalDateTime readAt;

    public enum Channel {
        IN_APP,
        EMAIL,
        SMS
    }
}
