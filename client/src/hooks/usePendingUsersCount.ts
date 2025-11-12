import { useQuery } from "@tanstack/react-query";
import { useAuth } from "./useAuth";
import { isInstructorOrHigher } from "@/lib/authUtils";

export function usePendingUsersCount() {
  const { user } = useAuth();
  
  const { data } = useQuery<{ count: number }>({
    queryKey: ["/api/admin/users/pending/count"],
    enabled: !!user && isInstructorOrHigher(user),
    refetchInterval: 60000, // Refetch every minute
  });

  return {
    pendingCount: data?.count || 0,
  };
}
