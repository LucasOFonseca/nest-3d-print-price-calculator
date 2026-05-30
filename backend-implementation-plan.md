# Backend API Implementation Plan
## 3D Print Price Calculator — NestJS + Prisma + PostgreSQL

> **Target stack:** NestJS · Prisma ORM · PostgreSQL  
> **Audience:** AI coding agents executing one sprint at a time  
> **Convention:** Each sprint is self-contained. Agents must complete all tasks and acceptance criteria before moving to the next sprint.

---

## Application Analysis Summary

The existing Next.js frontend uses **Zustand + localStorage** to persist all state client-side. The backend replaces that storage layer with a shared PostgreSQL database — no authentication, no user scoping. All data (configs, filaments, packaging, quotes) is global and shared across all clients of the same instance.

### Domain Entities

| Entity | Description |
|---|---|
| `Filament` | Spool material with price/gram calculation |
| `Packaging` | Packaging option with cost/unit calculation |
| `EnergyConfig` | kWh price + printer watt consumption (singleton) |
| `PrinterConfig` | Hourly wear cost of the printer (singleton) |
| `LaborConfig` | Hourly labor rate (singleton) |
| `ProfitConfig` | Default profit margin percentage (singleton) |
| `Quote` | Saved calculation snapshot (PrintJob + CalculationResult) |

The four config entities are **singletons** — there is exactly one row of each in the database, updated in place. No concept of users or ownership.

### Calculation Logic (from `store.ts → calculateResult`)

```
filamentCost   = materialUsed × filament.costPerGram
energyCost     = (printerConsumption / 1000) × printTimeHours × kwhPrice
printerWear    = printTimeHours × wearCostPerHour
laborCost      = (printTimeHours × 0.1 + postProcessingHours) × hourlyRate
packagingCost  = pkg.costPerUnit  (if includePackaging)
totalCost      = sum of all above
profit         = totalCost × (profitMargin / 100)
finalPrice     = totalCost + profit
```

### Full API Surface

```
GET    /filaments
POST   /filaments
PATCH  /filaments/:id
DELETE /filaments/:id

GET    /packaging
POST   /packaging
PATCH  /packaging/:id
DELETE /packaging/:id

GET    /config
PATCH  /config/energy
PATCH  /config/printer
PATCH  /config/labor
PATCH  /config/profit
POST   /config/restore-defaults
GET    /config/export
POST   /config/import

POST   /calculator/calculate

GET    /quotes
POST   /quotes
GET    /quotes/:id
DELETE /quotes/:id
POST   /quotes/:id/load
```

---

## Sprint 0 — Project Foundation & Database Schema

**Goal:** A running NestJS project with Prisma connected to PostgreSQL, a complete database schema, seeded default data, and all shared infrastructure in place. No business logic yet.

---

### Task 0.1 — Scaffold NestJS Project

```bash
npx @nestjs/cli new 3d-print-api --package-manager npm
cd 3d-print-api

# Core dependencies
npm install @nestjs/config
npm install prisma @prisma/client
npm install class-validator class-transformer
npm install @nestjs/swagger swagger-ui-express
npm install helmet compression

# Dev dependencies
npm install -D prisma
```

**Folder structure to create:**

```
src/
├── common/
│   ├── filters/
│   ├── interceptors/
│   └── pipes/
├── config-settings/
├── filaments/
├── packaging/
├── quotes/
├── calculator/
├── prisma/
└── main.ts
```

---

### Task 0.2 — Environment Configuration

Create `.env` (do not commit):

```env
DATABASE_URL="postgresql://postgres:password@localhost:5432/print_calculator"
PORT=3001
NODE_ENV="development"
FRONTEND_URL="http://localhost:3000"
```

Create `src/config/configuration.ts`:

```typescript
export default () => ({
  port: parseInt(process.env.PORT, 10) || 3001,
  database: { url: process.env.DATABASE_URL },
  frontend: { url: process.env.FRONTEND_URL || 'http://localhost:3000' },
})
```

---

### Task 0.3 — Docker Compose for Local Development

Create `docker-compose.yml` at project root:

```yaml
version: '3.8'
services:
  postgres:
    image: postgres:16-alpine
    restart: always
    environment:
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: password
      POSTGRES_DB: print_calculator
    ports:
      - '5432:5432'
    volumes:
      - pgdata:/var/lib/postgresql/data

volumes:
  pgdata:
```

---

### Task 0.4 — Prisma Schema

Initialize Prisma and create `prisma/schema.prisma`:

```bash
npx prisma init
```

Full schema:

