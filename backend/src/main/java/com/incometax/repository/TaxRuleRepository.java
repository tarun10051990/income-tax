package com.incometax.repository;

import com.incometax.entity.*;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

public interface TaxRuleRepository extends JpaRepository<TaxRule, String> {
    List<TaxRule> findByTaxTypeOrderByRuleKeyAsc(TaxType taxType);

    Optional<TaxRule> findByRuleKeyAndVersion(String ruleKey, int version);

    @Query("select r from TaxRule r where r.ruleKey = ?1 and r.active = true "
            + "and r.effectiveFrom <= ?2 and (r.effectiveTo is null or r.effectiveTo >= ?2) "
            + "order by r.effectiveFrom desc, r.version desc")
    List<TaxRule> findEffective(String ruleKey, LocalDate on);
}
