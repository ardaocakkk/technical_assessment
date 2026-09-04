package com.sezzle.calculator.strategy;

import org.junit.jupiter.api.Test;

import java.math.BigDecimal;

import static org.assertj.core.api.Assertions.assertThat;

class ExponentStrategyTest {
    private final ExponentStrategy strategy = new ExponentStrategy();

    @Test
    void raisesToPositiveIntegerExponent() {
        BigDecimal result = strategy.apply(new BigDecimal("2"), new BigDecimal("3"));
        assertThat(result).isEqualByComparingTo("8");
    }

    @Test
    void raisesToZeroExponent() {
        BigDecimal result = strategy.apply(new BigDecimal("5"), BigDecimal.ZERO);
        assertThat(result).isEqualByComparingTo("1");
    }

    @Test
    void raisesToNegativeExponent() {
        BigDecimal result = strategy.apply(new BigDecimal("2"), new BigDecimal("-2"));
        assertThat(result).isEqualByComparingTo("0.25");
    }

    @Test
    void returnsExponentOperationType() {
        assertThat(strategy.getOperationType()).isEqualTo(OperationType.EXPONENT);
    }
}
