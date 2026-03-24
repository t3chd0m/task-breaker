import { useState, useEffect, useCallback, useMemo } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { ArrowRight, Copy, RotateCcw, Check, CheckCircle2, Circle } from "lucide-react";
import type { TaskWithSteps, Step } from "@shared/schema";

const CATEGORIES = [
  { label: "Home", emoji: "🏠", value: "home" },
  { label: "Work", emoji: "💼", value: "work" },
  { label: "Self-Care", emoji: "🧘", value: "self-care" },
  { label: "Learning", emoji: "📚", value: "learning" },
  { label: "Shopping", emoji: "🛒", value: "shopping" },
];

type AppState = "input" | "loading" | "results";

function ConfettiPiece({ index }: { index: number }) {
  const colors = ["#E8553D", "#4ECDC4", "#FFD93D", "#6C5CE7", "#A8E6CF"];
  const color = colors[index % colors.length];
  const left = Math.random() * 100;
  const delay = Math.random() * 2;
  const size = 6 + Math.random() * 6;

  return (
    <div
      className="fixed top-0 pointer-events-none animate-confetti"
      style={{
        left: `${left}%`,
        animationDelay: `${delay}s`,
        width: size,
        height: size,
        backgroundColor: color,
        borderRadius: Math.random() > 0.5 ? "50%" : "2px",
        zIndex: 100,
      }}
    />
  );
}

