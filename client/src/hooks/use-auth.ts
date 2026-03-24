import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient, getQueryFn } from "@/lib/queryClient";
import { useLocation } from "wouter";
import { useToast } from "@/hooks/use-toast";

interface AuthUser {
  id: number;
  username: string;
  displayName: string | null;
}

function extractErrorMessage(error: Error): string {
  const raw = error.message.replace(/^\d+:\s*/, "");
  try {
    const parsed = JSON.parse(raw);
    return parsed.message || raw;
  } catch {
    return raw;
  }
}

export function useAuth() {
  const { toast } = useToast();
  const [, setLocation] = useLocation();

  const {
    data: user,
    isLoading,
    error,
  } = useQuery<AuthUser | null>({
    queryKey: ["/api/auth/me"],
    queryFn: getQueryFn({ on401: "returnNull" }),
    retry: false,
    staleTime: Infinity,
  });

  const loginMutation = useMutation({
    mutationFn: async (data: { username: string; password: string }) => {
      const res = await apiRequest("POST", "/api/auth/login", data);
      return res.json() as Promise<AuthUser>;
    },
    onSuccess: (user) => {
      queryClient.setQueryData(["/api/auth/me"], user);
      setLocation("/");
    },
    onError: (error: Error) => {
      toast({
        title: "Sign in failed",
        description: extractErrorMessage(error),
        variant: "destructive",
      });
    },
  });

  const registerMutation = useMutation({
    mutationFn: async (data: { username: string; password: string }) => {
      const res = await apiRequest("POST", "/api/auth/register", data);
      return res.json() as Promise<AuthUser>;
    },
    onSuccess: (user) => {
      queryClient.setQueryData(["/api/auth/me"], user);
      setLocation("/");
    },
    onError: (error: Error) => {
      toast({
        title: "Sign up failed",
        description: extractErrorMessage(error),
        variant: "destructive",
      });
    },
  });

  const logoutMutation = useMutation({
    mutationFn: async () => {
      await apiRequest("POST", "/api/auth/logout");
    },
    onSuccess: () => {
      queryClient.setQueryData(["/api/auth/me"], null);
      queryClient.clear();
      setLocation("/auth");
    },
  });

  return {
    user: user ?? null,
    isLoading,
    isAuthenticated: !!user,
    login: loginMutation.mutate,
    loginPending: loginMutation.isPending,
    register: registerMutation.mutate,
    registerPending: registerMutation.isPending,
    logout: logoutMutation.mutate,
    logoutPending: logoutMutation.isPending,
  };
}
