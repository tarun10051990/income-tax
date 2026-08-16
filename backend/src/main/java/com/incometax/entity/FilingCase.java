package com.incometax.entity;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDate;
import java.time.LocalDateTime;

@Entity
@Table(name = "filing_cases", indexes = {
        @Index(name = "idx_case_customer", columnList = "customer_id"),
        @Index(name = "idx_case_status", columnList = "status"),
        @Index(name = "idx_case_tax_type", columnList = "taxType"),
        @Index(name = "idx_case_assignee", columnList = "assigned_to_id")
})
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class FilingCase {
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private String id;

    @Column(nullable = false, unique = true)
    private String caseNumber;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "customer_id")
    private User customer;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "assigned_to_id")
    private User assignedTo;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private TaxType taxType;

    @Enumerated(EnumType.STRING)
    private ReturnType returnType;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    @Builder.Default
    private FilingStatus status = FilingStatus.DRAFT;

    @Enumerated(EnumType.STRING)
    @Builder.Default
    private Priority priority = Priority.MEDIUM;

    /** Financial year, e.g. 2024-25. */
    private String financialYear;

    /** Assessment year for income tax, e.g. 2025-26. */
    private String assessmentYear;

    /** Return period for GST, e.g. 2026-07. */
    private String period;

    private LocalDate dueDate;

    private String state;

    @Builder.Default
    private boolean deleted = false;

    @Version
    private Long version;

    @Builder.Default
    private LocalDateTime createdAt = LocalDateTime.now();

    private LocalDateTime updatedAt;

    private LocalDateTime submittedAt;

    private LocalDateTime completedAt;
}
