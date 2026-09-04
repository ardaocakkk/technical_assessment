# Full-Stack Calculator — Design

**Date:** 2026-09-04
**Context:** Sezzle take-home coding assessment (see `req.txt`). Time budget: ~2–4 hours. Instructions explicitly say to prioritize correctness, clarity, and maintainability over extra features.

## Scope decision

The assessment requirements do not mention authentication or calculation history. To respect the stated priority ("correctness, clarity, maintainability over extra features") while still demonstrating broader engineering ability, the work is split into two phases:

- **Core phase** — everything in the written requirements. Treated as the complete, shippable deliverable on its own.
- **Bonus phase** — JWT auth + per-user calculation history, built only after the core phase is solid and only if time remains. Kept in separate commits and a clearly labeled README section ("Bonus — out of scope for the assignment") so it never puts the graded core at risk.

## Functional scope (core phase)

Operations: Addition, Subtraction, Multiplication, Division (required) + Exponentiation, Square Root, Percentage (optional, included).

## Repository layout

Single repo, one Git history:
```
/frontend
/backend
docker-compose.yml
README.md
```

## Backend (Spring Boot)

```
backend/src/main/java/com/sezzle/calculator/
  controller/CalculatorController.java   # POST /api/calculate
  service/CalculatorService.java         # resolves strategy by OperationType, delegates
  strategy/
    OperationStrategy.java               # interface: BigDecimal apply(BigDecimal a, BigDecimal b)
    AddStrategy.java, SubtractStrategy.java, MultiplyStrategy.java, DivideStrategy.java,
    ExponentStrategy.java, SqrtStrategy.java, PercentageStrategy.java
    OperationType.java                   # enum
  dto/
    CalculationRequest.java              # operation, operandA, operandB (Lombok)
    CalculationResponse.java             # result (Lombok)
  exception/
    GlobalExceptionHandler.java          # @RestControllerAdvice
    InvalidOperationException.java       # divide-by-zero, sqrt-of-negative, etc.
    ErrorResponse.java                   # { message, timestamp }
```

**API contract:** single `POST /api/calculate` endpoint. Request: `{ operation, operandA, operandB }` (`operandB` optional/ignored for unary ops like sqrt). Response: `{ result }` on success, `{ message, timestamp }` with an appropriate 4xx/5xx status on error.

**Strategy pattern:** each operation is its own `@Component` implementing `OperationStrategy`; Spring auto-wires all implementations into a `Map<OperationType, OperationStrategy>` injected into `CalculatorService`. Adding an operation later means adding one new class — no branching logic to touch. This is the primary "clean architecture" demonstration in the backend.

**Numeric type:** `BigDecimal` throughout (not `double`/`float`) to avoid floating-point precision artifacts in a calculator.

**Validation & errors:** Bean Validation (`@Valid`) on the request DTO catches malformed/missing input (400). `GlobalExceptionHandler` maps `InvalidOperationException` (divide-by-zero, sqrt-of-negative) to 400 with a clear message, and unexpected exceptions to 500. All errors return the same `ErrorResponse` shape.

**Lombok** used for DTO boilerplate (`@Data`/`@Value`, constructors). **MapStruct is deliberately not introduced in the core phase** — there is no persistent entity to map yet; it's introduced naturally in the bonus phase for `CalculationHistory` entity ↔ DTO mapping.

## Frontend (React + TypeScript)

```
frontend/src/
  api/calculatorApi.ts        # fetch wrapper: calculate(request) -> Promise<CalculationResponse>
  hooks/useCalculate.ts       # TanStack Query useMutation wrapping calculatorApi.calculate
  store/calculatorStore.ts    # Zustand: operandA, operandB, operation, display/input state
  components/Calculator/
    Calculator.tsx            # composes Display + Keypad, wires store + useCalculate
    Display.tsx               # shows current input / result / error
    Keypad.tsx                # digit + operator buttons
  types/calculator.ts         # OperationType, CalculationRequest, CalculationResponse
  App.tsx
```

**State split:** Zustand owns local UI/input state (current operands, selected operation) — synchronous client state with no server round-trip. TanStack Query owns the server call via `useMutation` (not `useQuery` — calculating is an action, not a cached GET resource), giving loading/error/success states and separating request lifecycle from UI state.

**Styling:** Tailwind CSS utility classes, mobile-first responsive breakpoints for the keypad/display layout. No component UI library — keeps the bundle small and avoids unneeded complexity for a calculator UI.

**Client-side validation:** numeric-only input, disabled submit on empty/invalid operand, inline error messages surfaced from the mutation's error state (including backend validation errors, e.g. "Cannot divide by zero").

## Docker

```
docker-compose.yml       # backend (Spring Boot, :8080) + frontend (nginx-served static build, :5173/:80)
backend/Dockerfile        # multi-stage: maven build -> slim JRE runtime
frontend/Dockerfile       # multi-stage: npm build -> nginx serving static build
```
`docker-compose up` is the primary "how to run" path in the README, with manual (non-Docker) instructions as a secondary path.

## Testing

- **Backend:** JUnit 5 + Mockito. Unit tests per strategy (edge cases: divide-by-zero, sqrt-of-negative, exponent with 0/negative exponent), `CalculatorService` tests (mocked strategies), `CalculatorController` tests (`@WebMvcTest` + MockMvc — valid request, invalid request, error mapping). JaCoCo configured in `pom.xml` to generate an HTML coverage report on `mvn test`.
- **Frontend:** Vitest + React Testing Library. Tests for `useCalculate`, `Calculator` component (input → submit → result/error render), and Zustand store logic. No coverage-report tooling configured for the frontend (explicit call — backend coverage report satisfies the deliverable).

## Documentation deliverable

README covering: setup instructions, how to run frontend/backend (Docker primary, manual secondary), API usage examples (curl/HTTP examples against `/api/calculate`), and a design-decisions/assumptions section — including an explicit note that JWT auth and calculation history were considered, found out of scope for the stated requirements, and implemented separately as a labeled bonus phase (see below).

## Bonus phase (deferred, separate from core)

Only attempted after the core phase is complete, tested, and documented. Kept in its own commits and its own clearly labeled README section.

- Spring Security + JWT: register/login endpoints, password hashing, JWT filter chain, protected routes.
- `CalculationHistory` entity (H2 or Postgres), persisted per authenticated user.
- MapStruct mapping `CalculationHistory` entity ↔ `HistoryResponse` DTO.
- Protected `GET /api/history` endpoint.
- Frontend: auth screens (login/register), a history view gated behind login, TanStack Query for fetching history.
