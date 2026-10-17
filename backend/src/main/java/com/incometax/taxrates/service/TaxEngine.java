package com.incometax.taxrates.service;

import com.incometax.taxrates.entity.TaxCategoryRate;
import com.incometax.taxrates.entity.TaxRegimeSetting;
import com.incometax.taxrates.entity.TaxSlab;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

/**
 * Pure income-tax calculator for a resident individual. Every rate, slab, limit and exemption comes from the
 * {@link RateBook} (loaded from the database); nothing tax-specific is hard-coded here.
 *
 * <p>Steps per regime: salary less standard deduction (and HRA exemption in the old regime) → slab income from
 * every SLAB category (rent less 30%) → deductions capped by their limits and by slab income → special-rate
 * income (111A, 112, 112A, 115BB, 115BBH) with shared exemptions and the unused basic exemption → slab tax and
 * flat-rate tax → section 87A rebate (with marginal relief where configured) → surcharge (capped per category,
 * with marginal relief) → cess → rounded to the nearest ₹10 (sections 288A / 288B).
 */
public final class TaxEngine {

    public static final String SALARY = "SALARY";
    private static final BigDecimal TEN = BigDecimal.TEN;
    private static final List<String> REGIMES = List.of("OLD", "NEW");

    public record RateBook(String financialYear, String assessmentYear, List<TaxRegimeSetting> settings,
                           List<TaxSlab> slabs, List<TaxCategoryRate> categories) {
    }

    public record Input(TaxSlab.AgeGroup ageGroup, boolean metroCity, BigDecimal basicSalary,
                        BigDecimal hraReceived, BigDecimal rentPaid, Map<String, BigDecimal> amounts,
                        BigDecimal tdsOnSalary, BigDecimal otherTds, BigDecimal advanceTax) {
    }

    public record Line(String code, String name, String section, String groupCode, String treatment,
                       BigDecimal rate, BigDecimal amount, BigDecimal exemptAmount, BigDecimal taxableAmount,
                       BigDecimal tax, String note) {
    }

    public record RegimeResult(String regime, BigDecimal grossTotalIncome, BigDecimal standardDeduction,
                               BigDecimal hraExemption, BigDecimal totalDeductions, BigDecimal slabIncome,
                               BigDecimal taxableIncome, BigDecimal slabTax, BigDecimal specialRateTax,
                               BigDecimal rebate87A, BigDecimal surcharge, BigDecimal surchargeRate,
                               BigDecimal cess, BigDecimal totalTax, BigDecimal taxesPaid, BigDecimal netPayable,
                               BigDecimal refund, BigDecimal effectiveRate, List<Line> incomeLines,
                               List<Line> deductionLines) {
    }

    public record Result(String financialYear, String assessmentYear, RegimeResult oldRegime,
                         RegimeResult newRegime, String recommendedRegime, BigDecimal savings) {
    }

    private record Special(TaxCategoryRate category, BigDecimal amount, BigDecimal exempt, BigDecimal taxable) {
    }

    private record Charge(BigDecimal slabTax, BigDecimal specialTax, BigDecimal rebate, BigDecimal surcharge,
                          BigDecimal surchargeRate, List<BigDecimal> specialTaxes) {
        BigDecimal beforeCess() {
            return slabTax.add(specialTax).subtract(rebate).add(surcharge);
        }
    }

    private TaxEngine() {
    }

    public static Result compute(RateBook book, Input input) {
        Map<String, RegimeResult> results = new HashMap<>();
        for (String regime : REGIMES) {
            results.put(regime, computeRegime(book, input, regime));
        }
        RegimeResult oldR = results.get("OLD");
        RegimeResult newR = results.get("NEW");
        String recommended = oldR.totalTax().compareTo(newR.totalTax()) < 0 ? "OLD" : "NEW";
        return new Result(book.financialYear(), book.assessmentYear(), oldR, newR, recommended,
                oldR.totalTax().subtract(newR.totalTax()).abs());
    }

