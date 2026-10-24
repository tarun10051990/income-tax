package com.incometax.repository;

import com.incometax.entity.*;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

import java.time.LocalDate;
import java.util.List;

public interface DocumentRepository extends JpaRepository<DocumentRecord, String> {
    List<DocumentRecord> findByFilingCaseIdOrderByCreatedAtDesc(String caseId);

    Page<DocumentRecord> findByOwnerId(String ownerId, Pageable pageable);

    Page<DocumentRecord> findByStatus(DocumentRecord.Status status, Pageable pageable);

    Page<DocumentRecord> findByStatusAndFilingCaseTaxType(DocumentRecord.Status status, TaxType taxType,
                                                         Pageable pageable);

    List<DocumentRecord> findByExpiresOnBeforeAndStatusNot(LocalDate date, DocumentRecord.Status status);

    long countByStatus(DocumentRecord.Status status);
}
