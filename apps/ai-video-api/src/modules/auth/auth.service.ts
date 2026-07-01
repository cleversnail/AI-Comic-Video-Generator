import { Injectable, UnauthorizedException, ConflictException, Logger } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../../prisma/prisma.service';
import { RegisterDto } from './dto/register.dto';
import { CaptchaService } from './captcha.service';
import { LoginDto } from './dto/login.dto';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly captchaService: CaptchaService,
  ) {}

  async register(dto: RegisterDto) {
    // Verify captcha
    if (!this.captchaService.verify(dto.captchaId, dto.captchaText)) {
      throw new UnauthorizedException('验证码错误或已过期');
    }

    const existing = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });
    if (existing) {
      throw new ConflictException('邮箱已注册');
    }

    const passwordHash = await bcrypt.hash(dto.password, 10);
    const user = await this.prisma.user.create({
      data: {
        email: dto.email,
        name: dto.name || dto.email.split('@')[0],
        passwordHash,
      },
    });

    const token = this.signToken(user.id, user.email);
    this.logger.log(`User registered: ${user.email}`);

    return {
      data: {
        id: user.id,
        email: user.email,
        name: user.name,
        accessToken: token,
      },
    };
  }

  async login(dto: LoginDto) {
    const user = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });

    if (!user || !user.passwordHash) {
      throw new UnauthorizedException('邮箱或密码错误');
    }

    const valid = await bcrypt.compare(dto.password, user.passwordHash);
    if (!valid) {
      throw new UnauthorizedException('邮箱或密码错误');
    }

    const token = this.signToken(user.id, user.email);
    this.logger.log(`User logged in: ${user.email}`);

    return {
      data: {
        id: user.id,
        email: user.email,
        name: user.name,
        accessToken: token,
      },
    };
  }

  private signToken(userId: string, email: string): string {
    return this.jwtService.sign({ sub: userId, email });
  }
}
