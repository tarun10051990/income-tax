package com.incometax.cms.service;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.incometax.cms.dto.CmsDtos.*;
import com.incometax.cms.entity.CmsEntry;
import com.incometax.cms.repository.CmsEntryRepository;
import com.incometax.entity.User;
import com.incometax.exception.ApiException;
import com.incometax.service.AuditService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.*;
import java.util.regex.Pattern;

/** Admin CMS for the public marketing site. Content is stored as JSON documents grouped by collection. */
@Service
@RequiredArgsConstructor
@Transactional
public class CmsService {

    /** Collections the marketing frontend knows how to render. */
    public static final Set<String> COLLECTIONS = new LinkedHashSet<>(List.of(
            "site", "nav", "footer", "services", "pricing", "testimonials", "client_logos", "how_it_works",
            "why_choose_us", "audiences", "faqs", "team", "values", "resource_categories", "resources",
            "videos", "legal"));

    private static final Pattern COLLECTION_PATTERN = Pattern.compile("[a-z][a-z0-9_]{1,63}");

    private final CmsEntryRepository repository;
    private final AuditService auditService;
    private final ObjectMapper objectMapper;

    @Transactional(readOnly = true)
    public Map<String, List<JsonNode>> publishedContent() {
        Map<String, List<JsonNode>> out = new LinkedHashMap<>();
        for (CmsEntry entry : repository.findByStatusOrderByCollectionAscSortOrderAscCreatedAtAsc(CmsEntry.Status.PUBLISHED)) {
            out.computeIfAbsent(entry.getCollection(), k -> new ArrayList<>()).add(parse(entry.getData()));
        }
        return out;
    }

    @Transactional(readOnly = true)
    public List<JsonNode> publishedCollection(String collection) {
        return repository.findByCollectionOrderBySortOrderAscCreatedAtAsc(validCollection(collection)).stream()
                .filter(e -> e.getStatus() == CmsEntry.Status.PUBLISHED)
                .map(e -> parse(e.getData()))
                .toList();
    }

    @Transactional(readOnly = true)
    public List<CollectionSummary> summary() {
        Map<String, long[]> counts = new LinkedHashMap<>();
        COLLECTIONS.forEach(c -> counts.put(c, new long[2]));
        for (Object[] row : repository.countByCollectionAndStatus()) {
            long[] c = counts.computeIfAbsent((String) row[0], k -> new long[2]);
            if (row[1] == CmsEntry.Status.PUBLISHED) c[0] = (Long) row[2]; else c[1] = (Long) row[2];
        }
        return counts.entrySet().stream()
                .map(e -> new CollectionSummary(e.getKey(), e.getValue()[0], e.getValue()[1]))
                .toList();
    }

    @Transactional(readOnly = true)
    public List<EntryView> list(String collection) {
        return repository.findByCollectionOrderBySortOrderAscCreatedAtAsc(validCollection(collection)).stream()
                .map(this::view).toList();
    }

    @Transactional(readOnly = true)
    public EntryView get(String collection, String slug) {
        return view(find(collection, slug));
    }

    public EntryView create(User actor, String collection, EntryRequest request) {
        collection = validCollection(collection);
        if (repository.findByCollectionAndSlug(collection, request.slug()).isPresent()) {
            throw ApiException.conflict("CMS_SLUG_EXISTS", "An entry with slug '" + request.slug() + "' already exists");
        }
        int order = request.sortOrder() != null ? request.sortOrder()
                : repository.findByCollectionOrderBySortOrderAscCreatedAtAsc(collection).size();
        boolean publish = Boolean.TRUE.equals(request.publish());
        CmsEntry entry = repository.save(CmsEntry.builder()
                .collection(collection)
                .slug(request.slug())
                .title(titleOf(request))
                .sortOrder(order)
                .data(serialize(request.data()))
                .status(publish ? CmsEntry.Status.PUBLISHED : CmsEntry.Status.DRAFT)
                .publishedAt(publish ? Instant.now() : null)
                .updatedBy(actor.getEmail())
                .build());
        auditService.record("CMS_ENTRY_CREATED", "CmsEntry", entry.getId(), null, entry.getCollection() + "/" + entry.getSlug());
        return view(entry);
    }

    public EntryView update(User actor, String collection, String slug, EntryRequest request) {
        CmsEntry entry = find(collection, slug);
        String before = entry.getData();
        if (!entry.getSlug().equals(request.slug())
                && repository.findByCollectionAndSlug(entry.getCollection(), request.slug()).isPresent()) {
            throw ApiException.conflict("CMS_SLUG_EXISTS", "An entry with slug '" + request.slug() + "' already exists");
        }
        entry.setSlug(request.slug());
        entry.setTitle(titleOf(request));
        if (request.sortOrder() != null) entry.setSortOrder(request.sortOrder());
        entry.setData(serialize(request.data()));
        entry.setVersion(entry.getVersion() + 1);
        entry.setUpdatedBy(actor.getEmail());
        if (request.publish() != null) setStatus(entry, request.publish());
        auditService.record("CMS_ENTRY_UPDATED", "CmsEntry", entry.getId(), before, entry.getData());
        return view(repository.save(entry));
    }

