package com.sezzle.calculator.strategy;

import org.springframework.stereotype.Component;

import java.math.BigDecimal;

@Component
public class SubtractStrategy implements OperationStrategy {
    @Override
    public OperationType getOperationType() {
        return OperationType.SUBTRACT;
    }

    @Override
    public BigDecimal apply(BigDecimal operandA, BigDecimal operandB) {
        return operandA.subtract(operandB);
    }
}
