package com.incometax.finance.service;

import com.incometax.exception.ApiException;
import com.incometax.finance.dto.FinanceRequests.FinancialYearRequest;
import com.incometax.finance.dto.FinanceViews.FinancialYearView;
import com.incometax.finance.dto.FinanceViews.PeriodView;
import com.incometax.finance.dto.FinanceViews.QuarterView;
import com.incometax.finance.entity.FinancialYear;
import com.incometax.finance.repository.FinancialYearRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.YearMonth;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;

/**
 * Indian financial-year arithmetic (April–March, Q1 = Apr–Jun) plus the persisted list admins manage.
 * Years are derived from dates, never from a hard-coded list; rows are created on first use.
 */
@Service
@RequiredArgsConstructor
public class FinancialYearService {

    private static final DateTimeFormatter MONTH_LABEL = DateTimeFormatter.ofPattern("MMM yyyy");

    private final FinancialYearRepository repository;

    /* ---------- pure arithmetic ---------- */

    public static String codeFor(LocalDate date) {
        int startYear = date.getMonthValue() >= 4 ? date.getYear() : date.getYear() - 1;
        return code(startYear);
    }

    public static String code(int startYear) {
        return startYear + "-" + String.format("%02d", (startYear + 1) % 100);
    }

    public static String assessmentYearFor(String fyCode) {
        return code(startYear(fyCode) + 1);
    }

    public static int startYear(String fyCode) {
        if (fyCode == null || !fyCode.matches("^\\d{4}-\\d{2}$")) {
            throw ApiException.badRequest("FY_INVALID", "Financial year must look like 2025-26");
        }
        int start = Integer.parseInt(fyCode.substring(0, 4));
        int endSuffix = Integer.parseInt(fyCode.substring(5));
        if ((start + 1) % 100 != endSuffix) {
            throw ApiException.badRequest("FY_INVALID", "Financial year " + fyCode + " is not consecutive");
        }
        return start;
    }

    public static LocalDate startOf(String fyCode) {
        return LocalDate.of(startYear(fyCode), 4, 1);
    }

    public static LocalDate endOf(String fyCode) {
        return LocalDate.of(startYear(fyCode) + 1, 3, 31);
    }

    /** 1-based quarter within the FY for a date (Apr–Jun = 1 … Jan–Mar = 4). */
    public static int quarterOf(LocalDate date) {
        return ((date.getMonthValue() + 8) % 12) / 3 + 1;
    }

    public static LocalDate quarterStart(String fyCode, int quarter) {
        return startOf(fyCode).plusMonths((quarter - 1) * 3L);
    }

    public static LocalDate quarterEnd(String fyCode, int quarter) {
        return quarterStart(fyCode, quarter).plusMonths(3).minusDays(1);
    }

    public static String quarterLabel(String fyCode, int quarter) {
        return "Q" + quarter + " FY " + fyCode;
    }

    public List<QuarterView> quarters(String fyCode) {
        List<QuarterView> list = new ArrayList<>();
        for (int q = 1; q <= 4; q++) {
            list.add(new QuarterView(q, quarterLabel(fyCode, q), quarterStart(fyCode, q), quarterEnd(fyCode, q)));
        }
        return list;
    }

    public String current() {
        return codeFor(LocalDate.now());
    }

    /* ---------- persisted list ---------- */

    @Transactional
    public FinancialYear ensure(String fyCode) {
        int start = startYear(fyCode);
        return repository.findByCode(fyCode).orElseGet(() -> repository.save(FinancialYear.builder()
                .code(fyCode)
                .assessmentYear(code(start + 1))
                .startDate(LocalDate.of(start, 4, 1))
                .endDate(LocalDate.of(start + 1, 3, 31))
                .build()));
    }

    public Optional<FinancialYear> find(String fyCode) {
        return repository.findByCode(fyCode);
    }

    public FinancialYear requireOpen(LocalDate date) {
        String code = codeFor(date);
        FinancialYear year = ensure(code);
        if (!year.isOpen()) {
            throw ApiException.badRequest("FY_CLOSED",
                    "Financial year " + code + " is closed for new entries; contact support to amend it");
        }
        return year;
    }

    @Transactional
    public List<FinancialYear> all() {
        // Always expose last two, current and next so dashboards never start empty.
        int currentStart = startYear(current());
        for (int y = currentStart - 2; y <= currentStart + 1; y++) {
            ensure(code(y));
        }
        return repository.findAllByOrderByStartDateDesc();
    }

    @Transactional
    public FinancialYear save(FinancialYearRequest request) {
        FinancialYear year = ensure(request.code());
        if (request.open() != null) {
            year.setOpen(request.open());
        }
        if (request.notes() != null) {
            year.setNotes(request.notes());
        }
        return repository.save(year);
    }