    public static RegimeResult computeRegime(RateBook book, Input input, String regime) {
        TaxRegimeSetting setting = book.settings().stream()
                .filter(s -> regime.equalsIgnoreCase(s.getRegime()))
                .findFirst()
                .orElseThrow(() -> new IllegalStateException("No " + regime + " regime settings for FY " + book.financialYear()));
        TaxSlab.AgeGroup age = input.ageGroup() == null ? TaxSlab.AgeGroup.BELOW_60 : input.ageGroup();
        List<TaxSlab> slabs = slabs(book, regime, TaxSlab.SlabType.INCOME_TAX, age);
        List<TaxSlab> surchargeBands = slabs(book, regime, TaxSlab.SlabType.SURCHARGE, age);
        Map<String, BigDecimal> amounts = input.amounts() == null ? Map.of() : input.amounts();

        BigDecimal salary = amount(amounts, SALARY);
        BigDecimal standardDeduction = salary.min(nz(setting.getStandardDeduction()));
        BigDecimal hraExemption = "OLD".equals(regime) ? hraExemption(input).min(salary.subtract(standardDeduction)) : BigDecimal.ZERO;

        List<Line> incomeLines = new ArrayList<>();
        List<Special> specials = new ArrayList<>();
        BigDecimal slabIncome = BigDecimal.ZERO;
        BigDecimal specialIncome = BigDecimal.ZERO;
        BigDecimal exemptIncome = BigDecimal.ZERO;
        List<TaxCategoryRate> incomeCategories = book.categories().stream()
                .filter(c -> c.isActive() && c.getKind() == TaxCategoryRate.Kind.INCOME && c.allowedIn(regime))
                .sorted(Comparator.comparingInt(TaxCategoryRate::getSortOrder))
                .toList();
        List<Line> slabLinesPending = new ArrayList<>();
        for (TaxCategoryRate category : incomeCategories) {
            BigDecimal amount = amount(amounts, category.getCode());
            if (amount.signum() <= 0) {
                continue;
            }
            switch (category.getTreatment()) {
                case EXEMPT -> {
                    exemptIncome = exemptIncome.add(amount);
                    incomeLines.add(line(category, amount, amount, BigDecimal.ZERO, BigDecimal.ZERO, "Not taxed - only reported in the return"));
                }
                case SPECIAL_RATE -> {
                    specialIncome = specialIncome.add(amount);
                    specials.add(new Special(category, amount, BigDecimal.ZERO, amount));
                }
                case SLAB -> {
                    BigDecimal exempt;
                    String note;
                    if (SALARY.equals(category.getCode())) {
                        exempt = standardDeduction.add(hraExemption);
                        note = "Standard deduction ₹" + plain(standardDeduction)
                                + (hraExemption.signum() > 0 ? " + HRA exemption ₹" + plain(hraExemption) : "");
                    } else if (category.getStandardDeductionRate() != null && category.getStandardDeductionRate().signum() > 0) {
                        exempt = money(amount.multiply(category.getStandardDeductionRate()));
                        note = pct(category.getStandardDeductionRate()) + " standard deduction for repairs";
                    } else {
                        exempt = BigDecimal.ZERO;
                        note = "Added to your income, taxed at your slab rate";
                    }
                    BigDecimal taxable = amount.subtract(exempt).max(BigDecimal.ZERO);
                    slabIncome = slabIncome.add(taxable);
                    slabLinesPending.add(line(category, amount, exempt, taxable, BigDecimal.ZERO, note));
                }
            }
        }

        List<Line> deductionLines = new ArrayList<>();
        BigDecimal claimed = BigDecimal.ZERO;
        for (TaxCategoryRate category : book.categories()) {
            if (!category.isActive() || category.getKind() != TaxCategoryRate.Kind.DEDUCTION
                    || !category.allowedIn(regime) || !category.appliesToAge(age)) {
                continue;
            }
            BigDecimal entered = category.getAutoFromCodes() != null && !category.getAutoFromCodes().isBlank()
                    ? sum(amounts, category.getAutoFromCodes())
                    : amount(amounts, category.getCode());
            if (entered.signum() <= 0) {
                continue;
            }
            BigDecimal limit = age != TaxSlab.AgeGroup.BELOW_60 && category.getSeniorDeductionLimit() != null
                    ? category.getSeniorDeductionLimit() : category.getDeductionLimit();
            BigDecimal allowed = limit == null ? entered : entered.min(limit);
            claimed = claimed.add(allowed);
            deductionLines.add(new Line(category.getCode(), category.getName(), category.getSection(), category.getGroupCode(),
                    "DEDUCTION", null, entered, allowed, BigDecimal.ZERO, BigDecimal.ZERO,
                    limit == null ? "Allowed in full" : "Allowed up to ₹" + plain(limit)));
        }
        BigDecimal totalDeductions = claimed.min(slabIncome);
        BigDecimal slabTaxable = slabIncome.subtract(totalDeductions);

        specials = applyExemptions(specials);
        BigDecimal basicExemption = basicExemption(slabs);
        BigDecimal shortfall = basicExemption.subtract(slabTaxable).max(BigDecimal.ZERO);
        List<Special> adjusted = new ArrayList<>();
        List<BigDecimal> basicUsed = new ArrayList<>();
        for (Special special : specials) {
            BigDecimal use = special.category().isBasicExemptionAdjustable() ? shortfall.min(special.taxable()) : BigDecimal.ZERO;
            shortfall = shortfall.subtract(use);
            basicUsed.add(use);
            adjusted.add(new Special(special.category(), special.amount(), special.exempt(), special.taxable().subtract(use)));
        }

        // Total income counts gains after the 112A exemption but before the basic-exemption adjustment.
        BigDecimal totalIncome = round10(slabTaxable.add(specials.stream().map(Special::taxable).reduce(BigDecimal.ZERO, BigDecimal::add)));
        Charge charge = charge(setting, regime, slabs, surchargeBands, slabTaxable, adjusted, totalIncome);
        BigDecimal surcharge = charge.surcharge();
        if (surcharge.signum() > 0) {
            surcharge = surcharge.subtract(surchargeRelief(setting, regime, slabs, surchargeBands, slabTaxable, adjusted, totalIncome, charge))
                    .max(BigDecimal.ZERO);
        }
        BigDecimal beforeCess = charge.slabTax().add(charge.specialTax()).subtract(charge.rebate()).add(surcharge);
        BigDecimal cess = money(beforeCess.multiply(nz(setting.getCessRate())));
        BigDecimal totalTax = round10(beforeCess.add(cess));

        for (Line pending : slabLinesPending) {
            BigDecimal share = slabIncome.signum() == 0 ? BigDecimal.ZERO
                    : money(charge.slabTax().multiply(pending.taxableAmount()).divide(slabIncome, 10, RoundingMode.HALF_UP));
            incomeLines.add(withTax(pending, share));
        }
        for (int i = 0; i < adjusted.size(); i++) {
            Special special = adjusted.get(i);
            TaxCategoryRate category = special.category();
            String note = "Flat " + pct(category.getRate());
            if (special.exempt().signum() > 0) {
                note += ", first ₹" + plain(special.exempt()) + " tax-free";
            }
            if (basicUsed.get(i).signum() > 0) {
                note += ", ₹" + plain(basicUsed.get(i)) + " covered by unused basic exemption";
            }
            incomeLines.add(line(category, special.amount(), special.exempt().add(basicUsed.get(i)), special.taxable(),
                    charge.specialTaxes().get(i), note));
        }

        BigDecimal taxesPaid = nz(input.tdsOnSalary()).add(nz(input.otherTds())).add(nz(input.advanceTax()));
        BigDecimal net = totalTax.subtract(taxesPaid);
        BigDecimal grossTotal = slabIncome.add(specialIncome);
        BigDecimal effectiveRate = grossTotal.signum() == 0 ? BigDecimal.ZERO
                : totalTax.multiply(BigDecimal.valueOf(100)).divide(grossTotal, 4, RoundingMode.HALF_UP);
        return new RegimeResult(regime, money(grossTotal), standardDeduction, hraExemption, money(totalDeductions),
                money(slabTaxable), totalIncome, charge.slabTax(), charge.specialTax(), charge.rebate(), money(surcharge),
                charge.surchargeRate(), cess, totalTax, money(taxesPaid), net.signum() > 0 ? money(net) : BigDecimal.ZERO.setScale(2),
                net.signum() < 0 ? money(net.negate()) : BigDecimal.ZERO.setScale(2), effectiveRate, incomeLines, deductionLines);
    }

