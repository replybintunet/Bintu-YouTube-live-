import type { Express, Request, Response } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { YouTubeStreamService } from "./services/youtube-stream";
import multer from "multer";
import path from "path";
import fs from "fs/promises";
import { insertStreamSchema } from "@shared/schema";
import { existsSync, mkdirSync } from 'fs';

const streamService = new YouTubeStreamService();

// Configure multer
const upload = multer({
  dest: 'uploads/',
  limits: { fileSize: 1024 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (
      file.mimetype === 'video/mp4' ||
      file.mimetype === 'video/mpeg' ||
      file.originalname?.toLowerCase().endsWith('.mp4')
    ) {
      cb(null, true);
    } else {
      cb(new Error('Only MP4 files are allowed'));
    }
  }
});

// Ensure uploads dir
if (!existsSync('uploads')) mkdirSync('uploads');

export async function registerRoutes(app: Express): Promise<Server> {
  app.post("/api/stream/test", async (req, res) => {
    const { streamKey } = req.body;
    if (!streamKey || streamKey.length < 10) {
      return res.status(400).json({ error: "Invalid stream key format." });
    }
    const streamKeyRegex = /^[a-zA-Z0-9_-]{16,}$/;
    if (!streamKeyRegex.test(streamKey)) {
      return res.status(400).json({ error: "Invalid stream key format." });
    }
    res.json({ message: "Valid stream key.", valid: true });
  });

  app.post("/api/streams", async (req, res) => {
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
    } catch (err) {
      res.status(400).json({ error: err instanceof Error ? err.message : 'Unknown error' });
    }
  });

  app.get("/api/streams/active", async (req, res) => {
    const stream = await storage.getActiveStream();
    res.json(stream);
  });

  app.patch("/api/streams/:id", async (req, res) => {
    const id = parseInt(req.params.id);
    const updates = req.body;
    const stream = await storage.updateStream(id, updates);
    if (!stream) return res.status(404).json({ error: "Stream not found" });
    res.json(stream);
  });

  app.post("/api/upload", upload.single('video'), (req, res) => {
    const multerReq = req as Request & { file?: Express.Multer.File };
    if (!multerReq.file) {
      return res.status(400).json({ error: "No file uploaded" });
    }
    res.json({
      message: "File uploaded successfully",
      file: {
        filename: multerReq.file.originalname,
        path: multerReq.file.path,
        size: multerReq.file.size,
        mimetype: multerReq.file.mimetype
      }
    });
  });

  app.post("/api/stream/start", async (req, res) => {
    const { streamId, filePath, loop = true, streamMode = 'desktop' } = req.body;

    const stream = await storage.getStream(streamId);
    if (!stream) {
      return res.status(404).json({ error: "Stream not found" });
    }

    if (!stream.streamKey || stream.streamKey.length < 10) {
      return res.status(400).json({ error: "Invalid stream key." });
    }

    try {
      await fs.access(filePath);
    } catch {
      return res.status(400).json({ error: "Video file not found." });
    }

    // Clean up old uploads
    const files = await fs.readdir('uploads/');
    for (const file of files) {
      const fullPath = path.join('uploads/', file);
      if (fullPath !== filePath) {
        try { await fs.unlink(fullPath); } catch {}
      }
    }

    await streamService.startStream({
      streamKey: stream.streamKey,
      quality: stream.quality,
      inputFile: filePath,
      title: stream.title,
      loop,
      streamMode
    }, streamId);

    await storage.updateStream(streamId, {
      status: "live",
      isActive: true,
      startedAt: new Date(),
      filePath
    });

    await storage.createActivityLog({
      streamId,
      action: "stream_started",
      message: `Live stream started with ${streamMode} mode ${loop ? '(looping)' : '(single play)'}`,
      level: "success"
    });

    res.json({ message: "Stream started successfully" });
  });

  app.post("/api/stream/stop", async (req, res) => {
    const { streamId } = req.body;

    const stream = await storage.getStream(streamId);
    const filePath = stream?.filePath;

    streamService.stopStream(streamId);

    if (filePath) {
      try {
        await fs.unlink(filePath);
        await storage.createActivityLog({
          streamId,
          action: "file_deleted",
          message: "Uploaded video file deleted",
          level: "info"
        });
      } catch {
        console.log('File already deleted or not found:', filePath);
      }
    }

    await storage.updateStream(streamId, {
      status: "offline",
      isActive: false,
      endedAt: new Date(),
      filePath: null
    });

    await storage.createActivityLog({
      streamId,
      action: "stream_stopped",
      message: "Stream stopped and video file removed",
      level: "info"
    });

    res.json({ message: "Stream stopped successfully" });
  });

  app.get("/api/stream/:id/status", (req, res) => {
    const streamId = parseInt(req.params.id);
    const status = streamService.getStatus(streamId);
    if (!status) {
      return res.status(404).json({ error: "Stream not running" });
    }
    res.json(status);
  });

  app.get("/api/activity-logs", async (req, res) => {
    const streamId = req.query.streamId ? parseInt(req.query.streamId as string) : undefined;
    const limit = req.query.limit ? parseInt(req.query.limit as string) : 50;
    const logs = await storage.getActivityLogs(streamId, limit);
    res.json(logs);
  });

  app.get("/api/stream/:id/stats", async (req, res) => {
    const streamId = parseInt(req.params.id);
    const stats = await storage.getLatestStreamStats(streamId);
    res.json(stats);
  });

  const httpServer = createServer(app);
  return httpServer;
}