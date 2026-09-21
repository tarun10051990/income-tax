package com.incometax.service;

import com.incometax.entity.FilingCase;
import com.incometax.entity.FilingQuery;
import com.incometax.entity.GstFiling;
import com.incometax.entity.GstInvoice;
import com.incometax.entity.GstReconciliationEntry;
import com.incometax.entity.ReturnType;
import com.incometax.entity.TaxType;
import com.incometax.exception.ApiException;
import com.incometax.repository.DocumentRepository;
import com.incometax.repository.FilingCaseRepository;
import com.incometax.repository.FilingQueryRepository;
import com.incometax.repository.GstFilingRepository;
import com.incometax.repository.GstInvoiceRepository;
import com.incometax.repository.GstReconciliationRepository;
import com.incometax.repository.IncomeTaxFilingRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.time.Duration;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

/** Builds tabular reports; {@link ReportExporter} turns them into CSV, Excel or PDF. */
@Service
@RequiredArgsConstructor
public class ReportService {

    private final FilingCaseRepository filingCaseRepository;
    private final IncomeTaxFilingRepository incomeTaxFilingRepository;
    private final GstFilingRepository gstFilingRepository;
    private final GstInvoiceRepository gstInvoiceRepository;
    private final GstReconciliationRepository reconciliationRepository;
    private final FilingQueryRepository queryRepository;
    private final DocumentRepository documentRepository;
    private final IncomeTaxComputationService incomeTaxComputationService;
    private final GstComputationService gstComputationService;

    public ReportData generate(String reportKey, CaseSearchCriteria criteria) {
        return switch (reportKey) {
            case "it-filing-status" -> filingStatusReport(TaxType.INCOME_TAX, criteria);
            case "it-tax-liability" -> incomeTaxLiabilityReport(criteria, false);
            case "it-refund" -> incomeTaxLiabilityReport(criteria, true);
            case "it-pending-documents" -> pendingDocumentReport(criteria);
            case "it-turnaround" -> turnaroundReport(TaxType.INCOME_TAX, criteria);
            case "employee-workload" -> workloadReport();
            case "gst-filing-status" -> filingStatusReport(TaxType.GST, criteria);
            case "gst-gstr1" -> gstReturnReport(ReturnType.GSTR_1, criteria);
            case "gst-gstr3b" -> gstReturnReport(ReturnType.GSTR_3B, criteria);
            case "gst-itc" -> itcReport(criteria);
            case "gst-reconciliation" -> reconciliationReport(criteria, false);
            case "gst-mismatch" -> reconciliationReport(criteria, true);
            case "gst-tax-liability" -> gstLiabilityReport(criteria);
            default -> throw ApiException.badRequest("UNKNOWN_REPORT", "No report named " + reportKey);
        };
    }

    private ReportData filingStatusReport(TaxType taxType, CaseSearchCriteria criteria) {
        criteria.setTaxType(taxType);
        List<List<Object>> rows = cases(criteria).stream()
                .map(filingCase -> List.<Object>of(
                        filingCase.getCaseNumber(),
                        filingCase.getCustomer().getName(),
                        nullSafe(filingCase.getReturnType()),
                        nullSafe(filingCase.getPeriod() == null
                                ? filingCase.getAssessmentYear() : filingCase.getPeriod()),
                        filingCase.getStatus().name(),
                        filingCase.getPriority().name(),
                        filingCase.getAssignedTo() == null ? "Unassigned" : filingCase.getAssignedTo().getName(),
                        nullSafe(filingCase.getDueDate())))
                .toList();
        return new ReportData(taxType + " filing status", List.of("Case", "Customer", "Return", "Period",
                "Status", "Priority", "Assigned to", "Due date"), rows);
    }

    private ReportData incomeTaxLiabilityReport(CaseSearchCriteria criteria, boolean refundsOnly) {
        criteria.setTaxType(TaxType.INCOME_TAX);
        List<List<Object>> rows = new ArrayList<>();
        for (FilingCase filingCase : cases(criteria)) {
            var filing = incomeTaxFilingRepository.findByFilingCaseId(filingCase.getId()).orElse(null);
            if (filing == null) {
                continue;
            }
            var comparison = incomeTaxComputationService.compute(filing, LocalDate.now());
            String regime = filing.getSelectedRegime() == null
                    ? comparison.getRecommendedRegime() : filing.getSelectedRegime();
            var computation = "NEW".equals(regime) ? comparison.getNewRegime() : comparison.getOldRegime();
            if (refundsOnly && computation.getRefundDue().signum() == 0) {
                continue;
            }
            rows.add(List.of(
                    filingCase.getCaseNumber(),
                    filingCase.getCustomer().getName(),
                    nullSafe(filingCase.getAssessmentYear()),
                    regime,
                    computation.getTaxableIncome(),
                    computation.getTotalTax(),
                    computation.getTaxAlreadyPaid(),
                    computation.getRefundDue(),
                    computation.getTaxPayable()));
        }
        return new ReportData(refundsOnly ? "Income tax refunds" : "Income tax liability",
                List.of("Case", "Customer", "Assessment year", "Regime", "Taxable income", "Total tax",
                        "Tax paid", "Refund due", "Tax payable"), rows);
    }

