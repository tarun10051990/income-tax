package com.incometax.repository;

import com.incometax.entity.*;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface IncomeTaxFilingRepository extends JpaRepository<IncomeTaxFiling, String> {
    Optional<IncomeTaxFiling> findByFilingCaseId(String caseId);
}
