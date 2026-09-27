package com.incometax.service;

import com.incometax.dto.Responses;
import com.incometax.entity.DocumentRecord;
import com.incometax.entity.FilingCase;
import com.incometax.entity.FilingQuery;
import com.incometax.entity.FilingStatus;
import com.incometax.entity.GstReconciliationEntry;
import com.incometax.entity.PaymentRecord;
import com.incometax.entity.ReturnType;
import com.incometax.entity.TaxType;
import com.incometax.entity.User;
import com.incometax.repository.DocumentRepository;
import com.incometax.repository.FilingCaseRepository;
import com.incometax.repository.FilingQueryRepository;
import com.incometax.repository.GstReconciliationRepository;
import com.incometax.repository.PaymentRepository;
import com.incometax.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.Duration;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.TreeMap;

@Service
@RequiredArgsConstructor
public class DashboardService {

    private static final DateTimeFormatter MONTH = DateTimeFormatter.ofPattern("yyyy-MM");

    private final FilingCaseRepository filingCaseRepository;
    private final FilingQueryRepository queryRepository;
    private final GstReconciliationRepository reconciliationRepository;
    private final DocumentRepository documentRepository;
    private final PaymentRepository paymentRepository;
    private final UserRepository userRepository;
    private final ResponseMapper responseMapper;

    public Responses.DashboardView dashboard() {
        return new Responses.DashboardView(
                incomeTaxKpis(),
                gstKpis(),
                charts(),
                upcomingDeadlines(30),
                revenue());
    }

    public Map<String, Long> incomeTaxKpis() {
        Map<String, Long> kpis = new LinkedHashMap<>();
        kpis.put("totalTaxpayers", (long) filingCaseRepository
                .findDistinctCustomerIdsByTaxType(TaxType.INCOME_TAX).size());
        kpis.put("totalFilings", filingCaseRepository.countByTaxTypeAndDeletedFalse(TaxType.INCOME_TAX));
        kpis.put("draft", count(TaxType.INCOME_TAX, FilingStatus.DRAFT));
        kpis.put("documentsPending", count(TaxType.INCOME_TAX, FilingStatus.DOCUMENTS_PENDING));
        kpis.put("underReview", count(TaxType.INCOME_TAX, FilingStatus.UNDER_REVIEW));
        kpis.put("queriesRaised", queryRepository
                .countByFilingCaseTaxTypeAndStatus(TaxType.INCOME_TAX, FilingQuery.Status.OPEN));
        kpis.put("readyForFiling", count(TaxType.INCOME_TAX, FilingStatus.READY_FOR_FILING));
        kpis.put("filed", count(TaxType.INCOME_TAX, FilingStatus.FILED));
        kpis.put("completed", count(TaxType.INCOME_TAX, FilingStatus.COMPLETED));
        kpis.put("rejected", count(TaxType.INCOME_TAX, FilingStatus.REJECTED));
        kpis.put("verificationPending", count(TaxType.INCOME_TAX, FilingStatus.VERIFICATION_PENDING));
        kpis.put("pendingDocuments", documentRepository.countByStatus(DocumentRecord.Status.UPLOADED));
        return kpis;
    }

    public Map<String, Long> gstKpis() {
        Map<String, Long> kpis = new LinkedHashMap<>();
        kpis.put("totalTaxpayers", (long) filingCaseRepository.findDistinctCustomerIdsByTaxType(TaxType.GST).size());
        kpis.put("activeFilings", filingCaseRepository.countByTaxTypeAndDeletedFalse(TaxType.GST));
        List<FilingStatus> pending = List.of(FilingStatus.DRAFT, FilingStatus.DATA_PENDING,
                FilingStatus.DATA_IMPORTED, FilingStatus.RECONCILIATION_PENDING,
                FilingStatus.RECONCILIATION_COMPLETED, FilingStatus.UNDER_REVIEW);
        kpis.put("gstr1Pending", filingCaseRepository
                .countByTaxTypeAndReturnTypeAndStatusInAndDeletedFalse(TaxType.GST, ReturnType.GSTR_1, pending));
        kpis.put("gstr3bPending", filingCaseRepository
                .countByTaxTypeAndReturnTypeAndStatusInAndDeletedFalse(TaxType.GST, ReturnType.GSTR_3B, pending));
        kpis.put("reconciliationPending", count(TaxType.GST, FilingStatus.RECONCILIATION_PENDING));
        kpis.put("mismatchCases", reconciliationRepository.countGroupedByStatus().stream()
                .filter(row -> row[0] == GstReconciliationEntry.Status.MISMATCH
                        || row[0] == GstReconciliationEntry.Status.NEEDS_REVIEW)
                .mapToLong(row -> (Long) row[1])
                .sum());
        kpis.put("queryCases", queryRepository
                .countByFilingCaseTaxTypeAndStatus(TaxType.GST, FilingQuery.Status.OPEN));
        kpis.put("readyForFiling", count(TaxType.GST, FilingStatus.READY_FOR_FILING));
        kpis.put("filed", count(TaxType.GST, FilingStatus.FILED));
        kpis.put("acknowledged", count(TaxType.GST, FilingStatus.ACKNOWLEDGEMENT_RECEIVED));
        kpis.put("failedFilings", count(TaxType.GST, FilingStatus.REJECTED));
        return kpis;
    }

