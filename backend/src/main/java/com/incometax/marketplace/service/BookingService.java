package com.incometax.marketplace.service;

import com.incometax.entity.DocumentRecord;
import com.incometax.entity.User;
import com.incometax.exception.ApiException;
import com.incometax.marketplace.dto.MarketplaceRequests.*;
import com.incometax.marketplace.entity.*;
import com.incometax.marketplace.entity.ConsultationBooking.Status;
import com.incometax.marketplace.repository.*;
import com.incometax.repository.DocumentRepository;
import com.incometax.security.Permission;
import com.incometax.security.RbacService;
import com.incometax.service.AuditService;
import com.incometax.service.NotificationService;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.security.SecureRandom;
import java.time.LocalDateTime;
import java.time.Year;
import java.time.format.DateTimeFormatter;
import java.util.EnumSet;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;

@Service
@RequiredArgsConstructor
public class BookingService {

    private static final DateTimeFormatter WHEN = DateTimeFormatter.ofPattern("d MMM yyyy, h:mm a");
    private static final String ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
    private static final SecureRandom RANDOM = new SecureRandom();

    private final ConsultationBookingRepository bookingRepository;
    private final ConsultantServiceRepository serviceRepository;
    private final ConsultationCategoryRepository categoryRepository;
    private final ConsultationMessageRepository messageRepository;
    private final DocumentShareRepository shareRepository;
    private final ConsultantReviewRepository reviewRepository;
    private final ConsultantProfileRepository profileRepository;
    private final CouponRepository couponRepository;
    private final DocumentRepository documentRepository;
    private final ConsultantProfileService profileService;
    private final PricingService pricingService;
    private final SlotService slotService;
    private final RbacService rbacService;
    private final AuditService auditService;
    private final NotificationService notificationService;

    /* ---------- quoting & creation ---------- */

    public PricingService.Breakdown quote(QuoteRequest request) {
        ConsultantProfile consultant = profileService.requirePublic(request.getConsultantId());
        ConsultantService service = resolveService(consultant, request.getServiceId());
        requireMode(consultant, service, request.getMode());
        return pricingService.quote(consultant, service, request.getMode(), request.isUrgent(),
                request.getCouponCode(), java.time.LocalDate.now());
    }

    @Transactional
    public ConsultationBooking create(User client, BookingRequest request) {
        if (!client.isCustomer()) {
            throw ApiException.forbidden("Only client accounts can book consultations");
        }
        ConsultantProfile consultant = profileService.requirePublic(request.getConsultantId());
        ConsultantService service = resolveService(consultant, request.getServiceId());
        requireMode(consultant, service, request.getMode());
        ConsultationCategory category = request.getCategorySlug() == null
                ? (service == null ? null : service.getCategory())
                : categoryRepository.findBySlug(request.getCategorySlug()).orElse(null);

        PricingService.Breakdown price = pricingService.quote(consultant, service, request.getMode(),
                request.isUrgent(), request.getCouponCode(), request.getScheduledStart().toLocalDate());
        LocalDateTime start = request.getScheduledStart().withSecond(0).withNano(0);
        LocalDateTime end = start.plusMinutes(price.durationMinutes());
        ensureSlotFree(consultant, start, end, null);

        ConsultationBooking booking = bookingRepository.save(ConsultationBooking.builder()
                .reference(nextReference("CB"))
                .client(client)
                .consultant(consultant)
                .service(service)
                .category(category)
                .mode(request.getMode())
                .scheduledStart(start)
                .scheduledEnd(end)
                .urgent(request.isUrgent())
                .clientNotes(request.getNotes())
                .consultationFee(price.consultationFee())
                .platformFee(price.platformFee())
                .taxAmount(price.taxAmount())
                .discount(price.discount())
                .totalAmount(price.total())
                .couponCode(price.coupon() == null ? null : price.coupon().getCode())
                .commissionAmount(price.commission())
                .consultantEarning(price.consultantEarning())
                .status(Status.PAYMENT_PENDING)
                .build());

        auditService.record("BOOKING_CREATED", "ConsultationBooking", booking.getId(), null,
                Map.of("reference", booking.getReference(), "total", booking.getTotalAmount().toPlainString()));
        notificationService.send(consultant.getUser(), "BOOKING_REQUESTED", vars(booking), null);
        return booking;
    }

