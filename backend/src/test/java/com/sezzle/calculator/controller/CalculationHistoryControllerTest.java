package com.sezzle.calculator.controller;

import com.sezzle.calculator.config.CorsConfig;
import com.sezzle.calculator.config.JacksonConfig;
import com.sezzle.calculator.mapper.CalculationHistoryMapperImpl;
import com.sezzle.calculator.model.CalculationHistory;
import com.sezzle.calculator.service.CalculationHistoryService;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.webmvc.test.autoconfigure.WebMvcTest;
import org.springframework.context.annotation.Import;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;

import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest(CalculationHistoryController.class)
@Import({CorsConfig.class, JacksonConfig.class, CalculationHistoryMapperImpl.class})
class CalculationHistoryControllerTest {
    @Autowired
    private MockMvc mockMvc;

    @MockitoBean
    private CalculationHistoryService calculationHistoryService;

    @Test
    void returnsHistoryForValidClientId() throws Exception {
        CalculationHistory newest = CalculationHistory.builder()
                .id(2L).clientId("client-1").operation("SQRT")
                .operandA(new BigDecimal("9")).operandB(null)
                .result(new BigDecimal("3"))
                .createdAt(Instant.parse("2026-01-02T03:04:05Z")).build();
        CalculationHistory older = CalculationHistory.builder()
                .id(1L).clientId("client-1").operation("ADD")
                .operandA(new BigDecimal("2")).operandB(new BigDecimal("3"))
                .result(new BigDecimal("5"))
                .createdAt(Instant.parse("2026-01-01T00:00:00Z")).build();
        when(calculationHistoryService.getLatest("client-1")).thenReturn(List.of(newest, older));

        mockMvc.perform(get("/api/history").header("X-Client-Id", "client-1"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(2))
                .andExpect(jsonPath("$[0].id").value(2))
                .andExpect(jsonPath("$[0].operation").value("SQRT"))
                .andExpect(jsonPath("$[0].operandA").value(9))
                .andExpect(jsonPath("$[0].operandB").doesNotExist())
                .andExpect(jsonPath("$[0].result").value(3))
                .andExpect(jsonPath("$[0].createdAt").value("2026-01-02T03:04:05Z"))
                .andExpect(jsonPath("$[1].id").value(1))
                .andExpect(jsonPath("$[1].operation").value("ADD"))
                .andExpect(jsonPath("$[1].operandB").value(3))
                .andExpect(jsonPath("$[1].result").value(5))
                .andExpect(jsonPath("$[1].createdAt").value("2026-01-01T00:00:00Z"));
    }

    @Test
    void returns400WhenClientIdHeaderMissing() throws Exception {
        mockMvc.perform(get("/api/history"))
                .andExpect(status().isBadRequest());
    }
}
