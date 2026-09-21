package com.incometax.marketplace.entity;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;

/** A bookable problem area (ITR Filing, GST Notice, Contract Law ...) grouped by domain. */
@Entity
@Table(name = "consultation_categories")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ConsultationCategory {
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private String id;

    @Column(nullable = false, unique = true)
    private String slug;

    @Column(nullable = false)
    private String name;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private Domain domain;

    private String description;

    /** Comma separated professional type codes recommended for this problem, most relevant first. */
    private String recommendedTypes;

    /** Optional category-level starting fee; falls back to the platform minimum when null. */
    private BigDecimal startingFee;

    @Builder.Default
    private boolean active = true;

    @Builder.Default
    private int sortOrder = 0;

    public enum Domain {
        INCOME_TAX,
        GST,
        LEGAL,
        ACCOUNTING,
        OTHER
    }
}
