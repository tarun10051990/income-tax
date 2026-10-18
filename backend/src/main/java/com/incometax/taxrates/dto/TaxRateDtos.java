package com.incometax.taxrates.dto;

import com.incometax.taxrates.entity.TaxCategoryRate;
import com.incometax.taxrates.entity.TaxRegimeSetting;
import com.incometax.taxrates.entity.TaxSlab;
import com.incometax.taxrates.service.TaxEngine;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

import java.math.BigDecimal;
import java.util.List;
import java.util.Map;

public final class TaxRateDtos {

    private TaxRateDtos() {
    }

    public record YearView(String financialYear, String assessmentYear) {
    }

    public record RateBookView(String financialYear, String assessmentYear, List<TaxRegimeSetting> settings,
                               List<TaxSlab> slabs, List<TaxCategoryRate> categories) {
    }

    public record ComputeRequest(
            @NotBlank String financialYear,
            TaxSlab.AgeGroup ageGroup,
            boolean metroCity,
            @DecimalMin("0") BigDecimal basicSalary,
            @DecimalMin("0") BigDecimal hraReceived,
            @DecimalMin("0") BigDecimal rentPaid,
            Map<String, BigDecimal> amounts,
            @DecimalMin("0") BigDecimal tdsOnSalary,
            @DecimalMin("0") BigDecimal otherTds,
            @DecimalMin("0") BigDecimal advanceTax) {
    }

    public record SavedComputation(String id, ComputeRequest input, TaxEngine.Result result, String updatedAt) {
    }

    public record ExportRequest(
            @NotBlank String financialYear,
            @NotNull com.incometax.taxrates.service.ItrExporter.Format format,
            @jakarta.validation.constraints.Size(max = 10) String itrType,
            @jakarta.validation.constraints.Size(max = 120) String name,
            @jakarta.validation.constraints.Size(max = 10) String pan,
            @jakarta.validation.constraints.Size(max = 200) String employerName,
            @jakarta.validation.constraints.Size(max = 10) String employerTan,
            @jakarta.validation.constraints.Size(max = 120) String bankName,
            @jakarta.validation.constraints.Size(max = 34) String accountNumber,
            @jakarta.validation.constraints.Size(max = 11) String ifsc,
            @jakarta.validation.constraints.Size(max = 20) String accountType) {
    }

    public record CategoryUpdate(
            @NotBlank String name,
            String hint,
            String section,
            @NotNull TaxCategoryRate.Treatment treatment,
            BigDecimal rate,
            BigDecimal exemptionLimit,
            String exemptionGroup,
            BigDecimal standardDeductionRate,
            boolean basicExemptionAdjustable,
            String rebateRegimes,
            BigDecimal surchargeCap,
            BigDecimal deductionLimit,
            BigDecimal seniorDeductionLimit,
            @NotBlank String allowedRegimes,
            String ageGroups,
            String autoFromCodes,
            Integer sortOrder,
            boolean active) {
    }

    public record SettingUpdate(
            @NotNull @DecimalMin("0") BigDecimal standardDeduction,
            @NotNull @DecimalMin("0") BigDecimal rebateIncomeLimit,
            @NotNull @DecimalMin("0") BigDecimal rebateMaxAmount,
            boolean rebateMarginalRelief,
            @NotNull @DecimalMin("0") BigDecimal cessRate,
            @NotNull @DecimalMin("0") BigDecimal maxSurchargeRate) {
    }

    public record SlabUpdate(
            @NotNull @DecimalMin("0") BigDecimal incomeFrom,
            BigDecimal incomeTo,
            @NotNull @DecimalMin("0") BigDecimal rate) {
    }

    public record CopyYearRequest(@NotBlank String fromFinancialYear, @NotBlank String toFinancialYear,
                                  @NotBlank String toAssessmentYear) {
    }
}
