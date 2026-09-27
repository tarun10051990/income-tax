package com.incometax.finance.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.incometax.entity.FilingCase;
import com.incometax.entity.FilingStatus;
import com.incometax.entity.IncomeTaxFiling;
import com.incometax.entity.TaxType;
import com.incometax.entity.User;
import com.incometax.exception.ApiException;
import com.incometax.finance.dto.FinanceViews.*;
import com.incometax.finance.entity.Investment;
import com.incometax.finance.entity.TaxLiability;
import com.incometax.finance.entity.TaxPayment;
import com.incometax.finance.entity.TaxRefund;
import com.incometax.finance.entity.VerificationStatus;
import com.incometax.finance.repository.InvestmentRepository;
import com.incometax.finance.repository.TaxLiabilityRepository;
import com.incometax.finance.repository.TaxPaymentRepository;
import com.incometax.finance.repository.TaxRefundRepository;
import com.incometax.marketplace.entity.ConsultantProfile;
import com.incometax.marketplace.entity.ConsultationBooking;
import com.incometax.marketplace.repository.ConsultantProfileRepository;
import com.incometax.marketplace.repository.ConsultationBookingRepository;
import com.incometax.repository.DocumentRepository;
import com.incometax.repository.FilingCaseRepository;
import com.incometax.repository.IncomeTaxFilingRepository;
import com.incometax.repository.UserRepository;
import com.incometax.entity.DocumentRecord;
import com.incometax.security.Permission;
import com.incometax.security.RbacService;
import com.incometax.service.TaxRuleService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.EnumSet;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Set;
import java.util.TreeMap;
import java.util.function.Function;
import java.util.function.Predicate;

