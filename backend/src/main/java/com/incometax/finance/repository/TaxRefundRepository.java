package com.incometax.finance.repository;

import com.incometax.finance.entity.TaxRefund;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface TaxRefundRepository extends JpaRepository<TaxRefund, String> {
    List<TaxRefund> findByOwnerIdOrderByCreatedAtDesc(String ownerId);

    List<TaxRefund> findByOwnerIdAndFinancialYear(String ownerId, String financialYear);

    List<TaxRefund> findByFinancialYear(String financialYear);

    Page<TaxRefund> findAllByOrderByCreatedAtDesc(Pageable pageable);

    Page<TaxRefund> findByStatusOrderByCreatedAtDesc(TaxRefund.Status status, Pageable pageable);
}
