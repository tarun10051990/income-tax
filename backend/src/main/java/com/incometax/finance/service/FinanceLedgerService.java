package com.incometax.finance.service;

import com.incometax.entity.FilingCase;
import com.incometax.entity.TaxType;
import com.incometax.entity.User;
import com.incometax.exception.ApiException;
import com.incometax.finance.dto.FinanceRequests.*;
import com.incometax.finance.entity.*;
import com.incometax.finance.repository.InvestmentRepository;
import com.incometax.finance.repository.TaxLiabilityRepository;
import com.incometax.finance.repository.TaxPaymentRepository;
import com.incometax.finance.repository.TaxRefundRepository;
import com.incometax.repository.UserRepository;
import com.incometax.security.Permission;
import com.incometax.security.RbacService;
import com.incometax.service.AuditService;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;

/**
 * Client-entered investments and tax payments, staff verification, and the liability/refund ledger.
 * Everything a client writes stays PENDING until staff verify it; dashboards only trust VERIFIED rows.
 */
@Service
@RequiredArgsConstructor
public class FinanceLedgerService {

    private final InvestmentRepository investmentRepository;
    private final TaxPaymentRepository paymentRepository;
    private final TaxLiabilityRepository liabilityRepository;
    private final TaxRefundRepository refundRepository;
    private final UserRepository userRepository;
    private final FinancialYearService financialYearService;
    private final RbacService rbacService;
    private final AuditService auditService;

    /* ---------- investments ---------- */

    @Transactional
    public Investment addInvestment(User owner, InvestmentRequest request) {
        requireCustomer(owner);
        FinancialYear year = financialYearService.requireOpen(request.investedOn());
        Investment investment = Investment.builder().owner(owner).financialYear(year.getCode()).build();
        apply(investment, request);
        Investment saved = investmentRepository.save(investment);
        auditService.record("INVESTMENT_ADDED", "Investment", saved.getId(), null, request);
        return saved;
    }

    @Transactional
    public Investment updateInvestment(User actor, String id, InvestmentRequest request) {
        Investment investment = requireInvestment(id);
        boolean staff = actor.isStaff() && rbacService.has(actor, Permission.FINANCE_MANAGE);
        if (!staff && !investment.getOwner().getId().equals(actor.getId())) {
            throw ApiException.forbidden("You can only edit your own investments");
        }
        if (!staff && investment.getVerificationStatus() == VerificationStatus.VERIFIED) {
            throw ApiException.conflict("INVESTMENT_LOCKED",
                    "A verified investment cannot be edited; ask support to amend it");
        }
        InvestmentRequest before = snapshot(investment);
        investment.setFinancialYear(financialYearService.ensure(
                FinancialYearService.codeFor(request.investedOn())).getCode());
        apply(investment, request);
        if (!staff) {
            investment.setVerificationStatus(VerificationStatus.PENDING);
            investment.setVerificationNote(null);
        }
        investment.setUpdatedAt(LocalDateTime.now());
        auditService.record("INVESTMENT_UPDATED", "Investment", id, before, request);
        return investmentRepository.save(investment);
    }

    @Transactional
    public void deleteInvestment(User actor, String id) {
        Investment investment = requireInvestment(id);
        boolean staff = actor.isStaff() && rbacService.has(actor, Permission.FINANCE_MANAGE);
        if (!staff && !investment.getOwner().getId().equals(actor.getId())) {
            throw ApiException.forbidden("You can only delete your own investments");
        }
        if (!staff && investment.getVerificationStatus() == VerificationStatus.VERIFIED) {
            throw ApiException.conflict("INVESTMENT_LOCKED", "A verified investment cannot be deleted");
        }
        auditService.record("INVESTMENT_DELETED", "Investment", id, snapshot(investment), null);
        investmentRepository.delete(investment);
    }

