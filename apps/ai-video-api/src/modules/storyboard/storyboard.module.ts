import { Module } from '@nestjs/common';
import { StoryboardController } from './storyboard.controller';
import { StoryboardService } from './storyboard.service';
import { KeyframeController } from './keyframe.controller';
import { KeyframeService } from './keyframe.service';
import { PrismaModule } from '../../prisma/prisma.module';
import { ModelsModule } from '../models/models.module';

@Module({
  imports: [PrismaModule, ModelsModule],
  controllers: [StoryboardController, KeyframeController],
  providers: [StoryboardService, KeyframeService],
  exports: [StoryboardService, KeyframeService],
})
export class StoryboardModule {}
