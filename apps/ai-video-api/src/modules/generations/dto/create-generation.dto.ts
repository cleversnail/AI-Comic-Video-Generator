import { IsString, IsOptional, IsObject } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateGenerationDto {
  @ApiProperty({ example: 'image' })
  @IsString()
  capability: string;

  @ApiProperty({ example: 'flux' })
  @IsString()
  modelId: string;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  shotId?: string;

  @ApiProperty({ required: false })
  @IsObject()
  @IsOptional()
  parameters?: Record<string, any>;
}
