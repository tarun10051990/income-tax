package com.incometax.marketplace.service;

import com.incometax.dto.AuthResponse;
import com.incometax.entity.User;
import com.incometax.exception.ApiException;
import com.incometax.marketplace.dto.MarketplaceRequests.*;
import com.incometax.marketplace.entity.*;
import com.incometax.marketplace.repository.*;
import com.incometax.repository.UserRepository;
import com.incometax.security.Permission;
import com.incometax.security.RbacService;
import com.incometax.service.AuditService;
import com.incometax.service.NotificationService;
import com.incometax.service.UserService;
import jakarta.persistence.criteria.Join;
import jakarta.persistence.criteria.Predicate;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.Locale;
import java.util.Map;

@Service
@RequiredArgsConstructor
public class ConsultantProfileService {

    public static final String CONSULTANT_APPROVED = "CONSULTANT_APPROVED";
    public static final String CONSULTANT_REJECTED = "CONSULTANT_REJECTED";
    public static final String CONSULTANT_SUSPENDED = "CONSULTANT_SUSPENDED";

    private final ConsultantProfileRepository profileRepository;
    private final ProfessionalTypeRepository typeRepository;
    private final ConsultationCategoryRepository categoryRepository;
    private final ConsultantServiceRepository serviceRepository;
    private final AvailabilityRuleRepository availabilityRepository;
    private final ConsultantHolidayRepository holidayRepository;
    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final UserService userService;
    private final RbacService rbacService;
    private final AuditService auditService;
    private final NotificationService notificationService;

    /* ---------- registration & lookup ---------- */

    @Transactional
    public AuthResponse register(ConsultantRegisterRequest request) {
        String email = request.getEmail().toLowerCase(Locale.ROOT);
        if (userRepository.existsByEmail(email)) {
            throw ApiException.conflict("EMAIL_ALREADY_REGISTERED", "That email address is already registered");
        }
        ProfessionalType type = typeRepository.findByCode(request.getProfessionalTypeCode())
                .filter(ProfessionalType::isActive)
                .orElseThrow(() -> ApiException.badRequest("UNKNOWN_PROFESSIONAL_TYPE",
                        "Unknown professional type " + request.getProfessionalTypeCode()));
        if (type.getRegulator() != ProfessionalType.Regulator.NONE
                && (request.getRegistrationNumber() == null || request.getRegistrationNumber().isBlank())) {
            throw ApiException.badRequest("REGISTRATION_NUMBER_REQUIRED",
                    type.getRegulator() == ProfessionalType.Regulator.ICAI
                            ? "ICAI membership number is required for Chartered Accountants"
                            : "Bar Council enrolment number is required for lawyers");
        }
        validateCategories(request.getCategorySlugs());

        User user = userRepository.save(User.builder()
                .name(request.getName().trim())
                .email(email)
                .phone(request.getPhone())
                .password(passwordEncoder.encode(request.getPassword()))
                .role(User.Role.CONSULTANT)
                .onboardingComplete(true)
                .build());

        ConsultantProfile profile = profileRepository.save(ConsultantProfile.builder()
                .user(user)
                .professionalType(type)
                .registrationNumber(trim(request.getRegistrationNumber()))
                .qualification(trim(request.getQualification()))
                .experienceYears(request.getExperienceYears())
                .specializations(MarketplaceMapper.join(request.getSpecializations()))
                .categorySlugs(MarketplaceMapper.join(request.getCategorySlugs()))
                .city(trim(request.getCity()))
                .state(trim(request.getState()))
                .languages(MarketplaceMapper.join(request.getLanguages()))
                .bio(trim(request.getBio()))
                .consultationModes(request.getConsultationModes() == null || request.getConsultationModes().isEmpty()
                        ? "VIDEO,PHONE" : MarketplaceMapper.joinModes(request.getConsultationModes()))
                .baseFee(request.getBaseFee() == null ? new BigDecimal("99") : request.getBaseFee())
                .build());

        auditService.record("CONSULTANT_REGISTERED", "ConsultantProfile", profile.getId(), null,
                Map.of("type", type.getCode()));
        return userService.sessionFor(user);
    }

