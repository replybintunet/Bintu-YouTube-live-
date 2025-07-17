import { streams, streamStats, activityLogs, users, type User, type InsertUser, type Stream, type InsertStream, type StreamStats, type InsertStreamStats, type ActivityLog, type InsertActivityLog } from "@shared/schema";

export interface IStorage {
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  
  // Stream management
  createStream(stream: InsertStream & { userId?: number }): Promise<Stream>;
  getStream(id: number): Promise<Stream | undefined>;
  getActiveStream(): Promise<Stream | undefined>;
  updateStream(id: number, updates: Partial<Stream>): Promise<Stream | undefined>;
  deleteStream(id: number): Promise<boolean>;
  
  // Stream stats
  createStreamStats(stats: InsertStreamStats): Promise<StreamStats>;
  getLatestStreamStats(streamId: number): Promise<StreamStats | undefined>;
  
  // Activity logs
  createActivityLog(log: InsertActivityLog): Promise<ActivityLog>;
  getActivityLogs(streamId?: number, limit?: number): Promise<ActivityLog[]>;
}

export class MemStorage implements IStorage {
  private users: Map<number, User>;
  private streams: Map<number, Stream>;
  private streamStats: Map<number, StreamStats>;
  private activityLogs: Map<number, ActivityLog>;
  private currentUserId: number;
  private currentStreamId: number;
  private currentStatsId: number;
  private currentLogId: number;

  constructor() {
    this.users = new Map();
    this.streams = new Map();
    this.streamStats = new Map();
    this.activityLogs = new Map();
    this.currentUserId = 1;
    this.currentStreamId = 1;
    this.currentStatsId = 1;
    this.currentLogId = 1;
  }

  async getUser(id: number): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.username === username,
    );
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = this.currentUserId++;
    const user: User = { ...insertUser, id };
    this.users.set(id, user);
    return user;
  }

  async createStream(streamData: InsertStream & { userId?: number }): Promise<Stream> {
    const id = this.currentStreamId++;
    const stream: Stream = {
      id,
      userId: streamData.userId || null,
      title: streamData.title,
      streamKey: streamData.streamKey,
      quality: streamData.quality || "720p",
      status: "offline",
      isActive: false,
      filePath: null,
      fileName: null,
      fileSize: null,
      duration: null,
      createdAt: new Date(),
      startedAt: null,
      endedAt: null,
    };
    this.streams.set(id, stream);
    return stream;
  }

  async getStream(id: number): Promise<Stream | undefined> {
    return this.streams.get(id);
  }

  async getActiveStream(): Promise<Stream | undefined> {
    return Array.from(this.streams.values()).find(stream => stream.isActive);
  }

  async updateStream(id: number, updates: Partial<Stream>): Promise<Stream | undefined> {
    const stream = this.streams.get(id);
    if (!stream) return undefined;
    
    const updatedStream = { ...stream, ...updates };
    this.streams.set(id, updatedStream);
    return updatedStream;
  }

  async deleteStream(id: number): Promise<boolean> {
    return this.streams.delete(id);
  }

  async createStreamStats(statsData: InsertStreamStats): Promise<StreamStats> {
    const id = this.currentStatsId++;
    const stats: StreamStats = {
      id,
      streamId: statsData.streamId ?? 0,
      viewerCount: statsData.viewerCount ?? 0,
      uploadSpeed: statsData.uploadSpeed || "0",
      droppedFrames: statsData.droppedFrames || 0,
      connectionStatus: statsData.connectionStatus || "disconnected",
      timestamp: new Date(),
    };
    this.streamStats.set(id, stats);
    return stats;
  }

  async getLatestStreamStats(streamId: number): Promise<StreamStats | undefined> {
    const stats = Array.from(this.streamStats.values())
      .filter(stat => stat.streamId === streamId)
      .sort((a, b) => b.timestamp!.getTime() - a.timestamp!.getTime());
    return stats[0];
  }

  async createActivityLog(logData: InsertActivityLog): Promise<ActivityLog> {
    const id = this.currentLogId++;
    const log: ActivityLog = {
      id,
      streamId: logData.streamId ?? null,
      action: logData.action,
      message: logData.message,
      level: logData.level || "info",
      timestamp: new Date(),
    };
    this.activityLogs.set(id, log);
    return log;
  }

  async getActivityLogs(streamId?: number, limit = 50): Promise<ActivityLog[]> {
    let logs = Array.from(this.activityLogs.values());
    
    if (streamId) {
      logs = logs.filter(log => log.streamId === streamId);
    }
    
    return logs
      .sort((a, b) => b.timestamp!.getTime() - a.timestamp!.getTime())
      .slice(0, limit);
  }
}

export const storage = new MemStorage();
