package com.incometax.entity;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDate;
import java.time.LocalDateTime;

@Entity
@Table(name = "taxpayer_profiles")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class TaxpayerProfile {
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private String id;

    @OneToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "user_id", unique = true)
    private User user;

    private String pan;

    /** Last four digits only; full Aadhaar is never stored. */
    private String aadhaarLastFour;

    @Enumerated(EnumType.STRING)
    @Builder.Default
    private TaxpayerType taxpayerType = TaxpayerType.INDIVIDUAL;

    private LocalDate dateOfBirth;

    private String addressLine1;
    private String addressLine2;
    private String city;
    private String state;
    private String pincode;

    private String bankAccountNumber;
    private String bankIfsc;
    private String bankName;

    @Builder.Default
    private boolean metroCity = false;

    @Version
    private Long version;

    @Builder.Default
    private LocalDateTime createdAt = LocalDateTime.now();

    private LocalDateTime updatedAt;
}
