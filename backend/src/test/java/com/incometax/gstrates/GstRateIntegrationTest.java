package com.incometax.gstrates;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.incometax.entity.AuditLog;
import com.incometax.entity.User;
import com.incometax.repository.UserRepository;
import com.incometax.security.TotpUtil;
import org.springframework.security.crypto.password.PasswordEncoder;
import java.time.Instant;
import com.incometax.gstrates.entity.GstRateCategory;
import com.incometax.gstrates.repository.GstRateCategoryRepository;
import com.incometax.gstrates.repository.GstRuleRepository;
import com.incometax.gstrates.service.GstRateService;
import com.incometax.repository.AuditLogRepository;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@ActiveProfiles("test")
@SpringBootTest(properties = {
        "spring.datasource.url=jdbc:h2:mem:gstrates;DB_CLOSE_DELAY=-1",
        "rate-limit.enabled=false",
        "documents.storage-dir=./target/test-documents"
})
@AutoConfigureMockMvc
class GstRateIntegrationTest {

    @Autowired private MockMvc mockMvc;
    @Autowired private ObjectMapper objectMapper;
    @Autowired private GstRateCategoryRepository categoryRepository;
    @Autowired private GstRuleRepository ruleRepository;
    @Autowired private GstRateService gstRateService;
    @Autowired private AuditLogRepository auditLogRepository;
    @Autowired private UserRepository userRepository;
    @Autowired private PasswordEncoder passwordEncoder;

    @Test
    void everyBusinessTypeAndRuleKindIsSeeded() {
        List<GstRateCategory> rows = categoryRepository.findAll();
        assertThat(rows).extracting(GstRateCategory::getBusinessType).contains("TRADER", "MANUFACTURER",
                "RESTAURANT", "HOTEL", "IT_SERVICES", "CONSTRUCTION", "TRANSPORT", "JEWELLERY", "HEALTH",
                "EDUCATION", "EXPORT", "FINANCE");
        assertThat(ruleRepository.findAll()).extracting(r -> r.getKind().name())
                .contains("SCHEME", "OPTION", "THRESHOLD", "LEVY", "INVESTMENT");
    }

    @Test
    void rateDependsOnTheInvoiceDate() {
        assertThat(gstRateService.resolve("ACS_TVS_DISHWASHERS", LocalDate.of(2025, 9, 21)).getRate())
                .isEqualByComparingTo("0.28");
        assertThat(gstRateService.resolve("ACS_TVS_DISHWASHERS", LocalDate.of(2025, 9, 22)).getRate())
                .isEqualByComparingTo("0.18");
        GstRateCategory oldDrinks = gstRateService.resolve("SOFT_DRINKS", LocalDate.of(2024, 4, 1));
        assertThat(oldDrinks.getRate()).isEqualByComparingTo("0.28");
        assertThat(oldDrinks.getCessRate()).isEqualByComparingTo("0.12");
        assertThat(gstRateService.resolve("SOFT_DRINKS", LocalDate.of(2025, 10, 1)).getCessRate()).isNull();
        assertThat(gstRateService.resolve("GOLD_SILVER_JEWELLERY", LocalDate.of(2025, 10, 1)).getRate())
                .isEqualByComparingTo("0.03");
    }

    @Test
    void sameStateSplitsIntoCgstAndSgstAndOtherStateIsIgst() throws Exception {
        mockMvc.perform(post("/api/public/gst/calculate").contentType(MediaType.APPLICATION_JSON)
                        .content("{\"categoryCode\":\"IT_SOFTWARE_SERVICES\",\"taxableValue\":10000.55,"
                                + "\"invoiceDate\":\"2025-10-01\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.cgst").value(900.05))
                .andExpect(jsonPath("$.data.sgst").value(900.05))
                .andExpect(jsonPath("$.data.igst").value(0))
                .andExpect(jsonPath("$.data.totalTax").value(1800.10));
        mockMvc.perform(post("/api/public/gst/calculate").contentType(MediaType.APPLICATION_JSON)
                        .content("{\"categoryCode\":\"SOFT_DRINKS\",\"taxableValue\":1000,"
                                + "\"invoiceDate\":\"2025-01-15\",\"interState\":true}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.igst").value(280))
                .andExpect(jsonPath("$.data.cess").value(120))
                .andExpect(jsonPath("$.data.invoiceTotal").value(1400));
        mockMvc.perform(post("/api/public/gst/calculate").contentType(MediaType.APPLICATION_JSON)
                        .content("{\"categoryCode\":\"RESTAURANT\",\"taxableValue\":500}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.totalTax").value(25))
                .andExpect(jsonPath("$.data.itcAllowed").value(false));
        mockMvc.perform(post("/api/public/gst/calculate").contentType(MediaType.APPLICATION_JSON)
                        .content("{\"categoryCode\":\"NOT_A_CODE\",\"taxableValue\":500}"))
                .andExpect(status().isBadRequest());
    }

    @Test
    void publicRateBookShowsOnlyRowsInForce() throws Exception {
        MvcResult result = mockMvc.perform(get("/api/public/gst/rates").param("date", "2025-10-01"))
                .andExpect(status().isOk()).andReturn();
        JsonNode categories = objectMapper.readTree(result.getResponse().getContentAsString()).at("/data/categories");
        long acRows = 0;
        for (JsonNode c : categories) {
            if (c.path("code").asText().equals("ACS_TVS_DISHWASHERS")) {
                acRows++;
                assertThat(c.path("rate").decimalValue()).isEqualByComparingTo("0.18");
            }
        }
        assertThat(acRows).isEqualTo(1);
    }

