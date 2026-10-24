package com.incometax.cms.dto;

import com.fasterxml.jackson.databind.JsonNode;
import com.incometax.cms.entity.CmsEntry;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

import java.time.Instant;
import java.util.List;
import java.util.Map;

public final class CmsDtos {
    private CmsDtos() {}

    public record EntryRequest(
            @NotBlank @Size(max = 160) @Pattern(regexp = "[a-z0-9][a-z0-9-_.]*") String slug,
            @Size(max = 200) String title,
            Integer sortOrder,
            @NotNull JsonNode data,
            Boolean publish) {}

    public record ReorderRequest(@NotNull List<String> slugs) {}

    /** Bulk import of the frontend's bundled defaults; existing (collection, slug) pairs are left untouched. */
    public record ImportRequest(@NotNull Map<String, List<EntryRequest>> collections, Boolean publish) {}

    public record EntryView(String id, String collection, String slug, String title, CmsEntry.Status status,
                            int sortOrder, JsonNode data, int version, String updatedBy, Instant updatedAt,
                            Instant publishedAt) {}

    public record CollectionSummary(String collection, long published, long drafts) {}

    public record ImportResult(int created, int skipped) {}
}
