package com.incometax.common;

import com.fasterxml.jackson.annotation.JsonInclude;
import lombok.Builder;
import lombok.Data;

import java.util.List;

@Data
@Builder
@JsonInclude(JsonInclude.Include.NON_NULL)
public class ApiResponse<T> {

    private boolean success;
    private T data;
    private String code;
    private String message;
    private List<FieldError> errors;
    private String traceId;

    public static <T> ApiResponse<T> ok(T data) {
        return ApiResponse.<T>builder().success(true).data(data).traceId(TraceContext.current()).build();
    }

    public static <T> ApiResponse<T> error(String code, String message, List<FieldError> errors) {
        return ApiResponse.<T>builder()
                .success(false)
                .code(code)
                .message(message)
                .errors(errors == null || errors.isEmpty() ? null : errors)
                .traceId(TraceContext.current())
                .build();
    }

    @Data
    @Builder
    public static class FieldError {
        private String field;
        private String message;
    }
}
