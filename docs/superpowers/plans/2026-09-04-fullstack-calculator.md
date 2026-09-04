# Full-Stack Calculator Implementation Plan (Core Phase)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the core-phase full-stack calculator (Spring Boot backend + React/TypeScript frontend) covering all functional and non-functional requirements in `req.txt`, deployable via Docker.

**Architecture:** Spring Boot REST backend exposes a single `POST /api/calculate` endpoint backed by a Strategy pattern (one class per arithmetic operation, auto-wired into a lookup map — no branching logic). React frontend uses Zustand for local input/UI state and TanStack Query (`useMutation`) for the server call, styled with Tailwind CSS. Both layers are unit tested; backend coverage is measured with JaCoCo. Docker Compose runs both together.

**Tech Stack:** Java 17, Spring Boot 4.0.x (web, validation), Lombok, JUnit 5 + Mockito, JaCoCo, Maven · React 18 + TypeScript, Vite, Zustand, TanStack Query v5, Tailwind CSS, Vitest + React Testing Library · Docker + Docker Compose

**Spec:** `docs/superpowers/specs/2026-09-04-fullstack-calculator-design.md`

## Global Constraints

- Backend numeric type is `BigDecimal` everywhere (never `double`/`float`) to avoid floating-point precision artifacts.
- Single API endpoint: `POST /api/calculate`. Request `{ operation, operandA, operandB }`, success response `{ result }`, error response `{ message, timestamp }`.
- No MapStruct in this phase (nothing to map yet — deferred to the bonus phase per spec).
- No authentication, no persistence, no calculation history in this phase — that is a separate, later plan.
- Frontend has unit tests but **no coverage-report tooling configured** (explicit decision in spec).
- Repo layout: single repo, `/frontend` and `/backend` subfolders, `docker-compose.yml` at root.

---

## Task 1: Backend project scaffold

**Files:**
- Create: `backend/pom.xml`
- Create: `backend/src/main/java/com/sezzle/calculator/CalculatorApplication.java`
- Create: `backend/src/main/resources/application.yml`
- Create: `backend/.gitignore`

**Interfaces:**
- Produces: a runnable Spring Boot app on port 8080, Maven build with `mvn test` running JUnit + generating a JaCoCo report at `backend/target/site/jacoco/index.html`.

- [ ] **Step 1: Create `backend/pom.xml`**

```xml
<?xml version="1.0" encoding="UTF-8"?>
<project xmlns="http://maven.apache.org/POM/4.0.0"
         xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
         xsi:schemaLocation="http://maven.apache.org/POM/4.0.0 https://maven.apache.org/xsd/maven-4.0.0.xsd">
  <modelVersion>4.0.0</modelVersion>

  <parent>
    <groupId>org.springframework.boot</groupId>
    <artifactId>spring-boot-starter-parent</artifactId>
    <version>4.0.0</version>
    <relativePath/>
  </parent>

  <groupId>com.sezzle</groupId>
  <artifactId>calculator</artifactId>
  <version>0.0.1-SNAPSHOT</version>
  <name>calculator</name>
  <description>Full-stack calculator backend</description>

  <properties>
    <java.version>17</java.version>
  </properties>

  <dependencies>
    <dependency>
      <groupId>org.springframework.boot</groupId>
      <artifactId>spring-boot-starter-web</artifactId>
    </dependency>
    <dependency>
      <groupId>org.springframework.boot</groupId>
      <artifactId>spring-boot-starter-validation</artifactId>
    </dependency>
    <dependency>
      <groupId>org.projectlombok</groupId>
      <artifactId>lombok</artifactId>
      <optional>true</optional>
    </dependency>
    <dependency>
      <groupId>org.springframework.boot</groupId>
      <artifactId>spring-boot-starter-test</artifactId>
      <scope>test</scope>
    </dependency>
  </dependencies>

  <build>
    <plugins>
      <plugin>
        <groupId>org.springframework.boot</groupId>
        <artifactId>spring-boot-maven-plugin</artifactId>
        <configuration>
          <excludes>
            <exclude>
              <groupId>org.projectlombok</groupId>
              <artifactId>lombok</artifactId>
            </exclude>
          </excludes>
        </configuration>
      </plugin>
      <plugin>
        <groupId>org.jacoco</groupId>
        <artifactId>jacoco-maven-plugin</artifactId>
        <version>0.8.12</version>
        <executions>
          <execution>
            <goals><goal>prepare-agent</goal></goals>
          </execution>
          <execution>
            <id>report</id>
            <phase>test</phase>
            <goals><goal>report</goal></goals>
          </execution>
        </executions>
      </plugin>
    </plugins>
  </build>
</project>
```

- [ ] **Step 2: Create the application entry point**

`backend/src/main/java/com/sezzle/calculator/CalculatorApplication.java`:
```java
package com.sezzle.calculator;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;

@SpringBootApplication
public class CalculatorApplication {
    public static void main(String[] args) {
        SpringApplication.run(CalculatorApplication.class, args);
    }
}
```

- [ ] **Step 3: Create `backend/src/main/resources/application.yml`**

```yaml
server:
  port: 8080

spring:
  application:
    name: calculator
```

- [ ] **Step 4: Create `backend/.gitignore`**

```
target/
*.class
.idea/
*.iml
```

- [ ] **Step 5: Verify the project builds and runs**

Run: `cd backend && mvn -q compile`
Expected: `BUILD SUCCESS`

- [ ] **Step 6: Commit**

```bash
git add backend/pom.xml backend/src backend/.gitignore
git commit -m "chore(backend): scaffold Spring Boot project with JaCoCo"
```

---

## Task 2: OperationType enum + OperationStrategy interface

**Files:**
- Create: `backend/src/main/java/com/sezzle/calculator/strategy/OperationType.java`
- Create: `backend/src/main/java/com/sezzle/calculator/strategy/OperationStrategy.java`

**Interfaces:**
- Produces: `OperationType` enum with values `ADD, SUBTRACT, MULTIPLY, DIVIDE, EXPONENT, SQRT, PERCENTAGE` and `boolean isUnary()`; `OperationStrategy` interface with `OperationType getOperationType()` and `BigDecimal apply(BigDecimal operandA, BigDecimal operandB)`. All later strategy tasks implement this interface.

- [ ] **Step 1: Create `OperationType.java`**

```java
package com.sezzle.calculator.strategy;

public enum OperationType {
    ADD, SUBTRACT, MULTIPLY, DIVIDE, EXPONENT, SQRT, PERCENTAGE;

    /** SQRT takes a single operand; every other operation is binary. */
    public boolean isUnary() {
        return this == SQRT;
    }
}
```

- [ ] **Step 2: Create `OperationStrategy.java`**

```java
package com.sezzle.calculator.strategy;

import java.math.BigDecimal;

public interface OperationStrategy {
    OperationType getOperationType();

    /**
     * Applies the operation. For unary operations (SQRT), operandB is ignored.
     */
    BigDecimal apply(BigDecimal operandA, BigDecimal operandB);
}
```

- [ ] **Step 3: Verify it compiles**

Run: `cd backend && mvn -q compile`
Expected: `BUILD SUCCESS`

- [ ] **Step 4: Commit**

```bash
git add backend/src/main/java/com/sezzle/calculator/strategy/OperationType.java backend/src/main/java/com/sezzle/calculator/strategy/OperationStrategy.java
git commit -m "feat(backend): add OperationType enum and OperationStrategy interface"
```

---

## Task 3: Add, Subtract, Multiply strategies

**Files:**
- Create: `backend/src/main/java/com/sezzle/calculator/strategy/AddStrategy.java`
- Create: `backend/src/main/java/com/sezzle/calculator/strategy/SubtractStrategy.java`
- Create: `backend/src/main/java/com/sezzle/calculator/strategy/MultiplyStrategy.java`
- Test: `backend/src/test/java/com/sezzle/calculator/strategy/AddStrategyTest.java`
- Test: `backend/src/test/java/com/sezzle/calculator/strategy/SubtractStrategyTest.java`
- Test: `backend/src/test/java/com/sezzle/calculator/strategy/MultiplyStrategyTest.java`

