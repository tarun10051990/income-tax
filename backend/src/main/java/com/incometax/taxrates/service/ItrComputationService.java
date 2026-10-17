package com.incometax.taxrates.service;

import com.incometax.entity.User;
import com.incometax.exception.ApiException;
import com.incometax.taxrates.dto.TaxRateDtos;
import com.incometax.taxrates.entity.ItrIncomeEntry;
import com.incometax.taxrates.entity.ItrRegimeResult;
import com.incometax.taxrates.entity.ItrTaxComputation;
import com.incometax.taxrates.entity.ItrTaxLine;
import com.incometax.taxrates.entity.TaxCategoryRate;
import com.incometax.taxrates.entity.TaxSlab;
import com.incometax.taxrates.repository.ItrTaxComputationRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.function.Function;
import java.util.stream.Collectors;

/** Computes tax from the ITR form using the rate tables and stores every category and result in the database. */
@Service
@RequiredArgsConstructor
public class ItrComputationService {

    private final TaxRateService taxRateService;
    private final ItrTaxComputationRepository computationRepository;

    @Transactional(readOnly = true)
    public TaxEngine.Result estimate(TaxRateDtos.ComputeRequest request) {
        TaxEngine.RateBook book = taxRateService.book(request.financialYear());
        return TaxEngine.compute(book, toInput(request, validate(book, request.amounts())));
    }

    @Transactional
    public TaxRateDtos.SavedComputation computeAndSave(TaxRateDtos.ComputeRequest request, User user) {
        TaxEngine.RateBook book = taxRateService.book(request.financialYear());
        Map<String, BigDecimal> amounts = validate(book, request.amounts());
        TaxEngine.Result result = TaxEngine.compute(book, toInput(request, amounts));

        ItrTaxComputation computation = computationRepository
                .findByUserIdAndFinancialYear(user.getId(), request.financialYear())
                .orElseGet(() -> ItrTaxComputation.builder().userId(user.getId()).financialYear(request.financialYear()).build());
        computation.setAssessmentYear(book.assessmentYear());
        computation.setAgeGroup(ageGroup(request));
        computation.setMetroCity(request.metroCity());
        computation.setBasicSalary(request.basicSalary());
        computation.setHraReceived(request.hraReceived());
        computation.setRentPaid(request.rentPaid());
        computation.setTdsOnSalary(request.tdsOnSalary());
        computation.setOtherTds(request.otherTds());
        computation.setAdvanceTax(request.advanceTax());
        computation.setRecommendedRegime(result.recommendedRegime());
        computation.setSavings(result.savings());
        computation.setUpdatedAt(LocalDateTime.now());

        Map<String, TaxCategoryRate> byCode = book.categories().stream()
                .collect(Collectors.toMap(TaxCategoryRate::getCode, Function.identity(), (a, b) -> a));
        // flush the removals first so re-adding OLD / NEW rows does not hit the (computation_id, regime) unique key
        computation.getEntries().clear();
        computation.getResults().clear();
        ItrTaxComputation managed = computationRepository.saveAndFlush(computation);
        amounts.forEach((code, amount) -> {
            TaxCategoryRate category = byCode.get(code);
            managed.getEntries().add(ItrIncomeEntry.builder().computation(managed).categoryCode(code)
                    .kind(category.getKind()).amount(amount).sortOrder(category.getSortOrder()).build());
        });
        managed.getResults().add(toEntity(managed, result.oldRegime()));
        managed.getResults().add(toEntity(managed, result.newRegime()));
        ItrTaxComputation saved = computationRepository.save(managed);
        return new TaxRateDtos.SavedComputation(saved.getId(), request, result, saved.getUpdatedAt().toString());
    }

    @Transactional(readOnly = true)
    public Optional<TaxRateDtos.SavedComputation> saved(String financialYear, User user) {
        return computationRepository.findByUserIdAndFinancialYear(user.getId(), financialYear).map(this::toView);
    }

    private TaxRateDtos.SavedComputation toView(ItrTaxComputation c) {
        Map<String, BigDecimal> amounts = new LinkedHashMap<>();
        c.getEntries().forEach(e -> amounts.put(e.getCategoryCode(), e.getAmount()));
        TaxRateDtos.ComputeRequest input = new TaxRateDtos.ComputeRequest(c.getFinancialYear(), c.getAgeGroup(), c.isMetroCity(),
                c.getBasicSalary(), c.getHraReceived(), c.getRentPaid(), amounts, c.getTdsOnSalary(), c.getOtherTds(), c.getAdvanceTax());
        TaxEngine.RegimeResult oldR = null;
        TaxEngine.RegimeResult newR = null;
        for (ItrRegimeResult r : c.getResults()) {
            if ("OLD".equals(r.getRegime())) {
                oldR = fromEntity(r);
            } else {
                newR = fromEntity(r);
            }
        }
        TaxEngine.Result result = new TaxEngine.Result(c.getFinancialYear(), c.getAssessmentYear(), oldR, newR,
                c.getRecommendedRegime(), c.getSavings());
        return new TaxRateDtos.SavedComputation(c.getId(), input, result, c.getUpdatedAt().toString());
    }