```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

model Filament {
  id          String   @id @default(uuid())
  name        String
  spoolWeight Float    // grams
  spoolPrice  Float    // BRL
  costPerGram Float    // calculated field, stored for performance
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  @@map("filaments")
}

model Packaging {
  id           String   @id @default(uuid())
  name         String
  quantity     Int      // units per package
  packagePrice Float    // BRL
  costPerUnit  Float    // calculated field, stored for performance
  createdAt    DateTime @default(now())
  updatedAt    DateTime @updatedAt

  @@map("packaging")
}

// Singleton — always one row, identified by the fixed id "singleton"
model EnergyConfig {
  id                 String   @id @default("singleton")
  kwhPrice           Float    @default(0.85)
  printerConsumption Float    @default(150) // Watts
  updatedAt          DateTime @updatedAt

  @@map("energy_config")
}

// Singleton — always one row, identified by the fixed id "singleton"
model PrinterConfig {
  id              String   @id @default("singleton")
  wearCostPerHour Float    @default(1.50)
  updatedAt       DateTime @updatedAt

  @@map("printer_config")
}

// Singleton — always one row, identified by the fixed id "singleton"
model LaborConfig {
  id         String   @id @default("singleton")
  hourlyRate Float    @default(30.00)
  updatedAt  DateTime @updatedAt

  @@map("labor_config")
}

// Singleton — always one row, identified by the fixed id "singleton"
model ProfitConfig {
  id                  String   @id @default("singleton")
  defaultProfitMargin Float    @default(35)
  updatedAt           DateTime @updatedAt

  @@map("profit_config")
}

model Quote {
  id        String   @id @default(uuid())
  name      String
  createdAt DateTime @default(now())

  // PrintJob snapshot (flat columns for queryability)
  filamentId            String
  filamentName          String   // snapshot of name at save time
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
  packagingName         String?  // snapshot of name at save time
  includePackaging      Boolean  @default(false)
  useDefaultMargin      Boolean  @default(true)
  profitMargin          Float
  // CalculationResult snapshot
  filamentCost  Float
  energyCost    Float
  printerWear   Float
  laborCost     Float
  packagingCost Float
  totalCost     Float
  profit        Float
  finalPrice    Float

  @@map("quotes")
}
```

Run migrations:

```bash
npx prisma migrate dev --name init
npx prisma generate
```

---

### Task 0.5 — Database Seed

Create `prisma/seed.ts`:

```typescript
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  // Upsert singleton configs (safe to run multiple times)
  await prisma.energyConfig.upsert({
    where: { id: 'singleton' },
    update: {},
    create: { id: 'singleton', kwhPrice: 0.85, printerConsumption: 150 },
  })
  await prisma.printerConfig.upsert({
    where: { id: 'singleton' },
    update: {},
    create: { id: 'singleton', wearCostPerHour: 1.50 },
  })
  await prisma.laborConfig.upsert({
    where: { id: 'singleton' },
    update: {},
    create: { id: 'singleton', hourlyRate: 30.00 },
  })
  await prisma.profitConfig.upsert({
    where: { id: 'singleton' },
    update: {},
    create: { id: 'singleton', defaultProfitMargin: 35 },
  })

  // Seed default filaments only if table is empty
  const filamentCount = await prisma.filament.count()
  if (filamentCount === 0) {
    await prisma.filament.createMany({
      data: [
        { name: 'PLA Branco', spoolWeight: 1000, spoolPrice: 89.90, costPerGram: 0.0899 },
        { name: 'PLA Preto',  spoolWeight: 1000, spoolPrice: 89.90, costPerGram: 0.0899 },
        { name: 'PETG Azul',  spoolWeight: 1000, spoolPrice: 119.90, costPerGram: 0.1199 },
      ],
    })
  }

  // Seed default packaging only if table is empty
  const packagingCount = await prisma.packaging.count()
  if (packagingCount === 0) {
    await prisma.packaging.createMany({
      data: [
        { name: 'Caixa de Papelão Padrão', quantity: 10, packagePrice: 35.00, costPerUnit: 3.50 },
        { name: 'Saco Bolha Grande',       quantity: 50, packagePrice: 45.00, costPerUnit: 0.90 },
      ],
    })
  }

  console.log('Seed complete')
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
```

Add to `package.json`:

```json
"prisma": {
  "seed": "ts-node prisma/seed.ts"
}
```

Run seed:

```bash
npx prisma db seed
```

---

### Task 0.6 — PrismaModule (Global Shared Service)

Create `src/prisma/prisma.service.ts`:

```typescript
import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common'
import { PrismaClient } from '@prisma/client'

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  async onModuleInit() { await this.$connect() }
  async onModuleDestroy() { await this.$disconnect() }
}
```

Create `src/prisma/prisma.module.ts` decorated with `@Global()`. Export `PrismaService` so every module can inject it without re-importing `PrismaModule`.

---

### Task 0.7 — Shared Infrastructure

**Global Exception Filter** (`src/common/filters/http-exception.filter.ts`):  
Catch all `HttpException` instances. Return consistent shape:
```json
{ "statusCode": 404, "message": "Filament not found", "error": "Not Found", "timestamp": "...", "path": "/filaments/abc" }
```

**Response Interceptor** (`src/common/interceptors/transform.interceptor.ts`):  
Wrap all success responses:
```json
{ "data": { ... }, "statusCode": 200, "timestamp": "..." }
```

**main.ts setup:**