    /**
     * Client confirms the gateway payment. The booking flips to CONFIRMED, the slot is locked, an invoice
     * number is issued, a private meeting link is generated and both parties are notified.
     */
    @Transactional
    public ConsultationBooking confirmPayment(User client, String bookingId, PaymentConfirmRequest request) {
        ConsultationBooking booking = requireClientOwned(client, bookingId);
        if (booking.getStatus() != Status.PAYMENT_PENDING && booking.getStatus() != Status.REQUESTED) {
            throw ApiException.conflict("BOOKING_NOT_PAYABLE", "This booking is not awaiting payment");
        }
        ensureSlotFree(booking.getConsultant(), booking.getScheduledStart(), booking.getScheduledEnd(), booking.getId());

        booking.setPaymentStatus(ConsultationBooking.PaymentStatus.PAID);
        booking.setPaymentReference(request.getPaymentReference().trim());
        booking.setPaidAt(LocalDateTime.now());
        booking.setInvoiceNumber(nextInvoiceNumber());
        booking.setMeetingLink("/consultations/" + booking.getId() + "/room/" + randomToken(24));
        booking.setStatus(Status.CONFIRMED);
        booking.setUpdatedAt(LocalDateTime.now());
        if (booking.getCouponCode() != null) {
            couponRepository.findByCodeIgnoreCase(booking.getCouponCode()).ifPresent(c -> {
                c.setRedemptions(c.getRedemptions() + 1);
                couponRepository.save(c);
            });
        }
        ConsultationBooking saved = bookingRepository.save(booking);
        auditService.record("BOOKING_CONFIRMED", "ConsultationBooking", saved.getId(),
                Map.of("status", "PAYMENT_PENDING"), Map.of("status", "CONFIRMED"));
        notificationService.send(saved.getClient(), "BOOKING_CONFIRMED", vars(saved), null);
        notificationService.send(saved.getConsultant().getUser(), "BOOKING_CONFIRMED_CONSULTANT", vars(saved), null);
        return saved;
    }

    /* ---------- lifecycle ---------- */

    @Transactional
    public ConsultationBooking reschedule(User actor, String bookingId, RescheduleRequest request) {
        ConsultationBooking booking = requireParty(actor, bookingId);
        if (!EnumSet.of(Status.PAYMENT_PENDING, Status.CONFIRMED, Status.RESCHEDULED).contains(booking.getStatus())) {
            throw ApiException.conflict("BOOKING_NOT_RESCHEDULABLE", "Only upcoming bookings can be rescheduled");
        }
        LocalDateTime start = request.getScheduledStart().withSecond(0).withNano(0);
        LocalDateTime end = start.plusMinutes(java.time.Duration.between(
                booking.getScheduledStart(), booking.getScheduledEnd()).toMinutes());
        ensureSlotFree(booking.getConsultant(), start, end, booking.getId());
        String previous = booking.getScheduledStart().format(WHEN);
        booking.setScheduledStart(start);
        booking.setScheduledEnd(end);
        if (booking.getPaymentStatus() == ConsultationBooking.PaymentStatus.PAID) {
            booking.setStatus(Status.RESCHEDULED);
        }
        booking.setUpdatedAt(LocalDateTime.now());
        ConsultationBooking saved = bookingRepository.save(booking);
        auditService.record("BOOKING_RESCHEDULED", "ConsultationBooking", saved.getId(),
                Map.of("from", previous), Map.of("to", start.format(WHEN)));
        notifyBoth(saved, "BOOKING_RESCHEDULED", actor);
        return saved;
    }