/**
 * Every number here is aggregated from persisted records for the requested window; nothing is hard-coded.
 * "Paid" always means VERIFIED payments; unverified entries are reported separately.
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class FinanceAnalyticsService {

    public static final String TAX_SAVING_RULE = "income_tax.tax_saving";
    private static final Set<FilingStatus> FILED = EnumSet.of(FilingStatus.FILED, FilingStatus.VERIFICATION_PENDING,
            FilingStatus.VERIFIED, FilingStatus.ACKNOWLEDGEMENT_RECEIVED, FilingStatus.COMPLETED);
    private static final String DISCLAIMER = "Estimated figures use the configured deduction limits and marginal "
            + "rate; they are not a filed computation and may differ from your final tax liability.";

    private final InvestmentRepository investmentRepository;
    private final TaxPaymentRepository paymentRepository;
    private final TaxLiabilityRepository liabilityRepository;
    private final TaxRefundRepository refundRepository;
    private final FilingCaseRepository filingCaseRepository;
    private final IncomeTaxFilingRepository incomeTaxFilingRepository;
    private final DocumentRepository documentRepository;
    private final UserRepository userRepository;
    private final ConsultationBookingRepository bookingRepository;
    private final ConsultantProfileRepository consultantProfileRepository;
    private final FinancialYearService fy;
    private final TaxRuleService taxRuleService;
    private final RbacService rbacService;
    private final FinanceMapper mapper;
    private final ObjectMapper objectMapper;

    /* ---------- client dashboard ---------- */

    public ClientDashboard clientDashboard(User owner, PeriodView period) {
        List<Investment> investments = investmentRepository
                .findByOwnerIdAndInvestedOnBetweenOrderByInvestedOnDesc(owner.getId(), period.from(), period.to());
        List<TaxPayment> payments = paymentRepository
                .findByOwnerIdAndPaidOnBetweenOrderByPaidOnDesc(owner.getId(), period.from(), period.to());
        List<FilingCase> cases = filingCaseRepository.findByCustomerIdAndDeletedFalse(owner.getId());
        List<TrackingRow> tracking = tracking(owner, null).stream()
                .filter(row -> inWindow(row.financialYear(), period))
                .toList();
        List<TaxRefund> refunds = refundRepository.findByOwnerIdOrderByCreatedAtDesc(owner.getId()).stream()
                .filter(r -> inWindow(r.getFinancialYear(), period))
                .toList();
        SavingsView savings = savings(owner, period.financialYear());

        Map<String, BigDecimal> amounts = new LinkedHashMap<>();
        amounts.put("totalInvestment", sum(investments, Investment::getAmount));
        amounts.put("taxSavingInvestment", sum(investments, Investment::getTaxSavingEligibleAmount));
        amounts.put("totalTaxPaid", sum(payments.stream().filter(this::verified).toList(), TaxPayment::getAmount));
        amounts.put("unverifiedTaxPaid",
                sum(payments.stream().filter(p -> !verified(p)).toList(), TaxPayment::getAmount));
        amounts.put("totalTaxLiability", sum(tracking, TrackingRow::liability));
        amounts.put("taxPayable", sum(tracking, TrackingRow::outstanding));
        amounts.put("pendingTax", sum(tracking.stream()
                .filter(r -> r.dueDate() != null && r.dueDate().isBefore(LocalDate.now())
                        && r.outstanding().signum() > 0).toList(), TrackingRow::outstanding));
        amounts.put("totalTaxRefund", sum(refunds, TaxRefund::getAmountReceived));
        amounts.put("refundClaimed", sum(refunds, TaxRefund::getAmountClaimed));
        amounts.put("estimatedTaxSaved", savings.estimatedTaxBenefit());
        amounts.put("actualTaxSaved", savings.actualTaxSaved());
        amounts.put("totalTaxFiled", sum(tracking.stream()
                .filter(r -> "FILED".equals(r.filingStatus())).toList(), TrackingRow::liability));

        Map<String, Long> counts = new LinkedHashMap<>();
        counts.put("investments", (long) investments.size());
        counts.put("pendingInvestments", investments.stream().filter(i -> !verified(i)).count());
        counts.put("payments", (long) payments.size());
        counts.put("pendingPayments", payments.stream().filter(p -> !verified(p)).count());
        counts.put("pendingDocuments", documentRepository.findByOwnerId(owner.getId(),
                org.springframework.data.domain.Pageable.unpaged()).stream()
                .filter(d -> d.getStatus() == DocumentRecord.Status.UPLOADED).count());
        counts.put("itrFiled", tracking.stream().filter(r -> "INCOME_TAX".equals(r.taxType())
                && "FILED".equals(r.filingStatus())).count());
        counts.put("gstFiled", tracking.stream().filter(r -> "GST".equals(r.taxType())
                && "FILED".equals(r.filingStatus())).count());

        List<TrendSeries> series = new ArrayList<>();
        List<FinancialYearService.Bucket> buckets = fy.buckets(period);
        series.add(series("investment", "Investment", buckets, investments, Investment::getInvestedOn,
                Investment::getAmount));
        series.add(series("taxSavingInvestment", "Tax-saving investment", buckets, investments,
                Investment::getInvestedOn, Investment::getTaxSavingEligibleAmount));
        series.add(series("taxPaid", "Tax paid (verified)", buckets,
                payments.stream().filter(this::verified).toList(), TaxPayment::getPaidOn, TaxPayment::getAmount));
        series.add(series("taxPaidByType", "Tax paid by type", buckets, List.of(), p -> null, p -> null));
        series.set(3, paidByTypeSeries(buckets, payments));
        series.add(liabilityVsPaidSeries(tracking));
        series.add(filingSeries("itrFiling", "ITR filings", buckets, cases, TaxType.INCOME_TAX));
        series.add(filingSeries("gstFiling", "GST returns", buckets, cases, TaxType.GST));
        series.add(refundSeries(refunds));
        series.add(series("taxSaved", "Estimated tax saved", buckets, investments, Investment::getInvestedOn,
                i -> estimateBenefit(i.getTaxSavingEligibleAmount(), savings.marginalRate(), savings.cessRate())));

        return new ClientDashboard(period, amounts, counts,
                latestStatus(cases, TaxType.INCOME_TAX, period.financialYear()),
                latestStatus(cases, TaxType.GST, period.financialYear()), series, tracking,
                investments.stream().limit(5).map(i -> mapper.investment(i, false)).toList(),
                refunds.stream().map(r -> mapper.refund(r, false)).toList());
    }

    /* ---------- tax tracking ---------- */

    /** One row per (FY, tax type) the client has any liability, payment, refund or filing for. */
    public List<TrackingRow> tracking(User owner, String financialYear) {
        List<TaxLiability> liabilities = financialYear == null
                ? liabilityRepository.findByOwnerIdOrderByFinancialYearDescCreatedAtDesc(owner.getId())
                : liabilityRepository.findByOwnerIdAndFinancialYear(owner.getId(), financialYear);
        List<TaxPayment> payments = financialYear == null
                ? paymentRepository.findByOwnerIdOrderByPaidOnDesc(owner.getId())
                : paymentRepository.findByOwnerIdAndFinancialYearOrderByPaidOnDesc(owner.getId(), financialYear);
        List<TaxRefund> refunds = financialYear == null
                ? refundRepository.findByOwnerIdOrderByCreatedAtDesc(owner.getId())
                : refundRepository.findByOwnerIdAndFinancialYear(owner.getId(), financialYear);
        List<FilingCase> cases = filingCaseRepository.findByCustomerIdAndDeletedFalse(owner.getId()).stream()
                .filter(c -> c.getFinancialYear() != null
                        && (financialYear == null || financialYear.equals(c.getFinancialYear())))
                .toList();

        Map<String, List<Object>> keys = new TreeMap<>(java.util.Comparator.reverseOrder());
        liabilities.forEach(l -> keys.computeIfAbsent(key(l.getFinancialYear(), l.getTaxType()),
                k -> new ArrayList<>()).add(l));
        payments.forEach(p -> keys.computeIfAbsent(key(p.getFinancialYear(),
                p.isGst() ? TaxType.GST : TaxType.INCOME_TAX), k -> new ArrayList<>()).add(p));
        refunds.forEach(r -> keys.computeIfAbsent(key(r.getFinancialYear(), r.getTaxType()),
                k -> new ArrayList<>()).add(r));
        cases.forEach(c -> keys.computeIfAbsent(key(c.getFinancialYear(), c.getTaxType()),
                k -> new ArrayList<>()).add(c));

        List<TrackingRow> rows = new ArrayList<>();
        for (Map.Entry<String, List<Object>> entry : keys.entrySet()) {
            String fyCode = entry.getKey().substring(0, 7);
            TaxType taxType = TaxType.valueOf(entry.getKey().substring(8));
            List<TaxLiability> rowLiabilities = entry.getValue().stream().filter(TaxLiability.class::isInstance)
                    .map(TaxLiability.class::cast).toList();
            List<TaxPayment> rowPayments = entry.getValue().stream().filter(TaxPayment.class::isInstance)
                    .map(TaxPayment.class::cast).toList();
            List<TaxRefund> rowRefunds = entry.getValue().stream().filter(TaxRefund.class::isInstance)
                    .map(TaxRefund.class::cast).toList();
            List<FilingCase> rowCases = entry.getValue().stream().filter(FilingCase.class::isInstance)
                    .map(FilingCase.class::cast).toList();

            BigDecimal liability = sum(rowLiabilities, TaxLiability::getAmount);
            BigDecimal verifiedPaid = sum(rowPayments.stream().filter(this::verified).toList(),
                    TaxPayment::getAmount);
            BigDecimal unverifiedPaid = sum(rowPayments.stream().filter(p -> !verified(p)).toList(),
                    TaxPayment::getAmount);
            BigDecimal outstanding = liability.subtract(verifiedPaid).max(BigDecimal.ZERO);
            LocalDate dueDate = rowLiabilities.stream().map(TaxLiability::getDueDate).filter(Objects::nonNull)
                    .min(LocalDate::compareTo)
                    .orElse(rowCases.stream().map(FilingCase::getDueDate).filter(Objects::nonNull)
                            .min(LocalDate::compareTo).orElse(null));
            FilingCase latest = rowCases.stream().max(java.util.Comparator.comparing(FilingCase::getCreatedAt))
                    .orElse(null);
            String filingStatus = latest == null ? "NOT_STARTED"
                    : latest.getStatus() == FilingStatus.COMPLETED ? "COMPLETED"
                    : FILED.contains(latest.getStatus()) ? "FILED"
                    : latest.getStatus() == FilingStatus.UNDER_REVIEW || latest.getStatus() == FilingStatus.APPROVED
                    || latest.getStatus() == FilingStatus.READY_FOR_FILING ? "PROCESSING"
                    : "PENDING";
            LocalDateTime filedOn = latest == null ? null : latest.getSubmittedAt();
            String paymentStatus = liability.signum() == 0 && verifiedPaid.signum() == 0 ? "PENDING"
                    : outstanding.signum() == 0 ? "PAID"
                    : dueDate != null && dueDate.isBefore(LocalDate.now()) ? "OVERDUE"
                    : verifiedPaid.signum() > 0 ? "PARTIALLY_PAID"
                    : "PENDING";
            Map<String, BigDecimal> byType = new LinkedHashMap<>();
            for (TaxPayment p : rowPayments) {
                if (verified(p)) {
                    byType.merge(p.getType().name(), p.getAmount(), BigDecimal::add);
                }
            }
            rows.add(new TrackingRow(fyCode, FinancialYearService.assessmentYearFor(fyCode), taxType.name(),
                    liability, verifiedPaid, unverifiedPaid, outstanding, sum(rowRefunds, TaxRefund::getAmountClaimed),
                    sum(rowRefunds, TaxRefund::getAmountReceived), paymentStatus, filingStatus, dueDate, filedOn,
                    byType, rowLiabilities.stream().map(mapper::liability).toList()));
        }
        return rows;
    }

    /* ---------- tax saving ---------- */

    public SavingsView savings(User owner, String financialYear) {
        String fyCode = financialYear == null || financialYear.isBlank() ? fy.current() : financialYear;
        LocalDate asOf = FinancialYearService.endOf(fyCode);
        List<Investment> investments = investmentRepository
                .findByOwnerIdAndFinancialYearOrderByInvestedOnDesc(owner.getId(), fyCode);
        JsonNode config = taxSavingConfig(asOf);
        String regime = config.path("estimateRegime").asText("OLD");
        BigDecimal cess = config.path("cessRate").isMissingNode() ? new BigDecimal("0.04")
                : config.path("cessRate").decimalValue();

        Map<String, List<Investment>> bySection = new TreeMap<>();
        investments.stream().filter(i -> i.getSection() != null && i.getTaxSavingEligibleAmount().signum() > 0)
                .forEach(i -> bySection.computeIfAbsent(i.getSection(), k -> new ArrayList<>()).add(i));
        List<SavingsSection> sections = new ArrayList<>();
        BigDecimal eligibleTotal = BigDecimal.ZERO;
        BigDecimal verifiedEligibleTotal = BigDecimal.ZERO;
        for (Map.Entry<String, List<Investment>> entry : bySection.entrySet()) {
            BigDecimal invested = sum(entry.getValue(), Investment::getTaxSavingEligibleAmount);
            BigDecimal verifiedInvested = sum(entry.getValue().stream().filter(this::verified).toList(),
                    Investment::getTaxSavingEligibleAmount);
            BigDecimal limit = null;
            List<String> regimes = List.of();
            try {
                JsonNode node = taxRuleService.configuration(TaxRuleService.IT_DEDUCTION_LIMITS, asOf)
                        .path(entry.getKey());
                if (!node.isMissingNode()) {
                    limit = node.path("limit").decimalValue();
                    List<String> list = new ArrayList<>();
                    node.path("regimes").forEach(r -> list.add(r.asText()));
                    regimes = list;
                }
            } catch (ApiException e) {
                log.warn("Deduction limits not configured for {}", asOf);
            }
            boolean allowed = regimes.isEmpty() || regimes.contains(regime);
            BigDecimal eligible = !allowed ? BigDecimal.ZERO : limit == null ? invested : invested.min(limit);
            BigDecimal verifiedEligible = !allowed ? BigDecimal.ZERO
                    : limit == null ? verifiedInvested : verifiedInvested.min(limit);
            eligibleTotal = eligibleTotal.add(eligible);
            verifiedEligibleTotal = verifiedEligibleTotal.add(verifiedEligible);
            sections.add(new SavingsSection(entry.getKey(), invested, verifiedInvested, limit, eligible,
                    verifiedEligible, regimes));
        }

        BigDecimal marginalRate;
        String rateBasis;
        BigDecimal taxableIncome = filedTaxableIncome(owner, fyCode, regime);
        if (taxableIncome != null) {
            marginalRate = marginalRate(taxableIncome, regime, asOf);
            rateBasis = "Marginal slab rate from your FY " + fyCode + " return computation";
        } else {
            marginalRate = config.path("assumedMarginalRate").isMissingNode() ? new BigDecimal("0.30")
                    : config.path("assumedMarginalRate").decimalValue();
            rateBasis = "Assumed marginal rate configured by the platform (no return computed for FY " + fyCode
                    + ")";
        }
        BigDecimal estimated = estimateBenefit(eligibleTotal, marginalRate, cess);
        BigDecimal actual = estimateBenefit(verifiedEligibleTotal, marginalRate, cess);
        return new SavingsView(fyCode, sections, sum(investments, Investment::getAmount),
                sum(investments, Investment::getTaxSavingEligibleAmount), eligibleTotal, verifiedEligibleTotal,
                marginalRate, cess, rateBasis, estimated, actual,
                "Based on staff-verified investments only, at the same rate", DISCLAIMER);
    }

    private JsonNode taxSavingConfig(LocalDate asOf) {
        try {
            return taxRuleService.configuration(TAX_SAVING_RULE, asOf);
        } catch (ApiException e) {
            return objectMapper.createObjectNode();
        }
    }

    private BigDecimal filedTaxableIncome(User owner, String fyCode, String regime) {
        return filingCaseRepository.findByCustomerIdAndDeletedFalse(owner.getId()).stream()
                .filter(c -> c.getTaxType() == TaxType.INCOME_TAX && fyCode.equals(c.getFinancialYear()))
                .sorted(java.util.Comparator.comparing(FilingCase::getCreatedAt).reversed())
                .map(c -> incomeTaxFilingRepository.findByFilingCaseId(c.getId()).orElse(null))
                .filter(Objects::nonNull)
                .map(IncomeTaxFiling::getComputationJson)
                .filter(Objects::nonNull)
                .map(json -> {
                    try {
                        JsonNode node = objectMapper.readTree(json)
                                .path("OLD".equals(regime) ? "oldRegime" : "newRegime").path("taxableIncome");
                        return node.isMissingNode() || node.isNull() ? null : node.decimalValue();
                    } catch (Exception e) {
                        return null;
                    }
                })
                .filter(Objects::nonNull)
                .findFirst()
                .orElse(null);
    }

    private BigDecimal marginalRate(BigDecimal taxableIncome, String regime, LocalDate asOf) {
        try {
            BigDecimal rate = BigDecimal.ZERO;
            for (TaxRuleService.Slab slab : taxRuleService.slabs(regime, asOf)) {
                if (taxableIncome.compareTo(slab.from()) > 0) {
                    rate = slab.rate();
                }
            }
            return rate.compareTo(BigDecimal.ONE) > 0 ? rate.movePointLeft(2) : rate;
        } catch (ApiException e) {
            return new BigDecimal("0.30");
        }
    }

    static BigDecimal estimateBenefit(BigDecimal deduction, BigDecimal marginalRate, BigDecimal cess) {
        if (deduction == null || marginalRate == null) {
            return BigDecimal.ZERO;
        }
        return deduction.multiply(marginalRate).multiply(BigDecimal.ONE.add(cess == null ? BigDecimal.ZERO : cess))
                .setScale(0, RoundingMode.HALF_UP);
    }

    /* ---------- admin ---------- */

    public AdminAnalytics adminAnalytics(User staff, PeriodView period) {
        rbacService.require(staff, Permission.FINANCE_READ_ALL);
        List<FinancialYearService.Bucket> buckets = fy.buckets(period);
        List<User> clients = userRepository.findByRoleIn(List.of(User.Role.USER));
        List<Investment> investments = investmentRepository.findByInvestedOnBetween(period.from(), period.to());
        List<TaxPayment> payments = paymentRepository.findByPaidOnBetween(period.from(), period.to());
        List<FilingCase> cases = filingCaseRepository.findByDeletedFalse();
        List<TaxLiability> liabilities = liabilityRepository.findAll().stream()
                .filter(l -> inWindow(l.getFinancialYear(), period)).toList();
        List<TaxRefund> refunds = refundRepository.findAll().stream()
                .filter(r -> inWindow(r.getFinancialYear(), period)).toList();
        List<ConsultationBooking> bookings = bookingRepository.findAll().stream()
                .filter(b -> b.getCreatedAt() != null && inWindow(b.getCreatedAt().toLocalDate(), period))
                .toList();
        List<ConsultationBooking> paidBookings = bookings.stream()
                .filter(b -> b.getPaymentStatus() == ConsultationBooking.PaymentStatus.PAID).toList();
        List<ConsultantProfile> consultants = consultantProfileRepository.findAll();

        Map<String, Long> counts = new LinkedHashMap<>();
        counts.put("totalClients", (long) clients.size());
        counts.put("activeClients", clients.stream().filter(User::isActive).count());
        counts.put("newClients", clients.stream()
                .filter(u -> u.getCreatedAt() != null && inWindow(u.getCreatedAt().toLocalDate(), period)).count());
        counts.put("totalConsultants", (long) consultants.size());
        counts.put("verifiedConsultants", consultants.stream().filter(ConsultantProfile::isVerified).count());
        counts.put("pendingConsultantVerification", consultants.stream()
                .filter(c -> c.getStatus() == ConsultantProfile.Status.PENDING_VERIFICATION
                        || c.getStatus() == ConsultantProfile.Status.UNDER_REVIEW).count());
        counts.put("totalItrs", cases.stream().filter(c -> c.getTaxType() == TaxType.INCOME_TAX
                && inWindow(c.getFinancialYear(), period)).count());
        counts.put("pendingItrs", cases.stream().filter(c -> c.getTaxType() == TaxType.INCOME_TAX
                && inWindow(c.getFinancialYear(), period) && !FILED.contains(c.getStatus())
                && c.getStatus() != FilingStatus.REJECTED).count());
        counts.put("totalGstReturns", cases.stream().filter(c -> c.getTaxType() == TaxType.GST
                && inWindow(c.getFinancialYear(), period)).count());
        counts.put("pendingGstReturns", cases.stream().filter(c -> c.getTaxType() == TaxType.GST
                && inWindow(c.getFinancialYear(), period) && !FILED.contains(c.getStatus())
                && c.getStatus() != FilingStatus.REJECTED).count());
        counts.put("investments", (long) investments.size());
        counts.put("pendingInvestmentVerification",
                investmentRepository.countByVerificationStatus(VerificationStatus.PENDING));
        counts.put("pendingPaymentVerification",
                paymentRepository.countByVerificationStatus(VerificationStatus.PENDING));
        counts.put("totalConsultations", (long) bookings.size());
        counts.put("pendingDocuments", documentRepository.countByStatus(DocumentRecord.Status.UPLOADED));

        Map<String, BigDecimal> amounts = new LinkedHashMap<>();
        amounts.put("totalInvestments", sum(investments, Investment::getAmount));
        amounts.put("totalTaxPaid", sum(payments.stream().filter(this::verified).toList(), TaxPayment::getAmount));
        amounts.put("unverifiedTaxPaid",
                sum(payments.stream().filter(p -> !verified(p)).toList(), TaxPayment::getAmount));
        amounts.put("totalTaxLiability", sum(liabilities, TaxLiability::getAmount));
        amounts.put("totalRefunds", sum(refunds, TaxRefund::getAmountReceived));
        amounts.put("refundsClaimed", sum(refunds, TaxRefund::getAmountClaimed));
        JsonNode config = taxSavingConfig(period.to());
        BigDecimal rate = config.path("assumedMarginalRate").isMissingNode() ? new BigDecimal("0.30")
                : config.path("assumedMarginalRate").decimalValue();
        BigDecimal cess = config.path("cessRate").isMissingNode() ? new BigDecimal("0.04")
                : config.path("cessRate").decimalValue();
        amounts.put("estimatedTaxSaved", estimateBenefit(sum(investments, Investment::getTaxSavingEligibleAmount),
                rate, cess));
        amounts.put("marketplaceRevenue", sum(paidBookings, ConsultationBooking::getTotalAmount));
        amounts.put("platformRevenue", sum(paidBookings, ConsultationBooking::getCommissionAmount));
        amounts.put("consultantEarnings", sum(paidBookings, ConsultationBooking::getConsultantEarning));

        List<TrendSeries> series = new ArrayList<>();
        series.add(countSeries("clientGrowth", "New clients", buckets, clients,
                u -> u.getCreatedAt() == null ? null : u.getCreatedAt().toLocalDate()));
        series.add(series("taxPaid", "Tax paid (verified)", buckets,
                payments.stream().filter(this::verified).toList(), TaxPayment::getPaidOn, TaxPayment::getAmount));
        series.add(series("taxSaved", "Estimated tax saved", buckets, investments, Investment::getInvestedOn,
                i -> estimateBenefit(i.getTaxSavingEligibleAmount(), rate, cess)));
        series.add(series("investment", "Investments", buckets, investments, Investment::getInvestedOn,
                Investment::getAmount));
        series.add(filingSeries("itrFiling", "ITR filings", buckets, cases, TaxType.INCOME_TAX));
        series.add(filingSeries("gstFiling", "GST returns", buckets, cases, TaxType.GST));
        series.add(new TrendSeries("liabilityVsPaid", "Liability vs paid", List.of(
                new TrendPoint("Liability", period.from(), period.to(), amounts.get("totalTaxLiability")),
                new TrendPoint("Paid (verified)", period.from(), period.to(), amounts.get("totalTaxPaid")),
                new TrendPoint("Unverified", period.from(), period.to(), amounts.get("unverifiedTaxPaid")))));
        series.add(countSeries("consultations", "Consultations", buckets, bookings,
                b -> b.getCreatedAt().toLocalDate()));
        series.add(series("marketplaceRevenue", "Marketplace revenue", buckets, paidBookings,
                b -> b.getCreatedAt().toLocalDate(), ConsultationBooking::getTotalAmount));
        series.add(series("platformRevenue", "Platform revenue", buckets, paidBookings,
                b -> b.getCreatedAt().toLocalDate(), ConsultationBooking::getCommissionAmount));
        series.add(series("consultantEarnings", "Consultant earnings", buckets, paidBookings,
                b -> b.getCreatedAt().toLocalDate(), ConsultationBooking::getConsultantEarning));

        Map<String, Long> consultantTypes = new TreeMap<>();
        consultants.forEach(c -> consultantTypes.merge(c.getProfessionalType() == null ? "Other"
                : c.getProfessionalType().getLabel(), 1L, Long::sum));

        return new AdminAnalytics(period, counts, amounts, series, consultantTypes);
    }

    /* ---------- helpers ---------- */

    private static String key(String fyCode, TaxType taxType) {
        return fyCode + "|" + taxType.name();
    }

    private boolean verified(Investment i) {
        return i.getVerificationStatus() == VerificationStatus.VERIFIED;
    }

    private boolean verified(TaxPayment p) {
        return p.getVerificationStatus() == VerificationStatus.VERIFIED;
    }

    private static boolean inWindow(LocalDate date, PeriodView period) {
        return date != null && !date.isBefore(period.from()) && !date.isAfter(period.to());
    }

    /** A FY overlaps the window if any of its days fall inside it. */
    private static boolean inWindow(String fyCode, PeriodView period) {
        if (fyCode == null || !fyCode.matches("^\\d{4}-\\d{2}$")) {
            return false;
        }
        LocalDate start = FinancialYearService.startOf(fyCode);
        LocalDate end = FinancialYearService.endOf(fyCode);
        return !end.isBefore(period.from()) && !start.isAfter(period.to());
    }

    private static <T> BigDecimal sum(List<T> items, Function<T, BigDecimal> amount) {
        return items.stream().map(amount).filter(Objects::nonNull).reduce(BigDecimal.ZERO, BigDecimal::add);
    }

    private static <T> TrendSeries series(String key, String name, List<FinancialYearService.Bucket> buckets,
                                          List<T> items, Function<T, LocalDate> date,
                                          Function<T, BigDecimal> amount) {
        List<TrendPoint> points = new ArrayList<>();
        for (FinancialYearService.Bucket bucket : buckets) {
            BigDecimal value = items.stream().filter(i -> bucket.contains(date.apply(i))).map(amount)
                    .filter(Objects::nonNull).reduce(BigDecimal.ZERO, BigDecimal::add);
            points.add(new TrendPoint(bucket.label(), bucket.from(), bucket.to(), value));
        }
        return new TrendSeries(key, name, points);
    }

    private static <T> TrendSeries countSeries(String key, String name, List<FinancialYearService.Bucket> buckets,
                                               List<T> items, Function<T, LocalDate> date) {
        return series(key, name, buckets, items, date, i -> BigDecimal.ONE);
    }

    private TrendSeries paidByTypeSeries(List<FinancialYearService.Bucket> buckets, List<TaxPayment> payments) {
        List<TrendPoint> points = new ArrayList<>();
        for (TaxPayment.Type type : TaxPayment.Type.values()) {
            BigDecimal value = sum(payments.stream().filter(p -> verified(p) && p.getType() == type).toList(),
                    TaxPayment::getAmount);
            if (value.signum() > 0) {
                points.add(new TrendPoint(type.name(), buckets.isEmpty() ? null : buckets.get(0).from(),
                        buckets.isEmpty() ? null : buckets.get(buckets.size() - 1).to(), value));
            }
        }
        return new TrendSeries("taxPaidByType", "Tax paid by type", points);
    }

    private TrendSeries liabilityVsPaidSeries(List<TrackingRow> tracking) {
        List<TrendPoint> points = new ArrayList<>();
        for (TrackingRow row : tracking) {
            LocalDate from = FinancialYearService.startOf(row.financialYear());
            LocalDate to = FinancialYearService.endOf(row.financialYear());
            String label = row.taxType().equals("GST") ? "GST " + row.financialYear() : "ITR " + row.financialYear();
            points.add(new TrendPoint(label + " liability", from, to, row.liability()));
            points.add(new TrendPoint(label + " paid", from, to, row.verifiedPaid()));
        }
        return new TrendSeries("liabilityVsPaid", "Tax liability vs paid", points);
    }

    private TrendSeries filingSeries(String key, String name, List<FinancialYearService.Bucket> buckets,
                                     List<FilingCase> cases, TaxType taxType) {
        Predicate<FilingCase> ofType = c -> c.getTaxType() == taxType;
        List<TrendPoint> points = new ArrayList<>();
        for (FinancialYearService.Bucket bucket : buckets) {
            long started = cases.stream().filter(ofType)
                    .filter(c -> bucket.contains(c.getCreatedAt().toLocalDate())).count();
            long filed = cases.stream().filter(ofType).filter(c -> FILED.contains(c.getStatus())
                    && c.getSubmittedAt() != null && bucket.contains(c.getSubmittedAt().toLocalDate())).count();
            points.add(new TrendPoint(bucket.label() + " started", bucket.from(), bucket.to(),
                    BigDecimal.valueOf(started)));
            points.add(new TrendPoint(bucket.label() + " filed", bucket.from(), bucket.to(),
                    BigDecimal.valueOf(filed)));
        }
        return new TrendSeries(key, name, points);
    }

    private TrendSeries refundSeries(List<TaxRefund> refunds) {
        Map<String, BigDecimal> byStatus = new TreeMap<>();
        refunds.forEach(r -> byStatus.merge(r.getStatus().name(),
                r.getStatus() == TaxRefund.Status.ISSUED || r.getStatus() == TaxRefund.Status.PARTIALLY_ISSUED
                        ? r.getAmountReceived() : r.getAmountClaimed(), BigDecimal::add));
        return new TrendSeries("refunds", "Refunds by status", byStatus.entrySet().stream()
                .map(e -> new TrendPoint(e.getKey(), null, null, e.getValue())).toList());
    }

    private String latestStatus(List<FilingCase> cases, TaxType taxType, String fyCode) {
        return cases.stream().filter(c -> c.getTaxType() == taxType && fyCode.equals(c.getFinancialYear()))
                .max(java.util.Comparator.comparing(FilingCase::getCreatedAt))
                .map(c -> c.getStatus().name())
                .orElse("NOT_STARTED");
    }
}
