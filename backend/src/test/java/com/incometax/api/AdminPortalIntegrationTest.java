package com.incometax.api;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.incometax.entity.User;
import com.incometax.repository.UserRepository;
import com.incometax.security.TotpUtil;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;

import java.time.Instant;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest(properties = {
        "spring.datasource.url=jdbc:h2:mem:adminportal;DB_CLOSE_DELAY=-1",
        "rate-limit.enabled=false",
        "documents.storage-dir=./target/test-documents"
})
@AutoConfigureMockMvc
class AdminPortalIntegrationTest {

    private static final String PASSWORD = "AdminPassw0rd!";

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private PasswordEncoder passwordEncoder;

    /** Static so the administrator is enrolled once for the whole class. */
    private static String adminToken;

    @BeforeEach
    void createAdministrator() throws Exception {
        if (adminToken != null) {
            return;
        }
        userRepository.save(User.builder()
                .name("Operations Admin")
                .email("ops.admin@taxfiler.in")
                .password(passwordEncoder.encode(PASSWORD))
                .role(User.Role.ADMIN)
                .onboardingComplete(true)
                .mfaSecret(TotpUtil.generateSecret())
                .build());
        adminToken = enrolAndSignIn("ops.admin@taxfiler.in");
    }

    private JsonNode data(MvcResult result) throws Exception {
        return objectMapper.readTree(result.getResponse().getContentAsString()).get("data");
    }

    /** First sign in returns an enrolment token and the secret; the code then activates MFA. */
    private String enrolAndSignIn(String email) throws Exception {
        MvcResult first = mockMvc.perform(post("/api/auth/admin/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"email\":\"" + email + "\",\"password\":\"" + PASSWORD + "\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.mfaEnrolmentRequired").value(true))
                .andReturn();

        JsonNode enrolment = data(first);
        String secret = enrolment.get("mfaSecret").asText();
        MvcResult enrolled = mockMvc.perform(post("/api/auth/admin/mfa/enrol")
                        .header("Authorization", "Bearer " + enrolment.get("token").asText())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"totpCode\":\"" + TotpUtil.code(secret, Instant.now()) + "\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.mfaEnabled").value(true))
                .andReturn();
        return data(enrolled).get("token").asText();
    }

    private String bearer() {
        return "Bearer " + adminToken;
    }

    @Test
    void administratorSignInRequiresTheAuthenticatorCodeOnceEnrolled() throws Exception {
        mockMvc.perform(post("/api/auth/admin/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"email\":\"ops.admin@taxfiler.in\",\"password\":\"" + PASSWORD + "\","
                                + "\"totpCode\":\"000000\"}"))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.code").value("AUTHENTICATION_FAILED"));

        String secret = userRepository.findByEmail("ops.admin@taxfiler.in").orElseThrow().getMfaSecret();
        mockMvc.perform(post("/api/auth/admin/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"email\":\"ops.admin@taxfiler.in\",\"password\":\"" + PASSWORD + "\","
                                + "\"totpCode\":\"" + TotpUtil.code(secret, Instant.now()) + "\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.mfaEnabled").value(true));
    }

    @Test
    void staffCannotUseTheTaxpayerLogin() throws Exception {
        mockMvc.perform(post("/api/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"email\":\"ops.admin@taxfiler.in\",\"password\":\"" + PASSWORD + "\"}"))
                // Valid credentials, wrong portal: the staff member must use the administration sign in.
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.success").value(false));
    }

    @Test
    void dashboardReportsSeparateIncomeTaxAndGstKeyFigures() throws Exception {
        mockMvc.perform(get("/api/admin/dashboard").header("Authorization", bearer()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.incomeTaxKpis").exists())
                .andExpect(jsonPath("$.data.gstKpis").exists());
    }

    @Test
    void caseQueueAndReportsAreAvailableToStaff() throws Exception {
        mockMvc.perform(get("/api/admin/cases?page=0&size=5").header("Authorization", bearer()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.content").isArray());

        mockMvc.perform(get("/api/admin/reports/gst-filing-status").header("Authorization", bearer()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.headers").isArray());
    }

    @Test
    void taxpayerContactDetailsAreMaskedForStaffWithoutFullPiiAccess() throws Exception {
        mockMvc.perform(post("/api/auth/register")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"name\":\"Meera Nair\",\"email\":\"meera.admin@example.com\","
                                + "\"phone\":\"9876500022\",\"pan\":\"ABCDE2222F\",\"password\":\"Passw0rd!\"}"))
                .andExpect(status().isOk());

        MvcResult customers = mockMvc.perform(get("/api/admin/users/customers?size=10")
                        .header("Authorization", bearer()))
                .andExpect(status().isOk())
                .andReturn();

        JsonNode first = data(customers).get("content").get(0);
        assertThat(first.get("email").asText()).contains("***");
        assertThat(first.get("phone").asText()).startsWith("*");
    }

    @Test
    void auditTrailRecordsAdministratorActions() throws Exception {
        mockMvc.perform(get("/api/admin/audit-logs?action=ADMIN_MFA_ENABLED&size=5")
                        .header("Authorization", bearer()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.content[0].actorEmail").value("ops.admin@taxfiler.in"))
                .andExpect(jsonPath("$.data.content[0].actorRole").value("ADMIN"));
    }

    @Test
    void governmentIntegrationIsReportedAsUnconfiguredUntilAnAdapterIsSupplied() throws Exception {
        mockMvc.perform(get("/api/admin/integration/status").header("Authorization", bearer()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.INCOME_TAX").value(false))
                .andExpect(jsonPath("$.data.GST").value(false));
    }

    @Test
    void publishingTaxRulesIsReservedForTheSuperAdmin() throws Exception {
        mockMvc.perform(post("/api/admin/config/tax-rules")
                        .header("Authorization", bearer())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"ruleKey\":\"gst.deadlines\",\"taxType\":\"GST\",\"category\":\"DEADLINES\","
                                + "\"effectiveFrom\":\"2027-04-01\","
                                + "\"configuration\":\"{\\\"GSTR_1\\\":{\\\"dueDayOfMonth\\\":13}}\"}"))
                .andExpect(status().isForbidden());
    }
}
