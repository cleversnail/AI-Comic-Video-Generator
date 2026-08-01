import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { Request, Response } from 'express';

@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(GlobalExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let message = '服务器内部错误';
    let code = 'INTERNAL_ERROR';

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const res = exception.getResponse();
      message = typeof res === 'string' ? res : (res as Record<string, unknown>).message as string || message;
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
    } else if (exception instanceof Error) {
      // 500 错误不暴露内部异常信息给客户端
      message = status >= 500 ? '服务器内部错误，请稍后重试' : exception.message;
      code = status >= 500 ? 'INTERNAL_ERROR' : 'UNKNOWN_ERROR';
    }

    // 日志记录完整信息（包含请求路径和方法）
    this.logger.error(
      `[${code}] ${request.method} ${request.originalUrl} - ${message}`,
      exception instanceof Error ? exception.stack : '',
    );

    response.status(status).json({
      statusCode: status,
      code,
      message,
      path: request.originalUrl,
      timestamp: new Date().toISOString(),
    });
  }
}
