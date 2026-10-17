package com.incometax.taxrates.repository;

import com.incometax.taxrates.entity.TaxSlab;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface TaxSlabRepository extends JpaRepository<TaxSlab, String> {
    List<TaxSlab> findByFinancialYearOrderByRegimeAscSlabTypeAscAgeGroupAscSortOrderAsc(String financialYear);
}
