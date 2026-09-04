package com.sezzle.calculator.dto;

import lombok.AllArgsConstructor;
import lombok.Data;

import java.math.BigDecimal;

@Data
@AllArgsConstructor
public class CalculationResponse {
    private BigDecimal result;
}
