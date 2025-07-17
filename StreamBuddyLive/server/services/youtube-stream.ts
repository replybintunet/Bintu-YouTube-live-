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
  private ffmpegProcess: ChildProcess | null = null;
  private streamStatus: StreamStatus = {
    isStreaming: false,
    connectionStatus: 'disconnected',
    uploadSpeed: '0 Mbps',
    droppedFrames: 0,
    viewerCount: 0,
    duration: '00:00:00'
  };
  private startTime: Date | null = null;
  private statusCallbacks: ((status: StreamStatus) => void)[] = [];

  constructor() {
    // Update duration every second while streaming
    setInterval(() => {
      if (this.streamStatus.isStreaming && this.startTime) {
        const elapsed = Date.now() - this.startTime.getTime();
        this.streamStatus.duration = this.formatDuration(elapsed);
        this.notifyStatusChange();
      }
    }, 1000);
  }

  async startStream(config: StreamConfig): Promise<boolean> {
    if (this.streamStatus.isStreaming) {
      throw new Error('Stream is already running');
    }

    try {
      // Validate input file exists
      await fs.access(config.inputFile);
      
      this.streamStatus.connectionStatus = 'connecting';
      this.notifyStatusChange();

      // YouTube Live RTMP endpoint
      const rtmpUrl = `rtmp://a.rtmp.youtube.com/live2/${config.streamKey}`;
      
      // FFmpeg command for streaming to YouTube Live
      const ffmpegArgs = [
        '-re', // Read input at native frame rate
      ];

      // Add loop if enabled
      if (config.loop) {
        ffmpegArgs.push('-stream_loop', '-1');
      }

      ffmpegArgs.push(
        '-i', config.inputFile,
        '-c:v', 'libx264', // Video codec
        '-preset', 'fast', // Encoding speed
        '-maxrate', this.getMaxRate(config.quality),
        '-bufsize', this.getBufSize(config.quality),
        '-vf', this.getVideoFilter(config.quality, config.streamMode || 'desktop'),
        '-c:a', 'aac', // Audio codec
        '-b:a', '128k', // Audio bitrate
        '-ar', '44100', // Audio sample rate
        '-f', 'flv', // Output format
        '-flvflags', 'no_duration_filesize',
        rtmpUrl
      );

      console.log('Starting FFmpeg with args:', ffmpegArgs.join(' '));
      this.ffmpegProcess = spawn('ffmpeg', ffmpegArgs);

      this.ffmpegProcess.on('error', (error) => {
        console.error('FFmpeg error:', error);
        this.stopStream();
      });

      this.ffmpegProcess.on('close', (code) => {
        console.log(`FFmpeg process exited with code ${code}`);
        this.stopStream();
      });

      // Parse FFmpeg output for statistics and errors
      this.ffmpegProcess.stderr?.on('data', (data) => {
        const output = data.toString();
        console.log('FFmpeg output:', output); // Debug logging
        this.parseFFmpegOutput(output);
        
        // Check for common errors
        if (output.includes('Connection refused') || 
            output.includes('404 Not Found') || 
            output.includes('403 Forbidden') ||
            output.includes('HTTP error') ||
            output.includes('No such file or directory')) {
          console.error('YouTube stream error:', output);
          this.stopStream();
        }
      });

      // Wait a bit to see if the process starts successfully
      await new Promise((resolve, reject) => {
        setTimeout(() => {
          if (this.ffmpegProcess && !this.ffmpegProcess.killed) {
            this.streamStatus.isStreaming = true;
            this.streamStatus.connectionStatus = 'connected';
            this.startTime = new Date();
            this.notifyStatusChange();
            resolve(true);
          } else {
            reject(new Error('Failed to start stream'));
          }
        }, 2000);
      });

      return true;
    } catch (error) {
      this.streamStatus.connectionStatus = 'disconnected';
      this.notifyStatusChange();
      throw error;
    }
  }

  stopStream(): void {
    if (this.ffmpegProcess) {
      this.ffmpegProcess.kill('SIGTERM');
      this.ffmpegProcess = null;
    }
    
    this.streamStatus.isStreaming = false;
    this.streamStatus.connectionStatus = 'disconnected';
    this.streamStatus.uploadSpeed = '0 Mbps';
    this.streamStatus.droppedFrames = 0;
    this.streamStatus.duration = '00:00:00';
    this.startTime = null;
    this.notifyStatusChange();
  }

  getStatus(): StreamStatus {
    return { ...this.streamStatus };
  }

  onStatusChange(callback: (status: StreamStatus) => void): void {
    this.statusCallbacks.push(callback);
  }

  private notifyStatusChange(): void {
    this.statusCallbacks.forEach(callback => callback(this.getStatus()));
  }

  private parseFFmpegOutput(output: string): void {
    // Parse upload speed
    const speedMatch = output.match(/speed=\s*([0-9.]+)x/);
    if (speedMatch) {
      const speed = parseFloat(speedMatch[1]);
      this.streamStatus.uploadSpeed = `${(speed * 2).toFixed(1)} Mbps`; // Rough estimate
    }

    // Parse dropped frames (look for errors or warnings)
    if (output.includes('drop') || output.includes('error')) {
      this.streamStatus.droppedFrames++;
    }

    this.notifyStatusChange();
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
    // Mobile mode uses portrait orientation (height > width)
    switch (quality) {
      case '1080p': return '1080:1920'; // Portrait 1080p
      case '720p': return '720:1280';   // Portrait 720p
      case '480p': return '480:854';    // Portrait 480p
      default: return '720:1280';
    }
  }

  private getVideoFilter(quality: string, streamMode: string): string {
    if (streamMode === 'mobile') {
      // Mobile mode - use portrait resolution for full screen mobile viewing
      const mobileRes = this.getMobileResolution(quality);
      return `scale=${mobileRes}:force_original_aspect_ratio=decrease,pad=${mobileRes}:(ow-iw)/2:(oh-ih)/2`;
    }
    
    // Desktop mode - standard landscape scaling
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
