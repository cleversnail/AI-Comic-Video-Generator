import { IsString, IsOptional, IsBoolean, IsJSON } from 'class-validator';

export class CreateApiKeyDto {
  @IsString()
  modelId: string;

  @IsString()
  apiKey: string;

  @IsString()
  @IsOptional()
  alias?: string;

  @IsBoolean()
  @IsOptional()
  isDefault?: boolean;
}
