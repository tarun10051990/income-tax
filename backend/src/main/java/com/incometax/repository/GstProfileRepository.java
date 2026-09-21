package com.incometax.repository;

import com.incometax.entity.*;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface GstProfileRepository extends JpaRepository<GstProfile, String> {
    List<GstProfile> findByUserId(String userId);

    Optional<GstProfile> findByGstin(String gstin);

    boolean existsByGstin(String gstin);
}
