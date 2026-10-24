package com.incometax.config;

import com.incometax.entity.User;
import com.incometax.security.CurrentUser;
import com.incometax.service.AuditService;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.servlet.HandlerInterceptor;
import org.springframework.web.servlet.config.annotation.InterceptorRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

import java.util.LinkedHashMap;
import java.util.Map;
import java.util.Set;

/**
 * Audit trail for every user: each successful save, edit or delete (POST / PUT / PATCH / DELETE) made by a
 * signed-in user is written to audit_logs, on top of the detailed business events services record themselves.
 * Request bodies are not stored, so passwords and documents never reach the log.
 */
@Configuration
@RequiredArgsConstructor
@Slf4j
public class AuditWebConfig implements WebMvcConfigurer {

    private static final Set<String> WRITE_METHODS = Set.of("POST", "PUT", "PATCH", "DELETE");
    private static final int MAX_PATH = 250;

    private final CurrentUser currentUser;
    private final AuditService auditService;

    @Override
    public void addInterceptors(InterceptorRegistry registry) {
        registry.addInterceptor(new HandlerInterceptor() {
            @Override
            public void afterCompletion(HttpServletRequest request, HttpServletResponse response, Object handler,
                                        Exception ex) {
                recordWrite(request, response, ex);
            }
        }).addPathPatterns("/api/**").excludePathPatterns("/api/auth/**", "/api/public/**");
    }

    void recordWrite(HttpServletRequest request, HttpServletResponse response, Exception ex) {
        if (!WRITE_METHODS.contains(request.getMethod()) || ex != null || response.getStatus() >= 400) {
            return;
        }
        try {
            User user = currentUser.find().orElse(null);
            if (user == null) {
                return;
            }
            String path = request.getRequestURI();
            Map<String, Object> details = new LinkedHashMap<>();
            details.put("method", request.getMethod());
            details.put("path", path);
            details.put("status", response.getStatus());
            auditService.record("USER_" + actionVerb(request.getMethod()), "ApiRequest",
                    path.length() > MAX_PATH ? path.substring(0, MAX_PATH) : path, null, details);
        } catch (RuntimeException e) {
            log.warn("Could not write request audit entry: {}", e.getMessage());
        }
    }

    private static String actionVerb(String method) {
        return switch (method) {
            case "POST" -> "SAVE";
            case "DELETE" -> "DELETE";
            default -> "EDIT";
        };
    }
}
