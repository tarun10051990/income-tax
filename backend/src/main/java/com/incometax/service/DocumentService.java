package com.incometax.service;

import com.incometax.entity.DocumentRecord;
import com.incometax.entity.FilingCase;
import com.incometax.entity.User;
import com.incometax.exception.ApiException;
import com.incometax.marketplace.repository.DocumentShareRepository;
import com.incometax.repository.DocumentRepository;
import com.incometax.security.Permission;
import com.incometax.security.RbacService;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.io.InputStream;
import java.security.MessageDigest;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.HexFormat;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class DocumentService {

    private static final List<String> ALLOWED_CONTENT_TYPES = List.of(
            "application/pdf", "image/jpeg", "image/png", "text/csv", "application/json",
            "application/vnd.ms-excel",
            "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");

    private final DocumentRepository documentRepository;
    private final DocumentStorage documentStorage;
    private final MalwareScanner malwareScanner;
    private final FilingCaseService filingCaseService;
    private final RbacService rbacService;
    private final AuditService auditService;
    private final DocumentShareRepository documentShareRepository;

    @Value("${documents.max-size-bytes:10485760}")
    private long maxSizeBytes;

    @Transactional
    public DocumentRecord upload(MultipartFile file, String caseId, DocumentRecord.DocumentCategory category,
                                 LocalDate expiresOn, String supersedesDocumentId, User actor) {
        rbacService.require(actor, Permission.DOCUMENT_UPLOAD);
        if (file.isEmpty()) {
            throw ApiException.badRequest("EMPTY_FILE", "The uploaded file is empty");
        }
        if (file.getSize() > maxSizeBytes) {
            throw ApiException.badRequest("FILE_TOO_LARGE",
                    "The file exceeds the maximum permitted size of " + maxSizeBytes + " bytes");
        }
        if (file.getContentType() == null || !ALLOWED_CONTENT_TYPES.contains(file.getContentType())) {
            throw ApiException.badRequest("UNSUPPORTED_FILE_TYPE",
                    "Only PDF, image, CSV, JSON and spreadsheet uploads are accepted");
        }

        byte[] content = read(file);
        DocumentRecord.ScanStatus scanStatus = malwareScanner.scan(file.getOriginalFilename(), content);
        if (scanStatus == DocumentRecord.ScanStatus.INFECTED) {
            auditService.record("DOCUMENT_REJECTED_MALWARE", "DocumentRecord", null, null,
                    Map.of("fileName", String.valueOf(file.getOriginalFilename())));
            throw ApiException.badRequest("MALWARE_DETECTED", "The uploaded file failed the malware scan");
        }

        FilingCase filingCase = caseId == null ? null : filingCaseService.requireReadable(caseId, actor);
        DocumentRecord previousVersion = supersedesDocumentId == null ? null
                : documentRepository.findById(supersedesDocumentId)
                        .orElseThrow(() -> ApiException.notFound("Document", supersedesDocumentId));

        String storageKey = (filingCase == null ? "unfiled" : filingCase.getId()) + "/"
                + UUID.randomUUID() + "-" + sanitise(file.getOriginalFilename());
        documentStorage.store(storageKey, content);

        DocumentRecord document = documentRepository.save(DocumentRecord.builder()
                .owner(filingCase == null ? actor : filingCase.getCustomer())
                .filingCase(filingCase)
                .taxType(filingCase == null ? null : filingCase.getTaxType())
                .category(category)
                .fileName(sanitise(file.getOriginalFilename()))
                .contentType(file.getContentType())
                .sizeBytes(file.getSize())
                .storageKey(storageKey)
                .checksumSha256(sha256(content))
                .versionNumber(previousVersion == null ? 1 : previousVersion.getVersionNumber() + 1)
                .scanStatus(scanStatus)
                .expiresOn(expiresOn)
                .build());

        if (previousVersion != null) {
            previousVersion.setStatus(DocumentRecord.Status.SUPERSEDED);
            previousVersion.setSupersededByDocumentId(document.getId());
            documentRepository.save(previousVersion);
        }

        auditService.record("DOCUMENT_UPLOADED", "DocumentRecord", document.getId(), null,
                Map.of("fileName", document.getFileName(), "category", category.name()));
        return document;
    }

    public InputStream content(String documentId, User actor) {
        DocumentRecord document = requireReadable(documentId, actor);
        auditService.record("DOCUMENT_DOWNLOADED", "DocumentRecord", document.getId(), null, null);
        return documentStorage.read(document.getStorageKey());
    }

    public DocumentRecord requireReadable(String documentId, User actor) {
        DocumentRecord document = documentRepository.findById(documentId)
                .orElseThrow(() -> ApiException.notFound("Document", documentId));
        boolean owner = document.getOwner().getId().equals(actor.getId());
        // Consultants only ever see documents a client explicitly shared for a consultation.
        boolean shared = !owner && actor.isConsultant()
                && documentShareRepository.existsByDocumentIdAndSharedWithIdAndRevokedAtIsNull(documentId, actor.getId());
        if (shared) {
            return document;
        }
        if (!owner && !rbacService.has(actor, Permission.DOCUMENT_READ_ALL)) {
            throw ApiException.forbidden("You may not access this document");
        }
        if (document.getFilingCase() != null && !owner) {
            filingCaseService.requireReadable(document.getFilingCase().getId(), actor);
        }
        return document;
    }

    /** Verification queue for reviewers, restricted to the tax type the caller may work on. */
    public org.springframework.data.domain.Page<DocumentRecord> byStatus(
            DocumentRecord.Status status, User actor, org.springframework.data.domain.Pageable pageable) {
        rbacService.require(actor, Permission.DOCUMENT_READ_ALL);
        com.incometax.entity.TaxType scope = switch (actor.getRole()) {
            case TAX_PROFESSIONAL -> com.incometax.entity.TaxType.INCOME_TAX;
            case GST_PROFESSIONAL -> com.incometax.entity.TaxType.GST;
            default -> null;
        };
        return scope == null
                ? documentRepository.findByStatus(status, pageable)
                : documentRepository.findByStatusAndFilingCaseTaxType(status, scope, pageable);
    }

    public List<DocumentRecord> forCase(String caseId, User actor) {
        filingCaseService.requireReadable(caseId, actor);
        return documentRepository.findByFilingCaseIdOrderByCreatedAtDesc(caseId);
    }

    @Transactional
    public DocumentRecord verify(String documentId, boolean approve, String reason, User actor) {
        rbacService.require(actor, Permission.DOCUMENT_VERIFY);
        DocumentRecord document = documentRepository.findById(documentId)
                .orElseThrow(() -> ApiException.notFound("Document", documentId));
        DocumentRecord.Status previous = document.getStatus();
        document.setStatus(approve ? DocumentRecord.Status.VERIFIED : DocumentRecord.Status.REJECTED);
        document.setVerifiedBy(actor);
        document.setVerifiedAt(LocalDateTime.now());
        document.setRejectionReason(approve ? null : reason);
        DocumentRecord saved = documentRepository.save(document);
        auditService.record(approve ? "DOCUMENT_VERIFIED" : "DOCUMENT_REJECTED", "DocumentRecord",
                documentId, previous.name(), saved.getStatus().name());
        return saved;
    }

    /** Marks documents whose validity has lapsed; intended to be run by a scheduled job. */
    @Transactional
    public int expireOverdueDocuments() {
        List<DocumentRecord> overdue = documentRepository.findByExpiresOnBeforeAndStatusNot(
                LocalDate.now(), DocumentRecord.Status.EXPIRED);
        overdue.forEach(document -> document.setStatus(DocumentRecord.Status.EXPIRED));
        documentRepository.saveAll(overdue);
        return overdue.size();
    }

    private byte[] read(MultipartFile file) {
        try {
            return file.getBytes();
        } catch (IOException ex) {
            throw ApiException.badRequest("UPLOAD_READ_FAILED", "The uploaded file could not be read");
        }
    }

    private String sha256(byte[] content) {
        try {
            return HexFormat.of().formatHex(MessageDigest.getInstance("SHA-256").digest(content));
        } catch (Exception ex) {
            throw new IllegalStateException("SHA-256 is unavailable", ex);
        }
    }

    private String sanitise(String fileName) {
        String name = fileName == null ? "document" : fileName;
        return name.replaceAll("[^A-Za-z0-9._-]", "_");
    }
}
