package com.sezzle.calculator.strategy;

import com.sezzle.calculator.exception.InvalidOperationException;
import org.springframework.stereotype.Component;

import java.math.BigDecimal;
import java.math.RoundingMode;

@Component
public class DivideStrategy implements OperationStrategy {
    private static final int SCALE = 10;

    @Override
    public OperationType getOperationType() {
        return OperationType.DIVIDE;
    }

    @Override
    public BigDecimal apply(BigDecimal operandA, BigDecimal operandB) {
        if (operandB.compareTo(BigDecimal.ZERO) == 0) {
            throw new InvalidOperationException("Cannot divide by zero");
        }
        return operandA.divide(operandB, SCALE, RoundingMode.HALF_UP).stripTrailingZeros();
    }
}
