package com.incometax.api;

import com.incometax.entity.User;
import com.incometax.repository.UserRepository;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.web.servlet.MockMvc;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/** With MFA_EXEMPT_ROLES cleared, the super admin goes through authenticator enrolment like other staff. */
@SpringBootTest(properties = {
        "spring.datasource.url=jdbc:h2:mem:mfaexempt;DB_CLOSE_DELAY=-1",
        "rate-limit.enabled=false",
        "documents.storage-dir=./target/test-documents",
        "app.mfa.exempt-roles="
})
@AutoConfigureMockMvc
class MfaExemptionDisabledIntegrationTest {

    private static final String PASSWORD = "AdminPassw0rd!";

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private PasswordEncoder passwordEncoder;

    @Test
    void superAdminMustEnrolAnAuthenticatorWhenNoRoleIsExempt() throws Exception {
        userRepository.save(User.builder()
                .name("Owner")
                .email("strict.owner@taxfiler.in")
                .password(passwordEncoder.encode(PASSWORD))
                .role(User.Role.SUPER_ADMIN)
                .onboardingComplete(true)
                .build());

        mockMvc.perform(post("/api/auth/admin/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"email\":\"strict.owner@taxfiler.in\",\"password\":\"" + PASSWORD + "\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.mfaEnrolmentRequired").value(true))
                .andExpect(jsonPath("$.data.mfaSecret").isNotEmpty());
    }
}
