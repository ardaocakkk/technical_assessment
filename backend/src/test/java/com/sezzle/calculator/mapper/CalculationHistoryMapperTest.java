package com.sezzle.calculator.mapper;

import com.sezzle.calculator.dto.CalculationHistoryResponse;
import com.sezzle.calculator.model.CalculationHistory;
import org.junit.jupiter.api.Test;

import java.math.BigDecimal;
import java.time.Instant;

import static org.assertj.core.api.Assertions.assertThat;

class CalculationHistoryMapperTest {
    private final CalculationHistoryMapper mapper = new CalculationHistoryMapperImpl();

    @Test
    void mapsAllFieldsFromEntityToResponse() {
        Instant now = Instant.parse("2026-01-01T00:00:00Z");
        CalculationHistory entity = CalculationHistory.builder()
                .id(1L)
                .clientId("client-1")
                .operation("ADD")
                .operandA(new BigDecimal("2"))
                .operandB(new BigDecimal("3"))
                .result(new BigDecimal("5"))
                .createdAt(now)
                .build();

        CalculationHistoryResponse response = mapper.toResponse(entity);

        assertThat(response.getId()).isEqualTo(1L);
        assertThat(response.getOperation()).isEqualTo("ADD");
        assertThat(response.getOperandA()).isEqualByComparingTo("2");
        assertThat(response.getOperandB()).isEqualByComparingTo("3");
        assertThat(response.getResult()).isEqualByComparingTo("5");
        assertThat(response.getCreatedAt()).isEqualTo(now);
    }
}
