import { Module, Global, forwardRef } from '@nestjs/common';
import { QueueService } from './queue.service';
import { GenerationWorker } from './generation.worker';
import { PrismaModule } from '../../prisma/prisma.module';
import { ModelsModule } from '../models/models.module';
import { WebSocketModule } from '../websocket/websocket.module';

@Global()
@Module({
  imports: [PrismaModule, ModelsModule, forwardRef(() => WebSocketModule)],
  providers: [QueueService, GenerationWorker],
  exports: [QueueService],
})
export class QueueModule {}
