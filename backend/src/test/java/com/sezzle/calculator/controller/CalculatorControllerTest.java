package com.sezzle.calculator.controller;

import com.sezzle.calculator.exception.InvalidOperationException;
import com.sezzle.calculator.service.CalculatorService;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.webmvc.test.autoconfigure.WebMvcTest;
import org.springframework.http.MediaType;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

import tools.jackson.databind.ObjectMapper;

import java.math.BigDecimal;
import java.util.Map;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest(CalculatorController.class)
class CalculatorControllerTest {
    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @MockitoBean
    private CalculatorService calculatorService;

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
    void returns400ForMissingOperation() throws Exception {
        mockMvc.perform(post("/api/calculate")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(
                                Map.of("operandA", 2, "operandB", 3))))
                .andExpect(status().isBadRequest());
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
}
