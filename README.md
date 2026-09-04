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
