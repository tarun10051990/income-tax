package com.incometax.marketplace.service;

import com.incometax.entity.User;
import com.incometax.exception.ApiException;
import com.incometax.marketplace.dto.MarketplaceViews.ConsultantDashboard;
import com.incometax.marketplace.dto.MarketplaceViews.MarketplaceStats;
import com.incometax.marketplace.entity.ConsultantPayout;
import com.incometax.marketplace.entity.ConsultantProfile;
import com.incometax.marketplace.entity.ConsultationBooking;
import com.incometax.marketplace.entity.ConsultationBooking.Status;
import com.incometax.marketplace.repository.ConsultantPayoutRepository;
import com.incometax.marketplace.repository.ConsultantProfileRepository;
import com.incometax.marketplace.repository.ConsultationBookingRepository;
import com.incometax.security.Permission;
import com.incometax.security.RbacService;
import com.incometax.service.AuditService;
import com.incometax.service.NotificationService;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.EnumSet;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

@Service
@RequiredArgsConstructor
public class PayoutService {

    private final ConsultantPayoutRepository payoutRepository;
    private final ConsultationBookingRepository bookingRepository;
    private final ConsultantProfileRepository profileRepository;
    private final MarketplaceMapper mapper;
    private final RbacService rbacService;
    private final AuditService auditService;
    private final NotificationService notificationService;

    /** Bundles every completed, not-yet-paid booking of the consultant into one pending payout. */
    @Transactional
    public ConsultantPayout generate(User staff, String consultantId) {
        rbacService.require(staff, Permission.PAYOUT_MANAGE);
        ConsultantProfile profile = profileRepository.findById(consultantId)
                .orElseThrow(() -> ApiException.notFound("Consultant", consultantId));
        List<ConsultationBooking> eligible = bookingRepository
                .findByConsultantIdAndStatusAndPayoutIsNull(consultantId, Status.COMPLETED);
        if (eligible.isEmpty()) {
            throw ApiException.conflict("NOTHING_TO_PAY", "No completed consultations are awaiting payout");
        }
        BigDecimal gross = eligible.stream().map(ConsultationBooking::getConsultationFee)
                .reduce(BigDecimal.ZERO, BigDecimal::add);
        BigDecimal commission = eligible.stream().map(ConsultationBooking::getCommissionAmount)
                .reduce(BigDecimal.ZERO, BigDecimal::add);
        BigDecimal net = eligible.stream().map(ConsultationBooking::getConsultantEarning)
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        ConsultantPayout payout = payoutRepository.save(ConsultantPayout.builder()
                .reference(BookingService.nextReference("PO"))
                .consultant(profile)
                .grossAmount(gross)
                .commissionAmount(commission)
                .netAmount(net)
                .bookingCount(eligible.size())
                .build());
        eligible.forEach(b -> b.setPayout(payout));
        bookingRepository.saveAll(eligible);
        auditService.record("PAYOUT_GENERATED", "ConsultantPayout", payout.getId(), null,
                Map.of("net", net.toPlainString(), "bookings", String.valueOf(eligible.size())));
        return payout;
    }

    @Transactional
    public ConsultantPayout settle(User staff, String payoutId, String paymentReference) {
        rbacService.require(staff, Permission.PAYOUT_MANAGE);
        ConsultantPayout payout = payoutRepository.findById(payoutId)
                .orElseThrow(() -> ApiException.notFound("Payout", payoutId));
        if (payout.getStatus() == ConsultantPayout.Status.PAID) {
            throw ApiException.conflict("PAYOUT_ALREADY_PAID", "This payout has already been settled");
        }
        payout.setStatus(ConsultantPayout.Status.PAID);
        payout.setPaymentReference(paymentReference);
        payout.setPaidAt(LocalDateTime.now());
        ConsultantPayout saved = payoutRepository.save(payout);
        auditService.record("PAYOUT_PAID", "ConsultantPayout", payoutId, null, Map.of("reference", paymentReference));
        notificationService.send(saved.getConsultant().getUser(), "PAYOUT_PAID", Map.of(
                "reference", saved.getReference(), "amount", saved.getNetAmount().toPlainString(),
                "count", String.valueOf(saved.getBookingCount())), null);
        return saved;
    }

