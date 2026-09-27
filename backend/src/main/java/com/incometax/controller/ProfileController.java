package com.incometax.controller;

import com.incometax.common.ApiResponse;
import com.incometax.dto.GstRequests;
import com.incometax.dto.ProfileRequests;
import com.incometax.dto.Responses;
import com.incometax.security.CurrentUser;
import com.incometax.service.ProfileService;
import com.incometax.service.ResponseMapper;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/profile")
@RequiredArgsConstructor
@Tag(name = "Taxpayer profile")
public class ProfileController {

    private final ProfileService profileService;
    private final ResponseMapper responseMapper;
    private final CurrentUser currentUser;

    @GetMapping
    @Operation(summary = "Signed in taxpayer's profile")
    public ApiResponse<Responses.TaxpayerProfileView> profile() {
        return ApiResponse.ok(responseMapper.taxpayerProfile(
                profileService.taxpayerProfile(currentUser.require())));
    }

    @PutMapping
    @Operation(summary = "Update the taxpayer profile; only the last four Aadhaar digits are accepted")
    public ApiResponse<Responses.TaxpayerProfileView> update(
            @Valid @RequestBody ProfileRequests.UpdateTaxpayerProfile request) {
        return ApiResponse.ok(responseMapper.taxpayerProfile(
                profileService.updateTaxpayerProfile(currentUser.require(), request)));
    }

    @GetMapping("/gst")
    @Operation(summary = "GST registrations held by the signed in taxpayer")
    public ApiResponse<List<Responses.GstProfileView>> gstProfiles() {
        return ApiResponse.ok(profileService.gstProfiles(currentUser.require()).stream()
                .map(responseMapper::gstProfile)
                .toList());
    }

    @PostMapping("/gst")
    @Operation(summary = "Add a GST registration")
    public ApiResponse<Responses.GstProfileView> createGstProfile(
            @Valid @RequestBody GstRequests.UpsertProfile request) {
        return ApiResponse.ok(responseMapper.gstProfile(
                profileService.upsertGstProfile(currentUser.require(), null, request)));
    }

    @PutMapping("/gst/{profileId}")
    @Operation(summary = "Update a GST registration")
    public ApiResponse<Responses.GstProfileView> updateGstProfile(
            @PathVariable String profileId, @Valid @RequestBody GstRequests.UpsertProfile request) {
        return ApiResponse.ok(responseMapper.gstProfile(
                profileService.upsertGstProfile(currentUser.require(), profileId, request)));
    }
}
