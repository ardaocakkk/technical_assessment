package com.sezzle.calculator.strategy;

import com.sezzle.calculator.exception.InvalidOperationException;
import org.junit.jupiter.api.Test;

import java.math.BigDecimal;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

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
    void rejectsNonIntegerExponent() {
        assertThatThrownBy(() -> strategy.apply(new BigDecimal("2"), new BigDecimal("2.5")))
                .isInstanceOf(InvalidOperationException.class)
                .hasMessage("Exponent must be an integer");
    }

    @Test
    void rejectsExponentAboveMagnitudeLimit() {
        assertThatThrownBy(() -> strategy.apply(new BigDecimal("2"), new BigDecimal("999999999")))
                .isInstanceOf(InvalidOperationException.class)
                .hasMessage("Exponent magnitude must not exceed 1000");
    }

    @Test
    void rejectsNegativeExponentBelowMagnitudeLimit() {
        assertThatThrownBy(() -> strategy.apply(new BigDecimal("2"), new BigDecimal("-1001")))
                .isInstanceOf(InvalidOperationException.class)
                .hasMessage("Exponent magnitude must not exceed 1000");
    }

    @Test
    void allowsExponentAtMagnitudeLimit() {
        assertThat(strategy.apply(new BigDecimal("2"), new BigDecimal("1000"))).isNotNull();
    }

    @Test
    void returnsExponentOperationType() {
        assertThat(strategy.getOperationType()).isEqualTo(OperationType.EXPONENT);
    }
}
