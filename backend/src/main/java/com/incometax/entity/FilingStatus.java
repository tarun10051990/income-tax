package com.incometax.entity;

/**
 * Union of the income tax and GST filing lifecycles. Which statuses are reachable for a
 * given tax type is defined by the workflow configuration, not by this enum.
 */
public enum FilingStatus {
    DRAFT,
    DOCUMENTS_PENDING,
    DATA_PENDING,
    DATA_IMPORTED,
    RECONCILIATION_PENDING,
    RECONCILIATION_COMPLETED,
    UNDER_REVIEW,
    QUERY_RAISED,
    USER_ACTION_REQUIRED,
    APPROVED,
    READY_FOR_FILING,
    FILED,
    VERIFICATION_PENDING,
    VERIFIED,
    ACKNOWLEDGEMENT_RECEIVED,
    COMPLETED,
    REJECTED
}
