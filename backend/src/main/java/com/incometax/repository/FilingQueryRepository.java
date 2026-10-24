package com.incometax.repository;

import com.incometax.entity.*;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface FilingQueryRepository extends JpaRepository<FilingQuery, String> {
    List<FilingQuery> findByFilingCaseIdOrderByCreatedAtDesc(String caseId);

    Page<FilingQuery> findByStatus(FilingQuery.Status status, Pageable pageable);

    Page<FilingQuery> findByStatusAndFilingCaseTaxType(FilingQuery.Status status, TaxType taxType, Pageable pageable);

    Page<FilingQuery> findByFilingCaseCustomerId(String customerId, Pageable pageable);

    long countByStatus(FilingQuery.Status status);

    long countByFilingCaseTaxTypeAndStatus(TaxType taxType, FilingQuery.Status status);
}
