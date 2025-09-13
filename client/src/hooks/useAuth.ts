import { useQuery } from "@tanstack/react-query";
import { getQueryFn } from "@/lib/queryClient";

export function useAuth() {
  const { data: user, isLoading, error } = useQuery({
    queryKey: ["/api/auth/user"],
    queryFn: getQueryFn({ on401: "returnNull" }),
    retry: 1,
    refetchOnWindowFocus: true,
    refetchOnReconnect: true,
    staleTime: 0, // Always refetch to ensure fresh auth state
    gcTime: 0, // Don't cache auth state
  });

  // Debug logging
  console.log('useAuth state:', { user, isLoading, error });

  return {
    user,
    isLoading,
    isAuthenticated: !!user,
  };
}
