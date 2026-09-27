package com.incometax.service;

import com.incometax.entity.FilingStatus;
import com.incometax.entity.Priority;
import com.incometax.entity.ReturnType;
import com.incometax.entity.TaxType;
import lombok.Builder;
import lombok.Data;

import java.util.List;

@Data
@Builder
public class CaseSearchCriteria {
    private TaxType taxType;
    private List<FilingStatus> statuses;
    private ReturnType returnType;
    private Priority priority;
    private String assignedToId;
    private String customerId;
    private String financialYear;
    private String assessmentYear;
    private String period;
    private String state;
    /** Free text matched against case number, customer name, email, PAN and phone. */
    private String query;
}
