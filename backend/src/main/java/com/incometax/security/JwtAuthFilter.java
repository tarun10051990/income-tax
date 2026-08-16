package com.incometax.security;

import com.incometax.service.UserService;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.lang.NonNull;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.util.List;

@RequiredArgsConstructor
public class JwtAuthFilter extends OncePerRequestFilter {

    private final JwtUtil jwtUtil;
    private final UserService userService;

    @Override
    protected void doFilterInternal(
            @NonNull HttpServletRequest request,
            @NonNull HttpServletResponse response,
            @NonNull FilterChain filterChain
    ) throws ServletException, IOException {
        String authHeader = request.getHeader("Authorization");

        if (authHeader == null || !authHeader.startsWith("Bearer ")) {
            filterChain.doFilter(request, response);
            return;
        }

        String token = authHeader.substring(7);
        if (jwtUtil.isTokenValid(token)) {
            String email = jwtUtil.extractEmail(token);
            userService.findByEmail(email).ifPresent(user -> {
                if (!user.isActive()) {
                    return;
                }
                // A staff account that has not completed MFA enrolment may only reach the
                // enrolment endpoint, so it is granted a placeholder authority instead of its role.
                String authority = user.isStaff() && !user.isMfaEnabled()
                        ? "ROLE_MFA_PENDING"
                        : "ROLE_" + user.getRole().name();
                var auth = new UsernamePasswordAuthenticationToken(
                        user, null, List.of(new SimpleGrantedAuthority(authority))
                );
                SecurityContextHolder.getContext().setAuthentication(auth);
            });
        }

        filterChain.doFilter(request, response);
    }
}
