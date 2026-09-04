# Full-Stack Calculator

A calculator with a Spring Boot REST backend and a React + TypeScript frontend.

## Tech stack

- **Backend:** Java 17, Spring Boot 4, Maven, Spring Data JPA + PostgreSQL, MapStruct, SLF4J, JUnit 5 + Mockito, JaCoCo
- **Frontend:** React 19, TypeScript, Vite, `useReducer` (finite-state-machine hook), TanStack Query, Axios, Tailwind CSS, Vitest + React Testing Library
- **Infra:** Docker + Docker Compose (app + PostgreSQL)

## Setup & running

### Option A: Docker Compose (recommended)

```bash
docker compose up --build
```
- Backend: http://localhost:8080
- Frontend: http://localhost:5173

### Option B: Run manually

Backend — it persists calculation history with Spring Data JPA and will **fail to start without a running PostgreSQL**, so start one first:
```bash
docker compose up postgres -d
```
(or point it at any local Postgres whose database, user and password are all `calculator`, matching `spring.datasource.url: jdbc:postgresql://localhost:5432/calculator` in `backend/src/main/resources/application.yml`). Then:
```bash
cd backend
mvn spring-boot:run
```
Runs on http://localhost:8080.

Option A above needs no extra step — Docker Compose already brings up PostgreSQL and waits for it to be healthy before starting the backend.

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

If the JaCoCo report doesn't appear, it's because this particular checkout path contains non-ASCII characters, which the JVM javaagent used by JaCoCo does not handle on Windows; building from an ASCII-only path resolves it. A normal clone is unaffected.

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

`PERCENTAGE` is defined here as "`operandB` percent of `operandA`" — it computes `operandA * operandB / 100`, so `{"operandA": 50, "operandB": 20}` returns `10` (20% of 50). This is worth stating explicitly because the `%` key means different things on different calculators.

`EXPONENT` requires an integer `operandB` with magnitude at most 1000; anything else returns a 400 rather than attempting an unbounded computation.

`POST /api/calculate` also accepts an **optional** `X-Client-Id` header. When it is present, a successful calculation is saved to that client's history; when it is absent, the calculation is performed and returned exactly as before but nothing is persisted. A history-persistence failure is logged and swallowed — it never turns a successful calculation into an error response.

Example with curl:
```bash
curl -X POST http://localhost:8080/api/calculate \
  -H "Content-Type: application/json" \
  -d '{"operation": "DIVIDE", "operandA": 10, "operandB": 4}'
```

`GET /api/history`

Returns the 10 most recent calculations for a client, newest first.

Headers: `X-Client-Id` (**required**).

Response (200):
```json
[
  {
    "id": 2,
    "operation": "SQRT",
    "operandA": 9,
    "result": 3,
    "createdAt": "2026-09-05T12:00:05Z"
  },
  {
    "id": 1,
    "operation": "ADD",
    "operandA": 2,
    "operandB": 3,
    "result": 5,
    "createdAt": "2026-09-05T12:00:00Z"
  }
]
```

`operandB` is absent for unary operations (`SQRT`). An unknown client ID simply returns an empty array. Omitting the `X-Client-Id` header returns a 400 in the same error shape as `/api/calculate`.

Example with curl:
```bash
curl http://localhost:8080/api/history \
  -H "X-Client-Id: 3f0d7c1e-9b2a-4a55-8f6c-2b1d4e5a6c7d"
```

## Design decisions & assumptions

- **Single `/api/calculate` endpoint** with a Strategy pattern (one class per operation, injected by Spring into a lookup map) rather than one REST endpoint per operation. This avoids duplicated controller/validation boilerplate and keeps adding a new operation to a single new class with no branching logic touched.
- **`BigDecimal` throughout**, not `double`, to avoid floating-point precision issues in a calculator.
- **`useCalculatorLogic`, a `useReducer`-based finite state machine**, owns all calculator input state (both operands, the selected operation, and an explicit `input` / `result` / `error` phase). Modelling the keypad as explicit state transitions rather than a bag of independent setters fixed three bugs an earlier ad-hoc implementation had: digits kept appending onto a stale result after `=` instead of starting a fresh expression; chaining operations (`2 + 3 ×`) had no defined behavior at all, where it now evaluates the pending calculation before continuing; and a second decimal point could be typed into one operand, producing `1.5.9`. A fourth followed from the same modelling: digits pressed after a unary operation (`9 √ 4`) are now ignored rather than being displayed and then silently dropped from the request.
- **TanStack Query owns everything that touches the server**, split by primitive rather than force-fitting one: `useCalculate` is a `useMutation` (a command with a loading/error/success lifecycle, invalidating the history cache on success), and `useHistory` is a `useQuery` (a cached GET resource). Local input state stays in the reducer above; neither concern is pushed into the other.
- **Anonymous client ID, not accounts.** History is scoped by an anonymous per-browser identifier: the frontend generates a UUID on first load (`crypto.randomUUID()`, with a `Math.random()` fallback since `randomUUID` only exists in secure contexts), stores it in `localStorage`, and sends it as an `X-Client-Id` header on every request; the backend returns the last 10 calculations for exactly that header value. **This is a convenience scoping mechanism, not a security boundary** — the header is unverified and anyone can send any client ID and read that ID's history. That is a deliberate, stated tradeoff consistent with keeping real authentication out of scope: it gives a single-browser user their own history without introducing an auth system that would only be pretending to protect data that is not sensitive.
- **Out of scope for this assignment:** authentication. The assignment's requirements list functional arithmetic operations, input validation, and a REST API — not user accounts — and explicitly says to prioritize correctness, clarity, and maintainability over extra features. Adding a JWT auth system to a calculator would meaningfully expand the security-sensitive surface area without being asked for. Persisted calculation history, previously deferred alongside auth, **is now implemented** (PostgreSQL via Spring Data JPA, scoped by the anonymous client ID above). Leaving auth out is documented here as a considered, deliberate scope decision, not an oversight.
- **No database migrations:** `spring.jpa.hibernate.ddl-auto=update` creates the `calculation_history` table. A production app would use versioned migrations (Flyway/Liquibase); this is called out as a stated tradeoff for the scope of this exercise.

## AI tooling disclosure

This project was built with AI-assisted tooling (Claude Code). The prompts and instructions that drove the work are committed in this repository rather than kept separately — the design spec and implementation plan below *are* the prompt record, capturing the requirements, the design decisions taken (and rejected), and the step-by-step instructions each implementation session was given:

- [`docs/superpowers/specs/2026-09-04-fullstack-calculator-design.md`](docs/superpowers/specs/2026-09-04-fullstack-calculator-design.md) — requirements and design decisions
- [`docs/superpowers/plans/2026-09-04-fullstack-calculator.md`](docs/superpowers/plans/2026-09-04-fullstack-calculator.md) — the task-by-task implementation plan that was executed
- [`docs/superpowers/specs/2026-09-05-calculation-history-design.md`](docs/superpowers/specs/2026-09-05-calculation-history-design.md) — design for the calculation-history feature and the frontend restyle
- [`docs/superpowers/plans/2026-09-05-calculation-history.md`](docs/superpowers/plans/2026-09-05-calculation-history.md) — the implementation plan for that feature
