import { IsString, IsOptional, IsArray, IsNumber, IsEnum } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class UpdateShotDto {
  @ApiProperty({ description: '分镜提示词（英文，用于图像/视频生成）', required: false })
  @IsString()
  @IsOptional()
  prompt?: string;

  @ApiProperty({ description: '负面提示词', required: false })
  @IsString()
  @IsOptional()
  negativePrompt?: string;

  @ApiProperty({ description: '绑定的角色 ID 列表', required: false, type: [String] })
  @IsArray()
  @IsOptional()
  characterIds?: string[];

  @ApiProperty({
    description: '景别',
    required: false,
    enum: ['特写', '近景', '中景', '全景', '远景'],
  })
  @IsEnum(['特写', '近景', '中景', '全景', '远景'])
  @IsOptional()
  shotType?: string;

  @ApiProperty({
    description: '镜头角度',
    required: false,
    enum: ['平视', '俯拍', '仰拍', '跟拍', '固定'],
  })
  @IsEnum(['平视', '俯拍', '仰拍', '跟拍', '固定'])
  @IsOptional()
  cameraAngle?: string;

  @ApiProperty({ description: '运镜方式', required: false })
  @IsString()
  @IsOptional()
  cameraMovement?: string;

  @ApiProperty({ description: '情绪', required: false })
  @IsString()
  @IsOptional()
  emotion?: string;

  @ApiProperty({ description: '光影', required: false })
  @IsString()
  @IsOptional()
  lighting?: string;

  @ApiProperty({ description: '台词', required: false })
  @IsString()
  @IsOptional()
  dialogue?: string;

  @ApiProperty({ description: '旁白', required: false })
  @IsString()
  @IsOptional()
  narration?: string;

  @ApiProperty({ description: '字幕', required: false })
  @IsString()
  @IsOptional()
  subtitle?: string;

  @ApiProperty({ description: '时长(ms)', required: false })
  @IsNumber()
  @IsOptional()
  duration?: number;

  @ApiProperty({ description: '分镜标题', required: false })
  @IsString()
  @IsOptional()
  title?: string;

  @ApiProperty({ description: '画面描述（中文）', required: false })
  @IsString()
  @IsOptional()
  description?: string;
}

