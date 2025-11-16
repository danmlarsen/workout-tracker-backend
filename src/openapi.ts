import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { createSwaggerConfig } from './swagger-config';
import { SwaggerModule } from '@nestjs/swagger';
import { join } from 'path';
import { writeFileSync } from 'fs';

async function generateOpenApi() {
  const app = await NestFactory.create(AppModule, { logger: false });

  const config = createSwaggerConfig();
  const document = SwaggerModule.createDocument(app, config);

  const outputPath = join(process.cwd(), 'openapi.json');

  // const dirPath = dirname(outputPath);
  // mkdirSync(dirPath, { recursive: true });

  writeFileSync(outputPath, JSON.stringify(document, null, 2));

  await app.close();
  console.log(`OpenAPI spec written to ${outputPath}`);
}

generateOpenApi();
