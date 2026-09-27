package com.incometax.marketplace.repository;

import com.incometax.marketplace.entity.ConsultantPayout;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

import java.math.BigDecimal;

public interface ConsultantPayoutRepository extends JpaRepository<ConsultantPayout, String> {
    Page<ConsultantPayout> findByConsultantIdOrderByCreatedAtDesc(String consultantId, Pageable pageable);
    Page<ConsultantPayout> findAllByOrderByCreatedAtDesc(Pageable pageable);

    @Query("select coalesce(sum(p.netAmount), 0) from ConsultantPayout p where p.status = 'PAID'")
    BigDecimal sumPaid();
}
