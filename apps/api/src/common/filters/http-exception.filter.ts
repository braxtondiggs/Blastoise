import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
  Inject,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { ApiResponse } from '@blastoise/shared';
import { SentryService } from '../sentry/sentry.service';

interface ExceptionResponse {
  message?: string;
  error?: string;
}

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(HttpExceptionFilter.name);

  constructor(
    @Inject(SentryService) private readonly sentryService: SentryService
  ) {}

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let message = 'Internal server error';
    let errorCode = 'INTERNAL_ERROR';

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const exceptionResponse = exception.getResponse();

      if (typeof exceptionResponse === 'string') {
        message = exceptionResponse;
      } else if (typeof exceptionResponse === 'object' && exceptionResponse !== null) {
        const typedResponse = exceptionResponse as ExceptionResponse;
        message = typedResponse.message || exception.message;
        errorCode = typedResponse.error || exception.name;
      }
    } else if (exception instanceof Error) {
      message = exception.message;
      errorCode = exception.name;
    }

    // Log the error
    this.logger.error(
      `${request.method} ${request.url} - ${status} - ${message}`,
      exception instanceof Error ? exception.stack : undefined
    );

    // Capture exception in Sentry (only for server errors)
    if (status >= 500 && exception instanceof Error) {
      this.sentryService.captureException(exception, {
        userId: (request as Request & { user?: { id: string } }).user?.id,
        endpoint: request.url,
        method: request.method,
        timestamp: new Date().toISOString(),
        additionalData: {
          statusCode: status,
          errorCode,
        },
      });
    }

    // Send standardized error response
    const errorResponse: ApiResponse = {
      success: false,
      error: {
        code: errorCode,
        message,
        status,
      },
    };

    response.status(status).json(errorResponse);
  }
}
