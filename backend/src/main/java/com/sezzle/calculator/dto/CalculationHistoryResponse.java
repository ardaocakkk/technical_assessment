package com.sezzle.calculator.dto;

import lombok.AllArgsConstructor;
import lombok.Data;

import java.math.BigDecimal;
import java.time.Instant;

@Data
@AllArgsConstructor
public class CalculationHistoryResponse {
    private Long id;
    private String operation;
    private BigDecimal operandA;
    private BigDecimal operandB;
    private BigDecimal result;
    private Instant createdAt;
}
