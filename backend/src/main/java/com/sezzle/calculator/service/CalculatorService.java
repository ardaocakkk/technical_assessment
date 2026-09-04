package com.sezzle.calculator.service;

import com.sezzle.calculator.dto.CalculationRequest;
import com.sezzle.calculator.exception.InvalidOperationException;
import com.sezzle.calculator.strategy.OperationStrategy;
import com.sezzle.calculator.strategy.OperationType;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.util.List;
import java.util.Map;
import java.util.function.Function;
import java.util.stream.Collectors;

@Service
public class CalculatorService {
    private static final Logger log = LoggerFactory.getLogger(CalculatorService.class);

    private final Map<OperationType, OperationStrategy> strategies;

    public CalculatorService(List<OperationStrategy> strategyList) {
        this.strategies = strategyList.stream()
                .collect(Collectors.toMap(OperationStrategy::getOperationType, Function.identity()));
    }

    public BigDecimal calculate(CalculationRequest request) {
        OperationType operation = request.getOperation();
        log.debug("Dispatching to strategy for operation={}", operation);
        OperationStrategy strategy = strategies.get(operation);
        if (strategy == null) {
            throw new InvalidOperationException("Unsupported operation: " + operation);
        }
        if (!operation.isUnary() && request.getOperandB() == null) {
            throw new InvalidOperationException("operandB is required for operation " + operation);
        }
        return strategy.apply(request.getOperandA(), request.getOperandB());
    }
}
