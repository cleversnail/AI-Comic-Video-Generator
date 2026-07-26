import { Module } from '@nestjs/common';
import { ProjectsController } from './projects.controller';
import { ProjectsService } from './projects.service';
import { VersionService } from './version.service';
import { PrismaModule } from '../../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [ProjectsController],
  providers: [ProjectsService, VersionService],
  exports: [ProjectsService, VersionService],
})
export class ProjectsModule {}
