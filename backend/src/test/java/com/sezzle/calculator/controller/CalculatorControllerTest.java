package com.sezzle.calculator.controller;

import com.sezzle.calculator.config.CorsConfig;
import com.sezzle.calculator.config.JacksonConfig;
import com.sezzle.calculator.exception.InvalidOperationException;
import com.sezzle.calculator.service.CalculationHistoryService;
import com.sezzle.calculator.service.CalculatorService;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.webmvc.test.autoconfigure.WebMvcTest;
import org.springframework.context.annotation.Import;
import org.springframework.http.MediaType;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

import tools.jackson.databind.ObjectMapper;

import java.math.BigDecimal;
import java.util.Map;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.options;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.content;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest(CalculatorController.class)
@Import({CorsConfig.class, JacksonConfig.class})
class CalculatorControllerTest {
    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @MockitoBean
    private CalculatorService calculatorService;

    @MockitoBean
    private CalculationHistoryService calculationHistoryService;

    @Test
    void returnsResultForValidRequest() throws Exception {
        when(calculatorService.calculate(any())).thenReturn(new BigDecimal("5"));

        mockMvc.perform(post("/api/calculate")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(
                                Map.of("operation", "ADD", "operandA", 2, "operandB", 3))))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.result").value(5));
    }

    @Test
    void writesBigDecimalResultInPlainNotationNotScientific() throws Exception {
        when(calculatorService.calculate(any())).thenReturn(new BigDecimal("1E+2"));

        mockMvc.perform(post("/api/calculate")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(
                                Map.of("operation", "MULTIPLY", "operandA", 10, "operandB", 10))))
                .andExpect(status().isOk())
                .andExpect(content().string("{\"result\":100}"));
    }

    @Test
    void returns400ForMissingOperation() throws Exception {
        mockMvc.perform(post("/api/calculate")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(
                                Map.of("operandA", 2, "operandB", 3))))
                .andExpect(status().isBadRequest());
    }

    @Test
    void returns400ForMalformedJson() throws Exception {
        mockMvc.perform(post("/api/calculate")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"operation\": \"ADD\", \"operandA\": "))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.message").value("Malformed request body or invalid field value"));
    }

    @Test
    void returns400ForUnknownOperationValue() throws Exception {
        mockMvc.perform(post("/api/calculate")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"operation\": \"BOGUS\", \"operandA\": 2, \"operandB\": 3}"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.message").value("Malformed request body or invalid field value"));
    }

    @Test
    void returns400ForNonNumericOperand() throws Exception {
        mockMvc.perform(post("/api/calculate")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"operation\": \"ADD\", \"operandA\": \"abc\", \"operandB\": 3}"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.message").value("Malformed request body or invalid field value"));
    }

    @Test
    void allowsCorsPreflightFromFrontendOrigin() throws Exception {
        mockMvc.perform(options("/api/calculate")
                        .header("Origin", "http://localhost:5173")
                        .header("Access-Control-Request-Method", "POST"))
                .andExpect(status().isOk())
                .andExpect(header().string("Access-Control-Allow-Origin", "http://localhost:5173"));
    }

    @Test
    void includesCorsHeaderOnActualRequestFromFrontendOrigin() throws Exception {
        when(calculatorService.calculate(any())).thenReturn(new BigDecimal("5"));

        mockMvc.perform(post("/api/calculate")
                        .header("Origin", "http://localhost:5173")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(
                                Map.of("operation", "ADD", "operandA", 2, "operandB", 3))))
                .andExpect(status().isOk())
                .andExpect(header().string("Access-Control-Allow-Origin", "http://localhost:5173"));
    }

    @Test
    void returns400WhenServiceThrowsInvalidOperation() throws Exception {
        when(calculatorService.calculate(any()))
                .thenThrow(new InvalidOperationException("Cannot divide by zero"));

        mockMvc.perform(post("/api/calculate")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(
                                Map.of("operation", "DIVIDE", "operandA", 5, "operandB", 0))))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.message").value("Cannot divide by zero"));
    }

    @Test
    void savesHistoryWhenClientIdHeaderPresent() throws Exception {
        when(calculatorService.calculate(any())).thenReturn(new BigDecimal("5"));

        mockMvc.perform(post("/api/calculate")
                        .header("X-Client-Id", "client-1")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(
                                Map.of("operation", "ADD", "operandA", 2, "operandB", 3))))
                .andExpect(status().isOk());

        verify(calculationHistoryService).save(eq("client-1"), any(), eq(new BigDecimal("5")));
    }

    @Test
    void doesNotSaveHistoryWhenClientIdHeaderAbsent() throws Exception {
        when(calculatorService.calculate(any())).thenReturn(new BigDecimal("5"));

        mockMvc.perform(post("/api/calculate")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(
                                Map.of("operation", "ADD", "operandA", 2, "operandB", 3))))
                .andExpect(status().isOk());

        verify(calculationHistoryService, never()).save(any(), any(), any());
    }
}
