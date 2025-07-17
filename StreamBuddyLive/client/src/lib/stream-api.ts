import { apiRequest } from "./queryClient";

export interface FileUploadResponse {
  message: string;
  file: {
    filename: string;
    path: string;
    size: number;
    mimetype: string;
  };
}

export interface StreamStatus {
  isStreaming: boolean;
  connectionStatus: 'disconnected' | 'connecting' | 'connected';
  uploadSpeed: string;
  droppedFrames: number;
  viewerCount: number;
  duration: string;
}

export const streamApi = {
  uploadFile: async (file: File): Promise<FileUploadResponse> => {
    console.log('Starting upload for file:', file.name, 'size:', file.size, 'type:', file.type);
    
    const formData = new FormData();
    formData.append('video', file);
    
    try {
      const response = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });
      
      console.log('Upload response status:', response.status, response.statusText);
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('Upload error response:', errorText);
        let errorMessage = 'Upload failed';
        try {
          const errorJson = JSON.parse(errorText);
          errorMessage = errorJson.error || errorMessage;
        } catch {
          errorMessage = errorText || errorMessage;
        }
        throw new Error(errorMessage);
      }
      
      const result = await response.json();
      console.log('Upload successful:', result);
      return result;
    } catch (error) {
      console.error('Upload error:', error);
      throw error instanceof Error ? error : new Error('Network error during upload');
    }
  },

  startStream: async (streamId: number, filePath: string, loop: boolean = true, streamMode: 'desktop' | 'mobile' = 'desktop') => {
    const response = await apiRequest('POST', '/api/stream/start', {
      streamId,
      filePath,
      loop,
      streamMode
    });
    return response.json();
  },

  stopStream: async (streamId: number) => {
    const response = await apiRequest('POST', '/api/stream/stop', {
      streamId
    });
    return response.json();
  },

  getStreamStatus: async (): Promise<StreamStatus> => {
    const response = await apiRequest('GET', '/api/stream/status');
    return response.json();
  },

  testStreamKey: async (streamKey: string) => {
    const response = await apiRequest('POST', '/api/stream/test', { streamKey });
    return response.json();
  }
};