```typescript
import { NestFactory } from '@nestjs/core'
import { ValidationPipe } from '@nestjs/common'
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger'
import helmet from 'helmet'
import * as compression from 'compression'
import { AppModule } from './app.module'

async function bootstrap() {
  const app = await NestFactory.create(AppModule)

  app.use(helmet())
  app.use(compression())
  app.enableCors({ origin: process.env.FRONTEND_URL })
  app.setGlobalPrefix('api')

  app.useGlobalPipes(new ValidationPipe({
    whitelist: true,
    forbidNonWhitelisted: true,
    transform: true,
    transformOptions: { enableImplicitConversion: true },
  }))

  const config = new DocumentBuilder()
    .setTitle('3D Print Calculator API')
    .setDescription('Backend API for the 3D Print Price Calculator')
    .setVersion('1.0')
    .build()
  SwaggerModule.setup('api/docs', app, SwaggerModule.createDocument(app, config))

  await app.listen(process.env.PORT || 3001)
}
bootstrap()
```

---

### Acceptance Criteria — Sprint 0

- [ ] `docker-compose up` starts PostgreSQL successfully
- [ ] `npx prisma migrate dev` runs without errors, all 7 tables created
- [ ] `npx prisma db seed` populates defaults (3 filaments, 2 packaging, 4 singleton config rows)
- [ ] Seed is idempotent — running it twice does not duplicate filaments or packaging
- [ ] `npm run start:dev` starts on `localhost:3001` without errors
- [ ] Swagger UI is accessible at `http://localhost:3001/api/docs`
- [ ] Global exception filter returns consistent error shape on `404` and `400`
- [ ] Response interceptor wraps all `2xx` responses in `{ data, statusCode, timestamp }`

---

## Sprint 1 — Configuration Settings Module

**Goal:** Full CRUD for the four singleton config entities, plus import/export and restore-defaults.

---

### Task 1.1 — DTOs

**`update-energy.dto.ts`**

```typescript
export class UpdateEnergyDto {
  @IsOptional() @IsNumber() @Min(0)
  @ApiPropertyOptional({ example: 0.85, description: 'Price per kWh in BRL' })
  kwhPrice?: number

  @IsOptional() @IsNumber() @Min(1)
  @ApiPropertyOptional({ example: 150, description: 'Printer power consumption in Watts' })
  printerConsumption?: number
}
```

**`update-printer.dto.ts`**

```typescript
export class UpdatePrinterDto {
  @IsOptional() @IsNumber() @Min(0)
  @ApiPropertyOptional({ example: 1.50, description: 'Printer wear cost per hour in BRL' })
  wearCostPerHour?: number
}
```

**`update-labor.dto.ts`**

```typescript
export class UpdateLaborDto {
  @IsOptional() @IsNumber() @Min(0)
  @ApiPropertyOptional({ example: 30.00, description: 'Labor hourly rate in BRL' })
  hourlyRate?: number
}
```

**`update-profit.dto.ts`**

```typescript
export class UpdateProfitDto {
  @IsOptional() @IsNumber() @Min(0) @Max(100)
  @ApiPropertyOptional({ example: 35, description: 'Default profit margin percentage (0–100)' })
  defaultProfitMargin?: number
}
```

**`import-config.dto.ts`** — mirrors the `AppConfig` interface from the frontend exactly:

```typescript
export class FilamentImportDto {
  @IsString() @IsNotEmpty() name: string
  @IsNumber() @Min(1) spoolWeight: number
  @IsNumber() @Min(0) spoolPrice: number
}

export class PackagingImportDto {
  @IsString() @IsNotEmpty() name: string
  @IsInt() @Min(1) quantity: number
  @IsNumber() @Min(0) packagePrice: number
}

export class EnergyImportDto {
  @IsNumber() @Min(0) kwhPrice: number
  @IsNumber() @Min(1) printerConsumption: number
}

export class PrinterImportDto {
  @IsNumber() @Min(0) wearCostPerHour: number
}

export class LaborImportDto {
  @IsNumber() @Min(0) hourlyRate: number
}

export class ProfitImportDto {
  @IsNumber() @Min(0) @Max(100) defaultProfitMargin: number
}

export class ImportConfigDto {
  @ValidateNested({ each: true }) @Type(() => FilamentImportDto)
  filaments: FilamentImportDto[]

  @IsOptional() @ValidateNested({ each: true }) @Type(() => PackagingImportDto)
  packaging?: PackagingImportDto[]

  @ValidateNested() @Type(() => EnergyImportDto)
  energy: EnergyImportDto

  @ValidateNested() @Type(() => PrinterImportDto)
  printer: PrinterImportDto

  @ValidateNested() @Type(() => LaborImportDto)
  labor: LaborImportDto

  @ValidateNested() @Type(() => ProfitImportDto)
  profit: ProfitImportDto
}
```

---

### Task 1.2 — ConfigSettings Service

Create `src/config-settings/config-settings.service.ts`.

All config reads use `id: 'singleton'`. All updates use Prisma's `upsert` with `where: { id: 'singleton' }` to be safe even if the row is somehow missing.