    @Transactional
    public ConsultationBooking cancel(User actor, String bookingId, CancelRequest request) {
        ConsultationBooking booking = actor.isStaff()
                ? requireStaff(actor, bookingId, Permission.BOOKING_MANAGE) : requireParty(actor, bookingId);
        if (!booking.holdsSlot()) {
            throw ApiException.conflict("BOOKING_NOT_CANCELLABLE", "This booking can no longer be cancelled");
        }
        Status previous = booking.getStatus();
        booking.setCancellationReason(request == null ? null : request.getReason());
        if (booking.getPaymentStatus() == ConsultationBooking.PaymentStatus.PAID) {
            long hoursAhead = java.time.Duration.between(LocalDateTime.now(), booking.getScheduledStart()).toHours();
            BigDecimal fullRefundHours = pricingService.rule(PricingRule.CANCELLATION_FULL_REFUND_HOURS);
            boolean consultantCancelled = actor.getId().equals(booking.getConsultant().getUser().getId());
            // Consultant-side or early cancellations refund automatically; late client cancellations go to admin.
            booking.setStatus(consultantCancelled || hoursAhead >= fullRefundHours.longValue()
                    ? Status.REFUND_REQUESTED : Status.CANCELLED);
        } else {
            booking.setStatus(Status.CANCELLED);
        }
        booking.setUpdatedAt(LocalDateTime.now());
        ConsultationBooking saved = bookingRepository.save(booking);
        auditService.record("BOOKING_CANCELLED", "ConsultationBooking", saved.getId(),
                Map.of("status", previous.name()), Map.of("status", saved.getStatus().name()));
        notifyBoth(saved, "BOOKING_CANCELLED", actor);
        return saved;
    }

    @Transactional
    public ConsultationBooking start(User consultantUser, String bookingId) {
        ConsultationBooking booking = requireConsultantOwned(consultantUser, bookingId);
        if (booking.getStatus() != Status.CONFIRMED && booking.getStatus() != Status.RESCHEDULED) {
            throw ApiException.conflict("BOOKING_NOT_STARTABLE", "Only confirmed bookings can be started");
        }
        booking.setStatus(Status.IN_PROGRESS);
        booking.setUpdatedAt(LocalDateTime.now());
        return bookingRepository.save(booking);
    }

    @Transactional
    public ConsultationBooking complete(User consultantUser, String bookingId, ConsultantNotesRequest notes) {
        ConsultationBooking booking = requireConsultantOwned(consultantUser, bookingId);
        if (!EnumSet.of(Status.CONFIRMED, Status.RESCHEDULED, Status.IN_PROGRESS).contains(booking.getStatus())) {
            throw ApiException.conflict("BOOKING_NOT_COMPLETABLE", "Only confirmed bookings can be completed");
        }
        booking.setStatus(Status.COMPLETED);
        booking.setCompletedAt(LocalDateTime.now());
        if (notes != null && notes.getNotes() != null) {
            booking.setConsultantNotes(notes.getNotes());
        }
        booking.setUpdatedAt(LocalDateTime.now());
        ConsultationBooking saved = bookingRepository.save(booking);
        ConsultantProfile profile = saved.getConsultant();
        profile.setCompletedConsultations(profile.getCompletedConsultations() + 1);
        profileRepository.save(profile);
        auditService.record("BOOKING_COMPLETED", "ConsultationBooking", saved.getId(), null, null);
        notificationService.send(saved.getClient(), "BOOKING_COMPLETED", vars(saved), null);
        return saved;
    }

    @Transactional
    public ConsultationBooking noShow(User consultantUser, String bookingId) {
        ConsultationBooking booking = requireConsultantOwned(consultantUser, bookingId);
        if (!EnumSet.of(Status.CONFIRMED, Status.RESCHEDULED).contains(booking.getStatus())
                || booking.getScheduledEnd().isAfter(LocalDateTime.now())) {
            throw ApiException.conflict("BOOKING_NOT_ENDED", "No-show can only be marked after the slot has ended");
        }
        booking.setStatus(Status.NO_SHOW);
        booking.setUpdatedAt(LocalDateTime.now());
        auditService.record("BOOKING_NO_SHOW", "ConsultationBooking", booking.getId(), null, null);
        return bookingRepository.save(booking);
    }

