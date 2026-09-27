package com.incometax.finance.repository;

import com.incometax.entity.TaxType;
import com.incometax.finance.entity.TaxLiability;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface TaxLiabilityRepository extends JpaRepository<TaxLiability, String> {
    List<TaxLiability> findByOwnerIdOrderByFinancialYearDescCreatedAtDesc(String ownerId);

    List<TaxLiability> findByOwnerIdAndFinancialYear(String ownerId, String financialYear);

    List<TaxLiability> findByFinancialYear(String financialYear);

    Page<TaxLiability> findAllByOrderByFinancialYearDescCreatedAtDesc(Pageable pageable);

    Page<TaxLiability> findByFinancialYearOrderByCreatedAtDesc(String financialYear, Pageable pageable);

    Page<TaxLiability> findByFinancialYearAndTaxTypeOrderByCreatedAtDesc(String financialYear, TaxType taxType,
                                                                          Pageable pageable);

    Page<TaxLiability> findByTaxTypeOrderByFinancialYearDescCreatedAtDesc(TaxType taxType, Pageable pageable);

    Optional<TaxLiability> findByFilingCaseId(String filingCaseId);

    Optional<TaxLiability> findByOwnerIdAndFinancialYearAndTaxTypeAndPeriodAndSource(
            String ownerId, String financialYear, TaxType taxType, String period, TaxLiability.Source source);
}