export default function HomePage() {
  const { toast } = useToast();

  const [appState, setAppState] = useState<AppState>("input");
  const [taskText, setTaskText] = useState("");
  const [category, setCategory] = useState<string | undefined>();
  const [currentTask, setCurrentTask] = useState<TaskWithSteps | null>(null);
  const [longWait, setLongWait] = useState(false);
  const [showConfetti, setShowConfetti] = useState(false);
  const [copied, setCopied] = useState(false);

  // Breakdown mutation
  const breakdownMutation = useMutation({
    mutationFn: async (data: { task: string; category?: string }) => {
      const res = await apiRequest("POST", "/api/tasks/breakdown", data);
      return res.json() as Promise<{ task: any; steps: Step[] }>;
    },
    onSuccess: (data) => {
      const taskWithSteps: TaskWithSteps = {
        ...data.task,
        steps: data.steps,
      };
      setCurrentTask(taskWithSteps);
      setAppState("results");
      setLongWait(false);
      queryClient.invalidateQueries({ queryKey: ["/api/tasks"] });
      queryClient.invalidateQueries({ queryKey: ["/api/stats"] });
    },
    onError: (error: Error) => {
      const raw = error.message.replace(/^\d+:\s*/, "");
      let desc = raw;
      try { desc = JSON.parse(raw).message || raw; } catch {}
      toast({
        title: "Couldn't break down task",
        description: desc,
        variant: "destructive",
      });
      setAppState("input");
      setLongWait(false);
    },
  });

  // Toggle step mutation
  const toggleMutation = useMutation({
    mutationFn: async (stepId: number) => {
      const res = await apiRequest("POST", `/api/steps/${stepId}/toggle`);
      return res.json() as Promise<Step>;
    },
    onSuccess: (updatedStep) => {
      if (!currentTask) return;
      const newSteps = currentTask.steps.map((s) =>
        s.id === updatedStep.id ? updatedStep : s
      );
      setCurrentTask({ ...currentTask, steps: newSteps });
      queryClient.invalidateQueries({ queryKey: ["/api/tasks"] });
      queryClient.invalidateQueries({ queryKey: ["/api/stats"] });
    },
  });

  // Long wait timer
  useEffect(() => {
    if (appState !== "loading") return;
    const timer = setTimeout(() => setLongWait(true), 10000);
    return () => clearTimeout(timer);
  }, [appState]);

  // Check for all done
  const completedSteps = currentTask?.steps.filter((s) => s.completed === 1).length ?? 0;
  const totalSteps = currentTask?.steps.length ?? 0;
  const allDone = totalSteps > 0 && completedSteps === totalSteps;

  // Show confetti when all done
  useEffect(() => {
    if (allDone && !showConfetti) {
      setShowConfetti(true);
      const timer = setTimeout(() => setShowConfetti(false), 4000);
      return () => clearTimeout(timer);
    }
  }, [allDone]);

  const handleSubmit = () => {
    if (!taskText.trim()) return;
    setAppState("loading");
    breakdownMutation.mutate({ task: taskText.trim(), category });
  };

  const handleNewTask = () => {
    setAppState("input");
    setTaskText("");
    setCategory(undefined);
    setCurrentTask(null);
    setCopied(false);
  };

  const handleCopySteps = useCallback(() => {
    if (!currentTask) return;
    const text = currentTask.steps
      .map((s) => `${s.completed ? "✅" : "⬜"} ${s.stepNumber}. ${s.stepText}`)
      .join("\n");
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      toast({ title: "Steps copied to clipboard!" });
      setTimeout(() => setCopied(false), 2000);
    });
  }, [currentTask, toast]);

  const progressPercent = totalSteps > 0 ? (completedSteps / totalSteps) * 100 : 0;

  return (
    <div className="w-full max-w-2xl mx-auto px-4 py-8 pb-24 md:pb-8">
      {/* CONFETTI */}
      {showConfetti &&
        Array.from({ length: 30 }).map((_, i) => (
          <ConfettiPiece key={i} index={i} />
        ))}

      {/* INPUT STATE */}
      {appState === "input" && (
        <div className="space-y-6">
          <div className="text-center space-y-2">
            <h1
              className="font-display text-xl font-bold tracking-tight"
              data-testid="text-heading"
            >
              What do you need to do today?
            </h1>
            <p className="text-muted-foreground text-sm">
              Type any big task, and we'll break it down into simple, clear steps.
            </p>
          </div>

          {/* Category chips */}
          <div className="flex flex-wrap justify-center gap-2" role="group" aria-label="Category selection">
            {CATEGORIES.map((cat) => (
              <button
                key={cat.value}
                onClick={() => setCategory(category === cat.value ? undefined : cat.value)}
                className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-full text-sm font-medium transition-all min-h-[40px] ${
                  category === cat.value
                    ? "bg-primary text-primary-foreground"
                    : "bg-secondary text-secondary-foreground hover:bg-accent"
                }`}
                data-testid={`chip-category-${cat.value}`}
                aria-pressed={category === cat.value}
                aria-label={`${cat.label} category`}
              >
                <span>{cat.emoji}</span>
                <span>{cat.label}</span>
              </button>
            ))}
          </div>

          {/* Textarea */}
          <div className="space-y-2">
            <Textarea
              value={taskText}
              onChange={(e) => setTaskText(e.target.value)}
              placeholder="e.g., Organize my bedroom..."
              className="min-h-[120px] text-base resize-none"
              maxLength={500}
              data-testid="input-task-text"
              aria-label="Describe your task"
            />
            {!taskText.trim() && (
              <p className="text-muted-foreground text-sm text-center" data-testid="text-hint">
                Type a task above to get started
              </p>
            )}
          </div>

          {/* Submit button */}
          <Button
            onClick={handleSubmit}
            disabled={!taskText.trim()}
            className="w-full h-12 text-base font-semibold gap-2"
            data-testid="button-breakdown"
            aria-label="Break it down"
          >
            Break it down
            <ArrowRight className="h-4 w-4" />
          </Button>
        </div>
      )}

      {/* LOADING STATE */}
      {appState === "loading" && (
        <div className="flex flex-col items-center justify-center py-20 space-y-6">
          <div className="flex gap-2" aria-live="polite">
            <div className="w-3 h-3 rounded-full bg-primary animate-bounce-dot animate-bounce-dot-1" />
            <div className="w-3 h-3 rounded-full bg-primary animate-bounce-dot animate-bounce-dot-2" />
            <div className="w-3 h-3 rounded-full bg-primary animate-bounce-dot animate-bounce-dot-3" />
          </div>
          <p className="text-muted-foreground text-sm" data-testid="text-loading">
            Breaking your task into simple steps...
          </p>
          {longWait && (
            <p className="text-muted-foreground text-xs" data-testid="text-loading-long">
              Still working on it... hang tight!
            </p>
          )}
        </div>
      )}

      {/* RESULTS STATE */}
      {appState === "results" && currentTask && (
        <div className="space-y-6">
          {/* Progress bar */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Progress
              </span>
              <span className="text-sm font-medium" data-testid="text-step-count">
                {completedSteps} of {totalSteps} steps
              </span>
            </div>
            <div className="h-2.5 rounded-full bg-muted overflow-hidden" role="progressbar" aria-valuenow={progressPercent} aria-valuemin={0} aria-valuemax={100}>
              <div
                className="h-full rounded-full bg-green-500 transition-all duration-500 ease-out animate-progress-fill"
                style={{ width: `${progressPercent}%` }}
                data-testid="progress-bar"
              />
            </div>
          </div>

          {/* Task card */}
          <Card className="p-4 border border-border/60">
            <div className="flex items-start gap-3">
              <div className="flex-1">
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1">
                  Your Task
                </p>
                <p className="font-medium" data-testid="text-task-display">
                  {currentTask.taskText}
                </p>
              </div>
              {currentTask.category && currentTask.category !== "general" && (
                <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-secondary text-secondary-foreground">
                  {CATEGORIES.find((c) => c.value === currentTask.category)?.emoji}{" "}
                  {currentTask.category}
                </span>
              )}
            </div>
          </Card>

          {/* Steps */}
          <div className="space-y-2">
            {currentTask.steps.map((step, index) => (
              <button
                key={step.id}
                onClick={() => toggleMutation.mutate(step.id)}
                className="w-full text-left animate-step-appear"
                style={{ animationDelay: `${index * 80}ms` }}
                data-testid={`step-card-${step.id}`}
                aria-label={`${step.completed ? "Completed" : "Incomplete"}: Step ${step.stepNumber}, ${step.stepText}`}
              >
                <Card
                  className={`p-4 border transition-all duration-200 hover:border-primary/30 ${
                    step.completed
                      ? "bg-green-50 dark:bg-green-950/20 border-green-200 dark:border-green-800/40"
                      : "border-border/60"
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <div className="mt-0.5 flex-shrink-0">
                      {step.completed ? (
                        <CheckCircle2 className="h-5 w-5 text-green-600 dark:text-green-400" />
                      ) : (
                        <Circle className="h-5 w-5 text-muted-foreground" />
                      )}
                    </div>
                    <div className="flex items-start gap-2 flex-1 min-w-0">
                      <span className="flex-shrink-0 inline-flex items-center justify-center w-6 h-6 rounded-full text-xs font-bold bg-primary/10 text-primary">
                        {step.stepNumber}
                      </span>
                      <p
                        className={`text-sm leading-relaxed ${
                          step.completed
                            ? "line-through text-muted-foreground"
                            : ""
                        }`}
                      >
                        {step.stepText}
                      </p>
                    </div>
                  </div>
                </Card>
              </button>
            ))}
          </div>

          {/* All done celebration */}
          {allDone && (
            <div
              className="text-center py-4 rounded-xl bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-800/40"
              data-testid="text-celebration"
              role="status"
              aria-live="polite"
            >
              <p className="font-display text-lg font-bold text-green-700 dark:text-green-400">
                🎉 All done! Great job!
              </p>
            </div>
          )}

          {/* Action buttons */}
          <div className="flex gap-3">
            <Button
              variant="secondary"
              onClick={handleCopySteps}
              className="flex-1 h-12 text-sm font-medium gap-2"
              data-testid="button-copy-steps"
              aria-label="Copy steps to clipboard"
            >
              {copied ? (
                <>
                  <Check className="h-4 w-4" />
                  Copied!
                </>
              ) : (
                <>
                  <Copy className="h-4 w-4" />
                  Copy steps
                </>
              )}
            </Button>
            <Button
              onClick={handleNewTask}
              className="flex-1 h-12 text-sm font-medium gap-2"
              data-testid="button-new-task"
              aria-label="Start a new task"
            >
              <RotateCcw className="h-4 w-4" />
              Start a new task
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
