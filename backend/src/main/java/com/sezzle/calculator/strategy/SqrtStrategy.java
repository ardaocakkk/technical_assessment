package com.sezzle.calculator.strategy;

import com.sezzle.calculator.exception.InvalidOperationException;
import org.springframework.stereotype.Component;

import java.math.BigDecimal;
import java.math.MathContext;

@Component
public class SqrtStrategy implements OperationStrategy {
    @Override
    public OperationType getOperationType() {
        return OperationType.SQRT;
    }

    @Override
    public BigDecimal apply(BigDecimal operandA, BigDecimal operandB) {
        if (operandA.compareTo(BigDecimal.ZERO) < 0) {
            throw new InvalidOperationException("Cannot compute square root of a negative number");
        }
        return operandA.sqrt(MathContext.DECIMAL64).stripTrailingZeros();
    }
}
