package com.incometax.marketplace.repository;

import com.incometax.marketplace.entity.ConsultantHoliday;
import org.springframework.data.jpa.repository.JpaRepository;

import java.time.LocalDate;
import java.util.List;

public interface ConsultantHolidayRepository extends JpaRepository<ConsultantHoliday, String> {
    List<ConsultantHoliday> findByConsultantIdAndHolidayDateGreaterThanEqualOrderByHolidayDateAsc(
            String consultantId, LocalDate from);
    boolean existsByConsultantIdAndHolidayDate(String consultantId, LocalDate date);
}
