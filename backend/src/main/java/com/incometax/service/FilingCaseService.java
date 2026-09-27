package com.incometax.service;

import com.incometax.entity.FilingCase;
import com.incometax.entity.FilingComment;
import com.incometax.entity.FilingStatus;
import com.incometax.entity.Priority;
import com.incometax.entity.ReturnType;
import com.incometax.entity.TaxType;
import com.incometax.entity.User;
import com.incometax.exception.ApiException;
import com.incometax.repository.CaseEventRepository;
import com.incometax.repository.FilingCaseRepository;
import com.incometax.repository.FilingCommentRepository;
import com.incometax.repository.UserRepository;
import com.incometax.security.Permission;
import com.incometax.security.RbacService;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.Year;
import java.util.List;
import java.util.Map;

@Service
@RequiredArgsConstructor
public class FilingCaseService {

    /** Statuses where the taxpayer still owns the data and may correct it before review. */
    private static final java.util.EnumSet<FilingStatus> CUSTOMER_EDITABLE_STATUSES = java.util.EnumSet.of(
            FilingStatus.DRAFT,
            FilingStatus.USER_ACTION_REQUIRED,
            FilingStatus.DOCUMENTS_PENDING,
            FilingStatus.DATA_PENDING,
            FilingStatus.DATA_IMPORTED,
            FilingStatus.RECONCILIATION_PENDING,
            FilingStatus.RECONCILIATION_COMPLETED,
            FilingStatus.QUERY_RAISED);

    private final FilingCaseRepository filingCaseRepository;
    private final FilingCommentRepository filingCommentRepository;
    private final CaseEventRepository caseEventRepository;
    private final UserRepository userRepository;
    private final RbacService rbacService;
    private final TaxRuleService taxRuleService;
    private final AuditService auditService;
    private final NotificationService notificationService;

    @Transactional
    public FilingCase create(User customer, TaxType taxType, ReturnType returnType, String financialYear,
                             String assessmentYear, String period, String state) {
        if (returnType != null && returnType.getTaxType() != taxType) {
            throw ApiException.badRequest("RETURN_TYPE_MISMATCH",
                    returnType + " is not a " + taxType + " return");
        }
        FilingCase filingCase = FilingCase.builder()
                .caseNumber(nextCaseNumber())
                .customer(customer)
                .taxType(taxType)
                .returnType(returnType)
                .status(FilingStatus.DRAFT)
                .financialYear(financialYear)
                .assessmentYear(assessmentYear)
                .period(period)
                .state(state)
                .dueDate(resolveDueDate(taxType, returnType, assessmentYear, period))
                .build();
        FilingCase saved = filingCaseRepository.save(filingCase);
        auditService.record("CASE_CREATED", "FilingCase", saved.getId(), null,
                Map.of("caseNumber", saved.getCaseNumber(), "taxType", taxType.name()));
        notificationService.send(customer, NotificationService.FILING_STARTED,
                Map.of("caseNumber", saved.getCaseNumber(), "taxType", taxType.name()), saved.getId());
        return saved;
    }

    public FilingCase require(String caseId) {
        return filingCaseRepository.findById(caseId)
                .filter(filingCase -> !filingCase.isDeleted())
                .orElseThrow(() -> ApiException.notFound("Case", caseId));
    }

    /** Loads a case and enforces the caller's read scope (own / assigned / all). */
    public FilingCase requireReadable(String caseId, User actor) {
        FilingCase filingCase = require(caseId);
        if (rbacService.has(actor, Permission.CASE_READ_ALL)
                && rbacService.canAccessTaxType(actor, filingCase.getTaxType())) {
            return filingCase;
        }
        if (rbacService.has(actor, Permission.CASE_READ_ASSIGNED)
                && filingCase.getAssignedTo() != null
                && filingCase.getAssignedTo().getId().equals(actor.getId())
                && rbacService.canAccessTaxType(actor, filingCase.getTaxType())) {
            return filingCase;
        }
        if (rbacService.has(actor, Permission.CASE_READ_OWN)
                && filingCase.getCustomer().getId().equals(actor.getId())) {
            return filingCase;
        }
        throw ApiException.forbidden("You may not access case " + filingCase.getCaseNumber());
    }

    public FilingCase requireEditable(String caseId, User actor) {
        FilingCase filingCase = requireReadable(caseId, actor);
        rbacService.require(actor, Permission.CASE_EDIT_DATA);
        if (actor.isCustomer() && !CUSTOMER_EDITABLE_STATUSES.contains(filingCase.getStatus())) {
            throw ApiException.badRequest("CASE_NOT_EDITABLE",
                    "The case cannot be edited while it is " + filingCase.getStatus());
        }
        return filingCase;
    }

