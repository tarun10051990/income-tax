package com.incometax.marketplace.entity;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDate;

/** A day with no bookable slots regardless of the weekly rules. */
@Entity
@Table(name = "consultant_holidays", uniqueConstraints =
        @UniqueConstraint(columnNames = {"consultant_id", "holidayDate"}))
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ConsultantHoliday {
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private String id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "consultant_id")
    private ConsultantProfile consultant;

    @Column(nullable = false)
    private LocalDate holidayDate;

    private String reason;
}
