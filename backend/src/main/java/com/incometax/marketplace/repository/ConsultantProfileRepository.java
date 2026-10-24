package com.incometax.marketplace.repository;

import com.incometax.marketplace.entity.ConsultantProfile;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.Optional;

public interface ConsultantProfileRepository extends JpaRepository<ConsultantProfile, String>,
        JpaSpecificationExecutor<ConsultantProfile> {

    Optional<ConsultantProfile> findByUserId(String userId);

    @EntityGraph(attributePaths = {"user", "professionalType"})
    Page<ConsultantProfile> findByStatus(ConsultantProfile.Status status, Pageable pageable);

    long countByStatus(ConsultantProfile.Status status);

    long countByVerifiedTrue();

    @Query("select p from ConsultantProfile p join p.user u where lower(u.name) like lower(concat('%', :q, '%')) "
            + "or lower(u.email) like lower(concat('%', :q, '%')) or lower(p.registrationNumber) like lower(concat('%', :q, '%'))")
    Page<ConsultantProfile> search(@Param("q") String query, Pageable pageable);
}