    public Page<ConsultantPayout> forConsultant(ConsultantProfile profile, Pageable pageable) {
        return payoutRepository.findByConsultantIdOrderByCreatedAtDesc(profile.getId(), pageable);
    }

    public Page<ConsultantPayout> all(User staff, String consultantId, Pageable pageable) {
        rbacService.require(staff, Permission.PAYOUT_MANAGE);
        return consultantId == null || consultantId.isBlank()
                ? payoutRepository.findAllByOrderByCreatedAtDesc(pageable)
                : payoutRepository.findByConsultantIdOrderByCreatedAtDesc(consultantId, pageable);
    }

    public ConsultantDashboard dashboard(ConsultantProfile profile, User viewer) {
        String id = profile.getId();
        Map<String, Long> counts = new LinkedHashMap<>();
        counts.put("total", bookingRepository.countByConsultantIdAndStatusIn(id, EnumSet.allOf(Status.class)));
        counts.put("upcoming", bookingRepository.countByConsultantIdAndStatusIn(id,
                EnumSet.of(Status.CONFIRMED, Status.RESCHEDULED, Status.IN_PROGRESS)));
        counts.put("completed", bookingRepository.countByConsultantIdAndStatus(id, Status.COMPLETED));
        counts.put("cancelled", bookingRepository.countByConsultantIdAndStatusIn(id,
                EnumSet.of(Status.CANCELLED, Status.REFUNDED, Status.REFUND_REQUESTED, Status.NO_SHOW)));
        counts.put("newRequests", bookingRepository.countByConsultantIdAndStatusIn(id,
                EnumSet.of(Status.REQUESTED, Status.PAYMENT_PENDING)));

        Pageable top = PageRequest.of(0, 5);
        return new ConsultantDashboard(counts,
                bookingRepository.sumEarnings(id, Status.COMPLETED),
                bookingRepository.sumPendingPayout(id),
                payoutRepository.findByConsultantIdOrderByCreatedAtDesc(id, Pageable.unpaged()).stream()
                        .filter(p -> p.getStatus() == ConsultantPayout.Status.PAID)
                        .map(ConsultantPayout::getNetAmount).reduce(BigDecimal.ZERO, BigDecimal::add),
                profile.getAverageRating(), profile.getReviewCount(), profile.getStatus().name(), profile.isVerified(),
                bookingRepository.findByConsultantIdAndStatusInOrderByScheduledStartAsc(id,
                        EnumSet.of(Status.CONFIRMED, Status.RESCHEDULED, Status.IN_PROGRESS), top)
                        .map(b -> mapper.booking(b, viewer)).getContent(),
                bookingRepository.findByConsultantIdAndStatusInOrderByScheduledStartAsc(id,
                        EnumSet.of(Status.REQUESTED, Status.PAYMENT_PENDING), top)
                        .map(b -> mapper.booking(b, viewer)).getContent());
    }

    public MarketplaceStats stats(User staff) {
        rbacService.require(staff, Permission.CONSULTANT_MANAGE);
        Map<String, Long> consultants = new LinkedHashMap<>();
        for (ConsultantProfile.Status s : ConsultantProfile.Status.values()) {
            consultants.put(s.name(), profileRepository.countByStatus(s));
        }
        consultants.put("VERIFIED", profileRepository.countByVerifiedTrue());
        Map<String, Long> bookings = new LinkedHashMap<>();
        for (Status s : Status.values()) {
            bookings.put(s.name(), bookingRepository.countByStatus(s));
        }
        return new MarketplaceStats(consultants, bookings, bookingRepository.sumPaidRevenue(),
                bookingRepository.sumPlatformRevenue(), bookingRepository.sumConsultantEarnings(),
                payoutRepository.sumPaid());
    }
}
