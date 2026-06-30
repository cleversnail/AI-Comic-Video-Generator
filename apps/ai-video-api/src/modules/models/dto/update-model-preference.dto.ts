import { IsString, IsObject, IsOptional } from 'class-validator';

export class UpdateModelPreferenceDto {
  @IsString()
  projectId: string;

  @IsObject()
  defaults: Record<string, { modelId: string; apiKeyId?: string; parameters?: Record<string, any> }>;
}
