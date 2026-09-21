package com.incometax.controller;

import com.incometax.common.ApiResponse;
import com.incometax.common.PageResponse;
import com.incometax.dto.AdminRequests;
import com.incometax.dto.Responses;
import com.incometax.entity.DocumentRecord;
import com.incometax.security.CurrentUser;
import com.incometax.service.DocumentService;
import com.incometax.service.ResponseMapper;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/admin/documents")
@RequiredArgsConstructor
@Tag(name = "Admin documents")
public class AdminDocumentController {

    private final DocumentService documentService;
    private final ResponseMapper responseMapper;
    private final CurrentUser currentUser;

    @GetMapping
    @Operation(summary = "List documents in a given state, newest first")
    public ApiResponse<PageResponse<Responses.DocumentView>> byStatus(
            @RequestParam(defaultValue = "UPLOADED") DocumentRecord.Status status,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "25") int size) {
        return ApiResponse.ok(PageResponse.of(documentService.byStatus(status, currentUser.require(),
                PageRequest.of(page, size, Sort.by(Sort.Direction.DESC, "createdAt"))), responseMapper::document));
    }

    @PostMapping("/{documentId}/verification")
    @Operation(summary = "Approve or reject an uploaded document")
    public ApiResponse<Responses.DocumentView> verify(@PathVariable String documentId,
                                                     @Valid @RequestBody AdminRequests.VerifyDocument request) {
        return ApiResponse.ok(responseMapper.document(documentService.verify(documentId, request.isApprove(),
                request.getReason(), currentUser.require())));
    }
}
