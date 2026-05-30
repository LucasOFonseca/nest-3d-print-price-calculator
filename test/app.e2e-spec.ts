import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';
import { HttpExceptionFilter } from '../src/common/filters/http-exception.filter';
import { TransformInterceptor } from '../src/common/interceptors/transform.interceptor';

// ─── helpers ─────────────────────────────────────────────────────────────────
async function seedTestDb(prisma: PrismaService) {
  // Wipe everything
  await prisma.quote.deleteMany();
  await prisma.filament.deleteMany();
  await prisma.packaging.deleteMany();

  // Reset singletons to defaults
  await prisma.energyConfig.upsert({
    where: { id: 'singleton' },
    update: { kwhPrice: 0.85, printerConsumption: 150 },
    create: { id: 'singleton', kwhPrice: 0.85, printerConsumption: 150 },
  });
  await prisma.printerConfig.upsert({
    where: { id: 'singleton' },
    update: { wearCostPerHour: 1.5 },
    create: { id: 'singleton', wearCostPerHour: 1.5 },
  });
  await prisma.laborConfig.upsert({
    where: { id: 'singleton' },
    update: { hourlyRate: 30.0 },
    create: { id: 'singleton', hourlyRate: 30.0 },
  });
  await prisma.profitConfig.upsert({
    where: { id: 'singleton' },
    update: { defaultProfitMargin: 35 },
    create: { id: 'singleton', defaultProfitMargin: 35 },
  });

  // Seed default filaments and packaging
  await prisma.filament.createMany({
    data: [
      { name: 'PLA Branco', spoolWeight: 1000, spoolPrice: 89.9, costPerGram: 0.0899 },
      { name: 'PLA Preto', spoolWeight: 1000, spoolPrice: 89.9, costPerGram: 0.0899 },
      { name: 'PETG Azul', spoolWeight: 1000, spoolPrice: 119.9, costPerGram: 0.1199 },
    ],
  });
  await prisma.packaging.createMany({
    data: [
      { name: 'Caixa de Papelão Padrão', quantity: 10, packagePrice: 35.0, costPerUnit: 3.5 },
      { name: 'Saco Bolha Grande', quantity: 50, packagePrice: 45.0, costPerUnit: 0.9 },
    ],
  });
}

// ─── app factory ─────────────────────────────────────────────────────────────
async function createApp(): Promise<{ app: INestApplication<App>; prisma: PrismaService }> {
  const moduleFixture: TestingModule = await Test.createTestingModule({
    imports: [AppModule],
  }).compile();

  const app = moduleFixture.createNestApplication<INestApplication<App>>();
  app.setGlobalPrefix('api');
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: { enableImplicitConversion: true },
    }),
  );
  app.useGlobalFilters(new HttpExceptionFilter());
  app.useGlobalInterceptors(new TransformInterceptor());
  await app.init();

  const prisma = moduleFixture.get<PrismaService>(PrismaService);
  return { app, prisma };
}

// ─── Config Flow ─────────────────────────────────────────────────────────────
describe('Config Flow (e2e)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;

  beforeAll(async () => {
    ({ app, prisma } = await createApp());
    await seedTestDb(prisma);
  });

  afterAll(async () => {
    await app.close();
  });

  it('GET /api/config — returns default config', async () => {
    const res = await request(app.getHttpServer()).get('/api/config').expect(200);
    expect(res.body.data.energy.kwhPrice).toBeCloseTo(0.85);
  });

  it('PATCH /api/config/energy — updates kwhPrice to 1.00', async () => {
    const res = await request(app.getHttpServer())
      .patch('/api/config/energy')
      .send({ kwhPrice: 1.0, printerConsumption: 150 })
      .expect(200);
    expect(res.body.data.kwhPrice).toBeCloseTo(1.0);
  });

  it('GET /api/config — verifies kwhPrice is 1.00', async () => {
    const res = await request(app.getHttpServer()).get('/api/config').expect(200);
    expect(res.body.data.energy.kwhPrice).toBeCloseTo(1.0);
  });

  it('POST /api/config/restore-defaults — resets kwhPrice to 0.85', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/config/restore-defaults')
      .expect(200);
    expect(res.body.data.energy.kwhPrice).toBeCloseTo(0.85);
  });

  it('GET /api/config — verifies kwhPrice is back to 0.85', async () => {
    const res = await request(app.getHttpServer()).get('/api/config').expect(200);
    expect(res.body.data.energy.kwhPrice).toBeCloseTo(0.85);
  });
});

