package com.incometax.entity;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

@Entity
@Table(name = "filing_queries", indexes = @Index(name = "idx_query_case", columnList = "case_id"))
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class FilingQuery {
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private String id;

    @Column(nullable = false, unique = true)
    private String queryNumber;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "case_id")
    private FilingCase filingCase;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "raised_by_id")
    private User raisedBy;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private Category category;

    @Column(nullable = false, length = 2000)
    private String question;

    @Enumerated(EnumType.STRING)
    @Builder.Default
    private Priority priority = Priority.MEDIUM;

    @Enumerated(EnumType.STRING)
    @Builder.Default
    private Status status = Status.OPEN;

    private LocalDate dueDate;

    @OneToMany(mappedBy = "query", cascade = CascadeType.ALL, orphanRemoval = true)
    @Builder.Default
    private List<QueryResponse> responses = new ArrayList<>();

    @Version
    private Long version;

    @Builder.Default
    private LocalDateTime createdAt = LocalDateTime.now();

    private LocalDateTime closedAt;

    public enum Category {
        DOCUMENT,
        INCOME,
        DEDUCTION,
        GST_INVOICE,
        RECONCILIATION,
        PAYMENT,
        OTHER
    }

    public enum Status {
        OPEN,
        RESPONDED,
        ACCEPTED,
        REJECTED,
        CLOSED
    }
}
