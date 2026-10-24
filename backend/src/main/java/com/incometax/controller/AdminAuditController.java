package com.incometax.controller;

import com.incometax.common.ApiResponse;
import com.incometax.common.PageResponse;
import com.incometax.dto.Responses;
import com.incometax.security.CurrentUser;
import com.incometax.security.Permission;
import com.incometax.security.RbacService;
import com.incometax.repository.AuditLogRepository;
import com.incometax.service.ResponseMapper;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

/** Audit records are append only; there is deliberately no update or delete endpoint. */
@RestController
@RequestMapping("/api/admin/audit-logs")
@RequiredArgsConstructor
@Tag(name = "Admin audit trail")
public class AdminAuditController {

    private final AuditLogRepository auditLogRepository;
    private final ResponseMapper responseMapper;
    private final RbacService rbacService;
    private final CurrentUser currentUser;

    @GetMapping
    @Operation(summary = "Search the immutable audit trail")
    public ApiResponse<PageResponse<Responses.AuditView>> search(
            @RequestParam(required = false) String entityType,
            @RequestParam(required = false) String entityId,
            @RequestParam(required = false) String action,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "50") int size) {
        rbacService.require(currentUser.require(), Permission.AUDIT_READ);
        var pageable = PageRequest.of(page, size, Sort.by(Sort.Direction.DESC, "createdAt"));
        var results = auditLogRepository.search(
                blankToNull(entityType), blankToNull(entityId), blankToNull(action), pageable);
        return ApiResponse.ok(PageResponse.of(results, responseMapper::audit));
    }

    private String blankToNull(String value) {
        return value == null || value.isBlank() ? null : value;
    }
}
