package com.incometax.dto;

import com.fasterxml.jackson.annotation.JsonInclude;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;

import java.util.List;

@Data
@Builder
@AllArgsConstructor
@JsonInclude(JsonInclude.Include.NON_NULL)
public class AuthResponse {
    private String token;
    private String id;
    private String name;
    private String email;
    private String role;
    private Boolean mfaEnabled;
    /** Set when an administrator must complete MFA enrolment before continuing. */
    private Boolean mfaEnrolmentRequired;
    private String mfaSecret;
    private List<String> permissions;
    private Long expiresInMs;
}
