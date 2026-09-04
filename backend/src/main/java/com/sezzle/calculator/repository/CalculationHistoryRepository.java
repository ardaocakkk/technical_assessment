package com.sezzle.calculator.repository;

import com.sezzle.calculator.model.CalculationHistory;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface CalculationHistoryRepository extends JpaRepository<CalculationHistory, Long> {
    List<CalculationHistory> findTop10ByClientIdOrderByCreatedAtDesc(String clientId);
}
