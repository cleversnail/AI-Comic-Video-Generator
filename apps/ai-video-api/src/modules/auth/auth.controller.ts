import { Controller, Get, Post, Body } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { AuthService } from './auth.service';
import { CaptchaService } from './captcha.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';

@ApiTags('认证')
@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly captchaService: CaptchaService,
  ) {}

  @Get('captcha')
  @ApiOperation({ summary: '获取图形验证码' })
  getCaptcha() {
    return this.captchaService.generate();
  }

  @Post('register')
  @Throttle({ default: { limit: 3, ttl: 60000 } })  // 3 registrations per minute per IP
  @ApiOperation({ summary: '注册' })
  async register(@Body() dto: RegisterDto) {
    return this.authService.register(dto);
  }

  @Post('login')
  @Throttle({ default: { limit: 5, ttl: 60000 } })  // 5 login attempts per minute per IP
  @ApiOperation({ summary: '登录' })
  async login(@Body() dto: LoginDto) {
    return this.authService.login(dto);
  }
}
