import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { ErrorResponse } from '../interfaces/error-response.interface';
// import { Prisma } from '@prisma/client';
@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(HttpExceptionFilter.name);
  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();
    const errorResponse = this.buildErrorResponse(exception, request);
    this.logError(exception, request, errorResponse);
    response.status(errorResponse.statusCode).json(errorResponse);
  }
  private buildErrorResponse(
    exception: unknown,
    request: Request,
  ): ErrorResponse {
    const timestamp = new Date().toISOString();
    const path = request.url;
    const method = request.method;
    if (exception instanceof HttpException) {
      return this.handleHttpException(exception, timestamp, path, method);
    }
    // Prisma desligado — handlers comentados
    // if (this.isPrismaError(exception)) {
    //   return this.handlePrismaError(exception, timestamp, path, method);
    // }
    return this.handleGenericError(exception, timestamp, path, method);
  }
  private handleHttpException(
    exception: HttpException,
    timestamp: string,
    path: string,
    method: string,
  ): ErrorResponse {
    const status = exception.getStatus();
    const exceptionResponse = exception.getResponse();
    const message =
      typeof exceptionResponse === 'object' &&
      'message' in exceptionResponse &&
      exceptionResponse.message
        ? (exceptionResponse.message as string | string[])
        : exception.message;
    const error =
      typeof exceptionResponse === 'object' &&
      'error' in exceptionResponse &&
      exceptionResponse.error
        ? (exceptionResponse.error as string)
        : exception.name;
    return {
      statusCode: status,
      timestamp,
      path,
      method,
      message,
      error,
      ...(process.env.NODE_ENV !== 'production' && {
        details: exceptionResponse,
      }),
    };
  }
  // private handlePrismaError(
  //   exception: Prisma.PrismaClientKnownRequestError,
  //   timestamp: string,
  //   path: string,
  //   method: string,
  // ): ErrorResponse {
  //   const { code, meta } = exception;
  //   switch (code) {
  //     case 'P2002':
  //       return {
  //         statusCode: HttpStatus.CONFLICT,
  //         timestamp,
  //         path,
  //         method,
  //         message: 'Registro duplicado. Já existe um registro com esses dados.',
  //         error: 'Conflict',
  //         ...(process.env.NODE_ENV !== 'production' && {
  //           details: { code, meta },
  //         }),
  //       };
  //     case 'P2025':
  //       return {
  //         statusCode: HttpStatus.NOT_FOUND,
  //         timestamp,
  //         path,
  //         method,
  //         message: 'Registro não encontrado.',
  //         error: 'Not Found',
  //         ...(process.env.NODE_ENV !== 'production' && {
  //           details: { code, meta },
  //         }),
  //       };
  //     case 'P2003':
  //       return {
  //         statusCode: HttpStatus.BAD_REQUEST,
  //         timestamp,
  //         path,
  //         method,
  //         message: 'Violação de chave estrangeira.',
  //         error: 'Bad Request',
  //         ...(process.env.NODE_ENV !== 'production' && {
  //           details: { code, meta },
  //         }),
  //       };
  //     case 'P2014':
  //       return {
  //         statusCode: HttpStatus.BAD_REQUEST,
  //         timestamp,
  //         path,
  //         method,
  //         message:
  //           'Violação de relação. Não é possível realizar esta operação.',
  //         error: 'Bad Request',
  //         ...(process.env.NODE_ENV !== 'production' && {
  //           details: { code, meta },
  //         }),
  //       };
  //     default:
  //       return {
  //         statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
  //         timestamp,
  //         path,
  //         method,
  //         message: 'Erro ao processar a requisição no banco de dados.',
  //         error: 'Database Error',
  //         ...(process.env.NODE_ENV !== 'production' && {
  //           details: { code, meta, message: exception.message },
  //         }),
  //       };
  //   }
  // }
  private handleGenericError(
    exception: unknown,
    timestamp: string,
    path: string,
    method: string,
  ): ErrorResponse {
    const isProduction = process.env.NODE_ENV === 'production';
    const publicMessage = 'Erro interno do servidor.';
    const developmentMessage =
      exception instanceof Error ? exception.message : publicMessage;
    return {
      statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
      timestamp,
      path,
      method,
      message: isProduction ? publicMessage : developmentMessage,
      error: 'Internal Server Error',
      ...(!isProduction && {
        details: exception,
      }),
    };
  }
  // private isPrismaError(
  //   exception: unknown,
  // ): exception is Prisma.PrismaClientKnownRequestError {
  //   return (
  //     exception instanceof Prisma.PrismaClientKnownRequestError ||
  //     (typeof exception === 'object' &&
  //       exception !== null &&
  //       'code' in exception &&
  //       typeof (
  //         exception as {
  //           code: unknown;
  //         }
  //       ).code === 'string' &&
  //       (
  //         exception as {
  //           code: string;
  //         }
  //       ).code.startsWith('P'))
  //   );
  // }
  private logError(
    exception: unknown,
    request: Request,
    errorResponse: ErrorResponse,
  ): void {
    const { statusCode, message, path, method } = errorResponse;
    const logMessage = `${method} ${path} - Status: ${statusCode} - Message: ${JSON.stringify(message)}`;
    if (statusCode >= 500) {
      this.logger.error(
        logMessage,
        exception instanceof Error ? exception.stack : '',
      );
    } else if (statusCode >= 400) {
      this.logger.warn(logMessage);
    } else {
      this.logger.log(logMessage);
    }
  }
}
