package com.sezzle.calculator.controller;

import com.sezzle.calculator.dto.CalculationRequest;
import com.sezzle.calculator.dto.CalculationResponse;
import com.sezzle.calculator.service.CalculatorService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.math.BigDecimal;

@RestController
@RequestMapping("/api")
@RequiredArgsConstructor
public class CalculatorController {
    private final CalculatorService calculatorService;

    @PostMapping("/calculate")
    public ResponseEntity<CalculationResponse> calculate(@Valid @RequestBody CalculationRequest request) {
        BigDecimal result = calculatorService.calculate(request);
        return ResponseEntity.ok(new CalculationResponse(result));
    }
}
