package com.incometax.entity;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Entity
@Table(name = "notification_templates")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class NotificationTemplate {
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private String id;

    /** Event key, e.g. QUERY_RAISED. */
    @Column(nullable = false, unique = true)
    private String eventKey;

    @Column(nullable = false)
    private String subject;

    /** Body with {{placeholders}} resolved from the event payload. */
    @Column(nullable = false, length = 4000)
    private String body;

    @Builder.Default
    private boolean inApp = true;

    @Builder.Default
    private boolean email = false;

    @Builder.Default
    private boolean sms = false;

    @Builder.Default
    private boolean active = true;

    @Builder.Default
    private LocalDateTime createdAt = LocalDateTime.now();

    private LocalDateTime updatedAt;
}
