import { Module, Global } from '@nestjs/common';
import { UserService } from './user.service';
import { PrismaModule } from '../../prisma/prisma.module';

@Global()
@Module({
  imports: [PrismaModule],
  providers: [UserService],
  exports: [UserService],
})
export class CommonModule {}