    public ConsultantProfile requireByUser(User user) {
        return profileRepository.findByUserId(user.getId())
                .orElseThrow(() -> ApiException.notFound("ConsultantProfile", user.getId()));
    }

    public ConsultantProfile require(String id) {
        return profileRepository.findById(id).orElseThrow(() -> ApiException.notFound("Consultant", id));
    }

    public ConsultantProfile requirePublic(String id) {
        ConsultantProfile profile = require(id);
        if (!profile.isPubliclyVisible()) {
            throw ApiException.notFound("Consultant", id);
        }
        return profile;
    }

    /* ---------- self-service profile ---------- */

    @Transactional
    public ConsultantProfile updateOwn(User actor, ConsultantProfileUpdate request) {
        ConsultantProfile profile = requireByUser(actor);
        if (request.getName() != null && !request.getName().isBlank()) {
            actor.setName(request.getName().trim());
        }
        if (request.getPhone() != null) {
            actor.setPhone(request.getPhone());
        }
        actor.setUpdatedAt(LocalDateTime.now());
        userRepository.save(actor);

        boolean credentialsChanged = false;
        if (request.getRegistrationNumber() != null
                && !request.getRegistrationNumber().equals(profile.getRegistrationNumber())) {
            profile.setRegistrationNumber(trim(request.getRegistrationNumber()));
            credentialsChanged = true;
        }
        if (request.getQualification() != null) {
            profile.setQualification(trim(request.getQualification()));
        }
        if (request.getExperienceYears() != null) {
            profile.setExperienceYears(request.getExperienceYears());
        }
        if (request.getSpecializations() != null) {
            profile.setSpecializations(MarketplaceMapper.join(request.getSpecializations()));
        }
        if (request.getCategorySlugs() != null) {
            validateCategories(request.getCategorySlugs());
            profile.setCategorySlugs(MarketplaceMapper.join(request.getCategorySlugs()));
        }
        if (request.getCity() != null) {
            profile.setCity(trim(request.getCity()));
        }
        if (request.getState() != null) {
            profile.setState(trim(request.getState()));
        }
        if (request.getLanguages() != null) {
            profile.setLanguages(MarketplaceMapper.join(request.getLanguages()));
        }
        if (request.getPhotoUrl() != null) {
            profile.setPhotoUrl(trim(request.getPhotoUrl()));
        }
        if (request.getBio() != null) {
            profile.setBio(trim(request.getBio()));
        }
        if (request.getConsultationModes() != null && !request.getConsultationModes().isEmpty()) {
            profile.setConsultationModes(MarketplaceMapper.joinModes(request.getConsultationModes()));
        }
        if (request.getBaseFee() != null) {
            profile.setBaseFee(request.getBaseFee());
        }
        if (request.getSlotDurationMinutes() != null) {
            profile.setSlotDurationMinutes(request.getSlotDurationMinutes());
        }
        if (credentialsChanged && profile.isVerified()) {
            // A changed registration number must be re-verified before the badge is shown again.
            profile.setVerified(false);
            profile.setStatus(ConsultantProfile.Status.UNDER_REVIEW);
        }
        profile.setUpdatedAt(LocalDateTime.now());
        auditService.record("CONSULTANT_PROFILE_UPDATED", "ConsultantProfile", profile.getId(), null, null);
        return profileRepository.save(profile);
    }

    @Transactional
    public ConsultantProfile updateBankDetails(User actor, BankDetailsRequest request) {
        ConsultantProfile profile = requireByUser(actor);
        profile.setBankAccountName(request.getAccountName().trim());
        if (request.getAccountNumber() != null) {
            profile.setBankAccountNumberMasked(mask(request.getAccountNumber()));
        }
        profile.setBankIfsc(request.getIfsc());
        profile.setUpiId(trim(request.getUpiId()));
        profile.setUpdatedAt(LocalDateTime.now());
        auditService.record("CONSULTANT_BANK_UPDATED", "ConsultantProfile", profile.getId(), null, null);
        return profileRepository.save(profile);
    }

    /* ---------- services ---------- */

