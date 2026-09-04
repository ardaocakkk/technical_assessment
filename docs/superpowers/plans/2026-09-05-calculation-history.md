# Calculation History + Casio-Styled Frontend Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Persist successful calculations to Postgres scoped by an anonymous client ID, expose the last 10 via a new endpoint, and restyle the frontend calculator in the visual language of a Casio FX-991ES with a history panel.

**Architecture:** Backend gains a `model`/`repository`/`service`/`controller` slice for `CalculationHistory` (JPA + Postgres), wired into the existing `CalculatorController` via an optional `X-Client-Id` header — a calculation is saved only when the header is present, so existing behavior without it is unchanged. Frontend generates/persists a client ID in `localStorage`, sends it on every request, and adds a `useHistory` (`useQuery`) hook alongside the existing `useCalculate` (`useMutation`) — the same TanStack Query split rationale as the original design, now using both primitives for the purpose each is actually for.

**Tech Stack:** Spring Data JPA, PostgreSQL (`postgres:16-alpine` in Docker), MapStruct 1.6.3, SLF4J · TanStack Query `useQuery`, `crypto.randomUUID()` + `localStorage`

**Spec:** `docs/superpowers/specs/2026-09-05-calculation-history-design.md`

## Global Constraints

- Repository method, exact signature: `List<CalculationHistory> findTop10ByClientIdOrderByCreatedAtDesc(String clientId)`.
- `CalculationHistory` lives in the `model` package (not `entity`), per explicit instruction.
- `X-Client-Id` on `POST /api/calculate` is optional — absence must not change existing behavior or break existing tests. `X-Client-Id` on `GET /api/history` is required — absence returns 400.
- Only **successful** calculations are saved to history.
- No Testcontainers, no `@DataJpaTest`/`@SpringBootTest` against a real database — all new backend tests use Mockito-mocked repositories/services, consistent with the existing test style in this codebase.
- No Casio logo/wordmark rendered in the UI — visual language only.
- Existing button labels/roles/test-ids (`display`, digit/operation button accessible names) must not change — only styling.

---

## Task 1: Backend Postgres/JPA/MapStruct dependencies + datasource config

**Files:**
- Modify: `backend/pom.xml`
- Modify: `backend/src/main/resources/application.yml`

**Interfaces:**
- Produces: `spring-boot-starter-data-jpa`, `org.postgresql:postgresql`, and MapStruct (`org.mapstruct:mapstruct` + annotation processor) available on the classpath for all later backend tasks. `spring.datasource.*` configured for local (non-Docker) dev against `localhost:5432`.

- [ ] **Step 1: Add dependencies to `backend/pom.xml`**

Add inside `<properties>`:
```xml
<mapstruct.version>1.6.3</mapstruct.version>
```

Add inside `<dependencies>` (after the existing `spring-boot-starter-validation` dependency):
```xml
<dependency>
  <groupId>org.springframework.boot</groupId>
  <artifactId>spring-boot-starter-data-jpa</artifactId>
</dependency>
<dependency>
  <groupId>org.postgresql</groupId>
  <artifactId>postgresql</artifactId>
  <scope>runtime</scope>
</dependency>
<dependency>
  <groupId>org.mapstruct</groupId>
  <artifactId>mapstruct</artifactId>
  <version>${mapstruct.version}</version>
</dependency>
```

- [ ] **Step 2: Configure annotation processing for Lombok + MapStruct together**

