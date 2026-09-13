package com.incometax.finance.repository;

import com.incometax.finance.entity.FinancialYear;
import org.springframework.data.jpa.repository.JpaRepository;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

public interface FinancialYearRepository extends JpaRepository<FinancialYear, String> {
    Optional<FinancialYear> findByCode(String code);

    Optional<FinancialYear> findByStartDateLessThanEqualAndEndDateGreaterThanEqual(LocalDate a, LocalDate b);

    List<FinancialYear> findAllByOrderByStartDateDesc();
}
