package com.incometax.integration;

import com.incometax.entity.FilingCase;
import com.incometax.entity.TaxType;

/**
 * Boundary for official portal integrations. No official endpoint, credential flow or
 * acknowledgement format is assumed here: an implementation is supplied per deployment once the
 * organisation holds the relevant authorisation, and until then the manual adapter applies.
 */
public interface GovernmentFilingAdapter {

    TaxType taxType();

    boolean isConfigured();

    /** Submits an already prepared and approved return. */
    FilingSubmission submit(FilingCase filingCase, String payloadJson);

    /** Fetches the current status for a previously submitted return. */
    FilingSubmission status(FilingCase filingCase, String referenceNumber);
}
