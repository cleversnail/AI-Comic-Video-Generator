import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaModule } from './prisma/prisma.module';
import { ModelsModule } from './modules/models/models.module';
import { ProjectsModule } from './modules/projects/projects.module';
import { StoryboardModule } from './modules/storyboard/storyboard.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    PrismaModule,
    ModelsModule,
    ProjectsModule,
    StoryboardModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
