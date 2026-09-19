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

import java.time.Instant;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/** Admin CMS: drafts are invisible publicly, publishing/reordering/import behave, and only CMS managers may write. */
@SpringBootTest(properties = {
        "spring.datasource.url=jdbc:h2:mem:cms;DB_CLOSE_DELAY=-1",
        "rate-limit.enabled=false",
        "documents.storage-dir=./target/test-documents"
})
@AutoConfigureMockMvc
@TestMethodOrder(MethodOrderer.OrderAnnotation.class)
class CmsIntegrationTest {

    private static final String PASSWORD = "Str0ngPassw0rd!";

    @Autowired
    private MockMvc mockMvc;
    @Autowired
    private ObjectMapper objectMapper;
    @Autowired
    private UserRepository userRepository;
    @Autowired
    private PasswordEncoder passwordEncoder;

    private static String adminToken;
    private static String customerToken;

    @BeforeEach
    void setUp() throws Exception {
        if (adminToken != null) {
            return;
        }
        userRepository.save(User.builder().name("Owner").email("owner.cms@taxfiler.in")
                .password(passwordEncoder.encode(PASSWORD)).role(User.Role.SUPER_ADMIN)
                .onboardingComplete(true).mfaSecret(TotpUtil.generateSecret()).build());
        MvcResult first = mockMvc.perform(post("/api/auth/admin/login").contentType(MediaType.APPLICATION_JSON)
                        .content("{\"email\":\"owner.cms@taxfiler.in\",\"password\":\"" + PASSWORD + "\"}"))
                .andExpect(status().isOk()).andReturn();
        JsonNode enrolment = data(first);
        MvcResult enrolled = mockMvc.perform(post("/api/auth/admin/mfa/enrol")
                        .header("Authorization", bearer(enrolment.get("token").asText()))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"totpCode\":\"" + TotpUtil.code(enrolment.get("mfaSecret").asText(),
                                Instant.now()) + "\"}"))
                .andExpect(status().isOk()).andReturn();
        adminToken = data(enrolled).get("token").asText();

