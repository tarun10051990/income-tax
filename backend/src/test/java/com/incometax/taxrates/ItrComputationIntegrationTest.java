package com.incometax.taxrates;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.incometax.taxrates.repository.ItrTaxComputationRepository;
import com.incometax.taxrates.repository.TaxCategoryRateRepository;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;
import org.springframework.transaction.support.TransactionTemplate;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@ActiveProfiles("test")
@SpringBootTest(properties = {
        "spring.datasource.url=jdbc:h2:mem:itrcomputation;DB_CLOSE_DELAY=-1",
        "rate-limit.enabled=false",
        "documents.storage-dir=./target/test-documents"
})
@AutoConfigureMockMvc
class ItrComputationIntegrationTest {

    @Autowired private MockMvc mockMvc;
    @Autowired private ObjectMapper objectMapper;
    @Autowired private TaxCategoryRateRepository categoryRepository;
    @Autowired private ItrTaxComputationRepository computationRepository;
    @Autowired private TransactionTemplate transactionTemplate;

    private static final String FORM = "{\"financialYear\":\"2025-26\",\"ageGroup\":\"BELOW_60\",\"amounts\":{"
            + "\"SALARY\":1075000,\"EQUITY_LTCG_112A\":200000,\"INTRADAY_SPECULATIVE\":50000,\"DED_80C\":150000},"
            + "\"tdsOnSalary\":20000}";

