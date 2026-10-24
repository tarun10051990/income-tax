package com.incometax.dto;

import com.incometax.entity.TaxpayerType;
import jakarta.validation.constraints.Pattern;
import lombok.Data;

import java.time.LocalDate;

public final class ProfileRequests {

    public static final String PAN_PATTERN = "^[A-Z]{5}[0-9]{4}[A-Z]$";

    private ProfileRequests() {
    }

    @Data
    public static class UpdateTaxpayerProfile {
        @Pattern(regexp = PAN_PATTERN, message = "Invalid PAN format")
        private String pan;
        /** Only the last four Aadhaar digits are ever accepted or stored. */
        @Pattern(regexp = "^[0-9]{4}$", message = "Provide only the last four Aadhaar digits")
        private String aadhaarLastFour;
        private TaxpayerType taxpayerType;
        private LocalDate dateOfBirth;
        private String addressLine1;
        private String addressLine2;
        private String city;
        private String state;
        @Pattern(regexp = "^[0-9]{6}$", message = "Invalid PIN code")
        private String pincode;
        private String bankAccountNumber;
        @Pattern(regexp = "^[A-Z]{4}0[A-Z0-9]{6}$", message = "Invalid IFSC code")
        private String bankIfsc;
        private String bankName;
        private Boolean metroCity;
    }
}
