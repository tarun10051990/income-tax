package com.incometax.taxrates;

import com.fasterxml.jackson.databind.DeserializationFeature;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.incometax.taxrates.entity.TaxCategoryRate;
import com.incometax.taxrates.entity.TaxRegimeSetting;
import com.incometax.taxrates.entity.TaxSlab;
import com.incometax.taxrates.service.TaxEngine;
import org.junit.jupiter.api.Test;

import java.io.InputStream;
import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;

/** Worked examples checked by hand against the Income-tax Act rates shipped in seed/tax-rates.json. */
class TaxEngineTest {

    private static final ObjectMapper MAPPER = new ObjectMapper()
            .configure(DeserializationFeature.FAIL_ON_UNKNOWN_PROPERTIES, false);

    static TaxEngine.RateBook book(String fy) throws Exception {
        try (InputStream in = TaxEngineTest.class.getClassLoader().getResourceAsStream("seed/tax-rates.json")) {
            for (JsonNode year : MAPPER.readTree(in).path("years")) {
                if (!fy.equals(year.path("financialYear").asText())) {
                    continue;
                }
                List<TaxRegimeSetting> settings = new ArrayList<>();
                List<TaxSlab> slabs = new ArrayList<>();
                List<TaxCategoryRate> categories = new ArrayList<>();
                for (JsonNode n : year.path("regimes")) settings.add(MAPPER.treeToValue(n, TaxRegimeSetting.class));
                for (JsonNode n : year.path("slabs")) slabs.add(MAPPER.treeToValue(n, TaxSlab.class));
                for (JsonNode n : year.path("categories")) {
                    TaxCategoryRate c = MAPPER.treeToValue(n, TaxCategoryRate.class);
                    if (c.getAllowedRegimes() == null) c.setAllowedRegimes("OLD,NEW");
                    c.setActive(true);
                    categories.add(c);
                }
                return new TaxEngine.RateBook(fy, year.path("assessmentYear").asText(), settings, slabs, categories);
            }
        }
        throw new IllegalArgumentException(fy);
    }

    private static TaxEngine.Result run(String fy, TaxSlab.AgeGroup age, Object... codeAmounts) throws Exception {
        Map<String, BigDecimal> amounts = new HashMap<>();
        for (int i = 0; i < codeAmounts.length; i += 2) {
            amounts.put((String) codeAmounts[i], new BigDecimal(codeAmounts[i + 1].toString()));
        }
        return TaxEngine.compute(book(fy), new TaxEngine.Input(age, false, null, null, null, amounts, null, null, null));
    }

    private static TaxEngine.Result run(String fy, Object... codeAmounts) throws Exception {
        return run(fy, TaxSlab.AgeGroup.BELOW_60, codeAmounts);
    }

    private static void tax(TaxEngine.RegimeResult r, String expected) {
        assertThat(r.totalTax()).isEqualByComparingTo(expected);
    }

    @Test
    void newRegime2025SalaryUpTo1275000IsTaxFree() throws Exception {
        TaxEngine.Result r = run("2025-26", "SALARY", 1275000);
        assertThat(r.newRegime().taxableIncome()).isEqualByComparingTo("1200000");
        assertThat(r.newRegime().slabTax()).isEqualByComparingTo("60000");
        assertThat(r.newRegime().rebate87A()).isEqualByComparingTo("60000");
        tax(r.newRegime(), "0");
        assertThat(r.recommendedRegime()).isEqualTo("NEW");
    }

    @Test
    void newRegime2025MarginalReliefJustAboveTwelveLakh() throws Exception {
        // income 12.10L: slab tax 61,500 limited to the 10,000 earned above 12L, plus 4% cess
        tax(run("2025-26", "SALARY", 1285000).newRegime(), "10400");
        // income 13L: slab tax 75,000 is below the 1L excess, so no relief: 75,000 + 3,000 cess
        tax(run("2025-26", "SALARY", 1375000).newRegime(), "78000");
    }

    @Test
    void equityLongTermGainGetsOneLakhTwentyFiveThousandFreeAndNoRebate() throws Exception {
        TaxEngine.Result r = run("2025-26", "SALARY", 1075000, "EQUITY_LTCG_112A", 200000);
        // slab tax 40,000 on 10L is fully rebated; (2L - 1.25L) x 12.5% = 9,375 + 375 cess
        assertThat(r.newRegime().rebate87A()).isEqualByComparingTo("40000");
        assertThat(r.newRegime().specialRateTax()).isEqualByComparingTo("9375");
        tax(r.newRegime(), "9750");
        TaxEngine.Line ltcg = r.newRegime().incomeLines().stream()
                .filter(l -> l.code().equals("EQUITY_LTCG_112A")).findFirst().orElseThrow();
        assertThat(ltcg.exemptAmount()).isEqualByComparingTo("125000");
        assertThat(ltcg.taxableAmount()).isEqualByComparingTo("75000");
    }

    @Test
    void unusedBasicExemptionIsAdjustedAgainstShortTermEquityGains() throws Exception {
        TaxEngine.Result r = run("2025-26", "EQUITY_STCG_111A", 500000);
        // new: (5L - 4L basic exemption) x 20% = 20,000; rebate not allowed on 111A in the new regime
        tax(r.newRegime(), "20800");
        // old: (5L - 2.5L) x 20% = 50,000 less 12,500 rebate = 37,500 + 1,500 cess
        tax(r.oldRegime(), "39000");
        assertThat(r.recommendedRegime()).isEqualTo("NEW");
        assertThat(r.savings()).isEqualByComparingTo("18200");
    }

