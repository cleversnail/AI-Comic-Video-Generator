import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { ModelsController } from './models.controller';
import { ModelsService } from './models.service';
import { CostService } from './cost.service';
import { PrismaModule } from '../../prisma/prisma.module';
import { AdapterFactory } from '../../common/adapters/adapter.factory';
import { DeepSeekAdapter } from './adapters/deepseek.adapter';
import { FluxAdapter } from './adapters/flux.adapter';
import { KlingImageAdapter } from './adapters/kling-image.adapter';
import { KlingVideoAdapter } from './adapters/kling-video.adapter';
import { DoubaoVideoAdapter } from './adapters/doubao-video.adapter';
import { MiniMaxTTSAdapter } from './adapters/minimax-tts.adapter';

@Module({
  imports: [PrismaModule, HttpModule],
  controllers: [ModelsController],
  providers: [ModelsService, CostService, AdapterFactory, DeepSeekAdapter, FluxAdapter, KlingImageAdapter, KlingVideoAdapter, DoubaoVideoAdapter, MiniMaxTTSAdapter],
  exports: [ModelsService, CostService, AdapterFactory],
})
export class ModelsModule {}
