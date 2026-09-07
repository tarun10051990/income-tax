package com.incometax.repository;

import com.incometax.entity.*;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

import java.math.BigDecimal;

public interface PaymentRepository extends JpaRepository<PaymentRecord, String> {
    Page<PaymentRecord> findByCustomerIdOrderByCreatedAtDesc(String customerId, Pageable pageable);

    Page<PaymentRecord> findByStatus(PaymentRecord.Status status, Pageable pageable);

    long countByStatus(PaymentRecord.Status status);

    @Query("select coalesce(sum(p.amount + p.taxAmount), 0) from PaymentRecord p where p.status = ?1")
    BigDecimal sumTotalByStatus(PaymentRecord.Status status);
}
