package com.incometax.finance;

import com.incometax.finance.service.FinancialYearService;
import org.junit.jupiter.api.Test;

import java.time.LocalDate;

import static org.assertj.core.api.Assertions.assertThat;

class FinancialYearServiceTest {

    @Test
    void indianFinancialYearRunsAprilToMarch() {
        assertThat(FinancialYearService.codeFor(LocalDate.of(2025, 3, 31))).isEqualTo("2024-25");
        assertThat(FinancialYearService.codeFor(LocalDate.of(2025, 4, 1))).isEqualTo("2025-26");
        assertThat(FinancialYearService.codeFor(LocalDate.of(2099, 12, 31))).isEqualTo("2099-00");
        assertThat(FinancialYearService.startOf("2026-27")).isEqualTo(LocalDate.of(2026, 4, 1));
        assertThat(FinancialYearService.endOf("2026-27")).isEqualTo(LocalDate.of(2027, 3, 31));
        assertThat(FinancialYearService.assessmentYearFor("2025-26")).isEqualTo("2026-27");
    }

    @Test
    void quartersFollowTheFinancialYear() {
        assertThat(FinancialYearService.quarterOf(LocalDate.of(2025, 4, 1))).isEqualTo(1);
        assertThat(FinancialYearService.quarterOf(LocalDate.of(2025, 6, 30))).isEqualTo(1);
        assertThat(FinancialYearService.quarterOf(LocalDate.of(2025, 7, 1))).isEqualTo(2);
        assertThat(FinancialYearService.quarterOf(LocalDate.of(2025, 10, 15))).isEqualTo(3);
        assertThat(FinancialYearService.quarterOf(LocalDate.of(2026, 1, 1))).isEqualTo(4);
        assertThat(FinancialYearService.quarterOf(LocalDate.of(2026, 3, 31))).isEqualTo(4);
        assertThat(FinancialYearService.quarterStart("2025-26", 4)).isEqualTo(LocalDate.of(2026, 1, 1));
        assertThat(FinancialYearService.quarterEnd("2025-26", 4)).isEqualTo(LocalDate.of(2026, 3, 31));
        assertThat(FinancialYearService.quarterEnd("2025-26", 1)).isEqualTo(LocalDate.of(2025, 6, 30));
    }
}
