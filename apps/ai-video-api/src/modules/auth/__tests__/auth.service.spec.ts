import { Test, TestingModule } from '@nestjs/testing';
import { UnauthorizedException, BadRequestException, ConflictException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { AuthService } from '../auth.service';
import { PrismaService } from '../../../prisma/prisma.service';
import { CaptchaService } from '../captcha.service';
import * as bcrypt from 'bcrypt';

jest.mock('bcrypt');

describe('AuthService', () => {
  let service: AuthService;
  let prisma: any;
  let jwtService: any;
  let captchaService: any;

  const mockPrisma = {
    user: {
      findUnique: jest.fn(),
      create: jest.fn(),
    },
  };

  const mockJwtService = {
    sign: jest.fn().mockReturnValue('mock-jwt-token'),
  };

  const mockCaptchaService = {
    verify: jest.fn().mockReturnValue(true),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: JwtService, useValue: mockJwtService },
        { provide: CaptchaService, useValue: mockCaptchaService },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
    prisma = module.get(PrismaService);
    jwtService = module.get(JwtService);
    captchaService = module.get(CaptchaService);
  });

  afterEach(() => jest.clearAllMocks());

  describe('register', () => {
    it('should register a new user', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);
      (bcrypt.hash as jest.Mock).mockResolvedValue('hashed-password');
      mockPrisma.user.create.mockResolvedValue({
        id: 'u1',
        email: 'test@test.com',
        name: 'Test User',
      });

      const result = await service.register({
        email: 'test@test.com',
        password: 'password123',
        name: 'Test User',
        captchaId: 'captcha-id',
        captchaText: '1234',
      });
      expect(result.data.accessToken).toBe('mock-jwt-token');
      expect(result.data.email).toBe('test@test.com');
    });

    it('should throw if email already exists', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({ id: 'u1', email: 'test@test.com' });

      await expect(
        service.register({
          email: 'test@test.com',
          password: 'password123',
          name: 'Test',
          captchaId: 'captcha-id',
          captchaText: '1234',
        })
      ).rejects.toThrow(ConflictException);
    });

    it('should throw if captcha is invalid', async () => {
      captchaService.verify.mockReturnValue(false);

      await expect(
        service.register({
          email: 'new@test.com',
          password: 'password123',
          name: 'Test',
          captchaId: 'captcha-id',
          captchaText: 'wrong',
        })
      ).rejects.toThrow(UnauthorizedException);
    });
  });

  describe('login', () => {
    it('should login with valid credentials', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({
        id: 'u1',
        email: 'test@test.com',
        passwordHash: 'hashed-password',
        name: 'Test',
      });
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);

      const result = await service.login({ email: 'test@test.com', password: 'password123' });
      expect(result.data.accessToken).toBe('mock-jwt-token');
    });

    it('should throw for invalid email', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);
      await expect(
        service.login({ email: 'wrong@test.com', password: 'password' })
      ).rejects.toThrow(UnauthorizedException);
    });

    it('should throw for invalid password', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({
        id: 'u1',
        email: 'test@test.com',
        passwordHash: 'hashed-password',
      });
      (bcrypt.compare as jest.Mock).mockResolvedValue(false);

      await expect(
        service.login({ email: 'test@test.com', password: 'wrong-password' })
      ).rejects.toThrow(UnauthorizedException);
    });
  });
});
