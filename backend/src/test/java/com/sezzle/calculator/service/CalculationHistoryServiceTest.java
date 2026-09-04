package com.sezzle.calculator.service;

import com.sezzle.calculator.dto.CalculationRequest;
import com.sezzle.calculator.model.CalculationHistory;
import com.sezzle.calculator.repository.CalculationHistoryRepository;
import com.sezzle.calculator.strategy.OperationType;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;

import java.math.BigDecimal;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

class CalculationHistoryServiceTest {
    private final CalculationHistoryRepository repository = mock(CalculationHistoryRepository.class);
    private final CalculationHistoryService service = new CalculationHistoryService(repository);

    @Test
    void savePersistsEntryWithRequestFieldsAndResult() {
        CalculationRequest request = new CalculationRequest();
        request.setOperation(OperationType.ADD);
        request.setOperandA(new BigDecimal("2"));
        request.setOperandB(new BigDecimal("3"));

        service.save("client-1", request, new BigDecimal("5"));

        ArgumentCaptor<CalculationHistory> captor = ArgumentCaptor.forClass(CalculationHistory.class);
        verify(repository).save(captor.capture());
        CalculationHistory saved = captor.getValue();
        assertThat(saved.getClientId()).isEqualTo("client-1");
        assertThat(saved.getOperation()).isEqualTo("ADD");
        assertThat(saved.getOperandA()).isEqualByComparingTo("2");
        assertThat(saved.getOperandB()).isEqualByComparingTo("3");
        assertThat(saved.getResult()).isEqualByComparingTo("5");
        assertThat(saved.getCreatedAt()).isNotNull();
    }

    @Test
    void getLatestDelegatesToRepository() {
        CalculationHistory entry = CalculationHistory.builder()
                .id(1L).clientId("client-1").operation("ADD")
                .operandA(new BigDecimal("2")).operandB(new BigDecimal("3"))
                .result(new BigDecimal("5")).build();
        when(repository.findTop10ByClientIdOrderByCreatedAtDesc("client-1"))
                .thenReturn(List.of(entry));

        List<CalculationHistory> result = service.getLatest("client-1");

        assertThat(result).containsExactly(entry);
    }
}
