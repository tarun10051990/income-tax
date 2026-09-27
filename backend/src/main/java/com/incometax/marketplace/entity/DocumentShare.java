package com.incometax.marketplace.entity;

import com.incometax.entity.DocumentRecord;
import com.incometax.entity.User;
import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

/** Explicit, revocable grant of one client document to one consultant for one booking. */
@Entity
@Table(name = "document_shares", indexes = {
        @Index(name = "idx_share_booking", columnList = "booking_id"),
        @Index(name = "idx_share_document", columnList = "document_id")
})
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class DocumentShare {
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private String id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "booking_id")
    private ConsultationBooking booking;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "document_id")
    private DocumentRecord document;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "shared_by_id")
    private User sharedBy;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "shared_with_id")
    private User sharedWith;

    private LocalDateTime revokedAt;

    @Builder.Default
    private LocalDateTime createdAt = LocalDateTime.now();

    public boolean isActive() {
        return revokedAt == null;
    }
}
