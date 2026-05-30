import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from './../src/app.module';
import { TransformInterceptor } from '../src/common/interceptors/transform.interceptor';
import { HttpExceptionFilter } from '../src/common/filters/http-exception.filter';

describe('PackagingController (e2e)', () => {
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

  it('GET /api/packaging returns all packaging options ordered by createdAt ascending', async () => {
    const res = await request(app.getHttpServer())
      .get('/api/packaging')
      .expect(200);

    expect(res.body).toHaveProperty('data');
    const data = res.body.data;
    expect(Array.isArray(data)).toBe(true);
    expect(data.length).toBeGreaterThanOrEqual(2); // seeded defaults

    // Check sorting by createdAt asc
    for (let i = 0; i < data.length - 1; i++) {
      const dateCurrent = new Date(data[i].createdAt).getTime();
      const dateNext = new Date(data[i + 1].createdAt).getTime();
      expect(dateCurrent).toBeLessThanOrEqual(dateNext);
    }
  });

  it('POST /api/packaging creates a packaging option and auto-computes costPerUnit', async () => {
    const payload = {
      name: 'Test Packaging',
      quantity: 5,
      packagePrice: 25.0,
    };

    const res = await request(app.getHttpServer())
      .post('/api/packaging')
      .send(payload)
      .expect(201);

    expect(res.body).toHaveProperty('data');
    const data = res.body.data;
    expect(data.name).toBe('Test Packaging');
    expect(data.quantity).toBe(5);
    expect(data.packagePrice).toBe(25.0);
    expect(data.costPerUnit).toBe(5.0); // 25 / 5
    expect(data).toHaveProperty('id');
  });

  it('POST /api/packaging validates input constraints', async () => {
    // name empty
    await request(app.getHttpServer())
      .post('/api/packaging')
      .send({ name: '', quantity: 10, packagePrice: 15 })
      .expect(400);

    // quantity < 1
    await request(app.getHttpServer())
      .post('/api/packaging')
      .send({ name: 'Box', quantity: 0, packagePrice: 15 })
      .expect(400);

    // quantity not an integer
    await request(app.getHttpServer())
      .post('/api/packaging')
      .send({ name: 'Box', quantity: 1.5, packagePrice: 15 })
      .expect(400);

    // packagePrice < 0
    await request(app.getHttpServer())
      .post('/api/packaging')
      .send({ name: 'Box', quantity: 10, packagePrice: -2 })
      .expect(400);
  });

  it('PATCH /api/packaging/:id recalculates costPerUnit when only packagePrice is provided', async () => {
    // 1. Create a packaging option
    const createRes = await request(app.getHttpServer())
      .post('/api/packaging')
      .send({ name: 'Recalc Price Test', quantity: 10, packagePrice: 30.0 })
      .expect(201);
    const id = createRes.body.data.id;
    expect(createRes.body.data.costPerUnit).toBe(3.0); // 30 / 10

    // 2. Patch only packagePrice
    const patchRes = await request(app.getHttpServer())
      .patch(`/api/packaging/${id}`)
      .send({ packagePrice: 50.0 })
      .expect(200);

    expect(patchRes.body.data.packagePrice).toBe(50.0);
    expect(patchRes.body.data.quantity).toBe(10); // untouched
    expect(patchRes.body.data.costPerUnit).toBe(5.0); // 50 / 10
  });

  it('PATCH /api/packaging/:id recalculates costPerUnit when only quantity is provided', async () => {
    // 1. Create a packaging option
    const createRes = await request(app.getHttpServer())
      .post('/api/packaging')
      .send({ name: 'Recalc Qty Test', quantity: 10, packagePrice: 30.0 })
      .expect(201);
    const id = createRes.body.data.id;
    expect(createRes.body.data.costPerUnit).toBe(3.0);

    // 2. Patch only quantity
    const patchRes = await request(app.getHttpServer())
      .patch(`/api/packaging/${id}`)
      .send({ quantity: 20 })
      .expect(200);

    expect(patchRes.body.data.packagePrice).toBe(30.0); // untouched
    expect(patchRes.body.data.quantity).toBe(20);
    expect(patchRes.body.data.costPerUnit).toBe(1.5); // 30 / 20
  });

  it('DELETE /api/packaging/:id returns 404 for non-existent id', async () => {
    await request(app.getHttpServer())
      .delete('/api/packaging/00000000-0000-0000-0000-000000000000')
      .expect(404);
  });

  it('DELETE /api/packaging/:id deletes existing packaging option', async () => {
    const createRes = await request(app.getHttpServer())
      .post('/api/packaging')
      .send({ name: 'To Delete', quantity: 10, packagePrice: 20 })
      .expect(201);
    const id = createRes.body.data.id;

    const deleteRes = await request(app.getHttpServer())
      .delete(`/api/packaging/${id}`)
      .expect(200);

    expect(deleteRes.body.data).toEqual({ message: 'Packaging deleted' });

    // Try finding it
    await request(app.getHttpServer())
      .get(`/api/packaging/${id}`)
      .expect(404);
  });
});