// ─── Import/Export Flow ───────────────────────────────────────────────────────
describe('Import/Export Flow (e2e)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;
  let exportedConfig: any;

  beforeAll(async () => {
    ({ app, prisma } = await createApp());
    await seedTestDb(prisma);
  });

  afterAll(async () => {
    await app.close();
  });

  it('GET /api/config/export — captures the current config JSON', async () => {
    const res = await request(app.getHttpServer()).get('/api/config/export').expect(200);
    // The transform interceptor wraps the response in { data: <config>, statusCode, timestamp }
    // The actual config is in res.body.data
    exportedConfig = res.body.data ?? res.body;
    // Default kwhPrice should be 0.85
    expect(exportedConfig.energy.kwhPrice).toBeCloseTo(0.85);
  });

  it('PATCH /api/config/energy — changes kwhPrice to 9.99', async () => {
    await request(app.getHttpServer())
      .patch('/api/config/energy')
      .send({ kwhPrice: 9.99, printerConsumption: 150 })
      .expect(200);
  });

  it('POST /api/config/import — restores to the exported config', async () => {
    await request(app.getHttpServer())
      .post('/api/config/import')
      .send(exportedConfig)
      .expect(201);
  });

  it('GET /api/config — verifies kwhPrice is 0.85 again', async () => {
    const res = await request(app.getHttpServer()).get('/api/config').expect(200);
    expect(res.body.data.energy.kwhPrice).toBeCloseTo(0.85);
  });

  it('GET /api/filaments — verifies default filaments are back', async () => {
    const res = await request(app.getHttpServer()).get('/api/filaments').expect(200);
    const names = res.body.data.map((f: any) => f.name);
    expect(names).toContain('PLA Branco');
    expect(names).toContain('PLA Preto');
    expect(names).toContain('PETG Azul');
  });
});

// ─── Filaments Flow ───────────────────────────────────────────────────────────
describe('Filaments Flow (e2e)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;
  let filamentId: string;

  beforeAll(async () => {
    ({ app, prisma } = await createApp());
    await seedTestDb(prisma);
  });

  afterAll(async () => {
    await app.close();
  });

  it('POST /api/filaments — creates ABS filament and verifies costPerGram', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/filaments')
      .send({ name: 'ABS', spoolWeight: 800, spoolPrice: 96.0 })
      .expect(201);
    filamentId = res.body.data.id;
    // costPerGram = 96.00 / 800 = 0.12
    expect(res.body.data.costPerGram).toBeCloseTo(0.12);
  });

  it('GET /api/filaments — verifies ABS appears in the list', async () => {
    const res = await request(app.getHttpServer()).get('/api/filaments').expect(200);
    const ids = res.body.data.map((f: any) => f.id);
    expect(ids).toContain(filamentId);
  });

  it('PATCH /api/filaments/:id — updates spoolPrice and recalculates costPerGram', async () => {
    const res = await request(app.getHttpServer())
      .patch(`/api/filaments/${filamentId}`)
      .send({ spoolPrice: 80.0 })
      .expect(200);
    // costPerGram = 80.00 / 800 = 0.10
    expect(res.body.data.costPerGram).toBeCloseTo(0.1);
  });

  it('DELETE /api/filaments/:id — deletes the filament', async () => {
    await request(app.getHttpServer()).delete(`/api/filaments/${filamentId}`).expect(200);
  });

  it('GET /api/filaments — verifies ABS is gone', async () => {
    const res = await request(app.getHttpServer()).get('/api/filaments').expect(200);
    const ids = res.body.data.map((f: any) => f.id);
    expect(ids).not.toContain(filamentId);
  });

  it('DELETE /api/filaments/:id (again) — returns 404', async () => {
    await request(app.getHttpServer()).delete(`/api/filaments/${filamentId}`).expect(404);
  });
});

