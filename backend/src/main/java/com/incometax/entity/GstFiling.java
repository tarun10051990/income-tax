package com.incometax.entity;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Entity
@Table(name = "gst_filings")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class GstFiling {
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private String id;

    @OneToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "case_id", unique = true)
    private FilingCase filingCase;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "gst_profile_id")
    private GstProfile gstProfile;

    /** Snapshot of the last computation, as JSON. */
    @Column(columnDefinition = "TEXT")
    private String computationJson;

    /** Reference recorded by an operator or an official adapter once the return is filed. */
    private String acknowledgementReference;

    private LocalDateTime reconciledAt;

    @Version
    private Long version;

    @Builder.Default
    private LocalDateTime createdAt = LocalDateTime.now();

    private LocalDateTime updatedAt;
}