    public FinancialYearView view(FinancialYear year) {
        return new FinancialYearView(year.getId(), year.getCode(), year.getAssessmentYear(), year.getStartDate(),
                year.getEndDate(), year.isOpen(), year.getCode().equals(current()), year.getNotes(),
                quarters(year.getCode()));
    }

    /* ---------- reporting windows ---------- */

    public enum PeriodType { MONTH, QUARTER, FY, CUSTOM, ALL }

    public enum GroupBy { MONTH, QUARTER, FY }

    /**
     * Resolves dashboard filters into a date window. {@code fy} defaults to the current FY; {@code month} is
     * yyyy-MM; {@code quarter} is 1–4 within {@code fy}; CUSTOM needs from/to.
     */
    public PeriodView resolve(String type, String fy, String month, Integer quarter, LocalDate from, LocalDate to,
                              String groupBy) {
        PeriodType periodType = type == null || type.isBlank() ? PeriodType.FY
                : PeriodType.valueOf(type.trim().toUpperCase());
        String fyCode = fy == null || fy.isBlank() ? current() : fy.trim();
        startYear(fyCode);
        switch (periodType) {
            case MONTH -> {
                YearMonth ym = month == null || month.isBlank() ? YearMonth.now() : YearMonth.parse(month.trim());
                LocalDate start = ym.atDay(1);
                return new PeriodView("MONTH", ym.format(MONTH_LABEL), start, ym.atEndOfMonth(), codeFor(start),
                        defaultGroup(groupBy, GroupBy.MONTH));
            }
            case QUARTER -> {
                int q = quarter == null ? quarterOf(LocalDate.now()) : quarter;
                if (q < 1 || q > 4) {
                    throw ApiException.badRequest("QUARTER_INVALID", "Quarter must be between 1 and 4");
                }
                return new PeriodView("QUARTER", quarterLabel(fyCode, q), quarterStart(fyCode, q),
                        quarterEnd(fyCode, q), fyCode, defaultGroup(groupBy, GroupBy.MONTH));
            }
            case CUSTOM -> {
                if (from == null || to == null || to.isBefore(from)) {
                    throw ApiException.badRequest("RANGE_INVALID", "Custom range needs from <= to");
                }
                return new PeriodView("CUSTOM", from + " to " + to, from, to, codeFor(to),
                        defaultGroup(groupBy, from.plusMonths(15).isBefore(to) ? GroupBy.QUARTER : GroupBy.MONTH));
            }
            case ALL -> {
                LocalDate start = startOf(code(startYear(current()) - 4));
                return new PeriodView("ALL", "Last 5 financial years", start, endOf(current()), current(),
                        defaultGroup(groupBy, GroupBy.FY));
            }
            default -> {
                return new PeriodView("FY", "FY " + fyCode, startOf(fyCode), endOf(fyCode), fyCode,
                        defaultGroup(groupBy, GroupBy.MONTH));
            }
        }
    }

    private String defaultGroup(String requested, GroupBy fallback) {
        return requested == null || requested.isBlank() ? fallback.name() : GroupBy.valueOf(requested.trim().toUpperCase()).name();
    }

    /** Consecutive buckets covering the window, used to build trend series with zero-filled gaps. */
    public List<Bucket> buckets(PeriodView period) {
        GroupBy group = GroupBy.valueOf(period.groupBy());
        List<Bucket> buckets = new ArrayList<>();
        LocalDate cursor = period.from();
        while (!cursor.isAfter(period.to())) {
            LocalDate start;
            LocalDate end;
            String label;
            switch (group) {
                case QUARTER -> {
                    String fy = codeFor(cursor);
                    int q = quarterOf(cursor);
                    start = quarterStart(fy, q);
                    end = quarterEnd(fy, q);
                    label = "Q" + q + " " + fy;
                }
                case FY -> {
                    String fy = codeFor(cursor);
                    start = startOf(fy);
                    end = endOf(fy);
                    label = "FY " + fy;
                }
                default -> {
                    YearMonth ym = YearMonth.from(cursor);
                    start = ym.atDay(1);
                    end = ym.atEndOfMonth();
                    label = ym.format(MONTH_LABEL);
                }
            }
            buckets.add(new Bucket(label, start.isBefore(period.from()) ? period.from() : start,
                    end.isAfter(period.to()) ? period.to() : end));
            cursor = end.plusDays(1);
        }
        return buckets;
    }

    public record Bucket(String label, LocalDate from, LocalDate to) {
        public boolean contains(LocalDate date) {
            return date != null && !date.isBefore(from) && !date.isAfter(to);
        }
    }
}
