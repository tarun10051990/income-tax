package com.incometax.marketplace.service;

import com.incometax.marketplace.dto.MarketplaceViews.DaySlots;
import com.incometax.marketplace.dto.MarketplaceViews.SlotView;
import com.incometax.marketplace.entity.AvailabilityRule;
import com.incometax.marketplace.entity.ConsultantProfile;
import com.incometax.marketplace.entity.ConsultationBooking;
import com.incometax.marketplace.repository.AvailabilityRuleRepository;
import com.incometax.marketplace.repository.ConsultantHolidayRepository;
import com.incometax.marketplace.repository.ConsultationBookingRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.time.Duration;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.util.ArrayList;
import java.util.List;

/** Turns weekly availability rules + holidays + existing bookings into bookable slots. */
@Service
@RequiredArgsConstructor
public class SlotService {

    /** Slots must start at least this far in the future so the consultant can prepare. */
    static final Duration LEAD_TIME = Duration.ofMinutes(60);
    static final int MAX_DAYS = 31;

    private final AvailabilityRuleRepository ruleRepository;
    private final ConsultantHolidayRepository holidayRepository;
    private final ConsultationBookingRepository bookingRepository;

    public List<DaySlots> slots(ConsultantProfile consultant, LocalDate from, int days, int durationMinutes) {
        int span = Math.max(1, Math.min(days, MAX_DAYS));
        LocalDateTime now = LocalDateTime.now();
        List<AvailabilityRule> rules = ruleRepository
                .findByConsultantIdOrderByDayOfWeekAscStartTimeAsc(consultant.getId());
        List<ConsultationBooking> held = bookingRepository.findInWindow(consultant.getId(),
                from.atStartOfDay(), from.plusDays(span).atStartOfDay(), ConsultationBooking.SLOT_HOLDING);

        List<DaySlots> result = new ArrayList<>();
        for (int i = 0; i < span; i++) {
            LocalDate date = from.plusDays(i);
            if (holidayRepository.existsByConsultantIdAndHolidayDate(consultant.getId(), date)) {
                result.add(new DaySlots(date, List.of()));
                continue;
            }
            List<SlotView> daySlots = new ArrayList<>();
            for (AvailabilityRule rule : rules) {
                if (rule.getDayOfWeek() != date.getDayOfWeek()) {
                    continue;
                }
                LocalTime cursor = rule.getStartTime();
                while (!cursor.plusMinutes(durationMinutes).isAfter(rule.getEndTime())
                        && cursor.plusMinutes(durationMinutes).isAfter(cursor)) {
                    LocalDateTime start = date.atTime(cursor);
                    LocalDateTime end = start.plusMinutes(durationMinutes);
                    if (start.isAfter(now.plus(LEAD_TIME)) && held.stream().noneMatch(b -> overlaps(b, start, end))) {
                        daySlots.add(new SlotView(start, end));
                    }
                    cursor = cursor.plusMinutes(durationMinutes);
                }
            }
            result.add(new DaySlots(date, daySlots));
        }
        return result;
    }

    public LocalDateTime nextAvailable(ConsultantProfile consultant) {
        return slots(consultant, LocalDate.now(), 14, consultant.getSlotDurationMinutes()).stream()
                .flatMap(d -> d.slots().stream())
                .map(SlotView::start)
                .findFirst()
                .orElse(null);
    }

    /** True when the requested window lies inside a working window on that weekday and not on a holiday. */
    public boolean withinWorkingHours(ConsultantProfile consultant, LocalDateTime start, LocalDateTime end) {
        if (holidayRepository.existsByConsultantIdAndHolidayDate(consultant.getId(), start.toLocalDate())) {
            return false;
        }
        if (!start.toLocalDate().equals(end.toLocalDate())) {
            return false;
        }
        return ruleRepository.findByConsultantIdAndDayOfWeek(consultant.getId(), start.getDayOfWeek()).stream()
                .anyMatch(r -> !start.toLocalTime().isBefore(r.getStartTime())
                        && !end.toLocalTime().isAfter(r.getEndTime()));
    }

    static boolean overlaps(ConsultationBooking b, LocalDateTime start, LocalDateTime end) {
        return b.getScheduledStart().isBefore(end) && b.getScheduledEnd().isAfter(start);
    }
}