    @Transactional
    public ConsultationBooking saveConsultantNotes(User consultantUser, String bookingId, ConsultantNotesRequest req) {
        ConsultationBooking booking = requireConsultantOwned(consultantUser, bookingId);
        booking.setConsultantNotes(req.getNotes());
        booking.setUpdatedAt(LocalDateTime.now());
        return bookingRepository.save(booking);
    }

    @Transactional
    public ConsultationBooking refund(User staff, String bookingId, RefundRequest request) {
        ConsultationBooking booking = requireStaff(staff, bookingId, Permission.BOOKING_MANAGE);
        if (booking.getPaymentStatus() != ConsultationBooking.PaymentStatus.PAID) {
            throw ApiException.conflict("BOOKING_NOT_PAID", "Nothing to refund; this booking was never paid");
        }
        if (booking.getPayout() != null) {
            throw ApiException.conflict("BOOKING_PAID_OUT", "This booking has already been paid out to the consultant");
        }
        Status previous = booking.getStatus();
        booking.setStatus(Status.REFUNDED);
        booking.setPaymentStatus(ConsultationBooking.PaymentStatus.REFUNDED);
        booking.setConsultantEarning(BigDecimal.ZERO.setScale(2, RoundingMode.HALF_UP));
        booking.setCommissionAmount(BigDecimal.ZERO.setScale(2, RoundingMode.HALF_UP));
        if (request != null && request.getReason() != null) {
            booking.setCancellationReason(request.getReason());
        }
        booking.setUpdatedAt(LocalDateTime.now());
        ConsultationBooking saved = bookingRepository.save(booking);
        auditService.record("BOOKING_REFUNDED", "ConsultationBooking", saved.getId(),
                Map.of("status", previous.name()), Map.of("amount", saved.getTotalAmount().toPlainString()));
        Map<String, String> v = vars(saved);
        v.put("amount", saved.getTotalAmount().toPlainString());
        notificationService.send(saved.getClient(), "BOOKING_REFUNDED", v, null);
        return saved;
    }

    /* ---------- listing ---------- */

    public Page<ConsultationBooking> forClient(User client, Pageable pageable) {
        return bookingRepository.findByClientIdOrderByScheduledStartDesc(client.getId(), pageable);
    }

    public Page<ConsultationBooking> forConsultant(ConsultantProfile profile, Set<Status> statuses,
                                                   Pageable pageable) {
        if (statuses == null || statuses.isEmpty()) {
            return bookingRepository.findByConsultantIdOrderByScheduledStartDesc(profile.getId(), pageable);
        }
        return bookingRepository.findByConsultantIdAndStatusInOrderByScheduledStartAsc(profile.getId(), statuses,
                pageable);
    }

    public Page<ConsultationBooking> adminList(User actor, Status status, String consultantId, Pageable pageable) {
        rbacService.require(actor, Permission.BOOKING_READ_ALL);
        if (consultantId != null && !consultantId.isBlank()) {
            return status == null
                    ? bookingRepository.findByConsultantIdOrderByScheduledStartDesc(consultantId, pageable)
                    : bookingRepository.findByConsultantIdAndStatusOrderByScheduledStartDesc(consultantId, status, pageable);
        }
        return status == null ? bookingRepository.findAllByOrderByScheduledStartDesc(pageable)
                : bookingRepository.findByStatusOrderByScheduledStartDesc(status, pageable);
    }

    public ConsultationBooking view(User actor, String bookingId) {
        return actor.isStaff() ? requireStaff(actor, bookingId, Permission.BOOKING_READ_ALL)
                : requireParty(actor, bookingId);
    }

