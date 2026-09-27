package com.incometax.entity;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDate;
import java.time.LocalDateTime;

@Entity
@Table(name = "documents", indexes = {
        @Index(name = "idx_document_case", columnList = "case_id"),
        @Index(name = "idx_document_owner", columnList = "owner_id")
})
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class DocumentRecord {
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private String id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "owner_id")
    private User owner;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "case_id")
    private FilingCase filingCase;

    @Enumerated(EnumType.STRING)
    private TaxType taxType;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private DocumentCategory category;

    @Column(nullable = false)
    private String fileName;

    private String contentType;

    private long sizeBytes;

    /** Object storage key; content itself never lives in the database. */
    @Column(nullable = false)
    private String storageKey;

    private String checksumSha256;

    @Builder.Default
    private int versionNumber = 1;

    /** Set on the previous version when a new version is uploaded. */
    private String supersededByDocumentId;

    @Enumerated(EnumType.STRING)
    @Builder.Default
    private Status status = Status.UPLOADED;

    @Enumerated(EnumType.STRING)
    @Builder.Default
    private ScanStatus scanStatus = ScanStatus.PENDING;

    private LocalDate expiresOn;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "verified_by_id")
    private User verifiedBy;

    private LocalDateTime verifiedAt;

    private String rejectionReason;

    @Builder.Default
    private LocalDateTime createdAt = LocalDateTime.now();

    public enum DocumentCategory {
        PAN,
        AADHAAR_PROOF,
        FORM_16,
        BANK_STATEMENT,
        INVESTMENT_PROOF,
        SALARY_SLIP,
        CAPITAL_GAIN_STATEMENT,
        INVOICE,
        PURCHASE_REGISTER,
        SALES_REGISTER,
        GST_REPORT,
        PREVIOUS_ACKNOWLEDGEMENT,
        OTHER
    }

    public enum Status {
        UPLOADED,
        VERIFIED,
        REJECTED,
        EXPIRED,
        SUPERSEDED
    }

    public enum ScanStatus {
        PENDING,
        CLEAN,
        INFECTED,
        SKIPPED
    }
}
