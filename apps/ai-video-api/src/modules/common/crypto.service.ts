import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as crypto from 'crypto';

@Injectable()
export class CryptoService implements OnModuleInit {
  private readonly logger = new Logger(CryptoService.name);
  private readonly key: Buffer;

  constructor(private readonly configService: ConfigService) {
    const secret = this.configService.get<string>('AES_KEY') || this.configService.get<string>('JWT_SECRET');

    if (!secret) {
      throw new Error('环境变量 AES_KEY 或 JWT_SECRET 必须至少配置一个，用于 API Key 加密');
    }

    // Derive a 32-byte key for AES-256-GCM
    this.key = crypto.scryptSync(secret, 'ai-video-salt', 32);
  }

  onModuleInit() {
    if (!this.configService.get<string>('AES_KEY')) {
      this.logger.warn('未配置 AES_KEY，已回退使用 JWT_SECRET 作为加密密钥。建议生产环境单独配置 AES_KEY。');
    }
  }

  /**
   * AES-256-GCM 加密
   */
  encrypt(plaintext: string): string {
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv('aes-256-gcm', this.key, iv);
    let encrypted = cipher.update(plaintext, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    const authTag = cipher.getAuthTag().toString('hex');
    return `${iv.toString('hex')}:${authTag}:${encrypted}`;
  }

  /**
   * AES-256-GCM 解密
   */
  decrypt(encryptedData: string): string {
    const [ivHex, authTagHex, encrypted] = encryptedData.split(':');
    if (!ivHex || !authTagHex || !encrypted) {
      throw new Error('加密数据格式不正确');
    }
    const iv = Buffer.from(ivHex, 'hex');
    const authTag = Buffer.from(authTagHex, 'hex');
    const decipher = crypto.createDecipheriv('aes-256-gcm', this.key, iv);
    decipher.setAuthTag(authTag);
    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    return decrypted;
  }
}
