package com.incometax.gstrates.repository;

import com.incometax.gstrates.entity.GstRule;
import org.springframework.data.jpa.repository.JpaRepository;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

public interface GstRuleRepository extends JpaRepository<GstRule, String> {
    List<GstRule> findAllByOrderByKindAscSortOrderAscEffectiveFromDesc();

    Optional<GstRule> findByCodeAndEffectiveFrom(String code, LocalDate effectiveFrom);
}
