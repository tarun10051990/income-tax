package com.incometax.service;

import com.incometax.dto.AdminRequests;
import com.incometax.entity.User;
import com.incometax.exception.ApiException;
import com.incometax.repository.UserRepository;
import com.incometax.security.Permission;
import com.incometax.security.RbacService;
import com.incometax.security.TotpUtil;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Arrays;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

@Service
@RequiredArgsConstructor
public class StaffUserService {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final RbacService rbacService;
    private final AuditService auditService;

    public List<User> staff(User actor) {
        rbacService.require(actor, Permission.USER_MANAGE);
        return userRepository.findByRoleIn(Arrays.stream(User.Role.values())
                .filter(role -> role != User.Role.USER)
                .toList());
    }

    public Page<User> customers(String query, User actor, Pageable pageable) {
        if (!rbacService.has(actor, Permission.USER_MANAGE) && !rbacService.has(actor, Permission.CASE_READ_ALL)) {
            throw ApiException.forbidden("You may not browse taxpayer accounts");
        }
        return query == null || query.isBlank()
                ? userRepository.findByRole(User.Role.USER, pageable)
                : userRepository.searchByRole(User.Role.USER, query, pageable);
    }

    public User require(String userId, User actor) {
        if (!rbacService.has(actor, Permission.USER_MANAGE) && !rbacService.has(actor, Permission.CASE_READ_ALL)) {
            throw ApiException.forbidden("You may not view user accounts");
        }
        return userRepository.findById(userId).orElseThrow(() -> ApiException.notFound("User", userId));
    }

    @Transactional
    public User createStaff(AdminRequests.CreateStaffUser request, User actor) {
        rbacService.require(actor, Permission.USER_MANAGE);
        if (request.getRole() == User.Role.USER) {
            throw ApiException.badRequest("INVALID_ROLE", "Taxpayers register themselves through the portal");
        }
        if (request.getRole() == User.Role.SUPER_ADMIN && actor.getRole() != User.Role.SUPER_ADMIN) {
            throw ApiException.forbidden("Only a super administrator can create another super administrator");
        }
        if (userRepository.existsByEmail(request.getEmail())) {
            throw ApiException.conflict("EMAIL_ALREADY_REGISTERED", "That email address is already registered");
        }

        User user = userRepository.save(User.builder()
                .name(request.getName())
                .email(request.getEmail().toLowerCase())
                .phone(request.getPhone())
                .password(passwordEncoder.encode(request.getPassword()))
                .role(request.getRole())
                .onboardingComplete(true)
                // MFA is enabled by the staff member when they enrol an authenticator at first sign in.
                .mfaSecret(TotpUtil.generateSecret())
                .build());

        auditService.record("STAFF_USER_CREATED", "User", user.getId(), null,
                Map.of("role", user.getRole().name()));
        return user;
    }

    @Transactional
    public User update(String userId, AdminRequests.UpdateUser request, User actor) {
        rbacService.require(actor, Permission.USER_MANAGE);
        User user = userRepository.findById(userId)
                .orElseThrow(() -> ApiException.notFound("User", userId));
        String before = user.getRole().name() + "/" + user.isActive();

        if (request.getName() != null) {
            user.setName(request.getName());
        }
        if (request.getPhone() != null) {
            user.setPhone(request.getPhone());
        }
        if (request.getRole() != null && request.getRole() != user.getRole()) {
            if (request.getRole() == User.Role.SUPER_ADMIN && actor.getRole() != User.Role.SUPER_ADMIN) {
                throw ApiException.forbidden("Only a super administrator can grant that role");
            }
            user.setRole(request.getRole());
        }
        if (request.getActive() != null) {
            if (!request.getActive() && user.getId().equals(actor.getId())) {
                throw ApiException.badRequest("CANNOT_DEACTIVATE_SELF",
                        "You cannot deactivate your own account");
            }
            user.setActive(request.getActive());
        }

        User saved = userRepository.save(user);
        auditService.record("USER_UPDATED", "User", saved.getId(), before,
                Map.of("role", saved.getRole().name(), "active", String.valueOf(saved.isActive())));
        return saved;
    }

    @Transactional
    public User resetMfa(String userId, User actor) {
        rbacService.require(actor, Permission.USER_MANAGE);
        User user = userRepository.findById(userId)
                .orElseThrow(() -> ApiException.notFound("User", userId));
        user.setMfaSecret(TotpUtil.generateSecret());
        user.setMfaEnabled(false);
        User saved = userRepository.save(user);
        auditService.record("USER_MFA_RESET", "User", saved.getId(), null, null);
        return saved;
    }

    public Map<String, List<String>> roleMatrix(User actor) {
        rbacService.require(actor, Permission.USER_MANAGE);
        Map<String, List<String>> matrix = new LinkedHashMap<>();
        for (User.Role role : User.Role.values()) {
            matrix.put(role.name(), rbacService.permissionsFor(role).stream()
                    .map(Permission::name)
                    .sorted()
                    .toList());
        }
        return matrix;
    }
}