    public ConsultationBooking invoice(User actor, String bookingId) {
        ConsultationBooking booking = view(actor, bookingId);
        if (booking.getInvoiceNumber() == null) {
            throw ApiException.notFound("Invoice", bookingId);
        }
        return booking;
    }

    /* ---------- messaging ---------- */

    public List<ConsultationMessage> messages(User actor, String bookingId) {
        ConsultationBooking booking = view(actor, bookingId);
        List<ConsultationMessage> unread = messageRepository
                .findByBookingIdAndReadAtIsNullAndSenderIdNot(booking.getId(), actor.getId());
        if (!unread.isEmpty() && !actor.isStaff()) {
            unread.forEach(m -> m.setReadAt(LocalDateTime.now()));
            messageRepository.saveAll(unread);
        }
        return messageRepository.findByBookingIdOrderByCreatedAtAsc(booking.getId());
    }

    @Transactional
    public ConsultationMessage sendMessage(User actor, String bookingId, MessageRequest request) {
        ConsultationBooking booking = requireParty(actor, bookingId);
        if (booking.getStatus() == Status.CANCELLED || booking.getStatus() == Status.REFUNDED) {
            throw ApiException.conflict("CONVERSATION_CLOSED", "This consultation is closed");
        }
        if (request.getAttachmentDocumentId() != null
                && !shareRepository.existsByBookingIdAndDocumentIdAndRevokedAtIsNull(booking.getId(),
                        request.getAttachmentDocumentId())) {
            throw ApiException.forbidden("Share the document with this consultation before attaching it");
        }
        ConsultationMessage message = messageRepository.save(ConsultationMessage.builder()
                .booking(booking).sender(actor).body(request.getBody().trim())
                .attachmentDocumentId(request.getAttachmentDocumentId()).build());
        User recipient = counterpart(booking, actor);
        Map<String, String> v = vars(booking);
        v.put("senderName", actor.getName());
        notificationService.send(recipient, "CONSULTATION_MESSAGE", v, null);
        return message;
    }

    /* ---------- document sharing ---------- */

    public List<DocumentShare> shares(User actor, String bookingId) {
        ConsultationBooking booking = view(actor, bookingId);
        return shareRepository.findByBookingIdAndRevokedAtIsNull(booking.getId());
    }

    @Transactional
    public DocumentShare shareDocument(User client, String bookingId, ShareDocumentRequest request) {
        ConsultationBooking booking = requireClientOwned(client, bookingId);
        DocumentRecord document = documentRepository.findById(request.getDocumentId())
                .orElseThrow(() -> ApiException.notFound("Document", request.getDocumentId()));
        if (!document.getOwner().getId().equals(client.getId())) {
            throw ApiException.forbidden("You may only share your own documents");
        }
        if (shareRepository.existsByBookingIdAndDocumentIdAndRevokedAtIsNull(booking.getId(), document.getId())) {
            throw ApiException.conflict("ALREADY_SHARED", "That document is already shared with this consultation");
        }
        DocumentShare share = shareRepository.save(DocumentShare.builder()
                .booking(booking).document(document).sharedBy(client)
                .sharedWith(booking.getConsultant().getUser()).build());
        auditService.record("DOCUMENT_SHARED", "DocumentRecord", document.getId(), null,
                Map.of("bookingId", booking.getId(), "consultantId", booking.getConsultant().getId()));
        Map<String, String> v = vars(booking);
        v.put("senderName", client.getName());
        v.put("fileName", document.getFileName());
        notificationService.send(booking.getConsultant().getUser(), "DOCUMENT_SHARED", v, null);
        return share;
    }

    @Transactional
    public void revokeShare(User client, String bookingId, String shareId) {
        requireClientOwned(client, bookingId);
        DocumentShare share = shareRepository.findById(shareId)
                .orElseThrow(() -> ApiException.notFound("DocumentShare", shareId));
        if (!share.getBooking().getId().equals(bookingId) || !share.getSharedBy().getId().equals(client.getId())) {
            throw ApiException.forbidden("You may only revoke your own shares");
        }
        share.setRevokedAt(LocalDateTime.now());
        shareRepository.save(share);
        auditService.record("DOCUMENT_SHARE_REVOKED", "DocumentRecord", share.getDocument().getId(), null,
                Map.of("bookingId", bookingId));
    }

