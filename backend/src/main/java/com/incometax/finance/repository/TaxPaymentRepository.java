package com.incometax.finance.repository;

import com.incometax.finance.entity.TaxPayment;
import com.incometax.finance.entity.VerificationStatus;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

import java.time.LocalDate;
import java.util.List;

public interface TaxPaymentRepository extends JpaRepository<TaxPayment, String> {
    List<TaxPayment> findByOwnerIdOrderByPaidOnDesc(String ownerId);

    List<TaxPayment> findByOwnerIdAndFinancialYearOrderByPaidOnDesc(String ownerId, String financialYear);

    List<TaxPayment> findByOwnerIdAndPaidOnBetweenOrderByPaidOnDesc(String ownerId, LocalDate from, LocalDate to);

    List<TaxPayment> findByPaidOnBetween(LocalDate from, LocalDate to);

    Page<TaxPayment> findByVerificationStatusOrderByCreatedAtAsc(VerificationStatus status, Pageable pageable);

    Page<TaxPayment> findAllByOrderByCreatedAtDesc(Pageable pageable);

    long countByVerificationStatus(VerificationStatus status);
}