    @Transactional
    public Investment verifyInvestment(User staff, String id, VerificationDecision decision) {
        rbacService.require(staff, Permission.FINANCE_MANAGE);
        Investment investment = requireInvestment(id);
        VerificationStatus before = investment.getVerificationStatus();
        if (decision.correctedAmount() != null) {
            investment.setAmount(decision.correctedAmount());
        }
        if (decision.correctedEligibleAmount() != null) {
            investment.setTaxSavingEligibleAmount(decision.correctedEligibleAmount().min(investment.getAmount()));
        }
        investment.setVerificationStatus(decision.status());
        investment.setVerificationNote(decision.note());
        investment.setVerifiedBy(staff.getEmail());
        investment.setVerifiedAt(LocalDateTime.now());
        investment.setUpdatedAt(LocalDateTime.now());
        auditService.record("INVESTMENT_VERIFIED", "Investment", id, before, decision);
        return investmentRepository.save(investment);
    }

    public List<Investment> investments(User owner, String financialYear) {
        return financialYear == null || financialYear.isBlank()
                ? investmentRepository.findByOwnerIdOrderByInvestedOnDesc(owner.getId())
                : investmentRepository.findByOwnerIdAndFinancialYearOrderByInvestedOnDesc(owner.getId(),
                financialYear);
    }

    public Page<Investment> investmentQueue(User staff, VerificationStatus status, Pageable pageable) {
        rbacService.require(staff, Permission.FINANCE_READ_ALL);
        return status == null ? investmentRepository.findAllByOrderByCreatedAtDesc(pageable)
                : investmentRepository.findByVerificationStatusOrderByCreatedAtAsc(status, pageable);
    }

    private void apply(Investment investment, InvestmentRequest request) {
        investment.setType(request.type());
        investment.setName(request.name());
        investment.setAmount(request.amount());
        investment.setInvestedOn(request.investedOn());
        investment.setSection(request.section() == null || request.section().isBlank() ? null
                : request.section().trim().toUpperCase());
        BigDecimal eligible = request.taxSavingEligibleAmount() == null
                ? (investment.getSection() == null ? BigDecimal.ZERO : request.amount())
                : request.taxSavingEligibleAmount();
        if (eligible.compareTo(request.amount()) > 0) {
            throw ApiException.badRequest("ELIGIBLE_EXCEEDS_AMOUNT",
                    "Tax-saving eligible amount cannot exceed the invested amount");
        }
        investment.setTaxSavingEligibleAmount(investment.getSection() == null ? BigDecimal.ZERO : eligible);
        investment.setExpectedReturn(request.expectedReturn());
        investment.setActualReturn(request.actualReturn());
        investment.setMaturityDate(request.maturityDate());
        investment.setNotes(request.notes());
        investment.setProofDocumentId(request.proofDocumentId());
    }

    private InvestmentRequest snapshot(Investment i) {
        return new InvestmentRequest(i.getType(), i.getName(), i.getAmount(), i.getInvestedOn(), i.getSection(),
                i.getTaxSavingEligibleAmount(), i.getExpectedReturn(), i.getActualReturn(), i.getMaturityDate(),
                i.getNotes(), i.getProofDocumentId());
    }

    public Investment requireInvestment(String id) {
        return investmentRepository.findById(id).orElseThrow(() -> ApiException.notFound("Investment", id));
    }

    /* ---------- tax payments ---------- */

    @Transactional
    public TaxPayment addPayment(User owner, TaxPaymentRequest request) {
        requireCustomer(owner);
        FinancialYear year = financialYearService.requireOpen(request.paidOn());
        TaxPayment payment = TaxPayment.builder().owner(owner).financialYear(year.getCode()).build();
        apply(payment, request, year);
        TaxPayment saved = paymentRepository.save(payment);
        auditService.record("TAX_PAYMENT_ADDED", "TaxPayment", saved.getId(), null, request);
        return saved;
    }

    @Transactional
    public TaxPayment updatePayment(User actor, String id, TaxPaymentRequest request) {
        TaxPayment payment = requirePayment(id);
        boolean staff = actor.isStaff() && rbacService.has(actor, Permission.FINANCE_MANAGE);
        if (!staff && !payment.getOwner().getId().equals(actor.getId())) {
            throw ApiException.forbidden("You can only edit your own tax payments");
        }
        if (!staff && payment.getVerificationStatus() == VerificationStatus.VERIFIED) {
            throw ApiException.conflict("PAYMENT_LOCKED", "A verified payment cannot be edited");
        }
        FinancialYear year = financialYearService.ensure(FinancialYearService.codeFor(request.paidOn()));
        payment.setFinancialYear(year.getCode());
        apply(payment, request, year);
        if (!staff) {
            payment.setVerificationStatus(VerificationStatus.PENDING);
            payment.setVerificationNote(null);
        }
        payment.setUpdatedAt(LocalDateTime.now());
        auditService.record("TAX_PAYMENT_UPDATED", "TaxPayment", id, null, request);
        return paymentRepository.save(payment);
    }

