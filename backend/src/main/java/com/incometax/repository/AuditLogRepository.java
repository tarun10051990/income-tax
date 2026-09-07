package com.incometax.repository;

import com.incometax.entity.*;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;

public interface AuditLogRepository extends JpaRepository<AuditLog, String>, JpaSpecificationExecutor<AuditLog> {
    Page<AuditLog> findByEntityTypeAndEntityIdOrderByCreatedAtDesc(String entityType, String entityId,
                                                                  Pageable pageable);

    @org.springframework.data.jpa.repository.Query("select l from AuditLog l where "
            + "(?1 is null or l.entityType = ?1) and (?2 is null or l.entityId = ?2) "
            + "and (?3 is null or l.action = ?3) order by l.createdAt desc")
    Page<AuditLog> search(String entityType, String entityId, String action, Pageable pageable);
}
