package com.sezzle.calculator.mapper;

import com.sezzle.calculator.dto.CalculationHistoryResponse;
import com.sezzle.calculator.model.CalculationHistory;
import org.mapstruct.Mapper;

@Mapper(componentModel = "spring")
public interface CalculationHistoryMapper {
    CalculationHistoryResponse toResponse(CalculationHistory entity);
}
