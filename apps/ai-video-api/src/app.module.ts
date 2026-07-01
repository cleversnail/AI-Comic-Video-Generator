import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './modules/auth/auth.module';
import { ModelsModule } from './modules/models/models.module';
import { ProjectsModule } from './modules/projects/projects.module';
import { StoryboardModule } from './modules/storyboard/storyboard.module';
import { CharactersModule } from './modules/characters/characters.module';
import { CommonModule } from './modules/common/common.module';
import { QueueModule } from './modules/queue/queue.module';
import { StorageModule } from './modules/storage/storage.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    PrismaModule,
    CommonModule,
    QueueModule,
    StorageModule,
    AuthModule,
    ModelsModule,
    ProjectsModule,
    StoryboardModule,
    CharactersModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