    /** Shared exemptions (₹1.25 lakh for 112A) go to the highest-rate gains first, which is always the cheapest for the user. */
    private static List<Special> applyExemptions(List<Special> specials) {
        List<Special> sorted = specials.stream()
                .sorted(Comparator.comparing((Special s) -> nz(s.category().getRate())).reversed())
                .toList();
        Map<String, BigDecimal> remaining = new HashMap<>();
        List<Special> out = new ArrayList<>();
        for (Special special : sorted) {
            TaxCategoryRate category = special.category();
            BigDecimal exempt = BigDecimal.ZERO;
            if (category.getExemptionLimit() != null && category.getExemptionLimit().signum() > 0) {
                String group = category.getExemptionGroup() == null ? category.getCode() : category.getExemptionGroup();
                BigDecimal left = remaining.computeIfAbsent(group, g -> category.getExemptionLimit());
                exempt = left.min(special.amount());
                remaining.put(group, left.subtract(exempt));
            }
            out.add(new Special(category, special.amount(), exempt, special.amount().subtract(exempt)));
        }
        return out;
    }

    private static Charge charge(TaxRegimeSetting setting, String regime, List<TaxSlab> slabs, List<TaxSlab> surchargeBands,
                                 BigDecimal slabTaxable, List<Special> specials, BigDecimal totalIncome) {
        BigDecimal slabTax = slabTax(slabTaxable, slabs);
        List<BigDecimal> specialTaxes = new ArrayList<>();
        BigDecimal specialTax = BigDecimal.ZERO;
        BigDecimal rebatableSpecial = BigDecimal.ZERO;
        for (Special special : specials) {
            BigDecimal tax = money(special.taxable().multiply(nz(special.category().getRate())));
            specialTaxes.add(tax);
            specialTax = specialTax.add(tax);
            if (special.category().rebateAllowedIn(regime)) {
                rebatableSpecial = rebatableSpecial.add(tax);
            }
        }

        BigDecimal rebatable = slabTax.add(rebatableSpecial);
        BigDecimal rebate = BigDecimal.ZERO;
        BigDecimal limit = nz(setting.getRebateIncomeLimit());
        if (totalIncome.compareTo(limit) <= 0) {
            rebate = rebatable.min(nz(setting.getRebateMaxAmount()));
        } else if (setting.isRebateMarginalRelief()) {
            BigDecimal excess = totalIncome.subtract(limit);
            if (rebatable.compareTo(excess) > 0) {
                rebate = rebatable.subtract(excess);
            }
        }
        BigDecimal rebateOnSlab = rebate.min(slabTax);
        BigDecimal rebateOnSpecial = rebate.subtract(rebateOnSlab);

        BigDecimal rate = bandRate(surchargeBands, totalIncome).min(nz(setting.getMaxSurchargeRate()));
        BigDecimal surcharge = BigDecimal.ZERO;
        if (rate.signum() > 0) {
            surcharge = slabTax.subtract(rebateOnSlab).multiply(rate);
            BigDecimal specialLeft = rebateOnSpecial;
            for (int i = 0; i < specials.size(); i++) {
                TaxCategoryRate category = specials.get(i).category();
                BigDecimal tax = specialTaxes.get(i);
                if (category.rebateAllowedIn(regime) && specialLeft.signum() > 0) {
                    BigDecimal used = specialLeft.min(tax);
                    tax = tax.subtract(used);
                    specialLeft = specialLeft.subtract(used);
                }
                BigDecimal categoryRate = category.getSurchargeCap() == null ? rate : rate.min(category.getSurchargeCap());
                surcharge = surcharge.add(tax.multiply(categoryRate));
            }
        }
        return new Charge(slabTax, money(specialTax), money(rebate), money(surcharge), rate, specialTaxes);
    }

