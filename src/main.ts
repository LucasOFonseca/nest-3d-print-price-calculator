import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import helmet from 'helmet';
import compression from 'compression';
import { swaggerConfig } from './config/swagger';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';
import { TransformInterceptor } from './common/interceptors/transform.interceptor';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  // Security middlewares
  app.use(helmet());
  app.use(compression());
  // Global prefix
  app.setGlobalPrefix('api');
  // CORS
  app.enableCors({ origin: process.env.FRONTEND_URL || '*' });
  // Validation pipe
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: { enableImplicitConversion: true },
    }),
  );
  // Global filters and interceptors
  app.useGlobalFilters(new HttpExceptionFilter());
  app.useGlobalInterceptors(new TransformInterceptor());
  // Swagger setup
  const document = swaggerConfig(app);
  SwaggerModule.setup('api/docs', app, document);
  await app.listen(process.env.PORT || 3001);
}
bootstrap();