    /** Used by the document download path: a consultant may read a document only via an active share. */
    public boolean hasActiveShare(String documentId, User reader) {
        return shareRepository.existsByDocumentIdAndSharedWithIdAndRevokedAtIsNull(documentId, reader.getId());
    }

    /* ---------- reviews ---------- */

    @Transactional
    public ConsultantReview review(User client, String bookingId, ReviewRequest request) {
        ConsultationBooking booking = requireClientOwned(client, bookingId);
        if (booking.getStatus() != Status.COMPLETED) {
            throw ApiException.conflict("BOOKING_NOT_COMPLETED", "You can review a consultation once it is completed");
        }
        if (reviewRepository.findByBookingId(booking.getId()).isPresent()) {
            throw ApiException.conflict("ALREADY_REVIEWED", "You have already reviewed this consultation");
        }
        ConsultantReview review = reviewRepository.save(ConsultantReview.builder()
                .booking(booking).consultant(booking.getConsultant()).client(client)
                .rating(request.getRating()).comment(request.getComment()).build());
        recomputeRating(booking.getConsultant());
        auditService.record("REVIEW_SUBMITTED", "ConsultantReview", review.getId(), null,
                Map.of("rating", String.valueOf(request.getRating())));
        return review;
    }

    @Transactional
    public ConsultantReview moderate(User staff, String reviewId, ReviewModerationRequest request) {
        rbacService.require(staff, Permission.REVIEW_MODERATE);
        ConsultantReview review = reviewRepository.findById(reviewId)
                .orElseThrow(() -> ApiException.notFound("Review", reviewId));
        review.setModeration(request.getHidden() ? ConsultantReview.Moderation.HIDDEN
                : ConsultantReview.Moderation.PUBLISHED);
        review.setModerationNote(request.getNote());
        ConsultantReview saved = reviewRepository.save(review);
        recomputeRating(review.getConsultant());
        auditService.record("REVIEW_MODERATED", "ConsultantReview", reviewId, null,
                Map.of("moderation", saved.getModeration().name()));
        return saved;
    }

    void recomputeRating(ConsultantProfile profile) {
        List<ConsultantReview> published = reviewRepository.findByConsultantIdAndModeration(profile.getId(),
                ConsultantReview.Moderation.PUBLISHED);
        profile.setReviewCount(published.size());
        profile.setAverageRating(published.isEmpty() ? BigDecimal.ZERO
                : BigDecimal.valueOf(published.stream().mapToInt(ConsultantReview::getRating).sum())
                        .divide(BigDecimal.valueOf(published.size()), 1, RoundingMode.HALF_UP));
        profileRepository.save(profile);
    }

    /* ---------- authorisation helpers ---------- */

    private ConsultationBooking require(String bookingId) {
        return bookingRepository.findById(bookingId).orElseThrow(() -> ApiException.notFound("Booking", bookingId));
    }

    private ConsultationBooking requireClientOwned(User client, String bookingId) {
        ConsultationBooking booking = require(bookingId);
        if (!booking.getClient().getId().equals(client.getId())) {
            throw ApiException.forbidden("You may not access this booking");
        }
        return booking;
    }

    private ConsultationBooking requireConsultantOwned(User consultantUser, String bookingId) {
        ConsultationBooking booking = require(bookingId);
        if (!booking.getConsultant().getUser().getId().equals(consultantUser.getId())) {
            throw ApiException.forbidden("You may not access this booking");
        }
        return booking;
    }

