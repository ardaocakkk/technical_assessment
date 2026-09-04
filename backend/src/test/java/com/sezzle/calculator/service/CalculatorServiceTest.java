package com.sezzle.calculator.service;

import com.sezzle.calculator.dto.CalculationRequest;
import com.sezzle.calculator.exception.InvalidOperationException;
import com.sezzle.calculator.strategy.OperationStrategy;
import com.sezzle.calculator.strategy.OperationType;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.math.BigDecimal;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

class CalculatorServiceTest {
    private OperationStrategy addStrategy;
    private OperationStrategy sqrtStrategy;
    private CalculatorService service;

    @BeforeEach
    void setUp() {
        addStrategy = mock(OperationStrategy.class);
        when(addStrategy.getOperationType()).thenReturn(OperationType.ADD);
        when(addStrategy.apply(new BigDecimal("2"), new BigDecimal("3"))).thenReturn(new BigDecimal("5"));

        sqrtStrategy = mock(OperationStrategy.class);
        when(sqrtStrategy.getOperationType()).thenReturn(OperationType.SQRT);
        when(sqrtStrategy.apply(new BigDecimal("9"), null)).thenReturn(new BigDecimal("3"));

        service = new CalculatorService(List.of(addStrategy, sqrtStrategy));
    }

    @Test
    void delegatesToMatchingBinaryStrategy() {
        CalculationRequest request = new CalculationRequest();
        request.setOperation(OperationType.ADD);
        request.setOperandA(new BigDecimal("2"));
        request.setOperandB(new BigDecimal("3"));

        BigDecimal result = service.calculate(request);

        assertThat(result).isEqualByComparingTo("5");
    }

    @Test
    void delegatesToMatchingUnaryStrategyWithoutOperandB() {
        CalculationRequest request = new CalculationRequest();
        request.setOperation(OperationType.SQRT);
        request.setOperandA(new BigDecimal("9"));

        BigDecimal result = service.calculate(request);

        assertThat(result).isEqualByComparingTo("3");
    }

    @Test
    void throwsWhenOperandBMissingForBinaryOperation() {
        CalculationRequest request = new CalculationRequest();
        request.setOperation(OperationType.ADD);
        request.setOperandA(new BigDecimal("2"));

        assertThatThrownBy(() -> service.calculate(request))
                .isInstanceOf(InvalidOperationException.class)
                .hasMessageContaining("operandB is required");
    }

    @Test
    void throwsWhenNoStrategyRegisteredForOperation() {
        CalculationRequest request = new CalculationRequest();
        request.setOperation(OperationType.MULTIPLY);
        request.setOperandA(new BigDecimal("2"));
        request.setOperandB(new BigDecimal("3"));

        assertThatThrownBy(() -> service.calculate(request))
                .isInstanceOf(InvalidOperationException.class)
                .hasMessageContaining("Unsupported operation");
    }
}
