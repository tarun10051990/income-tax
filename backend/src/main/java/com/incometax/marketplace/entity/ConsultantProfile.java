package com.incometax.marketplace.entity;

import com.incometax.entity.User;
import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Entity
@Table(name = "consultant_profiles", indexes = {
        @Index(name = "idx_consultant_status", columnList = "status"),
        @Index(name = "idx_consultant_type", columnList = "professional_type_id"),
        @Index(name = "idx_consultant_city", columnList = "city")
})
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ConsultantProfile {
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private String id;

    @OneToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "user_id", unique = true)
    private User user;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "professional_type_id")
    private ProfessionalType professionalType;

    /** ICAI membership / Bar Council enrolment / other registration number. */
    private String registrationNumber;

    private String qualification;

    @Builder.Default
    private int experienceYears = 0;

    /** Comma separated free-text specialisations, e.g. "Income Tax,GST,Tax Planning". */
    @Column(length = 1000)
    private String specializations;

    /** Comma separated category slugs this consultant serves. */
    @Column(length = 1000)
    private String categorySlugs;

    private String city;

    private String state;

    /** Comma separated languages. */
    private String languages;

    private String photoUrl;

    @Column(length = 4000)
    private String bio;

    /** Comma separated ConsultationMode names offered. */
    @Builder.Default
    private String consultationModes = "VIDEO,PHONE";

    /** Consultant-defined starting fee; floored by the platform minimum on every quote. */
    @Column(nullable = false)
    @Builder.Default
    private BigDecimal baseFee = new BigDecimal("99");

    @Builder.Default
    private int slotDurationMinutes = 30;

    @Enumerated(EnumType.STRING)
    @Builder.Default
    private Status status = Status.PENDING_VERIFICATION;

    @Builder.Default
    private boolean verified = false;

    /** Set by the verifying administrator; hidden from the public profile. */
    @Column(length = 2000)
    private String verificationNotes;

    private LocalDateTime verifiedAt;

    /** Payout destination. Account number is stored masked except the last four digits. */
    private String bankAccountName;
    private String bankAccountNumberMasked;
    private String bankIfsc;
    private String upiId;

    @Builder.Default
    private BigDecimal averageRating = BigDecimal.ZERO;

    @Builder.Default
    private int reviewCount = 0;

    @Builder.Default
    private int completedConsultations = 0;

    @Builder.Default
    private LocalDateTime createdAt = LocalDateTime.now();

    private LocalDateTime updatedAt;

    /** Visible in Find a CA / Lawyer results. */
    public boolean isPubliclyVisible() {
        return status == Status.ACTIVE && verified && user != null && user.isActive();
    }

    public enum Status {
        PENDING_VERIFICATION,
        UNDER_REVIEW,
        APPROVED,
        ACTIVE,
        SUSPENDED,
        REJECTED
    }
}
