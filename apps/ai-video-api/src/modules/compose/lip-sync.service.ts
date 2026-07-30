import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

/**
 * Viseme（视觉音素）定义
 * 参考 Oculus Viseme 标准
 */
export enum Viseme {
  SIL = 0,   // 静音
  PP = 1,    // p, b, m
  FF = 2,    // f, v
  TH = 3,    // th (as in "think")
  DD = 4,    // t, d
  kk = 5,    // k, g
  CH = 6,    // ch, j, sh
  SS = 7,    // s, z
  nn = 8,    // n, l
  RR = 9,    // r
  aa = 10,   // a (as in "father")
  E = 11,    // e (as in "bed")
  ih = 12,   // i (as in "bit")
  oh = 13,   // o (as in "boat")
  ou = 14,   // u (as in "boot")
}

export interface VisemeFrame {
  time: number;      // 时间戳（毫秒）
  viseme: Viseme;    // 视觉音素
  weight: number;    // 权重 0-1
}

export interface LipSyncTrack {
  duration: number;           // 总时长（毫秒）
  frames: VisemeFrame[];      // viseme 帧序列
  metadata: {
    language: string;
    model: string;
    generatedAt: string;
  };
}

export interface LipSyncConfig {
  /** 语言 */
  language?: 'zh' | 'en' | 'ja';
  /** 嘴部动画强度 */
  intensity?: number;  // 0-1
  /** 平滑度 */
  smoothness?: number;  // 0-1
  /** 是否自动校正漂移 */
  autoCorrectDrift?: boolean;
}