Inside `<build><plugins>`, add a `maven-compiler-plugin` block (it doesn't exist yet in this `pom.xml`) right before the `spring-boot-maven-plugin` entry:
```xml
<plugin>
  <groupId>org.apache.maven.plugins</groupId>
  <artifactId>maven-compiler-plugin</artifactId>
  <configuration>
    <annotationProcessorPaths>
      <path>
        <groupId>org.projectlombok</groupId>
        <artifactId>lombok</artifactId>
        <version>${lombok.version}</version>
      </path>
      <path>
        <groupId>org.mapstruct</groupId>
        <artifactId>mapstruct-processor</artifactId>
        <version>${mapstruct.version}</version>
      </path>
      <path>
        <groupId>org.projectlombok</groupId>
        <artifactId>lombok-mapstruct-binding</artifactId>
        <version>0.2.0</version>
      </path>
    </annotationProcessorPaths>
  </configuration>
</plugin>
```
`${lombok.version}` is inherited from the `spring-boot-starter-parent` BOM as a property — no need to define it yourself. Without `lombok-mapstruct-binding`, Lombok-generated getters/setters on `CalculationHistory` (Task 2) may not be visible to the MapStruct processor when it runs.

- [ ] **Step 3: Add datasource config to `backend/src/main/resources/application.yml`**

Replace the file's full content with:
```yaml
server:
  port: 8080

spring:
  application:
    name: calculator
  datasource:
    url: jdbc:postgresql://localhost:5432/calculator
    username: calculator
    password: calculator
  jpa:
    hibernate:
      ddl-auto: update
    open-in-view: false
```

- [ ] **Step 4: Verify the project compiles**

Run: `cd backend && mvn -q compile`
Expected: `BUILD SUCCESS`. (No `@Entity`/`@Mapper` classes exist yet — this only verifies the new dependencies and annotation-processor config resolve cleanly.)

- [ ] **Step 5: Commit**

```bash
git add backend/pom.xml backend/src/main/resources/application.yml
git commit -m "chore(backend): add Postgres/JPA/MapStruct dependencies and datasource config"
```

---

## Task 2: CalculationHistory entity

**Files:**
- Create: `backend/src/main/java/com/sezzle/calculator/model/CalculationHistory.java`

**Interfaces:**
- Produces: `CalculationHistory` — fields `id` (Long), `clientId` (String), `operation` (String), `operandA`/`operandB`/`result` (BigDecimal, `operandB` nullable), `createdAt` (Instant). Lombok `@Builder`, `@Data`, `@NoArgsConstructor`, `@AllArgsConstructor`. Used by Task 3 (repository), Task 4 (mapper), Task 5 (service).

- [ ] **Step 1: Create the entity**

```java
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
```

- [ ] **Step 2: Verify it compiles**

Run: `cd backend && mvn -q compile`
Expected: `BUILD SUCCESS`

- [ ] **Step 3: Commit**

```bash
git add backend/src/main/java/com/sezzle/calculator/model/CalculationHistory.java
git commit -m "feat(backend): add CalculationHistory entity"
```

---

## Task 3: CalculationHistoryRepository

**Files:**
- Create: `backend/src/main/java/com/sezzle/calculator/repository/CalculationHistoryRepository.java`

**Interfaces:**
- Consumes: `CalculationHistory` (Task 2).
- Produces: `CalculationHistoryRepository extends JpaRepository<CalculationHistory, Long>` with `findTop10ByClientIdOrderByCreatedAtDesc(String clientId): List<CalculationHistory>`. Used by Task 5 (service).

- [ ] **Step 1: Create the repository**

```java
package com.sezzle.calculator.repository;

import com.sezzle.calculator.model.CalculationHistory;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface CalculationHistoryRepository extends JpaRepository<CalculationHistory, Long> {
    List<CalculationHistory> findTop10ByClientIdOrderByCreatedAtDesc(String clientId);
}
```

- [ ] **Step 2: Verify it compiles**

Run: `cd backend && mvn -q compile`
Expected: `BUILD SUCCESS`

- [ ] **Step 3: Commit**

```bash
git add backend/src/main/java/com/sezzle/calculator/repository/CalculationHistoryRepository.java
git commit -m "feat(backend): add CalculationHistoryRepository"
```

---

## Task 4: CalculationHistoryResponse DTO + CalculationHistoryMapper

**Files:**
- Create: `backend/src/main/java/com/sezzle/calculator/dto/CalculationHistoryResponse.java`
- Create: `backend/src/main/java/com/sezzle/calculator/mapper/CalculationHistoryMapper.java`
- Test: `backend/src/test/java/com/sezzle/calculator/mapper/CalculationHistoryMapperTest.java`

**Interfaces:**
- Consumes: `CalculationHistory` (Task 2).
- Produces: `CalculationHistoryResponse{ Long id, String operation, BigDecimal operandA, BigDecimal operandB, BigDecimal result, Instant createdAt }`; `CalculationHistoryMapper.toResponse(CalculationHistory): CalculationHistoryResponse` (MapStruct, `componentModel = "spring"`, generates `CalculationHistoryMapperImpl`). Used by Task 6 (controller).

- [ ] **Step 1: Write the failing test**

```java
package com.sezzle.calculator.mapper;

import com.sezzle.calculator.dto.CalculationHistoryResponse;
import com.sezzle.calculator.model.CalculationHistory;
import org.junit.jupiter.api.Test;

import java.math.BigDecimal;
import java.time.Instant;

import static org.assertj.core.api.Assertions.assertThat;

class CalculationHistoryMapperTest {
    private final CalculationHistoryMapper mapper = new CalculationHistoryMapperImpl();

    @Test
    void mapsAllFieldsFromEntityToResponse() {
        Instant now = Instant.parse("2026-01-01T00:00:00Z");
        CalculationHistory entity = CalculationHistory.builder()
                .id(1L)
                .clientId("client-1")
                .operation("ADD")
                .operandA(new BigDecimal("2"))
                .operandB(new BigDecimal("3"))
                .result(new BigDecimal("5"))
                .createdAt(now)
                .build();

        CalculationHistoryResponse response = mapper.toResponse(entity);

        assertThat(response.getId()).isEqualTo(1L);
        assertThat(response.getOperation()).isEqualTo("ADD");
        assertThat(response.getOperandA()).isEqualByComparingTo("2");
        assertThat(response.getOperandB()).isEqualByComparingTo("3");
        assertThat(response.getResult()).isEqualByComparingTo("5");
        assertThat(response.getCreatedAt()).isEqualTo(now);
    }
}
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd backend && mvn -q test -Dtest=CalculationHistoryMapperTest`
Expected: FAIL — compile error, `CalculationHistoryResponse`, `CalculationHistoryMapper`, and `CalculationHistoryMapperImpl` don't exist yet.

- [ ] **Step 3: Create the DTO**

```java
package com.sezzle.calculator.dto;

import lombok.AllArgsConstructor;
import lombok.Data;

import java.math.BigDecimal;
import java.time.Instant;

@Data
@AllArgsConstructor
public class CalculationHistoryResponse {
    private Long id;
    private String operation;
    private BigDecimal operandA;
    private BigDecimal operandB;
    private BigDecimal result;
    private Instant createdAt;
}
```

- [ ] **Step 4: Create the mapper interface**

```java
package com.sezzle.calculator.mapper;

import com.sezzle.calculator.dto.CalculationHistoryResponse;
import com.sezzle.calculator.model.CalculationHistory;
import org.mapstruct.Mapper;

@Mapper(componentModel = "spring")
public interface CalculationHistoryMapper {
    CalculationHistoryResponse toResponse(CalculationHistory entity);
}
```
Field names match exactly between `CalculationHistory` and `CalculationHistoryResponse`, so MapStruct maps them automatically — no `@Mapping` annotations needed. `CalculationHistoryMapperImpl` is generated at compile time by the annotation processor configured in Task 1.

- [ ] **Step 5: Run test to verify it passes**

Run: `cd backend && mvn -q test -Dtest=CalculationHistoryMapperTest`
Expected: PASS (1 test)

- [ ] **Step 6: Commit**

```bash
git add backend/src/main/java/com/sezzle/calculator/dto/CalculationHistoryResponse.java backend/src/main/java/com/sezzle/calculator/mapper/CalculationHistoryMapper.java backend/src/test/java/com/sezzle/calculator/mapper/CalculationHistoryMapperTest.java
git commit -m "feat(backend): add CalculationHistoryResponse DTO and MapStruct mapper"
```

---

## Task 5: CalculationHistoryService (with SLF4J logging)

**Files:**
- Create: `backend/src/main/java/com/sezzle/calculator/service/CalculationHistoryService.java`
- Test: `backend/src/test/java/com/sezzle/calculator/service/CalculationHistoryServiceTest.java`

**Interfaces:**
- Consumes: `CalculationHistoryRepository` (Task 3), `CalculationHistory` (Task 2), `CalculationRequest` (existing, `dto` package).
- Produces: `CalculationHistoryService.save(String clientId, CalculationRequest request, BigDecimal result): void`; `CalculationHistoryService.getLatest(String clientId): List<CalculationHistory>`. Used by Task 6 (controller) and Task 7 (`CalculatorController` wiring).

- [ ] **Step 1: Write the failing tests**

```java
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
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd backend && mvn -q test -Dtest=CalculationHistoryServiceTest`
Expected: FAIL — `CalculationHistoryService` does not exist.

- [ ] **Step 3: Implement the service**

```java
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
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `cd backend && mvn -q test -Dtest=CalculationHistoryServiceTest`
Expected: PASS (2 tests)

- [ ] **Step 5: Commit**

```bash
git add backend/src/main/java/com/sezzle/calculator/service/CalculationHistoryService.java backend/src/test/java/com/sezzle/calculator/service/CalculationHistoryServiceTest.java
git commit -m "feat(backend): add CalculationHistoryService with logging"
```

---

## Task 6: MissingRequestHeaderException handling + CalculationHistoryController

**Files:**
- Modify: `backend/src/main/java/com/sezzle/calculator/exception/GlobalExceptionHandler.java`
- Create: `backend/src/main/java/com/sezzle/calculator/controller/CalculationHistoryController.java`
- Test: `backend/src/test/java/com/sezzle/calculator/controller/CalculationHistoryControllerTest.java`

**Interfaces:**
- Consumes: `CalculationHistoryService` (Task 5), `CalculationHistoryMapper` (Task 4), `CalculationHistory` (Task 2), `CorsConfig`/`JacksonConfig` (existing, `config` package).
- Produces: `GET /api/history` endpoint — the frontend's history-fetch contract (Task 10 consumes this).

- [ ] **Step 1: Write the failing controller test**

```java
package com.sezzle.calculator.controller;

import com.sezzle.calculator.config.CorsConfig;
import com.sezzle.calculator.config.JacksonConfig;
import com.sezzle.calculator.mapper.CalculationHistoryMapperImpl;
import com.sezzle.calculator.model.CalculationHistory;
import com.sezzle.calculator.service.CalculationHistoryService;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.webmvc.test.autoconfigure.WebMvcTest;
import org.springframework.context.annotation.Import;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

import java.math.BigDecimal;
import java.util.List;

import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest(CalculationHistoryController.class)
@Import({CorsConfig.class, JacksonConfig.class, CalculationHistoryMapperImpl.class})
class CalculationHistoryControllerTest {
    @Autowired
    private MockMvc mockMvc;

    @MockitoBean
    private CalculationHistoryService calculationHistoryService;

    @Test
    void returnsHistoryForValidClientId() throws Exception {
        CalculationHistory entry = CalculationHistory.builder()
                .id(1L).clientId("client-1").operation("ADD")
                .operandA(new BigDecimal("2")).operandB(new BigDecimal("3"))
                .result(new BigDecimal("5")).build();
        when(calculationHistoryService.getLatest("client-1")).thenReturn(List.of(entry));

        mockMvc.perform(get("/api/history").header("X-Client-Id", "client-1"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].operation").value("ADD"))
                .andExpect(jsonPath("$[0].result").value(5));
    }

    @Test
    void returns400WhenClientIdHeaderMissing() throws Exception {
        mockMvc.perform(get("/api/history"))
                .andExpect(status().isBadRequest());
    }
}
```
(`@Import` includes `CalculationHistoryMapperImpl` directly — `@WebMvcTest`'s slice does not auto-detect plain `@Component`/generated-mapper beans, only controller-layer stereotypes, the same reason `CorsConfig` needed an explicit `@Import` in the existing `CalculatorControllerTest`.)

- [ ] **Step 2: Run test to verify it fails**

Run: `cd backend && mvn -q test -Dtest=CalculationHistoryControllerTest`
Expected: FAIL — `CalculationHistoryController` does not exist.

- [ ] **Step 3: Add the missing-header handler to `GlobalExceptionHandler.java`**

Add this import:
```java
import org.springframework.web.bind.MissingRequestHeaderException;
```
Add this handler method (anywhere among the other `@ExceptionHandler` methods, before the catch-all `Exception` handler):
```java
    @ExceptionHandler(MissingRequestHeaderException.class)
    public ResponseEntity<ErrorResponse> handleMissingHeader(MissingRequestHeaderException ex) {
        return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                .body(ErrorResponse.of("Missing required header: " + ex.getHeaderName()));
    }
```

- [ ] **Step 4: Implement `CalculationHistoryController.java`**

```java
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
```

- [ ] **Step 5: Run test to verify it passes**

Run: `cd backend && mvn -q test -Dtest=CalculationHistoryControllerTest`
Expected: PASS (2 tests)

- [ ] **Step 6: Commit**

```bash
git add backend/src/main/java/com/sezzle/calculator/exception/GlobalExceptionHandler.java backend/src/main/java/com/sezzle/calculator/controller/CalculationHistoryController.java backend/src/test/java/com/sezzle/calculator/controller/CalculationHistoryControllerTest.java
git commit -m "feat(backend): add GET /api/history endpoint"
```

---

## Task 7: Wire CalculatorController to save history + logging on CalculatorController/CalculatorService

**Files:**
- Modify: `backend/src/main/java/com/sezzle/calculator/controller/CalculatorController.java`
- Modify: `backend/src/main/java/com/sezzle/calculator/service/CalculatorService.java`
- Modify: `backend/src/test/java/com/sezzle/calculator/controller/CalculatorControllerTest.java`

**Interfaces:**
- Consumes: `CalculationHistoryService.save(...)` (Task 5).
- Produces: `CalculatorController` now takes `X-Client-Id` (optional) and saves history on success — no change to `POST /api/calculate`'s response contract.

- [ ] **Step 1: Add the new test cases to `CalculatorControllerTest.java`**

Add this field alongside the existing `@MockitoBean private CalculatorService calculatorService;`:
```java
    @MockitoBean
    private CalculationHistoryService calculationHistoryService;
```
Add this import:
```java
import com.sezzle.calculator.service.CalculationHistoryService;
```
Add these two test methods (anywhere in the class):
```java
    @Test
    void savesHistoryWhenClientIdHeaderPresent() throws Exception {
        when(calculatorService.calculate(any())).thenReturn(new BigDecimal("5"));

        mockMvc.perform(post("/api/calculate")
                        .header("X-Client-Id", "client-1")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(
                                Map.of("operation", "ADD", "operandA", 2, "operandB", 3))))
                .andExpect(status().isOk());

        verify(calculationHistoryService).save(eq("client-1"), any(), eq(new BigDecimal("5")));
    }

    @Test
    void doesNotSaveHistoryWhenClientIdHeaderAbsent() throws Exception {
        when(calculatorService.calculate(any())).thenReturn(new BigDecimal("5"));

        mockMvc.perform(post("/api/calculate")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(
                                Map.of("operation", "ADD", "operandA", 2, "operandB", 3))))
                .andExpect(status().isOk());

        verify(calculationHistoryService, never()).save(any(), any(), any());
    }
