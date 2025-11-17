import {
  DocumentBuilder,
  SwaggerCustomOptions,
  SwaggerDocumentOptions,
} from '@nestjs/swagger';

export const createSwaggerConfig = () =>
  new DocumentBuilder()
    .setTitle('NextLift API')
    .setDescription('API documentation for the NextLift application')
    .setVersion('1.0')
    .addBearerAuth(
      { type: 'http', scheme: 'bearer', bearerFormat: 'JWT' },
      'access-token',
    )
    // .addTag('workouts')
    .build();
export const documentOptions: SwaggerDocumentOptions = {
  autoTagControllers: true,
  operationIdFactory: (controllerKey: string, methodKey: string) => methodKey,
};
export const moduleOptions: SwaggerCustomOptions = {
  ui: process.env.NODE_ENV === 'production' ? false : true,
  raw: process.env.NODE_ENV === 'production' ? [] : ['json'],
  jsonDocumentUrl: 'api/json',
};