    /** Surcharge marginal relief: extra tax over the threshold may not exceed the extra income over it. */
    private static BigDecimal surchargeRelief(TaxRegimeSetting setting, String regime, List<TaxSlab> slabs,
                                              List<TaxSlab> surchargeBands, BigDecimal slabTaxable, List<Special> specials,
                                              BigDecimal totalIncome, Charge charge) {
        TaxSlab band = band(surchargeBands, totalIncome);
        if (band == null) {
            return BigDecimal.ZERO;
        }
        BigDecimal threshold = band.getIncomeFrom();
        BigDecimal excess = totalIncome.subtract(threshold);
        BigDecimal reduceSlab = excess.min(slabTaxable);
        BigDecimal left = excess.subtract(reduceSlab);
        List<Special> reduced = new ArrayList<>();
        for (Special special : specials) {
            BigDecimal cut = left.min(special.taxable());
            left = left.subtract(cut);
            reduced.add(new Special(special.category(), special.amount(), special.exempt(), special.taxable().subtract(cut)));
        }
        Charge atThreshold = charge(setting, regime, slabs, surchargeBands, slabTaxable.subtract(reduceSlab), reduced, threshold);
        BigDecimal relief = charge.beforeCess().subtract(atThreshold.beforeCess().add(excess));
        return relief.max(BigDecimal.ZERO).min(charge.surcharge());
    }

