package com.sezzle.calculator.strategy;

public enum OperationType {
    ADD, SUBTRACT, MULTIPLY, DIVIDE, EXPONENT, SQRT, PERCENTAGE;

    /** SQRT takes a single operand; every other operation is binary. */
    public boolean isUnary() {
        return this == SQRT;
    }
}
