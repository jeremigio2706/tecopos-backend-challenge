// services/sso/src/main.ts
import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Validación global
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  // Configuración de Swagger
  const config = new DocumentBuilder()
    .setTitle('TECOPOS SSO Service')
    .setDescription('Single Sign-On microservice for TECOPOS ecosystem')
    .setVersion('1.0')
    .addBearerAuth()
    .addTag('Authentication')
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document);

  const port = process.env.PORT || 3001;
  await app.listen(port);
  console.log(`SSO Service running on http://localhost:${port}`);
  console.log(`Swagger docs available at http://localhost:${port}/api/docs`);
}
void bootstrap();
