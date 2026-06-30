import { IsString, IsOptional, IsArray } from 'class-validator';

export class GenerateShotsDto {
  @IsString()
  story: string;

  @IsString()
  @IsOptional()
  style?: string;

  @IsArray()
  @IsOptional()
  characterDescriptions?: string[];
}
