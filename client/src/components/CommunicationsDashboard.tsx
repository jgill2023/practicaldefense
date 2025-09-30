import { useState, useEffect, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
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
  Book,
  Send,
  Reply
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
  const [activeSection, setActiveSection] = useState("sms-management");
  const [activeEmailTab, setActiveEmailTab] = useState("templates");
  const [activeSMSTab, setActiveSMSTab] = useState("inbox");
  const [filters, setFilters] = useState<Filters>({
    page: 1,
    limit: 50
  });
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedMessage, setSelectedMessage] = useState<Communication | null>(null);
  const [isMessageDialogOpen, setIsMessageDialogOpen] = useState(false);
  const [replyText, setReplyText] = useState("");
  const [selectedConversation, setSelectedConversation] = useState<string | null>(null);
  
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
    mutationFn: (id: string) => apiRequest('PATCH', `/api/communications/${id}/read`),
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
    mutationFn: (id: string) => apiRequest('PATCH', `/api/communications/${id}/unread`),
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
      apiRequest('PATCH', `/api/communications/${id}/flag`, { note }),
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
    mutationFn: (id: string) => apiRequest('PATCH', `/api/communications/${id}/unflag`),
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

  const sendReplyMutation = useMutation({
    mutationFn: ({ to, body }: { to: string; body: string }) =>
      apiRequest('POST', '/api/sms/send', { to, body }),
    onSuccess: () => {
      suppressNotificationsRef.current = true;
      queryClient.invalidateQueries({ queryKey: ['/api/communications'] });
      toast({ title: "Success", description: "Reply sent successfully" });
      setReplyText("");
      setIsMessageDialogOpen(false);
    },
    onError: (error: any) => {
      toast({ 
        title: "Error", 
        description: error?.message || "Failed to send reply", 
        variant: "destructive" 
      });
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
      case "inbox":
      case "all": // Keep "all" for backward compatibility during transition
      default:
        return sectionFiltered.filter(c => c.direction === 'inbound'); // Only show inbound messages in inbox
    }
  };

  // Get counts for each section and tab
  const getEmailCounts = () => {
    const emailData = communicationsData?.data.filter(c => c.type === 'email') || [];
    return {
      inbox: emailData.filter(c => c.direction === 'inbound').length, // Only inbound messages in inbox
      all: emailData.filter(c => c.direction === 'inbound').length, // Alias for inbox during transition
      unread: emailData.filter(c => !c.isRead).length,
      sent: emailData.filter(c => c.direction === 'outbound').length,
      flagged: emailData.filter(c => c.isFlagged).length
    };
  };

  const getSMSCounts = () => {
    const smsData = communicationsData?.data.filter(c => c.type === 'sms') || [];
    return {
      inbox: smsData.filter(c => c.direction === 'inbound').length, // Only inbound messages in inbox
      all: smsData.filter(c => c.direction === 'inbound').length, // Alias for inbox during transition
      unread: smsData.filter(c => !c.isRead).length,
      sent: smsData.filter(c => c.direction === 'outbound').length,
      flagged: smsData.filter(c => c.isFlagged).length
    };
  };

  // Group SMS messages into conversations by phone number
  interface Conversation {
    phoneNumber: string;
    messages: Communication[];
    lastMessage: Communication;
    unreadCount: number;
  }

  const getSMSConversations = (): Conversation[] => {
    const smsData = communicationsData?.data.filter(c => c.type === 'sms') || [];
    const conversationMap = new Map<string, Communication[]>();

    // Group messages by phone number (use the "other" party's number)
    smsData.forEach(msg => {
      const phoneNumber = msg.direction === 'inbound' ? msg.fromAddress : msg.toAddress;
      const existing = conversationMap.get(phoneNumber) || [];
      conversationMap.set(phoneNumber, [...existing, msg]);
    });

    // Convert to array and sort each conversation by date
    const conversations: Conversation[] = Array.from(conversationMap.entries()).map(([phoneNumber, messages]) => {
      const sorted = messages.sort((a, b) => new Date(b.sentAt).getTime() - new Date(a.sentAt).getTime());
      return {
        phoneNumber,
        messages: sorted,
        lastMessage: sorted[0],
        unreadCount: sorted.filter(m => !m.isRead && m.direction === 'inbound').length
      };
    });

    // Sort conversations by most recent message
    return conversations.sort((a, b) => 
      new Date(b.lastMessage.sentAt).getTime() - new Date(a.lastMessage.sentAt).getTime()
    );
  };

  const getConversationMessages = (phoneNumber: string): Communication[] => {
    const smsData = communicationsData?.data.filter(c => c.type === 'sms') || [];
    return smsData
      .filter(msg => 
        (msg.direction === 'inbound' && msg.fromAddress === phoneNumber) ||
        (msg.direction === 'outbound' && msg.toAddress === phoneNumber)
      )
      .sort((a, b) => new Date(a.sentAt).getTime() - new Date(b.sentAt).getTime());
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
                      {communication.type === 'sms' && communication.direction === 'inbound' && (
                        <Button
                          variant="default"
                          size="sm"
                          onClick={() => {
                            setSelectedMessage(communication);
                            setIsMessageDialogOpen(true);
                            if (!communication.isRead) {
                              markAsReadMutation.mutate(communication.id);
                            }
                          }}
                          title="View and reply"
                          data-testid={`button-view-reply-${communication.id}`}
                        >
                          <Reply className="h-4 w-4 mr-1" />
                          Reply
                        </Button>
                      )}
                      
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

      {/* Main sections for SMS Management and Email Templates */}
      <Tabs value={activeSection} onValueChange={setActiveSection} className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="sms-management" data-testid="tab-section-sms-management" className="text-lg">
            <MessageSquare className="h-5 w-5 mr-2" />
            SMS Management
          </TabsTrigger>
          <TabsTrigger value="email-templates" data-testid="tab-section-email-templates" className="text-lg">
            <Mail className="h-5 w-5 mr-2" />
            Email Templates
          </TabsTrigger>
        </TabsList>

        {/* Email Templates Section */}
        <TabsContent value="email-templates" className="space-y-4" data-testid="content-section-email-templates">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Mail className="h-5 w-5" />
                <span>Email Templates</span>
                <Button size="sm" data-testid="button-create-email-template">
                  Create Template
                </Button>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground mb-4">
                Manage email templates for automated course notifications and reminders. Each template can have a custom reply-to email address.
              </p>
              
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                <Card className="border-dashed">
                  <CardContent className="p-6 text-center">
                    <Mail className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                    <h3 className="font-medium mb-2">Course Registration Confirmation</h3>
                    <p className="text-sm text-muted-foreground mb-4">Sent when students register for courses</p>
                    <div className="flex space-x-2">
                      <Button variant="outline" size="sm" data-testid="button-edit-template">Edit</Button>
                      <Button variant="outline" size="sm" data-testid="button-preview-template">Preview</Button>
                    </div>
                  </CardContent>
                </Card>
                
                <Card className="border-dashed">
                  <CardContent className="p-6 text-center">
                    <Clock className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                    <h3 className="font-medium mb-2">Course Reminder</h3>
                    <p className="text-sm text-muted-foreground mb-4">Sent 24 hours before course starts</p>
                    <div className="flex space-x-2">
                      <Button variant="outline" size="sm" data-testid="button-edit-template">Edit</Button>
                      <Button variant="outline" size="sm" data-testid="button-preview-template">Preview</Button>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* SMS Management Section */}
        <TabsContent value="sms-management" className="space-y-4" data-testid="content-section-sms-management">
          <Tabs value={activeSMSTab} onValueChange={setActiveSMSTab} className="w-full">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="inbox" data-testid="tab-sms-inbox">
                <MessageSquare className="h-4 w-4 mr-2" />
                Inbox
              </TabsTrigger>
              <TabsTrigger value="compose" data-testid="tab-sms-compose">
                <MessageSquare className="h-4 w-4 mr-2" />
                Compose
              </TabsTrigger>
              <TabsTrigger value="contacts" data-testid="tab-sms-contacts">
                <User className="h-4 w-4 mr-2" />
                Contacts
              </TabsTrigger>
              <TabsTrigger value="templates" data-testid="tab-sms-templates">
                <Book className="h-4 w-4 mr-2" />
                Templates
              </TabsTrigger>
            </TabsList>

            {/* SMS Contacts Tab */}
            <TabsContent value="contacts" className="space-y-4" data-testid="content-sms-contacts">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    <span className="flex items-center space-x-2">
                      <User className="h-5 w-5" />
                      <span>Contact Management</span>
                    </span>
                    <Button size="sm" data-testid="button-add-contact">
                      Add Contact
                    </Button>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <Input placeholder="Search contacts..." className="md:col-span-2" data-testid="input-search-contacts" />
                      <Select>
                        <SelectTrigger data-testid="select-contact-filter">
                          <SelectValue placeholder="Filter by group" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">All Contacts</SelectItem>
                          <SelectItem value="students">Students</SelectItem>
                          <SelectItem value="instructors">Instructors</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    
                    <div className="text-center py-8 text-muted-foreground">
                      <User className="h-12 w-12 mx-auto mb-4" />
                      <p>Contact management will display student and instructor phone numbers for SMS notifications.</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* SMS Templates Tab */}
            <TabsContent value="templates" className="space-y-4" data-testid="content-sms-templates">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    <span className="flex items-center space-x-2">
                      <Book className="h-5 w-5" />
                      <span>SMS Templates</span>
                    </span>
                    <Button size="sm" data-testid="button-create-sms-template">
                      Create Template
                    </Button>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-center py-8 text-muted-foreground">
                    <MessageSquare className="h-12 w-12 mx-auto mb-4" />
                    <p>Create and manage SMS templates for course notifications and reminders.</p>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* SMS Inbox Tab - Threaded Conversations */}
            <TabsContent value="inbox" className="space-y-4" data-testid="content-sms-inbox">
              <Card className="h-[600px]">
                <CardContent className="p-0 h-full">
                  <div className="flex h-full">
                    {/* Conversation List */}
                    <div className="w-1/3 border-r flex flex-col">
                      <div className="p-4 border-b">
                        <h3 className="font-semibold text-lg">Messages</h3>
                      </div>
                      <div className="flex-1 overflow-y-auto">
                        {getSMSConversations().length === 0 ? (
                          <div className="flex flex-col items-center justify-center h-full p-4 text-center text-muted-foreground">
                            <MessageSquare className="h-12 w-12 mb-3 opacity-50" />
                            <p className="text-sm">No conversations yet</p>
                            <p className="text-xs mt-1">Messages will appear here</p>
                          </div>
                        ) : (
                          getSMSConversations().map((conversation) => (
                            <div
                              key={conversation.phoneNumber}
                              onClick={() => setSelectedConversation(conversation.phoneNumber)}
                              className={`p-4 border-b cursor-pointer hover:bg-muted/50 transition-colors ${
                                selectedConversation === conversation.phoneNumber ? 'bg-muted' : ''
                              }`}
                              data-testid={`conversation-${conversation.phoneNumber}`}
                            >
                              <div className="flex items-start justify-between mb-1">
                                <div className="font-medium text-sm truncate flex-1">
                                  {conversation.phoneNumber}
                                </div>
                                <div className="text-xs text-muted-foreground ml-2">
                                  {format(new Date(conversation.lastMessage.sentAt), 'MMM d')}
                                </div>
                              </div>
                              <div className="flex items-center justify-between">
                                <div className="text-sm text-muted-foreground truncate flex-1">
                                  {conversation.lastMessage.content}
                                </div>
                                {conversation.unreadCount > 0 && (
                                  <Badge variant="default" className="ml-2 h-5 min-w-[20px] rounded-full">
                                    {conversation.unreadCount}
                                  </Badge>
                                )}
                              </div>
                            </div>
                          ))
                        )}
                      </div>
                    </div>

                    {/* Conversation Thread */}
                    <div className="flex-1 flex flex-col">
                      {selectedConversation ? (
                        <>
                          {/* Thread Header */}
                          <div className="p-4 border-b bg-muted/30">
                            <div className="flex items-center justify-between">
                              <h3 className="font-semibold">{selectedConversation}</h3>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => {
                                  const messages = getConversationMessages(selectedConversation);
                                  const unreadMessages = messages.filter(m => !m.isRead && m.direction === 'inbound');
                                  unreadMessages.forEach(msg => markAsReadMutation.mutate(msg.id));
                                }}
                                data-testid="button-mark-all-read"
                              >
                                Mark all read
                              </Button>
                            </div>
                          </div>

                          {/* Messages */}
                          <div className="flex-1 overflow-y-auto p-4 space-y-3" data-testid="conversation-messages">
                            {getConversationMessages(selectedConversation).map((msg, index) => (
                              <div
                                key={msg.id}
                                className={`flex ${msg.direction === 'outbound' ? 'justify-end' : 'justify-start'}`}
                              >
                                <div
                                  className={`max-w-[70%] rounded-2xl px-4 py-2 ${
                                    msg.direction === 'outbound'
                                      ? 'bg-blue-500 text-white rounded-br-sm'
                                      : 'bg-muted text-foreground rounded-bl-sm'
                                  }`}
                                  data-testid={`message-${msg.id}`}
                                >
                                  <div className="text-sm break-words">{msg.content}</div>
                                  <div className={`text-xs mt-1 ${
                                    msg.direction === 'outbound' ? 'text-blue-100' : 'text-muted-foreground'
                                  }`}>
                                    {format(new Date(msg.sentAt), 'h:mm a')}
                                    {msg.direction === 'inbound' && !msg.isRead && (
                                      <span className="ml-2 font-medium">New</span>
                                    )}
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>

                          {/* Reply Input */}
                          <div className="p-4 border-t bg-background">
                            <div className="flex space-x-2">
                              <Textarea
                                value={replyText}
                                onChange={(e) => setReplyText(e.target.value)}
                                placeholder="Type a message..."
                                className="flex-1 resize-none min-h-[44px] max-h-[120px]"
                                rows={1}
                                data-testid="input-reply-message"
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter' && !e.shiftKey) {
                                    e.preventDefault();
                                    if (replyText.trim() && !sendReplyMutation.isPending) {
                                      sendReplyMutation.mutate({
                                        to: selectedConversation,
                                        body: replyText.trim()
                                      });
                                    }
                                  }
                                }}
                              />
                              <Button
                                onClick={() => {
                                  if (replyText.trim()) {
                                    sendReplyMutation.mutate({
                                      to: selectedConversation,
                                      body: replyText.trim()
                                    });
                                  }
                                }}
                                disabled={!replyText.trim() || sendReplyMutation.isPending}
                                data-testid="button-send-message"
                              >
                                <Send className="h-4 w-4" />
                              </Button>
                            </div>
                            <div className="text-xs text-muted-foreground mt-1 text-right">
                              {replyText.length}/160 characters
                            </div>
                          </div>
                        </>
                      ) : (
                        <div className="flex-1 flex items-center justify-center text-muted-foreground">
                          <div className="text-center">
                            <MessageSquare className="h-16 w-16 mx-auto mb-4 opacity-50" />
                            <p className="text-lg font-medium">Select a conversation</p>
                            <p className="text-sm">Choose a message from the list to view the thread</p>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* SMS Compose Tab */}
            <TabsContent value="compose" className="space-y-4" data-testid="content-sms-compose">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <MessageSquare className="h-5 w-5" />
                    <span>Compose SMS</span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium mb-2">Recipient</label>
                    <Select>
                      <SelectTrigger data-testid="select-recipient">
                        <SelectValue placeholder="Select recipient" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="individual">Individual Contact</SelectItem>
                        <SelectItem value="group">Notification Group</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium mb-2">Message</label>
                    <textarea 
                      className="w-full p-3 border rounded-md resize-none"
                      rows={4}
                      placeholder="Type your message here..."
                      data-testid="textarea-sms-message"
                    />
                    <div className="text-right text-sm text-muted-foreground mt-1">
                      0/160 characters
                    </div>
                  </div>
                  
                  <div className="flex justify-end space-x-2">
                    <Button variant="outline" data-testid="button-save-draft">Save Draft</Button>
                    <Button data-testid="button-send-sms">Send Message</Button>
                  </div>
                </CardContent>
              </Card>
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

      {/* Message Reply Dialog */}
      <Dialog open={isMessageDialogOpen} onOpenChange={setIsMessageDialogOpen}>
        <DialogContent className="max-w-2xl" data-testid="dialog-message-reply">
          <DialogHeader>
            <DialogTitle className="flex items-center space-x-2">
              <MessageSquare className="h-5 w-5" />
              <span>Message Details & Reply</span>
            </DialogTitle>
          </DialogHeader>
          
          {selectedMessage && (
            <div className="space-y-4">
              {/* Message Details */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Original Message</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex items-start justify-between">
                    <div className="space-y-1">
                      <div className="text-sm text-muted-foreground">From:</div>
                      <div className="font-medium" data-testid="text-message-from">
                        {selectedMessage.fromAddress}
                      </div>
                    </div>
                    <div className="flex items-center space-x-1">
                      {selectedMessage.direction === 'inbound' ? (
                        <ArrowDownLeft className="h-4 w-4 text-green-500" />
                      ) : (
                        <ArrowUpRight className="h-4 w-4 text-blue-500" />
                      )}
                      <Badge variant="outline" className="text-xs">
                        {selectedMessage.type.toUpperCase()}
                      </Badge>
                    </div>
                  </div>
                  
                  <div className="space-y-1">
                    <div className="text-sm text-muted-foreground">Received:</div>
                    <div className="text-sm" data-testid="text-message-date">
                      {format(new Date(selectedMessage.sentAt), "MMMM d, yyyy 'at' h:mm a")}
                    </div>
                  </div>
                  
                  <div className="space-y-1">
                    <div className="text-sm text-muted-foreground">Message:</div>
                    <div 
                      className="p-3 bg-muted rounded-lg text-sm" 
                      data-testid="text-message-content"
                    >
                      {selectedMessage.content}
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Reply Form */}
              {selectedMessage.direction === 'inbound' && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Send Reply</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium mb-2">
                        Reply to: {selectedMessage.fromAddress}
                      </label>
                      <Textarea
                        value={replyText}
                        onChange={(e) => setReplyText(e.target.value)}
                        placeholder="Type your reply here..."
                        rows={4}
                        data-testid="textarea-reply-message"
                        className="resize-none"
                      />
                      <div className="text-right text-sm text-muted-foreground mt-1">
                        {replyText.length}/160 characters
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          )}

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setIsMessageDialogOpen(false);
                setReplyText("");
              }}
              data-testid="button-cancel-reply"
            >
              Close
            </Button>
            {selectedMessage?.direction === 'inbound' && (
              <Button
                onClick={() => {
                  if (selectedMessage && replyText.trim()) {
                    sendReplyMutation.mutate({
                      to: selectedMessage.fromAddress,
                      body: replyText.trim()
                    });
                  }
                }}
                disabled={!replyText.trim() || sendReplyMutation.isPending}
                data-testid="button-send-reply"
              >
                <Send className="h-4 w-4 mr-2" />
                {sendReplyMutation.isPending ? "Sending..." : "Send Reply"}
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}