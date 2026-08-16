package com.incometax.entity;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDate;
import java.time.LocalDateTime;

/**
 * Effective-dated configuration for everything the government can change: slabs, rates,
 * deduction limits, deadlines, interest/late fees, return schemas and validation rules.
 */
@Entity
@Table(name = "tax_rules", indexes = {
        @Index(name = "idx_rule_key", columnList = "ruleKey"),
        @Index(name = "idx_rule_tax_type", columnList = "taxType")
}, uniqueConstraints = @UniqueConstraint(name = "uk_rule_key_version", columnNames = {"ruleKey", "version"}))
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class TaxRule {
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private String id;

    /** e.g. income_tax.slabs.OLD, income_tax.deduction_limits, gst.late_fee, gst.deadlines. */
    @Column(nullable = false)
    private String ruleKey;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private TaxType taxType;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private Category category;

    private String description;

    @Column(nullable = false)
    private LocalDate effectiveFrom;

    private LocalDate effectiveTo;

    @Column(nullable = false)
    @Builder.Default
    private int version = 1;

    @Column(nullable = false, columnDefinition = "TEXT")
    private String configuration;

    @Builder.Default
    private boolean active = true;

    private String createdBy;

    private String approvedBy;

    @Builder.Default
    private LocalDateTime createdAt = LocalDateTime.now();

    private LocalDateTime updatedAt;

    public enum Category {
        SLABS,
        RATES,
        DEDUCTION_LIMITS,
        THRESHOLDS,
        DEADLINES,
        INTEREST_AND_FEES,
        RETURN_SCHEMA,
        VALIDATION
    }
}
