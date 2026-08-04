import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { GlobalExceptionFilter } from './common/filters/global-exception.filter';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // 限制请求体大小为 2MB，防止恶意大 payload 攻击
  const express = app.getHttpAdapter().getInstance();
  express.set('query parser', 'extended');
  express.use(require('body-parser').json({ limit: '2mb' }));
  express.use(require('body-parser').urlencoded({ limit: '2mb', extended: true }));

  // 校验关键环境变量
  const requiredEnvVars = ['JWT_SECRET', 'DATABASE_URL'];
  const missing = requiredEnvVars.filter((key) => !process.env[key]);
  if (missing.length > 0) {
    console.error(`❌ 缺少必需的环境变量: ${missing.join(', ')}`);
    process.exit(1);
  }

  // 使用 Winston 作为全局日志
  app.useLogger(app.get(WINSTON_MODULE_NEST_PROVIDER));

  app.useGlobalPipes(new ValidationPipe({
    whitelist: true,
    transform: true,
  }));

  app.useGlobalFilters(new GlobalExceptionFilter());

  app.enableCors({
    origin: process.env.FRONTEND_URL || 'http://localhost:3000',
    credentials: true,
  });

  const config = new DocumentBuilder()
    .setTitle('AI 漫剧生成器 API')
    .setDescription('AI 漫剧生成器后端 API 文档')
    .setVersion('1.0')
    .addBearerAuth()
    .build();
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document);

  const port = process.env.PORT || 3001;
  await app.listen(port);
  console.log(`🚀 API server running on http://localhost:${port}`);
  console.log(`📚 Swagger docs on http://localhost:${port}/api/docs`);
}
bootstrap();