```
Add these static imports alongside the existing ones:
```java
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
```

- [ ] **Step 2: Run tests to verify the two new ones fail**

Run: `cd backend && mvn -q test -Dtest=CalculatorControllerTest`
Expected: FAIL — `CalculatorController` doesn't yet depend on `CalculationHistoryService`, so `@MockitoBean` wiring/compile fails or `verify` finds no interaction.

- [ ] **Step 3: Modify `CalculatorController.java`**

```java
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
```

- [ ] **Step 4: Add logging to `CalculatorService.java`**

Add these imports:
```java
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
```
Add this field (first line inside the class body):
```java
    private static final Logger log = LoggerFactory.getLogger(CalculatorService.class);
```
In the `calculate` method, add this line immediately after resolving `operation` (i.e. after `OperationType operation = request.getOperation();`):
```java
        log.debug("Dispatching to strategy for operation={}", operation);
```

- [ ] **Step 5: Run tests to verify they pass**

Run: `cd backend && mvn -q test -Dtest=CalculatorControllerTest`
Expected: PASS (all cases, including the 2 new ones)

- [ ] **Step 6: Run the full backend suite**

Run: `cd backend && mvn -q test`
Expected: all tests PASS, no regressions.

- [ ] **Step 7: Commit**

```bash
git add backend/src/main/java/com/sezzle/calculator/controller/CalculatorController.java backend/src/main/java/com/sezzle/calculator/service/CalculatorService.java backend/src/test/java/com/sezzle/calculator/controller/CalculatorControllerTest.java
git commit -m "feat(backend): save calculation history on successful calculate when X-Client-Id present"
```

---

## Task 8: Postgres in docker-compose

**Files:**
- Modify: `docker-compose.yml`

**Interfaces:**
- Produces: a `postgres` service the `backend` service depends on and connects to inside the Docker network.

- [ ] **Step 1: Replace `docker-compose.yml` with**

```yaml
services:
  postgres:
    image: postgres:16-alpine
    environment:
      POSTGRES_DB: calculator
      POSTGRES_USER: calculator
      POSTGRES_PASSWORD: calculator
    volumes:
      - postgres_data:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U calculator"]
      interval: 5s
      timeout: 5s
      retries: 5

  backend:
    build: ./backend
    ports:
      - "8080:8080"
    environment:
      SPRING_DATASOURCE_URL: jdbc:postgresql://postgres:5432/calculator
      SPRING_DATASOURCE_USERNAME: calculator
      SPRING_DATASOURCE_PASSWORD: calculator
    depends_on:
      postgres:
        condition: service_healthy

  frontend:
    build:
      context: ./frontend
      args:
        VITE_API_BASE_URL: http://localhost:8080
    ports:
      - "5173:80"
    depends_on:
      - backend

