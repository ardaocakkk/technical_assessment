package com.sezzle.calculator.model;

import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.Instant;

@Entity
@Table(name = "calculation_history")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class CalculationHistory {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private String clientId;

    private String operation;

    private BigDecimal operandA;

    private BigDecimal operandB;

    private BigDecimal result;

    private Instant createdAt;
}
