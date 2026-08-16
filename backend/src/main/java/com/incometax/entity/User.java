package com.incometax.entity;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import java.time.LocalDateTime;

@Entity
@Table(name = "users")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class User {
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private String id;

    @Column(nullable = false)
    private String name;

    @Column(unique = true)
    private String email;

    private String phone;

    @Column(unique = true)
    private String pan;

    private String aadhaar;

    @Column(nullable = false)
    private String password;

    @Enumerated(EnumType.STRING)
    @Builder.Default
    private Role role = Role.USER;

    @Builder.Default
    private boolean onboardingComplete = false;

    @Builder.Default
    private boolean active = true;

    /** Base32 TOTP secret; mandatory for every administrative role. */
    private String mfaSecret;

    @Builder.Default
    private boolean mfaEnabled = false;

    private LocalDateTime lastLoginAt;

    @Builder.Default
    private LocalDateTime createdAt = LocalDateTime.now();

    private LocalDateTime updatedAt;

    public boolean isCustomer() {
        return role == Role.USER;
    }

    public boolean isStaff() {
        return !isCustomer();
    }

    public enum Role {
        /** Taxpayer; sees only their own data. */
        USER,
        ADMIN,
        SUPER_ADMIN,
        TAX_PROFESSIONAL,
        GST_PROFESSIONAL,
        REVIEWER,
        DATA_ENTRY_OPERATOR,
        CUSTOMER_SUPPORT
    }
}