    private ReportData pendingDocumentReport(CaseSearchCriteria criteria) {
        List<List<Object>> rows = cases(criteria).stream()
                .flatMap(filingCase -> documentRepository
                        .findByFilingCaseIdOrderByCreatedAtDesc(filingCase.getId()).stream()
                        .filter(document -> document.getStatus() == com.incometax.entity.DocumentRecord
                                .Status.UPLOADED)
                        .map(document -> List.<Object>of(
                                filingCase.getCaseNumber(),
                                filingCase.getCustomer().getName(),
                                document.getCategory().name(),
                                document.getFileName(),
                                document.getScanStatus().name(),
                                document.getCreatedAt().toLocalDate())))
                .toList();
        return new ReportData("Pending document verification",
                List.of("Case", "Customer", "Category", "File", "Scan", "Uploaded"), rows);
    }

    private ReportData turnaroundReport(TaxType taxType, CaseSearchCriteria criteria) {
        criteria.setTaxType(taxType);
        List<List<Object>> rows = cases(criteria).stream()
                .filter(filingCase -> filingCase.getCompletedAt() != null)
                .map(filingCase -> List.<Object>of(
                        filingCase.getCaseNumber(),
                        filingCase.getCustomer().getName(),
                        filingCase.getCreatedAt().toLocalDate(),
                        filingCase.getCompletedAt().toLocalDate(),
                        Duration.between(filingCase.getCreatedAt(), filingCase.getCompletedAt()).toHours()))
                .toList();
        return new ReportData(taxType + " filing turnaround",
                List.of("Case", "Customer", "Opened", "Completed", "Hours"), rows);
    }

    private ReportData workloadReport() {
        Map<String, long[]> workload = new LinkedHashMap<>();
        for (FilingCase filingCase : filingCaseRepository.findAll()) {
            if (filingCase.isDeleted()) {
                continue;
            }
            String owner = filingCase.getAssignedTo() == null ? "Unassigned" : filingCase.getAssignedTo().getName();
            long[] counters = workload.computeIfAbsent(owner, ignored -> new long[3]);
            counters[0]++;
            if (filingCase.getCompletedAt() != null) {
                counters[1]++;
            } else {
                counters[2]++;
            }
        }
        List<List<Object>> rows = workload.entrySet().stream()
                .map(entry -> List.<Object>of(entry.getKey(), entry.getValue()[0], entry.getValue()[1],
                        entry.getValue()[2]))
                .toList();
        return new ReportData("Employee workload", List.of("Owner", "Total", "Completed", "Open"), rows);
    }

    private ReportData gstReturnReport(ReturnType returnType, CaseSearchCriteria criteria) {
        criteria.setTaxType(TaxType.GST);
        criteria.setReturnType(returnType);
        List<List<Object>> rows = new ArrayList<>();
        for (FilingCase filingCase : cases(criteria)) {
            GstFiling filing = gstFilingRepository.findByFilingCaseId(filingCase.getId()).orElse(null);
            if (filing == null) {
                continue;
            }
            var computation = gstComputationService.compute(filing, LocalDate.now());
            rows.add(List.of(
                    filingCase.getCaseNumber(),
                    filing.getGstProfile().getLegalName(),
                    filing.getGstProfile().getGstin(),
                    nullSafe(filingCase.getPeriod()),
                    filingCase.getStatus().name(),
                    computation.getOutputTaxableValue(),
                    computation.getOutputTax(),
                    computation.getInputTaxCredit(),
                    computation.getNetLiability()));
        }
        return new ReportData(returnType + " report",
                List.of("Case", "Legal name", "GSTIN", "Period", "Status", "Taxable value", "Output tax",
                        "Input tax credit", "Net liability"), rows);
    }

