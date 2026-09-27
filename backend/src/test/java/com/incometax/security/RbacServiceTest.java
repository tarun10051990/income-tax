package com.incometax.security;

import com.incometax.entity.TaxType;
import com.incometax.entity.User;
import com.incometax.exception.ApiException;
import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class RbacServiceTest {

    private final RbacService rbac = new RbacService();

    private User user(User.Role role) {
        return User.builder().id(role.name()).email(role.name() + "@taxfiler.in").role(role).build();
    }

    @Test
    void superAdminHoldsEveryPermission() {
        assertThat(rbac.permissionsFor(User.Role.SUPER_ADMIN)).containsExactlyInAnyOrder(Permission.values());
    }

    @Test
    void taxpayersSeeOnlyTheirOwnCases() {
        User customer = user(User.Role.USER);
        assertThat(rbac.has(customer, Permission.CASE_READ_OWN)).isTrue();
        assertThat(rbac.has(customer, Permission.CASE_READ_ALL)).isFalse();
        assertThat(rbac.has(customer, Permission.AUDIT_READ)).isFalse();
        assertThat(rbac.has(customer, Permission.USER_MANAGE)).isFalse();
    }

    @Test
    void professionalsAreScopedToTheirTaxDomain() {
        assertThat(rbac.canAccessTaxType(user(User.Role.TAX_PROFESSIONAL), TaxType.INCOME_TAX)).isTrue();
        assertThat(rbac.canAccessTaxType(user(User.Role.TAX_PROFESSIONAL), TaxType.GST)).isFalse();
        assertThat(rbac.canAccessTaxType(user(User.Role.GST_PROFESSIONAL), TaxType.GST)).isTrue();
        assertThat(rbac.canAccessTaxType(user(User.Role.GST_PROFESSIONAL), TaxType.INCOME_TAX)).isFalse();
        assertThat(rbac.canAccessTaxType(user(User.Role.ADMIN), TaxType.GST)).isTrue();
    }

    @Test
    void requireRejectsMissingPermissions() {
        assertThatThrownBy(() -> rbac.require(user(User.Role.DATA_ENTRY_OPERATOR), Permission.CASE_APPROVE))
                .isInstanceOf(ApiException.class)
                .hasMessageContaining("CASE_APPROVE");
    }

    @Test
    void configurationChangesAreReservedForTheSuperAdmin() {
        assertThat(rbac.has(user(User.Role.ADMIN), Permission.USER_MANAGE)).isTrue();
        assertThat(rbac.has(user(User.Role.ADMIN), Permission.CONFIG_MANAGE)).isFalse();
        assertThat(rbac.has(user(User.Role.SUPER_ADMIN), Permission.CONFIG_MANAGE)).isTrue();
        assertThat(rbac.has(user(User.Role.CUSTOMER_SUPPORT), Permission.CASE_APPROVE)).isFalse();
    }
}