    @Test
    void oldRegimeDeductionsAreCappedAtTheirLimits() throws Exception {
        TaxEngine.Result r = run("2025-26", "SALARY", 1000000, "INTEREST_SAVINGS", 15000,
                "DED_80C", 200000, "DED_80D_SELF", 30000);
        // old: 10L - 50k + 15k - (1.5L + 25k + 10k 80TTA) = 7.8L -> 12,500 + 56,000 = 68,500 + 2,740 cess
        assertThat(r.oldRegime().totalDeductions()).isEqualByComparingTo("185000");
        tax(r.oldRegime(), "71240");
        // new: 9.4L, deductions not allowed, tax 34,000 fully rebated
        assertThat(r.newRegime().totalDeductions()).isEqualByComparingTo("0");
        tax(r.newRegime(), "0");
    }

    @Test
    void seniorCitizenGets80TtbOnAllBankInterestInsteadOf80Tta() throws Exception {
        TaxEngine.Result r = run("2025-26", TaxSlab.AgeGroup.SENIOR, "INTEREST_SAVINGS", 10000, "INTEREST_DEPOSITS", 60000);
        assertThat(r.oldRegime().deductionLines()).extracting(TaxEngine.Line::code).containsExactly("DED_80TTB");
        assertThat(r.oldRegime().totalDeductions()).isEqualByComparingTo("50000");
    }

    @Test
    void surchargeMarginalReliefAtFiftyLakh() throws Exception {
        TaxEngine.RegimeResult r = run("2025-26", "SALARY", 5085000).newRegime();
        // 50.10L: tax 10,83,000; 10% surcharge 1,08,300 limited so tax + surcharge rises only by the 10,000 over 50L
        assertThat(r.slabTax()).isEqualByComparingTo("1083000");
        assertThat(r.surcharge()).isEqualByComparingTo("7000");
        tax(r, "1133600");
    }

    @Test
    void surchargeOnEquityGainsIsCappedAtFifteenPercent() throws Exception {
        TaxEngine.RegimeResult r = run("2025-26", "SALARY", 30075000, "EQUITY_STCG_111A", 1000000).newRegime();
        // total income 3.1Cr -> 25% surcharge on slab tax, capped at 15% on the 2L tax on 111A gains
        BigDecimal slabTax = r.slabTax();
        BigDecimal expected = slabTax.multiply(new BigDecimal("0.25")).add(new BigDecimal("30000"));
        assertThat(r.surcharge()).isEqualByComparingTo(expected);
    }

    @Test
    void fy2024SharedExemptionGoesToTheHigherRateGainsFirst() throws Exception {
        TaxEngine.RegimeResult r = run("2024-25", "SALARY", 2000000,
                "EQUITY_LTCG_112A", 100000, "EQUITY_LTCG_112A_PRE", 100000).newRegime();
        // 1L at 12.5% fully exempt, remaining 25k exemption on the 10% part -> 75,000 x 10% = 7,500
        assertThat(r.specialRateTax()).isEqualByComparingTo("7500");
    }

    @Test
    void fy2024NewRegimeRebateUpToSevenLakh() throws Exception {
        tax(run("2024-25", "SALARY", 775000).newRegime(), "0");
        // 7.10L: slab tax 21,000 limited to the 10,000 excess -> 10,000 + 400 cess
        tax(run("2024-25", "SALARY", 785000).newRegime(), "10400");
    }

    @Test
    void rentGetsThirtyPercentRepairsDeductionAndCryptoIsFlatThirty() throws Exception {
        TaxEngine.RegimeResult r = run("2025-26", "RENT_RECEIVED", 100000, "CRYPTO_VDA", 100000).newRegime();
        TaxEngine.Line rent = r.incomeLines().stream().filter(l -> l.code().equals("RENT_RECEIVED")).findFirst().orElseThrow();
        assertThat(rent.taxableAmount()).isEqualByComparingTo("70000");
        // crypto gets no basic-exemption adjustment or rebate: 30,000 + 1,200 cess
        tax(r, "31200");
    }

    @Test
    void hraExemptionReducesSalaryInOldRegimeOnly() throws Exception {
        Map<String, BigDecimal> amounts = Map.of("SALARY", new BigDecimal("1200000"));
        TaxEngine.Input input = new TaxEngine.Input(TaxSlab.AgeGroup.BELOW_60, true, new BigDecimal("600000"),
                new BigDecimal("240000"), new BigDecimal("300000"), amounts, new BigDecimal("50000"), null, null);
        TaxEngine.Result r = TaxEngine.compute(book("2025-26"), input);
        // min(2.4L received, 3L - 60k, 50% of 6L) = 2.4L
        assertThat(r.oldRegime().hraExemption()).isEqualByComparingTo("240000");
        assertThat(r.newRegime().hraExemption()).isEqualByComparingTo("0");
        assertThat(r.oldRegime().taxesPaid()).isEqualByComparingTo("50000");
    }
}
