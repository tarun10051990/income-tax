package com.incometax.controller;

import com.incometax.common.ApiResponse;
import com.incometax.common.PageResponse;
import com.incometax.dto.AdminRequests;
import com.incometax.dto.Responses;
import com.incometax.entity.User;
import com.incometax.security.CurrentUser;
import com.incometax.service.ResponseMapper;
import com.incometax.service.StaffUserService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/admin/users")
@RequiredArgsConstructor
@Tag(name = "Admin users and roles")
public class AdminUserController {

    private final StaffUserService staffUserService;
    private final ResponseMapper responseMapper;
    private final CurrentUser currentUser;

    @GetMapping("/staff")
    @Operation(summary = "List staff accounts")
    public ApiResponse<List<Responses.UserSummary>> staff() {
        return ApiResponse.ok(staffUserService.staff(currentUser.require()).stream()
                .map(responseMapper::user)
                .toList());
    }

    @GetMapping("/customers")
    @Operation(summary = "Search taxpayer accounts")
    public ApiResponse<PageResponse<Responses.UserSummary>> customers(
            @RequestParam(required = false) String query,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {
        return ApiResponse.ok(PageResponse.of(staffUserService.customers(query, currentUser.require(),
                PageRequest.of(page, size, Sort.by(Sort.Direction.DESC, "createdAt"))), responseMapper::user));
    }

    @PostMapping("/staff")
    @Operation(summary = "Create a staff account; MFA enrolment is required at first sign in")
    public ApiResponse<Responses.UserSummary> createStaff(
            @Valid @RequestBody AdminRequests.CreateStaffUser request) {
        return ApiResponse.ok(responseMapper.user(staffUserService.createStaff(request, currentUser.require())));
    }

    @PutMapping("/{userId}")
    @Operation(summary = "Update a user's name, phone, role or active flag")
    public ApiResponse<Responses.UserSummary> update(@PathVariable String userId,
                                                    @Valid @RequestBody AdminRequests.UpdateUser request) {
        return ApiResponse.ok(responseMapper.user(staffUserService.update(userId, request, currentUser.require())));
    }

    @PostMapping("/{userId}/mfa/reset")
    @Operation(summary = "Reset MFA so the staff member enrols a new authenticator at next sign in")
    public ApiResponse<Responses.UserSummary> resetMfa(@PathVariable String userId) {
        return ApiResponse.ok(responseMapper.user(staffUserService.resetMfa(userId, currentUser.require())));
    }

    @GetMapping("/roles")
    @Operation(summary = "Role to permission matrix")
    public ApiResponse<Map<String, List<String>>> roles() {
        return ApiResponse.ok(staffUserService.roleMatrix(currentUser.require()));
    }

    @GetMapping("/{userId}")
    @Operation(summary = "A single user account")
    public ApiResponse<Responses.UserSummary> user(@PathVariable String userId) {
        User user = staffUserService.require(userId, currentUser.require());
        return ApiResponse.ok(responseMapper.user(user));
    }
}
