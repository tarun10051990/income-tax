package com.incometax.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.incometax.common.TraceContext;
import com.incometax.entity.AuditLog;
import com.incometax.entity.User;
import com.incometax.repository.AuditLogRepository;
import com.incometax.security.CurrentUser;
import jakarta.servlet.http.HttpServletRequest;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.web.context.request.RequestContextHolder;
import org.springframework.web.context.request.ServletRequestAttributes;

@Service
@RequiredArgsConstructor
@Slf4j
public class AuditService {

    private final AuditLogRepository auditLogRepository;
    private final CurrentUser currentUser;
    private final ObjectMapper objectMapper;

    public void record(String action, String entityType, String entityId, Object oldValue, Object newValue) {
        User actor = currentUser.find().orElse(null);
        HttpServletRequest request = currentRequest();
        AuditLog entry = AuditLog.builder()
                .actorId(actor == null ? null : actor.getId())
                .actorEmail(actor == null ? "system" : actor.getEmail())
                .actorRole(actor == null ? "SYSTEM" : actor.getRole().name())
                .action(action)
                .entityType(entityType)
                .entityId(entityId)
                .oldValue(serialize(oldValue))
                .newValue(serialize(newValue))
                .ipAddress(request == null ? null : request.getRemoteAddr())
                .userAgent(request == null ? null : request.getHeader("User-Agent"))
                .traceId(TraceContext.current())
                .build();
        auditLogRepository.save(entry);
    }

    private HttpServletRequest currentRequest() {
        var attributes = RequestContextHolder.getRequestAttributes();
        return attributes instanceof ServletRequestAttributes servletAttributes
                ? servletAttributes.getRequest()
                : null;
    }

    private String serialize(Object value) {
        if (value == null) {
            return null;
        }
        if (value instanceof String text) {
            return truncate(text);
        }
        try {
            return truncate(objectMapper.writeValueAsString(value));
        } catch (Exception ex) {
            log.warn("Could not serialise audit payload of type {}", value.getClass().getSimpleName());
            return String.valueOf(value);
        }
    }

    private String truncate(String value) {
        return value.length() <= 4000 ? value : value.substring(0, 3997) + "...";
    }
}
