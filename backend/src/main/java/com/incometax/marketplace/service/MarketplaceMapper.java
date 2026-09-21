package com.incometax.marketplace.service;

import com.incometax.entity.User;
import com.incometax.marketplace.dto.MarketplaceViews.*;
import com.incometax.marketplace.entity.*;
import com.incometax.marketplace.repository.ConsultantReviewRepository;
import com.incometax.marketplace.repository.ConsultantServiceRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

import java.time.LocalDateTime;
import java.util.Arrays;
import java.util.Collection;
import java.util.List;
import java.util.Objects;
import java.util.stream.Collectors;

@Component
@RequiredArgsConstructor
public class MarketplaceMapper {

    private final ConsultantServiceRepository serviceRepository;
    private final ConsultantReviewRepository reviewRepository;

    /* ---------- csv helpers ---------- */

    public static List<String> split(String csv) {
        if (csv == null || csv.isBlank()) {
            return List.of();
        }
        return Arrays.stream(csv.split(",")).map(String::trim).filter(s -> !s.isEmpty()).toList();
    }

    public static String join(Collection<String> values) {
        if (values == null) {
            return null;
        }
        return values.stream().filter(Objects::nonNull).map(String::trim).filter(s -> !s.isEmpty())
                .distinct().collect(Collectors.joining(","));
    }

    public static String joinModes(Collection<ConsultationMode> modes) {
        if (modes == null || modes.isEmpty()) {
            return null;
        }
        return modes.stream().distinct().map(Enum::name).collect(Collectors.joining(","));
    }

    /* ---------- views ---------- */

    public ProfessionalTypeView type(ProfessionalType t) {
        return new ProfessionalTypeView(t.getId(), t.getCode(), t.getLabel(), t.getDesignation(),
                t.getRegulator().name(), t.isActive(), t.getSortOrder());
    }

    public CategoryView category(ConsultationCategory c) {
        return new CategoryView(c.getId(), c.getSlug(), c.getName(), c.getDomain().name(), c.getDescription(),
                split(c.getRecommendedTypes()), c.getStartingFee(), c.isActive(), c.getSortOrder());
    }

    public ServiceView service(ConsultantService s) {
        ConsultationCategory cat = s.getCategory();
        return new ServiceView(s.getId(), s.getTitle(), s.getDescription(),
                cat == null ? null : cat.getSlug(), cat == null ? null : cat.getName(),
                s.getFee(), s.getDurationMinutes(),
                s.getModes() == null ? split(s.getConsultant().getConsultationModes()) : split(s.getModes()),
                s.isActive());
    }

    public ConsultantPublicView publicView(ConsultantProfile p, LocalDateTime nextAvailable, boolean includeServices) {
        List<ServiceView> services = includeServices
                ? serviceRepository.findByConsultantIdAndActiveTrueOrderByFeeAsc(p.getId()).stream()
                        .map(this::service).toList()
                : null;
        ProfessionalType type = p.getProfessionalType();
        return new ConsultantPublicView(p.getId(), p.getUser().getName(), type.getDesignation(), type.getLabel(),
                type.getCode(), p.isVerified() ? p.getRegistrationNumber() : null, p.getQualification(),
                p.getExperienceYears(), split(p.getSpecializations()), split(p.getCategorySlugs()),
                p.getCity(), p.getState(), split(p.getLanguages()), p.getPhotoUrl(), p.getBio(),
                split(p.getConsultationModes()), p.getBaseFee(), p.getSlotDurationMinutes(), p.isVerified(),
                p.getAverageRating(), p.getReviewCount(), p.getCompletedConsultations(), services, nextAvailable);
    }

    public ConsultantPrivateView privateView(ConsultantProfile p) {
        User u = p.getUser();
        return new ConsultantPrivateView(publicView(p, null, true), u.getId(), u.getEmail(), u.getPhone(),
                p.getStatus().name(), p.getVerificationNotes(), p.getVerifiedAt(), p.getBankAccountName(),
                p.getBankAccountNumberMasked(), p.getBankIfsc(), p.getUpiId(), u.isActive(), p.getCreatedAt());
    }

    public AvailabilityRuleView rule(AvailabilityRule r) {
        return new AvailabilityRuleView(r.getId(), r.getDayOfWeek(), r.getStartTime(), r.getEndTime());
    }

    public HolidayView holiday(ConsultantHoliday h) {
        return new HolidayView(h.getId(), h.getHolidayDate(), h.getReason());
    }

