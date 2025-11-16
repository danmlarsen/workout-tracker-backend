import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import cookieParser from 'cookie-parser';
import { Logger } from 'nestjs-pino';
import {
  DocumentBuilder,
  SwaggerCustomOptions,
  SwaggerDocumentOptions,
  SwaggerModule,
} from '@nestjs/swagger';
import helmet from 'helmet';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, { bufferLogs: true });
  app.useLogger(app.get(Logger));
  app.useGlobalPipes(new ValidationPipe({ transform: true, whitelist: true }));
  app.use(helmet());
  app.use(cookieParser());
  app.enableCors({
    origin:
      process.env.NODE_ENV === 'production'
        ? process.env.CORS_ORIGIN?.split(',')
        : true,
    credentials: true,
  });

  const config = new DocumentBuilder()
    .setTitle('NextLift API')
    .setDescription('API documentation for the NextLift application')
    .setVersion('1.0')
    .addBearerAuth()
    // .addTag('workouts')
    .build();
  const documentOptions: SwaggerDocumentOptions = {
    autoTagControllers: true,
  };
  const moduleOptions: SwaggerCustomOptions = {
    ui: process.env.NODE_ENV === 'production' ? false : true,
    raw: process.env.NODE_ENV === 'production' ? [] : ['json'],
    jsonDocumentUrl: 'api/json',
  };
  const documentFactory = () =>
    SwaggerModule.createDocument(app, config, documentOptions);
  SwaggerModule.setup('api', app, documentFactory, moduleOptions);

  await app.listen(process.env.PORT ?? 3000);
}
bootstrap();
