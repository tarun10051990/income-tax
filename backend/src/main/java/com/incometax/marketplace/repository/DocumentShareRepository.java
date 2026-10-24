package com.incometax.marketplace.repository;

import com.incometax.marketplace.entity.DocumentShare;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface DocumentShareRepository extends JpaRepository<DocumentShare, String> {
    List<DocumentShare> findByBookingIdAndRevokedAtIsNull(String bookingId);
    boolean existsByDocumentIdAndSharedWithIdAndRevokedAtIsNull(String documentId, String sharedWithId);
    boolean existsByBookingIdAndDocumentIdAndRevokedAtIsNull(String bookingId, String documentId);
}
