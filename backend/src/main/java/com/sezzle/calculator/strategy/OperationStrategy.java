package com.sezzle.calculator.strategy;

import java.math.BigDecimal;

public interface OperationStrategy {
    OperationType getOperationType();

    /**
     * Applies the operation. For unary operations (SQRT), operandB is ignored.
     */
    BigDecimal apply(BigDecimal operandA, BigDecimal operandB);
}
