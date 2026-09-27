package com.incometax.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.incometax.entity.CaseEvent;
import com.incometax.entity.FilingCase;
import com.incometax.entity.FilingStatus;
import com.incometax.entity.TaxType;
import com.incometax.entity.User;
import com.incometax.exception.ApiException;
import com.incometax.repository.CaseEventRepository;
import com.incometax.repository.FilingCaseRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

/**
 * Status transitions are configuration (tax rule {@code workflow.INCOME_TAX} /
 * {@code workflow.GST}), not code. The engine refuses any transition that the configuration
 * does not declare for the caller's role, and records an immutable case event plus audit entry
 * for the ones it accepts.
 */
@Service
@RequiredArgsConstructor
public class WorkflowService {

    private final TaxRuleService taxRuleService;
    private final FilingCaseRepository filingCaseRepository;
    private final CaseEventRepository caseEventRepository;
    private final AuditService auditService;
    private final NotificationService notificationService;

    public List<Transition> transitions(TaxType taxType, FilingStatus from) {
        JsonNode configuration = taxRuleService.configuration(
                TaxRuleService.WORKFLOW_PREFIX + taxType.name(), LocalDate.now());
        List<Transition> transitions = new ArrayList<>();
        for (JsonNode node : configuration.path("transitions")) {
            if (!node.path("from").asText().equals(from.name())) {
                continue;
            }
            List<String> roles = new ArrayList<>();
            node.path("roles").forEach(role -> roles.add(role.asText()));
            transitions.add(new Transition(
                    FilingStatus.valueOf(node.path("from").asText()),
                    FilingStatus.valueOf(node.path("to").asText()),
                    node.path("action").asText(),
                    roles));
        }
        return transitions;
    }

    public List<Transition> availableTransitions(FilingCase filingCase, User actor) {
        return transitions(filingCase.getTaxType(), filingCase.getStatus()).stream()
                .filter(transition -> transition.roles().contains(actor.getRole().name()))
                .toList();
    }

    @Transactional
    public FilingCase transition(FilingCase filingCase, FilingStatus target, User actor, String note) {
        Transition transition = transitions(filingCase.getTaxType(), filingCase.getStatus()).stream()
                .filter(candidate -> candidate.to() == target)
                .findFirst()
                .orElseThrow(() -> ApiException.badRequest("INVALID_STATUS_TRANSITION",
                        "Cannot move a " + filingCase.getTaxType() + " case from "
                                + filingCase.getStatus() + " to " + target));

        if (!transition.roles().contains(actor.getRole().name())) {
            throw ApiException.forbidden("Role " + actor.getRole()
                    + " may not perform transition " + transition.action());
        }

        FilingStatus previous = filingCase.getStatus();
        filingCase.setStatus(target);
        filingCase.setUpdatedAt(LocalDateTime.now());
        if (target == FilingStatus.COMPLETED) {
            filingCase.setCompletedAt(LocalDateTime.now());
        }
        FilingCase saved = filingCaseRepository.save(filingCase);

        caseEventRepository.save(CaseEvent.builder()
                .filingCase(saved)
                .actor(actor)
                .fromStatus(previous)
                .toStatus(target)
                .action(transition.action())
                .note(note)
                .build());

        auditService.record("CASE_STATUS_CHANGED", "FilingCase", saved.getId(),
                previous.name(), target.name());
        notificationService.notifyStatusChange(saved, previous, target);
        return saved;
    }

    public record Transition(FilingStatus from, FilingStatus to, String action, List<String> roles) {
    }
}