// ─── Calculator Formula Verification ─────────────────────────────────────────
describe('Calculator Formula Verification (e2e)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;
  let filamentId: string;

  beforeAll(async () => {
    ({ app, prisma } = await createApp());
    await seedTestDb(prisma);

    // Configure: kwhPrice=1.00, printerConsumption=200W, wearCostPerHour=2.00, hourlyRate=30.00
    await prisma.energyConfig.upsert({
      where: { id: 'singleton' },
      update: { kwhPrice: 1.0, printerConsumption: 200 },
      create: { id: 'singleton', kwhPrice: 1.0, printerConsumption: 200 },
    });
    await prisma.printerConfig.upsert({
      where: { id: 'singleton' },
      update: { wearCostPerHour: 2.0 },
      create: { id: 'singleton', wearCostPerHour: 2.0 },
    });
    await prisma.laborConfig.upsert({
      where: { id: 'singleton' },
      update: { hourlyRate: 30.0 },
      create: { id: 'singleton', hourlyRate: 30.0 },
    });
    await prisma.profitConfig.upsert({
      where: { id: 'singleton' },
      update: { defaultProfitMargin: 35 },
      create: { id: 'singleton', defaultProfitMargin: 35 },
    });

    // Create filament: costPerGram = 0.10
    const filament = await prisma.filament.create({
      data: { name: 'TestFilament', spoolWeight: 1000, spoolPrice: 100.0, costPerGram: 0.1 },
    });
    filamentId = filament.id;
  });

  afterAll(async () => {
    await app.close();
  });

  it('POST /api/calculator/calculate — verifies formula with known inputs', async () => {
    /**
     * Inputs:
     *   materialUsed = 100g, costPerGram = 0.10  → filamentCost = 10.00
     *   printTime    = 2h (120min), kwhPrice=1.00, consumption=200W → energyCost = (200/1000)*2*1.00 = 0.40
     *   wearCostPerHour = 2.00, printTime = 2h   → printerWear = 2*2.00 = 4.00
     *   laborCost = (printTime*0.1 + 0postprocessing) * hourlyRate = (2*0.1 + 0)*30 = 6.00
     *   totalCost  = 10+0.40+4+6 = 20.40
     *   margin = 50%  → profit = 10.20  → finalPrice = 30.60
     */
    const res = await request(app.getHttpServer())
      .post('/api/calculator/calculate')
      .send({
        filamentId,
        materialUsed: 100,
        printTimeHours: 2,
        printTimeMinutes: 0,
        includePostProcessing: false,
        paintTimeHours: 0,
        paintTimeMinutes: 0,
        assemblyTimeHours: 0,
        assemblyTimeMinutes: 0,
        finishingTimeHours: 0,
        finishingTimeMinutes: 0,
        useDefaultMargin: false,
        profitMargin: 50,
        includePackaging: false,
      })
      .expect(200);

    const d = res.body.data;
    expect(d.filamentCost).toBeCloseTo(10.0, 5);
    expect(d.energyCost).toBeCloseTo(0.4, 5);
    expect(d.printerWear).toBeCloseTo(4.0, 5);
    expect(d.laborCost).toBeCloseTo(6.0, 5);
    expect(d.totalCost).toBeCloseTo(20.4, 5);
    expect(d.finalPrice).toBeCloseTo(30.6, 5);
  });
});

