import { Module } from '@nestjs/common';
import { ProjectsController, TemplateController } from './projects.controller';
import { ProjectsService } from './projects.service';
import { VersionService } from './version.service';
import { EpisodeService } from './episode.service';
import { TemplateService } from './template.service';
import { PrismaModule } from '../../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [ProjectsController, TemplateController],
  providers: [ProjectsService, VersionService, EpisodeService, TemplateService],
  exports: [ProjectsService, VersionService, EpisodeService, TemplateService],
})
export class ProjectsModule {}