    @Transactional
    public void deletePayment(User actor, String id) {
        TaxPayment payment = requirePayment(id);
        boolean staff = actor.isStaff() && rbacService.has(actor, Permission.FINANCE_MANAGE);
        if (!staff && !payment.getOwner().getId().equals(actor.getId())) {
            throw ApiException.forbidden("You can only delete your own tax payments");
        }
        if (!staff && payment.getVerificationStatus() == VerificationStatus.VERIFIED) {
            throw ApiException.conflict("PAYMENT_LOCKED", "A verified payment cannot be deleted");
        }
        auditService.record("TAX_PAYMENT_DELETED", "TaxPayment", id, payment.getAmount(), null);
        paymentRepository.delete(payment);
    }

    @Transactional
    public TaxPayment verifyPayment(User staff, String id, VerificationDecision decision) {
        rbacService.require(staff, Permission.FINANCE_MANAGE);
        TaxPayment payment = requirePayment(id);
        VerificationStatus before = payment.getVerificationStatus();
        if (decision.correctedAmount() != null) {
            payment.setAmount(decision.correctedAmount());
        }
        payment.setVerificationStatus(decision.status());
        payment.setVerificationNote(decision.note());
        payment.setVerifiedBy(staff.getEmail());
        payment.setVerifiedAt(LocalDateTime.now());
        payment.setUpdatedAt(LocalDateTime.now());
        auditService.record("TAX_PAYMENT_VERIFIED", "TaxPayment", id, before, decision);
        return paymentRepository.save(payment);
    }

    public List<TaxPayment> payments(User owner, String financialYear) {
        return financialYear == null || financialYear.isBlank()
                ? paymentRepository.findByOwnerIdOrderByPaidOnDesc(owner.getId())
                : paymentRepository.findByOwnerIdAndFinancialYearOrderByPaidOnDesc(owner.getId(), financialYear);
    }

    public Page<TaxPayment> paymentQueue(User staff, VerificationStatus status, Pageable pageable) {
        rbacService.require(staff, Permission.FINANCE_READ_ALL);
        return status == null ? paymentRepository.findAllByOrderByCreatedAtDesc(pageable)
                : paymentRepository.findByVerificationStatusOrderByCreatedAtAsc(status, pageable);
    }

    private void apply(TaxPayment payment, TaxPaymentRequest request, FinancialYear year) {
        payment.setType(request.type());
        payment.setAmount(request.amount());
        payment.setPaidOn(request.paidOn());
        payment.setAssessmentYear(request.type() == TaxPayment.Type.GST ? null
                : request.assessmentYear() != null ? request.assessmentYear() : year.getAssessmentYear());
        payment.setChallanNumber(request.challanNumber());
        payment.setPaymentMethod(request.paymentMethod());
        payment.setNotes(request.notes());
        payment.setProofDocumentId(request.proofDocumentId());
    }

    public TaxPayment requirePayment(String id) {
        return paymentRepository.findById(id).orElseThrow(() -> ApiException.notFound("TaxPayment", id));
    }

    /* ---------- liabilities ---------- */