**`getConfig()`**  
Fetch all four config rows and all filaments and packaging in parallel, then return the complete `AppConfig` shape:

```typescript
async getConfig() {
  const [energy, printer, labor, profit, filaments, packaging] = await Promise.all([
    this.prisma.energyConfig.findUnique({ where: { id: 'singleton' } }),
    this.prisma.printerConfig.findUnique({ where: { id: 'singleton' } }),
    this.prisma.laborConfig.findUnique({ where: { id: 'singleton' } }),
    this.prisma.profitConfig.findUnique({ where: { id: 'singleton' } }),
    this.prisma.filament.findMany({ orderBy: { createdAt: 'asc' } }),
    this.prisma.packaging.findMany({ orderBy: { createdAt: 'asc' } }),
  ])
  return { filaments, packaging, energy, printer, labor, profit }
}
```

**`updateEnergy(dto: UpdateEnergyDto)`**  
```typescript
return this.prisma.energyConfig.upsert({
  where: { id: 'singleton' },
  update: dto,
  create: { id: 'singleton', kwhPrice: 0.85, printerConsumption: 150, ...dto },
})
```

**`updatePrinter(dto)` / `updateLabor(dto)` / `updateProfit(dto)`**  
Same upsert pattern as `updateEnergy`.

**`restoreDefaults()`**  
Wrapped in `$transaction`:
1. Delete all filaments and packaging
2. Reset all four configs to default values
3. Re-create default filaments and packaging (same as seed data)
4. Return the complete config via `getConfig()`

**`importConfig(dto: ImportConfigDto)`**  
Wrapped in `$transaction`:
1. Delete all existing filaments and packaging
2. Update all four configs with imported values
3. Insert new filaments (calculate `costPerGram = spoolPrice / spoolWeight`)
4. Insert new packaging (calculate `costPerUnit = packagePrice / quantity`)
5. Return complete config via `getConfig()`

**`exportConfig()`**  
Calls `getConfig()` and returns the result. Controller sets the download headers.

---

### Task 1.3 — ConfigSettings Controller

```
GET    /api/config               → getConfig()
PATCH  /api/config/energy        → updateEnergy(UpdateEnergyDto)
PATCH  /api/config/printer       → updatePrinter(UpdatePrinterDto)
PATCH  /api/config/labor         → updateLabor(UpdateLaborDto)
PATCH  /api/config/profit        → updateProfit(UpdateProfitDto)
POST   /api/config/restore-defaults → restoreDefaults()
GET    /api/config/export        → exportConfig()
POST   /api/config/import        → importConfig(ImportConfigDto)
```

For `GET /api/config/export`:

```typescript
@Get('export')
@Header('Content-Disposition', 'attachment; filename="config.json"')
@Header('Content-Type', 'application/json')
async exportConfig(@Res({ passthrough: true }) res: Response) {
  return this.configSettingsService.exportConfig()
}
```

---

### Acceptance Criteria — Sprint 1

- [ ] `GET /api/config` returns full AppConfig shape matching the frontend interface
- [ ] `PATCH /api/config/energy` updates and returns the energy config
- [ ] `PATCH /api/config/printer` updates and returns the printer config
- [ ] `PATCH /api/config/labor` updates and returns the labor config
- [ ] `PATCH /api/config/profit` rejects values outside 0–100 with `400`
- [ ] `POST /api/config/restore-defaults` resets everything to seed values (atomically)
- [ ] `GET /api/config/export` triggers a JSON file download
- [ ] `POST /api/config/import` replaces all config atomically; invalid payload returns `400`
- [ ] Configs are truly global — no concept of users or ownership in any query
- [ ] All four config rows always exist (upsert prevents missing-row errors)

---

## Sprint 2 — Filaments & Packaging CRUD

**Goal:** Full CRUD for filaments and packaging with auto-calculation of derived fields.

---

### Task 2.1 — Filament DTOs

**`create-filament.dto.ts`**

```typescript
export class CreateFilamentDto {
  @IsString() @IsNotEmpty() @MaxLength(100)
  @ApiProperty({ example: 'PLA Vermelho', description: 'Filament display name' })
  name: string

  @IsNumber() @Min(1)
  @ApiProperty({ example: 1000, description: 'Spool total weight in grams' })
  spoolWeight: number

  @IsNumber() @Min(0)
  @ApiProperty({ example: 89.90, description: 'Spool purchase price in BRL' })
  spoolPrice: number
}
```

**`update-filament.dto.ts`** — `PartialType(CreateFilamentDto)` (all fields optional)

---

### Task 2.2 — Packaging DTOs

**`create-packaging.dto.ts`**

```typescript
export class CreatePackagingDto {
  @IsString() @IsNotEmpty() @MaxLength(100)
  @ApiProperty({ example: 'Caixa Pequena', description: 'Packaging display name' })
  name: string

  @IsInt() @Min(1)
  @ApiProperty({ example: 10, description: 'Number of units per package' })
  quantity: number

  @IsNumber() @Min(0)
  @ApiProperty({ example: 35.00, description: 'Package purchase price in BRL' })
  packagePrice: number
}
```

