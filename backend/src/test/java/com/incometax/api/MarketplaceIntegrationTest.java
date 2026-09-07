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

import java.time.DayOfWeek;
import java.time.Instant;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.util.stream.Collectors;
import java.util.stream.Stream;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * Walks the marketplace end to end: consultant registers → admin verifies → client finds, quotes,
 * books and pays → consultant completes → client reviews → admin pays out.
 */
@SpringBootTest(properties = {
        "spring.datasource.url=jdbc:h2:mem:marketplace;DB_CLOSE_DELAY=-1",
        "rate-limit.enabled=false",
        "documents.storage-dir=./target/test-documents"
})
@AutoConfigureMockMvc
@TestMethodOrder(MethodOrderer.OrderAnnotation.class)
class MarketplaceIntegrationTest {

    private static final String PASSWORD = "Str0ngPassw0rd!";

    @Autowired
    private MockMvc mockMvc;
    @Autowired
    private ObjectMapper objectMapper;
    @Autowired
    private UserRepository userRepository;
    @Autowired
    private PasswordEncoder passwordEncoder;

    private static String consultantToken;
    private static String clientToken;
    private static String adminToken;
    private static String consultantId;
    private static String bookingId;

    @BeforeEach
    void setUp() throws Exception {
        if (adminToken != null) {
            return;
        }
        userRepository.save(User.builder().name("Owner").email("owner.mkt@taxfiler.in")
                .password(passwordEncoder.encode(PASSWORD)).role(User.Role.SUPER_ADMIN)
                .onboardingComplete(true).mfaSecret(TotpUtil.generateSecret()).build());
        MvcResult first = mockMvc.perform(post("/api/auth/admin/login").contentType(MediaType.APPLICATION_JSON)
                        .content(json("email", "owner.mkt@taxfiler.in", "password", PASSWORD)))
                .andExpect(status().isOk()).andReturn();
        JsonNode enrolment = data(first);
        MvcResult enrolled = mockMvc.perform(post("/api/auth/admin/mfa/enrol")
                        .header("Authorization", "Bearer " + enrolment.get("token").asText())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"totpCode\":\"" + TotpUtil.code(enrolment.get("mfaSecret").asText(),
                                Instant.now()) + "\"}"))
                .andExpect(status().isOk()).andReturn();
        adminToken = data(enrolled).get("token").asText();

