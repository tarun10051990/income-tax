package com.incometax.cms.config;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.incometax.cms.entity.CmsEntry;
import com.incometax.cms.repository.CmsEntryRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.ApplicationRunner;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.core.io.ClassPathResource;

import java.io.InputStream;
import java.time.Instant;
import java.util.Iterator;
import java.util.Map;

/**
 * Loads the bundled website content ({@code db/cms_seed.json}, generated from the frontend defaults by
 * {@code frontend/scripts/export-cms-seed.cjs}) into {@code cms_entries} as PUBLISHED rows. Only rows whose
 * (collection, slug) does not exist yet are inserted, so administrators' edits are never overwritten and
 * new phrases shipped in a release appear automatically. The same data is available as plain SQL in
 * {@code db/mysql/cms_seed.sql} for DBAs who prefer to load it by hand.
 */
@Configuration
@RequiredArgsConstructor
@Slf4j
public class CmsContentSeeder {

    private final CmsEntryRepository repository;
    private final ObjectMapper objectMapper;

    @Value("${app.cms.seed-content:true}")
    private boolean seedContent;

    @Bean
    ApplicationRunner seedCmsContent() {
        return args -> {
            if (!seedContent) {
                return;
            }
            ClassPathResource resource = new ClassPathResource("db/cms_seed.json");
            if (!resource.exists()) {
                log.warn("db/cms_seed.json not found; website content will fall back to bundled frontend text");
                return;
            }
            int created = 0;
            try (InputStream in = resource.getInputStream()) {
                JsonNode collections = objectMapper.readTree(in).path("collections");
                Iterator<Map.Entry<String, JsonNode>> it = collections.fields();
                while (it.hasNext()) {
                    Map.Entry<String, JsonNode> collection = it.next();
                    int order = 0;
                    for (JsonNode item : collection.getValue()) {
                        String slug = item.path("slug").asText();
                        if (repository.findByCollectionAndSlug(collection.getKey(), slug).isEmpty()) {
                            repository.save(CmsEntry.builder()
                                    .collection(collection.getKey())
                                    .slug(slug)
                                    .title(item.hasNonNull("title") ? item.get("title").asText() : null)
                                    .sortOrder(order)
                                    .data(objectMapper.writeValueAsString(item.path("data")))
                                    .status(CmsEntry.Status.PUBLISHED)
                                    .publishedAt(Instant.now())
                                    .updatedBy("seed")
                                    .build());
                            created++;
                        }
                        order++;
                    }
                }
            }
            if (created > 0) {
                log.info("Seeded {} website content entries into cms_entries", created);
            }
        };
    }
}
