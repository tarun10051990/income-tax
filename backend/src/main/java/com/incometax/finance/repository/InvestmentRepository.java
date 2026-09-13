package com.incometax.finance.repository;

import com.incometax.finance.entity.Investment;
import com.incometax.finance.entity.VerificationStatus;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

import java.time.LocalDate;
import java.util.List;

public interface InvestmentRepository extends JpaRepository<Investment, String> {
    List<Investment> findByOwnerIdOrderByInvestedOnDesc(String ownerId);

    List<Investment> findByOwnerIdAndFinancialYearOrderByInvestedOnDesc(String ownerId, String financialYear);

    List<Investment> findByOwnerIdAndInvestedOnBetweenOrderByInvestedOnDesc(String ownerId, LocalDate from,
                                                                            LocalDate to);

    List<Investment> findByInvestedOnBetween(LocalDate from, LocalDate to);

    Page<Investment> findByVerificationStatusOrderByCreatedAtAsc(VerificationStatus status, Pageable pageable);

    Page<Investment> findAllByOrderByCreatedAtDesc(Pageable pageable);

    long countByVerificationStatus(VerificationStatus status);

    @Query("select coalesce(sum(i.amount), 0) from Investment i where i.investedOn between :from and :to")
    java.math.BigDecimal sumAmountBetween(LocalDate from, LocalDate to);
}
