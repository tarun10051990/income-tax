package com.incometax.service;

import com.incometax.dto.GstRequests;
import com.incometax.dto.ProfileRequests;
import com.incometax.entity.GstProfile;
import com.incometax.entity.TaxpayerProfile;
import com.incometax.entity.User;
import com.incometax.exception.ApiException;
import com.incometax.repository.GstProfileRepository;
import com.incometax.repository.TaxpayerProfileRepository;
import com.incometax.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;

@Service
@RequiredArgsConstructor
public class ProfileService {

    private final TaxpayerProfileRepository taxpayerProfileRepository;
    private final GstProfileRepository gstProfileRepository;
    private final UserRepository userRepository;
    private final AuditService auditService;

    public TaxpayerProfile taxpayerProfile(User user) {
        return taxpayerProfileRepository.findByUserId(user.getId())
                .orElseGet(() -> TaxpayerProfile.builder().user(user).build());
    }

    @Transactional
    public TaxpayerProfile updateTaxpayerProfile(User user, ProfileRequests.UpdateTaxpayerProfile request) {
        TaxpayerProfile profile = taxpayerProfileRepository.findByUserId(user.getId())
                .orElseGet(() -> TaxpayerProfile.builder().user(user).build());

        if (request.getPan() != null) {
            taxpayerProfileRepository.findByPan(request.getPan())
                    .filter(existing -> !existing.getUser().getId().equals(user.getId()))
                    .ifPresent(existing -> {
                        throw ApiException.conflict("PAN_ALREADY_REGISTERED",
                                "That PAN belongs to another account");
                    });
            profile.setPan(request.getPan().toUpperCase());
            user.setPan(request.getPan().toUpperCase());
            userRepository.save(user);
        }
        if (request.getAadhaarLastFour() != null) {
            profile.setAadhaarLastFour(request.getAadhaarLastFour());
        }
        if (request.getTaxpayerType() != null) {
            profile.setTaxpayerType(request.getTaxpayerType());
        }
        profile.setDateOfBirth(request.getDateOfBirth() == null ? profile.getDateOfBirth()
                : request.getDateOfBirth());
        profile.setAddressLine1(orExisting(request.getAddressLine1(), profile.getAddressLine1()));
        profile.setAddressLine2(orExisting(request.getAddressLine2(), profile.getAddressLine2()));
        profile.setCity(orExisting(request.getCity(), profile.getCity()));
        profile.setState(orExisting(request.getState(), profile.getState()));
        profile.setPincode(orExisting(request.getPincode(), profile.getPincode()));
        profile.setBankAccountNumber(orExisting(request.getBankAccountNumber(), profile.getBankAccountNumber()));
        profile.setBankIfsc(orExisting(request.getBankIfsc(), profile.getBankIfsc()));
        profile.setBankName(orExisting(request.getBankName(), profile.getBankName()));
        if (request.getMetroCity() != null) {
            profile.setMetroCity(request.getMetroCity());
        }
        profile.setUpdatedAt(LocalDateTime.now());

        TaxpayerProfile saved = taxpayerProfileRepository.save(profile);
        auditService.record("TAXPAYER_PROFILE_UPDATED", "TaxpayerProfile", saved.getId(), null, null);
        return saved;
    }

    public List<GstProfile> gstProfiles(User user) {
        return gstProfileRepository.findByUserId(user.getId());
    }

    public GstProfile requireGstProfile(String profileId, User user) {
        GstProfile profile = gstProfileRepository.findById(profileId)
                .orElseThrow(() -> ApiException.notFound("GST profile", profileId));
        if (!profile.getUser().getId().equals(user.getId()) && user.isCustomer()) {
            throw ApiException.forbidden("That GST registration belongs to another account");
        }
        return profile;
    }

    @Transactional
    public GstProfile upsertGstProfile(User user, String profileId, GstRequests.UpsertProfile request) {
        GstProfile profile = profileId == null
                ? GstProfile.builder().user(user).build()
                : requireGstProfile(profileId, user);

        gstProfileRepository.findByGstin(request.getGstin().toUpperCase())
                .filter(existing -> !existing.getId().equals(profile.getId()))
                .ifPresent(existing -> {
                    throw ApiException.conflict("GSTIN_ALREADY_REGISTERED",
                            "That GSTIN is already registered on the platform");
                });

        profile.setGstin(request.getGstin().toUpperCase());
        profile.setLegalName(request.getLegalName());
        profile.setTradeName(request.getTradeName());
        profile.setBusinessType(request.getBusinessType());
        profile.setBusinessActivity(request.getBusinessActivity());
        profile.setRegisteredAddress(request.getRegisteredAddress());
        profile.setState(request.getState());
        profile.setAuthorizedSignatory(request.getAuthorizedSignatory());
        profile.setSignatoryDesignation(request.getSignatoryDesignation());
        profile.setBankAccountNumber(request.getBankAccountNumber());
        profile.setBankIfsc(request.getBankIfsc());
        profile.setRegistrationDate(request.getRegistrationDate());
        if (request.getCompositionScheme() != null) {
            profile.setCompositionScheme(request.getCompositionScheme());
        }
        profile.setUpdatedAt(LocalDateTime.now());

        GstProfile saved = gstProfileRepository.save(profile);
        auditService.record(profileId == null ? "GST_PROFILE_CREATED" : "GST_PROFILE_UPDATED",
                "GstProfile", saved.getId(), null, Map.of("gstin", saved.getGstin()));
        return saved;
    }

    private String orExisting(String candidate, String existing) {
        return candidate == null ? existing : candidate;
    }
}
