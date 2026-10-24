package com.incometax.controller;

import com.incometax.common.ApiResponse;
import com.incometax.dto.CaseRequests;
import com.incometax.dto.Responses;
import com.incometax.security.CurrentUser;
import com.incometax.service.QueryService;
import com.incometax.service.ResponseMapper;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/queries")
@RequiredArgsConstructor
@Tag(name = "Queries")
public class QueryController {

    private final QueryService queryService;
    private final ResponseMapper responseMapper;
    private final CurrentUser currentUser;

    @GetMapping
    @Operation(summary = "Queries raised on a case")
    public ApiResponse<List<Responses.QueryView>> forCase(@RequestParam String caseId) {
        return ApiResponse.ok(queryService.forCase(caseId, currentUser.require()).stream()
                .map(responseMapper::query)
                .toList());
    }

    @PostMapping("/{queryId}/responses")
    @Operation(summary = "Answer a query, optionally attaching an uploaded document")
    public ApiResponse<Responses.QueryResponseView> respond(@PathVariable String queryId,
                                                           @Valid @RequestBody CaseRequests.RespondToQuery request) {
        return ApiResponse.ok(responseMapper.queryResponse(queryService.respond(
                queryId, request.getMessage(), request.getDocumentId(), currentUser.require())));
    }
}
