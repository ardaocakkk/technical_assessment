# Calculation History + Casio-Styled Frontend Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Persist successful calculations to Postgres scoped by an anonymous client ID, expose the last 10 via a new endpoint, and restyle the frontend calculator in the visual language of a Casio FX-991ES with a history panel.

**Architecture:** Backend gains a `model`/`repository`/`service`/`controller` slice for `CalculationHistory` (JPA + Postgres), wired into the existing `CalculatorController` via an optional `X-Client-Id` header — a calculation is saved only when the header is present, so existing behavior without it is unchanged. Frontend generates/persists a client ID in `localStorage`, sends it on every request, and adds a `useHistory` (`useQuery`) hook alongside the existing `useCalculate` (`useMutation`) — the same TanStack Query split rationale as the original design, now using both primitives for the purpose each is actually for.

**Tech Stack:** Spring Data JPA, PostgreSQL (`postgres:16-alpine` in Docker), MapStruct 1.6.3, SLF4J · TanStack Query `useQuery`/`useMutation`, Axios, `useReducer`, `crypto.randomUUID()` + `localStorage`

**Revision note (mid-execution, after Tasks 1-8 backend + old Tasks 9-13 frontend were originally planned):** the user requested a full state-management refactor of the frontend before Tasks 9-13 executed — replacing the Zustand store with a `useReducer`-based finite-state-machine hook (`useCalculatorLogic`, fixing three real bugs: digits appending onto a stale result, no operation-chaining, multiple decimal points) and replacing `fetch` with Axios in the API layer. Tasks 9-13 below are the *replacement* set — the original Zustand-based versions were never implemented (Tasks 1-8 backend were already complete and are unaffected).

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

## Task 9: Add Axios dependency

**Files:**
- Modify: `frontend/package.json`

**Interfaces:**
- Produces: `axios` available as a dependency for Task 11 (API client).

**Note:** `zustand` and `frontend/src/store/calculatorStore.ts`/`calculatorStore.test.ts` are deliberately NOT removed in this task, even though the new architecture no longer needs them — `Calculator.tsx` still imports `calculatorStore` until Task 15 rewrites it. Removing the store earlier would break the build/tests in the meantime. Task 15 removes both the import and the files together, in the same commit that stops needing them.

- [ ] **Step 1: Install Axios**

Run: `cd frontend && npm install axios`

- [ ] **Step 2: Verify the frontend suite still passes (no code changes yet, just a new dependency)**

Run: `cd frontend && npm test`
Expected: PASS, same test count as before.

- [ ] **Step 3: Commit**

```bash
git add frontend/package.json frontend/package-lock.json
git commit -m "chore(frontend): add axios dependency"
```

---

## Task 10: Frontend client ID

**Files:**
- Create: `frontend/src/lib/clientId.ts`
- Test: `frontend/src/lib/clientId.test.ts`

**Interfaces:**
- Produces: `getClientId(): string` — generates and persists a UUID in `localStorage` on first call, returns the same value on later calls. Used by Task 11 (`calculatorApi.ts`).

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

## Task 11: Axios API client — X-Client-Id interceptor + fetchHistory

**Files:**
- Modify: `frontend/src/types/calculator.ts`
- Create: `frontend/src/api/calculatorApi.ts` (replaces the existing `fetch`-based file entirely)
- Create: `frontend/src/api/calculatorApi.test.ts` (replaces the existing file entirely)

**Interfaces:**
- Consumes: `getClientId` (Task 10), `axios` (Task 9).
- Produces: `apiClient` (a configured `AxiosInstance`, exported for tests); `HistoryEntry{ id: number, operation: OperationType, operandA: number, operandB: number | null, result: number, createdAt: string }` type; `calculate(request): Promise<CalculationResponse>`; `fetchHistory(): Promise<HistoryEntry[]>`. Used by Task 12 (nothing — the FSM hook has no API knowledge), Task 13 (`useCalculate`/`useHistory`).

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
import { apiClient, calculate, fetchHistory } from './calculatorApi';

vi.mock('../lib/clientId', () => ({
  getClientId: () => 'test-client-id',
}));