        MvcResult registered = mockMvc.perform(post("/api/auth/register").contentType(MediaType.APPLICATION_JSON)
                        .content("{\"name\":\"Cms Client\",\"email\":\"client.cms@example.com\",\"phone\":\"9876500012\","
                                + "\"pan\":\"CMSCL1234A\",\"password\":\"" + PASSWORD + "\"}"))
                .andExpect(status().isOk()).andReturn();
        customerToken = data(registered).get("token").asText();
    }

    @Test
    @Order(1)
    void publicSiteIsEmptyUntilContentIsPublished() throws Exception {
        mockMvc.perform(get("/api/public/cms"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.faqs").doesNotExist());

        mockMvc.perform(post("/api/admin/cms/faqs").header("Authorization", bearer(adminToken))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"slug\":\"deadline\",\"data\":{\"question\":\"When is the ITR deadline?\","
                                + "\"answer\":\"31 July for most individuals.\"}}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.status").value("DRAFT"))
                .andExpect(jsonPath("$.data.title").value("When is the ITR deadline?"));

        // Draft is not public.
        mockMvc.perform(get("/api/public/cms/faqs"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.length()").value(0));

        mockMvc.perform(post("/api/admin/cms/faqs/deadline/publish").header("Authorization", bearer(adminToken)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.status").value("PUBLISHED"));

        mockMvc.perform(get("/api/public/cms/faqs"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.length()").value(1))
                .andExpect(jsonPath("$.data[0].question").value("When is the ITR deadline?"));
    }

    @Test
    @Order(2)
    void editingBumpsVersionAndReorderIsRespected() throws Exception {
        mockMvc.perform(post("/api/admin/cms/faqs").header("Authorization", bearer(adminToken))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"slug\":\"revised\",\"publish\":true,\"data\":{\"question\":\"Can I revise?\","
                                + "\"answer\":\"Yes.\"}}"))
                .andExpect(status().isOk());

        mockMvc.perform(put("/api/admin/cms/faqs/deadline").header("Authorization", bearer(adminToken))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"slug\":\"deadline\",\"data\":{\"question\":\"When is the ITR deadline?\","
                                + "\"answer\":\"31 July, unless extended.\"}}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.version").value(2))
                .andExpect(jsonPath("$.data.status").value("PUBLISHED"));

        mockMvc.perform(put("/api/admin/cms/faqs/reorder").header("Authorization", bearer(adminToken))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"slugs\":[\"revised\",\"deadline\"]}"))
                .andExpect(status().isOk());

        MvcResult pub = mockMvc.perform(get("/api/public/cms/faqs")).andExpect(status().isOk()).andReturn();
        JsonNode list = data(pub);
        assertThat(list.get(0).get("question").asText()).isEqualTo("Can I revise?");
        assertThat(list.get(1).get("answer").asText()).isEqualTo("31 July, unless extended.");

        // Duplicate slug in the same collection is rejected.
        mockMvc.perform(post("/api/admin/cms/faqs").header("Authorization", bearer(adminToken))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"slug\":\"deadline\",\"data\":{\"question\":\"dup\"}}"))
                .andExpect(status().isConflict());
    }

    @Test
    @Order(3)
    void importSkipsExistingAndSummaryCounts() throws Exception {
        mockMvc.perform(post("/api/admin/cms/import").header("Authorization", bearer(adminToken))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"collections\":{\"faqs\":[{\"slug\":\"deadline\",\"data\":{\"question\":\"x\"}},"
                                + "{\"slug\":\"penalty\",\"data\":{\"question\":\"Late fee?\",\"answer\":\"Up to 5,000.\"}}],"
                                + "\"site\":[{\"slug\":\"site\",\"data\":{\"name\":\"TaxFilr\"}}]}}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.created").value(2))
                .andExpect(jsonPath("$.data.skipped").value(1));

        // Existing entry kept its edited body.
        mockMvc.perform(get("/api/admin/cms/faqs/deadline").header("Authorization", bearer(adminToken)))
                .andExpect(jsonPath("$.data.data.answer").value("31 July, unless extended."));

        MvcResult summary = mockMvc.perform(get("/api/admin/cms").header("Authorization", bearer(adminToken)))
                .andExpect(status().isOk()).andReturn();
        JsonNode faqs = null;
        for (JsonNode row : data(summary)) {
            if ("faqs".equals(row.get("collection").asText())) {
                faqs = row;
            }
        }
        assertThat(faqs).isNotNull();
        assertThat(faqs.get("published").asLong()).isEqualTo(3);

        mockMvc.perform(post("/api/admin/cms/faqs/penalty/unpublish").header("Authorization", bearer(adminToken)))
                .andExpect(status().isOk());
        mockMvc.perform(get("/api/public/cms/faqs"))
                .andExpect(jsonPath("$.data.length()").value(2));
        mockMvc.perform(delete("/api/admin/cms/faqs/penalty").header("Authorization", bearer(adminToken)))
                .andExpect(status().isOk());
        mockMvc.perform(get("/api/admin/cms/faqs/penalty").header("Authorization", bearer(adminToken)))
                .andExpect(status().isNotFound());
    }

    @Test
    @Order(4)
    void customersAndAnonymousCannotManageContent() throws Exception {
        mockMvc.perform(get("/api/admin/cms").header("Authorization", bearer(customerToken)))
                .andExpect(status().isForbidden());
        mockMvc.perform(post("/api/admin/cms/faqs").header("Authorization", bearer(customerToken))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"slug\":\"hack\",\"data\":{}}"))
                .andExpect(status().isForbidden());
        mockMvc.perform(post("/api/admin/cms/faqs/deadline/unpublish"))
                .andExpect(status().isUnauthorized());
        mockMvc.perform(post("/api/admin/cms/Bad Collection!").header("Authorization", bearer(adminToken))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"slug\":\"x\",\"data\":{}}"))
                .andExpect(status().is4xxClientError());
    }

    private JsonNode data(MvcResult result) throws Exception {
        return objectMapper.readTree(result.getResponse().getContentAsString()).get("data");
    }

    private static String bearer(String token) {
        return "Bearer " + token;
    }
}
