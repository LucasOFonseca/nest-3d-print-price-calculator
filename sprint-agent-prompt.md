# Sprint Implementation Agent Prompt
## 3D Print Price Calculator — NestJS + Prisma + PostgreSQL

Use this prompt to instruct an AI coding agent to implement a single sprint. Replace the `[SPRINT_NUMBER]` and `[SPRINT_NAME]` placeholders before sending.

---

## Prompt

```
You are a senior backend engineer implementing Sprint [SPRINT_NUMBER] — [SPRINT_NAME] of the 3D Print Price Calculator API. Your job is to implement every task in this sprint completely and correctly, then verify every acceptance criterion before considering the sprint done.

---

### Project Context

**Stack:** NestJS · Prisma ORM · PostgreSQL  
**Global prefix:** `/api`  
**No authentication.** All data is global and shared — no user scoping, no ownership, no JWT.

**Domain entities:**
- `Filament` — spool material with price/gram calculation
- `Packaging` — packaging option with cost/unit calculation
- `EnergyConfig` — kWh price + printer watt consumption (singleton)
- `PrinterConfig` — hourly wear cost (singleton)
- `LaborConfig` — hourly labor rate (singleton)
- `ProfitConfig` — default profit margin % (singleton)
- `Quote` — saved calculation snapshot (PrintJob + CalculationResult, no foreign keys)

**Singleton pattern:** EnergyConfig, PrinterConfig, LaborConfig, and ProfitConfig always have exactly one row identified by `id = "singleton"`. All reads and writes use `where: { id: 'singleton' }`. Use `upsert` for writes to be safe.

**Calculation formula:**
```
filamentCost   = materialUsed × filament.costPerGram
energyCost     = (printerConsumption / 1000) × printTimeHours × kwhPrice
printerWear    = printTimeHours × wearCostPerHour
laborCost      = (printTimeHours × 0.1 + postProcessingHours) × hourlyRate
packagingCost  = pkg.costPerUnit  (only if includePackaging is true)
totalCost      = filamentCost + energyCost + printerWear + laborCost + packagingCost
profit         = totalCost × (profitMargin / 100)
finalPrice     = totalCost + profit
```

**Response envelope (all 2xx responses):**
```json
{ "data": { ... }, "statusCode": 200, "timestamp": "..." }
```

**Error shape (all exceptions):**
```json
{ "statusCode": 404, "message": "...", "error": "Not Found", "timestamp": "...", "path": "..." }
```

**Database schema (Prisma):**
```prisma
model Filament {
  id          String   @id @default(uuid())
  name        String
  spoolWeight Float
  spoolPrice  Float
  costPerGram Float
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
  @@map("filaments")
}

model Packaging {
  id           String   @id @default(uuid())
  name         String
  quantity     Int
  packagePrice Float
  costPerUnit  Float
  createdAt    DateTime @default(now())
  updatedAt    DateTime @updatedAt
  @@map("packaging")
}

model EnergyConfig {
  id                 String   @id @default("singleton")
  kwhPrice           Float    @default(0.85)
  printerConsumption Float    @default(150)
  updatedAt          DateTime @updatedAt
  @@map("energy_config")
}

model PrinterConfig {
  id              String   @id @default("singleton")
  wearCostPerHour Float    @default(1.50)
  updatedAt       DateTime @updatedAt
  @@map("printer_config")
}

model LaborConfig {
  id         String   @id @default("singleton")
  hourlyRate Float    @default(30.00)
  updatedAt  DateTime @updatedAt
  @@map("labor_config")
}

model ProfitConfig {
  id                  String   @id @default("singleton")
  defaultProfitMargin Float    @default(35)
  updatedAt           DateTime @updatedAt
  @@map("profit_config")
}

model Quote {
  id                    String   @id @default(uuid())
  name                  String
  createdAt             DateTime @default(now())
  filamentId            String
  filamentName          String
  materialUsed          Float
  printTimeHours        Int
  printTimeMinutes      Int
  paintTimeHours        Int      @default(0)
  paintTimeMinutes      Int      @default(0)
  assemblyTimeHours     Int      @default(0)
  assemblyTimeMinutes   Int      @default(0)
  finishingTimeHours    Int      @default(0)
  finishingTimeMinutes  Int      @default(0)
  includePostProcessing Boolean  @default(true)
  packagingId           String?
  packagingName         String?
  includePackaging      Boolean  @default(false)
  useDefaultMargin      Boolean  @default(true)
  profitMargin          Float
  filamentCost          Float
  energyCost            Float
  printerWear           Float
  laborCost             Float
  packagingCost         Float
  totalCost             Float
  profit                Float
  finalPrice            Float
  @@map("quotes")
}
```

**Default seed values:**
```
Filaments:  PLA Branco (1000g, R$89.90, costPerGram=0.0899)
            PLA Preto  (1000g, R$89.90, costPerGram=0.0899)
            PETG Azul  (1000g, R$119.90, costPerGram=0.1199)
