package com.incometax.dto;

import com.incometax.entity.IncomeSource;
import com.incometax.entity.ReturnType;
import com.incometax.entity.TaxPaymentEntry;
import com.incometax.entity.TaxpayerType;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.PositiveOrZero;
import lombok.Data;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;

public final class IncomeTaxRequests {

    private IncomeTaxRequests() {
    }

    @Data
    public static class CreateFiling {
        @NotNull
        private String financialYear;
        @NotNull
        private String assessmentYear;
        private TaxpayerType taxpayerType;
        private ReturnType returnType;
        private String selectedRegime;
        /** METRO or NON_METRO; drives the HRA exemption cap. */
        private String state;
    }

    @Data
    public static class UpdateFiling {
        private TaxpayerType taxpayerType;
        private String selectedRegime;
        @PositiveOrZero
        private BigDecimal basicSalary;
        @PositiveOrZero
        private BigDecimal hraReceived;
        @PositiveOrZero
        private BigDecimal rentPaid;
        @Valid
        private List<IncomeSourceInput> incomeSources;
        @Valid
        private List<DeductionInput> deductions;
        @Valid
        private List<TaxPaymentInput> taxPayments;
    }

    @Data
    public static class IncomeSourceInput {
        @NotNull
        private IncomeSource.Type type;
        private String description;
        @NotNull
        @PositiveOrZero
        private BigDecimal amount;
        @PositiveOrZero
        private BigDecimal deductibleAmount;
    }

    @Data
    public static class DeductionInput {
        @NotNull
        private String section;
        private String description;
        @NotNull
        @PositiveOrZero
        private BigDecimal amount;
    }

    @Data
    public static class TaxPaymentInput {
        @NotNull
        private TaxPaymentEntry.Type type;
        @NotNull
        @PositiveOrZero
        private BigDecimal amount;
        private String deductorTan;
        private String challanNumber;
        private LocalDate paidOn;
    }
}
