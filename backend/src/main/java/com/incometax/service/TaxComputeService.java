package com.incometax.service;

import com.incometax.dto.TaxComputeRequest;
import org.springframework.stereotype.Service;

import java.util.HashMap;
import java.util.Map;

@Service
public class TaxComputeService {

    public Map<String, Object> computeTax(TaxComputeRequest req) {
        var salary = req.getSalary();
        var ded = req.getDeductions();
        var add = req.getAdditionalIncome();

        double grossSalary = salary.getBasicSalary() + salary.getHra() +
                salary.getSpecialAllowance() + salary.getBonus() +
                salary.getLeaveEncashment() + salary.getOtherAllowances();

        double totalAdditional = add.getSavingsInterest() + add.getFdInterest() +
                add.getRdInterest() + add.getCapitalGainsSTCG() + add.getCapitalGainsLTCG() +
                add.getRentalIncome() + add.getOtherIncome();

        double totalIncome = grossSalary + totalAdditional;

        // HRA Exemption
        double hraPercent = req.isMetroCity() ? 0.50 : 0.40;
        double hraExemption = Math.max(0, Math.min(
                salary.getHra(),
                Math.min(req.getRentPaid() - 0.10 * salary.getBasicSalary(),
                        hraPercent * salary.getBasicSalary())
        ));

        // Old regime deductions
        double oldStdDed = Math.min(ded.getStandardDeduction() > 0 ? ded.getStandardDeduction() : 50000, 50000);
        double old80C = Math.min(ded.getSection80C() + ded.getPfContribution(), 150000);
        double old80CCD1B = Math.min(ded.getSection80CCD1B(), 50000);
        double old80D = Math.min(ded.getSection80D(), 100000);
        double old80TTA = Math.min(ded.getSection80TTA(), 10000);
        double old24 = Math.min(ded.getSection24(), 200000);

        double totalDedOld = oldStdDed + old80C + old80CCD1B + old80D + old80TTA +
                old24 + hraExemption + ded.getProfessionalTax() + ded.getOtherDeductions();

        double totalDedNew = 75000;

        double taxableOld = Math.max(0, totalIncome - totalDedOld);
        double taxableNew = Math.max(0, totalIncome - totalDedNew);

        double taxOld = computeOldRegimeTax(taxableOld);
        double taxNew = computeNewRegimeTax(taxableNew);

        double cessOld = Math.round(taxOld * 0.04);
        double cessNew = Math.round(taxNew * 0.04);

        double totalTaxOld = taxOld + cessOld;
        double totalTaxNew = taxNew + cessNew;

        double refundOld = req.getTdsDeducted() - totalTaxOld;
        double refundNew = req.getTdsDeducted() - totalTaxNew;

        String recommended = totalTaxOld <= totalTaxNew ? "old" : "new";

        Map<String, Object> result = new HashMap<>();
        result.put("grossSalary", grossSalary);
        result.put("totalIncome", totalIncome);
        result.put("taxableIncomeOld", taxableOld);
        result.put("taxableIncomeNew", taxableNew);
        result.put("taxOldRegime", taxOld);
        result.put("taxNewRegime", taxNew);
        result.put("cessOld", cessOld);
        result.put("cessNew", cessNew);
        result.put("totalTaxOld", totalTaxOld);
        result.put("totalTaxNew", totalTaxNew);
        result.put("refundOld", refundOld);
        result.put("refundNew", refundNew);
        result.put("recommendedRegime", recommended);
        result.put("deductionsOld", totalDedOld);
        result.put("deductionsNew", totalDedNew);
        result.put("savings", Math.abs(totalTaxOld - totalTaxNew));

        return result;
    }

    private double computeOldRegimeTax(double income) {
        if (income <= 250000) return 0;
        double tax = 0;
        if (income > 250000) tax += Math.min(income - 250000, 250000) * 0.05;
        if (income > 500000) tax += Math.min(income - 500000, 500000) * 0.20;
        if (income > 1000000) tax += (income - 1000000) * 0.30;
        if (income <= 500000) tax = 0;
        return tax;
    }

    private double computeNewRegimeTax(double income) {
        if (income <= 300000) return 0;
        double tax = 0;
        if (income > 300000) tax += Math.min(income - 300000, 400000) * 0.05;
        if (income > 700000) tax += Math.min(income - 700000, 300000) * 0.10;
        if (income > 1000000) tax += Math.min(income - 1000000, 200000) * 0.15;
        if (income > 1200000) tax += Math.min(income - 1200000, 300000) * 0.20;
        if (income > 1500000) tax += (income - 1500000) * 0.30;
        if (income <= 700000) tax = 0;
        return tax;
    }
}
