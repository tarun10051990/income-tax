package com.incometax.finance.service;

import com.incometax.finance.dto.FinanceViews.*;
import com.incometax.finance.entity.Investment;
import com.incometax.finance.entity.TaxLiability;
import com.incometax.finance.entity.TaxPayment;
import com.incometax.finance.entity.TaxRefund;
import org.springframework.stereotype.Component;

@Component
public class FinanceMapper {

    public InvestmentView investment(Investment i, boolean withOwner) {
        return new InvestmentView(i.getId(), i.getOwner().getId(), withOwner ? i.getOwner().getName() : null,
                i.getType().name(), i.getName(), i.getAmount(), i.getInvestedOn(), i.getFinancialYear(),
                i.getSection(), i.getTaxSavingEligibleAmount(), i.getExpectedReturn(), i.getActualReturn(),
                i.getMaturityDate(), i.getNotes(), i.getProofDocumentId(), i.getVerificationStatus().name(),
                i.getVerificationNote(), i.getVerifiedAt(), i.getCreatedAt());
    }

    public TaxPaymentView payment(TaxPayment p, boolean withOwner) {
        return new TaxPaymentView(p.getId(), p.getOwner().getId(), withOwner ? p.getOwner().getName() : null,
                p.getFinancialYear(), p.getAssessmentYear(), p.getType().name(), p.getAmount(), p.getPaidOn(),
                p.getChallanNumber(), p.getPaymentMethod(), p.getNotes(), p.getProofDocumentId(),
                p.getVerificationStatus().name(), p.getVerificationNote(), p.getVerifiedAt(), p.getCreatedAt());
    }

    public LiabilityView liability(TaxLiability l) {
        return new LiabilityView(l.getId(), l.getOwner().getId(), l.getFinancialYear(), l.getAssessmentYear(),
                l.getTaxType().name(), l.getPeriod(), l.getAmount(), l.getDueDate(), l.getSource().name(),
                l.getFilingCaseId(), l.getNotes(), l.getUpdatedAt());
    }

    public RefundView refund(TaxRefund r, boolean withOwner) {
        return new RefundView(r.getId(), r.getOwner().getId(), withOwner ? r.getOwner().getName() : null,
                r.getFinancialYear(), r.getAssessmentYear(), r.getTaxType().name(), r.getAmountClaimed(),
                r.getAmountReceived(), r.getStatus().name(), r.getReferenceNumber(), r.getClaimedOn(),
                r.getReceivedOn(), r.getFilingCaseId(), r.getNotes(), r.getUpdatedAt());
    }
}
