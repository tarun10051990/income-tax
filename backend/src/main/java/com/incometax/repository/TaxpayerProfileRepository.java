package com.incometax.repository;

import com.incometax.entity.*;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface TaxpayerProfileRepository extends JpaRepository<TaxpayerProfile, String> {
    Optional<TaxpayerProfile> findByUserId(String userId);

    Optional<TaxpayerProfile> findByPan(String pan);
}
