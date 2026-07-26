import { IsString, IsOptional, IsNumber, IsArray } from 'class-validator';

export class GenerateTtsDto {
  @IsString()
  @IsOptional()
  voiceId?: string;

  @IsNumber()
  @IsOptional()
  speed?: number;

  @IsString()
  @IsOptional()
  language?: string;
}

export class GenerateTtsForShotsDto {
  @IsArray()
  shotIds?: string[];

  @IsString()
  @IsOptional()
  voiceId?: string;

  @IsNumber()
  @IsOptional()
  speed?: number;
}
