package com.incometax.taxrates.entity;

import com.fasterxml.jackson.annotation.JsonIgnore;
import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.EqualsAndHashCode;
import lombok.NoArgsConstructor;
import lombok.ToString;

import java.math.BigDecimal;

/** How one category was taxed under one regime. */
@Entity
@Table(name = "itr_tax_lines")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ItrTaxLine {
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private String id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "result_id", nullable = false)
    @JsonIgnore
    @ToString.Exclude
    @EqualsAndHashCode.Exclude
    private ItrRegimeResult result;

    @Column(nullable = false, length = 40)
    private String categoryCode;

    @Column(nullable = false)
    private String name;

    @Column(length = 30)
    private String section;

    @Column(length = 30)
    private String groupCode;

    @Column(nullable = false, length = 15)
    private String treatment;

    @Column(precision = 6, scale = 4)
    private BigDecimal rate;

    @Column(nullable = false, precision = 15, scale = 2) private BigDecimal amount;
    @Column(nullable = false, precision = 15, scale = 2) private BigDecimal exemptAmount;
    @Column(nullable = false, precision = 15, scale = 2) private BigDecimal taxableAmount;
    @Column(nullable = false, precision = 15, scale = 2) private BigDecimal tax;

    @Column(length = 500)
    private String note;

    @Builder.Default
    private int sortOrder = 0;
}
