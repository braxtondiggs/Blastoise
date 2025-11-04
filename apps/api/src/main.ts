/**
 * Blastoise API - NestJS Backend
 * Privacy-first venue visit tracking API
 */

// IMPORTANT: Sentry instrumentation must be imported FIRST
import './instrument';

import { Logger, ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { AppModule } from './app/app.module';
import helmet from 'helmet';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    logger: ['error', 'warn', 'log', 'debug', 'verbose'],
  });

  // T256: Configure Swagger/OpenAPI documentation
  const config = new DocumentBuilder()
    .setTitle('Blastoise API')
    .setDescription(
      'Privacy-first venue visit tracking API for breweries and wineries. ' +
      'This API supports automatic geofence-based visit detection, anonymized sharing, ' +
      'and proximity-based venue discovery.'
    )
    .setVersion('1.0')
    .setContact(
      'Blastoise Support',
      'https://github.com/yourusername/blastoise',
      'support@blastoise.app'
    )
    .setLicense('MIT', 'https://opensource.org/licenses/MIT')
    .addTag('visits', 'Visit tracking and history endpoints')
    .addTag('venues', 'Venue search and discovery endpoints')
    .addTag('sharing', 'Anonymized visit sharing endpoints')
    .addTag('user', 'User preferences and settings endpoints')
    .addTag('health', 'Health check and monitoring endpoints')
    .addBearerAuth(
      {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        description: 'Enter your Supabase JWT token',
      },
      'JWT'
    )
    .addServer('http://localhost:3000/api/v1', 'Development server')
    .addServer('https://api.blastoise.app/api/v1', 'Production server')
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api-docs', app, document, {
    customSiteTitle: 'Blastoise API Documentation',
    customCss: '.swagger-ui .topbar { display: none }',
    swaggerOptions: {
      persistAuthorization: true,
      displayRequestDuration: true,
      filter: true,
      showExtensions: true,
    },
  });

  // T251, T252: Configure Helmet for security headers (CSP, HSTS, etc.)
  // T256: Relaxed CSP for Swagger UI (disable in production or use separate CSP for /api-docs)
  app.use(
    helmet({
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'"], // unsafe-eval needed for Swagger UI
          styleSrc: ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com'],
          fontSrc: ["'self'", 'https://fonts.gstatic.com'],
          imgSrc: ["'self'", 'data:', 'https:'],
          connectSrc: ["'self'"],
          frameSrc: ["'none'"],
          objectSrc: ["'none'"],
          upgradeInsecureRequests: [],
        },
      },
      hsts: {
        maxAge: 31536000, // 1 year
        includeSubDomains: true,
        preload: true,
      },
      frameguard: {
        action: 'deny', // Prevent clickjacking
      },
      noSniff: true, // Prevent MIME type sniffing
      xssFilter: true, // Enable XSS filter
      referrerPolicy: {
        policy: 'strict-origin-when-cross-origin',
      },
    })
  );

  // T251: Enable CORS for web/mobile clients
  app.enableCors({
    origin: process.env['CORS_ORIGINS']?.split(',') || [
      'http://localhost:4200',
      'http://localhost:4201',
    ],
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
    exposedHeaders: ['X-Total-Count', 'X-Page-Count'],
    maxAge: 86400, // 24 hours
  });

  // Global validation pipe
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true, // Strip properties that don't have decorators
      forbidNonWhitelisted: true, // Throw error if non-whitelisted properties are present
      transform: true, // Automatically transform payloads to DTO instances
      transformOptions: {
        enableImplicitConversion: true, // Enable implicit type conversion
      },
    })
  );

  // API versioning
  const globalPrefix = 'api/v1';
  app.setGlobalPrefix(globalPrefix);

  const port = process.env['PORT'] || 3000;
  const host = process.env['HOST'] || 'localhost';

  await app.listen(port, host);

  Logger.log(
    `🚀 Blastoise API is running on: http://${host}:${port}/${globalPrefix}`
  );
  Logger.log(`📚 API Documentation (Swagger): http://${host}:${port}/api-docs`);
  Logger.log(`📝 Environment: ${process.env['NODE_ENV'] || 'development'}`);
}

bootstrap();
