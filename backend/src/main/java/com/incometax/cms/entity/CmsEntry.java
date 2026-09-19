package com.incometax.cms.entity;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.Instant;

/**
 * One document of public-site content (a service, pricing plan, FAQ, testimonial, blog post, legal page,
 * or a singleton such as site settings). {@code data} is the JSON body the marketing frontend renders;
 * only PUBLISHED entries are served publicly.
 */
@Entity
@Table(name = "cms_entries", uniqueConstraints = @UniqueConstraint(columnNames = {"collection", "slug"}))
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class CmsEntry {

    public enum Status { DRAFT, PUBLISHED }

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private String id;

    @Column(nullable = false, length = 64)
    private String collection;

    @Column(nullable = false, length = 160)
    private String slug;

    @Column(length = 200)
    private String title;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 16)
    @Builder.Default
    private Status status = Status.DRAFT;

    @Column(nullable = false)
    @Builder.Default
    private int sortOrder = 0;

    @Lob
    @Column(nullable = false)
    private String data;

    @Column(nullable = false)
    @Builder.Default
    private int version = 1;

    private String updatedBy;

    @CreationTimestamp
    private Instant createdAt;

    @UpdateTimestamp
    private Instant updatedAt;

    private Instant publishedAt;
}
