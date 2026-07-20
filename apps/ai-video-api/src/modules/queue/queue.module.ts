import { Module, Global } from '@nestjs/common';
import { QueueService } from './queue.service';
import { QueueProcessor } from './queue.processor';
import { PrismaModule } from '../../prisma/prisma.module';
import { ModelsModule } from '../models/models.module';
import { AdapterFactory } from '../../common/adapters/adapter.factory';
import { WebSocketModule } from '../websocket/websocket.module';

@Global()
@Module({
  imports: [PrismaModule, ModelsModule, WebSocketModule],
  providers: [QueueService, QueueProcessor, AdapterFactory],
  exports: [QueueService],
})
export class QueueModule {}
