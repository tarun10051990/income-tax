package com.incometax.repository;

import com.incometax.entity.*;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface CaseEventRepository extends JpaRepository<CaseEvent, String> {
    List<CaseEvent> findByFilingCaseIdOrderByCreatedAtAsc(String caseId);
}
