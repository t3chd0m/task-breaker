import type { Express, Request, Response, NextFunction } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import {
  insertUserSchema,
  breakdownRequestSchema,
} from "@shared/schema";
import session from "express-session";
import createMemoryStore from "memorystore";
import passport from "passport";
import { Strategy as LocalStrategy } from "passport-local";
import crypto from "crypto";

const MemoryStore = createMemoryStore(session);

// Simple password hashing (no bcrypt dependency needed)
function hashPassword(password: string, salt?: string): { hash: string; salt: string } {
  const s = salt || crypto.randomBytes(16).toString("hex");
  const hash = crypto.pbkdf2Sync(password, s, 1000, 64, "sha512").toString("hex");
  return { hash, salt: s };
}

function verifyPassword(password: string, stored: string): boolean {
  const [salt, hash] = stored.split(":");
  const result = hashPassword(password, salt);
  return result.hash === hash;
}

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  // Session setup
  app.use(
    session({
      secret: process.env.SESSION_SECRET || "task-breaker-secret-key-2026",
      resave: false,
      saveUninitialized: false,
      store: new MemoryStore({ checkPeriod: 86400000 }),
      cookie: {
        maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
        secure: false,
        sameSite: "lax",
      },
    })
  );

  app.use(passport.initialize());
  app.use(passport.session());

  // Passport local strategy
  passport.use(
    new LocalStrategy(async (username, password, done) => {
      try {
        const user = storage.getUserByUsername(username.toLowerCase());
        if (!user) return done(null, false, { message: "Invalid username or password" });
        if (!verifyPassword(password, user.password)) {
          return done(null, false, { message: "Invalid username or password" });
        }
        return done(null, user);
      } catch (err) {
        return done(err);
      }
    })
  );

  passport.serializeUser((user: any, done) => done(null, user.id));
  passport.deserializeUser((id: number, done) => {
    try {
      const user = storage.getUser(id);
      done(null, user || false);
    } catch (err) {
      done(err);
    }
  });

  // Auth middleware
  function requireAuth(req: Request, res: Response, next: NextFunction) {
    if (req.isAuthenticated()) return next();
    res.status(401).json({ message: "Not authenticated" });
  }

  // ==========================================
  // AUTH ROUTES
  // ==========================================
  app.post("/api/auth/register", async (req, res) => {
    try {
      const parsed = insertUserSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ message: parsed.error.issues[0].message });
      }

      const { username, password } = parsed.data;
      const existing = storage.getUserByUsername(username.toLowerCase());
      if (existing) {
        return res.status(409).json({ message: "Username already taken" });
      }

      const { hash, salt } = hashPassword(password);
      const user = storage.createUser({
        username: username.toLowerCase(),
        password: `${salt}:${hash}`,
      });

      req.login(user, (err) => {
        if (err) return res.status(500).json({ message: "Login failed" });
        return res.json({
          id: user.id,
          username: user.username,
          displayName: user.displayName,
        });
      });
    } catch (err) {
      res.status(500).json({ message: "Registration failed" });
    }
  });

  app.post("/api/auth/login", (req, res, next) => {
    passport.authenticate("local", (err: any, user: any, info: any) => {
      if (err) return next(err);
      if (!user) return res.status(401).json({ message: info?.message || "Login failed" });
      req.login(user, (err) => {
        if (err) return next(err);
        return res.json({
          id: user.id,
          username: user.username,
          displayName: user.displayName,
        });
      });
    })(req, res, next);
  });

  app.post("/api/auth/logout", (req, res) => {
    req.logout((err) => {
      if (err) return res.status(500).json({ message: "Logout failed" });
      res.json({ message: "Logged out" });
    });
  });

  app.get("/api/auth/me", (req, res) => {
    if (req.isAuthenticated()) {
      const user = req.user as any;
      return res.json({
        id: user.id,
        username: user.username,
        displayName: user.displayName,
      });
    }
    res.status(401).json({ message: "Not authenticated" });
  });

  // ==========================================
  // TASK BREAKDOWN (AI Proxy)
  // ==========================================
  app.post("/api/tasks/breakdown", requireAuth, async (req, res) => {
    try {
      const parsed = breakdownRequestSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ message: "Invalid request" });
      }

      const { task, category } = parsed.data;
      const user = req.user as any;

      // Call the existing Replit AI endpoint
      const aiResponse = await fetch(
        "https://task-decomposer--ptvpk5syv8.replit.app/api/tasks/breakdown",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ task }),
        }
      );

      if (!aiResponse.ok) {
        return res.status(502).json({ message: "AI service unavailable" });
      }

      const aiData = await aiResponse.json();
      if (!aiData.steps || !Array.isArray(aiData.steps)) {
        return res.status(502).json({ message: "Invalid AI response" });
      }

      // Save to database
      const savedTask = storage.createTask(user.id, task, category);
      const savedSteps = storage.createSteps(savedTask.id, aiData.steps);

      res.json({
        task: savedTask,
        steps: savedSteps,
      });
    } catch (err) {
      console.error("Breakdown error:", err);
      res.status(500).json({ message: "Failed to break down task" });
    }
  });

  // ==========================================
  // TASK CRUD
  // ==========================================
  app.get("/api/tasks", requireAuth, (req, res) => {
    const user = req.user as any;
    const userTasks = storage.getTasksByUser(user.id);
    res.json(userTasks);
  });

  app.get("/api/tasks/:id", requireAuth, (req, res) => {
    const user = req.user as any;
    const task = storage.getTask(parseInt(req.params.id), user.id);
    if (!task) return res.status(404).json({ message: "Task not found" });
    res.json(task);
  });

  app.delete("/api/tasks/:id", requireAuth, (req, res) => {
    const user = req.user as any;
    storage.deleteTask(parseInt(req.params.id), user.id);
    res.json({ message: "Deleted" });
  });

  // ==========================================
  // STEP TOGGLE
  // ==========================================
  app.post("/api/steps/:id/toggle", requireAuth, (req, res) => {
    const user = req.user as any;
    const step = storage.toggleStep(parseInt(req.params.id), user.id);
    if (!step) return res.status(404).json({ message: "Step not found" });
    res.json(step);
  });

  // ==========================================
  // USER STATS
  // ==========================================
  app.get("/api/stats", requireAuth, (req, res) => {
    const user = req.user as any;
    const stats = storage.getUserStats(user.id);
    res.json(stats);
  });

  return httpServer;
}
