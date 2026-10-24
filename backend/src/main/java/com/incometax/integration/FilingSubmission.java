package com.incometax.integration;

import java.time.LocalDateTime;

/** Result of an attempt to lodge a prepared return with the relevant government portal. */
public record FilingSubmission(Outcome outcome, String referenceNumber, String acknowledgementNumber,
                               LocalDateTime acknowledgedAt, String message) {

    public enum Outcome {
        /** No official integration is configured; an operator must file and record the result. */
        MANUAL_ACTION_REQUIRED,
        /** A configured adapter accepted the payload and returned a reference. */
        SUBMITTED,
        /** A configured adapter rejected the payload. */
        REJECTED
    }

    public static FilingSubmission manual(String message) {
        return new FilingSubmission(Outcome.MANUAL_ACTION_REQUIRED, null, null, null, message);
    }
}