    public EntryView publish(User actor, String collection, String slug, boolean publish) {
        CmsEntry entry = find(collection, slug);
        CmsEntry.Status before = entry.getStatus();
        setStatus(entry, publish);
        entry.setUpdatedBy(actor.getEmail());
        auditService.record(publish ? "CMS_ENTRY_PUBLISHED" : "CMS_ENTRY_UNPUBLISHED", "CmsEntry", entry.getId(),
                before.name(), entry.getStatus().name());
        return view(repository.save(entry));
    }

    public void delete(User actor, String collection, String slug) {
        CmsEntry entry = find(collection, slug);
        repository.delete(entry);
        auditService.record("CMS_ENTRY_DELETED", "CmsEntry", entry.getId(), entry.getCollection() + "/" + entry.getSlug(), null);
    }

    public List<EntryView> reorder(User actor, String collection, ReorderRequest request) {
        collection = validCollection(collection);
        List<CmsEntry> entries = repository.findByCollectionOrderBySortOrderAscCreatedAtAsc(collection);
        Map<String, CmsEntry> bySlug = new HashMap<>();
        entries.forEach(e -> bySlug.put(e.getSlug(), e));
        int i = 0;
        for (String slug : request.slugs()) {
            CmsEntry e = bySlug.remove(slug);
            if (e == null) throw ApiException.badRequest("CMS_UNKNOWN_SLUG", "Unknown slug " + slug);
            e.setSortOrder(i++);
        }
        for (CmsEntry e : bySlug.values()) e.setSortOrder(i++);
        repository.saveAll(entries);
        auditService.record("CMS_COLLECTION_REORDERED", "CmsCollection", collection, null, String.join(",", request.slugs()));
        return list(collection);
    }

    public ImportResult importDefaults(User actor, ImportRequest request) {
        int created = 0, skipped = 0;
        boolean publish = !Boolean.FALSE.equals(request.publish());
        for (Map.Entry<String, List<EntryRequest>> e : request.collections().entrySet()) {
            String collection = validCollection(e.getKey());
            int order = 0;
            for (EntryRequest item : e.getValue()) {
                if (repository.findByCollectionAndSlug(collection, item.slug()).isPresent()) {
                    skipped++;
                    order++;
                    continue;
                }
                repository.save(CmsEntry.builder()
                        .collection(collection)
                        .slug(item.slug())
                        .title(titleOf(item))
                        .sortOrder(item.sortOrder() != null ? item.sortOrder() : order)
                        .data(serialize(item.data()))
                        .status(publish ? CmsEntry.Status.PUBLISHED : CmsEntry.Status.DRAFT)
                        .publishedAt(publish ? Instant.now() : null)
                        .updatedBy(actor.getEmail())
                        .build());
                created++;
                order++;
            }
        }
        auditService.record("CMS_IMPORTED", "CmsCollection", "*", null, created + " created, " + skipped + " skipped");
        return new ImportResult(created, skipped);
    }

    /* ---------- helpers ---------- */

    private void setStatus(CmsEntry entry, boolean publish) {
        entry.setStatus(publish ? CmsEntry.Status.PUBLISHED : CmsEntry.Status.DRAFT);
        if (publish) entry.setPublishedAt(Instant.now());
    }

    private CmsEntry find(String collection, String slug) {
        return repository.findByCollectionAndSlug(validCollection(collection), slug)
                .orElseThrow(() -> ApiException.notFound("CMS entry", collection + "/" + slug));
    }

    private static String validCollection(String collection) {
        if (collection == null || !COLLECTION_PATTERN.matcher(collection).matches()) {
            throw ApiException.badRequest("CMS_INVALID_COLLECTION", "Invalid collection name");
        }
        return collection;
    }

    private static String titleOf(EntryRequest request) {
        if (request.title() != null && !request.title().isBlank()) return request.title();
        JsonNode d = request.data();
        for (String key : List.of("title", "name", "label", "question", "heading")) {
            if (d.hasNonNull(key) && d.get(key).isTextual()) return d.get(key).asText();
        }
        return request.slug();
    }

    private EntryView view(CmsEntry e) {
        return new EntryView(e.getId(), e.getCollection(), e.getSlug(), e.getTitle(), e.getStatus(), e.getSortOrder(),
                parse(e.getData()), e.getVersion(), e.getUpdatedBy(), e.getUpdatedAt(), e.getPublishedAt());
    }

    private JsonNode parse(String json) {
        try {
            return objectMapper.readTree(json);
        } catch (JsonProcessingException ex) {
            throw ApiException.badRequest("CMS_INVALID_JSON", "Stored content is not valid JSON");
        }
    }

    private String serialize(JsonNode node) {
        if (node == null || node.isNull()) throw ApiException.badRequest("CMS_INVALID_JSON", "Content body is required");
        if (node.toString().length() > 200_000) throw ApiException.badRequest("CMS_TOO_LARGE", "Content body exceeds 200 KB");
        return node.toString();
    }
}