    @Test
    void ratesAreSeededIntoTheDatabaseForBothYears() throws Exception {
        assertThat(categoryRepository.countByFinancialYear("2024-25")).isGreaterThan(30);
        assertThat(categoryRepository.countByFinancialYear("2025-26")).isGreaterThan(30);
        mockMvc.perform(get("/api/public/tax/rates").param("financialYear", "2025-26"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.assessmentYear").value("2026-27"));
        mockMvc.perform(get("/api/public/tax/years"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data[0].financialYear").value("2025-26"));
    }

    @Test
    void estimateNeedsNoLoginAndRejectsUnknownCategories() throws Exception {
        mockMvc.perform(post("/api/public/tax/estimate").contentType(MediaType.APPLICATION_JSON).content(FORM))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.recommendedRegime").exists());
        mockMvc.perform(post("/api/public/tax/estimate").contentType(MediaType.APPLICATION_JSON)
                        .content("{\"financialYear\":\"2025-26\",\"amounts\":{\"NOT_A_CODE\":10}}"))
                .andExpect(status().isBadRequest());
    }

    @Test
    void signedInTaxpayerComputationIsStoredPerCategory() throws Exception {
        MvcResult reg = mockMvc.perform(post("/api/auth/register").contentType(MediaType.APPLICATION_JSON)
                        .content("{\"name\":\"Asha Rao\",\"email\":\"asha.itr@example.com\",\"phone\":\"9876500022\","
                                + "\"pan\":\"ABCDE2222F\",\"password\":\"Passw0rd!\"}"))
                .andExpect(status().isOk()).andReturn();
        String bearer = "Bearer " + objectMapper.readTree(reg.getResponse().getContentAsString()).at("/data/token").asText();

        MvcResult saved = mockMvc.perform(post("/api/itr/computations").header("Authorization", bearer)
                        .contentType(MediaType.APPLICATION_JSON).content(FORM))
                .andExpect(status().isOk()).andReturn();
        JsonNode data = objectMapper.readTree(saved.getResponse().getContentAsString()).get("data");
        // new regime: total income 10.5L slab + 75k taxable LTCG = 11.25L <= 12L, so 87A wipes the 45,000 slab tax;
        // LTCG (2L - 1.25L) x 12.5% = 9,375 + 4% cess = 9,750; 20,000 TDS already paid -> refund 10,250
        assertThat(data.at("/result/newRegime/totalTax").decimalValue()).isEqualByComparingTo("9750");
        assertThat(data.at("/result/newRegime/refund").decimalValue()).isEqualByComparingTo("10250");

        mockMvc.perform(post("/api/itr/computations").header("Authorization", bearer)
                        .contentType(MediaType.APPLICATION_JSON).content(FORM))
                .andExpect(status().isOk());

        transactionTemplate.executeWithoutResult(tx -> {
            var stored = computationRepository.findAll().stream()
                    .filter(c -> c.getFinancialYear().equals("2025-26")).toList();
            assertThat(stored).hasSize(1);
            assertThat(stored.get(0).getEntries()).extracting(e -> e.getCategoryCode())
                    .containsExactlyInAnyOrder("SALARY", "EQUITY_LTCG_112A", "INTRADAY_SPECULATIVE", "DED_80C");
            assertThat(stored.get(0).getResults()).hasSize(2);
            assertThat(stored.get(0).getResults().get(0).getLines()).isNotEmpty();
        });

        mockMvc.perform(get("/api/itr/computations").param("financialYear", "2025-26").header("Authorization", bearer))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.input.amounts.SALARY").value(1075000))
                .andExpect(jsonPath("$.data.result.newRegime.totalTax").value(9750));
    }

    @Test
    void savedReturnDownloadsAsJsonExcelAndPdf() throws Exception {
        MvcResult reg = mockMvc.perform(post("/api/auth/register").contentType(MediaType.APPLICATION_JSON)
                        .content("{\"name\":\"Ravi Kumar\",\"email\":\"ravi.export@example.com\",\"phone\":\"9876500033\","
                                + "\"pan\":\"ABCDE3333F\",\"password\":\"Passw0rd!\"}"))
                .andExpect(status().isOk()).andReturn();
        String bearer = "Bearer " + objectMapper.readTree(reg.getResponse().getContentAsString()).at("/data/token").asText();
        String form = FORM.replace("2025-26", "2024-25");
        String export = "{\"financialYear\":\"2024-25\",\"format\":\"%s\",\"itrType\":\"ITR-2\",\"bankName\":\"SBI\"}";

        mockMvc.perform(post("/api/itr/computations/export").header("Authorization", bearer)
                        .contentType(MediaType.APPLICATION_JSON).content(export.formatted("PDF")))
                .andExpect(status().isNotFound());

        // FY 2024-25 so this user's save doesn't add a second 2025-26 row to the per-category test
        MvcResult saved = mockMvc.perform(post("/api/itr/computations").header("Authorization", bearer)
                        .contentType(MediaType.APPLICATION_JSON).content(form))
                .andExpect(status().isOk()).andReturn();
        String totalTax = objectMapper.readTree(saved.getResponse().getContentAsString())
                .at("/data/result/newRegime/totalTax").asText();

        MvcResult json = mockMvc.perform(post("/api/itr/computations/export").header("Authorization", bearer)
                        .contentType(MediaType.APPLICATION_JSON).content(export.formatted("JSON")))
                .andExpect(status().isOk()).andReturn();
        assertThat(json.getResponse().getHeader("Content-Disposition")).contains("TaxFilr_ITR-2_AY2025-26.json");
        JsonNode body = objectMapper.readTree(json.getResponse().getContentAsByteArray());
        assertThat(body.at("/taxpayer/PAN").asText()).isEqualTo("ABCDE3333F");
        assertThat(body.at("/bank/Bank").asText()).isEqualTo("SBI");
        assertThat(body.at("/taxComputation/newRegime/totalTax").decimalValue()).isEqualByComparingTo(totalTax);

        MvcResult xlsx = mockMvc.perform(post("/api/itr/computations/export").header("Authorization", bearer)
                        .contentType(MediaType.APPLICATION_JSON).content(export.formatted("EXCEL")))
                .andExpect(status().isOk()).andReturn();
        try (var workbook = new org.apache.poi.xssf.usermodel.XSSFWorkbook(
                new java.io.ByteArrayInputStream(xlsx.getResponse().getContentAsByteArray()))) {
            assertThat(workbook.getSheet("Summary")).isNotNull();
            assertThat(workbook.getSheet("Income").getLastRowNum()).isGreaterThanOrEqualTo(3);
        }

        MvcResult pdf = mockMvc.perform(post("/api/itr/computations/export").header("Authorization", bearer)
                        .contentType(MediaType.APPLICATION_JSON).content(export.formatted("PDF")))
                .andExpect(status().isOk()).andReturn();
        assertThat(pdf.getResponse().getContentType()).isEqualTo("application/pdf");
        assertThat(new String(pdf.getResponse().getContentAsByteArray(), 0, 4)).isEqualTo("%PDF");

        mockMvc.perform(post("/api/itr/computations/export")
                        .contentType(MediaType.APPLICATION_JSON).content(export.formatted("PDF")))
                .andExpect(status().isUnauthorized());
    }
}
