import { Injectable, NestMiddleware, Logger } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';

@Injectable()
export class RequestLoggerMiddleware implements NestMiddleware {
  private readonly logger = new Logger('HTTP');

  use(req: Request, res: Response, next: NextFunction) {
    const startTime = Date.now();
    const { method, originalUrl, ip } = req;
    const userAgent = req.get('user-agent') || '';

    // 获取用户 ID（如果有）
    const userId = (req as any).user?.id || 'anonymous';

    res.on('finish', () => {
      const duration = Date.now() - startTime;
      const { statusCode } = res;

      const message = `${method} ${originalUrl} ${statusCode} ${duration}ms`;

      if (statusCode >= 400) {
        this.logger.warn(message);
      } else {
        this.logger.log(message);
      }
    });

    next();
  }
}
