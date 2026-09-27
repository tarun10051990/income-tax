package com.incometax.exception;

import com.incometax.common.ApiResponse;
import lombok.Getter;
import org.springframework.http.HttpStatus;

import java.util.List;

@Getter
public class ApiException extends RuntimeException {

    private final HttpStatus status;
    private final String code;
    private final List<ApiResponse.FieldError> errors;

    public ApiException(HttpStatus status, String code, String message) {
        this(status, code, message, List.of());
    }

    public ApiException(HttpStatus status, String code, String message, List<ApiResponse.FieldError> errors) {
        super(message);
        this.status = status;
        this.code = code;
        this.errors = errors;
    }

    public static ApiException notFound(String entity, String id) {
        return new ApiException(HttpStatus.NOT_FOUND, "RESOURCE_NOT_FOUND", entity + " " + id + " was not found");
    }

    public static ApiException forbidden(String message) {
        return new ApiException(HttpStatus.FORBIDDEN, "ACCESS_DENIED", message);
    }

    public static ApiException conflict(String code, String message) {
        return new ApiException(HttpStatus.CONFLICT, code, message);
    }

    public static ApiException validation(String message, List<ApiResponse.FieldError> errors) {
        return new ApiException(HttpStatus.BAD_REQUEST, "FILING_VALIDATION_ERROR", message, errors);
    }

    public static ApiException badRequest(String code, String message) {
        return new ApiException(HttpStatus.BAD_REQUEST, code, message);
    }

    public static ApiException unauthorized(String message) {
        return new ApiException(HttpStatus.UNAUTHORIZED, "AUTHENTICATION_FAILED", message);
    }
}
