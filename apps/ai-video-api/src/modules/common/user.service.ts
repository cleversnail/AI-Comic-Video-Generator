import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

/**
 * 共享的用户服务
 * TODO: 实现完整 Auth 模块后，移除临时用户创建逻辑
 */
@Injectable()
export class UserService {
  private readonly logger = new Logger(UserService.name);

  constructor(private readonly prisma: PrismaService) {}

  async ensureUserExists(userId: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      this.logger.log(`Creating temp user ${userId}`);
      await this.prisma.user.create({
        data: { id: userId, email: `${userId}@temp.local`, name: '临时用户' },
      });
    }
    return userId;
  }
}
