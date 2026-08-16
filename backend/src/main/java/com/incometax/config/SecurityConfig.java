package com.incometax.config;

import com.incometax.security.JwtAuthFilter;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.config.annotation.authentication.configuration.AuthenticationConfiguration;
import org.springframework.security.config.annotation.method.configuration.EnableMethodSecurity;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.http.SessionCreationPolicy;
import com.incometax.security.RestAuthenticationEntryPoint;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.CorsConfigurationSource;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;

import java.util.List;

@Configuration
@EnableWebSecurity
@EnableMethodSecurity
@RequiredArgsConstructor
public class SecurityConfig {

    /** Every staff role; fine grained rights are enforced per operation by RbacService. */
    private static final String[] STAFF_ROLES = {
            "SUPER_ADMIN", "ADMIN", "TAX_PROFESSIONAL", "GST_PROFESSIONAL", "REVIEWER",
            "DATA_ENTRY_OPERATOR", "CUSTOMER_SUPPORT"
    };

    private final JwtAuthFilter jwtAuthFilter;
    private final RestAuthenticationEntryPoint authenticationEntryPoint;

    @Value("${cors.allowed-origins}")
    private String allowedOrigins;

    @Value("${spring.h2.console.enabled:false}")
    private boolean h2ConsoleEnabled;

    @Bean
    public SecurityFilterChain filterChain(HttpSecurity http) throws Exception {
        http
            // Stateless bearer-token API: CSRF tokens do not apply and no session cookie is issued.
            .csrf(csrf -> csrf.disable())
            .cors(cors -> cors.configurationSource(corsConfigurationSource()))
            .sessionManagement(session -> session.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
            .authorizeHttpRequests(auth -> {
                auth.requestMatchers("/api/auth/login", "/api/auth/register", "/api/auth/admin/login",
                                "/api/public/**", "/v3/api-docs/**", "/swagger-ui/**", "/swagger-ui.html",
                                "/actuator/health")
                        .permitAll();
                if (h2ConsoleEnabled) {
                    auth.requestMatchers("/h2-console/**").permitAll();
                }
                auth.requestMatchers("/api/auth/admin/mfa/enrol").hasAnyRole(
                        concat(STAFF_ROLES, "MFA_PENDING"));
                auth.requestMatchers("/api/admin/**").hasAnyRole(STAFF_ROLES);
                auth.anyRequest().authenticated();
            })
            .headers(headers -> headers
                    .frameOptions(frame -> frame.sameOrigin())
                    .contentTypeOptions(options -> {
                    })
                    .httpStrictTransportSecurity(hsts -> hsts.includeSubDomains(true).maxAgeInSeconds(31536000)))
            .exceptionHandling(handling -> handling.authenticationEntryPoint(authenticationEntryPoint))
            .addFilterBefore(jwtAuthFilter, UsernamePasswordAuthenticationFilter.class);

        return http.build();
    }

    private String[] concat(String[] roles, String extra) {
        String[] combined = java.util.Arrays.copyOf(roles, roles.length + 1);
        combined[roles.length] = extra;
        return combined;
    }

    @Bean
    public CorsConfigurationSource corsConfigurationSource() {
        CorsConfiguration configuration = new CorsConfiguration();
        configuration.setAllowedOrigins(List.of(allowedOrigins.split(",")));
        configuration.setAllowedMethods(List.of("GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"));
        configuration.setAllowedHeaders(List.of("*"));
        configuration.setAllowCredentials(true);
        UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
        source.registerCorsConfiguration("/**", configuration);
        return source;
    }

    @Bean
    public AuthenticationManager authenticationManager(AuthenticationConfiguration config) throws Exception {
        return config.getAuthenticationManager();
    }
}
