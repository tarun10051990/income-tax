package com.incometax.dto;

import com.incometax.entity.GstInvoice;
import com.incometax.entity.ReturnType;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.PositiveOrZero;
import lombok.Data;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;

public final class GstRequests {

    /** 15 characters: 2 state digits, 10 character PAN, entity digit, Z, checksum. */
    public static final String GSTIN_PATTERN = "^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z][0-9A-Z]Z[0-9A-Z]$";

    private GstRequests() {
    }

    @Data
    public static class UpsertProfile {
        @NotNull
        @Pattern(regexp = GSTIN_PATTERN, message = "GSTIN format is invalid")
        private String gstin;
        @NotNull
        private String legalName;
        private String tradeName;
        private String businessType;
        private String businessActivity;
        private String registeredAddress;
        private String state;
        private String authorizedSignatory;
        private String signatoryDesignation;
        private String bankAccountNumber;
        private String bankIfsc;
        private LocalDate registrationDate;
        private Boolean compositionScheme;
    }

    @Data
    public static class CreateFiling {
        @NotNull
        private String gstProfileId;
        @NotNull
        private ReturnType returnType;
        @NotNull
        @Pattern(regexp = "^[0-9]{4}-[0-9]{2}$", message = "Period must be formatted as YYYY-MM")
        private String period;
        private String financialYear;
    }

    @Data
    public static class InvoiceInput {
        @NotNull
        private GstInvoice.DocumentType documentType;
        private GstInvoice.Source source;
        private GstInvoice.SupplyType supplyType;
        @NotNull
        private String invoiceNumber;
        @NotNull
        private LocalDate invoiceDate;
        @Pattern(regexp = GSTIN_PATTERN, message = "Counterparty GSTIN format is invalid")
        private String counterpartyGstin;
        private String counterpartyName;
        private String placeOfSupply;
        private String hsnSacCode;
        @NotNull
        @PositiveOrZero
        private BigDecimal taxableValue;
        @PositiveOrZero
        private BigDecimal cgst;
        @PositiveOrZero
        private BigDecimal sgst;
        @PositiveOrZero
        private BigDecimal igst;
        @PositiveOrZero
        private BigDecimal cess;
        private Boolean reverseCharge;
        private Boolean itcEligible;
    }

    @Data
    public static class ImportRequest {
        @NotEmpty
        @Valid
        private List<InvoiceInput> invoices;
    }
}
