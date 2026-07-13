import { Module, Global } from '@nestjs/common';
import { UserService } from './user.service';
import { CryptoService } from './crypto.service';
import { PrismaModule } from '../../prisma/prisma.module';

@Global()
@Module({
  imports: [PrismaModule],
  providers: [UserService, CryptoService],
  exports: [UserService, CryptoService],
})
export class CommonModule {}
