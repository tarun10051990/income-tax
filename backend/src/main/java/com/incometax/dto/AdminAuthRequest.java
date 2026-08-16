package com.incometax.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import lombok.Data;

@Data
public class AdminAuthRequest {
    @Email
    @NotBlank
    private String email;

    @NotBlank
    private String password;

    /** Six digit TOTP code; required once MFA is enabled on the account. */
    @Pattern(regexp = "^[0-9]{6}$", message = "The authenticator code must be six digits")
    private String totpCode;
}
