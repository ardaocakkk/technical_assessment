# Calculation History (Anonymous, Postgres) + Casio FX-991ES Frontend — Design

**Date:** 2026-09-05
**Context:** Follow-up to the core calculator (see `2026-09-04-fullstack-calculator-design.md`). That spec deferred auth+history as a bonus phase bundled with JWT. This iteration drops auth entirely and adds calculation history scoped to an anonymous client ID instead, plus a visual redesign of the frontend.

## Scope

- Persist every **successful** calculation to Postgres, tagged with an anonymous client ID (no login).
- Expose the last 10 calculations for a given client ID.
- Frontend generates/stores a client ID in `localStorage`, sends it on every request, and displays its own history in a panel.
- Restyle the calculator UI in the visual language of a Casio FX-991ES, restricted to the 7 operations this app supports (no scientific functions the API doesn't have).
- Add SLF4J logging across the backend's request-handling path.

Explicitly not in scope: real authentication, editing/deleting history, cross-device history sync (client ID is per-browser via `localStorage`).

## Backend

### File structure

```
backend/src/main/java/com/sezzle/calculator/
  model/
    CalculationHistory.java            # @Entity
  repository/
    CalculationHistoryRepository.java  # JpaRepository<CalculationHistory, Long>
  service/
    CalculationHistoryService.java     # save(...), getLatest(clientId)
  controller/
    CalculationHistoryController.java  # GET /api/history
  dto/
    CalculationHistoryResponse.java    # id, operation, operandA, operandB, result, createdAt
  mapper/
    CalculationHistoryMapper.java      # MapStruct: CalculationHistory -> CalculationHistoryResponse
```

### `CalculationHistory` entity (`model` package, per instruction)

Fields: `id` (Long, auto-generated PK), `clientId` (String, not null), `operation` (String — the enum name), `operandA` (BigDecimal), `operandB` (BigDecimal, nullable for unary ops), `result` (BigDecimal), `createdAt` (Instant, set on persist).

### Repository

`CalculationHistoryRepository extends JpaRepository<CalculationHistory, Long>` with:
```java
List<CalculationHistory> findTop10ByClientIdOrderByCreatedAtDesc(String clientId);
```
Spring Data derives the query from the method name — no custom `@Query`.

### Flow

- `CalculatorController.calculate` gains an optional `@RequestHeader(value = "X-Client-Id", required = false) String clientId` parameter. On a successful calculation, it calls `CalculationHistoryService.save(clientId, request, result)` — a no-op (skipped) if `clientId` is null, so existing behavior (curl without the header, existing tests) is unaffected.
- New `CalculationHistoryController` exposes `GET /api/history`, also reading `X-Client-Id` (required this time — no client ID means no history to scope to, returns 400 via a small validation check, not a new exception type: reuse `InvalidOperationException`... actually more precise to add a dedicated check here since it's a different failure category (missing required header) — Spring's own `MissingRequestHeaderException` is thrown automatically when the header is declared required and absent, and `GlobalExceptionHandler`'s existing `HttpMessageNotReadableException`/generic handlers **do not** cover it. Add one more `@ExceptionHandler(MissingRequestHeaderException.class)` → 400.
- Response: list of up to 10 `CalculationHistoryResponse`, newest first, mapped via `CalculationHistoryMapper` (MapStruct).

### Logging

SLF4J `Logger` added to `CalculatorController`, `CalculatorService`, `CalculationHistoryService`, `CalculationHistoryController`:
- `CalculatorController`: info on request received (operation only, not full payload) and on response status.
- `CalculatorService`: info on strategy dispatch.
- `CalculationHistoryService`: info on save (clientId, operation) and on fetch (clientId, count returned).
- `CalculationHistoryController`: info on history request received.

## Persistence config

- Dependencies: `spring-boot-starter-data-jpa`, `org.postgresql:postgresql` (runtime).
- `application.yml`: `spring.datasource.url=jdbc:postgresql://localhost:5432/calculator` (manual-dev default), `username`/`password` = `calculator`/`calculator`, `spring.jpa.hibernate.ddl-auto=update`.
- Docker Compose overrides the datasource URL to the `postgres` service hostname via environment variables.

## Docker

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
    ports: ["8080:8080"]
    environment:
      SPRING_DATASOURCE_URL: jdbc:postgresql://postgres:5432/calculator
      SPRING_DATASOURCE_USERNAME: calculator
      SPRING_DATASOURCE_PASSWORD: calculator
    depends_on:
      postgres:
        condition: service_healthy
  # frontend service: unchanged

volumes:
  postgres_data:
```

## Frontend

### Client ID

`frontend/src/lib/clientId.ts`: `getClientId()` reads `calculator_client_id` from `localStorage`; if absent, generates one with `crypto.randomUUID()`, stores it, and returns it. `calculatorApi.ts` attaches it as the `X-Client-Id` header on every request (`calculate` and the new `fetchHistory`).

### History fetching

- `fetchHistory(): Promise<HistoryEntry[]>` added to `calculatorApi.ts`, `GET /api/history`.
- `useHistory()` hook — `useQuery` (not `useMutation`; this is the cached-GET-resource case TanStack Query's other primitive is for).
- `useCalculate`'s `onSuccess` invalidates the `['history']` query key so the panel refreshes after each calculation.
- New type `HistoryEntry { id, operation, operandA, operandB, result, createdAt }` mirroring the backend response shape.

### New component

`frontend/src/components/Calculator/History.tsx` — a small panel listing up to 10 entries (expression + result + relative/short timestamp), rendered alongside `Calculator`.

### Casio FX-991ES restyle

`Display.tsx` / `Keypad.tsx` / `Calculator.tsx` restyled in Tailwind to match the FX-991ES's visual language: dark outer casing panel, two-line LCD-style display area (monospace, muted green/gray backlight look), muted grey number keys with a distinct accent color for operators, restricted to exactly the 7 supported operations plus digits/decimal/clear/equals. No Casio logo/wordmark rendered on the UI (styling reference only, not branding) — this is a work sample, not a Casio product.

## Testing

- **Backend:**
  - `CalculationHistoryServiceTest` (unit, mocked repository): save persists with correct fields; getLatest delegates to the repository's derived-query method and returns its result.
  - `CalculationHistoryControllerTest` (`@WebMvcTest`, mocked service): returns the mapped list for a valid `X-Client-Id`; returns 400 when the header is missing.
  - `CalculatorControllerTest` gains cases: a request with `X-Client-Id` triggers a history save (verify the mocked `CalculationHistoryService` was called); a request without the header does not (verify it was never called) — existing tests without the header keep passing unmodified.
  - `CalculationHistoryMapperTest` (or covered implicitly through the controller test) — entity → response field mapping.
- **Frontend:**
  - `clientId.test.ts`: generates and persists a UUID on first call; returns the same value on subsequent calls.
  - `calculatorApi.test.ts` gains a case for `fetchHistory` (and confirms the `X-Client-Id` header is sent on both existing and new calls).
  - `useHistory.test.tsx`: mirrors `useCalculate.test.tsx`'s pattern.
  - `History.test.tsx`: renders a list of entries; renders an empty state with zero entries.
  - `Calculator.test.tsx` (existing) — spot-check the restyled markup doesn't break the existing button-query-by-accessible-name tests (labels/roles stay the same; only classes/layout change).

## Design decisions / assumptions

- **No Flyway/migrations**: `ddl-auto=update` is the simplest fit for this scope; a real production app would use versioned migrations, called out here as a stated tradeoff, same posture as the original spec's treatment of auth.
- **No Testcontainers**: repository/integration tests against a real Postgres are skipped in favor of mocked-repository unit tests, to avoid a hard Docker dependency on `mvn test` (Docker availability has been unreliable in this environment).
- **`X-Client-Id` is trust-on-first-use, unauthenticated**: anyone can set any client ID (it's just a header), so this is explicitly *not* a security boundary — it's a convenience scoping mechanism for an anonymous, unauthenticated app, consistent with the original decision to keep real auth out of scope.
