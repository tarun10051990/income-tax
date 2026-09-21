package com.incometax.security;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.incometax.common.ApiResponse;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.annotation.Order;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.lang.NonNull;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.time.Duration;
import java.time.Instant;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.atomic.AtomicInteger;

/** Fixed-window limiter keyed by authenticated principal, falling back to the client address. */
@Component
@Order(2)
@RequiredArgsConstructor
public class RateLimitFilter extends OncePerRequestFilter {

    private final ObjectMapper objectMapper;
    private final Map<String, Window> windows = new ConcurrentHashMap<>();

    @Value("${rate-limit.requests-per-minute:300}")
    private int requestsPerMinute;

    @Value("${rate-limit.enabled:true}")
    private boolean enabled;

    @Override
    protected void doFilterInternal(@NonNull HttpServletRequest request,
                                    @NonNull HttpServletResponse response,
                                    @NonNull FilterChain filterChain) throws ServletException, IOException {
        if (!enabled) {
            filterChain.doFilter(request, response);
            return;
        }

        String key = key(request);
        Window window = windows.compute(key, (ignored, existing) ->
                existing == null || existing.isExpired() ? new Window() : existing);

        if (window.count.incrementAndGet() > requestsPerMinute) {
            response.setStatus(HttpStatus.TOO_MANY_REQUESTS.value());
            response.setContentType(MediaType.APPLICATION_JSON_VALUE);
            response.getWriter().write(objectMapper.writeValueAsString(
                    ApiResponse.error("RATE_LIMIT_EXCEEDED", "Too many requests. Please retry shortly.", null)));
            return;
        }

        filterChain.doFilter(request, response);
    }

    private String key(HttpServletRequest request) {
        String authorization = request.getHeader("Authorization");
        if (authorization != null && authorization.startsWith("Bearer ")) {
            return "token:" + Integer.toHexString(authorization.hashCode());
        }
        return "ip:" + request.getRemoteAddr();
    }

    private static final class Window {
        private final Instant startedAt = Instant.now();
        private final AtomicInteger count = new AtomicInteger();

        private boolean isExpired() {
            return Duration.between(startedAt, Instant.now()).toSeconds() >= 60;
        }
    }
}