**`update-packaging.dto.ts`** — `PartialType(CreatePackagingDto)`

---

### Task 2.3 — Filaments Service

Create `src/filaments/filaments.service.ts`:

**`findAll()`**  
`prisma.filament.findMany({ orderBy: { createdAt: 'asc' } })`

**`findOne(id)`**  
`prisma.filament.findUnique({ where: { id } })` — throw `NotFoundException` if null.

**`create(dto)`**

```typescript
const costPerGram = dto.spoolPrice / dto.spoolWeight
return this.prisma.filament.create({ data: { ...dto, costPerGram } })
```

**`update(id, dto)`**

```typescript
await this.findOne(id) // throws 404 if not found
const data: Prisma.FilamentUpdateInput = { ...dto }
if (dto.spoolPrice !== undefined || dto.spoolWeight !== undefined) {
  // Need both values to recalculate; fetch current if not provided
  const current = await this.prisma.filament.findUnique({ where: { id } })
  const spoolPrice = dto.spoolPrice ?? current.spoolPrice
  const spoolWeight = dto.spoolWeight ?? current.spoolWeight
  data.costPerGram = spoolPrice / spoolWeight
}
return this.prisma.filament.update({ where: { id }, data })
```

**`remove(id)`**  
Verify existence via `findOne`, then delete. Return `{ message: 'Filament deleted' }`.

---

### Task 2.4 — Filaments Controller

```
GET    /api/filaments      → findAll()                  → Filament[]
POST   /api/filaments      → create(CreateFilamentDto)  → Filament
PATCH  /api/filaments/:id  → update(id, UpdateFilamentDto) → Filament
DELETE /api/filaments/:id  → remove(id)                → { message }
```

---

### Task 2.5 — Packaging Service

Create `src/packaging/packaging.service.ts` with the identical pattern as `FilamentsService`.

**Calculated field:**
```typescript
costPerUnit = packagePrice / quantity
```

Recalculate `costPerUnit` in `update` whenever `packagePrice` or `quantity` changes, fetching the current record for whichever field is not provided.

---

### Task 2.6 — Packaging Controller

```
GET    /api/packaging      → findAll()                     → Packaging[]
POST   /api/packaging      → create(CreatePackagingDto)    → Packaging
PATCH  /api/packaging/:id  → update(id, UpdatePackagingDto) → Packaging
DELETE /api/packaging/:id  → remove(id)                   → { message }
```

---

### Acceptance Criteria — Sprint 2

- [ ] `POST /api/filaments` creates filament and auto-computes `costPerGram`
- [ ] `PATCH /api/filaments/:id` correctly recalculates `costPerGram` when only `spoolPrice` is provided (fetches current `spoolWeight` from DB)
- [ ] `PATCH /api/filaments/:id` correctly recalculates `costPerGram` when only `spoolWeight` is provided
- [ ] `DELETE /api/filaments/:id` returns `404` for non-existent id
- [ ] Same three cases verified for packaging (`costPerUnit` recalculation)
- [ ] `CreateFilamentDto`: `name` required, `spoolWeight` ≥ 1, `spoolPrice` ≥ 0
- [ ] `CreatePackagingDto`: `quantity` must be an integer ≥ 1
- [ ] `GET /api/filaments` returns records ordered by `createdAt` ascending

---

## Sprint 3 — Calculator & Quotes

**Goal:** A stateless calculator endpoint and full CRUD for saved quotes with snapshot storage.

---

### Task 3.1 — Calculator DTO

**`calculate.dto.ts`** — mirrors the `PrintJob` type exactly:

```typescript
export class CalculateDto {
  @IsUUID() @ApiProperty({ example: 'uuid-of-filament' })
  filamentId: string

  @IsNumber() @Min(0) @ApiProperty({ example: 250 })
  materialUsed: number

  @IsInt() @Min(0) @ApiProperty({ example: 12 })
  printTimeHours: number

  @IsInt() @Min(0) @Max(59) @ApiProperty({ example: 30 })
  printTimeMinutes: number

  @IsBoolean() @ApiProperty({ example: true })
  includePostProcessing: boolean

  @IsInt() @Min(0) @ApiProperty({ example: 1 })
  paintTimeHours: number

  @IsInt() @Min(0) @Max(59) @ApiProperty({ example: 0 })
  paintTimeMinutes: number

  @IsInt() @Min(0) @ApiProperty({ example: 0 })
  assemblyTimeHours: number

  @IsInt() @Min(0) @Max(59) @ApiProperty({ example: 30 })
  assemblyTimeMinutes: number

  @IsInt() @Min(0) @ApiProperty({ example: 0 })
  finishingTimeHours: number

  @IsInt() @Min(0) @Max(59) @ApiProperty({ example: 45 })
  finishingTimeMinutes: number

  @IsBoolean() @ApiProperty({ example: true })
  useDefaultMargin: boolean

  @IsNumber() @Min(0) @Max(100) @ApiProperty({ example: 35 })
  profitMargin: number

  @IsOptional() @IsUUID()
  packagingId?: string

  @IsBoolean() @ApiProperty({ example: false })
  includePackaging: boolean
}
```