    public List<ConsultantService> services(ConsultantProfile profile) {
        return serviceRepository.findByConsultantIdOrderByFeeAsc(profile.getId());
    }

    @Transactional
    public ConsultantService saveService(User actor, String serviceId, ServiceRequest request) {
        ConsultantProfile profile = requireByUser(actor);
        ConsultantService service = serviceId == null
                ? ConsultantService.builder().consultant(profile).build()
                : requireOwnService(profile, serviceId);
        ConsultationCategory category = request.getCategorySlug() == null ? null
                : categoryRepository.findBySlug(request.getCategorySlug())
                        .orElseThrow(() -> ApiException.badRequest("UNKNOWN_CATEGORY",
                                "Unknown category " + request.getCategorySlug()));
        service.setCategory(category);
        service.setTitle(request.getTitle().trim());
        service.setDescription(trim(request.getDescription()));
        service.setFee(request.getFee());
        service.setDurationMinutes(request.getDurationMinutes());
        service.setModes(MarketplaceMapper.joinModes(request.getModes()));
        service.setActive(request.isActive());
        return serviceRepository.save(service);
    }

    @Transactional
    public void deleteService(User actor, String serviceId) {
        ConsultantProfile profile = requireByUser(actor);
        serviceRepository.delete(requireOwnService(profile, serviceId));
    }

    private ConsultantService requireOwnService(ConsultantProfile profile, String serviceId) {
        ConsultantService service = serviceRepository.findById(serviceId)
                .orElseThrow(() -> ApiException.notFound("Service", serviceId));
        if (!service.getConsultant().getId().equals(profile.getId())) {
            throw ApiException.forbidden("You may only edit your own services");
        }
        return service;
    }

    /* ---------- availability ---------- */

    public List<AvailabilityRule> rules(ConsultantProfile profile) {
        return availabilityRepository.findByConsultantIdOrderByDayOfWeekAscStartTimeAsc(profile.getId());
    }

    @Transactional
    public List<AvailabilityRule> replaceRules(ConsultantProfile profile, AvailabilityUpdate request) {
        List<AvailabilityRule> rules = new ArrayList<>();
        for (AvailabilityRuleRequest r : request.getRules()) {
            if (!r.getStartTime().isBefore(r.getEndTime())) {
                throw ApiException.badRequest("INVALID_WINDOW", "Start time must be before end time");
            }
            rules.add(AvailabilityRule.builder().consultant(profile).dayOfWeek(r.getDayOfWeek())
                    .startTime(r.getStartTime()).endTime(r.getEndTime()).build());
        }
        availabilityRepository.deleteByConsultantId(profile.getId());
        availabilityRepository.flush();
        auditService.record("CONSULTANT_AVAILABILITY_UPDATED", "ConsultantProfile", profile.getId(), null,
                Map.of("rules", String.valueOf(rules.size())));
        return availabilityRepository.saveAll(rules);
    }

    public List<ConsultantHoliday> holidays(ConsultantProfile profile) {
        return holidayRepository.findByConsultantIdAndHolidayDateGreaterThanEqualOrderByHolidayDateAsc(
                profile.getId(), java.time.LocalDate.now());
    }

    @Transactional
    public ConsultantHoliday addHoliday(ConsultantProfile profile, HolidayRequest request) {
        if (holidayRepository.existsByConsultantIdAndHolidayDate(profile.getId(), request.getDate())) {
            throw ApiException.conflict("HOLIDAY_EXISTS", "That date is already blocked");
        }
        return holidayRepository.save(ConsultantHoliday.builder().consultant(profile)
                .holidayDate(request.getDate()).reason(trim(request.getReason())).build());
    }

    @Transactional
    public void removeHoliday(ConsultantProfile profile, String holidayId) {
        ConsultantHoliday holiday = holidayRepository.findById(holidayId)
                .orElseThrow(() -> ApiException.notFound("Holiday", holidayId));
        if (!holiday.getConsultant().getId().equals(profile.getId())) {
            throw ApiException.forbidden("You may only edit your own calendar");
        }
        holidayRepository.delete(holiday);
    }

    /* ---------- public search ---------- */

