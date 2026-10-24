package com.incometax.entity;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Entity
@Table(name = "case_events", indexes = @Index(name = "idx_event_case", columnList = "case_id"))
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class CaseEvent {
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private String id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "case_id")
    private FilingCase filingCase;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "actor_id")
    private User actor;

    @Enumerated(EnumType.STRING)
    private FilingStatus fromStatus;

    @Enumerated(EnumType.STRING)
    private FilingStatus toStatus;

    @Column(nullable = false)
    private String action;

    @Column(length = 1000)
    private String note;

    @Builder.Default
    private LocalDateTime createdAt = LocalDateTime.now();
}
