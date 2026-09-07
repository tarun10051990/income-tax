package com.incometax.marketplace.repository;

import com.incometax.marketplace.entity.AvailabilityRule;
import org.springframework.data.jpa.repository.JpaRepository;

import java.time.DayOfWeek;
import java.util.List;

public interface AvailabilityRuleRepository extends JpaRepository<AvailabilityRule, String> {
    List<AvailabilityRule> findByConsultantIdOrderByDayOfWeekAscStartTimeAsc(String consultantId);
    List<AvailabilityRule> findByConsultantIdAndDayOfWeek(String consultantId, DayOfWeek dayOfWeek);
    void deleteByConsultantId(String consultantId);
}
