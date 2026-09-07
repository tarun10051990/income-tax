package com.incometax.integration;

import com.incometax.entity.FilingCase;
import com.incometax.entity.TaxType;
import org.springframework.stereotype.Component;

/** Default income tax adapter: the return is prepared here and lodged by an authorised operator. */
@Component
public class ManualIncomeTaxAdapter implements GovernmentFilingAdapter {

    @Override
    public TaxType taxType() {
        return TaxType.INCOME_TAX;
    }

    @Override
    public boolean isConfigured() {
        return false;
    }

    @Override
    public FilingSubmission submit(FilingCase filingCase, String payloadJson) {
        return FilingSubmission.manual("No income tax portal integration is configured. Download the prepared "
                + "return, file it on the official portal and record the acknowledgement against case "
                + filingCase.getCaseNumber() + ".");
    }

    @Override
    public FilingSubmission status(FilingCase filingCase, String referenceNumber) {
        return FilingSubmission.manual("Filing status must be confirmed on the official portal and recorded "
                + "against case " + filingCase.getCaseNumber() + ".");
    }
}