// ─── Quotes Flow ─────────────────────────────────────────────────────────────
describe('Quotes Flow (e2e)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;
  let filamentId: string;
  let quoteId: string;

  const baseJob = {
    printTimeHours: 1,
    printTimeMinutes: 0,
    includePostProcessing: false,
    paintTimeHours: 0,
    paintTimeMinutes: 0,
    assemblyTimeHours: 0,
    assemblyTimeMinutes: 0,
    finishingTimeHours: 0,
    finishingTimeMinutes: 0,
    useDefaultMargin: true,
    profitMargin: 35,
    includePackaging: false,
  };

  beforeAll(async () => {
    ({ app, prisma } = await createApp());
    await seedTestDb(prisma);

    const filament = await prisma.filament.create({
      data: { name: 'QuoteFilament', spoolWeight: 1000, spoolPrice: 100.0, costPerGram: 0.1 },
    });
    filamentId = filament.id;
  });

  afterAll(async () => {
    await app.close();
  });

  it('POST /api/quotes — creates a quote', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/quotes')
      .send({
        name: 'Quote Alpha',
        printJob: { filamentId, materialUsed: 50, ...baseJob },
      })
      .expect(201);
    quoteId = res.body.data.id;
    expect(quoteId).toBeDefined();
    expect(res.body.data.printJob.filamentName).toBe('QuoteFilament');
  });

  it('POST /api/quotes — creates a second quote for ordering test', async () => {
    await request(app.getHttpServer())
      .post('/api/quotes')
      .send({
        name: 'Quote Beta',
        printJob: { filamentId, materialUsed: 80, ...baseJob },
      })
      .expect(201);
  });

  it('GET /api/quotes — returns quotes newest-first', async () => {
    const res = await request(app.getHttpServer()).get('/api/quotes').expect(200);
    const quotes = res.body.data as any[];
    expect(quotes.length).toBeGreaterThanOrEqual(2);
    // The most recently created quote should be first
    expect(quotes[0].name).toBe('Quote Beta');
    expect(quotes[1].name).toBe('Quote Alpha');
  });

  it('GET /api/quotes/:id — returns snapshot fields', async () => {
    const res = await request(app.getHttpServer()).get(`/api/quotes/${quoteId}`).expect(200);
    const q = res.body.data;
    expect(q.id).toBe(quoteId);
    expect(q.printJob.filamentName).toBe('QuoteFilament');
    expect(q.result.filamentCost).toBeDefined();
    expect(q.result.finalPrice).toBeDefined();
  });

  it('Snapshot is immutable — changing filament price does not alter saved quote', async () => {
    // Change filament price
    await request(app.getHttpServer())
      .patch(`/api/filaments/${filamentId}`)
      .send({ spoolPrice: 999.99 })
      .expect(200);

    // Re-fetch the quote — snapshot must still show original filamentCost
    const res = await request(app.getHttpServer()).get(`/api/quotes/${quoteId}`).expect(200);
    // filamentCost = 50g * 0.10 = 5.00 (the value at save time, not recalculated)
    expect(res.body.data.result.filamentCost).toBeCloseTo(5.0, 4);
    expect(res.body.data.printJob.filamentName).toBe('QuoteFilament');
  });

  it('POST /api/quotes/:id/load — returns PrintJob shape', async () => {
    const res = await request(app.getHttpServer())
      .post(`/api/quotes/${quoteId}/load`)
      .expect(200);
    const pj = res.body.data;
    expect(pj.filamentId).toBe(filamentId);
    expect(pj.materialUsed).toBe(50);
    expect(pj.printTimeHours).toBe(1);
  });

  it('DELETE /api/quotes/:id — deletes the quote', async () => {
    await request(app.getHttpServer()).delete(`/api/quotes/${quoteId}`).expect(200);
  });

  it('GET /api/quotes/:id — returns 404 after delete', async () => {
    await request(app.getHttpServer()).get(`/api/quotes/${quoteId}`).expect(404);
  });
});

// ─── Health Check ─────────────────────────────────────────────────────────────
describe('Health Check (e2e)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;

  beforeAll(async () => {
    ({ app, prisma } = await createApp());
  });

  afterAll(async () => {
    await app.close();
  });

  it('GET /api/health — returns 200 with DB status up', async () => {
    const res = await request(app.getHttpServer()).get('/api/health').expect(200);
    // The TransformInterceptor wraps the terminus response in { data: {...} }
    const body = res.body.data ?? res.body;
    expect(body.status).toBe('ok');
    expect(body.info.database.status).toBe('up');
  });
});