volumes:
  postgres_data:
```

- [ ] **Step 2: Verify the full stack runs**

Run: `docker compose up --build -d`
Expected: all three containers start; `curl -s -X POST http://localhost:8080/api/calculate -H "Content-Type: application/json" -H "X-Client-Id: test-client" -d "{\"operation\":\"ADD\",\"operandA\":2,\"operandB\":3}"` returns `{"result":5}`; `curl -s http://localhost:8080/api/history -H "X-Client-Id: test-client"` returns a JSON array containing that calculation.

Run afterward: `docker compose down`

- [ ] **Step 3: Commit**

```bash
git add docker-compose.yml
git commit -m "chore: add Postgres service to docker-compose"
```

---

## Task 9: Frontend client ID

**Files:**
- Create: `frontend/src/lib/clientId.ts`
- Test: `frontend/src/lib/clientId.test.ts`

**Interfaces:**
- Produces: `getClientId(): string` — generates and persists a UUID in `localStorage` on first call, returns the same value on later calls. Used by Task 10 (`calculatorApi.ts`).

- [ ] **Step 1: Write the failing tests**

```ts
import { describe, it, expect, beforeEach } from 'vitest';
import { getClientId } from './clientId';

describe('getClientId', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('generates and stores a new client id on first call', () => {
    const id = getClientId();
    expect(id).toMatch(/^[0-9a-f-]{36}$/);
    expect(localStorage.getItem('calculator_client_id')).toBe(id);
  });

  it('returns the same id on subsequent calls', () => {
    const first = getClientId();
    const second = getClientId();
    expect(second).toBe(first);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd frontend && npm test -- clientId.test.ts`
