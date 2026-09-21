package com.incometax.marketplace.repository;

import com.incometax.marketplace.entity.ProfessionalType;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface ProfessionalTypeRepository extends JpaRepository<ProfessionalType, String> {
    Optional<ProfessionalType> findByCode(String code);
    List<ProfessionalType> findByActiveTrueOrderBySortOrderAscLabelAsc();
    List<ProfessionalType> findAllByOrderBySortOrderAscLabelAsc();
}
