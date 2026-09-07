package com.incometax.controller;

import com.incometax.common.ApiResponse;
import com.incometax.common.PageResponse;
import com.incometax.dto.CaseRequests;
import com.incometax.dto.Responses;
import com.incometax.entity.FilingStatus;
import com.incometax.entity.TaxType;
import com.incometax.entity.User;
import com.incometax.security.CurrentUser;
import com.incometax.service.CaseSearchCriteria;
import com.incometax.service.DocumentService;
import com.incometax.service.FilingCaseService;
import com.incometax.service.QueryService;
import com.incometax.service.ResponseMapper;
import com.incometax.service.WorkflowService;
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

import java.util.List;

/** Case endpoints shared by both portals; the service layer scopes results to the caller. */
@RestController
@RequestMapping("/api/cases")
@RequiredArgsConstructor
@Tag(name = "Filing cases")
public class CaseController {

    private final FilingCaseService filingCaseService;
    private final WorkflowService workflowService;
    private final DocumentService documentService;
    private final QueryService queryService;
    private final ResponseMapper responseMapper;
    private final CurrentUser currentUser;

    @GetMapping
    @Operation(summary = "Search cases visible to the caller")
    public ApiResponse<PageResponse<Responses.CaseSummary>> search(
            @RequestParam(required = false) TaxType taxType,
            @RequestParam(required = false) List<FilingStatus> status,
            @RequestParam(required = false) String query,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {
        CaseSearchCriteria criteria = CaseSearchCriteria.builder()
                .taxType(taxType)
                .statuses(status)
                .query(query)
                .build();
        return ApiResponse.ok(PageResponse.of(filingCaseService.search(criteria, currentUser.require(),
                        PageRequest.of(page, size, Sort.by(Sort.Direction.DESC, "updatedAt"))),
                responseMapper::filingCase));
    }

    @GetMapping("/{caseId}")
    @Operation(summary = "Case detail with documents, queries, comments, history and allowed transitions")
    public ApiResponse<Responses.CaseDetail> detail(@PathVariable String caseId) {
        User actor = currentUser.require();
        var filingCase = filingCaseService.requireReadable(caseId, actor);
        return ApiResponse.ok(new Responses.CaseDetail(
                responseMapper.filingCase(filingCase),
                null,
                null,
                documentService.forCase(caseId, actor).stream().map(responseMapper::document).toList(),
                queryService.forCase(caseId, actor).stream().map(responseMapper::query).toList(),
                filingCaseService.comments(caseId, actor).stream().map(responseMapper::comment).toList(),
                filingCaseService.events(caseId, actor).stream().map(responseMapper::event).toList(),
                workflowService.availableTransitions(filingCase, actor).stream()
                        .map(transition -> transition.to().name())
                        .toList()));
    }

    @PostMapping("/{caseId}/transitions")
    @Operation(summary = "Move a case to another status if the workflow configuration allows it")
    public ApiResponse<Responses.CaseSummary> transition(@PathVariable String caseId,
                                                        @Valid @RequestBody CaseRequests.Transition request) {
        User actor = currentUser.require();
        var filingCase = filingCaseService.requireReadable(caseId, actor);
        return ApiResponse.ok(responseMapper.filingCase(workflowService.transition(
                filingCase, request.getTargetStatus(), actor, request.getNote())));
    }

    @PostMapping("/{caseId}/comments")
    @Operation(summary = "Add a comment; internal comments are never shown to the taxpayer")
    public ApiResponse<Responses.CommentView> comment(@PathVariable String caseId,
                                                     @Valid @RequestBody CaseRequests.AddComment request) {
        User actor = currentUser.require();
        boolean internal = actor.isStaff() && request.isInternal();
        return ApiResponse.ok(responseMapper.comment(
                filingCaseService.addComment(caseId, request.getMessage(), internal, actor)));
    }
}