describe('calculate', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('returns the parsed result on success', async () => {
    vi.spyOn(apiClient, 'post').mockResolvedValue({ data: { result: 5 } });

    const result = await calculate({ operation: 'ADD', operandA: 2, operandB: 3 });

    expect(result).toEqual({ result: 5 });
  });

  it('posts to /api/calculate with the request body', async () => {
    const postSpy = vi.spyOn(apiClient, 'post').mockResolvedValue({ data: { result: 5 } });

    await calculate({ operation: 'ADD', operandA: 2, operandB: 3 });

    expect(postSpy).toHaveBeenCalledWith('/api/calculate', { operation: 'ADD', operandA: 2, operandB: 3 });
  });

  it('throws with the backend error message on failure', async () => {
    vi.spyOn(apiClient, 'post').mockRejectedValue({
      isAxiosError: true,
      response: { data: { message: 'Cannot divide by zero', timestamp: '2026-09-04T00:00:00Z' } },
    });

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
    vi.spyOn(apiClient, 'get').mockResolvedValue({ data: entries });

    const result = await fetchHistory();

    expect(result).toEqual(entries);
  });

  it('throws with the backend error message on failure', async () => {
    vi.spyOn(apiClient, 'get').mockRejectedValue({
      isAxiosError: true,
      response: { data: { message: 'Missing required header: X-Client-Id', timestamp: '2026-09-05T00:00:00Z' } },
    });

    await expect(fetchHistory()).rejects.toThrow('Missing required header: X-Client-Id');
  });
});
```
(Faking an Axios error as a plain object `{ isAxiosError: true, response: {...} }` — rather than constructing a real `AxiosError` — works because axios's own `axios.isAxiosError()` check is exactly `payload !== null && typeof payload === 'object' && payload.isAxiosError === true`; this is the standard way to test Axios error handling without needing a live request.)

- [ ] **Step 3: Run tests to verify they fail**

Run: `cd frontend && npm test -- calculatorApi.test.ts`
Expected: FAIL — `./calculatorApi` has no `apiClient` export yet (the file doesn't exist in this form).

- [ ] **Step 4: Replace `frontend/src/api/calculatorApi.ts` with**

```ts
import axios from 'axios';
import type { ApiError, CalculationRequest, CalculationResponse, HistoryEntry } from '../types/calculator';
import { getClientId } from '../lib/clientId';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:8080';

export const apiClient = axios.create({ baseURL: API_BASE_URL });

apiClient.interceptors.request.use((config) => {
  config.headers.set('X-Client-Id', getClientId());
  return config;
});

function extractErrorMessage(error: unknown): string {
  if (axios.isAxiosError(error)) {
    const apiError = error.response?.data as ApiError | undefined;
    if (apiError?.message) {
      return apiError.message;
    }
  }
  return 'Unexpected error';
}

export async function calculate(request: CalculationRequest): Promise<CalculationResponse> {
  try {
    const response = await apiClient.post<CalculationResponse>('/api/calculate', request);
    return response.data;
  } catch (error) {
    throw new Error(extractErrorMessage(error));
  }
}

export async function fetchHistory(): Promise<HistoryEntry[]> {
  try {
    const response = await apiClient.get<HistoryEntry[]>('/api/history');
    return response.data;
  } catch (error) {
    throw new Error(extractErrorMessage(error));
  }
}
```

- [ ] **Step 5: Run tests to verify they pass**

Run: `cd frontend && npm test -- calculatorApi.test.ts`
Expected: PASS (5 tests)

- [ ] **Step 6: Commit**

```bash
git add frontend/src/types/calculator.ts frontend/src/api/calculatorApi.ts frontend/src/api/calculatorApi.test.ts
git commit -m "feat(frontend): switch API client to axios, add X-Client-Id interceptor and fetchHistory"
```

---

## Task 12: useCalculatorLogic — useReducer finite-state-machine hook

**Files:**
- Create: `frontend/src/hooks/useCalculatorLogic.ts`
- Test: `frontend/src/hooks/useCalculatorLogic.test.ts`

**Interfaces:**
- Consumes: `CalculationRequest`, `OperationType`, `isUnaryOperation` (existing, `types/calculator.ts`).
- Produces: `useCalculatorLogic()` returning `{ operandA: string, operandB: string, operation: OperationType | null, phase: 'input' | 'result' | 'error', errorMessage: string | null, pendingRequest: CalculationRequest | null, enterDigit(digit: string), enterDecimal(), selectOperation(op: OperationType), submit(), clear(), acknowledgeRequestSent(), reportSuccess(result: number), reportError(message: string) }`. Used by Task 15 (`Calculator.tsx`, the connector).

This hook is pure client-side state — it has no knowledge of the API. It signals "ready to calculate" via `pendingRequest` (non-null); the connector (Task 15) is responsible for watching that field, calling `useCalculate`'s `mutate`, and reporting the outcome back via `reportSuccess`/`reportError`.

Fixes three real bugs from the previous Zustand-based implementation: (1) digits appending onto a stale result instead of starting fresh, (2) no way to chain operations (`2 + 3 +` had no defined behavior), (3) multiple decimal points allowed in one operand.

- [ ] **Step 1: Write the failing tests**

```ts
import { describe, it, expect } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useCalculatorLogic } from './useCalculatorLogic';

