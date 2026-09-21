package com.incometax.marketplace.repository;

import com.incometax.marketplace.entity.PricingRule;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface PricingRuleRepository extends JpaRepository<PricingRule, String> {
    Optional<PricingRule> findByCode(String code);
    List<PricingRule> findAllByOrderByCodeAsc();
}