    public record SearchFilter(String typeCode, String categorySlug, String specialization, String city,
                               String state, String language, Integer minExperience, BigDecimal minRating,
                               BigDecimal maxFee, ConsultationMode mode, String query) {
    }

    public Page<ConsultantProfile> searchPublic(SearchFilter f, Pageable pageable) {
        Specification<ConsultantProfile> spec = (root, query, cb) -> {
            List<Predicate> p = new ArrayList<>();
            p.add(cb.equal(root.get("status"), ConsultantProfile.Status.ACTIVE));
            p.add(cb.isTrue(root.get("verified")));
            Join<Object, Object> user = root.join("user");
            p.add(cb.isTrue(user.get("active")));
            if (notBlank(f.typeCode())) {
                p.add(cb.equal(root.join("professionalType").get("code"), f.typeCode()));
            }
            if (notBlank(f.categorySlug())) {
                p.add(csvContains(cb, root.get("categorySlugs"), f.categorySlug()));
            }
            if (notBlank(f.specialization())) {
                p.add(cb.like(cb.lower(root.get("specializations")),
                        "%" + f.specialization().toLowerCase(Locale.ROOT) + "%"));
            }
            if (notBlank(f.city())) {
                p.add(cb.equal(cb.lower(root.get("city")), f.city().toLowerCase(Locale.ROOT)));
            }
            if (notBlank(f.state())) {
                p.add(cb.equal(cb.lower(root.get("state")), f.state().toLowerCase(Locale.ROOT)));
            }
            if (notBlank(f.language())) {
                p.add(csvContains(cb, root.get("languages"), f.language()));
            }
            if (f.minExperience() != null) {
                p.add(cb.greaterThanOrEqualTo(root.get("experienceYears"), f.minExperience()));
            }
            if (f.minRating() != null) {
                p.add(cb.greaterThanOrEqualTo(root.get("averageRating"), f.minRating()));
            }
            if (f.maxFee() != null) {
                p.add(cb.lessThanOrEqualTo(root.get("baseFee"), f.maxFee()));
            }
            if (f.mode() != null) {
                p.add(csvContains(cb, root.get("consultationModes"), f.mode().name()));
            }
            if (notBlank(f.query())) {
                String like = "%" + f.query().toLowerCase(Locale.ROOT) + "%";
                p.add(cb.or(cb.like(cb.lower(user.get("name")), like),
                        cb.like(cb.lower(root.get("specializations")), like),
                        cb.like(cb.lower(root.get("bio")), like),
                        cb.like(cb.lower(root.get("city")), like)));
            }
            return cb.and(p.toArray(Predicate[]::new));
        };
        return profileRepository.findAll(spec, pageable);
    }

    private static Predicate csvContains(jakarta.persistence.criteria.CriteriaBuilder cb,
                                         jakarta.persistence.criteria.Path<String> column, String value) {
        // Column is stored as "a,b,c"; wrap both sides in commas to match whole tokens only.
        return cb.like(cb.lower(cb.concat(cb.concat(",", column), ",")),
                "%," + value.toLowerCase(Locale.ROOT) + ",%");
    }

    /* ---------- admin ---------- */

    public Page<ConsultantProfile> adminList(User actor, ConsultantProfile.Status status, String query,
                                             Pageable pageable) {
        rbacService.require(actor, Permission.CONSULTANT_MANAGE);
        if (notBlank(query)) {
            return profileRepository.search(query.trim(), pageable);
        }
        return status == null ? profileRepository.findAll(pageable) : profileRepository.findByStatus(status, pageable);
    }

