import { createContext, useContext, useState, useEffect, ReactNode, createElement } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest, getQueryFn } from "@/lib/queryClient";

interface User {
  id: number;
  username: string;
  name: string;
  email?: string;
  role: 'super_admin' | 'admin' | 'employee';
  shopId?: number;
  isBlocked: boolean;
}

interface AuthContextType {
  user: User | null;
  login: (username: string, password: string) => Promise<User>;
  logout: () => Promise<void>;
  isLoading: boolean;
  refetch: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider(props: { children: ReactNode }) {
  const queryClient = useQueryClient();
  const [isInitialized, setIsInitialized] = useState(false);

  const { data: userData = null, isLoading, refetch } = useQuery({
    queryKey: ["/api/auth/me"],
    queryFn: getQueryFn({ on401: "returnNull" }),
    retry: 1,
    refetchOnWindowFocus: true,
    refetchOnMount: true,
    staleTime: 0,
    refetchInterval: 30000, // Refetch every 30 seconds to maintain session
  });

  const loginMutation = useMutation({
    mutationFn: async ({ username, password }: { username: string; password: string }) => {
      const response = await apiRequest("POST", "/api/auth/login", { username, password });
      const data = await response.json();
      return data.user;
    },
    onSuccess: (user) => {
      // Clear any cached data first
      queryClient.removeQueries({ queryKey: ["/api/auth/me"] });
      // Set fresh user data with correct structure
      queryClient.setQueryData(["/api/auth/me"], { user });
      // Force immediate refetch to ensure consistency
      refetch();
    },
  });

  const logoutMutation = useMutation({
    mutationFn: async () => {
      await apiRequest("POST", "/api/auth/logout");
    },
    onSuccess: () => {
      queryClient.removeQueries({ queryKey: ["/api/auth/me"] });
      queryClient.setQueryData(["/api/auth/me"], null);
      queryClient.clear();
    },
  });

  const login = async (username: string, password: string): Promise<User> => {
    return loginMutation.mutateAsync({ username, password });
  };

  const logout = async (): Promise<void> => {
    return logoutMutation.mutateAsync();
  };

  useEffect(() => {
    if (!isLoading) {
      setIsInitialized(true);
    }
  }, [isLoading]);

  const value = {
    user: (userData as any)?.user || null,
    login,
    logout,
    isLoading: !isInitialized || loginMutation.isPending || logoutMutation.isPending,
    refetch,
  };

  // Debug authentication state
  useEffect(() => {
    if (userData) {
      console.log('Auth state updated:', (userData as any)?.user);
    }
  }, [userData]);

  return createElement(AuthContext.Provider, { value }, props.children);
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}