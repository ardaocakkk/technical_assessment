package com.sezzle.calculator.strategy;

import org.springframework.stereotype.Component;

import java.math.BigDecimal;

@Component
public class AddStrategy implements OperationStrategy {
    @Override
    public OperationType getOperationType() {
        return OperationType.ADD;
    }

    @Override
    public BigDecimal apply(BigDecimal operandA, BigDecimal operandB) {
        return operandA.add(operandB);
    }
}
