package com.incometax.marketplace.repository;

import com.incometax.marketplace.entity.ConsultantService;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface ConsultantServiceRepository extends JpaRepository<ConsultantService, String> {
    List<ConsultantService> findByConsultantIdOrderByFeeAsc(String consultantId);
    List<ConsultantService> findByConsultantIdAndActiveTrueOrderByFeeAsc(String consultantId);
}
