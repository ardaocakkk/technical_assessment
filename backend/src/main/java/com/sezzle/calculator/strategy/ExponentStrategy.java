package com.sezzle.calculator.strategy;

import org.springframework.stereotype.Component;

import java.math.BigDecimal;
import java.math.RoundingMode;

@Component
public class ExponentStrategy implements OperationStrategy {
    private static final int SCALE = 10;

    @Override
    public OperationType getOperationType() {
        return OperationType.EXPONENT;
    }

    @Override
    public BigDecimal apply(BigDecimal operandA, BigDecimal operandB) {
        int exponent = operandB.intValueExact();
        if (exponent >= 0) {
            return operandA.pow(exponent).stripTrailingZeros();
        }
        BigDecimal positivePower = operandA.pow(-exponent);
        return BigDecimal.ONE.divide(positivePower, SCALE, RoundingMode.HALF_UP).stripTrailingZeros();
    }
}
