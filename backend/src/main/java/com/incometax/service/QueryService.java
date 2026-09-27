package com.incometax.service;

import com.incometax.entity.DocumentRecord;
import com.incometax.entity.FilingCase;
import com.incometax.entity.FilingQuery;
import com.incometax.entity.FilingStatus;
import com.incometax.entity.Priority;
import com.incometax.entity.QueryResponse;
import com.incometax.entity.User;
import com.incometax.exception.ApiException;
import com.incometax.repository.DocumentRepository;
import com.incometax.repository.FilingQueryRepository;
import com.incometax.security.Permission;
import com.incometax.security.RbacService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;

@Service
@RequiredArgsConstructor
public class QueryService {

    private final FilingQueryRepository queryRepository;
    private final DocumentRepository documentRepository;
    private final FilingCaseService filingCaseService;
    private final WorkflowService workflowService;
    private final RbacService rbacService;
    private final AuditService auditService;
    private final NotificationService notificationService;

    @Transactional
    public FilingQuery raise(String caseId, FilingQuery.Category category, String question, Priority priority,
                            LocalDate dueDate, User actor) {
        rbacService.require(actor, Permission.QUERY_RAISE);
        FilingCase filingCase = filingCaseService.requireReadable(caseId, actor);

        FilingQuery query = queryRepository.save(FilingQuery.builder()
                .queryNumber(nextQueryNumber())
                .filingCase(filingCase)
                .raisedBy(actor)
                .category(category)
                .question(question)
                .priority(priority == null ? Priority.MEDIUM : priority)
                .dueDate(dueDate)
                .build());

        auditService.record("QUERY_RAISED", "FilingQuery", query.getId(), null,
                Map.of("caseId", caseId, "category", category.name()));
        notificationService.notifyQueryRaised(query);

        if (workflowService.transitions(filingCase.getTaxType(), filingCase.getStatus()).stream()
                .anyMatch(transition -> transition.to() == FilingStatus.QUERY_RAISED)) {
            workflowService.transition(filingCase, FilingStatus.QUERY_RAISED, actor,
                    "Query " + query.getQueryNumber() + " raised");
        }
        return query;
    }

    @Transactional
    public QueryResponse respond(String queryId, String message, String documentId, User actor) {
        FilingQuery query = require(queryId);
        FilingCase filingCase = filingCaseService.requireReadable(query.getFilingCase().getId(), actor);
        rbacService.require(actor, Permission.QUERY_RESPOND);

        DocumentRecord document = documentId == null ? null : documentRepository.findById(documentId)
                .orElseThrow(() -> ApiException.notFound("Document", documentId));

        QueryResponse response = QueryResponse.builder()
                .query(query)
                .respondedBy(actor)
                .message(message)
                .document(document)
                .build();
        query.getResponses().add(response);
        query.setStatus(FilingQuery.Status.RESPONDED);
        queryRepository.save(query);

        auditService.record("QUERY_RESPONDED", "FilingQuery", queryId, null, Map.of("caseId", filingCase.getId()));
        notificationService.notifyQueryAnswered(query, filingCase.getAssignedTo());
        return response;
    }

    @Transactional
    public FilingQuery review(String queryId, boolean accept, String note, User actor) {
        rbacService.require(actor, Permission.QUERY_REVIEW);
        FilingQuery query = require(queryId);
        if (query.getStatus() != FilingQuery.Status.RESPONDED) {
            throw ApiException.badRequest("QUERY_NOT_RESPONDED",
                    "Only a responded query can be accepted or rejected");
        }
        FilingQuery.Status previous = query.getStatus();
        query.setStatus(accept ? FilingQuery.Status.ACCEPTED : FilingQuery.Status.REJECTED);
        if (accept) {
            query.setClosedAt(LocalDateTime.now());
        }
        FilingQuery saved = queryRepository.save(query);
        auditService.record(accept ? "QUERY_ACCEPTED" : "QUERY_REJECTED", "FilingQuery", queryId,
                previous.name(), saved.getStatus().name());
        return saved;
    }

    /** Query worklist for reviewers, restricted to the tax type the caller may work on. */
    public org.springframework.data.domain.Page<FilingQuery> byStatus(
            FilingQuery.Status status, User actor, org.springframework.data.domain.Pageable pageable) {
        rbacService.require(actor, Permission.CASE_READ_ALL);
        com.incometax.entity.TaxType scope = switch (actor.getRole()) {
            case TAX_PROFESSIONAL -> com.incometax.entity.TaxType.INCOME_TAX;
            case GST_PROFESSIONAL -> com.incometax.entity.TaxType.GST;
            default -> null;
        };
        return scope == null
                ? queryRepository.findByStatus(status, pageable)
                : queryRepository.findByStatusAndFilingCaseTaxType(status, scope, pageable);
    }

    public List<FilingQuery> forCase(String caseId, User actor) {
        filingCaseService.requireReadable(caseId, actor);
        return queryRepository.findByFilingCaseIdOrderByCreatedAtDesc(caseId);
    }

    public FilingQuery require(String queryId) {
        return queryRepository.findById(queryId)
                .orElseThrow(() -> ApiException.notFound("Query", queryId));
    }

    private String nextQueryNumber() {
        long sequence = queryRepository.count() + 10001;
        return "QRY-" + sequence;
    }
}
