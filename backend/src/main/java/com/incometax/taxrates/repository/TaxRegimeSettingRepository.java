package com.incometax.taxrates.repository;

import com.incometax.taxrates.entity.TaxRegimeSetting;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface TaxRegimeSettingRepository extends JpaRepository<TaxRegimeSetting, String> {
    List<TaxRegimeSetting> findByFinancialYearOrderByRegimeAsc(String financialYear);

    Optional<TaxRegimeSetting> findByFinancialYearAndRegime(String financialYear, String regime);

    List<TaxRegimeSetting> findByActiveTrueOrderByFinancialYearDesc();
}
