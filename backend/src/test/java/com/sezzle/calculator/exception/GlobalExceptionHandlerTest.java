package com.sezzle.calculator.exception;

import com.sezzle.calculator.dto.ErrorResponse;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;

import static org.assertj.core.api.Assertions.assertThat;

class GlobalExceptionHandlerTest {
    private final GlobalExceptionHandler handler = new GlobalExceptionHandler();

    @Test
    void mapsInvalidOperationExceptionToBadRequest() {
        ResponseEntity<ErrorResponse> response =
                handler.handleInvalidOperation(new InvalidOperationException("Cannot divide by zero"));

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.BAD_REQUEST);
        assertThat(response.getBody().getMessage()).isEqualTo("Cannot divide by zero");
    }

    @Test
    void mapsUnexpectedExceptionToInternalServerError() {
        ResponseEntity<ErrorResponse> response =
                handler.handleUnexpected(new RuntimeException("boom"));

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.INTERNAL_SERVER_ERROR);
        assertThat(response.getBody().getMessage()).isEqualTo("Internal server error");
    }
}
