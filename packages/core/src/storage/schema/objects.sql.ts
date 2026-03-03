import { sqliteTable, text, integer, real, index } from "drizzle-orm/sqlite-core";
import type { SQLiteTableExtraConfig } from "drizzle-orm/sqlite-core";

export const objects = sqliteTable("objects", {
  id: text("id").primaryKey(),
  type: text("type").notNull(),
  name: text("name").notNull(),
  description: text("description"),
  properties: text("properties"),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull(),
  updatedAt: integer("updated_at", { mode: "timestamp" }).notNull(),
  expiresAt: integer("expires_at", { mode: "timestamp" }),
}, (table) => [
  index("idx_objects_type").on(table.type),
  index("idx_objects_name").on(table.name),
  index("idx_objects_created_at").on(table.createdAt),
] as any);

export const links = sqliteTable("links", {
  id: text("id").primaryKey(),
  sourceId: text("source_id").notNull().references(() => objects.id, { onDelete: "cascade" }),
  targetId: text("target_id").notNull().references(() => objects.id, { onDelete: "cascade" }),
  relationType: text("relation_type").notNull(),
  weight: real("weight").default(1.0),
  properties: text("properties"),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull(),
}, (table) => [
  index("idx_links_source_id").on(table.sourceId),
  index("idx_links_target_id").on(table.targetId),
  index("idx_links_relation_type").on(table.relationType),
] as any);

export const actions = sqliteTable("actions", {
  id: text("id").primaryKey(),
  objectId: text("object_id").references(() => objects.id, { onDelete: "cascade" }),
  type: text("type").notNull(),
  actor: text("actor").notNull(),
  target: text("target"),
  input: text("input"),
  output: text("output"),
  status: text("status").notNull().default("pending"),
  error: text("error"),
  startedAt: integer("started_at", { mode: "timestamp" }),
  completedAt: integer("completed_at", { mode: "timestamp" }),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull(),
}, (table) => [
  index("idx_actions_object_id").on(table.objectId),
  index("idx_actions_type").on(table.type),
  index("idx_actions_actor").on(table.actor),
  index("idx_actions_status").on(table.status),
  index("idx_actions_created_at").on(table.createdAt),
] as any);

export const sessions = sqliteTable("sessions", {
  id: text("id").primaryKey(),
  agentId: text("agent_id").notNull(),
  userId: text("user_id"),
  status: text("status").notNull().default("active"),
  metadata: text("metadata"),
  messageCount: integer("message_count").notNull().default(0),
  tokenCount: integer("token_count"),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull(),
  updatedAt: integer("updated_at", { mode: "timestamp" }).notNull(),
  expiresAt: integer("expires_at", { mode: "timestamp" }),
}, (table) => [
  index("idx_sessions_agent_id").on(table.agentId),
  index("idx_sessions_user_id").on(table.userId),
  index("idx_sessions_status").on(table.status),
  index("idx_sessions_created_at").on(table.createdAt),
] as any);

export const messages = sqliteTable("messages", {
  id: text("id").primaryKey(),
  sessionId: text("session_id").notNull().references(() => sessions.id, { onDelete: "cascade" }),
  role: text("role").notNull(),
  content: text("content").notNull(),
  name: text("name"),
  toolCallId: text("tool_call_id"),
  toolName: text("tool_name"),
  tokenCount: integer("token_count"),
  metadata: text("metadata"),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull(),
}, (table) => [
  index("idx_messages_session_id").on(table.sessionId),
  index("idx_messages_role").on(table.role),
  index("idx_messages_created_at").on(table.createdAt),
] as any);

export const memoryVectors = sqliteTable("memory_vectors", {
  id: text("id").primaryKey(),
  sessionId: text("session_id"),
  objectId: text("object_id").references(() => objects.id, { onDelete: "cascade" }),
  content: text("content").notNull(),
  embedding: text("embedding").notNull(),
  model: text("model").notNull(),
  score: real("score"),
  metadata: text("metadata"),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull(),
  accessedAt: integer("accessed_at", { mode: "timestamp" }),
  accessCount: integer("access_count").notNull().default(0),
}, (table) => [
  index("idx_memory_vectors_session_id").on(table.sessionId),
  index("idx_memory_vectors_object_id").on(table.objectId),
  index("idx_memory_vectors_created_at").on(table.createdAt),
] as any);

export const scheduledTasks = sqliteTable("scheduled_tasks", {
  id: text("id").primaryKey(),
  type: text("type").notNull(),
  payload: text("payload").notNull(),
  scheduleAt: integer("schedule_at", { mode: "timestamp" }).notNull(),
  status: text("status").notNull().default("pending"),
  scheduledBy: text("scheduled_by"),
  result: text("result"),
  error: text("error"),
  attempts: integer("attempts").notNull().default(0),
  maxAttempts: integer("max_attempts").notNull().default(3),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull(),
  startedAt: integer("started_at", { mode: "timestamp" }),
  completedAt: integer("completed_at", { mode: "timestamp" }),
}, (table) => [
  index("idx_scheduled_tasks_type").on(table.type),
  index("idx_scheduled_tasks_status").on(table.status),
  index("idx_scheduled_tasks_schedule_at").on(table.scheduleAt),
] as any);

export type ObjectRow = typeof objects.$inferSelect;
export type LinkRow = typeof links.$inferSelect;
export type ActionRow = typeof actions.$inferSelect;
export type SessionRow = typeof sessions.$inferSelect;
export type MessageRow = typeof messages.$inferSelect;
export type MemoryVectorRow = typeof memoryVectors.$inferSelect;
export type ScheduledTaskRow = typeof scheduledTasks.$inferSelect;

export type NewObjectRow = typeof objects.$inferInsert;
export type NewLinkRow = typeof links.$inferInsert;
export type NewActionRow = typeof actions.$inferInsert;
export type NewSessionRow = typeof sessions.$inferInsert;
export type NewMessageRow = typeof messages.$inferInsert;
export type NewMemoryVectorRow = typeof memoryVectors.$inferInsert;
export type NewScheduledTaskRow = typeof scheduledTasks.$inferInsert;
