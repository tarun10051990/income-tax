package com.incometax.service;

import com.incometax.entity.FilingCase;
import jakarta.persistence.criteria.Join;
import jakarta.persistence.criteria.Predicate;
import org.springframework.data.jpa.domain.Specification;

import java.util.ArrayList;
import java.util.List;

public final class FilingCaseSpecifications {

    private FilingCaseSpecifications() {
    }

    public static Specification<FilingCase> matching(CaseSearchCriteria criteria) {
        return (root, query, builder) -> {
            List<Predicate> predicates = new ArrayList<>();
            predicates.add(builder.isFalse(root.get("deleted")));

            if (criteria.getTaxType() != null) {
                predicates.add(builder.equal(root.get("taxType"), criteria.getTaxType()));
            }
            if (criteria.getStatuses() != null && !criteria.getStatuses().isEmpty()) {
                predicates.add(root.get("status").in(criteria.getStatuses()));
            }
            if (criteria.getReturnType() != null) {
                predicates.add(builder.equal(root.get("returnType"), criteria.getReturnType()));
            }
            if (criteria.getPriority() != null) {
                predicates.add(builder.equal(root.get("priority"), criteria.getPriority()));
            }
            if (criteria.getAssignedToId() != null) {
                predicates.add(builder.equal(root.get("assignedTo").get("id"), criteria.getAssignedToId()));
            }
            if (criteria.getCustomerId() != null) {
                predicates.add(builder.equal(root.get("customer").get("id"), criteria.getCustomerId()));
            }
            if (criteria.getFinancialYear() != null) {
                predicates.add(builder.equal(root.get("financialYear"), criteria.getFinancialYear()));
            }
            if (criteria.getAssessmentYear() != null) {
                predicates.add(builder.equal(root.get("assessmentYear"), criteria.getAssessmentYear()));
            }
            if (criteria.getPeriod() != null) {
                predicates.add(builder.equal(root.get("period"), criteria.getPeriod()));
            }
            if (criteria.getState() != null) {
                predicates.add(builder.equal(root.get("state"), criteria.getState()));
            }
            if (criteria.getQuery() != null && !criteria.getQuery().isBlank()) {
                String term = "%" + criteria.getQuery().toLowerCase() + "%";
                Join<Object, Object> customer = root.join("customer");
                predicates.add(builder.or(
                        builder.like(builder.lower(root.get("caseNumber")), term),
                        builder.like(builder.lower(customer.get("name")), term),
                        builder.like(builder.lower(customer.get("email")), term),
                        builder.like(builder.lower(builder.coalesce(customer.get("pan"), "")), term),
                        builder.like(builder.coalesce(customer.get("phone"), ""), term)));
            }
            return builder.and(predicates.toArray(new Predicate[0]));
        };
    }
}
