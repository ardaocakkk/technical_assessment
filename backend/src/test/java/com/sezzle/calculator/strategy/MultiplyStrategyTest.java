package com.sezzle.calculator.strategy;

import org.junit.jupiter.api.Test;

import java.math.BigDecimal;

import static org.assertj.core.api.Assertions.assertThat;

class MultiplyStrategyTest {
    private final MultiplyStrategy strategy = new MultiplyStrategy();

    @Test
    void multipliesTwoNumbers() {
        BigDecimal result = strategy.apply(new BigDecimal("4"), new BigDecimal("3"));
        assertThat(result).isEqualByComparingTo("12");
    }

    @Test
    void returnsMultiplyOperationType() {
        assertThat(strategy.getOperationType()).isEqualTo(OperationType.MULTIPLY);
    }
}
