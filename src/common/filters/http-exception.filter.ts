import { ExceptionFilter, Catch, ArgumentsHost, HttpException } from '@nestjs/common';
import { Request, Response } from 'express';

@Catch(HttpException)
export class HttpExceptionFilter implements ExceptionFilter {
  catch(exception: HttpException, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();
    const status = exception.getStatus();
    const message = exception.message || null;
    const error = exception.name || 'Error';
    const timestamp = new Date().toISOString();
    const path = request.url;
    response.status(status).json({
      statusCode: status,
      message,
      error,
      timestamp,
      path,
    });
  }
}
