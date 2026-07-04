import { Controller, Post, Body, Param, UploadedFile, UseInterceptors, UseGuards } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiConsumes } from '@nestjs/swagger';
import { ScriptImportService, ParsedScript } from './script-import.service';
import { ImportScriptDto } from './dto/import-script.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser } from '../auth/current-user.decorator';

@ApiTags('剧本导入')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('projects/:projectId/script')
export class ScriptImportController {
  constructor(private readonly scriptImportService: ScriptImportService) {}

  @Post('parse')
  @ApiOperation({ summary: '从文本解析剧本' })
  async parseText(
    @CurrentUser('id') userId: string,
    @Param('projectId') projectId: string,
    @Body() dto: ImportScriptDto,
  ) {
    if (!dto.text) throw new Error('请提供剧本文本');
    return this.scriptImportService.parseFromText(userId, projectId, dto.text);
  }

  @Post('upload')
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(FileInterceptor('file'))
  @ApiOperation({ summary: '上传文件解析剧本 (TXT/DOCX/PDF)' })
  async uploadFile(
    @CurrentUser('id') userId: string,
    @Param('projectId') projectId: string,
    @UploadedFile() file: Express.Multer.File,
  ) {
    return this.scriptImportService.parseFromFile(userId, projectId, file);
  }

  @Post('import')
  @ApiOperation({ summary: '将解析后的剧本导入项目（生成角色+分镜）' })
  async importToProject(
    @CurrentUser('id') userId: string,
    @Param('projectId') projectId: string,
    @Body() parsed: ParsedScript,
  ) {
    return this.scriptImportService.importToProject(userId, projectId, parsed);
  }
}
