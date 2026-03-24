import {
  type User,
  type InsertUser,
  type Task,
  type InsertTask,
  type Step,
  type InsertStep,
  type TaskWithSteps,
  users,
  tasks,
  steps,
} from "@shared/schema";
import { drizzle } from "drizzle-orm/better-sqlite3";
import Database from "better-sqlite3";
import { eq, desc, and } from "drizzle-orm";

const sqlite = new Database("data.db");
sqlite.pragma("journal_mode = WAL");

export const db = drizzle(sqlite);

export interface IStorage {
  // Users
  getUser(id: number): User | undefined;
  getUserByUsername(username: string): User | undefined;
  createUser(user: InsertUser): User;

  // Tasks
  createTask(userId: number, taskText: string, category?: string): Task;
  getTasksByUser(userId: number): TaskWithSteps[];
  getTask(taskId: number, userId: number): TaskWithSteps | undefined;
  deleteTask(taskId: number, userId: number): void;

  // Steps
  createSteps(taskId: number, stepTexts: string[]): Step[];
  toggleStep(stepId: number, userId: number): Step | undefined;

  // Stats
  getUserStats(userId: number): { totalTasks: number; completedTasks: number; totalSteps: number; completedSteps: number };
}

export class DatabaseStorage implements IStorage {
  getUser(id: number): User | undefined {
    return db.select().from(users).where(eq(users.id, id)).get();
  }

  getUserByUsername(username: string): User | undefined {
    return db.select().from(users).where(eq(users.username, username)).get();
  }

  createUser(insertUser: InsertUser): User {
    return db
      .insert(users)
      .values({
        ...insertUser,
        createdAt: new Date().toISOString(),
      })
      .returning()
      .get();
  }

  createTask(userId: number, taskText: string, category?: string): Task {
    return db
      .insert(tasks)
      .values({
        userId,
        taskText,
        category: category || "general",
        createdAt: new Date().toISOString(),
      })
      .returning()
      .get();
  }

  getTasksByUser(userId: number): TaskWithSteps[] {
    const userTasks = db
      .select()
      .from(tasks)
      .where(eq(tasks.userId, userId))
      .orderBy(desc(tasks.createdAt))
      .all();

    return userTasks.map((task) => {
      const taskSteps = db
        .select()
        .from(steps)
        .where(eq(steps.taskId, task.id))
        .all();
      return { ...task, steps: taskSteps };
    });
  }

  getTask(taskId: number, userId: number): TaskWithSteps | undefined {
    const task = db
      .select()
      .from(tasks)
      .where(and(eq(tasks.id, taskId), eq(tasks.userId, userId)))
      .get();

    if (!task) return undefined;

    const taskSteps = db
      .select()
      .from(steps)
      .where(eq(steps.taskId, task.id))
      .all();

    return { ...task, steps: taskSteps };
  }

  deleteTask(taskId: number, userId: number): void {
    const task = db
      .select()
      .from(tasks)
      .where(and(eq(tasks.id, taskId), eq(tasks.userId, userId)))
      .get();

    if (task) {
      db.delete(steps).where(eq(steps.taskId, taskId)).run();
      db.delete(tasks).where(eq(tasks.id, taskId)).run();
    }
  }

  createSteps(taskId: number, stepTexts: string[]): Step[] {
    return stepTexts.map((text, index) =>
      db
        .insert(steps)
        .values({
          taskId,
          stepNumber: index + 1,
          stepText: text,
        })
        .returning()
        .get()
    );
  }

  toggleStep(stepId: number, userId: number): Step | undefined {
    const step = db.select().from(steps).where(eq(steps.id, stepId)).get();
    if (!step) return undefined;

    // Verify ownership
    const task = db
      .select()
      .from(tasks)
      .where(and(eq(tasks.id, step.taskId), eq(tasks.userId, userId)))
      .get();
    if (!task) return undefined;

    const newCompleted = step.completed === 1 ? 0 : 1;
    db.update(steps)
      .set({ completed: newCompleted })
      .where(eq(steps.id, stepId))
      .run();

    return { ...step, completed: newCompleted };
  }

  getUserStats(userId: number): {
    totalTasks: number;
    completedTasks: number;
    totalSteps: number;
    completedSteps: number;
  } {
    const userTasks = db
      .select()
      .from(tasks)
      .where(eq(tasks.userId, userId))
      .all();

    let totalSteps = 0;
    let completedSteps = 0;
    let completedTasks = 0;

    for (const task of userTasks) {
      const taskSteps = db
        .select()
        .from(steps)
        .where(eq(steps.taskId, task.id))
        .all();

      totalSteps += taskSteps.length;
      const doneSteps = taskSteps.filter((s) => s.completed === 1).length;
      completedSteps += doneSteps;

      if (taskSteps.length > 0 && doneSteps === taskSteps.length) {
        completedTasks++;
      }
    }

    return {
      totalTasks: userTasks.length,
      completedTasks,
      totalSteps,
      completedSteps,
    };
  }
}

export const storage = new DatabaseStorage();
