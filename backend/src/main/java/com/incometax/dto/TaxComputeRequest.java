package com.incometax.dto;

import lombok.Data;

@Data
public class TaxComputeRequest {
    private String financialYear;
    private SalaryDetails salary;
    private Deductions deductions;
    private AdditionalIncome additionalIncome;
    private double tdsDeducted;
    private boolean metroCity;
    private double rentPaid;

    @Data
    public static class SalaryDetails {
        private double basicSalary;
        private double hra;
        private double specialAllowance;
        private double bonus;
        private double leaveEncashment;
        private double otherAllowances;
    }

    @Data
    public static class Deductions {
        private double pfContribution;
        private double professionalTax;
        private double standardDeduction;
        private double section80C;
        private double section80CCD1B;
        private double section80D;
        private double section80TTA;
        private double section24;
        private double otherDeductions;
    }

    @Data
    public static class AdditionalIncome {
        private double savingsInterest;
        private double fdInterest;
        private double rdInterest;
        private double capitalGainsSTCG;
        private double capitalGainsLTCG;
        private double rentalIncome;
        private double otherIncome;
    }
}
