import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { hasInstructorPrivileges } from "@/lib/authUtils";

interface CommunicationCounts {
  total: number;
  unread: number;
  flagged: number;
}

export function useCommunicationCounts() {
  const { isAuthenticated, user } = useAuth();
  
  const { data: counts, isLoading } = useQuery<CommunicationCounts>({
    queryKey: ['/api/communications/counts'], // Separate endpoint for efficient counting
    queryFn: async () => {
      // Fetch recent communications to calculate counts
      const response = await fetch('/api/communications?page=1&limit=100', { 
        credentials: 'include' 
      });
      if (!response.ok) {
        throw new Error('Failed to fetch communication counts');
      }
      const data = await response.json();
      
      return {
        total: data.total || 0,
        unread: data.data?.filter((c: any) => c.direction === 'inbound' && !c.isRead).length || 0,
        flagged: data.data?.filter((c: any) => c.isFlagged).length || 0,
      };
    },
    enabled: isAuthenticated && hasInstructorPrivileges(user as any),
    refetchInterval: 60000, // Refetch every minute for navigation counters
    staleTime: 30000, // Consider data stale after 30 seconds
  });

  return {
    counts: counts || { total: 0, unread: 0, flagged: 0 },
    isLoading,
  };
}