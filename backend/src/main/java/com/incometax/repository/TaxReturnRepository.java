package com.incometax.repository;

import com.incometax.entity.TaxReturn;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface TaxReturnRepository extends JpaRepository<TaxReturn, String> {
    List<TaxReturn> findByUserIdOrderByCreatedAtDesc(String userId);
    List<TaxReturn> findByFinancialYear(String financialYear);
    long countByStatus(TaxReturn.Status status);
}
