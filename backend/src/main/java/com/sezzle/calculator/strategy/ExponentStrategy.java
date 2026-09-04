package com.sezzle.calculator.strategy;

import com.sezzle.calculator.exception.InvalidOperationException;
import org.springframework.stereotype.Component;

import java.math.BigDecimal;
import java.math.RoundingMode;

@Component
public class ExponentStrategy implements OperationStrategy {
    private static final int SCALE = 10;

    /**
     * Upper bound on |exponent|. BigDecimal.pow with a huge exponent would attempt to
     * build a number with hundreds of millions of digits, burning CPU/heap on an
     * unauthenticated endpoint, so oversized exponents are rejected as bad input.
     */
    private static final int MAX_EXPONENT_MAGNITUDE = 1000;

    @Override
    public OperationType getOperationType() {
        return OperationType.EXPONENT;
    }

    @Override
    public BigDecimal apply(BigDecimal operandA, BigDecimal operandB) {
        int exponent;
        try {
            exponent = operandB.intValueExact();
        } catch (ArithmeticException ex) {
            throw new InvalidOperationException("Exponent must be an integer");
        }
        if (Math.abs(exponent) > MAX_EXPONENT_MAGNITUDE) {
            throw new InvalidOperationException("Exponent magnitude must not exceed " + MAX_EXPONENT_MAGNITUDE);
        }
        if (exponent >= 0) {
            return operandA.pow(exponent).stripTrailingZeros();
        }
        BigDecimal positivePower = operandA.pow(-exponent);
        return BigDecimal.ONE.divide(positivePower, SCALE, RoundingMode.HALF_UP).stripTrailingZeros();
    }
}
