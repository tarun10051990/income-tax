package com.incometax.security;

import org.junit.jupiter.api.Test;

import java.time.Instant;

import static org.assertj.core.api.Assertions.assertThat;

class TotpUtilTest {

    private static final String SECRET = "JBSWY3DPEHPK3PXPJBSW";

    @Test
    void generatesSixDigitCodes() {
        assertThat(TotpUtil.code(SECRET, Instant.parse("2026-01-01T00:00:00Z"))).hasSize(6).containsOnlyDigits();
    }

    @Test
    void codeIsStableWithinTheSameThirtySecondStep() {
        String first = TotpUtil.code(SECRET, Instant.parse("2026-01-01T00:00:05Z"));
        String second = TotpUtil.code(SECRET, Instant.parse("2026-01-01T00:00:25Z"));
        assertThat(first).isEqualTo(second);
    }

    @Test
    void verifiesTheCurrentCodeAndRejectsOthers() {
        assertThat(TotpUtil.verify(SECRET, TotpUtil.code(SECRET, Instant.now()))).isTrue();
        assertThat(TotpUtil.verify(SECRET, "x")).isFalse();
        assertThat(TotpUtil.verify(SECRET, null)).isFalse();
        assertThat(TotpUtil.verify(null, "123456")).isFalse();
    }

    @Test
    void generatedSecretsAreBase32AndDistinct() {
        String secret = TotpUtil.generateSecret();
        assertThat(secret).matches("[A-Z2-7]{20}");
        assertThat(secret).isNotEqualTo(TotpUtil.generateSecret());
    }
}
