package com.incometax.api;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;

import java.nio.charset.StandardCharsets;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.multipart;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest(properties = {
        "spring.datasource.url=jdbc:h2:mem:customerflow;DB_CLOSE_DELAY=-1",
        "rate-limit.enabled=false",
        "documents.storage-dir=./target/test-documents"
})
@AutoConfigureMockMvc
class CustomerFilingFlowIntegrationTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    /** Static so the taxpayer is registered once for the whole class; JUnit re-instantiates per test. */
    private static String token;

    @BeforeEach
    void registerTaxpayer() throws Exception {
        if (token != null) {
            return;
        }
        MvcResult result = mockMvc.perform(post("/api/auth/register")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"name\":\"Ravi Kumar\",\"email\":\"ravi.flow@example.com\","
                                + "\"phone\":\"9876500011\",\"pan\":\"ABCDE1111F\",\"password\":\"Passw0rd!\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.role").value("USER"))
                .andReturn();
        token = data(result).get("token").asText();
    }

    private JsonNode data(MvcResult result) throws Exception {
        return objectMapper.readTree(result.getResponse().getContentAsString()).get("data");
    }

    private String bearer() {
        return "Bearer " + token;
    }

    @Test
    void taxpayerCanFileIncomeTaxAndSeeBothRegimesCompared() throws Exception {
        MvcResult created = mockMvc.perform(post("/api/income-tax/filings")
                        .header("Authorization", bearer())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"financialYear\":\"2025-26\",\"assessmentYear\":\"2026-27\","
                                + "\"taxpayerType\":\"INDIVIDUAL\",\"selectedRegime\":\"NEW\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.status").value("DRAFT"))
                .andExpect(jsonPath("$.data.taxType").value("INCOME_TAX"))
                .andReturn();
        String caseId = data(created).get("id").asText();

        mockMvc.perform(put("/api/income-tax/filings/" + caseId)
                        .header("Authorization", bearer())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"selectedRegime\":\"NEW\","
                                + "\"incomeSources\":[{\"type\":\"SALARY\",\"description\":\"Employer\","
                                + "\"amount\":1400000}],"
                                + "\"deductions\":[{\"section\":\"80C\",\"description\":\"PPF\",\"amount\":150000}],"
                                + "\"taxPayments\":[{\"type\":\"TDS\",\"amount\":90000}]}"))
                .andExpect(status().isOk());

        MvcResult computation = mockMvc.perform(get("/api/income-tax/filings/" + caseId + "/computation")
                        .header("Authorization", bearer()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.oldRegime.regime").value("OLD"))
                .andExpect(jsonPath("$.data.newRegime.regime").value("NEW"))
                .andReturn();

        JsonNode data = data(computation);
        assertThat(data.get("recommendedRegime").asText()).isIn("OLD", "NEW");
        // The old regime allows the 80C claim, so its taxable income must be the lower of the two.
        assertThat(data.get("oldRegime").get("totalDeductions").decimalValue())
                .isGreaterThan(data.get("newRegime").get("totalDeductions").decimalValue());
    }

    @Test
    void incomeTaxFilingRejectsMalformedEntries() throws Exception {
        MvcResult created = mockMvc.perform(post("/api/income-tax/filings")
                        .header("Authorization", bearer())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"financialYear\":\"2025-26\",\"assessmentYear\":\"2026-27\","
                                + "\"taxpayerType\":\"INDIVIDUAL\",\"selectedRegime\":\"OLD\"}"))
                .andReturn();
        String caseId = data(created).get("id").asText();

        mockMvc.perform(put("/api/income-tax/filings/" + caseId)
                        .header("Authorization", bearer())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"incomeSources\":[{\"description\":\"missing type and amount\"}]}"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.success").value(false))
                .andExpect(jsonPath("$.code").value("VALIDATION_ERROR"));
    }

    @Test
    void gstReturnRunsFromProfileToReconciliationAndReview() throws Exception {
        MvcResult profile = mockMvc.perform(post("/api/profile/gst")
                        .header("Authorization", bearer())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"gstin\":\"27ABCDE1111F1Z5\",\"legalName\":\"Ravi Traders\","
                                + "\"tradeName\":\"Ravi Traders\",\"businessType\":\"Proprietorship\","
                                + "\"state\":\"Maharashtra\",\"registeredAddress\":\"Mumbai\","
                                + "\"authorizedSignatory\":\"Ravi Kumar\"}"))
                .andExpect(status().isOk())
                .andReturn();
        String profileId = data(profile).get("id").asText();

        MvcResult filing = mockMvc.perform(post("/api/gst/filings")
                        .header("Authorization", bearer())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"gstProfileId\":\"" + profileId + "\",\"returnType\":\"GSTR_1\","
                                + "\"period\":\"2026-07\",\"financialYear\":\"2026-27\"}"))
                .andExpect(status().isOk())
                // The monthly GSTR-1 due date is derived from configured rules, not hard coded.
                .andExpect(jsonPath("$.data.dueDate").value("2026-08-11"))
                .andReturn();
        String caseId = data(filing).get("id").asText();

        mockMvc.perform(multipart("/api/gst/filings/" + caseId + "/invoices/import-csv")
                        .file(new MockMultipartFile("file", "invoices.csv", "text/csv",
                                ("Document Type,Invoice Number,Invoice Date,Taxable Value,CGST,SGST,"
                                        + "Counterparty GSTIN,Place Of Supply\n"
                                        + "SALES,INV-1,2026-07-05,100000,9000,9000,27AAACR5055K1Z5,Maharashtra\n"
                                        + "PURCHASE,PUR-1,2026-07-06,50000,4500,4500,27AAACR5055K1Z5,Maharashtra\n")
                                        .getBytes(StandardCharsets.UTF_8)))
                        .header("Authorization", bearer()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.imported").value(2))
                .andExpect(jsonPath("$.data.duplicates").value(0));

        // Re-importing the same rows must be detected rather than double counted.
        mockMvc.perform(post("/api/gst/filings/" + caseId + "/invoices")
                        .header("Authorization", bearer())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"documentType\":\"SALES\",\"supplyType\":\"TAXABLE\","
                                + "\"invoiceNumber\":\"INV-1\",\"invoiceDate\":\"2026-07-05\","
                                + "\"counterpartyGstin\":\"27AAACR5055K1Z5\",\"placeOfSupply\":\"Maharashtra\","
                                + "\"taxableValue\":100000,\"cgst\":9000,\"sgst\":9000}"))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.code").value("DUPLICATE_INVOICE"));

        mockMvc.perform(get("/api/gst/filings/" + caseId + "/computation")
                        .header("Authorization", bearer()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.outputTax").value(18000.00))
                .andExpect(jsonPath("$.data.inputTaxCredit").value(9000.00));

        mockMvc.perform(post("/api/gst/filings/" + caseId + "/reconciliation")
                        .header("Authorization", bearer()))
                .andExpect(status().isOk())
                // Without counterparty records the purchase invoice is reported as missing in the portal.
                .andExpect(jsonPath("$.data[0].status").value("MISSING_IN_PORTAL"));

        mockMvc.perform(post("/api/gst/filings/" + caseId + "/submit")
                        .header("Authorization", bearer()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.status").value("UNDER_REVIEW"));
    }

    @Test
    void emptyGstReturnCannotBeSubmitted() throws Exception {
        MvcResult profile = mockMvc.perform(post("/api/profile/gst")
                        .header("Authorization", bearer())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"gstin\":\"27ABCDE1111F2Z4\",\"legalName\":\"Ravi Services\","
                                + "\"tradeName\":\"Ravi Services\",\"businessType\":\"Proprietorship\","
                                + "\"state\":\"Maharashtra\",\"registeredAddress\":\"Mumbai\","
                                + "\"authorizedSignatory\":\"Ravi Kumar\"}"))
                .andReturn();
        String profileId = data(profile).get("id").asText();

        MvcResult filing = mockMvc.perform(post("/api/gst/filings")
                        .header("Authorization", bearer())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"gstProfileId\":\"" + profileId + "\",\"returnType\":\"GSTR_3B\","
                                + "\"period\":\"2026-08\",\"financialYear\":\"2026-27\"}"))
                .andReturn();
        String caseId = data(filing).get("id").asText();

        mockMvc.perform(post("/api/gst/filings/" + caseId + "/submit")
                        .header("Authorization", bearer()))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code").value("FILING_VALIDATION_ERROR"));
    }

    @Test
    void anonymousRequestsAreRejected() throws Exception {
        mockMvc.perform(get("/api/cases")).andExpect(status().isUnauthorized());
        mockMvc.perform(get("/api/admin/dashboard").header("Authorization", bearer()))
                .andExpect(status().isForbidden());
    }

    @Test
    void personallyIdentifiableDataIsStoredInMaskedForm() throws Exception {
        mockMvc.perform(put("/api/profile")
                        .header("Authorization", bearer())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"pan\":\"ABCDE1111F\",\"aadhaarLastFour\":\"1234\","
                                + "\"taxpayerType\":\"INDIVIDUAL\",\"city\":\"Mumbai\","
                                + "\"state\":\"Maharashtra\",\"pincode\":\"400001\",\"metroCity\":true}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.aadhaar").value("XXXX XXXX 1234"));
    }
}
