package com.incometax.controller;

import com.incometax.common.ApiResponse;
import com.incometax.dto.AdminAuthRequest;
import com.incometax.dto.AuthRequest;
import com.incometax.dto.AuthResponse;
import com.incometax.dto.MfaEnrolmentRequest;
import com.incometax.dto.RegisterRequest;
import com.incometax.security.CurrentUser;
import com.incometax.service.UserService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/auth")
@RequiredArgsConstructor
@Tag(name = "Authentication")
public class AuthController {

    private final UserService userService;
    private final CurrentUser currentUser;

    @PostMapping("/register")
    @Operation(summary = "Register a taxpayer account")
    public ApiResponse<AuthResponse> register(@Valid @RequestBody RegisterRequest request) {
        return ApiResponse.ok(userService.register(request));
    }

    @PostMapping("/login")
    @Operation(summary = "Taxpayer login")
    public ApiResponse<AuthResponse> login(@Valid @RequestBody AuthRequest request) {
        return ApiResponse.ok(userService.login(request));
    }

    @PostMapping("/admin/login")
    @Operation(summary = "Staff login; returns an MFA enrolment payload until MFA is enabled")
    public ApiResponse<AuthResponse> adminLogin(@Valid @RequestBody AdminAuthRequest request) {
        return ApiResponse.ok(userService.adminLogin(request));
    }

    @PostMapping("/admin/mfa/enrol")
    @Operation(summary = "Confirm an authenticator app and enable MFA on the signed in staff account")
    public ApiResponse<AuthResponse> enrolMfa(@Valid @RequestBody MfaEnrolmentRequest request) {
        return ApiResponse.ok(userService.completeMfaEnrolment(currentUser.require(), request.getTotpCode()));
    }
}
