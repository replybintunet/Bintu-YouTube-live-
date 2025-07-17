import { spawn, ChildProcess } from 'child_process';
import fs from 'fs/promises';

export interface StreamConfig {
  streamId: number;  // 👈 required to uniquely identify each stream
  streamKey: string;
  quality: string;
  inputFile: string;
  title?: string;
  loop?: boolean;
  streamMode?: 'desktop' | 'mobile';
}

export class YouTubeStreamService {
  private processes: Map<number, ChildProcess> = new Map();

  async startStream(config: StreamConfig): Promise<void> {
    if (this.processes.has(config.streamId)) {
      throw new Error(`Stream ${config.streamId} is already running`);
    }

    await fs.access(config.inputFile); // check file exists

    const rtmpUrl = `rtmp://a.rtmp.youtube.com/live2/${config.streamKey}`;

    const args: string[] = [
      '-re',
    ];

    if (config.loop) {
      args.push('-stream_loop', '-1');
    }

    args.push(
      '-i', config.inputFile,
      '-c:v', 'libx264',
      '-preset', 'fast',
      '-maxrate', this.getMaxRate(config.quality),
      '-bufsize', this.getBufSize(config.quality),
      '-vf', this.getVideoFilter(config.quality, config.streamMode || 'desktop'),
      '-c:a', 'aac',
      '-b:a', '128k',
      '-ar', '44100',
      '-f', 'flv',
      '-flvflags', 'no_duration_filesize',
      rtmpUrl
    );

    console.log(`Starting stream ${config.streamId} with ffmpeg: ffmpeg ${args.join(' ')}`);

    const proc = spawn('ffmpeg', args);

    proc.stderr?.on('data', (data) => {
      console.log(`[Stream ${config.streamId}] ${data.toString()}`);
    });

    proc.on('close', (code) => {
      console.log(`Stream ${config.streamId} ended with code ${code}`);
      this.processes.delete(config.streamId);
    });

    this.processes.set(config.streamId, proc);
  }

  stopStream(streamId: number): void {
    const proc = this.processes.get(streamId);
    if (proc) {
      proc.kill('SIGTERM');
      this.processes.delete(streamId);
      console.log(`Stopped stream ${streamId}`);
    } else {
      throw new Error(`Stream ${streamId} is not running`);
    }
  }

  stopAll(): void {
    for (const streamId of this.processes.keys()) {
      this.stopStream(streamId);
    }
  }

  getActiveStreams(): number[] {
    return Array.from(this.processes.keys());
  }

  private getMaxRate(quality: string): string {
    switch (quality) {
      case '1080p': return '6000k';
      case '720p': return '3000k';
      case '480p': return '1500k';
      default: return '3000k';
    }
  }

  private getBufSize(quality: string): string {
    switch (quality) {
      case '1080p': return '12000k';
      case '720p': return '6000k';
      case '480p': return '3000k';
      default: return '6000k';
    }
  }

  private getResolution(quality: string): string {
    switch (quality) {
      case '1080p': return '1920:1080';
      case '720p': return '1280:720';
      case '480p': return '854:480';
      default: return '1280:720';
    }
  }

  private getMobileResolution(quality: string): string {
    switch (quality) {
      case '1080p': return '1080:1920';
      case '720p': return '720:1280';
      case '480p': return '480:854';
      default: return '720:1280';
    }
  }

  private getVideoFilter(quality: string, streamMode: string): string {
    const resolution = streamMode === 'mobile'
      ? this.getMobileResolution(quality)
      : this.getResolution(quality);
    return `scale=${resolution}:force_original_aspect_ratio=decrease,pad=${resolution}:(ow-iw)/2:(oh-ih)/2`;
  }
}