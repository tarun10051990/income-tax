package com.incometax.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import lombok.Data;

@Data
public class MfaEnrolmentRequest {
    @NotBlank
    @Pattern(regexp = "^[0-9]{6}$", message = "The authenticator code must be six digits")
    private String totpCode;
}
