package com.sezzle.calculator.dto;

import lombok.AllArgsConstructor;
import lombok.Data;

import java.time.Instant;

@Data
@AllArgsConstructor
public class ErrorResponse {
    private String message;
    private Instant timestamp;

    public static ErrorResponse of(String message) {
        return new ErrorResponse(message, Instant.now());
    }
}
