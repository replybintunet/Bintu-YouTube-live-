import { spawn, ChildProcess } from 'child_process';
import path from 'path';
import fs from 'fs/promises';

export interface StreamConfig {
  streamKey: string;
  quality: string;
  inputFile: string;
  title?: string;
  loop?: boolean;
  streamMode?: 'desktop' | 'mobile';
}

export interface StreamStatus {
  isStreaming: boolean;
  connectionStatus: 'disconnected' | 'connecting' | 'connected';
  uploadSpeed: string;
  droppedFrames: number;
  viewerCount: number;
  duration: string;
}

export class YouTubeStreamService {
  private processes = new Map<number, ChildProcess>();
  private statuses = new Map<number, StreamStatus>();
  private startTimes = new Map<number, Date>();
  private statusCallbacks: ((streamId: number, status: StreamStatus) => void)[] = [];

  constructor() {
    // Update durations every second
    setInterval(() => {
      const now = Date.now();
      for (const [streamId, startTime] of this.startTimes.entries()) {
        const status = this.statuses.get(streamId);
        if (status?.isStreaming) {
          status.duration = this.formatDuration(now - startTime.getTime());
          this.notifyStatusChange(streamId, status);
        }
      }
    }, 1000);
  }

  async startStream(config: StreamConfig, streamId: number): Promise<boolean> {
    if (this.processes.has(streamId)) {
      throw new Error(`Stream ${streamId} is already running`);
    }

    // Validate input file exists
    await fs.access(config.inputFile);

    const initialStatus: StreamStatus = {
      isStreaming: false,
      connectionStatus: 'connecting',
      uploadSpeed: '0 Mbps',
      droppedFrames: 0,
      viewerCount: 0,
      duration: '00:00:00'
    };
    this.statuses.set(streamId, initialStatus);
    this.notifyStatusChange(streamId, initialStatus);

    const rtmpUrl = `rtmp://a.rtmp.youtube.com/live2/${config.streamKey}`;

    const ffmpegArgs = ['-re'];
    if (config.loop) {
      ffmpegArgs.push('-stream_loop', '-1');
    }
    ffmpegArgs.push(
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

    console.log(`Starting FFmpeg for stream ${streamId} with args:`, ffmpegArgs.join(' '));
    const ffmpeg = spawn('ffmpeg', ffmpegArgs);

    this.processes.set(streamId, ffmpeg);

    ffmpeg.on('error', (error) => {
      console.error(`FFmpeg error on stream ${streamId}:`, error);
      this.stopStream(streamId);
    });

    ffmpeg.on('close', (code) => {
      console.log(`FFmpeg process for stream ${streamId} exited with code ${code}`);
      this.stopStream(streamId);
    });

    ffmpeg.stderr?.on('data', (data) => {
      const output = data.toString();
      this.parseFFmpegOutput(streamId, output);
      if (
        output.includes('Connection refused') ||
        output.includes('404 Not Found') ||
        output.includes('403 Forbidden') ||
        output.includes('HTTP error') ||
        output.includes('No such file or directory')
      ) {
        console.error(`Stream ${streamId} error:`, output);
        this.stopStream(streamId);
      }
    });

    // Wait briefly
    await new Promise<void>((resolve, reject) => {
      setTimeout(() => {
        const proc = this.processes.get(streamId);
        if (proc && !proc.killed) {
          const status = this.statuses.get(streamId);
          if (status) {
            status.isStreaming = true;
            status.connectionStatus = 'connected';
            this.startTimes.set(streamId, new Date());
            this.notifyStatusChange(streamId, status);
          }
          resolve();
        } else {
          reject(new Error(`Failed to start stream ${streamId}`));
        }
      }, 2000);
    });

    return true;
  }

  stopStream(streamId: number): void {
    const proc = this.processes.get(streamId);
    if (proc) {
      proc.kill('SIGTERM');
      this.processes.delete(streamId);
    }
    this.startTimes.delete(streamId);

    const status = this.statuses.get(streamId);
    if (status) {
      status.isStreaming = false;
      status.connectionStatus = 'disconnected';
      status.uploadSpeed = '0 Mbps';
      status.droppedFrames = 0;
      status.duration = '00:00:00';
      this.notifyStatusChange(streamId, status);
      this.statuses.delete(streamId);
    }
  }

  getStatus(streamId: number): StreamStatus | undefined {
    const status = this.statuses.get(streamId);
    return status ? { ...status } : undefined;
  }

  onStatusChange(callback: (streamId: number, status: StreamStatus) => void): void {
    this.statusCallbacks.push(callback);
  }

  private notifyStatusChange(streamId: number, status: StreamStatus): void {
    for (const cb of this.statusCallbacks) {
      cb(streamId, { ...status });
    }
  }

  private parseFFmpegOutput(streamId: number, output: string): void {
    const status = this.statuses.get(streamId);
    if (!status) return;

    const speedMatch = output.match(/speed=\s*([0-9.]+)x/);
    if (speedMatch) {
      const speed = parseFloat(speedMatch[1]);
      status.uploadSpeed = `${(speed * 2).toFixed(1)} Mbps`;
    }

    if (output.includes('drop') || output.includes('error')) {
      status.droppedFrames++;
    }

    this.notifyStatusChange(streamId, status);
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
    if (streamMode === 'mobile') {
      const mobileRes = this.getMobileResolution(quality);
      return `scale=${mobileRes}:force_original_aspect_ratio=decrease,pad=${mobileRes}:(ow-iw)/2:(oh-ih)/2`;
    }
    const resolution = this.getResolution(quality);
    return `scale=${resolution}:force_original_aspect_ratio=decrease,pad=${resolution}:(ow-iw)/2:(oh-ih)/2`;
  }

  private formatDuration(ms: number): string {
    const seconds = Math.floor(ms / 1000);
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }
}