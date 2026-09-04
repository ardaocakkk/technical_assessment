package com.sezzle.calculator.strategy;

import org.junit.jupiter.api.Test;

import java.math.BigDecimal;

import static org.assertj.core.api.Assertions.assertThat;

class PercentageStrategyTest {
    private final PercentageStrategy strategy = new PercentageStrategy();

    @Test
    void computesPercentageOfValue() {
        // 20% of 50 = 10
        BigDecimal result = strategy.apply(new BigDecimal("50"), new BigDecimal("20"));
        assertThat(result).isEqualByComparingTo("10");
    }

    @Test
    void returnsPercentageOperationType() {
        assertThat(strategy.getOperationType()).isEqualTo(OperationType.PERCENTAGE);
    }
}
