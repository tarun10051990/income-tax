package com.incometax.taxrates.repository;

import com.incometax.taxrates.entity.ItrTaxComputation;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface ItrTaxComputationRepository extends JpaRepository<ItrTaxComputation, String> {
    Optional<ItrTaxComputation> findByUserIdAndFinancialYear(String userId, String financialYear);

    List<ItrTaxComputation> findByUserIdOrderByFinancialYearDesc(String userId);
}
