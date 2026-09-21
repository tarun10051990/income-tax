package com.incometax.service;

import com.incometax.entity.DeductionEntry;
import com.incometax.entity.IncomeSource;
import com.incometax.entity.IncomeTaxFiling;
import com.incometax.entity.TaxPaymentEntry;
import lombok.Builder;
import lombok.Data;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

/** Computes an income tax liability for both regimes using configured slabs and limits. */
@Service
@RequiredArgsConstructor
public class IncomeTaxComputationService {

    private static final int SCALE = 2;

    private final TaxRuleService taxRuleService;

    public Comparison compute(IncomeTaxFiling filing, LocalDate asOf) {
        RegimeComputation oldRegime = computeForRegime(filing, "OLD", asOf);
        RegimeComputation newRegime = computeForRegime(filing, "NEW", asOf);
        String recommended = newRegime.getTotalTax().compareTo(oldRegime.getTotalTax()) <= 0 ? "NEW" : "OLD";
        return Comparison.builder()
                .oldRegime(oldRegime)
                .newRegime(newRegime)
                .recommendedRegime(recommended)
                .savings(oldRegime.getTotalTax().subtract(newRegime.getTotalTax()).abs())
                .build();
    }

    public RegimeComputation computeForRegime(IncomeTaxFiling filing, String regime, LocalDate asOf) {
        BigDecimal salary = sum(filing.getIncomeSources(), IncomeSource.Type.SALARY);
        BigDecimal grossTotalIncome = filing.getIncomeSources().stream()
                .map(source -> nz(source.getAmount()).subtract(nz(source.getDeductibleAmount())))
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        BigDecimal standardDeduction = salary.signum() > 0
                ? taxRuleService.parameter(regime, "standardDeduction", asOf).min(salary)
                : BigDecimal.ZERO;

        BigDecimal hraExemption = "OLD".equals(regime) ? hraExemption(filing) : BigDecimal.ZERO;

        Map<String, BigDecimal> allowedDeductions = new LinkedHashMap<>();
        for (DeductionEntry deduction : filing.getDeductions()) {
            BigDecimal limit = taxRuleService.deductionLimit(deduction.getSection(), regime, asOf);
            if (limit.signum() == 0) {
                continue;
            }
            BigDecimal alreadyClaimed = allowedDeductions.getOrDefault(deduction.getSection(), BigDecimal.ZERO);
            BigDecimal headroom = limit.subtract(alreadyClaimed).max(BigDecimal.ZERO);
            allowedDeductions.merge(deduction.getSection(), nz(deduction.getAmount()).min(headroom),
                    BigDecimal::add);
        }
        BigDecimal chapterViaDeductions = allowedDeductions.values().stream()
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        BigDecimal taxableIncome = grossTotalIncome
                .subtract(standardDeduction)
                .subtract(hraExemption)
                .subtract(chapterViaDeductions)
                .max(BigDecimal.ZERO)
                .setScale(0, RoundingMode.DOWN);

        BigDecimal taxBeforeRebate = slabTax(taxableIncome, regime, asOf);
        BigDecimal rebateLimit = taxRuleService.parameter(regime, "rebateIncomeLimit", asOf);
        BigDecimal rebateMax = taxRuleService.parameter(regime, "rebateMaxAmount", asOf);
        BigDecimal rebate = taxableIncome.compareTo(rebateLimit) <= 0
                ? taxBeforeRebate.min(rebateMax)
                : BigDecimal.ZERO;

        BigDecimal taxAfterRebate = taxBeforeRebate.subtract(rebate).max(BigDecimal.ZERO);
        BigDecimal cessRate = taxRuleService.parameter(regime, "cessRate", asOf);
        BigDecimal cess = taxAfterRebate.multiply(cessRate).setScale(SCALE, RoundingMode.HALF_UP);
        BigDecimal totalTax = taxAfterRebate.add(cess).setScale(SCALE, RoundingMode.HALF_UP);

        BigDecimal taxPaid = filing.getTaxPayments().stream()
                .map(TaxPaymentEntry::getAmount)
                .map(IncomeTaxComputationService::nz)
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        BigDecimal balance = totalTax.subtract(taxPaid).setScale(SCALE, RoundingMode.HALF_UP);

        return RegimeComputation.builder()
                .regime(regime)
                .grossTotalIncome(grossTotalIncome.setScale(SCALE, RoundingMode.HALF_UP))
                .standardDeduction(standardDeduction)
                .hraExemption(hraExemption)
                .deductionsBySection(allowedDeductions)
                .totalDeductions(chapterViaDeductions.add(standardDeduction).add(hraExemption))
                .taxableIncome(taxableIncome)
                .taxBeforeRebate(taxBeforeRebate)
                .rebate(rebate)
                .cess(cess)
                .totalTax(totalTax)
                .taxAlreadyPaid(taxPaid.setScale(SCALE, RoundingMode.HALF_UP))
                .refundDue(balance.signum() < 0 ? balance.negate() : BigDecimal.ZERO)
                .taxPayable(balance.signum() > 0 ? balance : BigDecimal.ZERO)
                .build();
    }

