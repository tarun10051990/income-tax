package com.incometax.security;

import com.incometax.entity.TaxType;
import com.incometax.entity.User;
import org.springframework.stereotype.Service;

import java.util.EnumSet;
import java.util.Map;
import java.util.Set;

import static com.incometax.security.Permission.*;

/** Single source of truth for the role -> permission matrix documented in docs/ARCHITECTURE.md. */
@Service
public class RbacService {

    private static final Map<User.Role, Set<Permission>> MATRIX = Map.of(
            User.Role.SUPER_ADMIN, EnumSet.allOf(Permission.class),
            User.Role.ADMIN, EnumSet.of(CASE_READ_ALL, CASE_CREATE, CASE_EDIT_DATA, CASE_TRANSITION, CASE_APPROVE,
                    CASE_ASSIGN, CASE_COMMENT_INTERNAL, QUERY_RAISE, QUERY_REVIEW, DOCUMENT_UPLOAD, DOCUMENT_READ_ALL,
                    DOCUMENT_VERIFY, PAYMENT_READ_ALL, PAYMENT_MANAGE, REPORT_READ, USER_MANAGE, CONFIG_READ,
                    AUDIT_READ, NOTIFICATION_TEMPLATE_MANAGE, INTEGRATION_EXECUTE, CONSULTANT_MANAGE,
                    MARKETPLACE_CONFIG_MANAGE, BOOKING_READ_ALL, BOOKING_MANAGE, REVIEW_MODERATE, PAYOUT_MANAGE),
            User.Role.TAX_PROFESSIONAL, EnumSet.of(CASE_READ_ASSIGNED, CASE_EDIT_DATA, CASE_TRANSITION, CASE_APPROVE,
                    CASE_COMMENT_INTERNAL, QUERY_RAISE, QUERY_REVIEW, DOCUMENT_UPLOAD, DOCUMENT_READ_ALL,
                    DOCUMENT_VERIFY, REPORT_READ, CONFIG_READ, INTEGRATION_EXECUTE),
            User.Role.GST_PROFESSIONAL, EnumSet.of(CASE_READ_ASSIGNED, CASE_EDIT_DATA, CASE_TRANSITION, CASE_APPROVE,
                    CASE_COMMENT_INTERNAL, QUERY_RAISE, QUERY_REVIEW, DOCUMENT_UPLOAD, DOCUMENT_READ_ALL,
                    DOCUMENT_VERIFY, REPORT_READ, CONFIG_READ, INTEGRATION_EXECUTE),
            User.Role.REVIEWER, EnumSet.of(CASE_READ_ALL, CASE_TRANSITION, CASE_COMMENT_INTERNAL, QUERY_RAISE,
                    QUERY_REVIEW, DOCUMENT_READ_ALL, DOCUMENT_VERIFY, REPORT_READ, CONFIG_READ),
            User.Role.DATA_ENTRY_OPERATOR, EnumSet.of(CASE_READ_ALL, CASE_EDIT_DATA, DOCUMENT_UPLOAD,
                    DOCUMENT_READ_ALL, CONFIG_READ),
            User.Role.CUSTOMER_SUPPORT, EnumSet.of(CASE_READ_ALL, QUERY_RAISE, DOCUMENT_READ_ALL, PAYMENT_READ_ALL,
                    CASE_COMMENT_INTERNAL, BOOKING_READ_ALL),
            User.Role.CONSULTANT, EnumSet.of(DOCUMENT_UPLOAD),
            User.Role.USER, EnumSet.of(CASE_READ_OWN, CASE_CREATE, CASE_EDIT_DATA, CASE_SUBMIT, QUERY_RESPOND,
                    DOCUMENT_UPLOAD, PAYMENT_READ_OWN)
    );

    public Set<Permission> permissionsFor(User.Role role) {
        return MATRIX.getOrDefault(role, EnumSet.noneOf(Permission.class));
    }

    public boolean has(User user, Permission permission) {
        return user != null && permissionsFor(user.getRole()).contains(permission);
    }

    public void require(User user, Permission permission) {
        if (!has(user, permission)) {
            throw com.incometax.exception.ApiException.forbidden(
                    "Missing permission " + permission.name());
        }
    }

    /** Professionals are scoped to a single tax domain; other staff roles see both. */
    public boolean canAccessTaxType(User user, TaxType taxType) {
        return switch (user.getRole()) {
            case TAX_PROFESSIONAL -> taxType == TaxType.INCOME_TAX;
            case GST_PROFESSIONAL -> taxType == TaxType.GST;
            default -> true;
        };
    }
}
