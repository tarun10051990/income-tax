package com.incometax.controller;

import com.incometax.common.ApiResponse;
import com.incometax.dto.Responses;
import com.incometax.entity.DocumentRecord;
import com.incometax.security.CurrentUser;
import com.incometax.service.DocumentService;
import com.incometax.service.ResponseMapper;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.core.io.InputStreamResource;
import org.springframework.http.ContentDisposition;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RequestPart;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

import java.time.LocalDate;
import java.util.List;

@RestController
@RequestMapping("/api/documents")
@RequiredArgsConstructor
@Tag(name = "Documents")
public class DocumentController {

    private final DocumentService documentService;
    private final ResponseMapper responseMapper;
    private final CurrentUser currentUser;

    @PostMapping(consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    @Operation(summary = "Upload a document; the file is type checked, size checked and scanned")
    public ApiResponse<Responses.DocumentView> upload(
            @RequestPart("file") MultipartFile file,
            @RequestParam String caseId,
            @RequestParam DocumentRecord.DocumentCategory category,
            @RequestParam(required = false) LocalDate expiresOn,
            @RequestParam(required = false) String supersedesDocumentId) {
        return ApiResponse.ok(responseMapper.document(documentService.upload(
                file, caseId, category, expiresOn, supersedesDocumentId, currentUser.require())));
    }

    @GetMapping
    @Operation(summary = "Documents attached to a case")
    public ApiResponse<List<Responses.DocumentView>> forCase(@RequestParam String caseId) {
        return ApiResponse.ok(documentService.forCase(caseId, currentUser.require()).stream()
                .map(responseMapper::document)
                .toList());
    }

    @GetMapping("/{documentId}/content")
    @Operation(summary = "Download a document")
    public ResponseEntity<InputStreamResource> download(@PathVariable String documentId) {
        var actor = currentUser.require();
        DocumentRecord record = documentService.requireReadable(documentId, actor);
        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_DISPOSITION, ContentDisposition.attachment()
                        .filename(record.getFileName())
                        .build()
                        .toString())
                .contentType(MediaType.parseMediaType(record.getContentType()))
                .body(new InputStreamResource(documentService.content(documentId, actor)));
    }
}