---

### Task 3.2 — Calculator Service

Create `src/calculator/calculator.service.ts`. Port the calculation formula from the frontend's `store.ts → calculateResult` exactly:

```typescript
async calculate(dto: CalculateDto) {
  const filament = await this.prisma.filament.findUnique({ where: { id: dto.filamentId } })
  if (!filament) throw new NotFoundException('Filament not found')

  let packagingCost = 0
  if (dto.includePackaging && dto.packagingId) {
    const pkg = await this.prisma.packaging.findUnique({ where: { id: dto.packagingId } })
    if (pkg) packagingCost = pkg.costPerUnit
  }

  const [energy, printer, labor, profit] = await Promise.all([
    this.prisma.energyConfig.findUnique({ where: { id: 'singleton' } }),
    this.prisma.printerConfig.findUnique({ where: { id: 'singleton' } }),
    this.prisma.laborConfig.findUnique({ where: { id: 'singleton' } }),
    this.prisma.profitConfig.findUnique({ where: { id: 'singleton' } }),
  ])

  const printTime = dto.printTimeHours + dto.printTimeMinutes / 60

  const postProcessingTime = dto.includePostProcessing
    ? (dto.paintTimeHours    + dto.paintTimeMinutes    / 60)
    + (dto.assemblyTimeHours + dto.assemblyTimeMinutes / 60)
    + (dto.finishingTimeHours + dto.finishingTimeMinutes / 60)
    : 0

  const filamentCost = dto.materialUsed * filament.costPerGram
  const energyCost   = (energy.printerConsumption / 1000) * printTime * energy.kwhPrice
  const printerWear  = printTime * printer.wearCostPerHour
  const laborCost    = (printTime * 0.1 + postProcessingTime) * labor.hourlyRate
  const totalCost    = filamentCost + energyCost + printerWear + laborCost + packagingCost

  const margin       = dto.useDefaultMargin ? profit.defaultProfitMargin : dto.profitMargin
  const profitAmount = totalCost * (margin / 100)
  const finalPrice   = totalCost + profitAmount

  return { filamentCost, energyCost, printerWear, laborCost, packagingCost, totalCost, profit: profitAmount, finalPrice }
}
```

---

### Task 3.3 — Calculator Controller

```
POST /api/calculator/calculate → calculate(CalculateDto) → CalculationResult
```

---

### Task 3.4 — Quotes DTOs

**`create-quote.dto.ts`**

```typescript
export class CreateQuoteDto {
  @IsString() @IsNotEmpty() @MaxLength(200)
  @ApiProperty({ example: 'Peça Cliente X' })
  name: string

  @ValidateNested()
  @Type(() => CalculateDto)
  printJob: CalculateDto
}
```

---

### Task 3.5 — Quotes Service

Create `src/quotes/quotes.service.ts`:

**`findAll()`**  
Return all quotes ordered by `createdAt DESC`, shaped as the frontend expects:
```json
[
  {
    "id": "...",
    "name": "Peça Cliente X",
    "date": "2026-05-29T...",
    "printJob": { "filamentId": "...", "materialUsed": 250, ... },
    "result": { "filamentCost": 22.47, "totalCost": 45.00, "finalPrice": 60.75, ... }
  }
]
```

**`findOne(id)`**  
Find by `id`. Throw `NotFoundException` if missing.

**`create(dto: CreateQuoteDto)`**  
1. Resolve filament name for snapshot: `prisma.filament.findUnique({ where: { id: dto.printJob.filamentId } })`  
   Throw `NotFoundException` if filament not found.
2. Resolve packaging name for snapshot if `includePackaging` and `packagingId` are set.
3. Call `calculatorService.calculate(dto.printJob)` to get the result.
4. Create the Quote record with all snapshot fields (both name snapshots and all result fields).
5. Return the formatted quote.

**`remove(id)`**  
Verify existence via `findOne`, then delete. Return `{ message: 'Quote deleted' }`.

**`loadQuote(id)`**  
Fetch quote via `findOne`. Return only the `printJob` object (the frontend uses this to repopulate the calculator form).

**Response shape helpers** — create a private `formatQuote(quote)` method that maps the flat DB row back to the nested `{ id, name, date, printJob: {...}, result: {...} }` shape. Call it in `findAll`, `findOne`, and `create`.

---

### Task 3.6 — Quotes Controller

```
GET    /api/quotes           → findAll()              → Quote[]
POST   /api/quotes           → create(CreateQuoteDto) → Quote
GET    /api/quotes/:id       → findOne(id)            → Quote
DELETE /api/quotes/:id       → remove(id)             → { message }
POST   /api/quotes/:id/load  → loadQuote(id)          → PrintJob
```

---

### Acceptance Criteria — Sprint 3

