import { Module } from '@nestjs/common';
import { StoryboardController } from './storyboard.controller';
import { StoryboardService } from './storyboard.service';
import { KeyframeController } from './keyframe.controller';
import { KeyframeService } from './keyframe.service';
import { ScriptImportController } from './script-import.controller';
import { ScriptImportService } from './script-import.service';
import { PrismaModule } from '../../prisma/prisma.module';
import { ModelsModule } from '../models/models.module';

@Module({
  imports: [PrismaModule, ModelsModule],
  controllers: [StoryboardController, KeyframeController, ScriptImportController],
  providers: [StoryboardService, KeyframeService, ScriptImportService],
  exports: [StoryboardService, KeyframeService, ScriptImportService],
})
export class StoryboardModule {}
