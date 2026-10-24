package com.incometax.marketplace.repository;

import com.incometax.marketplace.entity.ConsultationMessage;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface ConsultationMessageRepository extends JpaRepository<ConsultationMessage, String> {
    List<ConsultationMessage> findByBookingIdOrderByCreatedAtAsc(String bookingId);
    List<ConsultationMessage> findByBookingIdAndReadAtIsNullAndSenderIdNot(String bookingId, String readerId);
}