Expected: FAIL — `./clientId` module does not exist.

- [ ] **Step 3: Implement `frontend/src/lib/clientId.ts`**

```ts
const CLIENT_ID_KEY = 'calculator_client_id';

export function getClientId(): string {
  let clientId = localStorage.getItem(CLIENT_ID_KEY);
  if (!clientId) {
    clientId = crypto.randomUUID();
    localStorage.setItem(CLIENT_ID_KEY, clientId);
  }
  return clientId;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd frontend && npm test -- clientId.test.ts`
Expected: PASS (2 tests)

- [ ] **Step 5: Commit**

```bash
git add frontend/src/lib/clientId.ts frontend/src/lib/clientId.test.ts
git commit -m "feat(frontend): add anonymous client id (localStorage-backed)"
```

---

## Task 10: API client — X-Client-Id header + fetchHistory

**Files:**
- Modify: `frontend/src/types/calculator.ts`
- Modify: `frontend/src/api/calculatorApi.ts`
- Modify: `frontend/src/api/calculatorApi.test.ts`

**Interfaces:**
- Consumes: `getClientId` (Task 9).
- Produces: `HistoryEntry{ id: number, operation: OperationType, operandA: number, operandB: number | null, result: number, createdAt: string }` type; `fetchHistory(): Promise<HistoryEntry[]>`. Used by Task 11 (`useHistory`).

- [ ] **Step 1: Add `HistoryEntry` to `frontend/src/types/calculator.ts`**

Append to the end of the file:
```ts
export interface HistoryEntry {
  id: number;
  operation: OperationType;
  operandA: number;
  operandB: number | null;
  result: number;
  createdAt: string;
}
```

- [ ] **Step 2: Write the failing tests**

Replace `frontend/src/api/calculatorApi.test.ts` with:
```ts
import { describe, it, expect, vi, afterEach } from 'vitest';
import { calculate, fetchHistory } from './calculatorApi';

vi.mock('../lib/clientId', () => ({
  getClientId: () => 'test-client-id',
}));

describe('calculate', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('returns the parsed result on success', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ result: 5 }),
    });
    vi.stubGlobal('fetch', fetchMock);

    const result = await calculate({ operation: 'ADD', operandA: 2, operandB: 3 });

    expect(result).toEqual({ result: 5 });
    expect(fetchMock).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({
        headers: expect.objectContaining({ 'X-Client-Id': 'test-client-id' }),
      }),
    );
  });

  it('throws with the backend error message on failure', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: false,
      json: async () => ({ message: 'Cannot divide by zero', timestamp: '2026-09-04T00:00:00Z' }),
    }));

    await expect(calculate({ operation: 'DIVIDE', operandA: 5, operandB: 0 }))
      .rejects.toThrow('Cannot divide by zero');
  });
});

describe('fetchHistory', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('returns the parsed history list on success', async () => {
    const entries = [
      { id: 1, operation: 'ADD', operandA: 2, operandB: 3, result: 5, createdAt: '2026-09-05T00:00:00Z' },
    ];
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      json: async () => entries,
    }));

    const result = await fetchHistory();

    expect(result).toEqual(entries);
  });

  it('throws with the backend error message on failure', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: false,
      json: async () => ({ message: 'Missing required header: X-Client-Id', timestamp: '2026-09-05T00:00:00Z' }),
    }));

    await expect(fetchHistory()).rejects.toThrow('Missing required header: X-Client-Id');
  });
});
```

