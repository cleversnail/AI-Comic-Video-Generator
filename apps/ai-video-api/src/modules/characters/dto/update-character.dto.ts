import { IsString, IsOptional, IsInt } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class UpdateCharacterDto {
  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  name?: string;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  gender?: string;

  @ApiProperty({ required: false })
  @IsInt()
  @IsOptional()
  age?: number;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  role?: string;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  personality?: string;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  appearance?: string;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  outfit?: string;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  prompt?: string;

  @ApiProperty({ required: false, enum: ['loose', 'medium', 'strict'] })
  @IsString()
  @IsOptional()
  lockLevel?: string;
}
