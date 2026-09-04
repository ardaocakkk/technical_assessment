package com.sezzle.calculator.service;

import com.sezzle.calculator.dto.CalculationRequest;
import com.sezzle.calculator.model.CalculationHistory;
import com.sezzle.calculator.repository.CalculationHistoryRepository;
import lombok.RequiredArgsConstructor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;

@Service
@RequiredArgsConstructor
public class CalculationHistoryService {
    private static final Logger log = LoggerFactory.getLogger(CalculationHistoryService.class);

    private final CalculationHistoryRepository repository;

    public void save(String clientId, CalculationRequest request, BigDecimal result) {
        CalculationHistory entry = CalculationHistory.builder()
                .clientId(clientId)
                .operation(request.getOperation().name())
                .operandA(request.getOperandA())
                .operandB(request.getOperandB())
                .result(result)
                .createdAt(Instant.now())
                .build();
        repository.save(entry);
        log.info("Saved calculation history for clientId={} operation={}", clientId, request.getOperation());
    }

    public List<CalculationHistory> getLatest(String clientId) {
        List<CalculationHistory> history = repository.findTop10ByClientIdOrderByCreatedAtDesc(clientId);
        log.info("Fetched {} history entries for clientId={}", history.size(), clientId);
        return history;
    }
}
