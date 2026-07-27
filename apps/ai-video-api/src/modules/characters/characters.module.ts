import { Module } from '@nestjs/common';
import { CharactersController, CharacterLibraryController } from './characters.controller';
import { CharactersService } from './characters.service';
import { CharacterLibraryService } from './character-library.service';
import { PrismaModule } from '../../prisma/prisma.module';
import { ModelsModule } from '../models/models.module';
import { StorageModule } from '../storage/storage.module';

@Module({
  imports: [PrismaModule, ModelsModule, StorageModule],
  controllers: [CharactersController, CharacterLibraryController],
  providers: [CharactersService, CharacterLibraryService],
  exports: [CharactersService, CharacterLibraryService],
})
export class CharactersModule {}