    private ConsultationBooking requireParty(User actor, String bookingId) {
        ConsultationBooking booking = require(bookingId);
        boolean client = booking.getClient().getId().equals(actor.getId());
        boolean consultant = booking.getConsultant().getUser().getId().equals(actor.getId());
        if (!client && !consultant) {
            throw ApiException.forbidden("You may not access this booking");
        }
        return booking;
    }

    private ConsultationBooking requireStaff(User actor, String bookingId, Permission permission) {
        rbacService.require(actor, permission);
        return require(bookingId);
    }

    private void ensureSlotFree(ConsultantProfile consultant, LocalDateTime start, LocalDateTime end,
                                String ignoreBookingId) {
        if (!start.isAfter(LocalDateTime.now().plus(SlotService.LEAD_TIME))) {
            throw ApiException.badRequest("SLOT_TOO_SOON", "Consultations must be booked at least an hour ahead");
        }
        if (!slotService.withinWorkingHours(consultant, start, end)) {
            throw ApiException.badRequest("SLOT_UNAVAILABLE", "The consultant is not available at that time");
        }
        boolean clash = bookingRepository.findOverlapping(consultant.getId(), start, end,
                        ConsultationBooking.SLOT_HOLDING).stream()
                .anyMatch(b -> !b.getId().equals(ignoreBookingId));
        if (clash) {
            throw ApiException.conflict("SLOT_TAKEN", "That slot has just been booked; please pick another");
        }
    }

    private ConsultantService resolveService(ConsultantProfile consultant, String serviceId) {
        if (serviceId == null || serviceId.isBlank()) {
            return null;
        }
        ConsultantService service = serviceRepository.findById(serviceId)
                .orElseThrow(() -> ApiException.notFound("Service", serviceId));
        if (!service.getConsultant().getId().equals(consultant.getId()) || !service.isActive()) {
            throw ApiException.badRequest("SERVICE_UNAVAILABLE", "That service is not offered by this consultant");
        }
        return service;
    }

    private static void requireMode(ConsultantProfile consultant, ConsultantService service, ConsultationMode mode) {
        List<String> modes = service != null && service.getModes() != null
                ? MarketplaceMapper.split(service.getModes())
                : MarketplaceMapper.split(consultant.getConsultationModes());
        if (!modes.contains(mode.name())) {
            throw ApiException.badRequest("MODE_UNAVAILABLE", "This consultant does not offer " + mode + " consultations");
        }
    }

    private static User counterpart(ConsultationBooking booking, User actor) {
        return actor.getId().equals(booking.getClient().getId()) ? booking.getConsultant().getUser()
                : booking.getClient();
    }

    private void notifyBoth(ConsultationBooking booking, String eventKey, User actor) {
        Map<String, String> v = vars(booking);
        v.put("reason", booking.getCancellationReason() == null ? "" : booking.getCancellationReason());
        notificationService.send(booking.getClient(), eventKey, v, null);
        notificationService.send(booking.getConsultant().getUser(), eventKey, v, null);
    }

    private static Map<String, String> vars(ConsultationBooking b) {
        Map<String, String> v = new HashMap<>();
        v.put("reference", b.getReference());
        v.put("clientName", b.getClient().getName());
        v.put("consultantName", b.getConsultant().getUser().getName());
        v.put("mode", b.getMode().name().toLowerCase().replace('_', ' '));
        v.put("when", b.getScheduledStart().format(WHEN));
        v.put("invoiceNumber", b.getInvoiceNumber() == null ? "" : b.getInvoiceNumber());
        return v;
    }

    private String nextInvoiceNumber() {
        long paid = bookingRepository.count();
        return String.format("CINV-%d-%05d", Year.now().getValue(), paid);
    }

    static String nextReference(String prefix) {
        return prefix + "-" + randomToken(8);
    }

    static String randomToken(int length) {
        StringBuilder sb = new StringBuilder(length);
        for (int i = 0; i < length; i++) {
            sb.append(ALPHABET.charAt(RANDOM.nextInt(ALPHABET.length())));
        }
        return sb.toString();
    }
}
