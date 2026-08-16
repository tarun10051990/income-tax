package com.incometax.config;

import com.incometax.entity.User;
import com.incometax.repository.UserRepository;
import com.incometax.security.TotpUtil;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.ApplicationRunner;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.crypto.password.PasswordEncoder;

/**
 * Creates the staff accounts needed to operate a fresh installation. Enabled only when
 * {@code app.seed-demo-users} is true, and the password comes from configuration so that no
 * credential is committed to the repository.
 */
@Configuration
@RequiredArgsConstructor
@ConditionalOnProperty(name = "app.seed-demo-users", havingValue = "true")
@Slf4j
public class DemoDataSeeder {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;

    @Value("${app.seed-user-password:}")
    private String seedPassword;

    @Bean
    ApplicationRunner seedUsers() {
        return args -> {
            if (seedPassword == null || seedPassword.isBlank()) {
                log.warn("app.seed-demo-users is enabled but app.seed-user-password is not set; skipping");
                return;
            }
            create("Platform Owner", "owner@taxfiler.in", User.Role.SUPER_ADMIN);
            create("Operations Admin", "admin@taxfiler.in", User.Role.ADMIN);
            create("Income Tax Professional", "it.pro@taxfiler.in", User.Role.TAX_PROFESSIONAL);
            create("GST Professional", "gst.pro@taxfiler.in", User.Role.GST_PROFESSIONAL);
            create("Reviewer", "reviewer@taxfiler.in", User.Role.REVIEWER);
            create("Data Entry Operator", "operator@taxfiler.in", User.Role.DATA_ENTRY_OPERATOR);
            create("Customer Support", "support@taxfiler.in", User.Role.CUSTOMER_SUPPORT);
        };
    }

    private void create(String name, String email, User.Role role) {
        if (userRepository.existsByEmail(email)) {
            return;
        }
        // MFA is left disabled so the staff member enrols their own authenticator at first sign in.
        userRepository.save(User.builder()
                .name(name)
                .email(email)
                .password(passwordEncoder.encode(seedPassword))
                .role(role)
                .onboardingComplete(true)
                .mfaSecret(TotpUtil.generateSecret())
                .build());
        log.info("Seeded {} account {}", role, email);
    }
}
