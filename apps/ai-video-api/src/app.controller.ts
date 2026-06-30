import { Controller, Get } from '@nestjs/common';
import { PrismaService } from './prisma/prisma.service';

@Controller()
export class AppController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  async getStatus() {
    const users = await this.prisma.user.count();
    return {
      status: 'ok',
      message: 'AI 漫剧生成器 API 运行中',
      users,
    };
  }
}
