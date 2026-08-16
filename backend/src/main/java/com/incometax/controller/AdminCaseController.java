package com.incometax.controller;

import com.incometax.common.ApiResponse;
import com.incometax.common.PageResponse;
import com.incometax.dto.CaseRequests;
import com.incometax.dto.Responses;
import com.incometax.entity.FilingStatus;
import com.incometax.entity.Priority;
import com.incometax.entity.ReturnType;
import com.incometax.entity.TaxType;
import com.incometax.security.CurrentUser;
import com.incometax.service.CaseSearchCriteria;
import com.incometax.service.FilingCaseService;
import com.incometax.service.QueryService;
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
@RequestMapping("/api/admin/cases")
@RequiredArgsConstructor
@Tag(name = "Admin cases")
public class AdminCaseController {

    private final FilingCaseService filingCaseService;
    private final QueryService queryService;
    private final ResponseMapper responseMapper;
    private final CurrentUser currentUser;

    @GetMapping
    @Operation(summary = "Search and filter the case queue within the caller's scope")
    public ApiResponse<PageResponse<Responses.CaseSummary>> search(
            @RequestParam(required = false) TaxType taxType,
            @RequestParam(required = false) java.util.List<FilingStatus> status,
            @RequestParam(required = false) ReturnType returnType,
            @RequestParam(required = false) Priority priority,
            @RequestParam(required = false) String assignedToId,
            @RequestParam(required = false) String customerId,
            @RequestParam(required = false) String financialYear,
            @RequestParam(required = false) String assessmentYear,
            @RequestParam(required = false) String period,
            @RequestParam(required = false) String state,
            @RequestParam(required = false) String query,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size,
            @RequestParam(defaultValue = "updatedAt") String sortBy) {
        CaseSearchCriteria criteria = CaseSearchCriteria.builder()
                .taxType(taxType)
                .statuses(status)
                .returnType(returnType)
                .priority(priority)
                .assignedToId(assignedToId)
                .customerId(customerId)
                .financialYear(financialYear)
                .assessmentYear(assessmentYear)
                .period(period)
                .state(state)
                .query(query)
                .build();
        return ApiResponse.ok(PageResponse.of(filingCaseService.search(criteria, currentUser.require(),
                PageRequest.of(page, size, Sort.by(Sort.Direction.DESC, sortBy))), responseMapper::filingCase));
    }

    @PostMapping("/{caseId}/assignment")
    @Operation(summary = "Assign a case to a staff member")
    public ApiResponse<Responses.CaseSummary> assign(@PathVariable String caseId,
                                                    @Valid @RequestBody CaseRequests.Assign request) {
        return ApiResponse.ok(responseMapper.filingCase(
                filingCaseService.assign(caseId, request.getAssigneeId(), currentUser.require())));
    }

    @PostMapping("/{caseId}/priority")
    @Operation(summary = "Change case priority")
    public ApiResponse<Responses.CaseSummary> priority(@PathVariable String caseId,
                                                      @Valid @RequestBody CaseRequests.ChangePriority request) {
        return ApiResponse.ok(responseMapper.filingCase(
                filingCaseService.changePriority(caseId, request.getPriority(), currentUser.require())));
    }

    @GetMapping("/queries")
    @Operation(summary = "Query worklist filtered by state")
    public ApiResponse<PageResponse<Responses.QueryView>> queries(
            @RequestParam(defaultValue = "RESPONDED") com.incometax.entity.FilingQuery.Status status,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "25") int size) {
        return ApiResponse.ok(PageResponse.of(queryService.byStatus(status, currentUser.require(),
                PageRequest.of(page, size, Sort.by(Sort.Direction.DESC, "createdAt"))), responseMapper::query));
    }

    @PostMapping("/queries")
    @Operation(summary = "Raise a query with the taxpayer")
    public ApiResponse<Responses.QueryView> raiseQuery(@Valid @RequestBody CaseRequests.RaiseQuery request) {
        return ApiResponse.ok(responseMapper.query(queryService.raise(request.getCaseId(), request.getCategory(),
                request.getQuestion(), request.getPriority(), request.getDueDate(), currentUser.require())));
    }

    @PostMapping("/queries/{queryId}/review")
    @Operation(summary = "Accept or reject a taxpayer's answer")
    public ApiResponse<Responses.QueryView> reviewQuery(@PathVariable String queryId,
                                                       @Valid @RequestBody CaseRequests.ReviewQuery request) {
        return ApiResponse.ok(responseMapper.query(queryService.review(queryId, request.isAccept(),
                request.getNote(), currentUser.require())));
    }
}