describe('useCalculatorLogic', () => {
  it('starts a fresh expression when a digit is pressed after a result', () => {
    const { result } = renderHook(() => useCalculatorLogic());

    act(() => {
      result.current.reportSuccess(5);
    });
    expect(result.current.phase).toBe('result');

    act(() => {
      result.current.enterDigit('7');
    });

    expect(result.current.operandA).toBe('7');
    expect(result.current.phase).toBe('input');
  });

  it('refuses a second decimal point in the same operand', () => {
    const { result } = renderHook(() => useCalculatorLogic());

    act(() => {
      result.current.enterDigit('1');
      result.current.enterDecimal();
      result.current.enterDigit('5');
      result.current.enterDecimal();
      result.current.enterDigit('9');
    });

    expect(result.current.operandA).toBe('1.59');
  });

  it('chains operations by requesting the pending calculation before continuing', () => {
    const { result } = renderHook(() => useCalculatorLogic());

    act(() => {
      result.current.enterDigit('2');
      result.current.selectOperation('ADD');
      result.current.enterDigit('3');
      result.current.selectOperation('MULTIPLY');
    });

    expect(result.current.pendingRequest).toEqual({ operation: 'ADD', operandA: 2, operandB: 3 });

    act(() => {
      result.current.acknowledgeRequestSent();
      result.current.reportSuccess(5);
    });

    expect(result.current.operandA).toBe('5');
    expect(result.current.operation).toBe('MULTIPLY');
    expect(result.current.operandB).toBe('');
    expect(result.current.phase).toBe('input');
  });

  it('does not request a calculation for an incomplete expression', () => {
    const { result } = renderHook(() => useCalculatorLogic());

    act(() => {
      result.current.enterDigit('2');
      result.current.selectOperation('ADD');
      result.current.submit();
    });

    expect(result.current.pendingRequest).toBeNull();
  });

  it('clears everything on clear', () => {
    const { result } = renderHook(() => useCalculatorLogic());

    act(() => {
      result.current.enterDigit('9');
      result.current.clear();
    });

    expect(result.current.operandA).toBe('');
    expect(result.current.phase).toBe('input');
  });

  it('reports an error and moves to the error phase', () => {
    const { result } = renderHook(() => useCalculatorLogic());

    act(() => {
      result.current.enterDigit('5');
      result.current.selectOperation('DIVIDE');
      result.current.enterDigit('0');
      result.current.submit();
      result.current.acknowledgeRequestSent();
      result.current.reportError('Cannot divide by zero');
    });

    expect(result.current.phase).toBe('error');
    expect(result.current.errorMessage).toBe('Cannot divide by zero');
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd frontend && npm test -- useCalculatorLogic.test.ts`
Expected: FAIL — `./useCalculatorLogic` module does not exist.

- [ ] **Step 3: Implement `frontend/src/hooks/useCalculatorLogic.ts`**

```ts
import { useReducer } from 'react';
import type { CalculationRequest, OperationType } from '../types/calculator';
import { isUnaryOperation } from '../types/calculator';

type Phase = 'input' | 'result' | 'error';

interface State {
  operandA: string;
  operandB: string;
  operation: OperationType | null;
  phase: Phase;
  errorMessage: string | null;
  pendingRequest: CalculationRequest | null;
  pendingIsChain: boolean;
}

type Action =
  | { type: 'DIGIT'; digit: string }
  | { type: 'DECIMAL' }
  | { type: 'OPERATION'; operation: OperationType }
  | { type: 'EQUALS' }
  | { type: 'CLEAR' }
  | { type: 'REQUEST_SENT' }
  | { type: 'CALCULATION_SUCCESS'; result: number }
  | { type: 'CALCULATION_ERROR'; message: string };

const initialState: State = {
  operandA: '',
  operandB: '',
  operation: null,
  phase: 'input',
  errorMessage: null,
  pendingRequest: null,
  pendingIsChain: false,
};

function appendDigit(current: string, digit: string): string {
  return current === '0' ? digit : current + digit;
}

function appendDecimal(current: string): string {
  if (current.includes('.')) {
    return current;
  }
  return current === '' ? '0.' : current + '.';
}

function buildRequest(state: State): CalculationRequest {
  const unary = state.operation !== null && isUnaryOperation(state.operation);
  return {
    operation: state.operation as OperationType,
    operandA: Number(state.operandA),
    operandB: unary ? undefined : Number(state.operandB),
  };
}

function reducer(state: State, action: Action): State {
  switch (action.type) {
    case 'DIGIT': {
      if (state.phase !== 'input') {
        return { ...initialState, operandA: action.digit };
      }
      return state.operation === null
        ? { ...state, operandA: appendDigit(state.operandA, action.digit) }
        : { ...state, operandB: appendDigit(state.operandB, action.digit) };
    }

    case 'DECIMAL': {
      if (state.phase !== 'input') {
        return { ...initialState, operandA: '0.' };
      }
      return state.operation === null
        ? { ...state, operandA: appendDecimal(state.operandA) }
        : { ...state, operandB: appendDecimal(state.operandB) };
    }

    case 'OPERATION': {
      if (state.operandA === '') {
        return state;
      }
      if (state.phase === 'input' && state.operation !== null && state.operandB !== '') {
        return {
          ...state,
          pendingRequest: buildRequest(state),
          pendingIsChain: true,
          operation: action.operation,
        };
      }
      return { ...state, operation: action.operation, phase: 'input' };
    }

    case 'EQUALS': {
      if (state.operation === null || state.operandA === '') {
        return state;
      }
      const unary = isUnaryOperation(state.operation);
      if (!unary && state.operandB === '') {
        return state;
      }
      return { ...state, pendingRequest: buildRequest(state), pendingIsChain: false };
    }

    case 'REQUEST_SENT':
      return { ...state, pendingRequest: null };

    case 'CALCULATION_SUCCESS':
      return state.pendingIsChain
        ? { ...initialState, operandA: String(action.result), operation: state.operation }
        : { ...initialState, operandA: String(action.result), phase: 'result' };

    case 'CALCULATION_ERROR':
      return { ...initialState, phase: 'error', errorMessage: action.message };

    case 'CLEAR':
      return initialState;

    default:
      return state;
  }
}

export function useCalculatorLogic() {
  const [state, dispatch] = useReducer(reducer, initialState);

  return {
    ...state,
    enterDigit: (digit: string) => dispatch({ type: 'DIGIT', digit }),
    enterDecimal: () => dispatch({ type: 'DECIMAL' }),
    selectOperation: (operation: OperationType) => dispatch({ type: 'OPERATION', operation }),
    submit: () => dispatch({ type: 'EQUALS' }),
    clear: () => dispatch({ type: 'CLEAR' }),
    acknowledgeRequestSent: () => dispatch({ type: 'REQUEST_SENT' }),
    reportSuccess: (result: number) => dispatch({ type: 'CALCULATION_SUCCESS', result }),
    reportError: (message: string) => dispatch({ type: 'CALCULATION_ERROR', message }),
  };
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `cd frontend && npm test -- useCalculatorLogic.test.ts`
Expected: PASS (6 tests)

- [ ] **Step 5: Commit**

```bash
git add frontend/src/hooks/useCalculatorLogic.ts frontend/src/hooks/useCalculatorLogic.test.ts
git commit -m "feat(frontend): add useCalculatorLogic FSM hook, replacing Zustand store logic"
```

---

## Task 13: useHistory hook + history invalidation on calculate

**Files:**
- Create: `frontend/src/hooks/useHistory.ts`
- Test: `frontend/src/hooks/useHistory.test.tsx`
- Modify: `frontend/src/hooks/useCalculate.ts`
- Modify: `frontend/src/hooks/useCalculate.test.tsx`

**Interfaces:**
- Consumes: `fetchHistory` (Task 11).
- Produces: `useHistory(): UseQueryResult<HistoryEntry[], Error>`. `useCalculate` now invalidates the `['history']` query key on success (in addition to its existing hook-level behavior) — the connector (Task 15) also passes per-call `onSuccess`/`onError` callbacks to `mutate(...)`, and both the hook-level and per-call callbacks run. Used by Task 15 (`Calculator.tsx`).

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

## Task 14: History component

**Files:**
- Create: `frontend/src/components/Calculator/History.tsx`
- Test: `frontend/src/components/Calculator/History.test.tsx`

**Interfaces:**
- Consumes: `HistoryEntry` (Task 11).
- Produces: `History` component with prop `{ entries: HistoryEntry[] }`. Used by Task 15 (`Calculator.tsx`).

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

## Task 15: Casio FX-991ES restyle + Calculator.tsx as connector (removes Zustand)

**Files:**
- Modify: `frontend/src/components/Calculator/Display.tsx`
- Modify: `frontend/src/components/Calculator/Keypad.tsx`
- Modify: `frontend/src/components/Calculator/Calculator.tsx`
- Modify: `frontend/src/components/Calculator/Calculator.test.tsx`
- Delete: `frontend/src/store/calculatorStore.ts`
- Delete: `frontend/src/store/calculatorStore.test.ts`

**Interfaces:**
- Consumes: `useCalculatorLogic` (Task 12), `useCalculate` (Task 13), `useHistory` (Task 13), `History` (Task 14).
- Produces: no change to `Display`/`Keypad` props or button accessible names — styling only. `Calculator` becomes a thin connector: it owns no calculation state itself, just wires `useCalculatorLogic`'s `pendingRequest` to `useCalculate`'s `mutate` and feeds the outcome back. This is the last file referencing `calculatorStore` — deleting the store here is safe because nothing else imports it after this commit.

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
  onDecimal: () => void;
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

export function Keypad({ onDigit, onDecimal, onOperation, onEquals, onClear }: KeypadProps) {
  return (
    <div className="grid grid-cols-4 gap-2 rounded-xl bg-neutral-800 p-3 sm:gap-3">
      {['7', '8', '9', '4', '5', '6', '1', '2', '3', '0'].map((digit) => (
        <button key={digit} type="button" className={digitClass} onClick={() => onDigit(digit)}>
          {digit}
        </button>
      ))}
      <button type="button" className={digitClass} onClick={onDecimal}>
        .
      </button>
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

- [ ] **Step 3: Update `frontend/src/components/Calculator/Keypad.test.tsx` for the new `onDecimal` prop**

The existing test file renders `<Keypad onDigit={...} onOperation={...} onEquals={...} onClear={...} />` for each test — `onDecimal` is now a required prop, so every one of those render calls needs `onDecimal={vi.fn()}` added. Replace the file with:
```tsx
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Keypad } from './Keypad';

describe('Keypad', () => {
  it('calls onDigit when a digit button is clicked', async () => {
    const onDigit = vi.fn();
    render(<Keypad onDigit={onDigit} onDecimal={vi.fn()} onOperation={vi.fn()} onEquals={vi.fn()} onClear={vi.fn()} />);

    await userEvent.click(screen.getByRole('button', { name: '7' }));

    expect(onDigit).toHaveBeenCalledWith('7');
  });

  it('calls onDecimal when the decimal button is clicked', async () => {
    const onDecimal = vi.fn();
    render(<Keypad onDigit={vi.fn()} onDecimal={onDecimal} onOperation={vi.fn()} onEquals={vi.fn()} onClear={vi.fn()} />);

    await userEvent.click(screen.getByRole('button', { name: '.' }));

    expect(onDecimal).toHaveBeenCalled();
  });

  it('calls onOperation with ADD when + is clicked', async () => {
    const onOperation = vi.fn();
    render(<Keypad onDigit={vi.fn()} onDecimal={vi.fn()} onOperation={onOperation} onEquals={vi.fn()} onClear={vi.fn()} />);

    await userEvent.click(screen.getByRole('button', { name: '+' }));

    expect(onOperation).toHaveBeenCalledWith('ADD');
  });

  it('calls onEquals when = is clicked', async () => {
    const onEquals = vi.fn();
    render(<Keypad onDigit={vi.fn()} onDecimal={vi.fn()} onOperation={vi.fn()} onEquals={onEquals} onClear={vi.fn()} />);

    await userEvent.click(screen.getByRole('button', { name: '=' }));

    expect(onEquals).toHaveBeenCalled();
  });

  it('calls onClear when C is clicked', async () => {
    const onClear = vi.fn();
    render(<Keypad onDigit={vi.fn()} onDecimal={vi.fn()} onOperation={vi.fn()} onEquals={vi.fn()} onClear={onClear} />);

    await userEvent.click(screen.getByRole('button', { name: 'C' }));

    expect(onClear).toHaveBeenCalled();
  });
});
```

- [ ] **Step 4: Run the Keypad test to verify it passes**

Run: `cd frontend && npm test -- Keypad.test.tsx`
Expected: PASS (5 tests)

- [ ] **Step 5: Replace `frontend/src/components/Calculator/Calculator.tsx` with**

```tsx
import { useEffect } from 'react';
import { useCalculatorLogic } from '../../hooks/useCalculatorLogic';
import { useCalculate } from '../../hooks/useCalculate';
import { useHistory } from '../../hooks/useHistory';
import { Display } from './Display';
import { Keypad } from './Keypad';
import { History } from './History';

export function Calculator() {
  const logic = useCalculatorLogic();
  const { mutate } = useCalculate();
  const history = useHistory();

  useEffect(() => {
    if (!logic.pendingRequest) {
      return;
    }
    const request = logic.pendingRequest;
    logic.acknowledgeRequestSent();
    mutate(request, {
      onSuccess: (response) => logic.reportSuccess(response.result),
      onError: (error) => logic.reportError(error.message),
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [logic.pendingRequest]);

  return (
    <div className="mx-auto mt-10 w-full max-w-xs rounded-2xl bg-neutral-900 p-4 shadow-2xl sm:max-w-sm">
      <div className="mb-3 text-center text-[10px] tracking-widest text-neutral-400">
        fx-CALC · SOLAR
      </div>
      <Display
        operandA={logic.operandA}
        operation={logic.operation}
        operandB={logic.operandB}
        result={logic.phase === 'result' ? logic.operandA : null}
        error={logic.phase === 'error' ? logic.errorMessage : null}
      />
      <div className="mt-4">
        <Keypad
          onDigit={logic.enterDigit}
          onDecimal={logic.enterDecimal}
          onOperation={logic.selectOperation}
          onEquals={logic.submit}
          onClear={logic.clear}
        />
      </div>
      <History entries={history.data ?? []} />
    </div>
  );
}
```
Note: the `.` button is wired to `logic.enterDecimal` (not `logic.enterDigit('.')`) so the reducer's decimal-point guard (Task 12) actually applies — this is why `Keypad.tsx` in Step 2 above takes a separate `onDecimal` prop rather than treating `.` as just another digit.

- [ ] **Step 6: Delete the Zustand store**

```bash
git rm frontend/src/store/calculatorStore.ts frontend/src/store/calculatorStore.test.ts
```

- [ ] **Step 7: Replace `frontend/src/components/Calculator/Calculator.test.tsx` with**

```tsx
import { describe, it, expect, vi, afterEach, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { ReactElement } from 'react';
import { Calculator } from './Calculator';
import * as calculatorApi from '../../api/calculatorApi';

function renderWithClient(ui: ReactElement) {
  const queryClient = new QueryClient();
  return render(<QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>);
}

describe('Calculator', () => {
  beforeEach(() => {
    vi.spyOn(calculatorApi, 'fetchHistory').mockResolvedValue([]);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('performs a calculation end-to-end and shows the result', async () => {
    vi.spyOn(calculatorApi, 'calculate').mockResolvedValue({ result: 5 });
    renderWithClient(<Calculator />);

    await userEvent.click(screen.getByRole('button', { name: '2' }));
    await userEvent.click(screen.getByRole('button', { name: '+' }));
    await userEvent.click(screen.getByRole('button', { name: '3' }));
    await userEvent.click(screen.getByRole('button', { name: '=' }));

    await waitFor(() => expect(screen.getByTestId('display')).toHaveTextContent('5'));
  });

  it('shows an error message when the API call fails', async () => {
    vi.spyOn(calculatorApi, 'calculate').mockRejectedValue(new Error('Cannot divide by zero'));
    renderWithClient(<Calculator />);

    await userEvent.click(screen.getByRole('button', { name: '5' }));
    await userEvent.click(screen.getByRole('button', { name: '÷' }));
    await userEvent.click(screen.getByRole('button', { name: '0' }));
    await userEvent.click(screen.getByRole('button', { name: '=' }));

    await waitFor(() =>
      expect(screen.getByTestId('display')).toHaveTextContent('Cannot divide by zero'),
    );
  });

  it('clear resets the display', async () => {
    renderWithClient(<Calculator />);

    await userEvent.click(screen.getByRole('button', { name: '7' }));
    await userEvent.click(screen.getByRole('button', { name: 'C' }));

    expect(screen.getByTestId('display')).toHaveTextContent('0');
  });

  it('starts a fresh expression after pressing a digit following a result', async () => {
    vi.spyOn(calculatorApi, 'calculate').mockResolvedValue({ result: 5 });
    renderWithClient(<Calculator />);

    await userEvent.click(screen.getByRole('button', { name: '2' }));
    await userEvent.click(screen.getByRole('button', { name: '+' }));
    await userEvent.click(screen.getByRole('button', { name: '3' }));
    await userEvent.click(screen.getByRole('button', { name: '=' }));
    await waitFor(() => expect(screen.getByTestId('display')).toHaveTextContent('5'));

    await userEvent.click(screen.getByRole('button', { name: '9' }));

    expect(screen.getByTestId('display')).toHaveTextContent('9');
  });
});
```

- [ ] **Step 8: Run the full frontend suite**

Run: `cd frontend && npm test`
Expected: all tests PASS, no regressions, no console noise about failed fetches, no references to `calculatorStore` remaining anywhere (confirm with `grep -r "calculatorStore" frontend/src` — expect no matches).

- [ ] **Step 9: Verify the build still succeeds**

Run: `cd frontend && npm run build`
Expected: succeeds.

- [ ] **Step 10: Commit**

```bash
git add -A frontend/src
git commit -m "feat(frontend): restyle calculator in Casio FX-991ES visual language, wire in History panel, replace Zustand with useCalculatorLogic connector"
```

---

## Self-Review Notes

- **Spec coverage:** model/repository/service/controller (Tasks 2-3, 5-7), Postgres + docker-compose (Tasks 1, 8), MapStruct entity↔DTO mapping (Task 4, as originally deferred in the core-phase spec), SLF4J logging (Tasks 5-7), client ID generation + header (Tasks 10-11), history-scoped-to-client "10 latest" (Task 3's repository method + Task 6), frontend history panel (Tasks 13-15), Casio restyle restricted to supported operations (Task 15), tests added/modified throughout every task. No spec section without a task.
- **Revision coverage (mid-execution refactor):** Zustand fully removed (Task 15 deletes it, Task 9 only adds Axios without touching Zustand to avoid an intermediate broken build), `useCalculatorLogic` FSM covers all three named bugs (fresh-start-after-result, decimal guard, operation chaining — Task 12's tests), Axios replaces `fetch` with the same `X-Client-Id` header behavior via a request interceptor (Task 11), `Calculator.tsx` is a pure connector with no calculation state of its own (Task 15).
- **Placeholder scan:** no TBD/TODO markers; every step has complete, real code.
- **Type consistency:** `CalculationHistory` fields (`id, clientId, operation, operandA, operandB, result, createdAt`) match between the entity (Task 2), the mapper's source (Task 4), and the service (Task 5). `CalculationHistoryResponse` fields match what `CalculationHistoryController` returns (Task 6) and what `HistoryEntry` on the frontend expects (Task 11) — `operation` as `String`/`OperationType` string-compatible, `operandA`/`operandB`/`result` as numeric, `createdAt` as `Instant`/ISO string. `getClientId()` (Task 10) is consumed identically by `apiClient`'s request interceptor for both `calculate` and `fetchHistory` (Task 11). `useCalculatorLogic`'s `pendingRequest: CalculationRequest | null` (Task 12) is exactly what `Calculator.tsx` (Task 15) passes to `useCalculate`'s `mutate(...)` (Task 13).