    private ReportData itcReport(CaseSearchCriteria criteria) {
        criteria.setTaxType(TaxType.GST);
        List<List<Object>> rows = new ArrayList<>();
        for (FilingCase filingCase : cases(criteria)) {
            GstFiling filing = gstFilingRepository.findByFilingCaseId(filingCase.getId()).orElse(null);
            if (filing == null) {
                continue;
            }
            for (GstInvoice invoice : gstInvoiceRepository.findByFilingIdAndSource(filing.getId(),
                    GstInvoice.Source.TAXPAYER_BOOKS)) {
                if (invoice.isOutward()) {
                    continue;
                }
                rows.add(List.of(
                        filingCase.getCaseNumber(),
                        invoice.getInvoiceNumber(),
                        nullSafe(invoice.getCounterpartyGstin()),
                        invoice.getInvoiceDate(),
                        invoice.getTaxableValue(),
                        invoice.totalTax(),
                        invoice.isItcEligible() ? "Eligible" : "Blocked",
                        invoice.isReverseCharge() ? "Yes" : "No"));
            }
        }
        return new ReportData("Input tax credit register",
                List.of("Case", "Invoice", "Supplier GSTIN", "Date", "Taxable value", "Tax", "ITC",
                        "Reverse charge"), rows);
    }

    private ReportData reconciliationReport(CaseSearchCriteria criteria, boolean mismatchesOnly) {
        criteria.setTaxType(TaxType.GST);
        List<List<Object>> rows = new ArrayList<>();
        for (FilingCase filingCase : cases(criteria)) {
            GstFiling filing = gstFilingRepository.findByFilingCaseId(filingCase.getId()).orElse(null);
            if (filing == null) {
                continue;
            }
            for (GstReconciliationEntry entry : reconciliationRepository.findByFilingId(filing.getId())) {
                boolean mismatch = entry.getStatus() == GstReconciliationEntry.Status.MISMATCH
                        || entry.getStatus() == GstReconciliationEntry.Status.NEEDS_REVIEW;
                if (mismatchesOnly && !mismatch) {
                    continue;
                }
                rows.add(List.of(
                        filingCase.getCaseNumber(),
                        nullSafe(entry.getInvoiceNumber()),
                        nullSafe(entry.getCounterpartyGstin()),
                        entry.getStatus().name(),
                        entry.getTaxableValueDifference(),
                        entry.getTaxDifference(),
                        nullSafe(entry.getRemarks())));
            }
        }
        return new ReportData(mismatchesOnly ? "GST mismatches" : "GST reconciliation",
                List.of("Case", "Invoice", "Counterparty GSTIN", "Status", "Taxable difference", "Tax difference",
                        "Remarks"), rows);
    }

    private ReportData gstLiabilityReport(CaseSearchCriteria criteria) {
        criteria.setTaxType(TaxType.GST);
        List<List<Object>> rows = new ArrayList<>();
        for (FilingCase filingCase : cases(criteria)) {
            GstFiling filing = gstFilingRepository.findByFilingCaseId(filingCase.getId()).orElse(null);
            if (filing == null) {
                continue;
            }
            var computation = gstComputationService.compute(filing, LocalDate.now());
            rows.add(List.of(
                    filingCase.getCaseNumber(),
                    nullSafe(filingCase.getPeriod()),
                    computation.getOutputTax(),
                    computation.getReverseChargeLiability(),
                    computation.getInputTaxCredit(),
                    computation.getTaxPayable(),
                    computation.getInterest(),
                    computation.getLateFee(),
                    computation.getNetLiability()));
        }
        return new ReportData("GST tax liability",
                List.of("Case", "Period", "Output tax", "Reverse charge", "Input tax credit", "Tax payable",
                        "Interest", "Late fee", "Net liability"), rows);
    }

    /** Open query counts feed the admin queue widgets. */
    public Map<String, Long> queryBacklog() {
        Map<String, Long> backlog = new LinkedHashMap<>();
        for (FilingQuery.Status status : FilingQuery.Status.values()) {
            backlog.put(status.name(), queryRepository.countByStatus(status));
        }
        return backlog;
    }

    private List<FilingCase> cases(CaseSearchCriteria criteria) {
        return filingCaseRepository.findAll(FilingCaseSpecifications.matching(criteria));
    }

    private Object nullSafe(Object value) {
        return value == null ? "" : value;
    }

    public record ReportData(String title, List<String> headers, List<List<Object>> rows) {

        public BigDecimal columnTotal(int columnIndex) {
            return rows.stream()
                    .map(row -> row.get(columnIndex))
                    .filter(BigDecimal.class::isInstance)
                    .map(BigDecimal.class::cast)
                    .reduce(BigDecimal.ZERO, BigDecimal::add);
        }
    }
}
