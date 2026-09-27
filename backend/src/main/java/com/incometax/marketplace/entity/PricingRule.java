package com.incometax.marketplace.entity;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDateTime;

/** Admin-editable marketplace pricing parameter. Values are never read from source code. */
@Entity
@Table(name = "pricing_rules")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class PricingRule {

    public static final String MIN_CONSULTATION_FEE = "MIN_CONSULTATION_FEE";
    public static final String PLATFORM_COMMISSION_PERCENT = "PLATFORM_COMMISSION_PERCENT";
    public static final String PLATFORM_FEE_FIXED = "PLATFORM_FEE_FIXED";
    public static final String TAX_ON_FEES_PERCENT = "TAX_ON_FEES_PERCENT";
    public static final String URGENT_SURCHARGE_PERCENT = "URGENT_SURCHARGE_PERCENT";
    public static final String MODE_SURCHARGE_VIDEO = "MODE_SURCHARGE_VIDEO";
    public static final String MODE_SURCHARGE_PHONE = "MODE_SURCHARGE_PHONE";
    public static final String MODE_SURCHARGE_CHAT = "MODE_SURCHARGE_CHAT";
    public static final String MODE_SURCHARGE_IN_PERSON = "MODE_SURCHARGE_IN_PERSON";
    public static final String CANCELLATION_FULL_REFUND_HOURS = "CANCELLATION_FULL_REFUND_HOURS";

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private String id;

    @Column(nullable = false, unique = true)
    private String code;

    @Column(nullable = false)
    private String label;

    @Column(length = 1000)
    private String description;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private ValueType valueType;

    @Column(name = "rule_value", nullable = false)
    private BigDecimal value;

    private LocalDateTime updatedAt;

    private String updatedBy;

    public enum ValueType {
        AMOUNT,
        PERCENT,
        HOURS
    }
}
