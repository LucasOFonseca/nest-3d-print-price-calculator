import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from './../src/app.module';
import { TransformInterceptor } from '../src/common/interceptors/transform.interceptor';
import { HttpExceptionFilter } from '../src/common/filters/http-exception.filter';

describe('ConfigSettingsController (e2e)', () => {
  let app: INestApplication<App>;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
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
  });

  afterAll(async () => {
    await app.close();
  });

  it('GET /api/config returns full AppConfig shape wrapped in data', async () => {
    const res = await request(app.getHttpServer())
      .get('/api/config')
      .expect(200);

    expect(res.body).toHaveProperty('data');
    const data = res.body.data;
    expect(data).toHaveProperty('filaments');
    expect(data).toHaveProperty('packaging');
    expect(data).toHaveProperty('energy');
    expect(data).toHaveProperty('printer');
    expect(data).toHaveProperty('labor');
    expect(data).toHaveProperty('profit');
    expect(Array.isArray(data.filaments)).toBe(true);
    expect(Array.isArray(data.packaging)).toBe(true);
  });

  it('PATCH /api/config/energy updates energy config', async () => {
    const payload = { kwhPrice: 0.99, printerConsumption: 220 };
    const res = await request(app.getHttpServer())
      .patch('/api/config/energy')
      .send(payload)
      .expect(200);

    expect(res.body.data.kwhPrice).toBe(0.99);
    expect(res.body.data.printerConsumption).toBe(220);

    // Double check from complete config
    const configRes = await request(app.getHttpServer()).get('/api/config');
    expect(configRes.body.data.energy.kwhPrice).toBe(0.99);
    expect(configRes.body.data.energy.printerConsumption).toBe(220);
  });

  it('PATCH /api/config/printer updates printer config', async () => {
    const payload = { wearCostPerHour: 2.75 };
    const res = await request(app.getHttpServer())
      .patch('/api/config/printer')
      .send(payload)
      .expect(200);

    expect(res.body.data.wearCostPerHour).toBe(2.75);
  });

  it('PATCH /api/config/labor updates labor config', async () => {
    const payload = { hourlyRate: 45.50 };
    const res = await request(app.getHttpServer())
      .patch('/api/config/labor')
      .send(payload)
      .expect(200);

    expect(res.body.data.hourlyRate).toBe(45.50);
  });

  it('PATCH /api/config/profit updates profit margin', async () => {
    const payload = { defaultProfitMargin: 40 };
    const res = await request(app.getHttpServer())
      .patch('/api/config/profit')
      .send(payload)
      .expect(200);

    expect(res.body.data.defaultProfitMargin).toBe(40);
  });

  it('PATCH /api/config/profit rejects negative or values > 100 with 400', async () => {
    await request(app.getHttpServer())
      .patch('/api/config/profit')
      .send({ defaultProfitMargin: -5 })
      .expect(400);

    await request(app.getHttpServer())
      .patch('/api/config/profit')
      .send({ defaultProfitMargin: 105 })
      .expect(400);
  });

  it('GET /api/config/export triggers file download with raw JSON and content-disposition', async () => {
    const res = await request(app.getHttpServer())
      .get('/api/config/export')
      .expect('Content-Type', /json/)
      .expect('Content-Disposition', 'attachment; filename="config.json"')
      .expect(200);

    // It should NOT be wrapped in `{ data: ... }`
    expect(res.body).not.toHaveProperty('data');
    expect(res.body).toHaveProperty('filaments');
    expect(res.body).toHaveProperty('packaging');
    expect(res.body).toHaveProperty('energy');
  });

  it('POST /api/config/restore-defaults resets everything back to defaults', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/config/restore-defaults')
      .expect(201);

    const data = res.body.data;
    expect(data.energy.kwhPrice).toBe(0.85);
    expect(data.energy.printerConsumption).toBe(150);
    expect(data.printer.wearCostPerHour).toBe(1.50);
    expect(data.labor.hourlyRate).toBe(30.00);
    expect(data.profit.defaultProfitMargin).toBe(35);
    expect(data.filaments.length).toBe(3);
    expect(data.packaging.length).toBe(2);
  });

  it('POST /api/config/import imports configs, recalculating fields and returning full config', async () => {
    const importPayload = {
      filaments: [
        { name: 'PLA Premium Red', spoolWeight: 1000, spoolPrice: 120.00 }
      ],
      packaging: [
        { name: 'Box Medium', quantity: 20, packagePrice: 80.00 }
      ],
      energy: { kwhPrice: 0.90, printerConsumption: 200 },
      printer: { wearCostPerHour: 2.00 },
      labor: { hourlyRate: 40.00 },
      profit: { defaultProfitMargin: 50 }
    };

    const res = await request(app.getHttpServer())
      .post('/api/config/import')
      .send(importPayload)
      .expect(201);

    const data = res.body.data;
    expect(data.energy.kwhPrice).toBe(0.90);
    expect(data.energy.printerConsumption).toBe(200);
    expect(data.printer.wearCostPerHour).toBe(2.00);
    expect(data.labor.hourlyRate).toBe(40.00);
    expect(data.profit.defaultProfitMargin).toBe(50);
    
    // Check custom calculated costPerGram and costPerUnit
    expect(data.filaments.length).toBe(1);
    expect(data.filaments[0].name).toBe('PLA Premium Red');
    expect(data.filaments[0].costPerGram).toBe(0.12); // 120.00 / 1000

    expect(data.packaging.length).toBe(1);
    expect(data.packaging[0].name).toBe('Box Medium');
    expect(data.packaging[0].costPerUnit).toBe(4.00); // 80.00 / 20
  });

  it('POST /api/config/import rejects invalid payload with 400', async () => {
    const invalidPayload = {
      filaments: [
        { name: '', spoolWeight: 0, spoolPrice: -10 } // invalid fields
      ],
      energy: { kwhPrice: -0.5, printerConsumption: 0 },
      printer: { wearCostPerHour: -1 },
      labor: { hourlyRate: -30 },
      profit: { defaultProfitMargin: 150 }
    };

    await request(app.getHttpServer())
      .post('/api/config/import')
      .send(invalidPayload)
      .expect(400);
  });
});
