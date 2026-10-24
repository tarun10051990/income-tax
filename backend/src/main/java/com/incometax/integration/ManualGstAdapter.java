package com.incometax.integration;

import com.incometax.entity.FilingCase;
import com.incometax.entity.TaxType;
import org.springframework.stereotype.Component;

/** Default GST adapter: returns are prepared here and lodged by an authorised operator. */
@Component
public class ManualGstAdapter implements GovernmentFilingAdapter {

    @Override
    public TaxType taxType() {
        return TaxType.GST;
    }

    @Override
    public boolean isConfigured() {
        return false;
    }

    @Override
    public FilingSubmission submit(FilingCase filingCase, String payloadJson) {
        return FilingSubmission.manual("No GST portal integration is configured. Upload the prepared return on "
                + "the official portal and record the acknowledgement against case "
                + filingCase.getCaseNumber() + ".");
    }

    @Override
    public FilingSubmission status(FilingCase filingCase, String referenceNumber) {
        return FilingSubmission.manual("Return status must be confirmed on the official portal and recorded "
                + "against case " + filingCase.getCaseNumber() + ".");
    }
}
