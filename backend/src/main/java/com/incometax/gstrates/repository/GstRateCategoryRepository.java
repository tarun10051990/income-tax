package com.incometax.gstrates.repository;

import com.incometax.gstrates.entity.GstRateCategory;
import org.springframework.data.jpa.repository.JpaRepository;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

public interface GstRateCategoryRepository extends JpaRepository<GstRateCategory, String> {
    List<GstRateCategory> findAllByOrderBySortOrderAscEffectiveFromDesc();

    List<GstRateCategory> findByCodeOrderByEffectiveFromDesc(String code);

    Optional<GstRateCategory> findByCodeAndEffectiveFrom(String code, LocalDate effectiveFrom);
}