@Injectable()
export class LipSyncService {
  private readonly logger = new Logger(LipSyncService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * 从文本生成 viseme 轨道（基于规则的方法）
   */
  generateVisemeFromText(text: string, duration: number, config: LipSyncConfig = {}): LipSyncTrack {
    const { language = 'zh', intensity = 0.8, smoothness = 0.5 } = config;
    const frames: VisemeFrame[] = [];

    // 简单的文本到 viseme 映射（基于规则）
    const charDuration = duration / text.length;

    for (let i = 0; i < text.length; i++) {
      const char = text[i];
      const time = i * charDuration;
      const viseme = this.charToViseme(char, language);
      const weight = this.calculateWeight(char, intensity);

      frames.push({ time, viseme, weight });

      // 添加过渡帧
      if (smoothness > 0 && i < text.length - 1) {
        const nextViseme = this.charToViseme(text[i + 1], language);
        const transitionTime = time + charDuration * 0.5;
        const transitionWeight = weight * (1 - smoothness);
        frames.push({ time: transitionTime, viseme: nextViseme, weight: transitionWeight });
      }
    }

    // 添加结束静音帧
    frames.push({ time: duration, viseme: Viseme.SIL, weight: 0 });

    return {
      duration,
      frames,
      metadata: {
        language,
        model: 'rule-based',
        generatedAt: new Date().toISOString(),
      },
    };
  }

  /**
   * 字符到 viseme 的映射
   */
  private charToViseme(char: string, language: string): Viseme {
    if (language === 'zh') {
      // 中文拼音到 viseme 的近似映射
      const pinyinMap: Record<string, Viseme> = {
        'b': Viseme.PP, 'p': Viseme.PP, 'm': Viseme.PP,
        'f': Viseme.FF, 'v': Viseme.FF,
        'd': Viseme.DD, 't': Viseme.DD,
        'g': Viseme.kk, 'k': Viseme.kk, 'h': Viseme.kk,
        'j': Viseme.CH, 'q': Viseme.CH, 'x': Viseme.CH,
        'z': Viseme.SS, 'c': Viseme.SS, 's': Viseme.SS,
        'zh': Viseme.CH, 'ch': Viseme.CH, 'sh': Viseme.CH, 'r': Viseme.RR,
        'n': Viseme.nn, 'l': Viseme.nn,
        'a': Viseme.aa, 'o': Viseme.oh, 'e': Viseme.E,
        'i': Viseme.ih, 'u': Viseme.ou, 'ü': Viseme.ou,
      };

      // 简化处理：根据汉字 Unicode 范围估算
      const code = char.charCodeAt(0);
      if (code >= 0x4e00 && code <= 0x9fff) {
        // 汉字 - 根据笔画数估算元音
        const strokes = this.estimateStrokes(char);
        if (strokes <= 4) return Viseme.aa;
        if (strokes <= 8) return Viseme.E;
        if (strokes <= 12) return Viseme.ih;
        return Viseme.oh;
      }

      // 标点符号
      if ('，。！？、；：'.includes(char)) return Viseme.SIL;
      if ('aeiouü'.includes(char.toLowerCase())) return Viseme.aa;

      return Viseme.SIL;
    }

    // 英文
    const lower = char.toLowerCase();
    if ('aeiou'.includes(lower)) {
      const vowelMap: Record<string, Viseme> = {
        'a': Viseme.aa, 'e': Viseme.E, 'i': Viseme.ih, 'o': Viseme.oh, 'u': Viseme.ou,
      };
      return vowelMap[lower] || Viseme.aa;
    }

    if ('bmp'.includes(lower)) return Viseme.PP;
    if ('fv'.includes(lower)) return Viseme.FF;
    if ('td'.includes(lower)) return Viseme.DD;
    if ('kg'.includes(lower)) return Viseme.kk;
    if ('cszj'.includes(lower)) return Viseme.CH;
    if ('nrl'.includes(lower)) return Viseme.nn;

    return Viseme.SIL;
  }

  /**
   * 计算嘴部动画权重
   */
  private calculateWeight(char: string, intensity: number): number {
    // 元音权重更高
    const vowels = 'aeiouüAEIOU';
    if (vowels.includes(char)) return 0.8 * intensity;
    if (char === ' ') return 0;
    if ('，。！？'.includes(char)) return 0;
    return 0.5 * intensity;
  }

  /**
   * 估算汉字笔画数（简化版）
   */
  private estimateStrokes(char: string): number {
    const code = char.charCodeAt(0);
    // 基于 Unicode 编码的简单估算
    return (code % 20) + 1;
  }

  /**
   * 校正 viseme 轨道漂移
   */
  correctDrift(track: LipSyncTrack, audioDuration: number): LipSyncTrack {
    if (track.duration === audioDuration) return track;

    const ratio = audioDuration / track.duration;
    const correctedFrames = track.frames.map((frame) => ({
      ...frame,
      time: frame.time * ratio,
    }));

    return {
      ...track,
      duration: audioDuration,
      frames: correctedFrames,
    };
  }

  /**
   * 平滑 viseme 轨道
   */
  smoothTrack(track: LipSyncTrack, windowSize: number = 3): LipSyncTrack {
    if (track.frames.length <= windowSize) return track;

    const smoothedFrames: VisemeFrame[] = [];

    for (let i = 0; i < track.frames.length; i++) {
      const start = Math.max(0, i - Math.floor(windowSize / 2));
      const end = Math.min(track.frames.length, i + Math.ceil(windowSize / 2));
      const window = track.frames.slice(start, end);

      // 计算加权平均
      const totalWeight = window.reduce((sum, f) => sum + f.weight, 0);
      const avgWeight = totalWeight / window.length;

      // 取权重最高的 viseme
      const dominantFrame = window.reduce((max, f) => f.weight > max.weight ? f : max, window[0]);

      smoothedFrames.push({
        time: track.frames[i].time,
        viseme: dominantFrame.viseme,
        weight: avgWeight,
      });
    }

    return {
      ...track,
      frames: smoothedFrames,
    };
  }

  /**
   * 合并 viseme 轨道到视频参数
   */
  mergeToVideoParams(track: LipSyncTrack): any {
    return {
      lipSync: {
        enabled: true,
        duration: track.duration,
        frames: track.frames.map((f) => ({
          t: Math.round(f.time),
          v: f.viseme,
          w: Math.round(f.weight * 100) / 100,
        })),
      },
    };
  }

  /**
   * 从 Shot 的台词生成 lip sync 轨道
   */
  async generateForShot(shotId: string, config?: LipSyncConfig): Promise<LipSyncTrack | null> {
    const shot = await this.prisma.shot.findUnique({
      where: { id: shotId },
    });

    if (!shot) return null;

    const params = shot.params as any;
    const dialogue = params?.dialogue || params?.narration || params?.subtitle;

    if (!dialogue) return null;

    const duration = shot.duration || 3000;
    let track = this.generateVisemeFromText(dialogue, duration, config);

    // 平滑处理
    if (config?.smoothness && config.smoothness > 0) {
      track = this.smoothTrack(track);
    }

    return track;
  }
}
