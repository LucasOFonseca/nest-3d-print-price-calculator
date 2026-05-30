import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from './../src/app.module';
import { TransformInterceptor } from '../src/common/interceptors/transform.interceptor';
import { HttpExceptionFilter } from '../src/common/filters/http-exception.filter';

describe('FilamentsController (e2e)', () => {
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

  beforeEach(async () => {
    // Restore defaults before each test to have a clean starting state
    await request(app.getHttpServer())
      .post('/api/config/restore-defaults')
      .expect(201);
  });

  it('GET /api/filaments returns all filaments ordered by createdAt ascending', async () => {
    const res = await request(app.getHttpServer())
      .get('/api/filaments')
      .expect(200);

    expect(res.body).toHaveProperty('data');
    const data = res.body.data;
    expect(Array.isArray(data)).toBe(true);
    expect(data.length).toBeGreaterThanOrEqual(3); // seeded defaults

    // Check sorting by createdAt asc
    for (let i = 0; i < data.length - 1; i++) {
      const dateCurrent = new Date(data[i].createdAt).getTime();
      const dateNext = new Date(data[i + 1].createdAt).getTime();
      expect(dateCurrent).toBeLessThanOrEqual(dateNext);
    }
  });

  it('POST /api/filaments creates a filament and auto-computes costPerGram', async () => {
    const payload = {
      name: 'Test Filament',
      spoolWeight: 1000,
      spoolPrice: 120.0,
    };

    const res = await request(app.getHttpServer())
      .post('/api/filaments')
      .send(payload)
      .expect(201);

    expect(res.body).toHaveProperty('data');
    const data = res.body.data;
    expect(data.name).toBe('Test Filament');
    expect(data.spoolWeight).toBe(1000);
    expect(data.spoolPrice).toBe(120.0);
    expect(data.costPerGram).toBe(0.12); // 120 / 1000
    expect(data).toHaveProperty('id');
  });

  it('POST /api/filaments validates input constraints', async () => {
    // name empty
    await request(app.getHttpServer())
      .post('/api/filaments')
      .send({ name: '', spoolWeight: 1000, spoolPrice: 50 })
      .expect(400);

    // spoolWeight < 1
    await request(app.getHttpServer())
      .post('/api/filaments')
      .send({ name: 'Test', spoolWeight: 0.5, spoolPrice: 50 })
      .expect(400);

    // spoolPrice < 0
    await request(app.getHttpServer())
      .post('/api/filaments')
      .send({ name: 'Test', spoolWeight: 1000, spoolPrice: -5 })
      .expect(400);
  });

  it('PATCH /api/filaments/:id recalculates costPerGram when only spoolPrice is provided', async () => {
    // 1. Create a filament
    const createRes = await request(app.getHttpServer())
      .post('/api/filaments')
      .send({ name: 'Recalc Price Test', spoolWeight: 500, spoolPrice: 50.0 })
      .expect(201);
    const id = createRes.body.data.id;
    expect(createRes.body.data.costPerGram).toBe(0.1); // 50 / 500

    // 2. Patch only spoolPrice
    const patchRes = await request(app.getHttpServer())
      .patch(`/api/filaments/${id}`)
      .send({ spoolPrice: 75.0 })
      .expect(200);

    expect(patchRes.body.data.spoolPrice).toBe(75.0);
    expect(patchRes.body.data.spoolWeight).toBe(500); // untouched
    expect(patchRes.body.data.costPerGram).toBe(0.15); // 75 / 500
  });

  it('PATCH /api/filaments/:id recalculates costPerGram when only spoolWeight is provided', async () => {
    // 1. Create a filament
    const createRes = await request(app.getHttpServer())
      .post('/api/filaments')
      .send({ name: 'Recalc Weight Test', spoolWeight: 500, spoolPrice: 50.0 })
      .expect(201);
    const id = createRes.body.data.id;
    expect(createRes.body.data.costPerGram).toBe(0.1);

    // 2. Patch only spoolWeight
    const patchRes = await request(app.getHttpServer())
      .patch(`/api/filaments/${id}`)
      .send({ spoolWeight: 1000 })
      .expect(200);

    expect(patchRes.body.data.spoolPrice).toBe(50.0); // untouched
    expect(patchRes.body.data.spoolWeight).toBe(1000);
    expect(patchRes.body.data.costPerGram).toBe(0.05); // 50 / 1000
  });

  it('DELETE /api/filaments/:id returns 404 for non-existent id', async () => {
    await request(app.getHttpServer())
      .delete('/api/filaments/00000000-0000-0000-0000-000000000000')
      .expect(404);
  });

  it('DELETE /api/filaments/:id deletes existing filament', async () => {
    const createRes = await request(app.getHttpServer())
      .post('/api/filaments')
      .send({ name: 'To Delete', spoolWeight: 1000, spoolPrice: 100 })
      .expect(201);
    const id = createRes.body.data.id;

    const deleteRes = await request(app.getHttpServer())
      .delete(`/api/filaments/${id}`)
      .expect(200);

    expect(deleteRes.body.data).toEqual({ message: 'Filament deleted' });

    // Try finding it
    await request(app.getHttpServer())
      .get(`/api/filaments/${id}`)
      .expect(404);
  });
});
