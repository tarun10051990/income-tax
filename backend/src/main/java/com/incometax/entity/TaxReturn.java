package com.incometax.entity;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import java.time.LocalDateTime;

@Entity
@Table(name = "tax_returns")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class TaxReturn {
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private String id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @Column(nullable = false)
    private String financialYear;

    private String assessmentYear;

    @Enumerated(EnumType.STRING)
    @Builder.Default
    private Status status = Status.DRAFT;

    @Enumerated(EnumType.STRING)
    @Builder.Default
    private ItrType itrType = ItrType.ITR_1;

    @Column(columnDefinition = "TEXT")
    private String form16DataJson;

    @Column(columnDefinition = "TEXT")
    private String additionalIncomeJson;

    @Column(columnDefinition = "TEXT")
    private String taxResultJson;

    private Double grossSalary;
    private Double totalIncome;
    private Double taxableIncome;
    private Double totalTax;
    private Double tdsDeducted;
    private Double refundAmount;

    private String selectedRegime;

    @Builder.Default
    private LocalDateTime createdAt = LocalDateTime.now();

    private LocalDateTime updatedAt;

    public enum Status {
        DRAFT, REVIEW, FILED, PROCESSED, REFUND_ISSUED
    }

    public enum ItrType {
        ITR_1, ITR_2, ITR_3, ITR_4
    }
}
