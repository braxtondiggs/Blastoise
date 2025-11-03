import { Module } from '@nestjs/common';
import { APP_FILTER, APP_INTERCEPTOR } from '@nestjs/core';
import { AppController } from './app.controller';
import { AppService } from './app.service';

// Feature modules
import { AuthModule } from '../modules/auth/auth.module';
import { VisitsModule } from '../modules/visits/visits.module';
import { VenuesModule } from '../modules/venues/venues.module';
import { SharingModule } from '../modules/sharing/sharing.module';
import { UserModule } from '../modules/user/user.module';
import { HealthModule } from '../common/health/health.module';
import { SentryModule } from '../common/sentry/sentry.module';

// Global providers
import { HttpExceptionFilter } from '../common/filters/http-exception.filter';
import { LoggingInterceptor } from '../common/interceptors/logging.interceptor';
import { MetricsInterceptor } from '../common/interceptors/metrics.interceptor';
import { CacheInterceptor } from '../common/interceptors/cache.interceptor';

@Module({
  imports: [
    // Global modules
    SentryModule,
    HealthModule,
    // Feature modules
    AuthModule,
    VisitsModule,
    VenuesModule,
    SharingModule,
    UserModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
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
