package com.incometax.api;

import com.incometax.cms.entity.CmsEntry;
import com.incometax.cms.repository.CmsEntryRepository;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.web.servlet.MockMvc;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest(properties = {
        "spring.datasource.url=jdbc:h2:mem:cmsseed;DB_CLOSE_DELAY=-1",
        "rate-limit.enabled=false",
        "documents.storage-dir=./target/test-documents"
})
@AutoConfigureMockMvc
class CmsContentSeederIntegrationTest {

    @Autowired
    private MockMvc mockMvc;
    @Autowired
    private CmsEntryRepository repository;

    @Test
    void bundledContentIsStoredInTheDatabaseAndServedPublicly() throws Exception {
        assertThat(repository.count()).isGreaterThan(100);
        assertThat(repository.findByCollectionAndSlug("site", "site")).isPresent()
                .get().extracting(CmsEntry::getStatus).isEqualTo(CmsEntry.Status.PUBLISHED);

        mockMvc.perform(get("/api/public/cms"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.site[0].name").isString())
                .andExpect(jsonPath("$.data.field_guides.length()").value(42))
                .andExpect(jsonPath("$.data.portal_text.length()").value(52))
                .andExpect(jsonPath("$.data.legal.length()").value(4));
    }
}
