import { NgModule, ErrorHandler, isDevMode } from '@angular/core';

import {
  ScreenTrackingService,
  UserTrackingService,
} from '@angular/fire/compat/analytics';

import { AppRoutingModule } from './app-routing.module';

// Custom Error Handler for better error tracking
export class GlobalErrorHandler implements ErrorHandler {
  handleError(error: any): void {
    console.error('Global error caught:', error);

    // In production, you might want to send errors to a logging service
    if (!isDevMode()) {
      // Add your error reporting service here
      // Example: this.errorReportingService.reportError(error);
    }
  }
}

@NgModule({
  imports: [
    AppRoutingModule,
  ],
  providers: [
    // Global error handler for better error tracking
    { provide: ErrorHandler, useClass: GlobalErrorHandler },
    // Analytics tracking services for improved user tracking
    ScreenTrackingService,
    UserTrackingService,
  ],
})
export class AppModule {}