    private static final int MAX_ENTRIES = 100;
    private static final BigDecimal MAX_AMOUNT = new BigDecimal("1000000000000");

    private static Map<String, BigDecimal> validate(TaxEngine.RateBook book, Map<String, BigDecimal> amounts) {
        Map<String, TaxCategoryRate> active = book.categories().stream().filter(TaxCategoryRate::isActive)
                .collect(Collectors.toMap(TaxCategoryRate::getCode, Function.identity(), (a, b) -> a));
        Map<String, BigDecimal> clean = new LinkedHashMap<>();
        if (amounts == null) {
            return clean;
        }
        if (amounts.size() > MAX_ENTRIES) {
            throw ApiException.badRequest("TOO_MANY_ENTRIES", "Too many income or deduction entries");
        }
        amounts.forEach((code, amount) -> {
            if (amount == null || amount.signum() == 0) {
                return;
            }
            if (!active.containsKey(code)) {
                throw ApiException.badRequest("UNKNOWN_CATEGORY", "Unknown income or deduction category: " + code);
            }
            if (amount.signum() < 0) {
                throw ApiException.badRequest("NEGATIVE_AMOUNT", "Amount for " + active.get(code).getName() + " cannot be negative");
            }
            if (amount.compareTo(MAX_AMOUNT) > 0) {
                throw ApiException.badRequest("AMOUNT_TOO_LARGE", "Amount for " + active.get(code).getName() + " is too large");
            }
            clean.put(code, amount.setScale(2, java.math.RoundingMode.HALF_UP));
        });
        return clean;
    }

    private static TaxSlab.AgeGroup ageGroup(TaxRateDtos.ComputeRequest request) {
        return request.ageGroup() == null || request.ageGroup() == TaxSlab.AgeGroup.ALL ? TaxSlab.AgeGroup.BELOW_60 : request.ageGroup();
    }

    private static TaxEngine.Input toInput(TaxRateDtos.ComputeRequest r, Map<String, BigDecimal> amounts) {
        return new TaxEngine.Input(ageGroup(r), r.metroCity(), r.basicSalary(), r.hraReceived(), r.rentPaid(), amounts,
                r.tdsOnSalary(), r.otherTds(), r.advanceTax());
    }

    private static ItrRegimeResult toEntity(ItrTaxComputation computation, TaxEngine.RegimeResult r) {
        ItrRegimeResult entity = ItrRegimeResult.builder().computation(computation).regime(r.regime())
                .grossTotalIncome(r.grossTotalIncome()).standardDeduction(r.standardDeduction()).hraExemption(r.hraExemption())
                .totalDeductions(r.totalDeductions()).slabIncome(r.slabIncome()).taxableIncome(r.taxableIncome())
                .slabTax(r.slabTax()).specialRateTax(r.specialRateTax()).rebate87A(r.rebate87A()).surcharge(r.surcharge())
                .surchargeRate(r.surchargeRate()).cess(r.cess()).totalTax(r.totalTax()).taxesPaid(r.taxesPaid())
                .netPayable(r.netPayable()).refund(r.refund()).effectiveRate(r.effectiveRate()).build();
        int order = 0;
        List<TaxEngine.Line> lines = new ArrayList<>(r.incomeLines());
        lines.addAll(r.deductionLines());
        for (TaxEngine.Line l : lines) {
            entity.getLines().add(ItrTaxLine.builder().result(entity).categoryCode(l.code()).name(l.name()).section(l.section())
                    .groupCode(l.groupCode()).treatment(l.treatment()).rate(l.rate()).amount(l.amount())
                    .exemptAmount(l.exemptAmount()).taxableAmount(l.taxableAmount()).tax(l.tax()).note(l.note())
                    .sortOrder(order++).build());
        }
        return entity;
    }

    private static TaxEngine.RegimeResult fromEntity(ItrRegimeResult r) {
        List<TaxEngine.Line> income = new ArrayList<>();
        List<TaxEngine.Line> deductions = new ArrayList<>();
        for (ItrTaxLine l : r.getLines()) {
            TaxEngine.Line line = new TaxEngine.Line(l.getCategoryCode(), l.getName(), l.getSection(), l.getGroupCode(),
                    l.getTreatment(), l.getRate(), l.getAmount(), l.getExemptAmount(), l.getTaxableAmount(), l.getTax(), l.getNote());
            ("DEDUCTION".equals(l.getTreatment()) ? deductions : income).add(line);
        }
        return new TaxEngine.RegimeResult(r.getRegime(), r.getGrossTotalIncome(), r.getStandardDeduction(), r.getHraExemption(),
                r.getTotalDeductions(), r.getSlabIncome(), r.getTaxableIncome(), r.getSlabTax(), r.getSpecialRateTax(),
                r.getRebate87A(), r.getSurcharge(), r.getSurchargeRate(), r.getCess(), r.getTotalTax(), r.getTaxesPaid(),
                r.getNetPayable(), r.getRefund(), r.getEffectiveRate(), income, deductions);
    }
}
