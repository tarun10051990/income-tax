package com.incometax.repository;

import com.incometax.entity.*;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.jpa.repository.Query;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

public interface FilingCaseRepository extends JpaRepository<FilingCase, String>, JpaSpecificationExecutor<FilingCase> {
    Optional<FilingCase> findByCaseNumber(String caseNumber);

    Page<FilingCase> findByCustomerIdAndDeletedFalse(String customerId, Pageable pageable);

    List<FilingCase> findByCustomerIdAndDeletedFalse(String customerId);

    long countByTaxTypeAndDeletedFalse(TaxType taxType);

    long countByTaxTypeAndStatusAndDeletedFalse(TaxType taxType, FilingStatus status);

    long countByTaxTypeAndReturnTypeAndStatusInAndDeletedFalse(TaxType taxType, ReturnType returnType,
                                                              List<FilingStatus> statuses);

    List<FilingCase> findByDueDateBetweenAndDeletedFalseOrderByDueDateAsc(LocalDate from, LocalDate to);

    @Query("select distinct c.customer.id from FilingCase c where c.taxType = ?1 and c.deleted = false")
    List<String> findDistinctCustomerIdsByTaxType(TaxType taxType);

    @Query("select c.status, count(c) from FilingCase c where c.taxType = ?1 and c.deleted = false group by c.status")
    List<Object[]> countGroupedByStatus(TaxType taxType);

    @Query("select c.createdAt, c.taxType, c.status, c.completedAt from FilingCase c where c.deleted = false")
    List<Object[]> findTimelineRows();
}
