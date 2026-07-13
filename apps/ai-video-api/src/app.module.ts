import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { APP_GUARD } from '@nestjs/core';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './modules/auth/auth.module';
import { ModelsModule } from './modules/models/models.module';
import { ProjectsModule } from './modules/projects/projects.module';
import { StoryboardModule } from './modules/storyboard/storyboard.module';
import { CharactersModule } from './modules/characters/characters.module';
import { ComposeModule } from './modules/compose/compose.module';
import { GenerationsModule } from './modules/generations/generations.module';
import { CommonModule } from './modules/common/common.module';
import { QueueModule } from './modules/queue/queue.module';
import { StorageModule } from './modules/storage/storage.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    ThrottlerModule.forRoot([{
      ttl: 60000,  // 1 minute
      limit: 30,   // 30 requests per minute globally
    }]),
    PrismaModule,
    CommonModule,
    QueueModule,
    StorageModule,
    AuthModule,
    ModelsModule,
    ProjectsModule,
    StoryboardModule,
    CharactersModule,
    ComposeModule,
    GenerationsModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    { provide: APP_GUARD, useClass: ThrottlerGuard },
  ],
})
export class AppModule {}
