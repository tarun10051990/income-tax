package com.incometax.gstrates.config;

import com.fasterxml.jackson.databind.DeserializationFeature;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ObjectNode;
import com.incometax.gstrates.entity.GstRateCategory;
import com.incometax.gstrates.entity.GstRule;
import com.incometax.gstrates.repository.GstRateCategoryRepository;
import com.incometax.gstrates.repository.GstRuleRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.ApplicationRunner;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.core.io.ClassPathResource;

import java.io.InputStream;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

/**
 * Loads the shipped GST rates and rules (seed/gst-rates.json). A row is only added when no row with the same code
 * and start date exists, so rates the admin has edited are never overwritten. An item whose rate changed on the
 * GST 2.0 date ({@code rateChangeDate}) gets two rows: the old rate up to the day before, and the new rate after.
 */
@Configuration
@RequiredArgsConstructor
@Slf4j
public class GstRateSeeder {

    private final GstRateCategoryRepository categoryRepository;
    private final GstRuleRepository ruleRepository;
    private final ObjectMapper objectMapper;

    @Bean
    ApplicationRunner seedGstRates() {
        return args -> seed();
    }

    void seed() throws Exception {
        ObjectMapper mapper = objectMapper.copy().configure(DeserializationFeature.FAIL_ON_UNKNOWN_PROPERTIES, false);
        JsonNode root;
        try (InputStream in = new ClassPathResource("seed/gst-rates.json").getInputStream()) {
            root = mapper.readTree(in);
        }
        LocalDate changeDate = LocalDate.parse(root.path("rateChangeDate").asText());
        int added = 0;
        for (JsonNode node : root.path("categories")) {
            for (GstRateCategory row : categoryRows(mapper, (ObjectNode) node, changeDate)) {
                if (categoryRepository.findByCodeAndEffectiveFrom(row.getCode(), row.getEffectiveFrom()).isEmpty()) {
                    categoryRepository.save(stamp(row));
                    added++;
                }
            }
        }
        for (JsonNode node : root.path("rules")) {
            GstRule rule = mapper.treeToValue(node, GstRule.class);
            rule.setActive(true);
            rule.setUpdatedBy("system");
            rule.setUpdatedAt(LocalDateTime.now());
            if (ruleRepository.findByCodeAndEffectiveFrom(rule.getCode(), rule.getEffectiveFrom()).isEmpty()) {
                ruleRepository.save(rule);
                added++;
            }
        }
        if (added > 0) {
            log.info("Seeded {} GST rate / rule rows", added);
        }
    }

    static List<GstRateCategory> categoryRows(ObjectMapper mapper, ObjectNode node, LocalDate changeDate)
            throws Exception {
        List<GstRateCategory> rows = new ArrayList<>();
        JsonNode before = node.remove("before");
        GstRateCategory current = mapper.treeToValue(node, GstRateCategory.class);
        if (before != null && !before.isNull()) {
            ObjectNode old = node.deepCopy();
            old.setAll((ObjectNode) before);
            if (!before.has("cessRate")) {
                old.putNull("cessRate");
            }
            GstRateCategory previous = mapper.treeToValue(old, GstRateCategory.class);
            previous.setEffectiveTo(changeDate.minusDays(1));
            previous.setHint(null);
            rows.add(previous);
            current.setEffectiveFrom(changeDate);
        }
        rows.add(current);
        return rows;
    }

    private static GstRateCategory stamp(GstRateCategory row) {
        row.setActive(true);
        row.setUpdatedBy("system");
        row.setUpdatedAt(LocalDateTime.now());
        return row;
    }
}
