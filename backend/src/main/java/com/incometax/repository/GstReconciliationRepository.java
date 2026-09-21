package com.incometax.repository;

import com.incometax.entity.*;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

public interface GstReconciliationRepository extends JpaRepository<GstReconciliationEntry, String> {
    List<GstReconciliationEntry> findByFilingId(String filingId);

    List<GstReconciliationEntry> findByFilingIdAndStatus(String filingId, GstReconciliationEntry.Status status);

    @Transactional
    void deleteByFilingId(String filingId);

    @Query("select e.status, count(e) from GstReconciliationEntry e group by e.status")
    List<Object[]> countGroupedByStatus();
}