**Interfaces:**
- Consumes: `OperationStrategy`, `OperationType` from Task 2.
- Produces: `@Component` beans `AddStrategy`, `SubtractStrategy`, `MultiplyStrategy`, each with a public no-arg constructor, used by `CalculatorService` (Task 8) via Spring injection.

- [ ] **Step 1: Write the failing tests**

`backend/src/test/java/com/sezzle/calculator/strategy/AddStrategyTest.java`:
```java
package com.sezzle.calculator.strategy;

import org.junit.jupiter.api.Test;

import java.math.BigDecimal;

import static org.assertj.core.api.Assertions.assertThat;

class AddStrategyTest {
    private final AddStrategy strategy = new AddStrategy();

    @Test
    void addsTwoPositiveNumbers() {
        BigDecimal result = strategy.apply(new BigDecimal("2"), new BigDecimal("3"));
        assertThat(result).isEqualByComparingTo("5");
    }

    @Test
    void returnsAddOperationType() {
        assertThat(strategy.getOperationType()).isEqualTo(OperationType.ADD);
    }
}
```

`backend/src/test/java/com/sezzle/calculator/strategy/SubtractStrategyTest.java`:
```java
package com.sezzle.calculator.strategy;

import org.junit.jupiter.api.Test;

import java.math.BigDecimal;

import static org.assertj.core.api.Assertions.assertThat;

class SubtractStrategyTest {
    private final SubtractStrategy strategy = new SubtractStrategy();

    @Test
    void subtractsSecondFromFirst() {
        BigDecimal result = strategy.apply(new BigDecimal("5"), new BigDecimal("3"));
        assertThat(result).isEqualByComparingTo("2");
    }

    @Test
    void returnsSubtractOperationType() {
        assertThat(strategy.getOperationType()).isEqualTo(OperationType.SUBTRACT);
    }
}
```

`backend/src/test/java/com/sezzle/calculator/strategy/MultiplyStrategyTest.java`:
```java
package com.sezzle.calculator.strategy;

import org.junit.jupiter.api.Test;

import java.math.BigDecimal;

import static org.assertj.core.api.Assertions.assertThat;

class MultiplyStrategyTest {
    private final MultiplyStrategy strategy = new MultiplyStrategy();

    @Test
    void multipliesTwoNumbers() {
        BigDecimal result = strategy.apply(new BigDecimal("4"), new BigDecimal("3"));
        assertThat(result).isEqualByComparingTo("12");
    }

    @Test
    void returnsMultiplyOperationType() {
        assertThat(strategy.getOperationType()).isEqualTo(OperationType.MULTIPLY);
    }
}
```

- [ ] **Step 2: Add AssertJ (already transitively included by `spring-boot-starter-test`) and run tests to verify they fail**

Run: `cd backend && mvn -q test -Dtest=AddStrategyTest,SubtractStrategyTest,MultiplyStrategyTest`
Expected: FAIL — `AddStrategy`, `SubtractStrategy`, `MultiplyStrategy` classes do not exist.

- [ ] **Step 3: Implement the three strategies**

`backend/src/main/java/com/sezzle/calculator/strategy/AddStrategy.java`:
```java
package com.sezzle.calculator.strategy;

import org.springframework.stereotype.Component;

import java.math.BigDecimal;

@Component
public class AddStrategy implements OperationStrategy {
    @Override
    public OperationType getOperationType() {
        return OperationType.ADD;
    }

    @Override
    public BigDecimal apply(BigDecimal operandA, BigDecimal operandB) {
        return operandA.add(operandB);
    }
}
```

`backend/src/main/java/com/sezzle/calculator/strategy/SubtractStrategy.java`:
```java
package com.sezzle.calculator.strategy;

import org.springframework.stereotype.Component;

import java.math.BigDecimal;

@Component
public class SubtractStrategy implements OperationStrategy {
    @Override
    public OperationType getOperationType() {
        return OperationType.SUBTRACT;
    }

    @Override
    public BigDecimal apply(BigDecimal operandA, BigDecimal operandB) {
        return operandA.subtract(operandB);
    }
}
```

`backend/src/main/java/com/sezzle/calculator/strategy/MultiplyStrategy.java`:
```java
package com.sezzle.calculator.strategy;

import org.springframework.stereotype.Component;

import java.math.BigDecimal;

@Component
public class MultiplyStrategy implements OperationStrategy {
    @Override
    public OperationType getOperationType() {
        return OperationType.MULTIPLY;
    }

    @Override
    public BigDecimal apply(BigDecimal operandA, BigDecimal operandB) {
        return operandA.multiply(operandB);
    }
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `cd backend && mvn -q test -Dtest=AddStrategyTest,SubtractStrategyTest,MultiplyStrategyTest`
Expected: PASS (6 tests)

- [ ] **Step 5: Commit**

```bash
git add backend/src/main/java/com/sezzle/calculator/strategy/AddStrategy.java backend/src/main/java/com/sezzle/calculator/strategy/SubtractStrategy.java backend/src/main/java/com/sezzle/calculator/strategy/MultiplyStrategy.java backend/src/test/java/com/sezzle/calculator/strategy/AddStrategyTest.java backend/src/test/java/com/sezzle/calculator/strategy/SubtractStrategyTest.java backend/src/test/java/com/sezzle/calculator/strategy/MultiplyStrategyTest.java
git commit -m "feat(backend): add Add/Subtract/Multiply strategies"
```

---

## Task 4: Divide strategy (with divide-by-zero handling)

**Files:**
- Create: `backend/src/main/java/com/sezzle/calculator/exception/InvalidOperationException.java`
- Create: `backend/src/main/java/com/sezzle/calculator/strategy/DivideStrategy.java`
- Test: `backend/src/test/java/com/sezzle/calculator/strategy/DivideStrategyTest.java`

**Interfaces:**
- Produces: `InvalidOperationException extends RuntimeException` (used by all subsequent strategies and by `GlobalExceptionHandler` in Task 6); `DivideStrategy` bean.

- [ ] **Step 1: Write the failing tests**

`backend/src/test/java/com/sezzle/calculator/strategy/DivideStrategyTest.java`:
```java
package com.sezzle.calculator.strategy;

import com.sezzle.calculator.exception.InvalidOperationException;
import org.junit.jupiter.api.Test;

import java.math.BigDecimal;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class DivideStrategyTest {
    private final DivideStrategy strategy = new DivideStrategy();

    @Test
    void dividesTwoNumbers() {
        BigDecimal result = strategy.apply(new BigDecimal("10"), new BigDecimal("4"));
        assertThat(result).isEqualByComparingTo("2.5");
    }

    @Test
    void throwsOnDivideByZero() {
        assertThatThrownBy(() -> strategy.apply(new BigDecimal("10"), BigDecimal.ZERO))
                .isInstanceOf(InvalidOperationException.class)
                .hasMessageContaining("divide by zero");
    }

    @Test
    void returnsDivideOperationType() {
        assertThat(strategy.getOperationType()).isEqualTo(OperationType.DIVIDE);
    }
}
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd backend && mvn -q test -Dtest=DivideStrategyTest`
Expected: FAIL — `DivideStrategy` and `InvalidOperationException` do not exist.

- [ ] **Step 3: Create `InvalidOperationException.java`**

```java
package com.sezzle.calculator.exception;

public class InvalidOperationException extends RuntimeException {
    public InvalidOperationException(String message) {
        super(message);
    }
}
```

- [ ] **Step 4: Implement `DivideStrategy.java`**

```java
package com.sezzle.calculator.strategy;

import com.sezzle.calculator.exception.InvalidOperationException;
import org.springframework.stereotype.Component;

import java.math.BigDecimal;
import java.math.RoundingMode;

@Component
public class DivideStrategy implements OperationStrategy {
    private static final int SCALE = 10;

    @Override
    public OperationType getOperationType() {
        return OperationType.DIVIDE;
    }

