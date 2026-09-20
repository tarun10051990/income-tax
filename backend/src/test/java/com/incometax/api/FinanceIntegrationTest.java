package com.incometax.api;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.incometax.entity.User;
import com.incometax.repository.UserRepository;
import com.incometax.security.TotpUtil;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.MethodOrderer;
import org.junit.jupiter.api.Order;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.TestMethodOrder;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * Financial tracking: investments and tax payments start unverified, only verified payments count as paid,
 * liabilities/refunds are staff-managed, dashboards aggregate from records, and clients never see each other.
 */
@SpringBootTest(properties = {
        "spring.datasource.url=jdbc:h2:mem:finance;DB_CLOSE_DELAY=-1",
        "rate-limit.enabled=false",
        "documents.storage-dir=./target/test-documents",
        "app.mfa.exempt-roles="
})
@AutoConfigureMockMvc
@TestMethodOrder(MethodOrderer.OrderAnnotation.class)
class FinanceIntegrationTest {

    private static final String PASSWORD = "Str0ngPassw0rd!";
    private static final String FY = "2025-26";

    @Autowired
    private MockMvc mockMvc;
    @Autowired
    private ObjectMapper objectMapper;
    @Autowired
    private UserRepository userRepository;
    @Autowired
    private PasswordEncoder passwordEncoder;

    private static String adminToken;
    private static String clientToken;
    private static String otherClientToken;
    private static String clientId;
    private static String investmentId;
    private static String paymentId;
    private static String liabilityId;
    private static String refundId;

    @BeforeEach
    void setUp() throws Exception {
        if (adminToken != null) {
            return;
        }
        userRepository.save(User.builder().name("Owner").email("owner.fin@taxfiler.in")
                .password(passwordEncoder.encode(PASSWORD)).role(User.Role.SUPER_ADMIN)
                .onboardingComplete(true).mfaSecret(TotpUtil.generateSecret()).build());
        MvcResult first = mockMvc.perform(post("/api/auth/admin/login").contentType(MediaType.APPLICATION_JSON)
                        .content(json("email", "owner.fin@taxfiler.in", "password", PASSWORD)))
                .andExpect(status().isOk()).andReturn();
        JsonNode enrolment = data(first);
        MvcResult enrolled = mockMvc.perform(post("/api/auth/admin/mfa/enrol")
                        .header("Authorization", bearer(enrolment.get("token").asText()))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"totpCode\":\"" + TotpUtil.code(enrolment.get("mfaSecret").asText(),
                                Instant.now()) + "\"}"))
                .andExpect(status().isOk()).andReturn();
        adminToken = data(enrolled).get("token").asText();