- [ ] **Step 3: Run tests to verify they fail**

Run: `cd frontend && npm test -- calculatorApi.test.ts`
Expected: FAIL — `fetchHistory` is not exported; the `X-Client-Id` header assertion fails against the current implementation.

- [ ] **Step 4: Replace `frontend/src/api/calculatorApi.ts` with**

```ts
import type { ApiError, CalculationRequest, CalculationResponse, HistoryEntry } from '../types/calculator';
import { getClientId } from '../lib/clientId';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:8080';

export async function calculate(request: CalculationRequest): Promise<CalculationResponse> {
  const response = await fetch(`${API_BASE_URL}/api/calculate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-Client-Id': getClientId() },
    body: JSON.stringify(request),
  });

  if (!response.ok) {
    const error = (await response.json()) as ApiError;
    throw new Error(error.message);
  }

  return (await response.json()) as CalculationResponse;
}

export async function fetchHistory(): Promise<HistoryEntry[]> {
  const response = await fetch(`${API_BASE_URL}/api/history`, {
    headers: { 'X-Client-Id': getClientId() },
  });

  if (!response.ok) {
    const error = (await response.json()) as ApiError;
    throw new Error(error.message);
  }

  return (await response.json()) as HistoryEntry[];
}
```

- [ ] **Step 5: Run tests to verify they pass**

Run: `cd frontend && npm test -- calculatorApi.test.ts`
Expected: PASS (4 tests)

- [ ] **Step 6: Commit**

```bash
git add frontend/src/types/calculator.ts frontend/src/api/calculatorApi.ts frontend/src/api/calculatorApi.test.ts
git commit -m "feat(frontend): send X-Client-Id header, add fetchHistory"
```

---

## Task 11: useHistory hook + history invalidation on calculate

**Files:**
- Create: `frontend/src/hooks/useHistory.ts`
- Test: `frontend/src/hooks/useHistory.test.tsx`
- Modify: `frontend/src/hooks/useCalculate.ts`
- Modify: `frontend/src/hooks/useCalculate.test.tsx`

**Interfaces:**
- Consumes: `fetchHistory` (Task 10).
- Produces: `useHistory(): UseQueryResult<HistoryEntry[], Error>`. `useCalculate` now invalidates the `['history']` query key on success. Used by Task 13 (`Calculator.tsx`).

- [ ] **Step 1: Write the failing test for `useHistory`**

```tsx
import { describe, it, expect, vi, afterEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { ReactNode } from 'react';
import { useHistory } from './useHistory';
import * as calculatorApi from '../api/calculatorApi';

function createWrapper() {
  const queryClient = new QueryClient();
  return ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
}

describe('useHistory', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('fetches history and exposes the result', async () => {
    vi.spyOn(calculatorApi, 'fetchHistory').mockResolvedValue([
      { id: 1, operation: 'ADD', operandA: 2, operandB: 3, result: 5, createdAt: '2026-09-05T00:00:00Z' },
    ]);

    const { result } = renderHook(() => useHistory(), { wrapper: createWrapper() });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toHaveLength(1);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd frontend && npm test -- useHistory.test.tsx`
Expected: FAIL — `./useHistory` module does not exist.

- [ ] **Step 3: Implement `frontend/src/hooks/useHistory.ts`**

```ts
import { useQuery } from '@tanstack/react-query';
import { fetchHistory } from '../api/calculatorApi';

export function useHistory() {
  return useQuery({
    queryKey: ['history'],
    queryFn: fetchHistory,
  });
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd frontend && npm test -- useHistory.test.tsx`
Expected: PASS (1 test)

- [ ] **Step 5: Add the failing invalidation test to `useCalculate.test.tsx`**

Add this test to the existing `describe('useCalculate', ...)` block:
```tsx
  it('invalidates the history query on success', async () => {
    vi.spyOn(calculatorApi, 'calculate').mockResolvedValue({ result: 5 });
    const queryClient = new QueryClient();
    const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries');
    const wrapper = ({ children }: { children: ReactNode }) => (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    );

    const { result } = renderHook(() => useCalculate(), { wrapper });
    result.current.mutate({ operation: 'ADD', operandA: 2, operandB: 3 });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ['history'] });
  });
```

- [ ] **Step 6: Run test to verify it fails**

Run: `cd frontend && npm test -- useCalculate.test.tsx`
Expected: FAIL — `useCalculate` doesn't invalidate anything yet.

- [ ] **Step 7: Modify `frontend/src/hooks/useCalculate.ts`**

```ts
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { calculate } from '../api/calculatorApi';
import type { CalculationRequest } from '../types/calculator';

export function useCalculate() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (request: CalculationRequest) => calculate(request),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['history'] });
    },
  });
}
```

- [ ] **Step 8: Run tests to verify they pass**

Run: `cd frontend && npm test -- useCalculate.test.tsx useHistory.test.tsx`
Expected: PASS (2 tests in `useCalculate.test.tsx`, 1 in `useHistory.test.tsx`)

- [ ] **Step 9: Commit**

```bash
git add frontend/src/hooks/useHistory.ts frontend/src/hooks/useHistory.test.tsx frontend/src/hooks/useCalculate.ts frontend/src/hooks/useCalculate.test.tsx
git commit -m "feat(frontend): add useHistory query, invalidate history after calculate"
```

---

## Task 12: History component

**Files:**
- Create: `frontend/src/components/Calculator/History.tsx`
- Test: `frontend/src/components/Calculator/History.test.tsx`

**Interfaces:**
- Consumes: `HistoryEntry` (Task 10).
- Produces: `History` component with prop `{ entries: HistoryEntry[] }`. Used by Task 13 (`Calculator.tsx`).

- [ ] **Step 1: Write the failing tests**

```tsx
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { History } from './History';