    @Override
    public BigDecimal apply(BigDecimal operandA, BigDecimal operandB) {
        if (operandB.compareTo(BigDecimal.ZERO) == 0) {
            throw new InvalidOperationException("Cannot divide by zero");
        }
        return operandA.divide(operandB, SCALE, RoundingMode.HALF_UP).stripTrailingZeros();
    }
}
```

- [ ] **Step 5: Run tests to verify they pass**

Run: `cd backend && mvn -q test -Dtest=DivideStrategyTest`
Expected: PASS (3 tests)

- [ ] **Step 6: Commit**

```bash
git add backend/src/main/java/com/sezzle/calculator/exception/InvalidOperationException.java backend/src/main/java/com/sezzle/calculator/strategy/DivideStrategy.java backend/src/test/java/com/sezzle/calculator/strategy/DivideStrategyTest.java
git commit -m "feat(backend): add Divide strategy with divide-by-zero handling"
```

---

## Task 5: Exponent, Sqrt, Percentage strategies

**Files:**
- Create: `backend/src/main/java/com/sezzle/calculator/strategy/ExponentStrategy.java`
- Create: `backend/src/main/java/com/sezzle/calculator/strategy/SqrtStrategy.java`
- Create: `backend/src/main/java/com/sezzle/calculator/strategy/PercentageStrategy.java`
- Test: `backend/src/test/java/com/sezzle/calculator/strategy/ExponentStrategyTest.java`
- Test: `backend/src/test/java/com/sezzle/calculator/strategy/SqrtStrategyTest.java`
- Test: `backend/src/test/java/com/sezzle/calculator/strategy/PercentageStrategyTest.java`

**Interfaces:**
- Consumes: `InvalidOperationException` from Task 4.
- Produces: `ExponentStrategy`, `SqrtStrategy`, `PercentageStrategy` beans.

- [ ] **Step 1: Write the failing tests**

`backend/src/test/java/com/sezzle/calculator/strategy/ExponentStrategyTest.java`:
```java
package com.sezzle.calculator.strategy;

import org.junit.jupiter.api.Test;

import java.math.BigDecimal;

import static org.assertj.core.api.Assertions.assertThat;

class ExponentStrategyTest {
    private final ExponentStrategy strategy = new ExponentStrategy();

    @Test
    void raisesToPositiveIntegerExponent() {
        BigDecimal result = strategy.apply(new BigDecimal("2"), new BigDecimal("3"));
        assertThat(result).isEqualByComparingTo("8");
    }

    @Test
    void raisesToZeroExponent() {
        BigDecimal result = strategy.apply(new BigDecimal("5"), BigDecimal.ZERO);
        assertThat(result).isEqualByComparingTo("1");
    }

    @Test
    void raisesToNegativeExponent() {
        BigDecimal result = strategy.apply(new BigDecimal("2"), new BigDecimal("-2"));
        assertThat(result).isEqualByComparingTo("0.25");
    }

    @Test
    void returnsExponentOperationType() {
        assertThat(strategy.getOperationType()).isEqualTo(OperationType.EXPONENT);
    }
}
```

`backend/src/test/java/com/sezzle/calculator/strategy/SqrtStrategyTest.java`:
```java
package com.sezzle.calculator.strategy;

import com.sezzle.calculator.exception.InvalidOperationException;
import org.junit.jupiter.api.Test;

import java.math.BigDecimal;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class SqrtStrategyTest {
    private final SqrtStrategy strategy = new SqrtStrategy();

    @Test
    void computesSquareRoot() {
        BigDecimal result = strategy.apply(new BigDecimal("9"), null);
        assertThat(result).isEqualByComparingTo("3");
    }

    @Test
    void throwsOnNegativeOperand() {
        assertThatThrownBy(() -> strategy.apply(new BigDecimal("-4"), null))
                .isInstanceOf(InvalidOperationException.class)
                .hasMessageContaining("negative");
    }

    @Test
    void returnsSqrtOperationType() {
        assertThat(strategy.getOperationType()).isEqualTo(OperationType.SQRT);
    }
}
```

`backend/src/test/java/com/sezzle/calculator/strategy/PercentageStrategyTest.java`:
```java
package com.sezzle.calculator.strategy;

import org.junit.jupiter.api.Test;

import java.math.BigDecimal;

import static org.assertj.core.api.Assertions.assertThat;

class PercentageStrategyTest {
    private final PercentageStrategy strategy = new PercentageStrategy();

    @Test
    void computesPercentageOfValue() {
        // 20% of 50 = 10
        BigDecimal result = strategy.apply(new BigDecimal("50"), new BigDecimal("20"));
        assertThat(result).isEqualByComparingTo("10");
    }

    @Test
    void returnsPercentageOperationType() {
        assertThat(strategy.getOperationType()).isEqualTo(OperationType.PERCENTAGE);
    }
}
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd backend && mvn -q test -Dtest=ExponentStrategyTest,SqrtStrategyTest,PercentageStrategyTest`
Expected: FAIL — classes do not exist.

- [ ] **Step 3: Implement `ExponentStrategy.java`**

```java
package com.sezzle.calculator.strategy;

import org.springframework.stereotype.Component;

import java.math.BigDecimal;
import java.math.RoundingMode;

@Component
public class ExponentStrategy implements OperationStrategy {
    private static final int SCALE = 10;

    @Override
    public OperationType getOperationType() {
        return OperationType.EXPONENT;
    }

    @Override
    public BigDecimal apply(BigDecimal operandA, BigDecimal operandB) {
        int exponent = operandB.intValueExact();
        if (exponent >= 0) {
            return operandA.pow(exponent).stripTrailingZeros();
        }
        BigDecimal positivePower = operandA.pow(-exponent);
        return BigDecimal.ONE.divide(positivePower, SCALE, RoundingMode.HALF_UP).stripTrailingZeros();
    }
}
```

- [ ] **Step 4: Implement `SqrtStrategy.java`**

```java
package com.sezzle.calculator.strategy;

import com.sezzle.calculator.exception.InvalidOperationException;
import org.springframework.stereotype.Component;

import java.math.BigDecimal;
import java.math.MathContext;

@Component
public class SqrtStrategy implements OperationStrategy {
    @Override
    public OperationType getOperationType() {
        return OperationType.SQRT;
    }

    @Override
    public BigDecimal apply(BigDecimal operandA, BigDecimal operandB) {
        if (operandA.compareTo(BigDecimal.ZERO) < 0) {
            throw new InvalidOperationException("Cannot compute square root of a negative number");
        }
        return operandA.sqrt(MathContext.DECIMAL64).stripTrailingZeros();
    }
}
```

- [ ] **Step 5: Implement `PercentageStrategy.java`**

```java
package com.sezzle.calculator.strategy;

import org.springframework.stereotype.Component;

import java.math.BigDecimal;
import java.math.RoundingMode;

@Component
public class PercentageStrategy implements OperationStrategy {
    private static final int SCALE = 10;
    private static final BigDecimal ONE_HUNDRED = new BigDecimal("100");

    @Override
    public OperationType getOperationType() {
        return OperationType.PERCENTAGE;
    }

    @Override
    public BigDecimal apply(BigDecimal operandA, BigDecimal operandB) {
        return operandA.multiply(operandB)
                .divide(ONE_HUNDRED, SCALE, RoundingMode.HALF_UP)
                .stripTrailingZeros();
    }
}
```

- [ ] **Step 6: Run tests to verify they pass**

Run: `cd backend && mvn -q test -Dtest=ExponentStrategyTest,SqrtStrategyTest,PercentageStrategyTest`
Expected: PASS (9 tests)

- [ ] **Step 7: Commit**

```bash
git add backend/src/main/java/com/sezzle/calculator/strategy/ExponentStrategy.java backend/src/main/java/com/sezzle/calculator/strategy/SqrtStrategy.java backend/src/main/java/com/sezzle/calculator/strategy/PercentageStrategy.java backend/src/test/java/com/sezzle/calculator/strategy/ExponentStrategyTest.java backend/src/test/java/com/sezzle/calculator/strategy/SqrtStrategyTest.java backend/src/test/java/com/sezzle/calculator/strategy/PercentageStrategyTest.java
git commit -m "feat(backend): add Exponent/Sqrt/Percentage strategies"
```

---

## Task 6: DTOs and GlobalExceptionHandler

**Files:**
- Create: `backend/src/main/java/com/sezzle/calculator/dto/CalculationRequest.java`
- Create: `backend/src/main/java/com/sezzle/calculator/dto/CalculationResponse.java`
- Create: `backend/src/main/java/com/sezzle/calculator/dto/ErrorResponse.java`
- Create: `backend/src/main/java/com/sezzle/calculator/exception/GlobalExceptionHandler.java`
- Test: `backend/src/test/java/com/sezzle/calculator/exception/GlobalExceptionHandlerTest.java`

**Interfaces:**
- Consumes: `InvalidOperationException` (Task 4), `OperationType` (Task 2).
- Produces: `CalculationRequest{ OperationType operation, BigDecimal operandA, BigDecimal operandB }`, `CalculationResponse{ BigDecimal result }`, `ErrorResponse{ String message, Instant timestamp }` — used by `CalculatorController` (Task 8).

- [ ] **Step 1: Write the failing test for the exception handler**

`backend/src/test/java/com/sezzle/calculator/exception/GlobalExceptionHandlerTest.java`:
```java
package com.sezzle.calculator.exception;

