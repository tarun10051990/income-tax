package com.incometax.marketplace.repository;

import com.incometax.marketplace.entity.ConsultationBooking;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.Collection;
import java.util.List;

public interface ConsultationBookingRepository extends JpaRepository<ConsultationBooking, String> {

    Page<ConsultationBooking> findByClientIdOrderByScheduledStartDesc(String clientId, Pageable pageable);

    Page<ConsultationBooking> findByConsultantIdOrderByScheduledStartDesc(String consultantId, Pageable pageable);

    Page<ConsultationBooking> findByConsultantIdAndStatusInOrderByScheduledStartAsc(
            String consultantId, Collection<ConsultationBooking.Status> statuses, Pageable pageable);

    Page<ConsultationBooking> findByConsultantIdAndStatusOrderByScheduledStartDesc(
            String consultantId, ConsultationBooking.Status status, Pageable pageable);

    Page<ConsultationBooking> findAllByOrderByScheduledStartDesc(Pageable pageable);

    Page<ConsultationBooking> findByStatusOrderByScheduledStartDesc(ConsultationBooking.Status status, Pageable pageable);

    @Query("select b from ConsultationBooking b where b.consultant.id = :consultantId and b.status in :statuses "
            + "and b.scheduledStart < :end and b.scheduledEnd > :start")
    List<ConsultationBooking> findOverlapping(@Param("consultantId") String consultantId,
                                              @Param("start") LocalDateTime start,
                                              @Param("end") LocalDateTime end,
                                              @Param("statuses") Collection<ConsultationBooking.Status> statuses);

    @Query("select b from ConsultationBooking b where b.consultant.id = :consultantId and b.status in :statuses "
            + "and b.scheduledStart >= :from and b.scheduledStart < :to")
    List<ConsultationBooking> findInWindow(@Param("consultantId") String consultantId,
                                           @Param("from") LocalDateTime from,
                                           @Param("to") LocalDateTime to,
                                           @Param("statuses") Collection<ConsultationBooking.Status> statuses);

    List<ConsultationBooking> findByConsultantIdAndStatusAndPayoutIsNull(String consultantId,
                                                                          ConsultationBooking.Status status);

    long countByConsultantIdAndStatus(String consultantId, ConsultationBooking.Status status);

    long countByConsultantIdAndStatusIn(String consultantId, Collection<ConsultationBooking.Status> statuses);

    long countByStatus(ConsultationBooking.Status status);

    @Query("select coalesce(sum(b.consultantEarning), 0) from ConsultationBooking b "
            + "where b.consultant.id = :consultantId and b.status = :status")
    BigDecimal sumEarnings(@Param("consultantId") String consultantId,
                           @Param("status") ConsultationBooking.Status status);

    @Query("select coalesce(sum(b.consultantEarning), 0) from ConsultationBooking b "
            + "where b.consultant.id = :consultantId and b.status = 'COMPLETED' and b.payout is null")
    BigDecimal sumPendingPayout(@Param("consultantId") String consultantId);

    @Query("select coalesce(sum(b.totalAmount), 0) from ConsultationBooking b where b.paymentStatus = 'PAID'")
    BigDecimal sumPaidRevenue();

    @Query("select coalesce(sum(b.commissionAmount + b.platformFee), 0) from ConsultationBooking b "
            + "where b.paymentStatus = 'PAID'")
    BigDecimal sumPlatformRevenue();

    @Query("select coalesce(sum(b.consultantEarning), 0) from ConsultationBooking b where b.status = 'COMPLETED'")
    BigDecimal sumConsultantEarnings();

    List<ConsultationBooking> findByPayoutId(String payoutId);
}
