package com.sezzle.calculator.dto;

import com.sezzle.calculator.strategy.OperationType;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

import java.math.BigDecimal;

@Data
public class CalculationRequest {
    @NotNull(message = "operation is required")
    private OperationType operation;

    @NotNull(message = "operandA is required")
    private BigDecimal operandA;

    /** Optional: only required for binary operations (everything except SQRT). */
    private BigDecimal operandB;
}
