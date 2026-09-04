package com.sezzle.calculator.strategy;

import org.junit.jupiter.api.Test;

import java.math.BigDecimal;

import static org.assertj.core.api.Assertions.assertThat;

class AddStrategyTest {
    private final AddStrategy strategy = new AddStrategy();

    @Test
    void addsTwoPositiveNumbers() {
        BigDecimal result = strategy.apply(new BigDecimal("2"), new BigDecimal("3"));
        assertThat(result).isEqualByComparingTo("5");
    }

    @Test
    void returnsAddOperationType() {
        assertThat(strategy.getOperationType()).isEqualTo(OperationType.ADD);
    }
}
