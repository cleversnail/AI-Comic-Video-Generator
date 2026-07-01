import { Injectable, Logger } from '@nestjs/common';
import * as svgCaptcha from 'svg-captcha';

interface CaptchaEntry {
  text: string;
  expiresAt: number;
}

@Injectable()
export class CaptchaService {
  private readonly logger = new Logger(CaptchaService.name);
  private readonly store = new Map<string, CaptchaEntry>();
  private readonly TTL = 5 * 60 * 1000; // 5 minutes

  constructor() {
    // Clean expired captchas every minute
    setInterval(() => this.cleanExpired(), 60_000);
  }

  generate(): { id: string; svg: string } {
    const captcha = svgCaptcha.create({
      size: 4,
      ignoreChars: '0o1lI',
      noise: 3,
      color: true,
      background: '#14161B',
      width: 120,
      height: 40,
    });

    const id = Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
    this.store.set(id, {
      text: captcha.text.toLowerCase(),
      expiresAt: Date.now() + this.TTL,
    });

    this.logger.log(`Captcha generated: ${id}`);
    return { id, svg: captcha.data };
  }

  verify(id: string, text: string): boolean {
    const entry = this.store.get(id);
    if (!entry) return false;

    // Delete after use (one-time)
    this.store.delete(id);

    if (Date.now() > entry.expiresAt) return false;
    return entry.text === text.toLowerCase().trim();
  }

  private cleanExpired() {
    const now = Date.now();
    for (const [key, entry] of this.store) {
      if (now > entry.expiresAt) this.store.delete(key);
    }
  }
}
