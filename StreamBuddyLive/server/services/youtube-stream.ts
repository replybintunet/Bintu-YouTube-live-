import { spawn, ChildProcess } from 'child_process';
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
  duration: string;
}

export class YouTubeStreamService {
  private processes: Map<number, ChildProcess> = new Map();
  private statuses: Map<number, StreamStatus> = new Map();
  private startTimes: Map<number, Date> = new Map();

  constructor() {
    // Update durations every second
    setInterval(() => {
      for (const [streamId, startTime] of this.startTimes) {
        const elapsed = Date.now() - startTime.getTime();
        const status = this.statuses.get(streamId);
        if (status?.isStreaming) {
          status.duration = this.formatDuration(elapsed);
        }
      }
    }, 1000);
  }

  async startStream(config: StreamConfig, streamId: number) {
    if (this.processes.has(streamId)) {
      throw new Error(`Stream ${streamId} is already running`);
    }

    // Validate input file exists
    await fs.access(config.inputFile);

    const status: StreamStatus = {
      isStreaming: false,
      connectionStatus: 'connecting',
      uploadSpeed: '0 Mbps',
      droppedFrames: 0,
      duration: '00:00:00'
    };
    this.statuses.set(streamId, status);

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

    const process = spawn('ffmpeg', ffmpegArgs);

    this.processes.set(streamId, process);
    this.startTimes.set(streamId, new Date());

    process.stderr?.on('data', (data) => {
      const output = data.toString();
      this.parseFFmpegOutput(output, streamId);

      if (
        output.includes('Connection refused') ||
        output.includes('404 Not Found') ||
        output.includes('403 Forbidden') ||
        output.includes('HTTP error') ||
        output.includes('No such file or directory')
      ) {
        this.stopStream(streamId);
      }
    });

    process.on('close', () => {
      this.processes.delete(streamId);
      this.startTimes.delete(streamId);
      const st = this.statuses.get(streamId);
      if (st) {
        st.isStreaming = false;
        st.connectionStatus = 'disconnected';
      }
    });

    // Wait to confirm process is running
    await new Promise<void>((resolve, reject) => {
      setTimeout(() => {
        if (!process.killed) {
          status.isStreaming = true;
          status.connectionStatus = 'connected';
          resolve();
        } else {
          reject(new Error('Failed to start stream'));
        }
      }, 2000);
    });
  }

  stopStream(streamId: number) {
    const process = this.processes.get(streamId);
    if (process) {
      process.kill('SIGTERM');
      this.processes.delete(streamId);
    }

    const st = this.statuses.get(streamId);
    if (st) {
      st.isStreaming = false;
      st.connectionStatus = 'disconnected';
      st.uploadSpeed = '0 Mbps';
      st.droppedFrames = 0;
      st.duration = '00:00:00';
    }

    this.startTimes.delete(streamId);
  }

  getStatus(streamId: number): StreamStatus | null {
    return this.statuses.get(streamId) || null;
  }

  private parseFFmpegOutput(output: string, streamId: number) {
    const st = this.statuses.get(streamId);
    if (!st) return;

    const speedMatch = output.match(/speed=\s*([0-9.]+)x/);
    if (speedMatch) {
      const speed = parseFloat(speedMatch[1]);
      st.uploadSpeed = `${(speed * 2).toFixed(1)} Mbps`;
    }

    if (output.includes('drop') || output.includes('error')) {
      st.droppedFrames++;
    }
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

    const res = this.getResolution(quality);
    return `scale=${res}:force_original_aspect_ratio=decrease,pad=${res}:(ow-iw)/2:(oh-ih)/2`;
  }

  private formatDuration(ms: number): string {
    const seconds = Math.floor(ms / 1000);
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return `${hours.toString().padStart(2, '0')}:${minutes
      .toString()
      .padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }
}