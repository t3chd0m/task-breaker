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

// ==========================================
// AI CALL (OpenAI or Anthropic if key provided)
// ==========================================
async function callAI(task: string, apiKey: string): Promise<string[]> {
  const isAnthropic = !!process.env.ANTHROPIC_API_KEY;
  const prompt = `Break this task into 4-7 simple, actionable steps. Each step should be one clear sentence a person can act on immediately. Return ONLY a JSON array of strings, nothing else.\n\nTask: "${task}"`;

  if (isAnthropic) {
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-3-haiku-20240307",
        max_tokens: 500,
        messages: [{ role: "user", content: prompt }],
      }),
    });
    const data = await res.json() as any;
    const text = data.content?.[0]?.text || "";
    return JSON.parse(text);
  } else {
    const res = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [{ role: "user", content: prompt }],
        max_tokens: 500,
      }),
    });
    const data = await res.json() as any;
    const text = data.choices?.[0]?.message?.content || "";
    return JSON.parse(text);
  }
}

// ==========================================
// SMART BREAKDOWN (no API key needed)
// ==========================================
function smartBreakdown(task: string): string[] {
  const lower = task.toLowerCase().trim();
  const parts: string[] = [];

  // Split on conjunctions: "and", "then", "also", ",", "&"
  const segments = lower
    .split(/\s*(?:,\s*(?:and|then)?|\band\b|\bthen\b|\balso\b|&)\s*/)
    .map((s) => s.trim())
    .filter((s) => s.length > 2);

  // If the user gave multiple sub-tasks, break each one down
  if (segments.length > 1) {
    for (const seg of segments) {
      const sub = breakSingleTask(seg);
      parts.push(...sub);
    }
  } else {
    parts.push(...breakSingleTask(lower));
  }

  // Capitalize first letter of each step
  return parts.map((s) => s.charAt(0).toUpperCase() + s.slice(1));
}

