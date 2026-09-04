package com.sezzle.calculator.controller;

import com.sezzle.calculator.dto.CalculationHistoryResponse;
import com.sezzle.calculator.mapper.CalculationHistoryMapper;
import com.sezzle.calculator.service.CalculationHistoryService;
import lombok.RequiredArgsConstructor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api")
@RequiredArgsConstructor
public class CalculationHistoryController {
    private static final Logger log = LoggerFactory.getLogger(CalculationHistoryController.class);

    private final CalculationHistoryService calculationHistoryService;
    private final CalculationHistoryMapper calculationHistoryMapper;

    @GetMapping("/history")
    public ResponseEntity<List<CalculationHistoryResponse>> getHistory(
            @RequestHeader("X-Client-Id") String clientId) {
        log.info("Received history request for clientId={}", clientId);
        List<CalculationHistoryResponse> response = calculationHistoryService.getLatest(clientId).stream()
                .map(calculationHistoryMapper::toResponse)
                .toList();
        return ResponseEntity.ok(response);
    }
}