        JsonNode client = register("Fin Client", "client.fin@example.com", "FINCL1234A");
        clientToken = client.get("token").asText();
        clientId = client.get("id").asText();
        otherClientToken = register("Other Client", "other.fin@example.com", "FINCL5678B").get("token").asText();
    }

    @Test
    @Order(1)
    void financialYearsAreDerivedNotHardCoded() throws Exception {
        MvcResult years = mockMvc.perform(get("/api/finance/financial-years").header("Authorization", bearer(clientToken)))
                .andExpect(status().isOk()).andReturn();
        JsonNode list = data(years);
        assertThat(list.size()).isGreaterThanOrEqualTo(2);
        JsonNode current = null;
        for (JsonNode y : list) {
            if (y.get("current").asBoolean()) {
                current = y;
            }
        }
        assertThat(current).isNotNull();
        assertThat(current.get("startDate").asText()).endsWith("-04-01");
        assertThat(current.get("endDate").asText()).endsWith("-03-31");
        assertThat(current.get("quarters").size()).isEqualTo(4);
        assertThat(current.get("quarters").get(3).get("start").asText()).endsWith("-01-01");

        // Admin can open a future year; malformed codes are rejected.
        mockMvc.perform(post("/api/admin/finance/financial-years").header("Authorization", bearer(adminToken))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"code\":\"2031-32\",\"open\":true,\"notes\":\"Pre-opened\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.assessmentYear").value("2032-33"));
        mockMvc.perform(post("/api/admin/finance/financial-years").header("Authorization", bearer(adminToken))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"code\":\"2031-33\"}"))
                .andExpect(status().isBadRequest());
        // Customers may not manage years.
        mockMvc.perform(post("/api/admin/finance/financial-years").header("Authorization", bearer(clientToken))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"code\":\"2032-33\"}"))
                .andExpect(status().isForbidden());
    }

    @Test
    @Order(2)
    void clientAddsInvestmentAndItStartsPending() throws Exception {
        MvcResult created = mockMvc.perform(post("/api/finance/investments").header("Authorization", bearer(clientToken))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"type\":\"ELSS\",\"name\":\"Axis ELSS\",\"amount\":100000,"
                                + "\"investedOn\":\"2025-07-10\",\"section\":\"80C\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.verificationStatus").value("PENDING"))
                .andExpect(jsonPath("$.data.financialYear").value(FY))
                .andExpect(jsonPath("$.data.taxSavingEligibleAmount").value(100000))
                .andReturn();
        investmentId = data(created).get("id").asText();

        // Eligible amount cannot exceed the invested amount.
        mockMvc.perform(post("/api/finance/investments").header("Authorization", bearer(clientToken))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"type\":\"PPF\",\"amount\":10000,\"investedOn\":\"2025-08-01\","
                                + "\"section\":\"80C\",\"taxSavingEligibleAmount\":20000}"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code").value("ELIGIBLE_EXCEEDS_AMOUNT"));

        // A non tax-saving investment for the same year, plus one NPS under 80CCD1B.
        mockMvc.perform(post("/api/finance/investments").header("Authorization", bearer(clientToken))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"type\":\"STOCKS\",\"name\":\"Nifty 50\",\"amount\":50000,"
                                + "\"investedOn\":\"2025-09-15\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.taxSavingEligibleAmount").value(0));
        mockMvc.perform(post("/api/finance/investments").header("Authorization", bearer(clientToken))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"type\":\"NPS\",\"amount\":60000,\"investedOn\":\"2026-01-20\","
                                + "\"section\":\"80CCD1B\"}"))
                .andExpect(status().isOk());

        // Other clients cannot see or touch it.
        mockMvc.perform(get("/api/finance/investments").header("Authorization", bearer(otherClientToken)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.length()").value(0));
        mockMvc.perform(delete("/api/finance/investments/" + investmentId)
                        .header("Authorization", bearer(otherClientToken)))
                .andExpect(status().isForbidden());
        // Staff-only endpoints reject customers outright.
        mockMvc.perform(get("/api/admin/finance/investments").header("Authorization", bearer(clientToken)))
                .andExpect(status().isForbidden());
    }

    @Test
    @Order(3)
    void savingsUsesConfiguredLimitsAndIsLabelledAnEstimate() throws Exception {
        MvcResult savings = mockMvc.perform(get("/api/finance/savings").param("fy", FY)
                        .header("Authorization", bearer(clientToken)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.financialYear").value(FY))
                .andReturn();
        JsonNode view = data(savings);
        assertThat(view.get("disclaimer").asText()).containsIgnoringCase("estimate");
        assertThat(view.get("taxSavingInvested").decimalValue()).isEqualByComparingTo("160000");
        // 80C is capped at the configured limit (1.5L in the seeded rule); 80CCD1B at 50k.
        assertThat(view.get("eligibleDeduction").decimalValue()).isEqualByComparingTo("150000");
        assertThat(view.get("estimatedTaxBenefit").decimalValue()).isGreaterThan(BigDecimal.ZERO);
        // Nothing verified yet, so the "actual" figure is zero.
        assertThat(view.get("actualTaxSaved").decimalValue()).isEqualByComparingTo("0");
    }

    @Test
    @Order(4)
    void staffVerifiesInvestmentAndClientCanNoLongerEditIt() throws Exception {
        mockMvc.perform(get("/api/admin/finance/investments").param("status", "PENDING")
                        .header("Authorization", bearer(adminToken)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.totalElements").value(3));
        mockMvc.perform(post("/api/admin/finance/investments/" + investmentId + "/verify")
                        .header("Authorization", bearer(adminToken)).contentType(MediaType.APPLICATION_JSON)
                        .content("{\"status\":\"VERIFIED\",\"note\":\"Statement checked\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.verificationStatus").value("VERIFIED"))
                .andExpect(jsonPath("$.data.ownerName").value("Fin Client"));
        mockMvc.perform(put("/api/finance/investments/" + investmentId).header("Authorization", bearer(clientToken))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"type\":\"ELSS\",\"amount\":1,\"investedOn\":\"2025-07-10\",\"section\":\"80C\"}"))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.code").value("INVESTMENT_LOCKED"));

        JsonNode view = data(mockMvc.perform(get("/api/finance/savings").param("fy", FY)
                .header("Authorization", bearer(clientToken))).andReturn());
        assertThat(view.get("verifiedEligibleDeduction").decimalValue()).isEqualByComparingTo("100000");
        assertThat(view.get("actualTaxSaved").decimalValue()).isGreaterThan(BigDecimal.ZERO);
    }

    @Test
    @Order(5)
    void onlyVerifiedPaymentsCountTowardsTaxPaid() throws Exception {
        mockMvc.perform(post("/api/admin/finance/liabilities").header("Authorization", bearer(adminToken))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"ownerId\":\"" + clientId + "\",\"financialYear\":\"" + FY + "\","
                                + "\"taxType\":\"INCOME_TAX\",\"amount\":80000,\"dueDate\":\""
                                + LocalDate.now().plusMonths(3) + "\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.source").value("MANUAL"))
                .andExpect(jsonPath("$.data.assessmentYear").value("2026-27"));
        liabilityId = data(mockMvc.perform(get("/api/admin/finance/liabilities").param("fy", FY)
                .header("Authorization", bearer(adminToken))).andReturn()).get("content").get(0).get("id").asText();

        MvcResult advance = mockMvc.perform(post("/api/finance/tax-payments").header("Authorization", bearer(clientToken))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"type\":\"ADVANCE_TAX\",\"amount\":50000,\"paidOn\":\"2025-12-14\","
                                + "\"challanNumber\":\"CHLN-001\",\"paymentMethod\":\"NET_BANKING\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.verificationStatus").value("PENDING"))
                .andExpect(jsonPath("$.data.financialYear").value(FY))
                .andReturn();
        paymentId = data(advance).get("id").asText();
        mockMvc.perform(post("/api/finance/tax-payments").header("Authorization", bearer(clientToken))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"type\":\"TDS\",\"amount\":10000,\"paidOn\":\"2026-03-05\"}"))
                .andExpect(status().isOk());

        // Before verification: everything is outstanding, unverified amounts reported separately.
        JsonNode before = data(mockMvc.perform(get("/api/finance/tracking").param("fy", FY)
                .header("Authorization", bearer(clientToken))).andExpect(status().isOk()).andReturn());
        JsonNode itr = rowFor(before, "INCOME_TAX");
        assertThat(itr.get("liability").decimalValue()).isEqualByComparingTo("80000");
        assertThat(itr.get("verifiedPaid").decimalValue()).isEqualByComparingTo("0");
        assertThat(itr.get("unverifiedPaid").decimalValue()).isEqualByComparingTo("60000");
        assertThat(itr.get("outstanding").decimalValue()).isEqualByComparingTo("80000");
        assertThat(itr.get("paymentStatus").asText()).isEqualTo("PENDING");

        // Staff verifies the advance tax, correcting the amount to the challan.
        mockMvc.perform(post("/api/admin/finance/tax-payments/" + paymentId + "/verify")
                        .header("Authorization", bearer(adminToken)).contentType(MediaType.APPLICATION_JSON)
                        .content("{\"status\":\"VERIFIED\",\"correctedAmount\":45000,\"note\":\"Matched challan\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.amount").value(45000))
                .andExpect(jsonPath("$.data.verificationStatus").value("VERIFIED"));

        JsonNode after = rowFor(data(mockMvc.perform(get("/api/finance/tracking").param("fy", FY)
                .header("Authorization", bearer(clientToken))).andReturn()), "INCOME_TAX");
        assertThat(after.get("verifiedPaid").decimalValue()).isEqualByComparingTo("45000");
        assertThat(after.get("unverifiedPaid").decimalValue()).isEqualByComparingTo("10000");
        assertThat(after.get("outstanding").decimalValue()).isEqualByComparingTo("35000");
        assertThat(after.get("paymentStatus").asText()).isEqualTo("PARTIALLY_PAID");
        assertThat(after.get("paidByType").get("ADVANCE_TAX").decimalValue()).isEqualByComparingTo("45000");

        // Verified payments are locked for the client.
        mockMvc.perform(delete("/api/finance/tax-payments/" + paymentId).header("Authorization", bearer(clientToken)))
                .andExpect(status().isConflict());
    }

    @Test
    @Order(6)
    void refundsAreStaffManagedAndVisibleToTheClient() throws Exception {
        MvcResult created = mockMvc.perform(post("/api/admin/finance/refunds").header("Authorization", bearer(adminToken))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"ownerId\":\"" + clientId + "\",\"financialYear\":\"2024-25\","
                                + "\"taxType\":\"INCOME_TAX\",\"amountClaimed\":12000,\"claimedOn\":\"2025-07-20\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.status").value("CLAIMED"))
                .andReturn();
        refundId = data(created).get("id").asText();
        mockMvc.perform(put("/api/admin/finance/refunds/" + refundId).header("Authorization", bearer(adminToken))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"status\":\"ISSUED\",\"amountReceived\":12000,\"receivedOn\":\"2025-10-02\","
                                + "\"referenceNumber\":\"CPC-778\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.status").value("ISSUED"));
        mockMvc.perform(get("/api/finance/refunds").header("Authorization", bearer(clientToken)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.length()").value(1))
                .andExpect(jsonPath("$.data[0].amountReceived").value(12000));
        mockMvc.perform(get("/api/finance/refunds").header("Authorization", bearer(otherClientToken)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.length()").value(0));
        // Clients cannot create refunds.
        mockMvc.perform(post("/api/admin/finance/refunds").header("Authorization", bearer(clientToken))
                        .contentType(MediaType.APPLICATION_JSON).content("{}"))
                .andExpect(status().isForbidden());
    }

    @Test
    @Order(7)
    void dashboardsAggregateFromRecordsForTheSelectedPeriod() throws Exception {
        JsonNode fyView = data(mockMvc.perform(get("/api/finance/dashboard").param("period", "FY").param("fy", FY)
                .header("Authorization", bearer(clientToken))).andExpect(status().isOk()).andReturn());
        assertThat(fyView.get("amounts").get("totalInvestment").decimalValue()).isEqualByComparingTo("210000");
        assertThat(fyView.get("amounts").get("totalTaxPaid").decimalValue()).isEqualByComparingTo("45000");
        assertThat(fyView.get("amounts").get("unverifiedTaxPaid").decimalValue()).isEqualByComparingTo("10000");
        assertThat(fyView.get("amounts").get("totalTaxLiability").decimalValue()).isEqualByComparingTo("80000");
        assertThat(fyView.get("amounts").get("taxPayable").decimalValue()).isEqualByComparingTo("35000");
        assertThat(fyView.get("period").get("from").asText()).isEqualTo("2025-04-01");
        assertThat(fyView.get("period").get("to").asText()).isEqualTo("2026-03-31");
        assertThat(fyView.get("series").size()).isGreaterThan(5);
        JsonNode investmentSeries = seriesFor(fyView, "investment");
        assertThat(investmentSeries.get("points").size()).isEqualTo(12);

        // Q3 (Oct–Dec) only contains the advance-tax payment.
        JsonNode q3 = data(mockMvc.perform(get("/api/finance/dashboard").param("period", "QUARTER")
                .param("fy", FY).param("quarter", "3")
                .header("Authorization", bearer(clientToken))).andExpect(status().isOk()).andReturn());
        assertThat(q3.get("period").get("from").asText()).isEqualTo("2025-10-01");
        assertThat(q3.get("period").get("to").asText()).isEqualTo("2025-12-31");
        assertThat(q3.get("amounts").get("totalInvestment").decimalValue()).isEqualByComparingTo("0");
        assertThat(q3.get("amounts").get("totalTaxPaid").decimalValue()).isEqualByComparingTo("45000");

        // Custom range covering just the ELSS purchase.
        JsonNode custom = data(mockMvc.perform(get("/api/finance/dashboard").param("period", "CUSTOM")
                .param("from", "2025-07-01").param("to", "2025-07-31")
                .header("Authorization", bearer(clientToken))).andExpect(status().isOk()).andReturn());
        assertThat(custom.get("amounts").get("totalInvestment").decimalValue()).isEqualByComparingTo("100000");

        // The other client sees zeros, not this client's data.
        JsonNode other = data(mockMvc.perform(get("/api/finance/dashboard").param("fy", FY)
                .header("Authorization", bearer(otherClientToken))).andExpect(status().isOk()).andReturn());
        assertThat(other.get("amounts").get("totalInvestment").decimalValue()).isEqualByComparingTo("0");
    }

    @Test
    @Order(8)
    void adminAnalyticsAndClient360() throws Exception {
        JsonNode analytics = data(mockMvc.perform(get("/api/admin/finance/analytics").param("fy", FY)
                .header("Authorization", bearer(adminToken))).andExpect(status().isOk()).andReturn());
        assertThat(analytics.get("counts").get("totalClients").asLong()).isGreaterThanOrEqualTo(2);
        assertThat(analytics.get("amounts").get("totalInvestments").decimalValue()).isEqualByComparingTo("210000");
        assertThat(analytics.get("amounts").get("totalTaxPaid").decimalValue()).isEqualByComparingTo("45000");
        assertThat(analytics.get("counts").get("pendingPaymentVerification").asLong()).isEqualTo(1);
        assertThat(seriesFor(analytics, "clientGrowth")).isNotNull();
        assertThat(seriesFor(analytics, "platformRevenue")).isNotNull();

        JsonNode c360 = data(mockMvc.perform(get("/api/admin/finance/clients/" + clientId + "/360").param("fy", FY)
                .header("Authorization", bearer(adminToken))).andExpect(status().isOk()).andReturn());
        assertThat(c360.get("user").get("email").asText()).isEqualTo("client.fin@example.com");
        assertThat(c360.get("investments").size()).isEqualTo(3);
        assertThat(c360.get("payments").size()).isEqualTo(2);
        assertThat(c360.get("refunds").size()).isEqualTo(1);
        assertThat(c360.get("totals").get("verifiedTaxPaid").decimalValue()).isEqualByComparingTo("45000");
        assertThat(c360.get("totals").get("outstanding").decimalValue()).isEqualByComparingTo("35000");

        mockMvc.perform(get("/api/admin/finance/clients/" + clientId + "/360")
                        .header("Authorization", bearer(otherClientToken)))
                .andExpect(status().isForbidden());

        // Manual liabilities can be removed by staff.
        mockMvc.perform(delete("/api/admin/finance/liabilities/" + liabilityId).header("Authorization", bearer(adminToken)))
                .andExpect(status().isOk());
    }

    private JsonNode register(String name, String email, String pan) throws Exception {
        MvcResult result = mockMvc.perform(post("/api/auth/register").contentType(MediaType.APPLICATION_JSON)
                        .content("{\"name\":\"" + name + "\",\"email\":\"" + email + "\",\"phone\":\"9876500011\","
                                + "\"pan\":\"" + pan + "\",\"password\":\"" + PASSWORD + "\"}"))
                .andExpect(status().isOk()).andReturn();
        return data(result);
    }

    private static JsonNode rowFor(JsonNode rows, String taxType) {
        for (JsonNode row : rows) {
            if (taxType.equals(row.get("taxType").asText())) {
                return row;
            }
        }
        throw new AssertionError("No tracking row for " + taxType);
    }

    private static JsonNode seriesFor(JsonNode view, String key) {
        for (JsonNode s : view.get("series")) {
            if (key.equals(s.get("key").asText())) {
                return s;
            }
        }
        throw new AssertionError("No series " + key);
    }

    private JsonNode data(MvcResult result) throws Exception {
        return objectMapper.readTree(result.getResponse().getContentAsString()).get("data");
    }

    private static String bearer(String token) {
        return "Bearer " + token;
    }

    private static String json(String... kv) {
        StringBuilder sb = new StringBuilder("{");
        for (int i = 0; i < kv.length; i += 2) {
            if (i > 0) {
                sb.append(',');
            }
            sb.append('"').append(kv[i]).append("\":\"").append(kv[i + 1]).append('"');
        }
        return sb.append('}').toString();
    }
}
