package com.incometax.entity;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDate;
import java.time.LocalDateTime;

@Entity
@Table(name = "gst_profiles", indexes = @Index(name = "idx_gst_profile_gstin", columnList = "gstin"))
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class GstProfile {
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private String id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "user_id")
    private User user;

    @Column(nullable = false, unique = true)
    private String gstin;

    @Column(nullable = false)
    private String legalName;

    private String tradeName;

    private String businessType;

    private String businessActivity;

    private String registeredAddress;

    private String state;

    private String authorizedSignatory;

    private String signatoryDesignation;

    private String bankAccountNumber;

    private String bankIfsc;

    private LocalDate registrationDate;

    @Builder.Default
    private boolean compositionScheme = false;

    @Builder.Default
    private boolean active = true;

    @Version
    private Long version;

    @Builder.Default
    private LocalDateTime createdAt = LocalDateTime.now();

    private LocalDateTime updatedAt;
}
