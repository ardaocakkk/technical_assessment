package com.sezzle.calculator.strategy;

import com.sezzle.calculator.exception.InvalidOperationException;
import org.junit.jupiter.api.Test;

import java.math.BigDecimal;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class SqrtStrategyTest {
    private final SqrtStrategy strategy = new SqrtStrategy();

    @Test
    void computesSquareRoot() {
        BigDecimal result = strategy.apply(new BigDecimal("9"), null);
        assertThat(result).isEqualByComparingTo("3");
    }

    @Test
    void throwsOnNegativeOperand() {
        assertThatThrownBy(() -> strategy.apply(new BigDecimal("-4"), null))
                .isInstanceOf(InvalidOperationException.class)
                .hasMessageContaining("negative");
    }

    @Test
    void returnsSqrtOperationType() {
        assertThat(strategy.getOperationType()).isEqualTo(OperationType.SQRT);
    }
}
