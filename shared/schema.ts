import { sqliteTable, text, integer } from "drizzle-orm/sqlite-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Users table
export const users = sqliteTable("users", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
  displayName: text("display_name"),
  createdAt: text("created_at").notNull().default(""),
});

export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
}).extend({
  username: z.string().min(3, "Username must be at least 3 characters").max(30),
  password: z.string().min(6, "Password must be at least 6 characters"),
});

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;

// Tasks table
export const tasks = sqliteTable("tasks", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  userId: integer("user_id").notNull(),
  taskText: text("task_text").notNull(),
  category: text("category").default("general"),
  createdAt: text("created_at").notNull().default(""),
});

export const insertTaskSchema = createInsertSchema(tasks).pick({
  taskText: true,
  category: true,
});

export type InsertTask = z.infer<typeof insertTaskSchema>;
export type Task = typeof tasks.$inferSelect;

// Steps table
export const steps = sqliteTable("steps", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  taskId: integer("task_id").notNull(),
  stepNumber: integer("step_number").notNull(),
  stepText: text("step_text").notNull(),
  completed: integer("completed").notNull().default(0),
});

export const insertStepSchema = createInsertSchema(steps).pick({
  taskId: true,
  stepNumber: true,
  stepText: true,
});

export type InsertStep = z.infer<typeof insertStepSchema>;
export type Step = typeof steps.$inferSelect;

// API request/response types
export const breakdownRequestSchema = z.object({
  task: z.string().min(1).max(500),
  category: z.string().optional(),
});

export type TaskWithSteps = Task & { steps: Step[] };