function breakSingleTask(task: string): string[] {
  // Pattern library: common tasks and their breakdowns
  const patterns: { match: RegExp; steps: string[] }[] = [
    {
      match: /clean|tidy|organiz|declutter|straighten/,
      steps: [
        `Gather all supplies you'll need (trash bags, cleaning spray, cloth).`,
        `Clear everything off surfaces and put items in a temporary pile.`,
        `Throw away any trash or items you no longer need.`,
        `Put remaining items back in their proper places.`,
        `Wipe down all surfaces with cleaning spray.`,
        `Do a final walkthrough to make sure everything looks good.`,
      ],
    },
    {
      match: /cook|meal|dinner|lunch|breakfast|recipe/,
      steps: [
        `Decide what you want to make and find the recipe.`,
        `Check that you have all the ingredients.`,
        `Prep ingredients: wash, chop, and measure everything.`,
        `Cook following the recipe steps.`,
        `Plate the food and sit down to enjoy it.`,
        `Clean up the kitchen and put leftovers away.`,
      ],
    },
    {
      match: /laundry|wash clothes|washing/,
      steps: [
        `Sort clothes into lights, darks, and delicates.`,
        `Load the first batch into the washing machine with detergent.`,
        `Start the wash cycle on the right setting.`,
        `Move washed clothes to the dryer or hang them up.`,
        `Fold or hang dried clothes promptly to avoid wrinkles.`,
        `Put all clean clothes away in drawers or closets.`,
      ],
    },
    {
      match: /dishes|wash dishes|kitchen/,
      steps: [
        `Clear the sink and stack all dirty dishes nearby.`,
        `Fill the sink with hot soapy water (or load the dishwasher).`,
        `Wash glasses and cups first, then plates, then pots.`,
        `Rinse everything thoroughly with clean water.`,
        `Dry dishes with a towel or let them air dry on a rack.`,
        `Put all clean dishes away in their cabinets.`,
      ],
    },
    {
      match: /shower|bath|hygiene|groom/,
      steps: [
        `Gather your towel, clean clothes, and toiletries.`,
        `Adjust the water to a comfortable temperature.`,
        `Wash your hair with shampoo and rinse.`,
        `Wash your body with soap, starting from top to bottom.`,
        `Rinse off completely and turn off the water.`,
        `Dry off, get dressed, and put away your things.`,
      ],
    },
    {
      match: /grocery|shopping|shop|buy|store/,
      steps: [
        `Check what you already have at home.`,
        `Make a list of everything you need to buy.`,
        `Organize the list by store section (produce, dairy, etc.).`,
        `Go to the store and work through your list.`,
        `Check out and bag your items.`,
        `Put everything away at home in the right places.`,
      ],
    },
    {
      match: /study|homework|assignment|exam|test|learn/,
      steps: [
        `Gather your materials (notes, textbook, laptop).`,
        `Find a quiet, distraction-free spot to work.`,
        `Review the key topics or assignment requirements.`,
        `Work through the material in focused 25-minute blocks.`,
        `Take a short break between each block.`,
        `Review what you've learned and note any questions.`,
      ],
    },
    {
      match: /exercise|workout|gym|run|jog|yoga|stretch/,
      steps: [
        `Put on comfortable workout clothes and shoes.`,
        `Do a 5-minute warm-up to get your body ready.`,
        `Complete your main workout or exercise routine.`,
        `Cool down with light stretching for 5 minutes.`,
        `Hydrate and have a healthy snack if needed.`,
        `Shower and change into fresh clothes.`,
      ],
    },
    {
      match: /email|reply|respond|message|write|send/,
      steps: [
        `Open the email or message you need to respond to.`,
        `Read through it carefully and note the key points.`,
        `Draft your response, addressing each point.`,
        `Review your draft for tone and clarity.`,
        `Send the message.`,
      ],
    },
    {
      match: /move|pack|relocat|moving/,
      steps: [
        `Make a list of everything that needs to be packed.`,
        `Gather packing supplies (boxes, tape, markers, bubble wrap).`,
        `Pack room by room, labeling each box clearly.`,
        `Set aside essentials you'll need on moving day.`,
        `Load boxes into the vehicle, heaviest on the bottom.`,
        `Unload at the new location and unpack essentials first.`,
      ],
    },
    {
      match: /plan|prepar|organiz.*event|party|trip|travel|vacation/,
      steps: [
        `Decide on the date, time, and budget.`,
        `Make a list of everything you need to arrange.`,
        `Research options and make bookings or reservations.`,
        `Create a checklist of items to bring or buy.`,
        `Confirm all details the day before.`,
        `Enjoy the event and take photos!`,
      ],
    },
    {
      match: /budget|financ|money|bills|pay/,
      steps: [
        `List all your income sources for the month.`,
        `List all your fixed expenses (rent, bills, subscriptions).`,
        `Estimate your variable expenses (food, gas, entertainment).`,
        `Subtract expenses from income to see what's left.`,
        `Set aside savings before spending on extras.`,
        `Track your spending throughout the month.`,
      ],
    },
  ];

  // Try to match a pattern
  for (const pattern of patterns) {
    if (pattern.match.test(task)) {
      // Customize steps by inserting the task name
      return pattern.steps;
    }
  }

  // Generic fallback for any task
  const taskName = task.endsWith(".") ? task.slice(0, -1) : task;
  return [
    `Figure out exactly what "${taskName}" involves.`,
    `List everything you need to get started.`,
    `Set up your workspace or gather your materials.`,
    `Start with the first and most important part.`,
    `Work through the remaining parts one at a time.`,
    `Review your work and make sure nothing was missed.`,
    `Clean up and wrap things up.`,
  ];
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
      console.error("Registration error:", err);
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
  // TASK BREAKDOWN (AI-powered)
  // ==========================================
  app.post("/api/tasks/breakdown", requireAuth, async (req, res) => {
    try {
      const parsed = breakdownRequestSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ message: "Invalid request" });
      }

      const { task, category } = parsed.data;
      const user = req.user as any;

      let steps: string[] = [];

      // Try AI provider if API key is configured
      const apiKey = process.env.OPENAI_API_KEY || process.env.ANTHROPIC_API_KEY;
      if (apiKey) {
        try {
          steps = await callAI(task, apiKey);
        } catch (aiErr) {
          console.error("AI call failed, using built-in breakdown:", aiErr);
          steps = smartBreakdown(task);
        }
      } else {
        // No API key — use built-in smart breakdown
        steps = smartBreakdown(task);
      }

      if (!steps.length) {
        steps = smartBreakdown(task);
      }

      // Save to database
      const savedTask = storage.createTask(user.id, task, category);
      const savedSteps = storage.createSteps(savedTask.id, steps);

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
