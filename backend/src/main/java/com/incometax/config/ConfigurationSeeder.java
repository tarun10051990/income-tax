package com.incometax.config;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.incometax.entity.NotificationTemplate;
import com.incometax.entity.TaxRule;
import com.incometax.entity.TaxType;
import com.incometax.repository.NotificationTemplateRepository;
import com.incometax.repository.TaxRuleRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.ApplicationRunner;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.core.io.ClassPathResource;

import java.io.InputStream;
import java.time.LocalDate;

/**
 * Loads the shipped tax rule and notification template configuration. Existing rules are never
 * overwritten: administrators own the configuration once it is in the database, and a regulation
 * change is applied as a new effective-dated version through the admin console.
 */
@Configuration
@RequiredArgsConstructor
@Slf4j
public class ConfigurationSeeder {

    private final TaxRuleRepository taxRuleRepository;
    private final NotificationTemplateRepository notificationTemplateRepository;
    private final ObjectMapper objectMapper;

    @Bean
    ApplicationRunner seedConfiguration() {
        return args -> {
            seedTaxRules();
            seedTemplates();
        };
    }

    private void seedTaxRules() {
        for (JsonNode node : read("seed/tax-rules.json")) {
            String ruleKey = node.path("ruleKey").asText();
            if (!taxRuleRepository.findEffective(ruleKey, LocalDate.now()).isEmpty()) {
                continue;
            }
            taxRuleRepository.save(TaxRule.builder()
                    .ruleKey(ruleKey)
                    .taxType(TaxType.valueOf(node.path("taxType").asText()))
                    .category(TaxRule.Category.valueOf(node.path("category").asText()))
                    .description(node.path("description").asText(null))
                    .effectiveFrom(LocalDate.parse(node.path("effectiveFrom").asText()))
                    .effectiveTo(node.hasNonNull("effectiveTo")
                            ? LocalDate.parse(node.path("effectiveTo").asText()) : null)
                    .configuration(node.path("configuration").toString())
                    .createdBy("system")
                    .build());
            log.info("Seeded tax rule {}", ruleKey);
        }
    }

    private void seedTemplates() {
        for (JsonNode node : read("seed/notification-templates.json")) {
            String eventKey = node.path("eventKey").asText();
            if (notificationTemplateRepository.findByEventKey(eventKey).isPresent()) {
                continue;
            }
            notificationTemplateRepository.save(NotificationTemplate.builder()
                    .eventKey(eventKey)
                    .subject(node.path("subject").asText())
                    .body(node.path("body").asText())
                    .inApp(node.path("inApp").asBoolean(true))
                    .email(node.path("email").asBoolean(false))
                    .sms(node.path("sms").asBoolean(false))
                    .build());
        }
    }

    private JsonNode read(String location) {
        try (InputStream stream = new ClassPathResource(location).getInputStream()) {
            return objectMapper.readTree(stream);
        } catch (Exception ex) {
            throw new IllegalStateException("Could not read seed configuration " + location, ex);
        }
    }
}
