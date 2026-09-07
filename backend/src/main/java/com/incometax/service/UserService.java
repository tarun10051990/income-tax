package com.incometax.service;

import com.incometax.dto.AdminAuthRequest;
import com.incometax.dto.AuthRequest;
import com.incometax.dto.AuthResponse;
import com.incometax.dto.RegisterRequest;
import com.incometax.entity.User;
import com.incometax.exception.ApiException;
import com.incometax.repository.UserRepository;
import com.incometax.security.JwtUtil;
import com.incometax.security.Permission;
import com.incometax.security.RbacService;
import com.incometax.security.TotpUtil;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.Map;
import java.util.Optional;

@Service
@RequiredArgsConstructor
public class UserService {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtUtil jwtUtil;
    private final RbacService rbacService;
    private final AuditService auditService;

    @Value("${jwt.expiration}")
    private long tokenTtl;

    @Value("${jwt.admin-expiration}")
    private long adminTokenTtl;

    @Transactional
    public AuthResponse register(RegisterRequest request) {
        if (userRepository.existsByEmail(request.getEmail())) {
            throw ApiException.conflict("EMAIL_ALREADY_REGISTERED", "That email address is already registered");
        }
        if (userRepository.existsByPan(request.getPan())) {
            throw ApiException.conflict("PAN_ALREADY_REGISTERED", "That PAN is already registered");
        }

        User user = userRepository.save(User.builder()
                .name(request.getName())
                .email(request.getEmail().toLowerCase())
                .phone(request.getPhone())
                .pan(request.getPan().toUpperCase())
                .password(passwordEncoder.encode(request.getPassword()))
                .role(User.Role.USER)
                .build());

        auditService.record("USER_REGISTERED", "User", user.getId(), null, Map.of("role", user.getRole().name()));
        return response(user, tokenTtl);
    }

    /** Customer portal login; staff accounts must use the administrative endpoint. */
    @Transactional
    public AuthResponse login(AuthRequest request) {
        User user = authenticate(request.getEmail(), request.getPassword());
        if (user.isStaff()) {
            throw ApiException.forbidden("Staff accounts must sign in through the administration portal");
        }
        if (user.isConsultant()) {
            throw ApiException.forbidden("Professional accounts must sign in through the consultant portal");
        }
        return response(touchLogin(user), tokenTtl);
    }

    /** Consultant portal login; only marketplace professionals may use it. */
    @Transactional
    public AuthResponse consultantLogin(AuthRequest request) {
        User user = authenticate(request.getEmail(), request.getPassword());
        if (!user.isConsultant()) {
            throw ApiException.forbidden("This portal is restricted to registered professionals");
        }
        auditService.record("CONSULTANT_LOGIN", "User", user.getId(), null, null);
        return response(touchLogin(user), tokenTtl);
    }

    /** Issues a session for a freshly created account (used by consultant registration). */
    public AuthResponse sessionFor(User user) {
        return response(user, tokenTtl);
    }

    /** Administration portal login; every staff account is MFA protected. */
    @Transactional
    public AuthResponse adminLogin(AdminAuthRequest request) {
        User user = authenticate(request.getEmail(), request.getPassword());
        if (!user.isStaff()) {
            throw ApiException.forbidden("This portal is restricted to staff accounts");
        }

        if (user.getMfaSecret() == null) {
            user.setMfaSecret(TotpUtil.generateSecret());
            userRepository.save(user);
        }
        if (!user.isMfaEnabled()) {
            // Enrolment token: only the MFA enrolment endpoint accepts it, enforced by the controller.
            auditService.record("ADMIN_MFA_ENROLMENT_STARTED", "User", user.getId(), null, null);
            return AuthResponse.builder()
                    .token(jwtUtil.generateToken(user.getEmail(), user.getRole().name(), adminTokenTtl))
                    .id(user.getId())
                    .name(user.getName())
                    .email(user.getEmail())
                    .role(user.getRole().name())
                    .mfaEnabled(false)
                    .mfaEnrolmentRequired(true)
                    .mfaSecret(user.getMfaSecret())
                    .expiresInMs(adminTokenTtl)
                    .build();
        }
        if (!TotpUtil.verify(user.getMfaSecret(), request.getTotpCode())) {
            auditService.record("ADMIN_MFA_FAILED", "User", user.getId(), null, null);
            throw ApiException.unauthorized("The authenticator code is incorrect or expired");
        }

        auditService.record("ADMIN_LOGIN", "User", user.getId(), null, Map.of("role", user.getRole().name()));
        return response(touchLogin(user), adminTokenTtl);
    }

    @Transactional
    public AuthResponse completeMfaEnrolment(User user, String totpCode) {
        if (user.getMfaSecret() == null || !TotpUtil.verify(user.getMfaSecret(), totpCode)) {
            throw ApiException.unauthorized("The authenticator code is incorrect or expired");
        }
        user.setMfaEnabled(true);
        userRepository.save(user);
        auditService.record("ADMIN_MFA_ENABLED", "User", user.getId(), null, null);
        return response(touchLogin(user), adminTokenTtl);
    }

    public Optional<User> findByEmail(String email) {
        return userRepository.findByEmail(email);
    }

    private User authenticate(String email, String rawPassword) {
        User user = userRepository.findByEmail(email == null ? null : email.toLowerCase())
                .orElseThrow(() -> ApiException.unauthorized("Invalid email or password"));
        if (!user.isActive()) {
            throw ApiException.forbidden("This account has been deactivated");
        }
        if (!passwordEncoder.matches(rawPassword, user.getPassword())) {
            auditService.record("LOGIN_FAILED", "User", user.getId(), null, null);
            throw ApiException.unauthorized("Invalid email or password");
        }
        return user;
    }

    private User touchLogin(User user) {
        user.setLastLoginAt(LocalDateTime.now());
        return userRepository.save(user);
    }

    private AuthResponse response(User user, long ttl) {
        return AuthResponse.builder()
                .token(jwtUtil.generateToken(user.getEmail(), user.getRole().name(), ttl))
                .id(user.getId())
                .name(user.getName())
                .email(user.getEmail())
                .role(user.getRole().name())
                .mfaEnabled(user.isMfaEnabled())
                .permissions(rbacService.permissionsFor(user.getRole()).stream()
                        .map(Permission::name)
                        .sorted()
                        .toList())
                .expiresInMs(ttl)
                .build();
    }
}
