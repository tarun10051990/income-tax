package com.incometax.taxrates.repository;

import com.incometax.taxrates.entity.TaxCategoryRate;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface TaxCategoryRateRepository extends JpaRepository<TaxCategoryRate, String> {
    List<TaxCategoryRate> findByFinancialYearOrderBySortOrderAsc(String financialYear);

    Optional<TaxCategoryRate> findByFinancialYearAndCode(String financialYear, String code);

    long countByFinancialYear(String financialYear);
}
