import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';

@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(GlobalExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse();

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let message = '服务器内部错误';
    let code = 'INTERNAL_ERROR';

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const res = exception.getResponse();
      message = typeof res === 'string' ? res : (res as any).message || message;
      code = 'HTTP_ERROR';
    } else if (exception instanceof Prisma.PrismaClientKnownRequestError) {
      status = HttpStatus.BAD_REQUEST;
      code = 'DATABASE_ERROR';
      switch (exception.code) {
        case 'P2002':
          message = '数据已存在，请勿重复创建';
          break;
        case 'P2025':
          status = HttpStatus.NOT_FOUND;
          message = '请求的资源不存在';
          break;
        case 'P2003':
          message = '关联数据无效';
          break;
        default:
          message = `数据库错误: ${exception.code}`;
      }
    } else if (exception instanceof Prisma.PrismaClientValidationError) {
      status = HttpStatus.BAD_REQUEST;
      message = '数据验证失败';
      code = 'VALIDATION_ERROR';
    } else if (exception instanceof Prisma.PrismaClientUnknownRequestError) {
      status = HttpStatus.INTERNAL_SERVER_ERROR;
      message = '数据库未知错误，请稍后重试';
      code = 'DATABASE_UNKNOWN_ERROR';
    } else if (exception instanceof Prisma.PrismaClientInitializationError) {
      status = HttpStatus.SERVICE_UNAVAILABLE;
      message = '数据库连接失败，请稍后重试';
      code = 'DATABASE_CONNECTION_ERROR';
    } else if (exception instanceof Error) {
      // Don't leak internal error details to client in production
      message = process.env.NODE_ENV === 'production' ? '服务器内部错误' : exception.message;
      code = 'UNKNOWN_ERROR';
    }

    this.logger.error(
      `[${code}] ${message}`,
      exception instanceof Error ? exception.stack : '',
    );

    response.status(status).json({
      statusCode: status,
      code,
      message,
      timestamp: new Date().toISOString(),
    });
  }
}
