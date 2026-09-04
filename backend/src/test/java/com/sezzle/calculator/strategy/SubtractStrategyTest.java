package com.sezzle.calculator.strategy;

import org.junit.jupiter.api.Test;

import java.math.BigDecimal;

import static org.assertj.core.api.Assertions.assertThat;

class SubtractStrategyTest {
    private final SubtractStrategy strategy = new SubtractStrategy();

    @Test
    void subtractsSecondFromFirst() {
        BigDecimal result = strategy.apply(new BigDecimal("5"), new BigDecimal("3"));
        assertThat(result).isEqualByComparingTo("2");
    }

    @Test
    void returnsSubtractOperationType() {
        assertThat(strategy.getOperationType()).isEqualTo(OperationType.SUBTRACT);
    }
}
