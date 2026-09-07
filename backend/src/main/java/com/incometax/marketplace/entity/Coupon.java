package com.incometax.marketplace.entity;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDate;

@Entity
@Table(name = "coupons")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class Coupon {
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private String id;

    @Column(nullable = false, unique = true)
    private String code;

    private String description;

    /** Percentage discount on the consultation fee; ignored when amountOff is set. */
    private BigDecimal percentOff;

    private BigDecimal amountOff;

    private LocalDate validFrom;

    private LocalDate validTo;

    /** Null means unlimited. */
    private Integer maxRedemptions;

    @Builder.Default
    private int redemptions = 0;

    @Builder.Default
    private boolean active = true;

    public boolean isUsableOn(LocalDate date) {
        if (!active) {
            return false;
        }
        if (validFrom != null && date.isBefore(validFrom)) {
            return false;
        }
        if (validTo != null && date.isAfter(validTo)) {
            return false;
        }
        return maxRedemptions == null || redemptions < maxRedemptions;
    }
}
