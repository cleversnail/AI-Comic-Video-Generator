import { Module } from '@nestjs/common';
import { StoryboardController } from './storyboard.controller';
import { StoryboardService } from './storyboard.service';
import { StoryboardPreviewService } from './storyboard-preview.service';
import { StoryboardTtsService } from './storyboard-tts.service';
import { ScriptAuditService } from './script-audit.service';
import { NovelSplitService } from './novel-split.service';
import { PrismaModule } from '../../prisma/prisma.module';
import { ModelsModule } from '../models/models.module';

@Module({
  imports: [PrismaModule, ModelsModule],
  controllers: [StoryboardController],
  providers: [StoryboardService, StoryboardPreviewService, StoryboardTtsService, ScriptAuditService, NovelSplitService],
  exports: [StoryboardService, StoryboardPreviewService, StoryboardTtsService, ScriptAuditService, NovelSplitService],
})
export class StoryboardModule {}
