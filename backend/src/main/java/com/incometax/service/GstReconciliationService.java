package com.incometax.service;

import com.incometax.entity.GstFiling;
import com.incometax.entity.GstInvoice;
import com.incometax.entity.GstReconciliationEntry;
import com.incometax.repository.GstFilingRepository;
import com.incometax.repository.GstInvoiceRepository;
import com.incometax.repository.GstReconciliationRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.HashSet;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;

/**
 * Matches the taxpayer's purchase register against counterparty/portal records for the same
 * period. A one rupee tolerance absorbs rounding differences; anything larger is a mismatch.
 */
@Service
@RequiredArgsConstructor
public class GstReconciliationService {

    private static final BigDecimal TOLERANCE = BigDecimal.ONE;

    private final GstInvoiceRepository gstInvoiceRepository;
    private final GstReconciliationRepository reconciliationRepository;
    private final GstFilingRepository gstFilingRepository;
    private final AuditService auditService;

    @Transactional
    public List<GstReconciliationEntry> reconcile(GstFiling filing) {
        reconciliationRepository.deleteByFilingId(filing.getId());

        List<GstInvoice> bookInvoices = gstInvoiceRepository
                .findByFilingIdAndSource(filing.getId(), GstInvoice.Source.TAXPAYER_BOOKS).stream()
                .filter(invoice -> !invoice.isOutward())
                .toList();
        List<GstInvoice> portalInvoices = gstInvoiceRepository
                .findByFilingIdAndSource(filing.getId(), GstInvoice.Source.COUNTERPARTY_RECORD);

        Map<String, List<GstInvoice>> portalByKey = new LinkedHashMap<>();
        for (GstInvoice invoice : portalInvoices) {
            portalByKey.computeIfAbsent(matchKey(invoice), ignored -> new ArrayList<>()).add(invoice);
        }

        List<GstReconciliationEntry> entries = new ArrayList<>();
        Set<String> consumedPortalIds = new HashSet<>();
        Map<String, Integer> bookKeyOccurrences = new HashMap<>();

        for (GstInvoice book : bookInvoices) {
            String key = matchKey(book);
            int occurrence = bookKeyOccurrences.merge(key, 1, Integer::sum);
            if (occurrence > 1) {
                entries.add(entry(filing, book, null, GstReconciliationEntry.Status.DUPLICATE,
                        "Invoice appears " + occurrence + " times in the purchase register"));
                continue;
            }

            List<GstInvoice> candidates = portalByKey.getOrDefault(key, List.of());
            GstInvoice counterparty = candidates.stream()
                    .filter(candidate -> !consumedPortalIds.contains(candidate.getId()))
                    .findFirst()
                    .orElse(null);

            if (counterparty == null) {
                entries.add(entry(filing, book, null, GstReconciliationEntry.Status.MISSING_IN_PORTAL,
                        "No counterparty record found for this invoice"));
                continue;
            }
            consumedPortalIds.add(counterparty.getId());

            BigDecimal taxableDifference = nz(book.getTaxableValue()).subtract(nz(counterparty.getTaxableValue()));
            BigDecimal taxDifference = book.totalTax().subtract(counterparty.totalTax());
            boolean taxableMatches = taxableDifference.abs().compareTo(TOLERANCE) <= 0;
            boolean taxMatches = taxDifference.abs().compareTo(TOLERANCE) <= 0;
            boolean dateMatches = book.getInvoiceDate() != null
                    && book.getInvoiceDate().equals(counterparty.getInvoiceDate());

            GstReconciliationEntry.Status status;
            String remarks;
            if (taxableMatches && taxMatches && dateMatches) {
                status = GstReconciliationEntry.Status.MATCHED;
                remarks = "Values agree with the counterparty record";
            } else if (taxableMatches && taxMatches) {
                status = GstReconciliationEntry.Status.PARTIALLY_MATCHED;
                remarks = "Values agree but invoice dates differ";
            } else if (!taxableMatches && !taxMatches) {
                status = GstReconciliationEntry.Status.MISMATCH;
                remarks = "Taxable value and tax differ from the counterparty record";
            } else {
                status = GstReconciliationEntry.Status.NEEDS_REVIEW;
                remarks = taxableMatches
                        ? "Tax amount differs from the counterparty record"
                        : "Taxable value differs from the counterparty record";
            }

            GstReconciliationEntry reconciliationEntry = entry(filing, book, counterparty, status, remarks);
            reconciliationEntry.setTaxableValueDifference(taxableDifference);
            reconciliationEntry.setTaxDifference(taxDifference);
            entries.add(reconciliationEntry);
        }

        for (GstInvoice portal : portalInvoices) {
            if (consumedPortalIds.contains(portal.getId())) {
                continue;
            }
            entries.add(entry(filing, null, portal, GstReconciliationEntry.Status.MISSING_IN_BOOKS,
                    "Counterparty reported an invoice that is not in the purchase register"));
        }

        List<GstReconciliationEntry> saved = reconciliationRepository.saveAll(entries);
        filing.setReconciledAt(LocalDateTime.now());
        gstFilingRepository.save(filing);
        auditService.record("GST_RECONCILED", "GstFiling", filing.getId(), null,
                Map.of("entries", saved.size()));
        return saved;
    }

    public Map<GstReconciliationEntry.Status, Long> summary(String filingId) {
        Map<GstReconciliationEntry.Status, Long> summary = new LinkedHashMap<>();
        for (GstReconciliationEntry.Status status : GstReconciliationEntry.Status.values()) {
            summary.put(status, 0L);
        }
        reconciliationRepository.findByFilingId(filingId)
                .forEach(entry -> summary.merge(entry.getStatus(), 1L, Long::sum));
        return summary;
    }

    private GstReconciliationEntry entry(GstFiling filing, GstInvoice book, GstInvoice counterparty,
                                         GstReconciliationEntry.Status status, String remarks) {
        GstInvoice reference = book != null ? book : counterparty;
        return GstReconciliationEntry.builder()
                .filing(filing)
                .bookInvoice(book)
                .counterpartyInvoice(counterparty)
                .status(status)
                .invoiceNumber(reference == null ? null : reference.getInvoiceNumber())
                .counterpartyGstin(reference == null ? null : reference.getCounterpartyGstin())
                .remarks(remarks)
                .build();
    }

    private String matchKey(GstInvoice invoice) {
        String gstin = invoice.getCounterpartyGstin() == null ? "" : invoice.getCounterpartyGstin().toUpperCase();
        String number = invoice.getInvoiceNumber() == null ? "" : invoice.getInvoiceNumber().trim().toUpperCase();
        return gstin + "|" + number;
    }

    private static BigDecimal nz(BigDecimal value) {
        return value == null ? BigDecimal.ZERO : value;
    }
}
