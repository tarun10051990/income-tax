package com.incometax.marketplace.entity;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;

/** A priced offering on a consultant's profile ("GST notice reply – 45 min video call"). */
@Entity
@Table(name = "consultant_services", indexes = @Index(name = "idx_service_consultant", columnList = "consultant_id"))
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ConsultantService {
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private String id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "consultant_id")
    private ConsultantProfile consultant;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "category_id")
    private ConsultationCategory category;

    @Column(nullable = false)
    private String title;

    @Column(length = 2000)
    private String description;

    @Column(nullable = false)
    private BigDecimal fee;

    @Builder.Default
    private int durationMinutes = 30;

    /** Comma separated ConsultationMode names; defaults to the consultant's modes when blank. */
    private String modes;

    @Builder.Default
    private boolean active = true;
}
