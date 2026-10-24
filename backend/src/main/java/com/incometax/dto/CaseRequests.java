package com.incometax.dto;

import com.incometax.entity.FilingQuery;
import com.incometax.entity.FilingStatus;
import com.incometax.entity.Priority;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

import java.time.LocalDate;

public final class CaseRequests {

    private CaseRequests() {
    }

    @Data
    public static class Transition {
        @NotNull
        private FilingStatus targetStatus;
        private String note;
    }

    @Data
    public static class Assign {
        @NotBlank
        private String assigneeId;
    }

    @Data
    public static class ChangePriority {
        @NotNull
        private Priority priority;
    }

    @Data
    public static class AddComment {
        @NotBlank
        private String message;
        private boolean internal = true;
    }

    @Data
    public static class RaiseQuery {
        @NotBlank
        private String caseId;
        @NotNull
        private FilingQuery.Category category;
        @NotBlank
        private String question;
        private Priority priority;
        private LocalDate dueDate;
    }

    @Data
    public static class RespondToQuery {
        @NotBlank
        private String message;
        private String documentId;
    }

    @Data
    public static class ReviewQuery {
        private boolean accept;
        private String note;
    }
}
