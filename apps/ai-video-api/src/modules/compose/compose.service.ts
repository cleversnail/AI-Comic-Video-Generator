import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { execFile } from 'child_process';
import { promisify } from 'util';
import { tmpdir } from 'os';
import { join } from 'path';
import { mkdir, writeFile, readFile, rm } from 'fs/promises';
import { randomUUID } from 'crypto';
import { PrismaService } from '../../prisma/prisma.service';
import { StorageService } from '../storage/storage.service';
import { ConfigService } from '@nestjs/config';

export interface ComposeInput {
  projectId: string;
  shots: Array<{
    imageUrl?: string;
    videoUrl?: string;
    audioUrl?: string;
    duration: number;
    subtitle?: string;
  }>;
  outputFormat?: 'mp4' | 'mov';
  resolution?: '1080p' | '720p';
}

const execFileAsync = promisify(execFile);

@Injectable()
export class ComposeService {
  private readonly logger = new Logger(ComposeService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly storageService: StorageService,
    private readonly configService: ConfigService,
  ) {}

  async composeProject(userId: string, projectId: string) {
    const project = await this.prisma.project.findFirst({
      where: { id: projectId, userId },
      include: { shots: { orderBy: { sequence: 'asc' } } },
    });

    if (!project) throw new BadRequestException('项目不存在');

    const shots = project.shots
      .filter((s) => s.resultUrl && s.status !== 'archived')
      .map((shot) => ({
        imageUrl: shot.resultUrl || undefined,
        videoUrl: (shot.params as any)?.videoUrl || undefined,
        audioUrl: (shot.params as any)?.audioUrl || undefined,
        duration: shot.duration || 3000,
        subtitle: ((shot.params as any)?.subtitle || (shot.params as any)?.title || '') as string,
      }));

    if (shots.length === 0) {
      throw new BadRequestException('项目没有已生成的分镜画面，无法合成');
    }

    this.logger.log(`Composing project ${projectId} with ${shots.length} shots`);

    await this.ensureFfmpeg();

    const workDir = join(tmpdir(), `compose-${projectId}-${randomUUID()}`);
    await mkdir(workDir, { recursive: true });

    try {
      // Download / normalize each shot into a concat-compatible clip
      const clipPaths: string[] = [];
      for (let i = 0; i < shots.length; i++) {
        const clipPath = join(workDir, `clip_${String(i).padStart(3, '0')}.mp4`);
        await this.buildClip(shots[i], clipPath);
        clipPaths.push(clipPath);
      }

      // Concatenate clips
      const concatListPath = join(workDir, 'concat.txt');
      const concatContent = clipPaths
        .map((p) => `file '${p.replace(/'/g, "'\\''")}'`)
        .join('\n');
      await writeFile(concatListPath, concatContent, 'utf8');

      const mergedPath = join(workDir, 'merged.mp4');
      await execFileAsync('ffmpeg', [
        '-y', '-f', 'concat', '-safe', '0',
        '-i', concatListPath,
        '-c', 'copy',
        mergedPath,
      ]);

      // Burn subtitles if any shot has a subtitle
      let finalPath = mergedPath;
      if (shots.some((s) => s.subtitle)) {
        const srtPath = await this.buildSrt(shots, workDir);
        finalPath = join(workDir, 'final.mp4');
        await execFileAsync('ffmpeg', [
          '-y', '-i', mergedPath,
          '-vf', `subtitles='${srtPath.replace(/'/g, "\\'")}'`,
          '-c:a', 'copy',
          finalPath,
        ]);
      }

      // Upload result to MinIO
      const buffer = await readFile(finalPath);
      const storageKey = this.storageService.generateKey(projectId, 'compose').replace(/\.png$/, '.mp4');
      const videoUrl = await this.storageService.uploadBuffer(storageKey, buffer, 'video/mp4');

      await this.prisma.project.update({
        where: { id: projectId },
        data: { status: 'composed' },
      });

      this.logger.log(`Compose complete for project ${projectId}: ${videoUrl}`);

      return {
        data: {
          projectId,
          shots: shots.length,
          totalDuration: shots.reduce((sum, s) => sum + s.duration, 0),
          status: 'completed',
          videoUrl,
        },
      };
    } finally {
      await rm(workDir, { recursive: true, force: true }).catch(() => {});
    }
  }

  private async ensureFfmpeg(): Promise<void> {
    try {
      await execFileAsync('ffmpeg', ['-version']);
    } catch {
      throw new BadRequestException('FFmpeg 未安装或不在 PATH 中，无法执行视频合成');
    }
  }

  private async buildClip(
    shot: { imageUrl?: string; videoUrl?: string; audioUrl?: string; duration: number },
    outputPath: string,
  ): Promise<void> {
    const durationSec = Math.max(0.5, shot.duration / 1000);

    if (shot.videoUrl) {
      // Re-encode existing video clip for concat compatibility
      await execFileAsync('ffmpeg', [
        '-y', '-i', shot.videoUrl,
        '-t', String(durationSec),
        '-c:v', 'libx264', '-preset', 'fast', '-crf', '23',
        '-c:a', 'aac', '-b:a', '128k',
        '-r', '30',
        '-vf', 'scale=trunc(iw/2)*2:trunc(ih/2)*2',
        outputPath,
      ]);
    } else if (shot.imageUrl) {
      // Create a video from a static image, with optional audio track
      const args = ['-y', '-loop', '1', '-i', shot.imageUrl];
      if (shot.audioUrl) {
        args.push('-i', shot.audioUrl);
      }
      args.push(
        '-t', String(durationSec),
        '-c:v', 'libx264', '-preset', 'fast', '-crf', '23',
        '-r', '30',
        '-vf', 'scale=trunc(iw/2)*2:trunc(ih/2)*2,format=yuv420p',
      );
      if (shot.audioUrl) {
        args.push('-c:a', 'aac', '-b:a', '128k', '-shortest');
      } else {
        args.push('-c:a', 'aac', '-b:a', '128k');
      }
      args.push(outputPath);
      await execFileAsync('ffmpeg', args);
    } else {
      throw new BadRequestException('分镜缺少画面或视频素材');
    }
  }

  private async buildSrt(
    shots: Array<{ duration: number; subtitle?: string }>,
    workDir: string,
  ): Promise<string> {
    const srtPath = join(workDir, 'subtitles.srt');
    let srt = '';
    let index = 1;
    let currentTime = 0;

    for (const shot of shots) {
      if (!shot.subtitle) {
        currentTime += shot.duration;
        continue;
      }
      srt += `${index}\n${this.formatSrtTime(currentTime)} --> ${this.formatSrtTime(currentTime + shot.duration)}\n${shot.subtitle}\n\n`;
      index++;
      currentTime += shot.duration;
    }

    await writeFile(srtPath, srt, 'utf8');
    return srtPath;
  }

  private formatSrtTime(ms: number): string {
    const totalSeconds = Math.floor(ms / 1000);
    const milliseconds = ms % 1000;
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;
    return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')},${String(milliseconds).padStart(3, '0')}`;
  }
}
