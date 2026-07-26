import { Module } from '@nestjs/common';
import { StoryboardController } from './storyboard.controller';
import { StoryboardService } from './storyboard.service';
import { StoryboardPreviewService } from './storyboard-preview.service';
import { StoryboardTtsService } from './storyboard-tts.service';
import { PrismaModule } from '../../prisma/prisma.module';
import { ModelsModule } from '../models/models.module';

@Module({
  imports: [PrismaModule, ModelsModule],
  controllers: [StoryboardController],
  providers: [StoryboardService, StoryboardPreviewService, StoryboardTtsService],
  exports: [StoryboardService, StoryboardPreviewService, StoryboardTtsService],
})
export class StoryboardModule {}
