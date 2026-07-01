import { IsEmail, IsString, MinLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class RegisterDto {
  @ApiProperty({ example: 'user@example.com' })
  @IsEmail()
  email: string;

  @ApiProperty({ example: 'mypassword123' })
  @IsString()
  @MinLength(6)
  password: string;

  @ApiProperty({ example: '张三', required: false })
  @IsString()
  name?: string;

  @ApiProperty({ description: '验证码 ID', example: 'abc123' })
  @IsString()
  captchaId: string;

  @ApiProperty({ description: '验证码文本', example: 'aB3x' })
  @IsString()
  captchaText: string;
}