describe('History', () => {
  it('renders an empty state with no entries', () => {
    render(<History entries={[]} />);
    expect(screen.getByTestId('history')).toHaveTextContent('No calculations yet.');
  });

  it('renders a list of entries', () => {
    render(
      <History
        entries={[
          { id: 1, operation: 'ADD', operandA: 2, operandB: 3, result: 5, createdAt: '2026-09-05T00:00:00.000Z' },
        ]}
      />,
    );
    expect(screen.getByTestId('history')).toHaveTextContent('2 ADD 3 = 5');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd frontend && npm test -- History.test.tsx`
Expected: FAIL — `./History` module does not exist.

- [ ] **Step 3: Implement `frontend/src/components/Calculator/History.tsx`**

```tsx
import type { HistoryEntry } from '../../types/calculator';

interface HistoryProps {
  entries: HistoryEntry[];
}

export function History({ entries }: HistoryProps) {
  if (entries.length === 0) {
    return (
      <div data-testid="history" className="mt-4 text-xs text-neutral-400">
        No calculations yet.
      </div>
    );
  }

  return (
    <ul data-testid="history" className="mt-4 max-h-32 space-y-1 overflow-y-auto text-xs text-neutral-300">
      {entries.map((entry) => (
        <li key={entry.id} className="flex justify-between border-b border-neutral-700 py-1">
          <span>
            {entry.operandA} {entry.operation} {entry.operandB ?? ''} = {entry.result}
          </span>
          <span className="text-neutral-500">{new Date(entry.createdAt).toLocaleTimeString()}</span>
        </li>
      ))}
    </ul>
  );
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd frontend && npm test -- History.test.tsx`
Expected: PASS (2 tests)

- [ ] **Step 5: Commit**

```bash
git add frontend/src/components/Calculator/History.tsx frontend/src/components/Calculator/History.test.tsx
git commit -m "feat(frontend): add History panel component"
```

---

## Task 13: Casio FX-991ES restyle + wire History into Calculator

**Files:**
- Modify: `frontend/src/components/Calculator/Display.tsx`
- Modify: `frontend/src/components/Calculator/Keypad.tsx`
- Modify: `frontend/src/components/Calculator/Calculator.tsx`
- Modify: `frontend/src/components/Calculator/Calculator.test.tsx`

**Interfaces:**
- Consumes: `useHistory` (Task 11), `History` (Task 12).
- Produces: no change to `Display`/`Keypad` props or button accessible names — styling only. `Calculator` now renders `<History>` below the keypad.

- [ ] **Step 1: Replace `frontend/src/components/Calculator/Display.tsx` with**

```tsx
interface DisplayProps {
  operandA: string;
  operation: string | null;
  operandB: string;
  result: string | null;
  error: string | null;
}

export function Display({ operandA, operation, operandB, result, error }: DisplayProps) {
  let content: string;
  if (error) {
    content = error;
  } else if (result !== null) {
    content = result;
  } else {
    content = [operandA || '0', operation, operandB].filter(Boolean).join(' ');
  }

  return (
    <div
      data-testid="display"
      className={`w-full rounded-md border-2 p-4 text-right text-2xl font-mono break-all ${
        error
          ? 'border-red-900 bg-red-950 text-red-300'
          : 'border-lime-900 bg-lime-100 text-neutral-900'
      }`}
    >
      {content}
    </div>
  );
}
```

- [ ] **Step 2: Replace `frontend/src/components/Calculator/Keypad.tsx` with**

```tsx
import type { OperationType } from '../../types/calculator';

interface KeypadProps {
  onDigit: (digit: string) => void;
  onOperation: (operation: OperationType) => void;
  onEquals: () => void;
  onClear: () => void;
}

const OPERATION_BUTTONS: { label: string; operation: OperationType }[] = [
  { label: '+', operation: 'ADD' },
  { label: '-', operation: 'SUBTRACT' },
  { label: '×', operation: 'MULTIPLY' },
  { label: '÷', operation: 'DIVIDE' },
  { label: '^', operation: 'EXPONENT' },
  { label: '√', operation: 'SQRT' },
  { label: '%', operation: 'PERCENTAGE' },
];

const digitClass =
  'rounded-md bg-neutral-100 p-3 text-base font-semibold text-neutral-900 shadow active:scale-95 transition hover:bg-white';
const operationClass =
  'rounded-md bg-neutral-700 p-3 text-base font-semibold text-neutral-100 shadow active:scale-95 transition hover:bg-neutral-600';

export function Keypad({ onDigit, onOperation, onEquals, onClear }: KeypadProps) {
  return (
    <div className="grid grid-cols-4 gap-2 rounded-xl bg-neutral-800 p-3 sm:gap-3">
      {['7', '8', '9', '4', '5', '6', '1', '2', '3', '0', '.'].map((digit) => (
        <button key={digit} type="button" className={digitClass} onClick={() => onDigit(digit)}>
          {digit}
        </button>
      ))}
      {OPERATION_BUTTONS.map(({ label, operation }) => (
        <button
          key={operation}
          type="button"
          className={operationClass}
          onClick={() => onOperation(operation)}
        >
          {label}
        </button>
      ))}
      <button
        type="button"
        className="rounded-md bg-red-800 p-3 text-base font-semibold text-red-50 shadow active:scale-95 transition hover:bg-red-700"
        onClick={onClear}
      >
        C
      </button>
      <button
        type="button"
        className="rounded-md bg-orange-600 p-3 text-base font-semibold text-white shadow active:scale-95 transition hover:bg-orange-500"
        onClick={onEquals}
      >
        =
      </button>
    </div>
  );
}
```

- [ ] **Step 3: Replace `frontend/src/components/Calculator/Calculator.tsx` with**

```tsx
import { useCalculatorStore } from '../../store/calculatorStore';
import { useCalculate } from '../../hooks/useCalculate';
import { useHistory } from '../../hooks/useHistory';
import { isUnaryOperation } from '../../types/calculator';
import { Display } from './Display';
import { Keypad } from './Keypad';
import { History } from './History';

export function Calculator() {
  const { operandA, operandB, operation, setOperandA, setOperandB, setOperation, reset } =
    useCalculatorStore();
  const { mutate, data, error, reset: resetMutation } = useCalculate();
  const history = useHistory();

  const enteringOperandB = operation !== null;

  function handleDigit(digit: string) {
    resetMutation();
    if (enteringOperandB) {
      setOperandB(operandB + digit);
    } else {
      setOperandA(operandA + digit);
    }
  }

  function handleOperation(nextOperation: Parameters<typeof setOperation>[0]) {
    resetMutation();
    setOperation(nextOperation);
  }

  function handleEquals() {
    if (operation === null || operandA === '') {
      return;
    }
    const unary = isUnaryOperation(operation);
    if (!unary && operandB === '') {
      return;
    }
    mutate({
      operation,
      operandA: Number(operandA),
      operandB: unary ? undefined : Number(operandB),
    });
  }

  function handleClear() {
    resetMutation();
    reset();
  }

  return (
    <div className="mx-auto mt-10 w-full max-w-xs rounded-2xl bg-neutral-900 p-4 shadow-2xl sm:max-w-sm">
      <div className="mb-3 text-center text-[10px] tracking-widest text-neutral-400">
        fx-CALC · SOLAR
      </div>
      <Display
        operandA={operandA}
        operation={operation}
        operandB={operandB}
        result={data ? String(data.result) : null}
        error={error ? error.message : null}
      />
      <div className="mt-4">
        <Keypad
          onDigit={handleDigit}
          onOperation={handleOperation}
          onEquals={handleEquals}
          onClear={handleClear}
        />
      </div>
      <History entries={history.data ?? []} />
    </div>
  );
}
```

- [ ] **Step 4: Update `frontend/src/components/Calculator/Calculator.test.tsx`**

Add this import:
```tsx
import { beforeEach } from 'vitest';
```
(Vitest globals are already enabled per `vitest.config.ts`, so `beforeEach`/`afterEach`/etc. don't strictly need importing, but this file's existing style imports them explicitly alongside `describe`/`it`/`expect` — add `beforeEach` to the existing `import { describe, it, expect, vi, afterEach } from 'vitest';` line instead of a separate import line, i.e. change it to:)
```tsx
import { describe, it, expect, vi, afterEach, beforeEach } from 'vitest';
```
Add this `beforeEach` inside the `describe('Calculator', ...)` block, alongside the existing `afterEach`:
```tsx
  beforeEach(() => {
    vi.spyOn(calculatorApi, 'fetchHistory').mockResolvedValue([]);
  });
```
This prevents `useHistory` from making a real network call during these tests (it isn't otherwise mocked, since these tests only ever mocked `calculatorApi.calculate`).

- [ ] **Step 5: Run the full frontend suite**

Run: `cd frontend && npm test`
Expected: all tests PASS, no regressions, no console noise about failed fetches.

- [ ] **Step 6: Verify the build still succeeds**

Run: `cd frontend && npm run build`
Expected: succeeds.

- [ ] **Step 7: Commit**

```bash
git add frontend/src/components/Calculator/Display.tsx frontend/src/components/Calculator/Keypad.tsx frontend/src/components/Calculator/Calculator.tsx frontend/src/components/Calculator/Calculator.test.tsx
git commit -m "feat(frontend): restyle calculator in Casio FX-991ES visual language, wire in History panel"
```

---

## Self-Review Notes

- **Spec coverage:** model/repository/service/controller (Tasks 2-3, 5-7), Postgres + docker-compose (Tasks 1, 8), MapStruct entity↔DTO mapping (Task 4, as originally deferred in the core-phase spec), SLF4J logging (Tasks 5-7), client ID generation + header (Tasks 9-10), history-scoped-to-client "10 latest" (Task 3's repository method + Task 6), frontend history panel (Tasks 11-13), Casio restyle restricted to supported operations (Task 13), tests added/modified throughout every task. No spec section without a task.
- **Placeholder scan:** no TBD/TODO markers; every step has complete, real code.
- **Type consistency:** `CalculationHistory` fields (`id, clientId, operation, operandA, operandB, result, createdAt`) match between the entity (Task 2), the mapper's source (Task 4), and the service (Task 5). `CalculationHistoryResponse` fields match what `CalculationHistoryController` returns (Task 6) and what `HistoryEntry` on the frontend expects (Task 10) — `operation` as `String`/`OperationType` string-compatible, `operandA`/`operandB`/`result` as numeric, `createdAt` as `Instant`/ISO string. `getClientId()` (Task 9) is consumed identically by both `calculate` and `fetchHistory` (Task 10).
