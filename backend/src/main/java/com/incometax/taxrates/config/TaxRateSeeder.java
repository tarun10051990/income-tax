package com.incometax.taxrates.config;

import com.fasterxml.jackson.databind.DeserializationFeature;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.incometax.taxrates.entity.TaxCategoryRate;
import com.incometax.taxrates.entity.TaxRegimeSetting;
import com.incometax.taxrates.entity.TaxSlab;
import com.incometax.taxrates.repository.TaxCategoryRateRepository;
import com.incometax.taxrates.repository.TaxRegimeSettingRepository;
import com.incometax.taxrates.repository.TaxSlabRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.ApplicationRunner;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.core.io.ClassPathResource;

import java.io.InputStream;
import java.time.LocalDateTime;

/**
 * Loads the shipped income-tax rates (slabs, regime settings and every income / deduction category) for each
 * financial year that has no rates in the database yet. Rows already in the database are owned by the admin
 * and are never overwritten.
 */
@Configuration
@RequiredArgsConstructor
@Slf4j
public class TaxRateSeeder {

    private final TaxRegimeSettingRepository settingRepository;
    private final TaxSlabRepository slabRepository;
    private final TaxCategoryRateRepository categoryRepository;
    private final ObjectMapper objectMapper;

    @Bean
    ApplicationRunner seedTaxRates() {
        return args -> seed();
    }

    void seed() throws Exception {
        ObjectMapper mapper = objectMapper.copy().configure(DeserializationFeature.FAIL_ON_UNKNOWN_PROPERTIES, false);
        JsonNode root;
        try (InputStream in = new ClassPathResource("seed/tax-rates.json").getInputStream()) {
            root = mapper.readTree(in);
        }
        for (JsonNode year : root.path("years")) {
            String fy = year.path("financialYear").asText();
            String ay = year.path("assessmentYear").asText();
            if (categoryRepository.countByFinancialYear(fy) > 0) {
                continue;
            }
            for (JsonNode node : year.path("regimes")) {
                TaxRegimeSetting setting = mapper.treeToValue(node, TaxRegimeSetting.class);
                setting.setFinancialYear(fy);
                setting.setAssessmentYear(ay);
                setting.setActive(true);
                setting.setUpdatedBy("system");
                setting.setUpdatedAt(LocalDateTime.now());
                settingRepository.save(setting);
            }
            for (JsonNode node : year.path("slabs")) {
                TaxSlab slab = mapper.treeToValue(node, TaxSlab.class);
                slab.setFinancialYear(fy);
                slabRepository.save(slab);
            }
            for (JsonNode node : year.path("categories")) {
                TaxCategoryRate category = mapper.treeToValue(node, TaxCategoryRate.class);
                category.setFinancialYear(fy);
                if (category.getAllowedRegimes() == null) {
                    category.setAllowedRegimes("OLD,NEW");
                }
                category.setActive(true);
                category.setUpdatedBy("system");
                category.setUpdatedAt(LocalDateTime.now());
                categoryRepository.save(category);
            }
            log.info("Seeded income-tax rates for FY {}", fy);
        }
    }
}