    public List<Responses.ChartSeries> charts() {
        List<Object[]> rows = filingCaseRepository.findTimelineRows();
        Map<String, BigDecimal> byMonth = new TreeMap<>();
        Map<String, BigDecimal> incomeTaxByMonth = new TreeMap<>();
        Map<String, BigDecimal> gstByMonth = new TreeMap<>();
        Map<String, BigDecimal> statusDistribution = new LinkedHashMap<>();
        List<Long> turnaroundHours = new ArrayList<>();
        long completed = 0;

        for (Object[] row : rows) {
            LocalDateTime createdAt = (LocalDateTime) row[0];
            TaxType taxType = (TaxType) row[1];
            FilingStatus status = (FilingStatus) row[2];
            LocalDateTime completedAt = (LocalDateTime) row[3];

            String month = createdAt.format(MONTH);
            byMonth.merge(month, BigDecimal.ONE, BigDecimal::add);
            if (taxType == TaxType.INCOME_TAX) {
                incomeTaxByMonth.merge(month, BigDecimal.ONE, BigDecimal::add);
            } else {
                gstByMonth.merge(month, BigDecimal.ONE, BigDecimal::add);
            }
            statusDistribution.merge(status.name(), BigDecimal.ONE, BigDecimal::add);
            if (completedAt != null) {
                completed++;
                turnaroundHours.add(Duration.between(createdAt, completedAt).toHours());
            }
        }

        BigDecimal completionRate = rows.isEmpty() ? BigDecimal.ZERO
                : BigDecimal.valueOf(completed)
                        .multiply(BigDecimal.valueOf(100))
                        .divide(BigDecimal.valueOf(rows.size()), 2, RoundingMode.HALF_UP);
        BigDecimal averageTurnaround = turnaroundHours.isEmpty() ? BigDecimal.ZERO
                : BigDecimal.valueOf(turnaroundHours.stream().mapToLong(Long::longValue).sum())
                        .divide(BigDecimal.valueOf(turnaroundHours.size()), 1, RoundingMode.HALF_UP);

        List<Responses.ChartSeries> charts = new ArrayList<>();
        charts.add(series("filingVolumeByMonth", byMonth));
        charts.add(series("incomeTaxByMonth", incomeTaxByMonth));
        charts.add(series("gstByMonth", gstByMonth));
        charts.add(series("statusDistribution", statusDistribution));
        charts.add(series("pendingWorkload", pendingWorkload()));
        charts.add(new Responses.ChartSeries("filingCompletionRate",
                List.of(new Responses.ChartPoint("percent", completionRate))));
        charts.add(new Responses.ChartSeries("averageTurnaroundHours",
                List.of(new Responses.ChartPoint("hours", averageTurnaround))));
        return charts;
    }

    private Map<String, BigDecimal> pendingWorkload() {
        Map<String, BigDecimal> workload = new LinkedHashMap<>();
        List<User> staff = userRepository.findByRoleIn(List.of(User.Role.TAX_PROFESSIONAL,
                User.Role.GST_PROFESSIONAL, User.Role.REVIEWER, User.Role.DATA_ENTRY_OPERATOR));
        for (User member : staff) {
            long open = filingCaseRepository.findAll(FilingCaseSpecifications.matching(
                    CaseSearchCriteria.builder()
                            .assignedToId(member.getId())
                            .statuses(List.of(FilingStatus.UNDER_REVIEW, FilingStatus.QUERY_RAISED,
                                    FilingStatus.RECONCILIATION_PENDING, FilingStatus.READY_FOR_FILING))
                            .build())).size();
            workload.put(member.getName(), BigDecimal.valueOf(open));
        }
        return workload;
    }

    public List<Responses.CaseSummary> upcomingDeadlines(int days) {
        LocalDate today = LocalDate.now();
        return filingCaseRepository
                .findByDueDateBetweenAndDeletedFalseOrderByDueDateAsc(today, today.plusDays(days))
                .stream()
                .map(responseMapper::filingCase)
                .toList();
    }

    public Map<String, BigDecimal> revenue() {
        Map<String, BigDecimal> revenue = new LinkedHashMap<>();
        revenue.put("collected", paymentRepository.sumTotalByStatus(PaymentRecord.Status.PAID));
        revenue.put("outstanding", paymentRepository.sumTotalByStatus(PaymentRecord.Status.PENDING));
        revenue.put("refunded", paymentRepository.sumTotalByStatus(PaymentRecord.Status.REFUNDED));
        return revenue;
    }

    private long count(TaxType taxType, FilingStatus status) {
        return filingCaseRepository.countByTaxTypeAndStatusAndDeletedFalse(taxType, status);
    }

    private Responses.ChartSeries series(String name, Map<String, BigDecimal> values) {
        List<Responses.ChartPoint> points = values.entrySet().stream()
                .map(entry -> new Responses.ChartPoint(entry.getKey(), entry.getValue()))
                .toList();
        return new Responses.ChartSeries(name, points);
    }
}