- [ ] `POST /api/calculator/calculate` returns all 8 breakdown fields
- [ ] Calculator result matches the frontend formula — verify with these known values:
  - Filament: 100g at R$0.10/g → `filamentCost = 10.00`
  - Print time: 2h, 200W, kwhPrice R$1.00 → `energyCost = 0.40`
  - wearCostPerHour R$2.00, 2h → `printerWear = 4.00`
  - No post-processing → `laborCost = 2 × 0.1 × 30 = 6.00`
  - `totalCost = 20.40`, 50% margin → `finalPrice = 30.60`
- [ ] `POST /api/calculator/calculate` with non-existent `filamentId` returns `404`
- [ ] `POST /api/quotes` saves a snapshot — changing the filament price afterwards does not affect the saved quote
- [ ] `GET /api/quotes` returns records ordered newest-first
- [ ] `POST /api/quotes/:id/load` returns a `printJob` object with all fields the frontend form expects
- [ ] `DELETE /api/quotes/:id` returns `404` for non-existent id
- [ ] `CreateQuoteDto` validation: `name` required, `printJob` fully validated via nested DTO

---

## Sprint 4 — Integration Polish & Documentation

**Goal:** End-to-end tests, Swagger documentation, security hardening, health check, and a frontend integration guide.

---

### Task 4.1 — End-to-End Tests

Install:

```bash
npm install -D supertest @types/supertest
```

Create `test/app.e2e-spec.ts`. Use a dedicated test database (`DATABASE_URL` pointing to `print_calculator_test`) and run `prisma migrate deploy` + seed before each suite.

**Config flow:**
```
GET /api/config
→ PATCH /api/config/energy (kwhPrice: 1.00)
→ GET /api/config — verify kwhPrice is 1.00
→ POST /api/config/restore-defaults
→ GET /api/config — verify kwhPrice is back to 0.85
```

**Import/Export flow:**
```
GET /api/config/export → capture JSON
→ PATCH /api/config/energy (kwhPrice: 9.99)
→ POST /api/config/import (original JSON)
→ GET /api/config — verify kwhPrice is 0.85 again
→ GET /api/filaments — verify default filaments are back
```

**Filaments flow:**
```
POST /api/filaments (name: 'ABS', spoolWeight: 800, spoolPrice: 96.00)
→ verify costPerGram = 0.12
→ GET /api/filaments — verify it appears
→ PATCH /api/filaments/:id (spoolPrice: 80.00)
→ verify costPerGram = 0.10
→ DELETE /api/filaments/:id
→ GET /api/filaments — verify it is gone
→ DELETE /api/filaments/:id — verify 404
```

**Calculator formula verification:**
```
Set configs: kwhPrice=1.00, printerConsumption=200, wearCostPerHour=2.00, hourlyRate=30.00
Create filament: costPerGram=0.10
POST /api/calculator/calculate with materialUsed=100, printTime=2h, no post-processing, 50% margin
→ assert filamentCost=10.00, energyCost=0.40, printerWear=4.00, laborCost=6.00
→ assert totalCost=20.40, finalPrice=30.60
```

**Quotes flow:**
```
POST /api/quotes
→ GET /api/quotes — verify newest-first ordering with multiple quotes
→ GET /api/quotes/:id — verify snapshot fields
→ Change filament price → GET /api/quotes/:id — verify snapshot unchanged
→ POST /api/quotes/:id/load — verify PrintJob shape
→ DELETE /api/quotes/:id
→ GET /api/quotes/:id — verify 404
```

---

### Task 4.2 — Swagger Documentation

Annotate all DTOs and controllers:

- All DTO fields: `@ApiProperty({ description, example, required })`
- All controller methods: `@ApiOperation({ summary: '...' })`
- All success responses: `@ApiResponse({ status: 200, description: '...' })`
- All error responses documented: `400`, `404` on relevant endpoints
- Tag controllers with `@ApiTags('filaments')`, `@ApiTags('packaging')`, etc.

Ensure the Swagger UI at `/api/docs` shows all 19 endpoints grouped by tag.

---

### Task 4.3 — Rate Limiting

```bash
npm install @nestjs/throttler
```

Configure in `AppModule`:

```typescript
ThrottlerModule.forRoot([{ ttl: 60000, limit: 120 }])
```

Apply `ThrottlerGuard` globally. This protects the calculator and import endpoints from abuse without requiring auth.

---

### Task 4.4 — Health Check Endpoint

```bash
npm install @nestjs/terminus
```

Create `GET /api/health` returning:

```json
{
  "status": "ok",
  "info": { "database": { "status": "up" } }
}
```

Use `PrismaHealthIndicator` to check DB connectivity.

---

### Task 4.5 — Frontend Integration Guide

Create `FRONTEND_INTEGRATION.md` documenting the migration from Zustand localStorage to API calls.

**Axios Client Setup:**

```typescript
// lib/api-client.ts
import axios from 'axios'

export const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api',
})
```

No auth headers needed — all endpoints are open.

**Zustand Store Migration — Action-to-Endpoint Mapping:**

