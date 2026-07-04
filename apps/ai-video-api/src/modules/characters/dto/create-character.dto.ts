import { IsString, IsOptional, IsInt } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateCharacterDto {
  @ApiProperty({ example: '林小雨' })
  @IsString()
  name: string;

  @ApiProperty({ example: '女', required: false })
  @IsString()
  @IsOptional()
  gender?: string;

  @ApiProperty({ example: 17, required: false })
  @IsInt()
  @IsOptional()
  age?: number;

  @ApiProperty({ example: '主角', required: false })
  @IsString()
  @IsOptional()
  role?: string;

  @ApiProperty({ example: '开朗活泼，成绩优秀', required: false })
  @IsString()
  @IsOptional()
  personality?: string;

  @ApiProperty({ example: '长发，大眼睛，穿校服', required: false })
  @IsString()
  @IsOptional()
  appearance?: string;

  @ApiProperty({ example: '白色衬衫配蓝色格子裙', required: false })
  @IsString()
  @IsOptional()
  outfit?: string;

  @ApiProperty({ example: 'medium', required: false, enum: ['loose', 'medium', 'strict'] })
  @IsString()
  @IsOptional()
  lockLevel?: string;
}
