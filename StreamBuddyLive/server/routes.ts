import type { Express, Request, Response, NextFunction } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { YouTubeStreamService } from "./services/youtube-stream";
import multer from "multer";
import path from "path";
import fs from "fs/promises";
import { insertStreamSchema, insertActivityLogSchema } from "@shared/schema";
import { existsSync, mkdirSync } from 'fs';

const streamService = new YouTubeStreamService();

// Configure multer for temporary file uploads (files will be deleted after streaming)
const upload = multer({
  dest: 'uploads/',
  limits: {
    fileSize: 1024 * 1024 * 1024, // 1GB limit
  },
  fileFilter: (req: any, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
    console.log('File upload attempt:', file.originalname, 'mimetype:', file.mimetype);
    if (file.mimetype === 'video/mp4' || file.mimetype === 'video/mpeg' || file.originalname?.toLowerCase().endsWith('.mp4')) {
      cb(null, true);
    } else {
      cb(new Error('Only MP4 files are allowed'));
    }
  }
});

// Ensure uploads directory exists
if (!existsSync('uploads')) {
  mkdirSync('uploads');
}

export async function registerRoutes(app: Express): Promise<Server> {
  // Test stream key endpoint
  app.post("/api/stream/test", async (req: Request, res: Response) => {
    try {
      const { streamKey } = req.body;
      
      if (!streamKey || streamKey.length < 10) {
        return res.status(400).json({ 
          error: "Invalid stream key format. YouTube stream keys are usually 20+ characters long." 
        });
      }

      // Validate stream key format (YouTube stream keys are typically alphanumeric with dashes)
      const streamKeyRegex = /^[a-zA-Z0-9_-]{16,}$/;
      if (!streamKeyRegex.test(streamKey)) {
        return res.status(400).json({ 
          error: "Invalid stream key format. Stream keys should contain only letters, numbers, underscores, and dashes." 
        });
      }

      res.json({ 
        message: "Stream key format appears valid. Ready to stream!",
        valid: true 
      });
    } catch (error) {
      res.status(500).json({ error: error instanceof Error ? error.message : 'Unknown error' });
    }
  });

  // Stream configuration endpoints
  app.post("/api/streams", async (req: Request, res: Response) => {
    try {
      const streamData = insertStreamSchema.parse(req.body);
      const stream = await storage.createStream(streamData);
      
      await storage.createActivityLog({
        streamId: stream.id,
        action: "stream_created",
        message: `Stream "${stream.title}" created`,
        level: "info"
      });
      
      res.json(stream);
    } catch (error) {
      res.status(400).json({ error: error instanceof Error ? error.message : 'Unknown error' });
    }
  });

  app.get("/api/streams/active", async (req: Request, res: Response) => {
    try {
      const stream = await storage.getActiveStream();
      res.json(stream);
    } catch (error) {
      res.status(500).json({ error: error instanceof Error ? error.message : 'Unknown error' });
    }
  });

  app.patch("/api/streams/:id", async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      const updates = req.body;
      const stream = await storage.updateStream(id, updates);
      
      if (!stream) {
        return res.status(404).json({ error: "Stream not found" });
      }
      
      res.json(stream);
    } catch (error) {
      res.status(400).json({ error: error instanceof Error ? error.message : 'Unknown error' });
    }
  });

  // File upload endpoint
  app.post("/api/upload", upload.single('video'), async (req: Request, res: Response) => {
    try {
      const multerReq = req as Request & { file?: Express.Multer.File };
      if (!multerReq.file) {
        return res.status(400).json({ error: "No file uploaded" });
      }

      const fileInfo = {
        filename: multerReq.file.originalname,
        path: multerReq.file.path,
        size: multerReq.file.size,
        mimetype: multerReq.file.mimetype
      };

      res.json({
        message: "File uploaded successfully",
        file: fileInfo
      });
    } catch (error) {
      res.status(500).json({ error: error instanceof Error ? error.message : 'Unknown error' });
    }
  });

  // Stream control endpoints
  app.post("/api/stream/start", async (req: Request, res: Response) => {
    try {
      const { streamId, filePath, loop = true, streamMode = 'desktop' } = req.body;
      
      const stream = await storage.getStream(streamId);
      if (!stream) {
        return res.status(404).json({ error: "Stream not found" });
      }

      // Validate stream key format
      if (!stream.streamKey || stream.streamKey.length < 10) {
        return res.status(400).json({ 
          error: "Invalid stream key. Please enter a valid YouTube stream key from YouTube Studio." 
        });
      }

      // Check if file exists
      try {
        await fs.access(filePath);
      } catch {
        return res.status(400).json({ 
          error: "Video file not found. Please upload a video file first." 
        });
      }

      // Stop any existing stream first and clean up old files
      streamService.stopStream();
      
      // Clean up any old uploaded files (keep only current one)
      try {
        const files = await fs.readdir('uploads/');
        for (const file of files) {
          const fullPath = path.join('uploads/', file);
          if (fullPath !== filePath) {
            try {
              await fs.unlink(fullPath);
            } catch (error) {
              // Ignore errors for files that don't exist
            }
          }
        }
      } catch (error) {
        // Ignore if uploads directory doesn't exist
      }

      await streamService.startStream({
        streamKey: stream.streamKey,
        quality: stream.quality,
        inputFile: filePath,
        title: stream.title,
        loop,
        streamMode
      });

      await storage.updateStream(streamId, {
        status: "live",
        isActive: true,
        startedAt: new Date(),
        filePath: filePath
      });

      await storage.createActivityLog({
        streamId: streamId,
        action: "stream_started",
        message: `Live stream started with ${streamMode} mode ${loop ? '(looping)' : '(single play)'}`,
        level: "success"
      });

      res.json({ message: "Stream started successfully" });
    } catch (error) {
      const streamId = req.body?.streamId || 0;
      await storage.createActivityLog({
        streamId: streamId,
        action: "stream_error",
        message: `Failed to start stream: ${error instanceof Error ? error.message : 'Unknown error'}`,
        level: "error"
      });
      res.status(500).json({ error: error instanceof Error ? error.message : 'Failed to start stream' });
    }
  });

  app.post("/api/stream/stop", async (req: Request, res: Response) => {
    try {
      const { streamId } = req.body;
      
      // Get stream info to find the file path
      const stream = await storage.getStream(streamId);
      const filePath = stream?.filePath;
      
      streamService.stopStream();
      
      // Delete the uploaded video file after streaming stops
      if (filePath) {
        try {
          await fs.unlink(filePath);
          await storage.createActivityLog({
            streamId: streamId,
            action: "file_deleted",
            message: "Uploaded video file deleted after streaming",
            level: "info"
          });
        } catch (error) {
          console.log('File already deleted or not found:', filePath);
        }
      }
      
      await storage.updateStream(streamId, {
        status: "offline",
        isActive: false,
        endedAt: new Date(),
        filePath: null // Clear file path since file is deleted
      });

      await storage.createActivityLog({
        streamId: streamId,
        action: "stream_stopped",
        message: "Stream stopped and video file removed",
        level: "info"
      });

      res.json({ message: "Stream stopped successfully" });
    } catch (error) {
      res.status(500).json({ error: error instanceof Error ? error.message : 'Unknown error' });
    }
  });

  // Stream status endpoint
  app.get("/api/stream/status", async (req: Request, res: Response) => {
    try {
      const status = streamService.getStatus();
      res.json(status);
    } catch (error) {
      res.status(500).json({ error: error instanceof Error ? error.message : 'Unknown error' });
    }
  });

  // Activity logs endpoint
  app.get("/api/activity-logs", async (req: Request, res: Response) => {
    try {
      const streamId = req.query.streamId ? parseInt(req.query.streamId as string) : undefined;
      const limit = req.query.limit ? parseInt(req.query.limit as string) : 50;
      
      const logs = await storage.getActivityLogs(streamId, limit);
      res.json(logs);
    } catch (error) {
      res.status(500).json({ error: error instanceof Error ? error.message : 'Unknown error' });
    }
  });

  // Stream statistics endpoint
  app.get("/api/stream/:id/stats", async (req: Request, res: Response) => {
    try {
      const streamId = parseInt(req.params.id);
      const stats = await storage.getLatestStreamStats(streamId);
      res.json(stats);
    } catch (error) {
      res.status(500).json({ error: error instanceof Error ? error.message : 'Unknown error' });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}