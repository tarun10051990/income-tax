package com.incometax.repository;

import com.incometax.entity.*;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface FilingCommentRepository extends JpaRepository<FilingComment, String> {
    List<FilingComment> findByFilingCaseIdOrderByCreatedAtAsc(String caseId);

    List<FilingComment> findByFilingCaseIdAndInternalFalseOrderByCreatedAtAsc(String caseId);
}
