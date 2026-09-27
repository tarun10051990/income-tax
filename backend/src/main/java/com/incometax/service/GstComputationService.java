package com.incometax.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.incometax.entity.GstFiling;
import com.incometax.entity.GstInvoice;
import com.incometax.repository.GstInvoiceRepository;
import lombok.Builder;
import lombok.Data;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.time.temporal.ChronoUnit;
import java.util.List;

/** Computes output tax, input tax credit, reverse charge liability and net GST payable. */
@Service
@RequiredArgsConstructor
public class GstComputationService {

    private static final int SCALE = 2;

    private final GstInvoiceRepository gstInvoiceRepository;
    private final TaxRuleService taxRuleService;

    public Computation compute(GstFiling filing, LocalDate asOf) {
        List<GstInvoice> books = gstInvoiceRepository.findByFilingIdAndSource(
                filing.getId(), GstInvoice.Source.TAXPAYER_BOOKS);

        BigDecimal outputTax = BigDecimal.ZERO;
        BigDecimal outputTaxableValue = BigDecimal.ZERO;
        BigDecimal inputTaxCredit = BigDecimal.ZERO;
        BigDecimal reverseChargeLiability = BigDecimal.ZERO;
        BigDecimal exemptSupplies = BigDecimal.ZERO;
        BigDecimal nilRatedSupplies = BigDecimal.ZERO;
        BigDecimal nonGstSupplies = BigDecimal.ZERO;
        BigDecimal zeroRatedSupplies = BigDecimal.ZERO;

        for (GstInvoice invoice : books) {
            BigDecimal tax = invoice.totalTax();
            BigDecimal taxableValue = invoice.getTaxableValue() == null ? BigDecimal.ZERO : invoice.getTaxableValue();
            int sign = switch (invoice.getDocumentType()) {
                case CREDIT_NOTE, SALES_RETURN, PURCHASE_RETURN -> -1;
                default -> 1;
            };

            switch (invoice.getSupplyType()) {
                case EXEMPT -> exemptSupplies = exemptSupplies.add(taxableValue.multiply(BigDecimal.valueOf(sign)));
                case NIL_RATED -> nilRatedSupplies =
                        nilRatedSupplies.add(taxableValue.multiply(BigDecimal.valueOf(sign)));
                case NON_GST -> nonGstSupplies = nonGstSupplies.add(taxableValue.multiply(BigDecimal.valueOf(sign)));
                case ZERO_RATED -> zeroRatedSupplies =
                        zeroRatedSupplies.add(taxableValue.multiply(BigDecimal.valueOf(sign)));
                case TAXABLE -> {
                    // handled below
                }
            }

            boolean outward = invoice.isOutward();
            if (outward) {
                if (invoice.getSupplyType() == GstInvoice.SupplyType.TAXABLE) {
                    outputTax = outputTax.add(tax.multiply(BigDecimal.valueOf(sign)));
                    outputTaxableValue = outputTaxableValue.add(taxableValue.multiply(BigDecimal.valueOf(sign)));
                }
                continue;
            }

            if (invoice.isReverseCharge()) {
                reverseChargeLiability = reverseChargeLiability.add(tax.multiply(BigDecimal.valueOf(sign)));
            }
            if (invoice.isItcEligible()) {
                inputTaxCredit = inputTaxCredit.add(tax.multiply(BigDecimal.valueOf(sign)));
            }
        }

        BigDecimal grossLiability = outputTax.add(reverseChargeLiability);
        BigDecimal creditUsed = inputTaxCredit.min(grossLiability.max(BigDecimal.ZERO));
        BigDecimal taxPayable = grossLiability.subtract(creditUsed).max(BigDecimal.ZERO);
        BigDecimal creditCarriedForward = inputTaxCredit.subtract(creditUsed).max(BigDecimal.ZERO);

        LateCharges lateCharges = lateCharges(filing, taxPayable, asOf);

        return Computation.builder()
                .outputTaxableValue(scale(outputTaxableValue))
                .outputTax(scale(outputTax))
                .inputTaxCredit(scale(inputTaxCredit))
                .reverseChargeLiability(scale(reverseChargeLiability))
                .exemptSupplies(scale(exemptSupplies))
                .nilRatedSupplies(scale(nilRatedSupplies))
                .nonGstSupplies(scale(nonGstSupplies))
                .zeroRatedSupplies(scale(zeroRatedSupplies))
                .creditUtilised(scale(creditUsed))
                .creditCarriedForward(scale(creditCarriedForward))
                .taxPayable(scale(taxPayable))
                .interest(lateCharges.interest())
                .lateFee(lateCharges.lateFee())
                .daysLate(lateCharges.daysLate())
                .netLiability(scale(taxPayable.add(lateCharges.interest()).add(lateCharges.lateFee())))
                .invoiceCount(books.size())
                .build();
    }

    private LateCharges lateCharges(GstFiling filing, BigDecimal taxPayable, LocalDate asOf) {
        LocalDate dueDate = filing.getFilingCase() == null ? null : filing.getFilingCase().getDueDate();
        if (dueDate == null || !asOf.isAfter(dueDate)) {
            return new LateCharges(BigDecimal.ZERO, BigDecimal.ZERO, 0);
        }
        long daysLate = ChronoUnit.DAYS.between(dueDate, asOf);
        JsonNode configuration = taxRuleService.gstInterestAndFees(asOf);
        BigDecimal annualRate = configuration.path("interestRatePerAnnum").decimalValue();
        BigDecimal perDayFee = configuration.path("lateFeePerDay").decimalValue();
        BigDecimal maxFee = configuration.path("maxLateFee").decimalValue();

        BigDecimal interest = taxPayable
                .multiply(annualRate)
                .multiply(BigDecimal.valueOf(daysLate))
                .divide(BigDecimal.valueOf(365), SCALE, RoundingMode.HALF_UP);
        BigDecimal lateFee = perDayFee.multiply(BigDecimal.valueOf(daysLate)).min(maxFee);
        return new LateCharges(scale(interest), scale(lateFee), daysLate);
    }

    private BigDecimal scale(BigDecimal value) {
        return value.setScale(SCALE, RoundingMode.HALF_UP);
    }

    private record LateCharges(BigDecimal interest, BigDecimal lateFee, long daysLate) {
    }

    @Data
    @Builder
    public static class Computation {
        private BigDecimal outputTaxableValue;
        private BigDecimal outputTax;
        private BigDecimal inputTaxCredit;
        private BigDecimal reverseChargeLiability;
        private BigDecimal exemptSupplies;
        private BigDecimal nilRatedSupplies;
        private BigDecimal nonGstSupplies;
        private BigDecimal zeroRatedSupplies;
        private BigDecimal creditUtilised;
        private BigDecimal creditCarriedForward;
        private BigDecimal taxPayable;
        private BigDecimal interest;
        private BigDecimal lateFee;
        private long daysLate;
        private BigDecimal netLiability;
        private int invoiceCount;
    }
}