        MvcResult client = mockMvc.perform(post("/api/auth/register").contentType(MediaType.APPLICATION_JSON)
                        .content("{\"name\":\"Client One\",\"email\":\"client.mkt@example.com\","
                                + "\"phone\":\"9876500099\",\"pan\":\"MKTPL1234A\",\"password\":\"" + PASSWORD + "\"}"))
                .andExpect(status().isOk()).andReturn();
        clientToken = data(client).get("token").asText();
    }

    @Test
    @Order(1)
    void consultantRegistersAndIsHiddenUntilVerified() throws Exception {
        MvcResult reg = mockMvc.perform(post("/api/auth/consultant/register")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"name\":\"CA Meera Nair\",\"email\":\"meera.ca@example.com\",\"phone\":\"9876501234\","
                                + "\"password\":\"" + PASSWORD + "\",\"professionalTypeCode\":\"CA\","
                                + "\"registrationNumber\":\"ICAI-555\",\"qualification\":\"FCA\",\"experienceYears\":9,"
                                + "\"specializations\":[\"Income Tax\"],\"categorySlugs\":[\"itr-filing\"],"
                                + "\"city\":\"Kochi\",\"state\":\"Kerala\",\"languages\":[\"English\",\"Malayalam\"],"
                                + "\"consultationModes\":[\"VIDEO\",\"PHONE\"],\"baseFee\":500}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.role").value("CONSULTANT"))
                .andReturn();
        consultantToken = data(reg).get("token").asText();

        // ICAI number is mandatory for CAs.
        mockMvc.perform(post("/api/auth/consultant/register").contentType(MediaType.APPLICATION_JSON)
                        .content("{\"name\":\"No Reg\",\"email\":\"noreg@example.com\",\"password\":\"" + PASSWORD
                                + "\",\"professionalTypeCode\":\"CA\"}"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code").value("REGISTRATION_NUMBER_REQUIRED"));

        // Consultants cannot use the client login and vice versa.
        mockMvc.perform(post("/api/auth/login").contentType(MediaType.APPLICATION_JSON)
                        .content(json("email", "meera.ca@example.com", "password", PASSWORD)))
                .andExpect(status().isForbidden());
        mockMvc.perform(post("/api/auth/consultant/login").contentType(MediaType.APPLICATION_JSON)
                        .content(json("email", "client.mkt@example.com", "password", PASSWORD)))
                .andExpect(status().isForbidden());

        MvcResult profile = mockMvc.perform(get("/api/consultant/profile").header("Authorization", bearer(consultantToken)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.status").value("PENDING_VERIFICATION"))
                .andReturn();
        consultantId = data(profile).get("profile").get("id").asText();

        // Set weekly availability every day so the booking test is date independent.
        String rules = Stream.of(DayOfWeek.values())
                .map(d -> "{\"dayOfWeek\":\"" + d + "\",\"startTime\":\"00:00\",\"endTime\":\"23:59\"}")
                .collect(Collectors.joining(","));
        mockMvc.perform(put("/api/consultant/availability").header("Authorization", bearer(consultantToken))
                        .contentType(MediaType.APPLICATION_JSON).content("{\"rules\":[" + rules + "]}"))
                .andExpect(status().isOk());

        // Clients cannot reach consultant endpoints; staff cannot either.
        mockMvc.perform(get("/api/consultant/profile").header("Authorization", bearer(clientToken)))
                .andExpect(status().isForbidden());

        // Not yet visible publicly.
        mockMvc.perform(get("/api/public/marketplace/consultants/" + consultantId)).andExpect(status().isNotFound());
        mockMvc.perform(get("/api/public/marketplace/consultants").param("type", "CA"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.content[?(@.id=='" + consultantId + "')]").isEmpty());
    }

    @Test
    @Order(2)
    void adminVerifiesAndConsultantBecomesSearchable() throws Exception {
        mockMvc.perform(get("/api/admin/marketplace/consultants").param("status", "PENDING_VERIFICATION")
                        .header("Authorization", bearer(adminToken)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.content[0].profile.id").value(consultantId));

        mockMvc.perform(post("/api/admin/marketplace/consultants/" + consultantId + "/approve")
                        .header("Authorization", bearer(adminToken)).contentType(MediaType.APPLICATION_JSON)
                        .content("{\"notes\":\"ICAI record matched\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.status").value("ACTIVE"))
                .andExpect(jsonPath("$.data.profile.verified").value(true));

        mockMvc.perform(get("/api/public/marketplace/consultants").param("type", "CA").param("city", "kochi")
                        .param("language", "Malayalam").param("mode", "VIDEO"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.content[0].id").value(consultantId))
                .andExpect(jsonPath("$.data.content[0].registrationNumber").value("ICAI-555"));

        // Consultant self-service endpoints are not available to a client token.
        mockMvc.perform(post("/api/admin/marketplace/consultants/" + consultantId + "/suspend")
                        .header("Authorization", bearer(clientToken)))
                .andExpect(status().isForbidden());
    }

    @Test
    @Order(3)
    void clientQuotesBooksPaysAndDoubleBookingIsRejected() throws Exception {
        MvcResult quote = mockMvc.perform(post("/api/public/marketplace/quote").contentType(MediaType.APPLICATION_JSON)
                        .content("{\"consultantId\":\"" + consultantId + "\",\"mode\":\"VIDEO\",\"urgent\":false}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.consultationFee").value(500.00))
                .andReturn();
        JsonNode q = data(quote);
        // total = (fee + platform fee) * (1 + GST%) using seeded rules: 500 * 1.18 = 590
        assertThat(q.get("total").decimalValue()).isEqualByComparingTo("590.00");

        LocalDateTime start = LocalDate.now().plusDays(3).atTime(LocalTime.of(10, 0));
        String body = "{\"consultantId\":\"" + consultantId + "\",\"mode\":\"VIDEO\",\"scheduledStart\":\"" + start
                + "\",\"notes\":\"Need help with capital gains\"}";

        MvcResult created = mockMvc.perform(post("/api/bookings").header("Authorization", bearer(clientToken))
                        .contentType(MediaType.APPLICATION_JSON).content(body))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.status").value("PAYMENT_PENDING"))
                .andExpect(jsonPath("$.data.totalAmount").value(590.00))
                .andExpect(jsonPath("$.data.consultantEarning").doesNotExist())
                .andReturn();
        bookingId = data(created).get("id").asText();

        // Same slot for the same consultant is now held.
        mockMvc.perform(post("/api/bookings").header("Authorization", bearer(clientToken))
                        .contentType(MediaType.APPLICATION_JSON).content(body))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.code").value("SLOT_TAKEN"));

        // Slot listing excludes the held time.
        MvcResult slots = mockMvc.perform(get("/api/public/marketplace/consultants/" + consultantId + "/slots")
                        .param("from", start.toLocalDate().toString()).param("days", "1"))
                .andExpect(status().isOk()).andReturn();
        assertThat(data(slots).get(0).get("slots").findValuesAsText("start")).doesNotContain(start.toString());

        // Consultant cannot pay on the client's behalf; the wrong client cannot see the booking.
        mockMvc.perform(post("/api/bookings/" + bookingId + "/confirm-payment")
                        .header("Authorization", bearer(consultantToken)).contentType(MediaType.APPLICATION_JSON)
                        .content("{\"paymentReference\":\"pay_x\"}"))
                .andExpect(status().isForbidden());

        mockMvc.perform(post("/api/bookings/" + bookingId + "/confirm-payment")
                        .header("Authorization", bearer(clientToken)).contentType(MediaType.APPLICATION_JSON)
                        .content("{\"paymentReference\":\"pay_TEST123\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.status").value("CONFIRMED"))
                .andExpect(jsonPath("$.data.paymentStatus").value("PAID"))
                .andExpect(jsonPath("$.data.invoiceNumber").isNotEmpty())
                .andExpect(jsonPath("$.data.meetingLink").isNotEmpty());

        mockMvc.perform(get("/api/bookings/" + bookingId + "/invoice").header("Authorization", bearer(clientToken)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.totalAmount").value(590.00));

        // Consultant sees the request with their earning (500 - 15% commission = 425).
        mockMvc.perform(get("/api/consultant/bookings").param("filter", "upcoming")
                        .header("Authorization", bearer(consultantToken)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.content[0].id").value(bookingId))
                .andExpect(jsonPath("$.data.content[0].consultantEarning").value(425.00));
    }

    @Test
    @Order(4)
    void messagingIsScopedToTheBookingAndReviewRequiresCompletion() throws Exception {
        mockMvc.perform(post("/api/bookings/" + bookingId + "/messages").header("Authorization", bearer(clientToken))
                        .contentType(MediaType.APPLICATION_JSON).content("{\"body\":\"Sharing my broker statement soon\"}"))
                .andExpect(status().isOk());
        mockMvc.perform(get("/api/bookings/" + bookingId + "/messages").header("Authorization", bearer(consultantToken)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data[0].mine").value(false))
                .andExpect(jsonPath("$.data[0].senderName").value("Client One"));

        // A second, unrelated client cannot read the conversation.
        MvcResult other = mockMvc.perform(post("/api/auth/register").contentType(MediaType.APPLICATION_JSON)
                        .content("{\"name\":\"Other\",\"email\":\"other.mkt@example.com\",\"pan\":\"MKTPL9999Z\","
                                + "\"password\":\"" + PASSWORD + "\"}"))
                .andExpect(status().isOk()).andReturn();
        mockMvc.perform(get("/api/bookings/" + bookingId + "/messages")
                        .header("Authorization", bearer(data(other).get("token").asText())))
                .andExpect(status().isForbidden());

        mockMvc.perform(post("/api/bookings/" + bookingId + "/review").header("Authorization", bearer(clientToken))
                        .contentType(MediaType.APPLICATION_JSON).content("{\"rating\":5,\"comment\":\"Great\"}"))
                .andExpect(status().isConflict());

        mockMvc.perform(post("/api/consultant/bookings/" + bookingId + "/complete")
                        .header("Authorization", bearer(consultantToken)).contentType(MediaType.APPLICATION_JSON)
                        .content("{\"notes\":\"Advised LTCG set-off\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.status").value("COMPLETED"));

        mockMvc.perform(post("/api/bookings/" + bookingId + "/review").header("Authorization", bearer(clientToken))
                        .contentType(MediaType.APPLICATION_JSON).content("{\"rating\":5,\"comment\":\"Great\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.clientName").value("Client O."));

        mockMvc.perform(get("/api/public/marketplace/consultants/" + consultantId))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.averageRating").value(5.0))
                .andExpect(jsonPath("$.data.completedConsultations").value(1));
    }

    @Test
    @Order(5)
    void dashboardAndPayoutReflectCompletedWork() throws Exception {
        mockMvc.perform(get("/api/consultant/dashboard").header("Authorization", bearer(consultantToken)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.counts.completed").value(1))
                .andExpect(jsonPath("$.data.totalEarnings").value(425.00))
                .andExpect(jsonPath("$.data.pendingEarnings").value(425.00));

        MvcResult payout = mockMvc.perform(post("/api/admin/marketplace/consultants/" + consultantId + "/payouts")
                        .header("Authorization", bearer(adminToken)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.netAmount").value(425.00))
                .andExpect(jsonPath("$.data.commissionAmount").value(75.00))
                .andReturn();
        String payoutId = data(payout).get("id").asText();

        mockMvc.perform(post("/api/admin/marketplace/payouts/" + payoutId + "/settle")
                        .header("Authorization", bearer(adminToken)).contentType(MediaType.APPLICATION_JSON)
                        .content("{\"paymentReference\":\"NEFT-001\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.status").value("PAID"));

        mockMvc.perform(get("/api/consultant/dashboard").header("Authorization", bearer(consultantToken)))
                .andExpect(jsonPath("$.data.pendingEarnings").value(0))
                .andExpect(jsonPath("$.data.paidOut").value(425.00));

        // Changing commission is admin-only and audited; effect only applies to new bookings.
        mockMvc.perform(put("/api/admin/marketplace/pricing-rules/PLATFORM_COMMISSION_PERCENT")
                        .header("Authorization", bearer(adminToken)).contentType(MediaType.APPLICATION_JSON)
                        .content("{\"value\":20}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.value").value(20));
        mockMvc.perform(put("/api/admin/marketplace/pricing-rules/PLATFORM_COMMISSION_PERCENT")
                        .header("Authorization", bearer(consultantToken)).contentType(MediaType.APPLICATION_JSON)
                        .content("{\"value\":0}"))
                .andExpect(status().isForbidden());

        mockMvc.perform(get("/api/admin/marketplace/stats").header("Authorization", bearer(adminToken)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.bookings.COMPLETED").value(1))
                .andExpect(jsonPath("$.data.payoutsPaid").value(425.00));
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
