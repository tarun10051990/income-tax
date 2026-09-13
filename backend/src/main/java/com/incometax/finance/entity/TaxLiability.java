package com.incometax.finance.entity;

import com.incometax.entity.TaxType;
import com.incometax.entity.User;
import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;

/**
 * What the client owes for a financial year and tax type. Written by the filing engine when a return is
 * submitted (source FILING) or by staff (source MANUAL); the outstanding amount is always derived as
 * liability − verified payments, never stored.
 */
@Entity
@Table(name = "tax_liabilities", indexes = {
        @Index(name = "idx_tl_owner_fy", columnList = "owner_id, financialYear")
})
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class TaxLiability {
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private String id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "owner_id")
    private User owner;

    @Column(nullable = false, length = 7)
    private String financialYear;

    @Column(length = 7)
    private String assessmentYear;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private TaxType taxType;

    /** GST period (yyyy-MM) or ITR return type; keeps several GST liabilities per FY distinct. */
    private String period;

    @Column(nullable = false)
    private BigDecimal amount;

    private LocalDate dueDate;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private Source source;

    private String filingCaseId;

    @Column(length = 2000)
    private String notes;

    private String updatedBy;

    @Column(nullable = false)
    @Builder.Default
    private LocalDateTime createdAt = LocalDateTime.now();
    private LocalDateTime updatedAt;

    public enum Source {
        FILING,
        MANUAL
    }
}
