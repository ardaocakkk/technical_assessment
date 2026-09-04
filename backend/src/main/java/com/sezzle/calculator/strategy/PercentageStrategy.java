package com.sezzle.calculator.strategy;

import org.springframework.stereotype.Component;

import java.math.BigDecimal;
import java.math.RoundingMode;

@Component
public class PercentageStrategy implements OperationStrategy {
    private static final int SCALE = 10;
    private static final BigDecimal ONE_HUNDRED = new BigDecimal("100");

    @Override
    public OperationType getOperationType() {
        return OperationType.PERCENTAGE;
    }

    @Override
    public BigDecimal apply(BigDecimal operandA, BigDecimal operandB) {
        return operandA.multiply(operandB)
                .divide(ONE_HUNDRED, SCALE, RoundingMode.HALF_UP)
                .stripTrailingZeros();
    }
}
