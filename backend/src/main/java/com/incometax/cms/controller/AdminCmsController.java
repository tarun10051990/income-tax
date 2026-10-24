package com.incometax.cms.controller;

import com.incometax.cms.dto.CmsDtos.*;
import com.incometax.cms.service.CmsService;
import com.incometax.common.ApiResponse;
import com.incometax.entity.User;
import com.incometax.security.CurrentUser;
import com.incometax.security.Permission;
import com.incometax.security.RbacService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

import java.util.List;

/** Staff CMS: manage every collection of public-site content. */
@RestController
@RequestMapping("/api/admin/cms")
@RequiredArgsConstructor
public class AdminCmsController {

    private final CurrentUser currentUser;
    private final RbacService rbacService;
    private final CmsService cmsService;

    @GetMapping
    public ApiResponse<List<CollectionSummary>> summary() {
        rbacService.require(currentUser.require(), Permission.CMS_READ);
        return ApiResponse.ok(cmsService.summary());
    }

    @PostMapping("/import")
    public ApiResponse<ImportResult> importDefaults(@Valid @RequestBody ImportRequest request) {
        return ApiResponse.ok(cmsService.importDefaults(manager(), request));
    }

    @GetMapping("/{collection}")
    public ApiResponse<List<EntryView>> list(@PathVariable String collection) {
        rbacService.require(currentUser.require(), Permission.CMS_READ);
        return ApiResponse.ok(cmsService.list(collection));
    }

    @PostMapping("/{collection}")
    public ApiResponse<EntryView> create(@PathVariable String collection, @Valid @RequestBody EntryRequest request) {
        return ApiResponse.ok(cmsService.create(manager(), collection, request));
    }

    @PutMapping("/{collection}/reorder")
    public ApiResponse<List<EntryView>> reorder(@PathVariable String collection, @Valid @RequestBody ReorderRequest request) {
        return ApiResponse.ok(cmsService.reorder(manager(), collection, request));
    }

    @GetMapping("/{collection}/{slug}")
    public ApiResponse<EntryView> get(@PathVariable String collection, @PathVariable String slug) {
        rbacService.require(currentUser.require(), Permission.CMS_READ);
        return ApiResponse.ok(cmsService.get(collection, slug));
    }

    @PutMapping("/{collection}/{slug}")
    public ApiResponse<EntryView> update(@PathVariable String collection, @PathVariable String slug,
                                         @Valid @RequestBody EntryRequest request) {
        return ApiResponse.ok(cmsService.update(manager(), collection, slug, request));
    }

    @PostMapping("/{collection}/{slug}/publish")
    public ApiResponse<EntryView> publish(@PathVariable String collection, @PathVariable String slug) {
        return ApiResponse.ok(cmsService.publish(manager(), collection, slug, true));
    }

    @PostMapping("/{collection}/{slug}/unpublish")
    public ApiResponse<EntryView> unpublish(@PathVariable String collection, @PathVariable String slug) {
        return ApiResponse.ok(cmsService.publish(manager(), collection, slug, false));
    }

    @DeleteMapping("/{collection}/{slug}")
    public ApiResponse<Void> delete(@PathVariable String collection, @PathVariable String slug) {
        cmsService.delete(manager(), collection, slug);
        return ApiResponse.ok(null);
    }

    private User manager() {
        User user = currentUser.require();
        rbacService.require(user, Permission.CMS_MANAGE);
        return user;
    }
}
