import { INestApplication } from '@nestjs/common';
import { DocumentBuilder, OpenAPIObject, SwaggerModule } from '@nestjs/swagger';

export const swaggerConfig = <T>(app: INestApplication<T>): OpenAPIObject => {
  const config = new DocumentBuilder()
    .setTitle('3D Print Price Calculator')
    .setVersion('1.0')
    .addServer('http://localhost:3001', 'Local')
    .build();

  return SwaggerModule.createDocument(app, config);
};