    public Page<FilingCase> search(CaseSearchCriteria criteria, User actor, Pageable pageable) {
        CaseSearchCriteria scoped = applyScope(criteria, actor);
        return filingCaseRepository.findAll(FilingCaseSpecifications.matching(scoped), pageable);
    }

    private CaseSearchCriteria applyScope(CaseSearchCriteria criteria, User actor) {
        if (rbacService.has(actor, Permission.CASE_READ_ALL)) {
            if (actor.getRole() == User.Role.TAX_PROFESSIONAL) {
                criteria.setTaxType(TaxType.INCOME_TAX);
            } else if (actor.getRole() == User.Role.GST_PROFESSIONAL) {
                criteria.setTaxType(TaxType.GST);
            }
            return criteria;
        }
        if (rbacService.has(actor, Permission.CASE_READ_ASSIGNED)) {
            criteria.setAssignedToId(actor.getId());
            criteria.setTaxType(actor.getRole() == User.Role.GST_PROFESSIONAL ? TaxType.GST : TaxType.INCOME_TAX);
            return criteria;
        }
        rbacService.require(actor, Permission.CASE_READ_OWN);
        criteria.setCustomerId(actor.getId());
        return criteria;
    }

    @Transactional
    public FilingCase assign(String caseId, String assigneeId, User actor) {
        rbacService.require(actor, Permission.CASE_ASSIGN);
        FilingCase filingCase = require(caseId);
        User assignee = userRepository.findById(assigneeId)
                .orElseThrow(() -> ApiException.notFound("User", assigneeId));
        if (assignee.isCustomer()) {
            throw ApiException.badRequest("INVALID_ASSIGNEE", "Cases can only be assigned to staff users");
        }
        if (!rbacService.canAccessTaxType(assignee, filingCase.getTaxType())) {
            throw ApiException.badRequest("INVALID_ASSIGNEE",
                    assignee.getRole() + " cannot own a " + filingCase.getTaxType() + " case");
        }
        String previous = filingCase.getAssignedTo() == null ? null : filingCase.getAssignedTo().getId();
        filingCase.setAssignedTo(assignee);
        filingCase.setUpdatedAt(LocalDateTime.now());
        FilingCase saved = filingCaseRepository.save(filingCase);
        auditService.record("CASE_ASSIGNED", "FilingCase", caseId, previous, assigneeId);
        return saved;
    }

    @Transactional
    public FilingCase changePriority(String caseId, Priority priority, User actor) {
        rbacService.require(actor, Permission.CASE_ASSIGN);
        FilingCase filingCase = require(caseId);
        Priority previous = filingCase.getPriority();
        filingCase.setPriority(priority);
        filingCase.setUpdatedAt(LocalDateTime.now());
        FilingCase saved = filingCaseRepository.save(filingCase);
        auditService.record("CASE_PRIORITY_CHANGED", "FilingCase", caseId, previous.name(), priority.name());
        return saved;
    }

    @Transactional
    public FilingComment addComment(String caseId, String message, boolean internal, User actor) {
        FilingCase filingCase = requireReadable(caseId, actor);
        if (internal) {
            rbacService.require(actor, Permission.CASE_COMMENT_INTERNAL);
        }
        FilingComment comment = filingCommentRepository.save(FilingComment.builder()
                .filingCase(filingCase)
                .author(actor)
                .message(message)
                .internal(internal)
                .build());
        auditService.record("CASE_COMMENT_ADDED", "FilingCase", caseId, null, Map.of("internal", internal));
        return comment;
    }

    public List<FilingComment> comments(String caseId, User actor) {
        requireReadable(caseId, actor);
        return actor.isCustomer()
                ? filingCommentRepository.findByFilingCaseIdAndInternalFalseOrderByCreatedAtAsc(caseId)
                : filingCommentRepository.findByFilingCaseIdOrderByCreatedAtAsc(caseId);
    }

    public List<com.incometax.entity.CaseEvent> events(String caseId, User actor) {
        requireReadable(caseId, actor);
        return caseEventRepository.findByFilingCaseIdOrderByCreatedAtAsc(caseId);
    }

    private LocalDate resolveDueDate(TaxType taxType, ReturnType returnType, String assessmentYear, String period) {
        try {
            if (taxType == TaxType.GST) {
                return returnType == null ? null
                        : taxRuleService.gstDueDate(returnType.name(), period, LocalDate.now());
            }
            return assessmentYear == null ? null
                    : taxRuleService.deadline(taxType, assessmentYear, LocalDate.now());
        } catch (ApiException ex) {
            return null;
        }
    }

    private String nextCaseNumber() {
        int year = Year.now().getValue();
        long sequence = filingCaseRepository.count() + 1;
        String candidate = String.format("TAX-%d-%06d", year, sequence);
        while (filingCaseRepository.findByCaseNumber(candidate).isPresent()) {
            sequence++;
            candidate = String.format("TAX-%d-%06d", year, sequence);
        }
        return candidate;
    }
}
