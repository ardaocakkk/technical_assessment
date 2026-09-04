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
        CalculationHistory entry = CalculationHistory.builder()
                .id(1L).clientId("client-1").operation("ADD")
                .operandA(new BigDecimal("2")).operandB(new BigDecimal("3"))
                .result(new BigDecimal("5")).build();
        when(calculationHistoryService.getLatest("client-1")).thenReturn(List.of(entry));

        mockMvc.perform(get("/api/history").header("X-Client-Id", "client-1"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].operation").value("ADD"))
                .andExpect(jsonPath("$[0].result").value(5));
    }

    @Test
    void returns400WhenClientIdHeaderMissing() throws Exception {
        mockMvc.perform(get("/api/history"))
                .andExpect(status().isBadRequest());
    }
}
