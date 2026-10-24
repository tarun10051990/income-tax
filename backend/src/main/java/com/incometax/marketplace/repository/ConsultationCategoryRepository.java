package com.incometax.marketplace.repository;

import com.incometax.marketplace.entity.ConsultationCategory;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface ConsultationCategoryRepository extends JpaRepository<ConsultationCategory, String> {
    Optional<ConsultationCategory> findBySlug(String slug);
    List<ConsultationCategory> findByActiveTrueOrderByDomainAscSortOrderAscNameAsc();
    List<ConsultationCategory> findAllByOrderByDomainAscSortOrderAscNameAsc();
}
