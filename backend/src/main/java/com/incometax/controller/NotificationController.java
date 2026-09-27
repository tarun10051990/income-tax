package com.incometax.controller;

import com.incometax.common.ApiResponse;
import com.incometax.common.PageResponse;
import com.incometax.dto.Responses;
import com.incometax.security.CurrentUser;
import com.incometax.service.NotificationService;
import com.incometax.service.ResponseMapper;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/notifications")
@RequiredArgsConstructor
@Tag(name = "Notifications")
public class NotificationController {

    private final NotificationService notificationService;
    private final ResponseMapper responseMapper;
    private final CurrentUser currentUser;

    @GetMapping
    @Operation(summary = "In-app notifications for the signed in user")
    public ApiResponse<PageResponse<Responses.NotificationView>> inbox(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {
        return ApiResponse.ok(PageResponse.of(notificationService.inbox(currentUser.require(),
                        PageRequest.of(page, size, Sort.by(Sort.Direction.DESC, "createdAt"))),
                responseMapper::notification));
    }

    @GetMapping("/unread-count")
    @Operation(summary = "Unread in-app notification count")
    public ApiResponse<Long> unreadCount() {
        return ApiResponse.ok(notificationService.unreadCount(currentUser.require()));
    }

    @PostMapping("/{notificationId}/read")
    @Operation(summary = "Mark a notification as read")
    public ApiResponse<Responses.NotificationView> markRead(@PathVariable String notificationId) {
        return ApiResponse.ok(responseMapper.notification(
                notificationService.markRead(notificationId, currentUser.require())));
    }

    @PostMapping("/read-all")
    @Operation(summary = "Mark every notification as read")
    public ApiResponse<Integer> markAllRead() {
        return ApiResponse.ok(notificationService.markAllRead(currentUser.require()));
    }
}
