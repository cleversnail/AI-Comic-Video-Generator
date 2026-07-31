import { Module, Global } from '@nestjs/common';
import { WinstonModule } from 'nest-winston';
import * as winston from 'winston';
import * as path from 'path';

const logDir = path.join(process.cwd(), 'logs');

// 自定义日志格式
const customFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.errors({ stack: true }),
  winston.format.printf(({ timestamp, level, message, context, stack }) => {
    const ctx = context ? `[${context}]` : '';
    const stackTrace = stack ? `\n${stack}` : '';
    return `${timestamp} ${level.toUpperCase().padEnd(7)} ${ctx} ${message}${stackTrace}`;
  })
);

// JSON 格式（用于文件）
const jsonFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.errors({ stack: true }),
  winston.format.json()
);

@Global()
@Module({
  imports: [
    WinstonModule.forRoot({
      transports: [
        // 控制台输出（开发环境）
        new winston.transports.Console({
          format: winston.format.combine(
            winston.format.colorize(),
            customFormat
          ),
          level: process.env.NODE_ENV === 'production' ? 'info' : 'debug',
        }),
        // 文件输出 - 所有日志
        new winston.transports.File({
          filename: path.join(logDir, 'app.log'),
          format: jsonFormat,
          level: 'info',
          maxsize: 10 * 1024 * 1024, // 10MB
          maxFiles: 5,
        }),
        // 文件输出 - 错误日志
        new winston.transports.File({
          filename: path.join(logDir, 'error.log'),
          format: jsonFormat,
          level: 'error',
          maxsize: 10 * 1024 * 1024, // 10MB
          maxFiles: 5,
        }),
        // 文件输出 - 访问日志
        new winston.transports.File({
          filename: path.join(logDir, 'access.log'),
          format: jsonFormat,
          level: 'info',
          maxsize: 10 * 1024 * 1024, // 10MB
          maxFiles: 10,
        }),
      ],
    }),
  ],
  exports: [WinstonModule],
})
export class LoggerModule {}