| Store Action | HTTP Call | Notes |
|---|---|---|
| `addFilament` | `POST /filaments` | Response includes calculated `costPerGram` |
| `updateFilament` | `PATCH /filaments/:id` | `costPerGram` recalculated server-side |
| `deleteFilament` | `DELETE /filaments/:id` | |
| `addPackaging` | `POST /packaging` | Response includes calculated `costPerUnit` |
| `updatePackaging` | `PATCH /packaging/:id` | `costPerUnit` recalculated server-side |
| `deletePackaging` | `DELETE /packaging/:id` | |
| `updateEnergyConfig` | `PATCH /config/energy` | |
| `updatePrinterConfig` | `PATCH /config/printer` | |
| `updateLaborConfig` | `PATCH /config/labor` | |
| `updateProfitConfig` | `PATCH /config/profit` | |
| `calculateResult` | `POST /calculator/calculate` | Pass current `printJob` state |
| `saveQuote` | `POST /quotes` | Pass `{ name, printJob }` |
| `deleteQuote` | `DELETE /quotes/:id` | |
| `loadQuote` | `POST /quotes/:id/load` → returns `PrintJob` | Set result into Zustand `printJob` |
| `importConfig` | `POST /config/import` | |
| `restoreDefaults` | `POST /config/restore-defaults` | |

**Removing localStorage persistence:**  
Remove the `persist` middleware from the Zustand store. On app load, call `GET /api/config` and `GET /api/quotes` to hydrate Zustand state from the server.

**Initial Hydration Pattern:**

```typescript
// In a top-level layout or provider:
useEffect(() => {
  async function hydrate() {
    const [config, quotes] = await Promise.all([
      api.get('/config'),
      api.get('/quotes'),
    ])
    useAppStore.setState({
      config: config.data.data,
      quotes: quotes.data.data,
    })
  }
  hydrate()
}, [])
```

---

### Acceptance Criteria — Sprint 4

- [ ] All e2e tests pass (`npm run test:e2e`)
- [ ] Swagger UI at `/api/docs` lists all 19 endpoints grouped by tag with examples
- [ ] `GET /api/health` returns `200` with DB status
- [ ] Endpoints return `429` when rate limit is exceeded
- [ ] `FRONTEND_INTEGRATION.md` covers Axios setup, hydration pattern, and full action mapping
- [ ] Import config endpoint is atomic — a partial failure rolls back all changes
- [ ] `POST /api/config/restore-defaults` is also atomic

---

## Schema Quick Reference

```
Filament       (id, name, spoolWeight, spoolPrice, costPerGram, createdAt, updatedAt)
Packaging      (id, name, quantity, packagePrice, costPerUnit, createdAt, updatedAt)
EnergyConfig   (id="singleton", kwhPrice, printerConsumption, updatedAt)
PrinterConfig  (id="singleton", wearCostPerHour, updatedAt)
LaborConfig    (id="singleton", hourlyRate, updatedAt)
ProfitConfig   (id="singleton", defaultProfitMargin, updatedAt)
Quote          (id, name, createdAt, ...PrintJob snapshot fields, ...CalculationResult snapshot fields)
```

No foreign keys between `Quote` and `Filament`/`Packaging` — quotes store name snapshots deliberately so historical records stay accurate after the source record is edited or deleted.

---

## Sprint Execution Order & Dependencies

```
Sprint 0 (Foundation)
    └── Sprint 1 (Config Settings)       ← depends on 0
    └── Sprint 2 (Filaments & Packaging) ← depends on 0; can run parallel to Sprint 1
            └── Sprint 3 (Calculator & Quotes) ← depends on 1 + 2
                    └── Sprint 4 (Polish) ← depends on all
```

---

## Default Seed Values

```typescript
// Filaments
{ name: 'PLA Branco', spoolWeight: 1000, spoolPrice: 89.90,  costPerGram: 0.0899 }
{ name: 'PLA Preto',  spoolWeight: 1000, spoolPrice: 89.90,  costPerGram: 0.0899 }
{ name: 'PETG Azul',  spoolWeight: 1000, spoolPrice: 119.90, costPerGram: 0.1199 }

// Packaging
{ name: 'Caixa de Papelão Padrão', quantity: 10, packagePrice: 35.00, costPerUnit: 3.50 }
{ name: 'Saco Bolha Grande',       quantity: 50, packagePrice: 45.00, costPerUnit: 0.90 }

// Config singletons
EnergyConfig:  { kwhPrice: 0.85, printerConsumption: 150 }
PrinterConfig: { wearCostPerHour: 1.50 }
LaborConfig:   { hourlyRate: 30.00 }
ProfitConfig:  { defaultProfitMargin: 35 }
```

---

## Technology Versions

| Package | Recommended Version |
|---|---|
| NestJS | ^11.x |
| Prisma | ^6.x |
| PostgreSQL | 16.x |
| `class-validator` | ^0.14.x |
| `@nestjs/swagger` | ^8.x |
| `@nestjs/throttler` | ^6.x |
| `@nestjs/terminus` | ^10.x |
