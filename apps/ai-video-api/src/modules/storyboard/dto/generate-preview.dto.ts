import { IsString, IsOptional } from 'class-validator';

export class GeneratePreviewDto {
  @IsString()
  @IsOptional()
  customPrompt?: string;
}
