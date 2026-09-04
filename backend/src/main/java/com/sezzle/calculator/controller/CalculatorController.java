package com.sezzle.calculator.controller;

import com.sezzle.calculator.dto.CalculationRequest;
import com.sezzle.calculator.dto.CalculationResponse;
import com.sezzle.calculator.service.CalculationHistoryService;
import com.sezzle.calculator.service.CalculatorService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.math.BigDecimal;

@RestController
@RequestMapping("/api")
@RequiredArgsConstructor
public class CalculatorController {
    private static final Logger log = LoggerFactory.getLogger(CalculatorController.class);

    private final CalculatorService calculatorService;
    private final CalculationHistoryService calculationHistoryService;

    @PostMapping("/calculate")
    public ResponseEntity<CalculationResponse> calculate(
            @Valid @RequestBody CalculationRequest request,
            @RequestHeader(value = "X-Client-Id", required = false) String clientId) {
        log.info("Received calculate request: operation={}", request.getOperation());
        BigDecimal result = calculatorService.calculate(request);
        if (clientId != null) {
            calculationHistoryService.save(clientId, request, result);
        }
        log.info("Calculation succeeded: operation={} result={}", request.getOperation(), result);
        return ResponseEntity.ok(new CalculationResponse(result));
    }
}
