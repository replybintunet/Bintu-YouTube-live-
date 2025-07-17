import { pgTable, text, serial, integer, boolean, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
});

export const streams = pgTable("streams", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id),
  title: text("title").notNull(),
  streamKey1: text("stream_key_1").notNull(),
  streamKey2: text("stream_key_2").notNull(),
  quality: text("quality").notNull().default("1080p"),
  status: text("status").notNull().default("offline"), // offline, connecting, live, stopping
  isActive: boolean("is_active").notNull().default(false),
  filePath: text("file_path"),
  fileName: text("file_name"),
  fileSize: integer("file_size"),
  duration: text("duration"),
  createdAt: timestamp("created_at").defaultNow(),
  startedAt: timestamp("started_at"),
  endedAt: timestamp("ended_at"),
});

export const streamStats = pgTable("stream_stats", {
  id: serial("id").primaryKey(),
  streamId: integer("stream_id").references(() => streams.id),
  viewerCount: integer("viewer_count").default(0),
  uploadSpeed: text("upload_speed").default("0"),
  droppedFrames: integer("dropped_frames").default(0),
  connectionStatus: text("connection_status").default("disconnected"),
  timestamp: timestamp("timestamp").defaultNow(),
});

export const activityLogs = pgTable("activity_logs", {
  id: serial("id").primaryKey(),
  streamId: integer("stream_id").references(() => streams.id),
  action: text("action").notNull(),
  message: text("message").notNull(),
  level: text("level").notNull().default("info"), // info, warning, error, success
  timestamp: timestamp("timestamp").defaultNow(),
});

// Zod insert schemas
export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
});

export const insertStreamSchema = createInsertSchema(streams).pick({
  title: true,
  streamKey1: true,
  streamKey2: true,
  quality: true,
});

export const insertStreamStatsSchema = createInsertSchema(streamStats).pick({
  streamId: true,
  viewerCount: true,
  uploadSpeed: true,
  droppedFrames: true,
  connectionStatus: true,
});

export const insertActivityLogSchema = createInsertSchema(activityLogs).pick({
  streamId: true,
  action: true,
  message: true,
  level: true,
});

// Type exports
export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;

export type InsertStream = z.infer<typeof insertStreamSchema>;
export type Stream = typeof streams.$inferSelect;

export type InsertStreamStats = z.infer<typeof insertStreamStatsSchema>;
export type StreamStats = typeof streamStats.$inferSelect;

export type InsertActivityLog = z.infer<typeof insertActivityLogSchema>;
export type ActivityLog = typeof activityLogs.$inferSelect;