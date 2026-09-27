package com.incometax.repository;

import com.incometax.entity.*;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface GstFilingRepository extends JpaRepository<GstFiling, String> {
    Optional<GstFiling> findByFilingCaseId(String caseId);
}
