package com.incometax.marketplace.repository;

import com.incometax.marketplace.entity.ConsultantReview;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface ConsultantReviewRepository extends JpaRepository<ConsultantReview, String> {
    Optional<ConsultantReview> findByBookingId(String bookingId);
    Page<ConsultantReview> findByConsultantIdAndModerationOrderByCreatedAtDesc(
            String consultantId, ConsultantReview.Moderation moderation, Pageable pageable);
    List<ConsultantReview> findByConsultantIdAndModeration(String consultantId, ConsultantReview.Moderation moderation);
    Page<ConsultantReview> findAllByOrderByCreatedAtDesc(Pageable pageable);
}
