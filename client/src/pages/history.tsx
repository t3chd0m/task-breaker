import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient, getQueryFn } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Trash2,
  ChevronDown,
  ChevronUp,
  Clock,
  CheckCircle2,
  Circle,
  Inbox,
} from "lucide-react";
import type { TaskWithSteps, Step } from "@shared/schema";

const CATEGORY_EMOJI: Record<string, string> = {
  home: "🏠",
  work: "💼",
  "self-care": "🧘",
  learning: "📚",
  shopping: "🛒",
  general: "📋",
};

function timeAgo(dateStr: string): string {
  if (!dateStr) return "";
  const now = new Date();
  const then = new Date(dateStr);
  const diffMs = now.getTime() - then.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return "just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return then.toLocaleDateString();
}

export default function HistoryPage() {
  const { toast } = useToast();
  const [expandedId, setExpandedId] = useState<number | null>(null);

  const { data: tasks = [], isLoading } = useQuery<TaskWithSteps[]>({
    queryKey: ["/api/tasks"],
    queryFn: getQueryFn({ on401: "throw" }),
  });

  const deleteMutation = useMutation({
    mutationFn: async (taskId: number) => {
      await apiRequest("DELETE", `/api/tasks/${taskId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/tasks"] });
      queryClient.invalidateQueries({ queryKey: ["/api/stats"] });
      toast({ title: "Task deleted" });
    },
  });

  const toggleMutation = useMutation({
    mutationFn: async (stepId: number) => {
      const res = await apiRequest("POST", `/api/steps/${stepId}/toggle`);
      return res.json() as Promise<Step>;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/tasks"] });
      queryClient.invalidateQueries({ queryKey: ["/api/stats"] });
    },
  });

  if (isLoading) {
    return (
      <div className="w-full max-w-2xl mx-auto px-4 py-8">
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="h-24 rounded-xl bg-muted animate-pulse"
            />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-2xl mx-auto px-4 py-8 pb-24 md:pb-8">
      <div className="space-y-1 mb-6">
        <h1
          className="font-display text-xl font-bold tracking-tight"
          data-testid="text-history-heading"
        >
          Task History
        </h1>
        <p className="text-muted-foreground text-sm">
          {tasks.length > 0
            ? `${tasks.length} task${tasks.length !== 1 ? "s" : ""} broken down so far`
            : "Your completed tasks will appear here"}
        </p>
      </div>

      {tasks.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <div className="w-14 h-14 rounded-full bg-muted flex items-center justify-center mb-4">
            <Inbox className="h-7 w-7 text-muted-foreground" />
          </div>
          <p className="text-muted-foreground" data-testid="text-empty-history">
            No tasks yet. Break down your first task to see it here.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {tasks.map((task) => {
            const completed = task.steps.filter((s) => s.completed === 1).length;
            const total = task.steps.length;
            const progress = total > 0 ? (completed / total) * 100 : 0;
            const isExpanded = expandedId === task.id;

            return (
              <Card
                key={task.id}
                className="border border-border/60 overflow-hidden"
                data-testid={`task-card-${task.id}`}
              >
                {/* Task header - clickable to expand */}
                <button
                  className="w-full text-left p-4 hover:bg-accent/30 transition-colors"
                  onClick={() => setExpandedId(isExpanded ? null : task.id)}
                  data-testid={`button-expand-${task.id}`}
                  aria-expanded={isExpanded}
                  aria-label={`${task.taskText}, ${completed} of ${total} steps done`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        {task.category && task.category !== "general" && (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-secondary text-secondary-foreground">
                            {CATEGORY_EMOJI[task.category] || "📋"} {task.category}
                          </span>
                        )}
                        <span className="flex items-center gap-1 text-xs text-muted-foreground">
                          <Clock className="h-3 w-3" />
                          {timeAgo(task.createdAt)}
                        </span>
                      </div>
                      <p className="font-medium text-sm truncate">
                        {task.taskText}
                      </p>
                      <div className="flex items-center gap-3 mt-2">
                        <div className="flex-1 h-1.5 rounded-full bg-muted overflow-hidden">
                          <div
                            className="h-full rounded-full bg-green-500 transition-all"
                            style={{ width: `${progress}%` }}
                          />
                        </div>
                        <span className="text-xs text-muted-foreground whitespace-nowrap">
                          {completed}/{total} steps
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-1 flex-shrink-0">
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-muted-foreground hover:text-destructive"
                            onClick={(e) => e.stopPropagation()}
                            data-testid={`button-delete-${task.id}`}
                            aria-label={`Delete task: ${task.taskText}`}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Delete this task?</AlertDialogTitle>
                            <AlertDialogDescription>
                              This will permanently remove this task and all its steps.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel data-testid="button-cancel-delete">Cancel</AlertDialogCancel>
                            <AlertDialogAction
                              onClick={() => deleteMutation.mutate(task.id)}
                              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                              data-testid="button-confirm-delete"
                            >
                              Delete
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                      {isExpanded ? (
                        <ChevronUp className="h-4 w-4 text-muted-foreground" />
                      ) : (
                        <ChevronDown className="h-4 w-4 text-muted-foreground" />
                      )}
                    </div>
                  </div>
                </button>

                {/* Expanded steps */}
                {isExpanded && (
                  <div className="border-t border-border/50 px-4 py-3 space-y-2 bg-muted/30">
                    {task.steps.map((step) => (
                      <button
                        key={step.id}
                        onClick={() => toggleMutation.mutate(step.id)}
                        className="w-full text-left flex items-start gap-3 p-2 rounded-lg hover:bg-accent/40 transition-colors min-h-[44px]"
                        data-testid={`history-step-${step.id}`}
                        aria-label={`${step.completed ? "Completed" : "Incomplete"}: ${step.stepText}`}
                      >
                        <div className="mt-0.5 flex-shrink-0">
                          {step.completed ? (
                            <CheckCircle2 className="h-4 w-4 text-green-600 dark:text-green-400" />
                          ) : (
                            <Circle className="h-4 w-4 text-muted-foreground" />
                          )}
                        </div>
                        <span
                          className={`text-sm ${
                            step.completed
                              ? "line-through text-muted-foreground"
                              : ""
                          }`}
                        >
                          {step.stepNumber}. {step.stepText}
                        </span>
                      </button>
                    ))}
                  </div>
                )}
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
