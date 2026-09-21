package com.incometax.entity;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Entity
@Table(name = "filing_comments", indexes = @Index(name = "idx_comment_case", columnList = "case_id"))
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class FilingComment {
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private String id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "case_id")
    private FilingCase filingCase;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "author_id")
    private User author;

    @Column(nullable = false, length = 2000)
    private String message;

    /** Internal comments are never exposed to the customer. */
    @Builder.Default
    private boolean internal = true;

    @Builder.Default
    private LocalDateTime createdAt = LocalDateTime.now();
}
