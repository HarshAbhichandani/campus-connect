package com.example.studentapi.exception;

import io.swagger.v3.oas.annotations.media.Schema;
import java.time.LocalDateTime;
import java.util.List;

@Schema(description = "Structured Error Response DTO")
public class ErrorResponse {

    @Schema(example = "400")
    private int status;

    @Schema(example = "Bad Request")
    private String error;

    @Schema(example = "Validation failed for request body")
    private String message;

    @Schema(example = "[\"Name is required\", \"Email must be a valid email address\"]")
    private List<String> errors;

    @Schema(example = "2026-08-21T14:30:00")
    private LocalDateTime timestamp;

    public ErrorResponse() {
        this.timestamp = LocalDateTime.now();
    }

    public ErrorResponse(int status, String error, String message, List<String> errors) {
        this();
        this.status = status;
        this.error = error;
        this.message = message;
        this.errors = errors;
    }

    public ErrorResponse(int status, String error, String message) {
        this(status, error, message, null);
    }

    public int getStatus() {
        return status;
    }

    public void setStatus(int status) {
        this.status = status;
    }

    public String getError() {
        return error;
    }

    public void setError(String error) {
        this.error = error;
    }

    public String getMessage() {
        return message;
    }

    public void setMessage(String message) {
        this.message = message;
    }

    public List<String> getErrors() {
        return errors;
    }

    public void setErrors(List<String> errors) {
        this.errors = errors;
    }

    public LocalDateTime getTimestamp() {
        return timestamp;
    }

    public void setTimestamp(LocalDateTime timestamp) {
        this.timestamp = timestamp;
    }
}