import com.sezzle.calculator.dto.ErrorResponse;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;

import static org.assertj.core.api.Assertions.assertThat;

class GlobalExceptionHandlerTest {
    private final GlobalExceptionHandler handler = new GlobalExceptionHandler();

    @Test
    void mapsInvalidOperationExceptionToBadRequest() {
        ResponseEntity<ErrorResponse> response =
                handler.handleInvalidOperation(new InvalidOperationException("Cannot divide by zero"));

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.BAD_REQUEST);
        assertThat(response.getBody().getMessage()).isEqualTo("Cannot divide by zero");
    }

    @Test
    void mapsUnexpectedExceptionToInternalServerError() {
        ResponseEntity<ErrorResponse> response =
                handler.handleUnexpected(new RuntimeException("boom"));

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.INTERNAL_SERVER_ERROR);
        assertThat(response.getBody().getMessage()).isEqualTo("Internal server error");
    }
}
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd backend && mvn -q test -Dtest=GlobalExceptionHandlerTest`
Expected: FAIL — `ErrorResponse` and `GlobalExceptionHandler` do not exist.

- [ ] **Step 3: Create the DTOs**

`backend/src/main/java/com/sezzle/calculator/dto/CalculationRequest.java`:
```java
package com.sezzle.calculator.dto;

import com.sezzle.calculator.strategy.OperationType;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

import java.math.BigDecimal;

@Data
public class CalculationRequest {
    @NotNull(message = "operation is required")
    private OperationType operation;

    @NotNull(message = "operandA is required")
    private BigDecimal operandA;

    /** Optional: only required for binary operations (everything except SQRT). */
    private BigDecimal operandB;
}
```

`backend/src/main/java/com/sezzle/calculator/dto/CalculationResponse.java`:
```java
package com.sezzle.calculator.dto;

import lombok.AllArgsConstructor;
import lombok.Data;

import java.math.BigDecimal;

@Data
@AllArgsConstructor
public class CalculationResponse {
    private BigDecimal result;
}
```

`backend/src/main/java/com/sezzle/calculator/dto/ErrorResponse.java`:
```java
package com.sezzle.calculator.dto;

import lombok.AllArgsConstructor;
import lombok.Data;

import java.time.Instant;

@Data
@AllArgsConstructor
public class ErrorResponse {
    private String message;
    private Instant timestamp;

    public static ErrorResponse of(String message) {
        return new ErrorResponse(message, Instant.now());
    }
}
```

- [ ] **Step 4: Implement `GlobalExceptionHandler.java`**

```java
package com.sezzle.calculator.exception;

import com.sezzle.calculator.dto.ErrorResponse;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

@RestControllerAdvice
public class GlobalExceptionHandler {

    @ExceptionHandler(InvalidOperationException.class)
    public ResponseEntity<ErrorResponse> handleInvalidOperation(InvalidOperationException ex) {
        return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(ErrorResponse.of(ex.getMessage()));
    }

    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ResponseEntity<ErrorResponse> handleValidation(MethodArgumentNotValidException ex) {
        String message = ex.getBindingResult().getFieldErrors().stream()
                .map(fieldError -> fieldError.getField() + ": " + fieldError.getDefaultMessage())
                .reduce((a, b) -> a + "; " + b)
                .orElse("Validation failed");
        return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(ErrorResponse.of(message));
    }

    @ExceptionHandler(Exception.class)
    public ResponseEntity<ErrorResponse> handleUnexpected(Exception ex) {
        return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                .body(ErrorResponse.of("Internal server error"));
    }
}
```

- [ ] **Step 5: Run test to verify it passes**

Run: `cd backend && mvn -q test -Dtest=GlobalExceptionHandlerTest`
Expected: PASS (2 tests)

- [ ] **Step 6: Commit**

```bash
git add backend/src/main/java/com/sezzle/calculator/dto backend/src/main/java/com/sezzle/calculator/exception/GlobalExceptionHandler.java backend/src/test/java/com/sezzle/calculator/exception/GlobalExceptionHandlerTest.java
git commit -m "feat(backend): add DTOs and global exception handler"
```

---

## Task 7: CalculatorService

**Files:**
- Create: `backend/src/main/java/com/sezzle/calculator/service/CalculatorService.java`
- Test: `backend/src/test/java/com/sezzle/calculator/service/CalculatorServiceTest.java`

**Interfaces:**
- Consumes: `OperationStrategy`/`OperationType` (Task 2), `CalculationRequest` (Task 6), `InvalidOperationException` (Task 4).
- Produces: `CalculatorService.calculate(CalculationRequest request): BigDecimal` — used by `CalculatorController` (Task 8).

- [ ] **Step 1: Write the failing tests**

`backend/src/test/java/com/sezzle/calculator/service/CalculatorServiceTest.java`:
```java
package com.sezzle.calculator.service;

import com.sezzle.calculator.dto.CalculationRequest;
import com.sezzle.calculator.exception.InvalidOperationException;
import com.sezzle.calculator.strategy.OperationStrategy;
import com.sezzle.calculator.strategy.OperationType;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.math.BigDecimal;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

class CalculatorServiceTest {
    private OperationStrategy addStrategy;
    private OperationStrategy sqrtStrategy;
    private CalculatorService service;

    @BeforeEach
    void setUp() {
        addStrategy = mock(OperationStrategy.class);
        when(addStrategy.getOperationType()).thenReturn(OperationType.ADD);
        when(addStrategy.apply(new BigDecimal("2"), new BigDecimal("3"))).thenReturn(new BigDecimal("5"));

        sqrtStrategy = mock(OperationStrategy.class);
        when(sqrtStrategy.getOperationType()).thenReturn(OperationType.SQRT);
        when(sqrtStrategy.apply(new BigDecimal("9"), null)).thenReturn(new BigDecimal("3"));

        service = new CalculatorService(List.of(addStrategy, sqrtStrategy));
    }

    @Test
    void delegatesToMatchingBinaryStrategy() {
        CalculationRequest request = new CalculationRequest();
        request.setOperation(OperationType.ADD);
        request.setOperandA(new BigDecimal("2"));
        request.setOperandB(new BigDecimal("3"));

        BigDecimal result = service.calculate(request);

        assertThat(result).isEqualByComparingTo("5");
    }

    @Test
    void delegatesToMatchingUnaryStrategyWithoutOperandB() {
        CalculationRequest request = new CalculationRequest();
        request.setOperation(OperationType.SQRT);
        request.setOperandA(new BigDecimal("9"));

        BigDecimal result = service.calculate(request);

        assertThat(result).isEqualByComparingTo("3");
    }

    @Test
    void throwsWhenOperandBMissingForBinaryOperation() {
        CalculationRequest request = new CalculationRequest();
        request.setOperation(OperationType.ADD);
        request.setOperandA(new BigDecimal("2"));

        assertThatThrownBy(() -> service.calculate(request))
                .isInstanceOf(InvalidOperationException.class)
                .hasMessageContaining("operandB is required");
    }

    @Test
    void throwsWhenNoStrategyRegisteredForOperation() {
        CalculationRequest request = new CalculationRequest();
        request.setOperation(OperationType.MULTIPLY);
        request.setOperandA(new BigDecimal("2"));
        request.setOperandB(new BigDecimal("3"));

        assertThatThrownBy(() -> service.calculate(request))
                .isInstanceOf(InvalidOperationException.class)
                .hasMessageContaining("Unsupported operation");
    }
}
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd backend && mvn -q test -Dtest=CalculatorServiceTest`
Expected: FAIL — `CalculatorService` does not exist.

- [ ] **Step 3: Implement `CalculatorService.java`**

```java
package com.sezzle.calculator.service;

