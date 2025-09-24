import { useState, useEffect, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { 
  Mail, 
  MessageSquare, 
  ArrowUpRight, 
  ArrowDownLeft, 
  Flag, 
  FlagOff, 
  Eye, 
  EyeOff, 
  Search, 
  Filter,
  RefreshCw,
  Clock,
  User,
  Book
} from "lucide-react";
import { format } from "date-fns";

// Types for communication data
interface Communication {
  id: string;
  type: 'email' | 'sms';
  direction: 'inbound' | 'outbound';
  fromAddress: string;
  toAddress: string;
  subject: string | null;
  content: string;
  htmlContent: string | null;
  deliveryStatus: string;
  isRead: boolean;
  isFlagged: boolean;
  flagNote: string | null;
  sentAt: string;
  readAt: string | null;
  flaggedAt: string | null;
  purpose: string | null;
  userId: string | null;
  courseId: string | null;
  enrollmentId: string | null;
}

interface CommunicationsData {
  data: Communication[];
  total: number;
  page: number;
  limit: number;
}

// Filter state interface
interface Filters {
  type?: 'email' | 'sms';
  direction?: 'inbound' | 'outbound';
  isRead?: boolean;
  isFlagged?: boolean;
  search?: string;
  page: number;
  limit: number;
}

export function CommunicationsDashboard() {
  const [activeSection, setActiveSection] = useState("email");
  const [activeEmailTab, setActiveEmailTab] = useState("all");
  const [activeSMSTab, setActiveSMSTab] = useState("all");
  const [filters, setFilters] = useState<Filters>({
    page: 1,
    limit: 50
  });
  const [searchTerm, setSearchTerm] = useState("");
  
  // Real-time notification state
  const [lastTotalCount, setLastTotalCount] = useState<number | null>(null);
  const [lastUnreadCount, setLastUnreadCount] = useState<number | null>(null);
  const [lastFlaggedCount, setLastFlaggedCount] = useState<number | null>(null);
  const hasMountedRef = useRef(false);
  const lastFiltersRef = useRef<string>('');
  const suppressNotificationsRef = useRef(false);
  
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Build query key and URL separately for proper cache management
  const buildQueryKey = (currentFilters: Filters) => {
    return ['/api/communications', currentFilters];
  };

  const buildQueryUrl = (currentFilters: Filters) => {
    const params = new URLSearchParams();
    if (currentFilters.type) params.set('type', currentFilters.type);
    if (currentFilters.direction) params.set('direction', currentFilters.direction);
    if (currentFilters.isRead !== undefined) params.set('isRead', currentFilters.isRead.toString());
    if (currentFilters.isFlagged !== undefined) params.set('isFlagged', currentFilters.isFlagged.toString());
    if (currentFilters.search) params.set('search', currentFilters.search);
    params.set('page', currentFilters.page.toString());
    params.set('limit', currentFilters.limit.toString());
    return `/api/communications?${params.toString()}`;
  };

  // Query for communications data with background refetching
  const { data: communicationsData, isLoading, isError, error, refetch } = useQuery<CommunicationsData>({
    queryKey: buildQueryKey(filters),
    queryFn: () => fetch(buildQueryUrl(filters), { credentials: 'include' }).then(res => res.json()),
    refetchInterval: 30000, // Refetch every 30 seconds
    refetchIntervalInBackground: true, // Continue refetching when tab is not focused
    refetchOnWindowFocus: true, // Refetch when user returns to tab
  });

  // Mutations for status changes
  const markAsReadMutation = useMutation({
    mutationFn: (id: string) => apiRequest(`/api/communications/${id}/read`, { method: 'PATCH' }),
    onSuccess: () => {
      suppressNotificationsRef.current = true;
      queryClient.invalidateQueries({ queryKey: ['/api/communications'] });
      queryClient.invalidateQueries({ queryKey: ['/api/communications/counts'] });
      toast({ title: "Success", description: "Message marked as read" });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to mark message as read", variant: "destructive" });
    }
  });

  const markAsUnreadMutation = useMutation({
    mutationFn: (id: string) => apiRequest(`/api/communications/${id}/unread`, { method: 'PATCH' }),
    onSuccess: () => {
      suppressNotificationsRef.current = true;
      queryClient.invalidateQueries({ queryKey: ['/api/communications'] });
      queryClient.invalidateQueries({ queryKey: ['/api/communications/counts'] });
      toast({ title: "Success", description: "Message marked as unread" });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to mark message as unread", variant: "destructive" });
    }
  });

  const flagMutation = useMutation({
    mutationFn: ({ id, note }: { id: string; note?: string }) => 
      apiRequest(`/api/communications/${id}/flag`, { method: 'PATCH', body: { note } }),
    onSuccess: () => {
      suppressNotificationsRef.current = true;
      queryClient.invalidateQueries({ queryKey: ['/api/communications'] });
      queryClient.invalidateQueries({ queryKey: ['/api/communications/counts'] });
      toast({ title: "Success", description: "Message flagged for follow-up" });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to flag message", variant: "destructive" });
    }
  });

  const unflagMutation = useMutation({
    mutationFn: (id: string) => apiRequest(`/api/communications/${id}/unflag`, { method: 'PATCH' }),
    onSuccess: () => {
      suppressNotificationsRef.current = true;
      queryClient.invalidateQueries({ queryKey: ['/api/communications'] });
      queryClient.invalidateQueries({ queryKey: ['/api/communications/counts'] });
      toast({ title: "Success", description: "Message unflagged" });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to unflag message", variant: "destructive" });
    }
  });

  // Handle real-time notifications when data changes
  useEffect(() => {
    if (!communicationsData) {
      return;
    }

    const currentFiltersKey = JSON.stringify(filters);
    const currentTotal = communicationsData.total;
    const currentUnread = communicationsData.data.filter(c => !c.isRead).length;
    const currentFlagged = communicationsData.data.filter(c => c.isFlagged).length;

    // Check if this is the first load or if filters changed
    const isFirstLoad = !hasMountedRef.current;
    const filtersChanged = lastFiltersRef.current !== currentFiltersKey;
    
    if (isFirstLoad || filtersChanged) {
      // Reset tracking values without notifications
      setLastTotalCount(currentTotal);
      setLastUnreadCount(currentUnread);
      setLastFlaggedCount(currentFlagged);
      lastFiltersRef.current = currentFiltersKey;
      hasMountedRef.current = true;
      suppressNotificationsRef.current = false; // Clear suppression flag
      return;
    }

    // Check if notifications should be suppressed (from user actions)
    if (suppressNotificationsRef.current) {
      // Update counts but don't show notifications
      setLastTotalCount(currentTotal);
      setLastUnreadCount(currentUnread);
      setLastFlaggedCount(currentFlagged);
      suppressNotificationsRef.current = false; // Clear suppression flag
      return;
    }

    // Only show notifications for genuinely new data (not filter-based or user-driven changes)
    // Only compare totals for the "all" view to avoid filter-based false positives
    if ((activeEmailTab === "all" || activeSMSTab === "all") && filters.page === 1 && !filters.search && !filters.type && !filters.direction && !filters.isRead && !filters.isFlagged) {
      // Check for new messages in unfiltered view
      if (lastTotalCount !== null && currentTotal > lastTotalCount) {
        const newCount = currentTotal - lastTotalCount;
        toast({
          title: "New Messages",
          description: `${newCount} new communication${newCount === 1 ? '' : 's'} received`,
          duration: 5000,
        });
      }

      // Check for new unread messages in unfiltered view
      if (lastUnreadCount !== null && currentUnread > lastUnreadCount) {
        const newUnread = currentUnread - lastUnreadCount;
        if (newUnread > 0) {
          toast({
            title: "New Unread Messages",
            description: `${newUnread} new unread message${newUnread === 1 ? '' : 's'}`,
            duration: 5000,
          });
        }
      }

      // Check for new flagged messages in unfiltered view
      if (lastFlaggedCount !== null && currentFlagged > lastFlaggedCount) {
        const newFlagged = currentFlagged - lastFlaggedCount;
        if (newFlagged > 0) {
          toast({
            title: "New Flagged Messages", 
            description: `${newFlagged} message${newFlagged === 1 ? '' : 's'} flagged for follow-up`,
            duration: 5000,
          });
        }
      }
    }

    // Update tracking values
    setLastTotalCount(currentTotal);
    setLastUnreadCount(currentUnread);
    setLastFlaggedCount(currentFlagged);
  }, [communicationsData, lastTotalCount, lastUnreadCount, lastFlaggedCount, filters, activeEmailTab, activeSMSTab, toast]);

  // Handle filter changes
  const updateFilters = (newFilters: Partial<Filters>) => {
    setFilters(prev => ({ ...prev, ...newFilters, page: 1 })); // Reset to page 1 when filters change
  };

  const handleSearch = () => {
    updateFilters({ search: searchTerm });
  };

  const clearFilters = () => {
    setFilters({ page: 1, limit: 50 });
    setSearchTerm("");
  };

  // Get filtered communications based on active section and tab
  const getFilteredCommunications = (section: string, tab: string) => {
    if (!communicationsData?.data) return [];
    
    // First filter by section (email/sms)
    let sectionFiltered = communicationsData.data.filter(c => c.type === section);
    
    // Then filter by tab
    switch (tab) {
      case "unread":
        return sectionFiltered.filter(c => !c.isRead);
      case "flagged":
        return sectionFiltered.filter(c => c.isFlagged);
      case "sent":
        return sectionFiltered.filter(c => c.direction === 'outbound');
      case "all":
      default:
        return sectionFiltered;
    }
  };

  // Get counts for each section and tab
  const getEmailCounts = () => {
    const emailData = communicationsData?.data.filter(c => c.type === 'email') || [];
    return {
      all: emailData.length,
      unread: emailData.filter(c => !c.isRead).length,
      sent: emailData.filter(c => c.direction === 'outbound').length,
      flagged: emailData.filter(c => c.isFlagged).length
    };
  };

  const getSMSCounts = () => {
    const smsData = communicationsData?.data.filter(c => c.type === 'sms') || [];
    return {
      all: smsData.length,
      unread: smsData.filter(c => !c.isRead).length,
      sent: smsData.filter(c => c.direction === 'outbound').length,
      flagged: smsData.filter(c => c.isFlagged).length
    };
  };

  // Render communications table
  const renderCommunicationsTable = (communications: Communication[]) => {
    if (communications.length === 0) {
      return (
        <Card>
          <CardContent className="p-6">
            <div className="text-center py-8">
              <MessageSquare className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium text-muted-foreground mb-2">No communications found</h3>
              <p className="text-sm text-muted-foreground">
                {searchTerm || Object.keys(filters).length > 2 
                  ? "Try adjusting your filters or search terms"
                  : "Communications will appear here when emails and SMS are sent"}
              </p>
            </div>
          </CardContent>
        </Card>
      );
    }

    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>Communications ({communications.length})</span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => refetch()}
              disabled={isLoading}
              data-testid="button-refresh-communications"
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Type</TableHead>
                <TableHead>Direction</TableHead>
                <TableHead>From/To</TableHead>
                <TableHead>Subject/Preview</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {communications.map((communication) => (
                <TableRow 
                  key={communication.id}
                  className={`${!communication.isRead ? 'bg-blue-50 dark:bg-blue-950' : ''} ${
                    communication.isFlagged ? 'border-l-4 border-l-red-500' : ''
                  }`}
                >
                  <TableCell>
                    <div className="flex items-center space-x-2">
                      {communication.type === 'email' ? (
                        <Mail className="h-4 w-4 text-blue-600" />
                      ) : (
                        <MessageSquare className="h-4 w-4 text-green-600" />
                      )}
                      <Badge variant="outline" className="text-xs">
                        {communication.type.toUpperCase()}
                      </Badge>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center space-x-1">
                      {communication.direction === 'outbound' ? (
                        <ArrowUpRight className="h-4 w-4 text-blue-500" />
                      ) : (
                        <ArrowDownLeft className="h-4 w-4 text-green-500" />
                      )}
                      <span className="text-xs capitalize">
                        {communication.direction}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="space-y-1">
                      <div className="text-sm font-medium">
                        {communication.direction === 'outbound' ? communication.toAddress : communication.fromAddress}
                      </div>
                      {communication.purpose && (
                        <Badge variant="secondary" className="text-xs">
                          {communication.purpose}
                        </Badge>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="max-w-xs">
                    <div className="space-y-1">
                      {communication.subject && (
                        <div className="text-sm font-medium truncate" title={communication.subject}>
                          {communication.subject}
                        </div>
                      )}
                      <div className="text-xs text-muted-foreground truncate" title={communication.content}>
                        {communication.content}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-col space-y-1">
                      <Badge 
                        variant={communication.deliveryStatus === 'sent' ? 'default' : 'destructive'}
                        className="text-xs w-fit"
                      >
                        {communication.deliveryStatus}
                      </Badge>
                      <div className="flex items-center space-x-1">
                        {!communication.isRead && (
                          <Badge variant="secondary" className="text-xs">
                            Unread
                          </Badge>
                        )}
                        {communication.isFlagged && (
                          <Badge variant="destructive" className="text-xs">
                            Flagged
                          </Badge>
                        )}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="space-y-1">
                      <div className="text-sm">
                        {format(new Date(communication.sentAt), "MMM d, yyyy")}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {format(new Date(communication.sentAt), "h:mm a")}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex space-x-1">
                      {communication.isRead ? (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => markAsUnreadMutation.mutate(communication.id)}
                          title="Mark as unread"
                          data-testid={`button-mark-unread-${communication.id}`}
                        >
                          <EyeOff className="h-4 w-4" />
                        </Button>
                      ) : (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => markAsReadMutation.mutate(communication.id)}
                          title="Mark as read"
                          data-testid={`button-mark-read-${communication.id}`}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                      )}
                      
                      {communication.isFlagged ? (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => unflagMutation.mutate(communication.id)}
                          title="Remove flag"
                          data-testid={`button-unflag-${communication.id}`}
                        >
                          <FlagOff className="h-4 w-4" />
                        </Button>
                      ) : (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => flagMutation.mutate({ id: communication.id })}
                          title="Flag for follow-up"
                          data-testid={`button-flag-${communication.id}`}
                        >
                          <Flag className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    );
  };

  if (isLoading) {
    return (
      <div className="max-w-7xl mx-auto p-6">
        <div className="space-y-4">
          <div className="animate-pulse">
            <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-1/4 mb-2"></div>
            <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/2"></div>
          </div>
          <div className="animate-pulse bg-gray-200 dark:bg-gray-700 rounded h-64"></div>
        </div>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="max-w-7xl mx-auto p-6">
        <Card className="border-red-200 dark:border-red-800">
          <CardContent className="p-6">
            <div className="text-center py-8">
              <h3 className="text-lg font-medium text-red-700 dark:text-red-400 mb-2">
                Failed to load communications
              </h3>
              <p className="text-sm text-muted-foreground mb-4">
                {error?.message || "An unexpected error occurred"}
              </p>
              <Button onClick={() => refetch()} variant="outline">
                <RefreshCw className="h-4 w-4 mr-2" />
                Try Again
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  const emailCounts = getEmailCounts();
  const smsCounts = getSMSCounts();
  const currentSectionData = activeSection === 'email' 
    ? getFilteredCommunications('email', activeEmailTab)
    : getFilteredCommunications('sms', activeSMSTab);

  return (
    <div className="max-w-7xl mx-auto p-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold tracking-tight">Communications Dashboard</h1>
        <p className="text-muted-foreground">
          Track all emails and SMS messages sent and received, with status indicators and flagging for follow-up.
        </p>
      </div>

      {/* Filter Controls */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Filter className="h-5 w-5" />
            <span>Filters & Search</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <div className="flex space-x-2">
                <Input
                  placeholder="Search messages..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                  data-testid="input-search-communications"
                  className="flex-1"
                />
                <Button onClick={handleSearch} data-testid="button-search-communications">
                  <Search className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>
          
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <Select
                value={filters.type || "all"}
                onValueChange={(value) => updateFilters({ type: value === 'all' ? undefined : value as 'email' | 'sms' })}
              >
                <SelectTrigger data-testid="select-type-filter">
                  <SelectValue placeholder="All Types" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  <SelectItem value="email">Email Only</SelectItem>
                  <SelectItem value="sms">SMS Only</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="flex-1">
              <Select
                value={filters.direction || "all"}
                onValueChange={(value) => updateFilters({ direction: value === 'all' ? undefined : value as 'inbound' | 'outbound' })}
              >
                <SelectTrigger data-testid="select-direction-filter">
                  <SelectValue placeholder="All Directions" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Directions</SelectItem>
                  <SelectItem value="outbound">Outbound</SelectItem>
                  <SelectItem value="inbound">Inbound</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <Button
              variant="outline"
              onClick={clearFilters}
              data-testid="button-clear-filters"
              className="sm:w-auto w-full"
            >
              Clear Filters
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Main sections for Email and SMS */}
      <Tabs value={activeSection} onValueChange={setActiveSection} className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="email" data-testid="tab-section-email" className="text-lg">
            <Mail className="h-5 w-5 mr-2" />
            Email
            <Badge variant="secondary" className="ml-2">
              {emailCounts.all}
            </Badge>
          </TabsTrigger>
          <TabsTrigger value="sms" data-testid="tab-section-sms" className="text-lg">
            <MessageSquare className="h-5 w-5 mr-2" />
            SMS
            <Badge variant="secondary" className="ml-2">
              {smsCounts.all}
            </Badge>
          </TabsTrigger>
        </TabsList>

        {/* Email Section */}
        <TabsContent value="email" className="space-y-4" data-testid="content-section-email">
          <Tabs value={activeEmailTab} onValueChange={setActiveEmailTab} className="w-full">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="all" data-testid="tab-email-all">
                All
                <Badge variant="secondary" className="ml-2">
                  {emailCounts.all}
                </Badge>
              </TabsTrigger>
              <TabsTrigger value="unread" data-testid="tab-email-unread">
                Unread
                <Badge variant="secondary" className="ml-2">
                  {emailCounts.unread}
                </Badge>
              </TabsTrigger>
              <TabsTrigger value="sent" data-testid="tab-email-sent">
                Sent
                <Badge variant="secondary" className="ml-2">
                  {emailCounts.sent}
                </Badge>
              </TabsTrigger>
              <TabsTrigger value="flagged" data-testid="tab-email-flagged">
                Flagged
                <Badge variant="secondary" className="ml-2">
                  {emailCounts.flagged}
                </Badge>
              </TabsTrigger>
            </TabsList>

            <TabsContent value="all" className="space-y-4" data-testid="content-email-all">
              {renderCommunicationsTable(getFilteredCommunications('email', 'all'))}
            </TabsContent>
            <TabsContent value="unread" className="space-y-4" data-testid="content-email-unread">
              {renderCommunicationsTable(getFilteredCommunications('email', 'unread'))}
            </TabsContent>
            <TabsContent value="sent" className="space-y-4" data-testid="content-email-sent">
              {renderCommunicationsTable(getFilteredCommunications('email', 'sent'))}
            </TabsContent>
            <TabsContent value="flagged" className="space-y-4" data-testid="content-email-flagged">
              {renderCommunicationsTable(getFilteredCommunications('email', 'flagged'))}
            </TabsContent>
          </Tabs>
        </TabsContent>

        {/* SMS Section */}
        <TabsContent value="sms" className="space-y-4" data-testid="content-section-sms">
          <Tabs value={activeSMSTab} onValueChange={setActiveSMSTab} className="w-full">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="all" data-testid="tab-sms-all">
                All
                <Badge variant="secondary" className="ml-2">
                  {smsCounts.all}
                </Badge>
              </TabsTrigger>
              <TabsTrigger value="unread" data-testid="tab-sms-unread">
                Unread
                <Badge variant="secondary" className="ml-2">
                  {smsCounts.unread}
                </Badge>
              </TabsTrigger>
              <TabsTrigger value="sent" data-testid="tab-sms-sent">
                Sent
                <Badge variant="secondary" className="ml-2">
                  {smsCounts.sent}
                </Badge>
              </TabsTrigger>
              <TabsTrigger value="flagged" data-testid="tab-sms-flagged">
                Flagged
                <Badge variant="secondary" className="ml-2">
                  {smsCounts.flagged}
                </Badge>
              </TabsTrigger>
            </TabsList>

            <TabsContent value="all" className="space-y-4" data-testid="content-sms-all">
              {renderCommunicationsTable(getFilteredCommunications('sms', 'all'))}
            </TabsContent>
            <TabsContent value="unread" className="space-y-4" data-testid="content-sms-unread">
              {renderCommunicationsTable(getFilteredCommunications('sms', 'unread'))}
            </TabsContent>
            <TabsContent value="sent" className="space-y-4" data-testid="content-sms-sent">
              {renderCommunicationsTable(getFilteredCommunications('sms', 'sent'))}
            </TabsContent>
            <TabsContent value="flagged" className="space-y-4" data-testid="content-sms-flagged">
              {renderCommunicationsTable(getFilteredCommunications('sms', 'flagged'))}
            </TabsContent>
          </Tabs>
        </TabsContent>
      </Tabs>

      {/* Pagination */}
      {communicationsData && communicationsData.total > communicationsData.limit && (
        <div className="mt-6 flex items-center justify-center space-x-2">
          <Button
            variant="outline"
            disabled={filters.page <= 1}
            onClick={() => updateFilters({ page: filters.page - 1 })}
            data-testid="button-previous-page"
          >
            Previous
          </Button>
          <span className="text-sm text-muted-foreground">
            Page {filters.page} of {Math.ceil(communicationsData.total / communicationsData.limit)}
          </span>
          <Button
            variant="outline"
            disabled={filters.page >= Math.ceil(communicationsData.total / communicationsData.limit)}
            onClick={() => updateFilters({ page: filters.page + 1 })}
            data-testid="button-next-page"
          >
            Next
          </Button>
        </div>
      )}
    </div>
  );
}