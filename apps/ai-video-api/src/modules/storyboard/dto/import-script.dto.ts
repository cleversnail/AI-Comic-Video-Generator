import { IsString, IsOptional, IsEnum } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class ImportScriptDto {
  @ApiProperty({ description: '剧本纯文本内容', required: false })
  @IsString()
  @IsOptional()
  text?: string;

  @ApiProperty({ description: '文件类型', enum: ['txt', 'docx', 'pdf'], required: false })
  @IsEnum(['txt', 'docx', 'pdf'])
  @IsOptional()
  fileType?: string;
}
