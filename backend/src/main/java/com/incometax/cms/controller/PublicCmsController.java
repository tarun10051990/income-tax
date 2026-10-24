package com.incometax.cms.controller;

import com.fasterxml.jackson.databind.JsonNode;
import com.incometax.cms.service.CmsService;
import com.incometax.common.ApiResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.Map;

/** Published marketing-site content, consumed by the Next.js frontend at render time. */
@RestController
@RequestMapping("/api/public/cms")
@RequiredArgsConstructor
public class PublicCmsController {

    private final CmsService cmsService;

    @GetMapping
    public ApiResponse<Map<String, List<JsonNode>>> all() {
        return ApiResponse.ok(cmsService.publishedContent());
    }

    @GetMapping("/{collection}")
    public ApiResponse<List<JsonNode>> collection(@PathVariable String collection) {
        return ApiResponse.ok(cmsService.publishedCollection(collection));
    }
}
