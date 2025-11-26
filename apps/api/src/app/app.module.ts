import { Module } from '@nestjs/common';
import { APP_FILTER, APP_INTERCEPTOR, APP_GUARD } from '@nestjs/core';
import { BullModule } from '@nestjs/bullmq';
import { LoggerModule } from 'nestjs-pino';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ThrottlerModule } from '@nestjs/throttler';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { getTypeOrmConfig } from '../database/typeorm.config';

// Feature modules
import { AuthModule } from '../auth/auth.module';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { VisitsModule } from '../modules/visits/visits.module';
import { VenuesModule } from '../modules/venues/venues.module';
import { SharingModule } from '../modules/sharing/sharing.module';
import { UserModule } from '../modules/user/user.module';
import { ImportModule } from '../modules/import/import.module';
import { HealthModule } from '../common/health/health.module';
import { SentryModule } from '../common/sentry/sentry.module';
import { EmailModule } from '../common/email/email.module';

// Configuration
import { pinoLoggerConfig } from './pino.config';

// Global providers
import { HttpExceptionFilter } from '../common/filters/http-exception.filter';
import { LoggingInterceptor } from '../common/interceptors/logging.interceptor';
import { MetricsInterceptor } from '../common/interceptors/metrics.interceptor';
import { CacheInterceptor } from '../common/interceptors/cache.interceptor';

@Module({
  imports: [
    // Environment configuration
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    // TypeORM configuration
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: getTypeOrmConfig,
      inject: [ConfigService],
    }),
    // Rate limiting configuration
    ThrottlerModule.forRoot([{
      ttl: 60000, // 60 seconds
      limit: 10, // 10 requests per minute
    }]),
    // BullMQ configuration (must be before any queue registration)
    BullModule.forRoot({
      connection: {
        host: process.env['REDIS_HOST'] || 'localhost',
        port: parseInt(process.env['REDIS_PORT'] || '6379', 10),
        password: process.env['REDIS_PASSWORD'] || undefined,
      },
    }),
    // Global logging with Pino
    LoggerModule.forRoot(pinoLoggerConfig),
    // Global modules
    SentryModule,
    HealthModule,
    EmailModule,
    // Feature modules
    AuthModule,
    VisitsModule,
    VenuesModule,
    SharingModule,
    UserModule,
    ImportModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    {
      provide: APP_GUARD,
      useClass: JwtAuthGuard,
    },
    {
      provide: APP_FILTER,
      useClass: HttpExceptionFilter,
    },
    {
      provide: APP_INTERCEPTOR,
      useClass: LoggingInterceptor,
    },
    {
      provide: APP_INTERCEPTOR,
      useClass: MetricsInterceptor,
    },
    {
      provide: APP_INTERCEPTOR,
      useClass: CacheInterceptor,
    },
  ],
})
export class AppModule {}