    @Transactional
    public TaxLiability saveManualLiability(User staff, LiabilityRequest request) {
        rbacService.require(staff, Permission.FINANCE_MANAGE);
        User owner = requireCustomerById(request.ownerId());
        FinancialYear year = financialYearService.ensure(request.financialYear());
        String period = request.period() == null || request.period().isBlank() ? null : request.period().trim();
        TaxLiability liability = liabilityRepository
                .findByOwnerIdAndFinancialYearAndTaxTypeAndPeriodAndSource(owner.getId(), year.getCode(),
                        request.taxType(), period, TaxLiability.Source.MANUAL)
                .orElseGet(() -> TaxLiability.builder().owner(owner).financialYear(year.getCode())
                        .assessmentYear(year.getAssessmentYear()).taxType(request.taxType()).period(period)
                        .source(TaxLiability.Source.MANUAL).build());
        BigDecimal before = liability.getAmount();
        liability.setAmount(request.amount());
        liability.setDueDate(request.dueDate());
        liability.setNotes(request.notes());
        liability.setUpdatedBy(staff.getEmail());
        liability.setUpdatedAt(LocalDateTime.now());
        TaxLiability saved = liabilityRepository.save(liability);
        auditService.record("TAX_LIABILITY_SET", "TaxLiability", saved.getId(), before, request.amount());
        return saved;
    }

    @Transactional
    public void deleteLiability(User staff, String id) {
        rbacService.require(staff, Permission.FINANCE_MANAGE);
        TaxLiability liability = liabilityRepository.findById(id)
                .orElseThrow(() -> ApiException.notFound("TaxLiability", id));
        if (liability.getSource() == TaxLiability.Source.FILING) {
            throw ApiException.conflict("LIABILITY_FROM_FILING",
                    "Liabilities computed from a filed return are managed by the filing, not deleted here");
        }
        auditService.record("TAX_LIABILITY_DELETED", "TaxLiability", id, liability.getAmount(), null);
        liabilityRepository.delete(liability);
    }

    /**
     * Called by the filing engine when a return is submitted: records/updates the FILING-sourced liability
     * for the case and, for income tax, the refund the computation expects.
     */
    @Transactional
    public void syncFromFiling(FilingCase filingCase, BigDecimal totalTax, BigDecimal refundDue) {
        if (filingCase.getFinancialYear() == null) {
            return;
        }
        FinancialYear year = financialYearService.ensure(filingCase.getFinancialYear());
        TaxLiability liability = liabilityRepository.findByFilingCaseId(filingCase.getId())
                .orElseGet(() -> TaxLiability.builder().owner(filingCase.getCustomer())
                        .financialYear(year.getCode()).assessmentYear(year.getAssessmentYear())
                        .taxType(filingCase.getTaxType()).source(TaxLiability.Source.FILING)
                        .filingCaseId(filingCase.getId()).build());
        liability.setPeriod(filingCase.getTaxType() == TaxType.GST ? filingCase.getPeriod()
                : filingCase.getReturnType() == null ? null : filingCase.getReturnType().name());
        liability.setAmount(totalTax == null ? BigDecimal.ZERO : totalTax.max(BigDecimal.ZERO));
        liability.setDueDate(filingCase.getDueDate());
        liability.setNotes("Computed from case " + filingCase.getCaseNumber());
        liability.setUpdatedAt(LocalDateTime.now());
        liabilityRepository.save(liability);

        if (refundDue != null && refundDue.signum() > 0) {
            TaxRefund refund = refundRepository.findByOwnerIdAndFinancialYear(filingCase.getCustomer().getId(),
                            year.getCode()).stream()
                    .filter(r -> filingCase.getId().equals(r.getFilingCaseId()))
                    .findFirst()
                    .orElseGet(() -> TaxRefund.builder().owner(filingCase.getCustomer())
                            .financialYear(year.getCode()).assessmentYear(year.getAssessmentYear())
                            .taxType(filingCase.getTaxType()).filingCaseId(filingCase.getId())
                            .claimedOn(LocalDate.now()).build());
            if (refund.getStatus() == TaxRefund.Status.CLAIMED) {
                refund.setAmountClaimed(refundDue);
                refund.setNotes("Refund due per computation for case " + filingCase.getCaseNumber());
                refund.setUpdatedAt(LocalDateTime.now());
                refundRepository.save(refund);
            }
        }
    }

    /* ---------- refunds ---------- */

