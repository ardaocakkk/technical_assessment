package com.sezzle.calculator.strategy;

import com.sezzle.calculator.exception.InvalidOperationException;
import org.junit.jupiter.api.Test;

import java.math.BigDecimal;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class DivideStrategyTest {
    private final DivideStrategy strategy = new DivideStrategy();

    @Test
    void dividesTwoNumbers() {
        BigDecimal result = strategy.apply(new BigDecimal("10"), new BigDecimal("4"));
        assertThat(result).isEqualByComparingTo("2.5");
    }

    @Test
    void throwsOnDivideByZero() {
        assertThatThrownBy(() -> strategy.apply(new BigDecimal("10"), BigDecimal.ZERO))
                .isInstanceOf(InvalidOperationException.class)
                .hasMessageContaining("divide by zero");
    }

    @Test
    void returnsDivideOperationType() {
        assertThat(strategy.getOperationType()).isEqualTo(OperationType.DIVIDE);
    }
}