    @Transactional
    public ConsultantProfile transition(User actor, String profileId, ConsultantProfile.Status target, String notes) {
        rbacService.require(actor, Permission.CONSULTANT_MANAGE);
        ConsultantProfile profile = require(profileId);
        ConsultantProfile.Status from = profile.getStatus();
        if (!allowed(from, target)) {
            throw ApiException.conflict("INVALID_CONSULTANT_TRANSITION",
                    "A consultant in " + from + " cannot move to " + target);
        }
        profile.setStatus(target);
        if (notes != null && !notes.isBlank()) {
            profile.setVerificationNotes(notes.trim());
        }
        switch (target) {
            case APPROVED, ACTIVE -> {
                if (!profile.isVerified()) {
                    profile.setVerified(true);
                    profile.setVerifiedAt(LocalDateTime.now());
                }
                if (target == ConsultantProfile.Status.APPROVED) {
                    // Approval immediately activates the listing; admins may suspend later.
                    profile.setStatus(ConsultantProfile.Status.ACTIVE);
                }
                notify(profile, CONSULTANT_APPROVED, "Your professional profile has been verified and is now live.");
            }
            case REJECTED -> notify(profile, CONSULTANT_REJECTED,
                    "Your professional profile could not be verified. " + (notes == null ? "" : notes));
            case SUSPENDED -> notify(profile, CONSULTANT_SUSPENDED,
                    "Your professional profile has been suspended. " + (notes == null ? "" : notes));
            default -> {
            }
        }
        profile.setUpdatedAt(LocalDateTime.now());
        auditService.record("CONSULTANT_STATUS_CHANGED", "ConsultantProfile", profile.getId(),
                Map.of("status", from.name()), Map.of("status", profile.getStatus().name()));
        return profileRepository.save(profile);
    }

    @Transactional
    public ConsultantProfile setAccountActive(User actor, String profileId, boolean active) {
        rbacService.require(actor, Permission.CONSULTANT_MANAGE);
        ConsultantProfile profile = require(profileId);
        profile.getUser().setActive(active);
        userRepository.save(profile.getUser());
        auditService.record(active ? "CONSULTANT_ACTIVATED" : "CONSULTANT_DEACTIVATED", "ConsultantProfile",
                profile.getId(), null, null);
        return profile;
    }

    @Transactional
    public ConsultantProfile adminUpdate(User actor, String profileId, ConsultantProfileUpdate request) {
        rbacService.require(actor, Permission.CONSULTANT_MANAGE);
        ConsultantProfile profile = require(profileId);
        ConsultantProfile updated = updateOwn(profile.getUser(), request);
        auditService.record("CONSULTANT_PROFILE_ADMIN_EDIT", "ConsultantProfile", profile.getId(), null, null);
        return updated;
    }

    static boolean allowed(ConsultantProfile.Status from, ConsultantProfile.Status to) {
        return switch (to) {
            case UNDER_REVIEW -> from == ConsultantProfile.Status.PENDING_VERIFICATION
                    || from == ConsultantProfile.Status.REJECTED;
            case APPROVED -> from == ConsultantProfile.Status.PENDING_VERIFICATION
                    || from == ConsultantProfile.Status.UNDER_REVIEW
                    || from == ConsultantProfile.Status.REJECTED;
            case ACTIVE -> from == ConsultantProfile.Status.APPROVED || from == ConsultantProfile.Status.SUSPENDED;
            case REJECTED -> from != ConsultantProfile.Status.ACTIVE && from != ConsultantProfile.Status.REJECTED;
            case SUSPENDED -> from == ConsultantProfile.Status.ACTIVE || from == ConsultantProfile.Status.APPROVED;
            case PENDING_VERIFICATION -> false;
        };
    }

    private void notify(ConsultantProfile profile, String eventKey, String message) {
        notificationService.send(profile.getUser(), eventKey,
                Map.of("name", profile.getUser().getName(), "message", message), null);
    }

    private void validateCategories(List<String> slugs) {
        if (slugs == null) {
            return;
        }
        for (String slug : slugs) {
            if (categoryRepository.findBySlug(slug).isEmpty()) {
                throw ApiException.badRequest("UNKNOWN_CATEGORY", "Unknown category " + slug);
            }
        }
    }

    static String mask(String accountNumber) {
        String digits = accountNumber.replaceAll("\\D", "");
        if (digits.length() <= 4) {
            return digits;
        }
        return "X".repeat(digits.length() - 4) + digits.substring(digits.length() - 4);
    }

    private static String trim(String s) {
        return s == null ? null : s.trim();
    }

    private static boolean notBlank(String s) {
        return s != null && !s.isBlank();
    }
}
