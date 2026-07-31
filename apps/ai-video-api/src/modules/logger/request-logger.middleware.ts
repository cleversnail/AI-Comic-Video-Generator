import { Injectable, NestMiddleware, Inject } from '@nestjs/common';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { Logger } from 'winston';
import { Request, Response, NextFunction } from 'express';

@Injectable()
export class RequestLoggerMiddleware implements NestMiddleware {
  constructor(
    @Inject(WINSTON_MODULE_NEST_PROVIDER) private readonly logger: Logger,
  ) {}

  use(req: Request, res: Response, next: NextFunction) {
    const startTime = Date.now();
    const { method, originalUrl, ip } = req;
    const userAgent = req.get('user-agent') || '';

    // 获取用户 ID（如果有）
    const userId = (req as any).user?.id || 'anonymous';

    res.on('finish', () => {
      const duration = Date.now() - startTime;
      const { statusCode } = res;

      const logData = {
        method,
        url: originalUrl,
        statusCode,
        duration: `${duration}ms`,
        ip: ip || req.socket.remoteAddress,
        userId,
        userAgent: userAgent.substring(0, 100),
      };

      if (statusCode >= 400) {
        this.logger.warn('Request completed with error', logData);
      } else {
        this.logger.info('Request completed', logData);
      }
    });

    next();
  }
}