Packaging:  Caixa de Papelão Padrão (10 units, R$35.00, costPerUnit=3.50)
            Saco Bolha Grande       (50 units, R$45.00, costPerUnit=0.90)
EnergyConfig:  kwhPrice=0.85, printerConsumption=150
PrinterConfig: wearCostPerHour=1.50
LaborConfig:   hourlyRate=30.00
ProfitConfig:  defaultProfitMargin=35
```

**Technology versions:**
- NestJS ^11.x
- Prisma ^6.x
- PostgreSQL 16.x
- class-validator ^0.14.x
- @nestjs/swagger ^8.x
- @nestjs/throttler ^6.x
- @nestjs/terminus ^10.x

**Sprint execution order and dependencies:**
```
Sprint 0 (Foundation)
    └── Sprint 1 (Config Settings)       ← depends on Sprint 0
    └── Sprint 2 (Filaments & Packaging) ← depends on Sprint 0; can run parallel to Sprint 1
            └── Sprint 3 (Calculator & Quotes) ← depends on Sprint 1 + 2
                    └── Sprint 4 (Polish) ← depends on all previous sprints
```

Assume all previous sprints are already complete and working before you begin.

---

### Sprint [SPRINT_NUMBER] — [SPRINT_NAME]

[PASTE THE FULL SPRINT SECTION FROM THE IMPLEMENTATION PLAN HERE — including all tasks and acceptance criteria]

---

### Instructions

1. **Read the full sprint** above before writing any code. Understand every task and every acceptance criterion.

2. **Implement every task completely.** Do not stub, skip, or leave TODOs. Every file must be production-ready.

3. **Follow the patterns exactly:**
   - Services inject `PrismaService` (globally provided — no need to re-import `PrismaModule`)
   - All DTOs use `class-validator` decorators and `@ApiProperty` / `@ApiPropertyOptional`
   - Controllers use `@ApiTags`, `@ApiOperation`, and `@ApiResponse` decorators
   - Singleton config writes always use `prisma.upsert` with `where: { id: 'singleton' }`
   - Calculated fields (`costPerGram`, `costPerUnit`) are always computed and stored server-side — never trusted from the client
   - Multi-step writes that must be atomic are wrapped in `prisma.$transaction`

4. **Verify every acceptance criterion** from the sprint before declaring done. If a criterion involves a specific numeric result (e.g., formula verification), trace through the calculation manually to confirm correctness.

5. **Output format:** For each task, output the complete file content. Use the exact file paths specified in the plan. After all files, list the acceptance criteria with a ✅ or ❌ next to each, and a one-line explanation of how it is satisfied.

6. **Do not modify anything outside this sprint's scope.** Do not refactor files from previous sprints unless a task explicitly requires it.
```

---

## Sprint Reference

Fill in `[SPRINT_NUMBER]` and `[SPRINT_NAME]` and paste the matching section below.

| Sprint | Name | Paste section |
|---|---|---|
| 0 | Project Foundation & Database Schema | `## Sprint 0` through `### Acceptance Criteria — Sprint 0` |
| 1 | Configuration Settings Module | `## Sprint 1` through `### Acceptance Criteria — Sprint 1` |
| 2 | Filaments & Packaging CRUD | `## Sprint 2` through `### Acceptance Criteria — Sprint 2` |
| 3 | Calculator & Quotes | `## Sprint 3` through `### Acceptance Criteria — Sprint 3` |
| 4 | Integration Polish & Documentation | `## Sprint 4` through `### Acceptance Criteria — Sprint 4` |

---

## Usage Notes

- Send one sprint at a time. Do not ask the agent to implement multiple sprints in a single prompt.
- The agent should have access to the existing codebase (e.g., via Claude Code or a similar tool with file read/write access) so it can read current file contents before editing.
- For Sprint 0, the agent is starting from scratch — no prior codebase is needed.
- For Sprints 1–4, confirm the previous sprint's acceptance criteria all pass before starting the next sprint.
- If the agent produces a file that conflicts with an existing one, have it read the existing file first and merge carefully rather than overwriting blindly.
