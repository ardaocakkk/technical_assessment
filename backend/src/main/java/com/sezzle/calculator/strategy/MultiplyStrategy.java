package com.sezzle.calculator.strategy;

import org.springframework.stereotype.Component;

import java.math.BigDecimal;

@Component
public class MultiplyStrategy implements OperationStrategy {
    @Override
    public OperationType getOperationType() {
        return OperationType.MULTIPLY;
    }

    @Override
    public BigDecimal apply(BigDecimal operandA, BigDecimal operandB) {
        return operandA.multiply(operandB);
    }
}