    @Transactional
    public TaxRefund addRefund(User staff, RefundRequest request) {
        rbacService.require(staff, Permission.FINANCE_MANAGE);
        User owner = requireCustomerById(request.ownerId());
        FinancialYear year = financialYearService.ensure(request.financialYear());
        TaxRefund refund = TaxRefund.builder().owner(owner).financialYear(year.getCode())
                .assessmentYear(year.getAssessmentYear()).taxType(request.taxType())
                .amountClaimed(request.amountClaimed())
                .amountReceived(request.amountReceived() == null ? BigDecimal.ZERO : request.amountReceived())
                .status(request.status() == null ? TaxRefund.Status.CLAIMED : request.status())
                .referenceNumber(request.referenceNumber())
                .claimedOn(request.claimedOn() == null ? LocalDate.now() : request.claimedOn())
                .receivedOn(request.receivedOn()).filingCaseId(request.filingCaseId()).notes(request.notes())
                .updatedBy(staff.getEmail()).build();
        TaxRefund saved = refundRepository.save(refund);
        auditService.record("TAX_REFUND_ADDED", "TaxRefund", saved.getId(), null, request);
        return saved;
    }

    @Transactional
    public TaxRefund updateRefund(User staff, String id, RefundUpdate request) {
        rbacService.require(staff, Permission.FINANCE_MANAGE);
        TaxRefund refund = refundRepository.findById(id).orElseThrow(() -> ApiException.notFound("TaxRefund", id));
        TaxRefund.Status before = refund.getStatus();
        if (request.amountClaimed() != null) {
            refund.setAmountClaimed(request.amountClaimed());
        }
        if (request.amountReceived() != null) {
            refund.setAmountReceived(request.amountReceived());
        }
        if (request.status() != null) {
            refund.setStatus(request.status());
        }
        if (request.referenceNumber() != null) {
            refund.setReferenceNumber(request.referenceNumber());
        }
        if (request.receivedOn() != null) {
            refund.setReceivedOn(request.receivedOn());
        }
        if (request.notes() != null) {
            refund.setNotes(request.notes());
        }
        if (refund.getStatus() == TaxRefund.Status.ISSUED && refund.getAmountReceived().signum() == 0) {
            refund.setAmountReceived(refund.getAmountClaimed());
        }
        if (refund.getStatus() == TaxRefund.Status.ISSUED && refund.getReceivedOn() == null) {
            refund.setReceivedOn(LocalDate.now());
        }
        refund.setUpdatedBy(staff.getEmail());
        refund.setUpdatedAt(LocalDateTime.now());
        auditService.record("TAX_REFUND_UPDATED", "TaxRefund", id, before, request);
        return refundRepository.save(refund);
    }

    public List<TaxRefund> customerRefunds(User owner, String financialYear) {
        return financialYear == null ? refundRepository.findByOwnerIdOrderByCreatedAtDesc(owner.getId())
                : refundRepository.findByOwnerIdAndFinancialYear(owner.getId(), financialYear);
    }

    public Page<TaxLiability> liabilities(User staff, String financialYear, TaxType taxType, Pageable pageable) {
        rbacService.require(staff, Permission.FINANCE_READ_ALL);
        boolean hasFy = financialYear != null && !financialYear.isBlank();
        if (hasFy && taxType != null) {
            return liabilityRepository.findByFinancialYearAndTaxTypeOrderByCreatedAtDesc(financialYear, taxType,
                    pageable);
        }
        if (hasFy) {
            return liabilityRepository.findByFinancialYearOrderByCreatedAtDesc(financialYear, pageable);
        }
        if (taxType != null) {
            return liabilityRepository.findByTaxTypeOrderByFinancialYearDescCreatedAtDesc(taxType, pageable);
        }
        return liabilityRepository.findAllByOrderByFinancialYearDescCreatedAtDesc(pageable);
    }

    public Page<TaxRefund> refunds(User staff, TaxRefund.Status status, Pageable pageable) {
        rbacService.require(staff, Permission.FINANCE_READ_ALL);
        return status == null ? refundRepository.findAllByOrderByCreatedAtDesc(pageable)
                : refundRepository.findByStatusOrderByCreatedAtDesc(status, pageable);
    }

    /* ---------- helpers ---------- */

    public User requireCustomerById(String id) {
        User user = userRepository.findById(id).orElseThrow(() -> ApiException.notFound("User", id));
        requireCustomer(user);
        return user;
    }

    private void requireCustomer(User user) {
        if (!user.isCustomer()) {
            throw ApiException.forbidden("Financial records belong to taxpayer accounts only");
        }
    }
}
