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

    public String getFinancialYear() {
        return financialYear;
    }

    public void setFinancialYear(String financialYear) {
        this.financialYear = financialYear;
    }

    public SalaryDetails getSalary() {
        return salary;
    }

    public void setSalary(SalaryDetails salary) {
        this.salary = salary;
    }

    public Deductions getDeductions() {
        return deductions;
    }

    public void setDeductions(Deductions deductions) {
        this.deductions = deductions;
    }

    public AdditionalIncome getAdditionalIncome() {
        return additionalIncome;
    }

    public void setAdditionalIncome(AdditionalIncome additionalIncome) {
        this.additionalIncome = additionalIncome;
    }

    public double getTdsDeducted() {
        return tdsDeducted;
    }

    public void setTdsDeducted(double tdsDeducted) {
        this.tdsDeducted = tdsDeducted;
    }

    public boolean isMetroCity() {
        return metroCity;
    }

    public void setMetroCity(boolean metroCity) {
        this.metroCity = metroCity;
    }

    public double getRentPaid() {
        return rentPaid;
    }

    public void setRentPaid(double rentPaid) {
        this.rentPaid = rentPaid;
    }

    @Data
    public static class SalaryDetails {
        private double basicSalary;
        private double hra;
        private double specialAllowance;
        private double bonus;
        private double leaveEncashment;
        private double otherAllowances;

        public double getBasicSalary() {
            return basicSalary;
        }

        public void setBasicSalary(double basicSalary) {
            this.basicSalary = basicSalary;
        }

        public double getHra() {
            return hra;
        }

        public void setHra(double hra) {
            this.hra = hra;
        }

        public double getSpecialAllowance() {
            return specialAllowance;
        }

        public void setSpecialAllowance(double specialAllowance) {
            this.specialAllowance = specialAllowance;
        }

        public double getBonus() {
            return bonus;
        }

        public void setBonus(double bonus) {
            this.bonus = bonus;
        }

        public double getLeaveEncashment() {
            return leaveEncashment;
        }

        public void setLeaveEncashment(double leaveEncashment) {
            this.leaveEncashment = leaveEncashment;
        }

        public double getOtherAllowances() {
            return otherAllowances;
        }

        public void setOtherAllowances(double otherAllowances) {
            this.otherAllowances = otherAllowances;
        }
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

        public double getPfContribution() {
            return pfContribution;
        }

        public void setPfContribution(double pfContribution) {
            this.pfContribution = pfContribution;
        }

        public double getProfessionalTax() {
            return professionalTax;
        }

        public void setProfessionalTax(double professionalTax) {
            this.professionalTax = professionalTax;
        }

        public double getStandardDeduction() {
            return standardDeduction;
        }

        public void setStandardDeduction(double standardDeduction) {
            this.standardDeduction = standardDeduction;
        }

        public double getSection80C() {
            return section80C;
        }

        public void setSection80C(double section80C) {
            this.section80C = section80C;
        }

        public double getSection80CCD1B() {
            return section80CCD1B;
        }

        public void setSection80CCD1B(double section80CCD1B) {
            this.section80CCD1B = section80CCD1B;
        }

        public double getSection80D() {
            return section80D;
        }

        public void setSection80D(double section80D) {
            this.section80D = section80D;
        }

        public double getSection80TTA() {
            return section80TTA;
        }

        public void setSection80TTA(double section80TTA) {
            this.section80TTA = section80TTA;
        }

        public double getSection24() {
            return section24;
        }

        public void setSection24(double section24) {
            this.section24 = section24;
        }

        public double getOtherDeductions() {
            return otherDeductions;
        }

        public void setOtherDeductions(double otherDeductions) {
            this.otherDeductions = otherDeductions;
        }

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

        public double getSavingsInterest() {
            return savingsInterest;
        }

        public void setSavingsInterest(double savingsInterest) {
            this.savingsInterest = savingsInterest;
        }

        public double getFdInterest() {
            return fdInterest;
        }

        public void setFdInterest(double fdInterest) {
            this.fdInterest = fdInterest;
        }

        public double getRdInterest() {
            return rdInterest;
        }

        public void setRdInterest(double rdInterest) {
            this.rdInterest = rdInterest;
        }

        public double getCapitalGainsSTCG() {
            return capitalGainsSTCG;
        }

        public void setCapitalGainsSTCG(double capitalGainsSTCG) {
            this.capitalGainsSTCG = capitalGainsSTCG;
        }

        public double getCapitalGainsLTCG() {
            return capitalGainsLTCG;
        }

        public void setCapitalGainsLTCG(double capitalGainsLTCG) {
            this.capitalGainsLTCG = capitalGainsLTCG;
        }

        public double getRentalIncome() {
            return rentalIncome;
        }

        public void setRentalIncome(double rentalIncome) {
            this.rentalIncome = rentalIncome;
        }

        public double getOtherIncome() {
            return otherIncome;
        }

        public void setOtherIncome(double otherIncome) {
            this.otherIncome = otherIncome;
        }
    }
}
