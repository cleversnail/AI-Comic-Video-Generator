import { Module } from '@nestjs/common';
import { ComposeController } from './compose.controller';
import { ComposeService } from './compose.service';
import { DistributeService } from './distribute.service';
import { PrismaModule } from '../../prisma/prisma.module';
import { StorageModule } from '../storage/storage.module';

@Module({
  imports: [PrismaModule, StorageModule],
  controllers: [ComposeController],
  providers: [ComposeService, DistributeService],
  exports: [ComposeService, DistributeService],
})
export class ComposeModule {}
