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

    public String getId() {
        return id;
    }

    public void setId(String id) {
        this.id = id;
    }

    public String getName() {
        return name;
    }

    public void setName(String name) {
        this.name = name;
    }

    public String getEmail() {
        return email;
    }

    public void setEmail(String email) {
        this.email = email;
    }

    public String getPhone() {
        return phone;
    }

    public void setPhone(String phone) {
        this.phone = phone;
    }

    public String getPan() {
        return pan;
    }

    public void setPan(String pan) {
        this.pan = pan;
    }

    public String getAadhaar() {
        return aadhaar;
    }

    public void setAadhaar(String aadhaar) {
        this.aadhaar = aadhaar;
    }

    public String getPassword() {
        return password;
    }

    public void setPassword(String password) {
        this.password = password;
    }

    public Role getRole() {
        return role;
    }

    public void setRole(Role role) {
        this.role = role;
    }

    public boolean isOnboardingComplete() {
        return onboardingComplete;
    }

    public void setOnboardingComplete(boolean onboardingComplete) {
        this.onboardingComplete = onboardingComplete;
    }

    public LocalDateTime getCreatedAt() {
        return createdAt;
    }

    public void setCreatedAt(LocalDateTime createdAt) {
        this.createdAt = createdAt;
    }

    public LocalDateTime getUpdatedAt() {
        return updatedAt;
    }

    public void setUpdatedAt(LocalDateTime updatedAt) {
        this.updatedAt = updatedAt;
    }


}