    /**
     * Booking as seen by {@code viewer}. Consultants never see the client's contact details here, and
     * meeting links are only returned to the two parties once the booking is confirmed.
     */
    public BookingView booking(ConsultationBooking b, User viewer) {
        boolean party = viewer != null && (viewer.getId().equals(b.getClient().getId())
                || viewer.getId().equals(b.getConsultant().getUser().getId()));
        boolean live = b.getStatus() == ConsultationBooking.Status.CONFIRMED
                || b.getStatus() == ConsultationBooking.Status.IN_PROGRESS;
        boolean consultantViewer = viewer != null && viewer.getId().equals(b.getConsultant().getUser().getId());
        return new BookingView(b.getId(), b.getReference(), b.getStatus().name(), b.getPaymentStatus().name(),
                b.getConsultant().getId(), b.getConsultant().getUser().getName(),
                b.getConsultant().getProfessionalType().getLabel(),
                b.getClient().getId(), b.getClient().getName(),
                b.getService() == null ? null : b.getService().getTitle(),
                b.getCategory() == null ? null : b.getCategory().getName(),
                b.getMode().name(), b.getScheduledStart(), b.getScheduledEnd(), b.isUrgent(),
                b.getClientNotes(), consultantViewer || (viewer != null && viewer.isStaff()) ? b.getConsultantNotes() : null,
                b.getConsultationFee(), b.getPlatformFee(), b.getTaxAmount(), b.getDiscount(), b.getTotalAmount(),
                consultantViewer || (viewer != null && viewer.isStaff()) ? b.getConsultantEarning() : null,
                b.getInvoiceNumber(), party && live ? b.getMeetingLink() : null,
                viewer != null && (viewer.isStaff() || viewer.getId().equals(b.getClient().getId()))
                        ? b.getPaymentReference() : null,
                b.getPaidAt(), b.getCompletedAt(), b.getCancellationReason(),
                reviewRepository.findByBookingId(b.getId()).isPresent(), b.getCreatedAt());
    }

    public MessageView message(ConsultationMessage m, User viewer) {
        return new MessageView(m.getId(), m.getSender().getId(), m.getSender().getName(),
                viewer != null && viewer.getId().equals(m.getSender().getId()), m.getBody(),
                m.getAttachmentDocumentId(), m.getReadAt(), m.getCreatedAt());
    }

    public SharedDocumentView share(DocumentShare s) {
        return new SharedDocumentView(s.getId(), s.getDocument().getId(), s.getDocument().getFileName(),
                s.getDocument().getCategory().name(), s.getDocument().getSizeBytes(), s.getSharedBy().getName(),
                s.getCreatedAt());
    }

    public ReviewView review(ConsultantReview r) {
        return new ReviewView(r.getId(), r.getBooking().getId(), r.getConsultant().getId(),
                initials(r.getClient().getName()), r.getRating(), r.getComment(), r.getModeration().name(),
                r.getCreatedAt());
    }

    public PayoutView payout(ConsultantPayout p) {
        return new PayoutView(p.getId(), p.getReference(), p.getConsultant().getId(),
                p.getConsultant().getUser().getName(), p.getGrossAmount(), p.getCommissionAmount(), p.getNetAmount(),
                p.getBookingCount(), p.getStatus().name(), p.getPaymentReference(), p.getPaidAt(), p.getCreatedAt());
    }

    public PricingRuleView pricingRule(PricingRule r) {
        return new PricingRuleView(r.getCode(), r.getLabel(), r.getDescription(), r.getValueType().name(),
                r.getValue(), r.getUpdatedAt(), r.getUpdatedBy());
    }

    public CouponView coupon(Coupon c) {
        return new CouponView(c.getId(), c.getCode(), c.getDescription(), c.getPercentOff(), c.getAmountOff(),
                c.getValidFrom(), c.getValidTo(), c.getMaxRedemptions(), c.getRedemptions(), c.isActive());
    }

    public InvoiceView invoice(ConsultationBooking b) {
        return new InvoiceView(b.getInvoiceNumber(), b.getReference(), b.getPaidAt(), b.getClient().getName(),
                b.getConsultant().getUser().getName(), b.getConsultant().getProfessionalType().getLabel(),
                b.getService() == null ? "Consultation" : b.getService().getTitle(), b.getMode().name(),
                b.getScheduledStart(), b.getConsultationFee(), b.getPlatformFee(), b.getTaxAmount(),
                b.getDiscount(), b.getTotalAmount(), b.getPaymentReference());
    }

    /** Public reviews show the reviewer as "Rahul S." rather than the full name. */
    static String initials(String name) {
        if (name == null || name.isBlank()) {
            return "Client";
        }
        String[] parts = name.trim().split("\\s+");
        if (parts.length == 1) {
            return parts[0];
        }
        return parts[0] + " " + parts[parts.length - 1].charAt(0) + ".";
    }
}