    @Test
    void customerCannotEditRatesAndLoginAndSavesAreAudited() throws Exception {
        mockMvc.perform(post("/api/auth/register").contentType(MediaType.APPLICATION_JSON)
                        .content("{\"name\":\"Ravi Shop\",\"email\":\"ravi.gst@example.com\",\"phone\":\"9876500031\","
                                + "\"pan\":\"ABCDE3131F\",\"password\":\"Passw0rd!\"}"))
                .andExpect(status().isOk());
        MvcResult login = mockMvc.perform(post("/api/auth/login").contentType(MediaType.APPLICATION_JSON)
                        .content("{\"email\":\"ravi.gst@example.com\",\"password\":\"Passw0rd!\"}"))
                .andExpect(status().isOk()).andReturn();
        String bearer = "Bearer " + objectMapper.readTree(login.getResponse().getContentAsString())
                .at("/data/token").asText();
        String id = categoryRepository.findByCodeOrderByEffectiveFromDesc("COURIER").get(0).getId();
        mockMvc.perform(put("/api/admin/gst-rates/categories/" + id).header("Authorization", bearer)
                        .contentType(MediaType.APPLICATION_JSON).content(update(12)))
                .andExpect(status().isForbidden());
        mockMvc.perform(post("/api/itr/computations").header("Authorization", bearer)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"financialYear\":\"2025-26\",\"ageGroup\":\"BELOW_60\",\"amounts\":{\"SALARY\":500000}}"))
                .andExpect(status().isOk());

        List<AuditLog> logs = auditLogRepository.findAll();
        assertThat(logs).anySatisfy(l -> {
            assertThat(l.getAction()).isEqualTo("CUSTOMER_LOGIN");
            assertThat(l.getActorEmail()).isEqualTo("ravi.gst@example.com");
        });
        assertThat(logs).anySatisfy(l -> {
            assertThat(l.getAction()).isEqualTo("USER_SAVE");
            assertThat(l.getEntityId()).isEqualTo("/api/itr/computations");
            assertThat(l.getActorEmail()).isEqualTo("ravi.gst@example.com");
        });
    }

    @Test
    void adminRateChangeIsUsedAndAuditedWithOldAndNewValues() throws Exception {
        userRepository.save(User.builder().name("Owner").email("owner.gst@taxfiler.in")
                .password(passwordEncoder.encode("Passw0rd!")).role(User.Role.SUPER_ADMIN)
                .onboardingComplete(true).mfaSecret(TotpUtil.generateSecret()).build());
        MvcResult first = mockMvc.perform(post("/api/auth/admin/login").contentType(MediaType.APPLICATION_JSON)
                        .content("{\"email\":\"owner.gst@taxfiler.in\",\"password\":\"Passw0rd!\"}"))
                .andExpect(status().isOk()).andReturn();
        JsonNode enrolment = objectMapper.readTree(first.getResponse().getContentAsString()).get("data");
        String token = enrolment.get("token").asText();
        if (enrolment.hasNonNull("mfaSecret")) {
            MvcResult enrolled = mockMvc.perform(post("/api/auth/admin/mfa/enrol")
                            .header("Authorization", "Bearer " + token)
                            .contentType(MediaType.APPLICATION_JSON)
                            .content("{\"totpCode\":\"" + TotpUtil.code(enrolment.get("mfaSecret").asText(),
                                    Instant.now()) + "\"}"))
                    .andExpect(status().isOk()).andReturn();
            token = objectMapper.readTree(enrolled.getResponse().getContentAsString()).at("/data/token").asText();
        }
        String bearer = "Bearer " + token;
        String id = categoryRepository.findByCodeOrderByEffectiveFromDesc("COURIER").get(0).getId();
        mockMvc.perform(put("/api/admin/gst-rates/categories/" + id).header("Authorization", bearer)
                        .contentType(MediaType.APPLICATION_JSON).content(update(12)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.rate").value(0.12));
        assertThat(gstRateService.resolve("COURIER", LocalDate.now()).getRate()).isEqualByComparingTo(new BigDecimal("0.12"));
        assertThat(auditLogRepository.findAll()).anySatisfy(l -> {
            assertThat(l.getAction()).isEqualTo("GST_RATE_UPDATED");
            assertThat(l.getOldValue()).contains("\"rate\":\"0.1800\"");
            assertThat(l.getNewValue()).contains("\"rate\":\"0.12\"");
        });
        mockMvc.perform(put("/api/admin/gst-rates/categories/" + id).header("Authorization", bearer)
                .contentType(MediaType.APPLICATION_JSON).content(update(18))).andExpect(status().isOk());
    }

    private static String update(int ratePercent) {
        return "{\"name\":\"Courier and parcel delivery\",\"hsnSac\":\"9968\",\"treatment\":\"TAXABLE\",\"rate\":"
                + ratePercent + ",\"reverseCharge\":false,\"itcAllowed\":true,\"effectiveFrom\":\"2017-07-01\","
                + "\"active\":true}";
    }

    @Test
    void notANumberIsABadRequest() throws Exception {
        mockMvc.perform(post("/api/public/gst/calculate").contentType(MediaType.APPLICATION_JSON)
                        .content("{\"categoryCode\":\"IT_SOFTWARE_SERVICES\",\"taxableValue\":\"abc\"}"))
                .andExpect(status().isBadRequest());
    }
}
