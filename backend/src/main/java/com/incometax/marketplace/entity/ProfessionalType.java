package com.incometax.marketplace.entity;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/** Admin-configurable professional category (CA, Lawyer, GST Consultant, ...). */
@Entity
@Table(name = "professional_types")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ProfessionalType {
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private String id;

    /** Stable machine code, e.g. CA, LAWYER, GST_CONSULTANT. */
    @Column(nullable = false, unique = true)
    private String code;

    @Column(nullable = false)
    private String label;

    /** Shown on profiles, e.g. "Chartered Accountant". */
    private String designation;

    /** Which regulator identifier is collected: ICAI, BAR_COUNCIL or NONE. */
    @Enumerated(EnumType.STRING)
    @Builder.Default
    private Regulator regulator = Regulator.NONE;

    @Builder.Default
    private boolean active = true;

    @Builder.Default
    private int sortOrder = 0;

    public enum Regulator {
        ICAI,
        BAR_COUNCIL,
        NONE
    }
}
