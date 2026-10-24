package com.incometax.finance.entity;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDate;

/**
 * Indian financial year (1 April – 31 March). Rows are created on demand and by admins, never hard-coded:
 * {@code code} is "2025-26", {@code assessmentYear} is "2026-27".
 */
@Entity
@Table(name = "financial_years")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class FinancialYear {
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private String id;

    @Column(nullable = false, unique = true, length = 7)
    private String code;

    @Column(nullable = false, unique = true, length = 7)
    private String assessmentYear;

    @Column(nullable = false)
    private LocalDate startDate;

    @Column(nullable = false)
    private LocalDate endDate;

    /** Closed years still report; they only stop accepting new client entries. */
    @Builder.Default
    private boolean open = true;

    private String notes;

    public boolean contains(LocalDate date) {
        return date != null && !date.isBefore(startDate) && !date.isAfter(endDate);
    }
}