    /** Least of actual HRA, rent paid less 10% of basic, and 50%/40% of basic. */
    private BigDecimal hraExemption(IncomeTaxFiling filing) {
        BigDecimal hra = nz(filing.getHraReceived());
        BigDecimal rent = nz(filing.getRentPaid());
        BigDecimal basic = nz(filing.getBasicSalary());
        if (hra.signum() == 0 || rent.signum() == 0 || basic.signum() == 0) {
            return BigDecimal.ZERO;
        }
        boolean metro = filing.getFilingCase() != null && "METRO".equalsIgnoreCase(filing.getFilingCase().getState());
        BigDecimal rentOverTenPercent = rent.subtract(basic.multiply(new BigDecimal("0.10")))
                .max(BigDecimal.ZERO);
        BigDecimal basicShare = basic.multiply(new BigDecimal(metro ? "0.50" : "0.40"));
        return hra.min(rentOverTenPercent).min(basicShare).setScale(SCALE, RoundingMode.HALF_UP);
    }

    private BigDecimal slabTax(BigDecimal taxableIncome, String regime, LocalDate asOf) {
        BigDecimal tax = BigDecimal.ZERO;
        for (TaxRuleService.Slab slab : taxRuleService.slabs(regime, asOf)) {
            if (taxableIncome.compareTo(slab.from()) <= 0) {
                continue;
            }
            BigDecimal upper = slab.to() == null ? taxableIncome : slab.to().min(taxableIncome);
            BigDecimal band = upper.subtract(slab.from()).max(BigDecimal.ZERO);
            tax = tax.add(band.multiply(slab.rate()));
        }
        return tax.setScale(SCALE, RoundingMode.HALF_UP);
    }

    private BigDecimal sum(List<IncomeSource> sources, IncomeSource.Type type) {
        return sources.stream()
                .filter(source -> source.getType() == type)
                .map(source -> nz(source.getAmount()))
                .reduce(BigDecimal.ZERO, BigDecimal::add);
    }

    private static BigDecimal nz(BigDecimal value) {
        return value == null ? BigDecimal.ZERO : value;
    }

    @Data
    @Builder
    public static class RegimeComputation {
        private String regime;
        private BigDecimal grossTotalIncome;
        private BigDecimal standardDeduction;
        private BigDecimal hraExemption;
        private Map<String, BigDecimal> deductionsBySection;
        private BigDecimal totalDeductions;
        private BigDecimal taxableIncome;
        private BigDecimal taxBeforeRebate;
        private BigDecimal rebate;
        private BigDecimal cess;
        private BigDecimal totalTax;
        private BigDecimal taxAlreadyPaid;
        private BigDecimal refundDue;
        private BigDecimal taxPayable;
    }

    @Data
    @Builder
    public static class Comparison {
        private RegimeComputation oldRegime;
        private RegimeComputation newRegime;
        private String recommendedRegime;
        private BigDecimal savings;
    }
}