    private static BigDecimal hraExemption(Input input) {
        BigDecimal hra = nz(input.hraReceived());
        BigDecimal rent = nz(input.rentPaid());
        BigDecimal basic = nz(input.basicSalary());
        if (hra.signum() <= 0 || rent.signum() <= 0) {
            return BigDecimal.ZERO;
        }
        BigDecimal rentLessTenPercent = rent.subtract(basic.multiply(new BigDecimal("0.10")));
        BigDecimal cityLimit = basic.multiply(new BigDecimal(input.metroCity() ? "0.50" : "0.40"));
        return money(hra.min(rentLessTenPercent).min(cityLimit).max(BigDecimal.ZERO));
    }

    static BigDecimal slabTax(BigDecimal income, List<TaxSlab> slabs) {
        BigDecimal tax = BigDecimal.ZERO;
        for (TaxSlab slab : slabs) {
            if (income.compareTo(slab.getIncomeFrom()) <= 0) {
                continue;
            }
            BigDecimal upper = slab.getIncomeTo() == null ? income : slab.getIncomeTo().min(income);
            tax = tax.add(upper.subtract(slab.getIncomeFrom()).max(BigDecimal.ZERO).multiply(slab.getRate()));
        }
        return money(tax);
    }

    private static BigDecimal basicExemption(List<TaxSlab> slabs) {
        return slabs.stream()
                .filter(s -> s.getRate().signum() == 0 && s.getIncomeFrom().signum() == 0 && s.getIncomeTo() != null)
                .map(TaxSlab::getIncomeTo)
                .findFirst()
                .orElse(BigDecimal.ZERO);
    }

    private static TaxSlab band(List<TaxSlab> bands, BigDecimal income) {
        TaxSlab found = null;
        for (TaxSlab band : bands) {
            if (income.compareTo(band.getIncomeFrom()) > 0
                    && (band.getIncomeTo() == null || income.compareTo(band.getIncomeTo()) <= 0)) {
                found = band;
            }
        }
        return found;
    }

    private static BigDecimal bandRate(List<TaxSlab> bands, BigDecimal income) {
        TaxSlab band = band(bands, income);
        return band == null ? BigDecimal.ZERO : band.getRate();
    }

    private static List<TaxSlab> slabs(RateBook book, String regime, TaxSlab.SlabType type, TaxSlab.AgeGroup age) {
        List<TaxSlab> forRegime = book.slabs().stream()
                .filter(s -> regime.equalsIgnoreCase(s.getRegime()) && s.getSlabType() == type)
                .sorted(Comparator.comparingInt(TaxSlab::getSortOrder))
                .toList();
        List<TaxSlab> forAge = forRegime.stream().filter(s -> s.getAgeGroup() == age).toList();
        return forAge.isEmpty() ? forRegime.stream().filter(s -> s.getAgeGroup() == TaxSlab.AgeGroup.ALL).toList() : forAge;
    }

    private static Line line(TaxCategoryRate c, BigDecimal amount, BigDecimal exempt, BigDecimal taxable, BigDecimal tax, String note) {
        return new Line(c.getCode(), c.getName(), c.getSection(), c.getGroupCode(), c.getTreatment().name(), c.getRate(),
                money(amount), money(exempt), money(taxable), money(tax), note);
    }

    private static Line withTax(Line l, BigDecimal tax) {
        return new Line(l.code(), l.name(), l.section(), l.groupCode(), l.treatment(), l.rate(), l.amount(),
                l.exemptAmount(), l.taxableAmount(), tax, l.note());
    }

    private static BigDecimal amount(Map<String, BigDecimal> amounts, String code) {
        BigDecimal value = amounts.get(code);
        return value == null ? BigDecimal.ZERO : money(value.max(BigDecimal.ZERO));
    }

    private static BigDecimal sum(Map<String, BigDecimal> amounts, String csv) {
        BigDecimal total = BigDecimal.ZERO;
        for (String code : csv.split(",")) {
            total = total.add(amount(amounts, code.trim()));
        }
        return total;
    }

    private static BigDecimal nz(BigDecimal value) {
        return value == null ? BigDecimal.ZERO : value;
    }

    private static BigDecimal money(BigDecimal value) {
        return value.setScale(2, RoundingMode.HALF_UP);
    }

    static BigDecimal round10(BigDecimal value) {
        return value.divide(TEN, 0, RoundingMode.HALF_UP).multiply(TEN).setScale(2, RoundingMode.UNNECESSARY);
    }

    private static String pct(BigDecimal rate) {
        return rate == null ? "" : rate.multiply(BigDecimal.valueOf(100)).stripTrailingZeros().toPlainString() + "%";
    }

    private static String plain(BigDecimal value) {
        return value.setScale(0, RoundingMode.HALF_UP).toPlainString();
    }
}