import com.sezzle.calculator.dto.CalculationRequest;
import com.sezzle.calculator.exception.InvalidOperationException;
import com.sezzle.calculator.strategy.OperationStrategy;
import com.sezzle.calculator.strategy.OperationType;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.util.List;
import java.util.Map;
import java.util.function.Function;
import java.util.stream.Collectors;

@Service
public class CalculatorService {
    private final Map<OperationType, OperationStrategy> strategies;

    public CalculatorService(List<OperationStrategy> strategyList) {
        this.strategies = strategyList.stream()
                .collect(Collectors.toMap(OperationStrategy::getOperationType, Function.identity()));
    }

    public BigDecimal calculate(CalculationRequest request) {
        OperationType operation = request.getOperation();
        OperationStrategy strategy = strategies.get(operation);
        if (strategy == null) {
            throw new InvalidOperationException("Unsupported operation: " + operation);
        }
        if (!operation.isUnary() && request.getOperandB() == null) {
            throw new InvalidOperationException("operandB is required for operation " + operation);
        }
        return strategy.apply(request.getOperandA(), request.getOperandB());
    }
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `cd backend && mvn -q test -Dtest=CalculatorServiceTest`
Expected: PASS (4 tests)

- [ ] **Step 5: Commit**

```bash
git add backend/src/main/java/com/sezzle/calculator/service/CalculatorService.java backend/src/test/java/com/sezzle/calculator/service/CalculatorServiceTest.java
git commit -m "feat(backend): add CalculatorService with strategy lookup"
```

---

## Task 8: CalculatorController

**Files:**
- Create: `backend/src/main/java/com/sezzle/calculator/controller/CalculatorController.java`
- Test: `backend/src/test/java/com/sezzle/calculator/controller/CalculatorControllerTest.java`

**Interfaces:**
- Consumes: `CalculatorService.calculate(CalculationRequest): BigDecimal` (Task 7), `CalculationRequest`/`CalculationResponse` (Task 6).
- Produces: `POST /api/calculate` HTTP endpoint — this is the full backend's external contract, consumed by the frontend (Task 12 onward).

- [ ] **Step 1: Write the failing test**

`backend/src/test/java/com/sezzle/calculator/controller/CalculatorControllerTest.java`:
```java
package com.sezzle.calculator.controller;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.sezzle.calculator.exception.InvalidOperationException;
import com.sezzle.calculator.service.CalculatorService;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;

import java.math.BigDecimal;
import java.util.Map;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest(CalculatorController.class)
class CalculatorControllerTest {
    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @MockBean
    private CalculatorService calculatorService;

    @Test
    void returnsResultForValidRequest() throws Exception {
        when(calculatorService.calculate(any())).thenReturn(new BigDecimal("5"));

        mockMvc.perform(post("/api/calculate")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(
                                Map.of("operation", "ADD", "operandA", 2, "operandB", 3))))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.result").value(5));
    }

    @Test
    void returns400ForMissingOperation() throws Exception {
        mockMvc.perform(post("/api/calculate")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(
                                Map.of("operandA", 2, "operandB", 3))))
                .andExpect(status().isBadRequest());
    }

    @Test
    void returns400WhenServiceThrowsInvalidOperation() throws Exception {
        when(calculatorService.calculate(any()))
                .thenThrow(new InvalidOperationException("Cannot divide by zero"));

        mockMvc.perform(post("/api/calculate")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(
                                Map.of("operation", "DIVIDE", "operandA", 5, "operandB", 0))))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.message").value("Cannot divide by zero"));
    }
}
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd backend && mvn -q test -Dtest=CalculatorControllerTest`
Expected: FAIL — `CalculatorController` does not exist.

- [ ] **Step 3: Implement `CalculatorController.java`**

```java
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
```

Note: `GlobalExceptionHandler` (Task 6) is a `@RestControllerAdvice`, picked up automatically by Spring's component scan — no wiring needed here, and `@WebMvcTest(CalculatorController.class)` loads it automatically too.

- [ ] **Step 4: Run test to verify it passes**

Run: `cd backend && mvn -q test -Dtest=CalculatorControllerTest`
Expected: PASS (3 tests)

- [ ] **Step 5: Run the full backend test suite and check the JaCoCo report**

Run: `cd backend && mvn -q test`
Expected: all tests PASS; `backend/target/site/jacoco/index.html` is generated.

- [ ] **Step 6: Commit**

```bash
git add backend/src/main/java/com/sezzle/calculator/controller/CalculatorController.java backend/src/test/java/com/sezzle/calculator/controller/CalculatorControllerTest.java
git commit -m "feat(backend): add CalculatorController exposing POST /api/calculate"
```

---

## Task 9: Backend Dockerfile

**Files:**
- Create: `backend/Dockerfile`
- Create: `backend/.dockerignore`

**Interfaces:**
- Produces: a Docker image that runs the backend on port 8080, consumed by `docker-compose.yml` (Task 15).

- [ ] **Step 1: Create `backend/Dockerfile`**

```dockerfile
# Build stage
FROM maven:3.9-eclipse-temurin-17 AS build
WORKDIR /app
COPY pom.xml .
RUN mvn -q dependency:go-offline
COPY src ./src
RUN mvn -q package -DskipTests

# Runtime stage
FROM eclipse-temurin:17-jre-alpine
WORKDIR /app
COPY --from=build /app/target/calculator-0.0.1-SNAPSHOT.jar app.jar
EXPOSE 8080
ENTRYPOINT ["java", "-jar", "app.jar"]
```

- [ ] **Step 2: Create `backend/.dockerignore`**

```
target/
.idea/
*.iml
```

- [ ] **Step 3: Verify the image builds**

Run: `cd backend && docker build -t calculator-backend .`
Expected: image builds successfully (`Successfully tagged calculator-backend:latest` or equivalent final line).

- [ ] **Step 4: Commit**

```bash
git add backend/Dockerfile backend/.dockerignore
git commit -m "chore(backend): add Dockerfile"
```

---

## Task 10: Frontend project scaffold

**Files:**
- Create: `frontend/` (via Vite scaffold command)
- Modify: `frontend/package.json` (add dependencies)
- Create: `frontend/tailwind.config.js`
- Create: `frontend/postcss.config.js`
- Modify: `frontend/src/index.css`
- Create: `frontend/vitest.config.ts`
- Create: `frontend/src/test/setup.ts`
- Create: `frontend/.dockerignore`

**Interfaces:**
- Produces: a Vite React+TS project with Tailwind, TanStack Query, Zustand, and Vitest/RTL wired up and runnable (`npm run dev`, `npm test`).

- [ ] **Step 1: Scaffold the Vite project**

Run (from repo root):
```bash
npm create vite@latest frontend -- --template react-ts
cd frontend
npm install
```

- [ ] **Step 2: Install runtime and dev dependencies**

Run (from `frontend/`):
```bash
npm install zustand @tanstack/react-query
npm install -D tailwindcss postcss autoprefixer vitest jsdom @testing-library/react @testing-library/jest-dom @testing-library/user-event
npx tailwindcss init -p
```

- [ ] **Step 3: Configure Tailwind — `frontend/tailwind.config.js`**

```js
/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {},
  },
  plugins: [],
};
```

- [ ] **Step 4: Replace `frontend/src/index.css` with Tailwind directives**

```css
@tailwind base;
@tailwind components;
@tailwind utilities;
```

- [ ] **Step 5: Create `frontend/vitest.config.ts`**

```ts
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: './src/test/setup.ts',
  },
});
```

- [ ] **Step 6: Create `frontend/src/test/setup.ts`**

```ts
import '@testing-library/jest-dom';
```

- [ ] **Step 7: Add a `test` script to `frontend/package.json`**

In the `"scripts"` section, add:
```json
"test": "vitest run"
```

- [ ] **Step 8: Create `frontend/.dockerignore`**

```
node_modules/
dist/
```

- [ ] **Step 9: Verify the scaffold runs**

Run: `cd frontend && npm run build`
Expected: build succeeds, `frontend/dist/` is created.

- [ ] **Step 10: Commit**

```bash
git add frontend
git commit -m "chore(frontend): scaffold Vite React+TS project with Tailwind, Zustand, TanStack Query, Vitest"
```

---

## Task 11: Shared types

**Files:**
- Create: `frontend/src/types/calculator.ts`

**Interfaces:**
- Produces: `OperationType`, `CalculationRequest`, `CalculationResponse`, `ApiError` types — consumed by every subsequent frontend task.

- [ ] **Step 1: Create `frontend/src/types/calculator.ts`**

```ts
export type OperationType =
  | 'ADD'
  | 'SUBTRACT'
  | 'MULTIPLY'
  | 'DIVIDE'
  | 'EXPONENT'
  | 'SQRT'
  | 'PERCENTAGE';

export interface CalculationRequest {
  operation: OperationType;
  operandA: number;
  operandB?: number;
}

export interface CalculationResponse {
  result: number;
}

export interface ApiError {
  message: string;
  timestamp: string;
}

/** Operations that take only operandA (mirrors backend OperationType.isUnary()). */
export const UNARY_OPERATIONS: readonly OperationType[] = ['SQRT'];

export function isUnaryOperation(operation: OperationType): boolean {
  return UNARY_OPERATIONS.includes(operation);
}
```

- [ ] **Step 2: Verify it compiles**

Run: `cd frontend && npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add frontend/src/types/calculator.ts
git commit -m "feat(frontend): add shared calculator types"
```

---

## Task 12: API client

**Files:**
- Create: `frontend/src/api/calculatorApi.ts`
- Test: `frontend/src/api/calculatorApi.test.ts`

**Interfaces:**
- Consumes: `CalculationRequest`, `CalculationResponse`, `ApiError` (Task 11).
- Produces: `calculate(request: CalculationRequest): Promise<CalculationResponse>` — used by `useCalculate` (Task 13).

- [ ] **Step 1: Write the failing test**

`frontend/src/api/calculatorApi.test.ts`:
```ts
import { describe, it, expect, vi, afterEach } from 'vitest';
import { calculate } from './calculatorApi';

describe('calculate', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('returns the parsed result on success', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ result: 5 }),
    }));

    const result = await calculate({ operation: 'ADD', operandA: 2, operandB: 3 });

    expect(result).toEqual({ result: 5 });
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
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd frontend && npm test -- calculatorApi.test.ts`
Expected: FAIL — `./calculatorApi` module does not exist.

- [ ] **Step 3: Implement `frontend/src/api/calculatorApi.ts`**

```ts
import type { ApiError, CalculationRequest, CalculationResponse } from '../types/calculator';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:8080';

export async function calculate(request: CalculationRequest): Promise<CalculationResponse> {
  const response = await fetch(`${API_BASE_URL}/api/calculate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(request),
  });

  if (!response.ok) {
    const error = (await response.json()) as ApiError;
    throw new Error(error.message);
  }

  return (await response.json()) as CalculationResponse;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd frontend && npm test -- calculatorApi.test.ts`
Expected: PASS (2 tests)

- [ ] **Step 5: Commit**

```bash
git add frontend/src/api/calculatorApi.ts frontend/src/api/calculatorApi.test.ts
git commit -m "feat(frontend): add calculator API client"
```

---

## Task 13: useCalculate hook (TanStack Query)

**Files:**
- Create: `frontend/src/hooks/useCalculate.ts`
- Test: `frontend/src/hooks/useCalculate.test.tsx`
- Modify: `frontend/src/main.tsx` (wrap app in `QueryClientProvider`)

**Interfaces:**
- Consumes: `calculate` (Task 12).
- Produces: `useCalculate(): UseMutationResult<CalculationResponse, Error, CalculationRequest>` — used by `Calculator` component (Task 17).

- [ ] **Step 1: Write the failing test**

`frontend/src/hooks/useCalculate.test.tsx`:
```tsx
import { describe, it, expect, vi, afterEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { ReactNode } from 'react';
import { useCalculate } from './useCalculate';
import * as calculatorApi from '../api/calculatorApi';

function createWrapper() {
  const queryClient = new QueryClient();
  return ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
}

describe('useCalculate', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('calls calculatorApi.calculate and exposes the result', async () => {
    vi.spyOn(calculatorApi, 'calculate').mockResolvedValue({ result: 5 });

    const { result } = renderHook(() => useCalculate(), { wrapper: createWrapper() });

    result.current.mutate({ operation: 'ADD', operandA: 2, operandB: 3 });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual({ result: 5 });
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd frontend && npm test -- useCalculate.test.tsx`
Expected: FAIL — `./useCalculate` module does not exist.

- [ ] **Step 3: Implement `frontend/src/hooks/useCalculate.ts`**

```ts
import { useMutation } from '@tanstack/react-query';
import { calculate } from '../api/calculatorApi';
import type { CalculationRequest } from '../types/calculator';

export function useCalculate() {
  return useMutation({
    mutationFn: (request: CalculationRequest) => calculate(request),
  });
}
```

- [ ] **Step 4: Wire `QueryClientProvider` in `frontend/src/main.tsx`**

Replace the file contents with:
```tsx
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import './index.css';
import App from './App.tsx';

const queryClient = new QueryClient();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <App />
    </QueryClientProvider>
  </StrictMode>,
);
```

- [ ] **Step 5: Run test to verify it passes**

Run: `cd frontend && npm test -- useCalculate.test.tsx`
Expected: PASS (1 test)

- [ ] **Step 6: Commit**

```bash
git add frontend/src/hooks/useCalculate.ts frontend/src/hooks/useCalculate.test.tsx frontend/src/main.tsx
git commit -m "feat(frontend): add useCalculate mutation hook and wire QueryClientProvider"
```

---

## Task 14: Zustand calculator store

**Files:**
- Create: `frontend/src/store/calculatorStore.ts`
- Test: `frontend/src/store/calculatorStore.test.ts`

**Interfaces:**
- Consumes: `OperationType` (Task 11).
- Produces: `useCalculatorStore` hook exposing `{ operandA: string, operandB: string, operation: OperationType | null, setOperandA, setOperandB, setOperation, reset }` — used by `Calculator` component (Task 17).

- [ ] **Step 1: Write the failing test**

`frontend/src/store/calculatorStore.test.ts`:
```ts
import { describe, it, expect, beforeEach } from 'vitest';
import { useCalculatorStore } from './calculatorStore';

describe('calculatorStore', () => {
  beforeEach(() => {
    useCalculatorStore.getState().reset();
  });

  it('starts with empty operands and no operation', () => {
    const state = useCalculatorStore.getState();
    expect(state.operandA).toBe('');
    expect(state.operandB).toBe('');
    expect(state.operation).toBeNull();
  });

  it('updates operandA, operandB, and operation', () => {
    useCalculatorStore.getState().setOperandA('2');
    useCalculatorStore.getState().setOperandB('3');
    useCalculatorStore.getState().setOperation('ADD');

    const state = useCalculatorStore.getState();
    expect(state.operandA).toBe('2');
    expect(state.operandB).toBe('3');
    expect(state.operation).toBe('ADD');
  });

  it('reset clears all fields', () => {
    useCalculatorStore.getState().setOperandA('2');
    useCalculatorStore.getState().reset();

    expect(useCalculatorStore.getState().operandA).toBe('');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd frontend && npm test -- calculatorStore.test.ts`
Expected: FAIL — `./calculatorStore` module does not exist.

- [ ] **Step 3: Implement `frontend/src/store/calculatorStore.ts`**

```ts
import { create } from 'zustand';
import type { OperationType } from '../types/calculator';

interface CalculatorState {
  operandA: string;
  operandB: string;
  operation: OperationType | null;
  setOperandA: (value: string) => void;
  setOperandB: (value: string) => void;
  setOperation: (operation: OperationType | null) => void;
  reset: () => void;
}

export const useCalculatorStore = create<CalculatorState>((set) => ({
  operandA: '',
  operandB: '',
  operation: null,
  setOperandA: (value) => set({ operandA: value }),
  setOperandB: (value) => set({ operandB: value }),
  setOperation: (operation) => set({ operation }),
  reset: () => set({ operandA: '', operandB: '', operation: null }),
}));
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd frontend && npm test -- calculatorStore.test.ts`
Expected: PASS (3 tests)

- [ ] **Step 5: Commit**

```bash
git add frontend/src/store/calculatorStore.ts frontend/src/store/calculatorStore.test.ts
git commit -m "feat(frontend): add Zustand calculator store"
```

---

## Task 15: Display component

**Files:**
- Create: `frontend/src/components/Calculator/Display.tsx`
- Test: `frontend/src/components/Calculator/Display.test.tsx`

**Interfaces:**
- Consumes: nothing beyond React/props.
- Produces: `Display` component with props `{ operandA: string; operation: string | null; operandB: string; result: string | null; error: string | null }` — used by `Calculator` (Task 17).

- [ ] **Step 1: Write the failing test**

`frontend/src/components/Calculator/Display.test.tsx`:
```tsx
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Display } from './Display';

describe('Display', () => {
  it('renders the current expression when no result yet', () => {
    render(<Display operandA="2" operation="ADD" operandB="3" result={null} error={null} />);
    expect(screen.getByTestId('display')).toHaveTextContent('2 ADD 3');
  });

  it('renders the result when present', () => {
    render(<Display operandA="2" operation="ADD" operandB="3" result="5" error={null} />);
    expect(screen.getByTestId('display')).toHaveTextContent('5');
  });

  it('renders the error message when present', () => {
    render(<Display operandA="5" operation="DIVIDE" operandB="0" result={null} error="Cannot divide by zero" />);
    expect(screen.getByTestId('display')).toHaveTextContent('Cannot divide by zero');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd frontend && npm test -- Display.test.tsx`
Expected: FAIL — `./Display` module does not exist.

- [ ] **Step 3: Implement `frontend/src/components/Calculator/Display.tsx`**

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
      className={`w-full rounded-md p-4 text-right text-2xl font-mono break-all ${
        error ? 'bg-red-50 text-red-700' : 'bg-gray-100 text-gray-900'
      }`}
    >
      {content}
    </div>
  );
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd frontend && npm test -- Display.test.tsx`
Expected: PASS (3 tests)

- [ ] **Step 5: Commit**

```bash
git add frontend/src/components/Calculator/Display.tsx frontend/src/components/Calculator/Display.test.tsx
git commit -m "feat(frontend): add Display component"
```

---

## Task 16: Keypad component

**Files:**
- Create: `frontend/src/components/Calculator/Keypad.tsx`
- Test: `frontend/src/components/Calculator/Keypad.test.tsx`

**Interfaces:**
- Consumes: `OperationType` (Task 11).
- Produces: `Keypad` component with props `{ onDigit: (digit: string) => void; onOperation: (op: OperationType) => void; onEquals: () => void; onClear: () => void }` — used by `Calculator` (Task 17).

- [ ] **Step 1: Write the failing test**

`frontend/src/components/Calculator/Keypad.test.tsx`:
```tsx
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Keypad } from './Keypad';

describe('Keypad', () => {
  it('calls onDigit when a digit button is clicked', async () => {
    const onDigit = vi.fn();
    render(<Keypad onDigit={onDigit} onOperation={vi.fn()} onEquals={vi.fn()} onClear={vi.fn()} />);

    await userEvent.click(screen.getByRole('button', { name: '7' }));

    expect(onDigit).toHaveBeenCalledWith('7');
  });

  it('calls onOperation with ADD when + is clicked', async () => {
    const onOperation = vi.fn();
    render(<Keypad onDigit={vi.fn()} onOperation={onOperation} onEquals={vi.fn()} onClear={vi.fn()} />);

    await userEvent.click(screen.getByRole('button', { name: '+' }));

    expect(onOperation).toHaveBeenCalledWith('ADD');
  });

  it('calls onEquals when = is clicked', async () => {
    const onEquals = vi.fn();
    render(<Keypad onDigit={vi.fn()} onOperation={vi.fn()} onEquals={onEquals} onClear={vi.fn()} />);

    await userEvent.click(screen.getByRole('button', { name: '=' }));

    expect(onEquals).toHaveBeenCalled();
  });

  it('calls onClear when C is clicked', async () => {
    const onClear = vi.fn();
    render(<Keypad onDigit={vi.fn()} onOperation={vi.fn()} onEquals={vi.fn()} onClear={onClear} />);

    await userEvent.click(screen.getByRole('button', { name: 'C' }));

    expect(onClear).toHaveBeenCalled();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd frontend && npm test -- Keypad.test.tsx`
Expected: FAIL — `./Keypad` module does not exist.

- [ ] **Step 3: Implement `frontend/src/components/Calculator/Keypad.tsx`**

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

const buttonClass =
  'rounded-md bg-white p-4 text-lg font-semibold shadow hover:bg-gray-50 active:bg-gray-100';

export function Keypad({ onDigit, onOperation, onEquals, onClear }: KeypadProps) {
  return (
    <div className="grid grid-cols-4 gap-2 sm:gap-3">
      {['7', '8', '9', '4', '5', '6', '1', '2', '3', '0', '.'].map((digit) => (
        <button key={digit} type="button" className={buttonClass} onClick={() => onDigit(digit)}>
          {digit}
        </button>
      ))}
      {OPERATION_BUTTONS.map(({ label, operation }) => (
        <button
          key={operation}
          type="button"
          className={`${buttonClass} bg-blue-50`}
          onClick={() => onOperation(operation)}
        >
          {label}
        </button>
      ))}
      <button type="button" className={`${buttonClass} bg-red-50`} onClick={onClear}>
        C
      </button>
      <button type="button" className={`${buttonClass} bg-green-100`} onClick={onEquals}>
        =
      </button>
    </div>
  );
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd frontend && npm test -- Keypad.test.tsx`
Expected: PASS (4 tests)

- [ ] **Step 5: Commit**

```bash
git add frontend/src/components/Calculator/Keypad.tsx frontend/src/components/Calculator/Keypad.test.tsx
git commit -m "feat(frontend): add Keypad component"
```

---

## Task 17: Calculator component + App wiring

**Files:**
- Create: `frontend/src/components/Calculator/Calculator.tsx`
- Test: `frontend/src/components/Calculator/Calculator.test.tsx`
- Modify: `frontend/src/App.tsx`

**Interfaces:**
- Consumes: `useCalculatorStore` (Task 14), `useCalculate` (Task 13), `Display` (Task 15), `Keypad` (Task 16), `isUnaryOperation` (Task 11).
- Produces: `Calculator` component — the top-level feature, rendered by `App`.

- [ ] **Step 1: Write the failing test**

`frontend/src/components/Calculator/Calculator.test.tsx`:
```tsx
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { ReactElement } from 'react';
import { Calculator } from './Calculator';
import * as calculatorApi from '../../api/calculatorApi';
import { useCalculatorStore } from '../../store/calculatorStore';

function renderWithClient(ui: ReactElement) {
  const queryClient = new QueryClient();
  return render(<QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>);
}

describe('Calculator', () => {
  afterEach(() => {
    vi.restoreAllMocks();
    useCalculatorStore.getState().reset();
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
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd frontend && npm test -- Calculator.test.tsx`
Expected: FAIL — `./Calculator` module does not exist.

- [ ] **Step 3: Implement `frontend/src/components/Calculator/Calculator.tsx`**

```tsx
import { useCalculatorStore } from '../../store/calculatorStore';
import { useCalculate } from '../../hooks/useCalculate';
import { isUnaryOperation } from '../../types/calculator';
import { Display } from './Display';
import { Keypad } from './Keypad';

export function Calculator() {
  const { operandA, operandB, operation, setOperandA, setOperandB, setOperation, reset } =
    useCalculatorStore();
  const { mutate, data, error, reset: resetMutation } = useCalculate();

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
    <div className="mx-auto mt-10 w-full max-w-xs space-y-4 rounded-lg bg-gray-50 p-4 shadow sm:max-w-sm">
      <Display
        operandA={operandA}
        operation={operation}
        operandB={operandB}
        result={data ? String(data.result) : null}
        error={error ? error.message : null}
      />
      <Keypad
        onDigit={handleDigit}
        onOperation={handleOperation}
        onEquals={handleEquals}
        onClear={handleClear}
      />
    </div>
  );
}
```

- [ ] **Step 4: Replace `frontend/src/App.tsx`**

```tsx
import { Calculator } from './components/Calculator/Calculator';

function App() {
  return (
    <div className="min-h-screen bg-gray-100 p-4">
      <h1 className="text-center text-2xl font-bold text-gray-800">Calculator</h1>
      <Calculator />
    </div>
  );
}

export default App;
```

- [ ] **Step 5: Run test to verify it passes**

Run: `cd frontend && npm test -- Calculator.test.tsx`
Expected: PASS (3 tests)

- [ ] **Step 6: Run the full frontend test suite**

Run: `cd frontend && npm test`
Expected: all tests PASS.

- [ ] **Step 7: Commit**

```bash
git add frontend/src/components/Calculator/Calculator.tsx frontend/src/components/Calculator/Calculator.test.tsx frontend/src/App.tsx
git commit -m "feat(frontend): add Calculator component wiring store, mutation, Display and Keypad"
```

---

## Task 18: Frontend Dockerfile

**Files:**
- Create: `frontend/Dockerfile`
- Create: `frontend/nginx.conf`

**Interfaces:**
- Produces: a Docker image serving the built frontend via nginx on port 80, consumed by `docker-compose.yml` (Task 19).

- [ ] **Step 1: Create `frontend/nginx.conf`**

```nginx
server {
    listen 80;
    root /usr/share/nginx/html;
    index index.html;

    location / {
        try_files $uri $uri/ /index.html;
    }
}
```

- [ ] **Step 2: Create `frontend/Dockerfile`**

```dockerfile
# Build stage
FROM node:20-alpine AS build
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
ARG VITE_API_BASE_URL=http://localhost:8080
ENV VITE_API_BASE_URL=$VITE_API_BASE_URL
RUN npm run build

# Runtime stage
FROM nginx:1.27-alpine
COPY --from=build /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
```

- [ ] **Step 3: Verify the image builds**

Run: `cd frontend && docker build -t calculator-frontend .`
Expected: image builds successfully.

- [ ] **Step 4: Commit**

```bash
git add frontend/Dockerfile frontend/nginx.conf
git commit -m "chore(frontend): add Dockerfile with nginx"
```

---

## Task 19: docker-compose

**Files:**
- Create: `docker-compose.yml`

**Interfaces:**
- Consumes: `backend/Dockerfile` (Task 9), `frontend/Dockerfile` (Task 18).
- Produces: a `docker-compose up` command that runs the full stack.

- [ ] **Step 1: Create `docker-compose.yml`**

```yaml
services:
  backend:
    build: ./backend
    ports:
      - "8080:8080"

  frontend:
    build:
      context: ./frontend
      args:
        VITE_API_BASE_URL: http://localhost:8080
    ports:
      - "5173:80"
    depends_on:
      - backend
```

- [ ] **Step 2: Verify the full stack runs**

Run: `docker compose up --build -d`
Expected: both containers start; `curl -s -X POST http://localhost:8080/api/calculate -H "Content-Type: application/json" -d "{\"operation\":\"ADD\",\"operandA\":2,\"operandB\":3}"` returns `{"result":5}`; `http://localhost:5173` serves the frontend.

Run afterward: `docker compose down`

- [ ] **Step 3: Commit**

```bash
git add docker-compose.yml
git commit -m "chore: add docker-compose to run frontend and backend together"
```

---

## Task 20: README

**Files:**
- Create: `README.md`

**Interfaces:**
- Consumes: nothing — documents the finished system from Tasks 1-19.

- [ ] **Step 1: Write `README.md`**

```markdown
# Full-Stack Calculator

A calculator with a Spring Boot REST backend and a React + TypeScript frontend.

## Tech stack

- **Backend:** Java 17, Spring Boot 4, Maven, JUnit 5 + Mockito, JaCoCo
- **Frontend:** React 18, TypeScript, Vite, Zustand, TanStack Query, Tailwind CSS, Vitest + React Testing Library
- **Infra:** Docker + Docker Compose

## Setup & running

### Option A: Docker Compose (recommended)

```bash
docker compose up --build
```
- Backend: http://localhost:8080
- Frontend: http://localhost:5173

### Option B: Run manually

Backend:
```bash
cd backend
mvn spring-boot:run
```
Runs on http://localhost:8080.

Frontend (in a separate terminal):
```bash
cd frontend
npm install
npm run dev
```
Runs on http://localhost:5173.

## Running tests

Backend (also generates a JaCoCo coverage report at `backend/target/site/jacoco/index.html`):
```bash
cd backend
mvn test
```

Frontend:
```bash
cd frontend
npm test
```

## API usage

`POST /api/calculate`

Request:
```json
{ "operation": "ADD", "operandA": 2, "operandB": 3 }
```

Response (200):
```json
{ "result": 5 }
```

Error response (400), e.g. division by zero:
```json
{ "message": "Cannot divide by zero", "timestamp": "2026-09-04T12:00:00Z" }
```

Supported `operation` values: `ADD`, `SUBTRACT`, `MULTIPLY`, `DIVIDE`, `EXPONENT`, `SQRT`, `PERCENTAGE`. `operandB` is omitted for `SQRT` (unary).

Example with curl:
```bash
curl -X POST http://localhost:8080/api/calculate \
  -H "Content-Type: application/json" \
  -d '{"operation": "DIVIDE", "operandA": 10, "operandB": 4}'
```

## Design decisions & assumptions

- **Single `/api/calculate` endpoint** with a Strategy pattern (one class per operation, injected by Spring into a lookup map) rather than one REST endpoint per operation. This avoids duplicated controller/validation boilerplate and keeps adding a new operation to a single new class with no branching logic touched.
- **`BigDecimal` throughout**, not `double`, to avoid floating-point precision issues in a calculator.
- **Zustand** holds local input/UI state (current operands, selected operation); **TanStack Query** (`useMutation`) owns the server call and its loading/error/success lifecycle — each library is used for the concern it's actually suited to, rather than force-fitting one for everything.
- **Out of scope for this assignment:** authentication and persisted calculation history. The assignment's requirements list functional arithmetic operations, input validation, and a REST API — not user accounts or history — and explicitly says to prioritize correctness, clarity, and maintainability over extra features. Adding a JWT auth system and persistence layer to a calculator would meaningfully expand the security-sensitive surface area without being asked for. These are documented here as a considered, deliberate scope decision, not an oversight.

## AI tooling disclosure

This project was built with AI-assisted tooling (Claude Code). Prompts used are available on request / included per the assignment's instructions.
```

- [ ] **Step 2: Commit**

```bash
git add README.md
git commit -m "docs: add README with setup, API usage, and design decisions"
```

---

## Self-Review Notes

- **Spec coverage:** all core-phase spec sections have a task — backend package structure (Tasks 1-8), API contract (Task 8), strategy pattern (Tasks 2-5), BigDecimal (Tasks 3-5), Lombok (Task 6, 8), validation/error handling (Task 6), frontend structure (Tasks 10-17), Zustand/TanStack Query split (Tasks 13-14, 17), Tailwind (Task 10, 15-17), Docker (Tasks 9, 18-19), testing/JaCoCo (all tasks + Task 8 step 5), README (Task 20). MapStruct and the bonus phase (auth/history) are explicitly deferred to a future plan, per the spec.
- **Placeholder scan:** no TBD/TODO markers; every step has real, complete code.
- **Type consistency:** `OperationType` values (`ADD, SUBTRACT, MULTIPLY, DIVIDE, EXPONENT, SQRT, PERCENTAGE`) match across backend enum (Task 2), frontend type (Task 11), and all usages in Tasks 3-8 and 12-17. `CalculationRequest`/`CalculationResponse`/`ErrorResponse` field names (`operation`, `operandA`, `operandB`, `result`, `message`, `timestamp`) match between backend DTOs (Task 6) and frontend types (Task 11) and are used consistently through the controller (Task 8), API client (Task 12), and components (Tasks 15-17).

## Out of scope (future plan)

Bonus phase — Spring Security + JWT auth, persisted `CalculationHistory` entity, MapStruct entity↔DTO mapping, protected `GET /api/history` endpoint, frontend auth screens and history view — will be scoped in its own spec/plan cycle only if time remains after the core phase above is complete and verified.
