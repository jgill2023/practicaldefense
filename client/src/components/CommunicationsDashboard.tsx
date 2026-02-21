import { useState, useEffect, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useLocation } from "wouter";
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
import { hasInstructorPrivileges } from "@/lib/authUtils";
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
  Reply,
  List,
  Calendar,
  Users,
  Plus,
  ArrowLeft,
  Edit,
  Trash2,
  UserPlus,
  UserMinus,
  CheckCircle,
  XCircle,
  BarChart3,
  Tag,
  Paperclip,
  X,
  FileText,
  Image as ImageIcon,
  Bell
} from "lucide-react";
import { ObjectUploader } from "@/components/ObjectUploader";
import { format } from "date-fns";
import type { SmsList } from "@db/schema";
import ReactQuill from "react-quill";
import "react-quill/dist/quill.snow.css";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/hooks/useAuth";
import { NotificationsManagement } from "@/components/NotificationsManagement";
import { CreditMeter } from "@/components/CreditMeter";
import { PurchaseCreditsDialog } from "@/components/PurchaseCreditsDialog";

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
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const [activeSection, setActiveSection] = useState("sms-management");
  const [activeEmailTab, setActiveEmailTab] = useState("templates");
  const [activeSMSTab, setActiveSMSTab] = useState<"inbox" | "compose" | "contacts" | "templates" | "lists">("inbox");
  const [isCreateListDialogOpen, setIsCreateListDialogOpen] = useState(false);
  const [listSearchTerm, setListSearchTerm] = useState("");
  const [newListName, setNewListName] = useState("");
  const [newListDescription, setNewListDescription] = useState("");
  const [newListTags, setNewListTags] = useState("");
  const [filters, setFilters] = useState<Filters>({
    page: 1,
    limit: 50
  });
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedMessage, setSelectedMessage] = useState<Communication | null>(null);
  const [isMessageDialogOpen, setIsMessageDialogOpen] = useState(false);
  const [replyText, setReplyText] = useState("");
  const [selectedConversation, setSelectedConversation] = useState<string | null>(null);

  // List detail view state
  const [selectedListId, setSelectedListId] = useState<string | null>(null);
  const [activeListTab, setActiveListTab] = useState<"students" | "broadcasts" | "details">("students");
  const [studentSearchTerm, setStudentSearchTerm] = useState("");
  const [isAddStudentsDialogOpen, setIsAddStudentsDialogOpen] = useState(false);
  const [selectedStudentsToAdd, setSelectedStudentsToAdd] = useState<string[]>([]);
  const [studentToRemove, setStudentToRemove] = useState<string | null>(null);
  const [addStudentSearchTerm, setAddStudentSearchTerm] = useState("");
  const [isEditListDialogOpen, setIsEditListDialogOpen] = useState(false);
  const [isDeleteListDialogOpen, setIsDeleteListDialogOpen] = useState(false);
  const [editListName, setEditListName] = useState("");
  const [editListDescription, setEditListDescription] = useState("");
  const [editListTags, setEditListTags] = useState("");

  // SMS Template state
  const [isCreateTemplateDialogOpen, setIsCreateTemplateDialogOpen] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<any>(null);
  const [templateName, setTemplateName] = useState("");
  const [templateContent, setTemplateContent] = useState("");
  const [templateCategory, setTemplateCategory] = useState("announcement");
  const [templateImageUrl, setTemplateImageUrl] = useState<string | null>(null);
  const quillRef = useRef<ReactQuill>(null);

  // Broadcast composer state
  const [isComposerOpen, setIsComposerOpen] = useState(false);
  const [composerMode, setComposerMode] = useState<'create' | 'edit'>('create');
  const [selectedBroadcastId, setSelectedBroadcastId] = useState<string | null>(null);
  const [broadcastForm, setBroadcastForm] = useState({
    subject: "",
    messageContent: "",
    messagePlain: "",
    dynamicTags: [] as string[],
    attachmentUrls: [] as string[],
    scheduledFor: "" as string,
    isScheduled: false
  });
  const [isSendConfirmOpen, setIsSendConfirmOpen] = useState(false);
  const messageContentRef = useRef<HTMLTextAreaElement>(null);

  // Real-time notification state
  const [lastTotalCount, setLastTotalCount] = useState<number | null>(null);
  const [lastUnreadCount, setLastUnreadCount] = useState<number | null>(null);
  const [lastFlaggedCount, setLastFlaggedCount] = useState<number | null>(null);
  const hasMountedRef = useRef(false);
  const lastFiltersRef = useRef<string>('');
  const suppressNotificationsRef = useRef(false);

  // Credit system state
  const [isPurchaseCreditsDialogOpen, setIsPurchaseCreditsDialogOpen] = useState(false);

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

  // Query for SMS templates
  const { data: smsTemplates } = useQuery({
    queryKey: ['/api/admin/notification-templates'],
    enabled: hasInstructorPrivileges(user),
  });

  // Mutations for status changes
  const markAsReadMutation = useMutation({
    mutationFn: (id: string) => apiRequest('PATCH', `/api/communications/${id}/read`),
    onSuccess: () => {
      suppressNotificationsRef.current = true;
      queryClient.invalidateQueries({ queryKey: ['/api/communications'] });
      queryClient.invalidateQueries({ queryKey: ['/api/communications/counts'] });
      // No toast notification for marking as read (silent operation)
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
    onSuccess: (data, variables) => {
      suppressNotificationsRef.current = true;

      // Auto-mark all unread inbound messages as read when replying
      if (selectedConversation) {
        const messages = getConversationMessages(selectedConversation);
        const unreadMessages = messages.filter(m => !m.isRead && m.direction === 'inbound');
        unreadMessages.forEach(msg => markAsReadMutation.mutate(msg.id));
      }

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

  const createTemplateMutation = useMutation({
    mutationFn: ({ name, content, imageUrl, type, category, createdBy }: { 
      name: string; 
      content: string; 
      imageUrl: string | null; 
      type: 'sms'; 
      category: string;
      createdBy: string;
    }) =>
      apiRequest('POST', '/api/admin/notification-templates', { 
        name, 
        content, 
        imageUrl, 
        type, 
        category,
        createdBy 
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/notification-templates'] });
      toast({ title: "Success", description: "SMS template created successfully" });
      setTemplateName("");
      setTemplateContent("");
      setTemplateCategory("announcement");
      setTemplateImageUrl(null);
      setEditingTemplate(null);
      setIsCreateTemplateDialogOpen(false);
    },
    onError: (error: any) => {
      toast({ 
        title: "Error", 
        description: error?.message || "Failed to create template", 
        variant: "destructive" 
      });
    }
  });

  const updateTemplateMutation = useMutation({
    mutationFn: ({ id, name, content, imageUrl, category }: { 
      id: string;
      name: string; 
      content: string; 
      imageUrl: string | null; 
      category: string;
    }) =>
      apiRequest('PUT', `/api/admin/notification-templates/${id}`, { 
        name, 
        content, 
        imageUrl, 
        category
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/notification-templates'] });
      toast({ title: "Success", description: "SMS template updated successfully" });
      setTemplateName("");
      setTemplateContent("");
      setTemplateCategory("announcement");
      setTemplateImageUrl(null);
      setEditingTemplate(null);
      setIsCreateTemplateDialogOpen(false);
    },
    onError: (error: any) => {
      toast({ 
        title: "Error", 
        description: error?.message || "Failed to update template", 
        variant: "destructive" 
      });
    }
  });

  const deleteTemplateMutation = useMutation({
    mutationFn: (id: string) =>
      apiRequest('DELETE', `/api/admin/notification-templates/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/notification-templates'] });
      toast({ title: "Success", description: "SMS template deleted successfully" });
    },
    onError: (error: any) => {
      toast({ 
        title: "Error", 
        description: error?.message || "Failed to delete template", 
        variant: "destructive" 
      });
    }
  });

  // Query for SMS Lists with student counts
  const { data: smsLists, isLoading: isLoadingLists } = useQuery<Array<SmsList & { memberCount: number }>>({
    queryKey: ['/api/sms-lists'],
    enabled: activeSMSTab === 'lists',
  });

  // Query for list details with students and broadcasts
  const { data: listDetails, isLoading: isLoadingDetails } = useQuery({
    queryKey: ['/api/sms-lists', selectedListId],
    enabled: !!selectedListId,
  });

  // Query for list students
  const { data: listStudents, isLoading: isLoadingStudents } = useQuery({
    queryKey: ['/api/sms-lists', selectedListId, 'members'],
    enabled: !!selectedListId,
  });

  // Query for list broadcasts
  const { data: listBroadcasts, isLoading: isLoadingBroadcasts } = useQuery({
    queryKey: ['/api/sms-lists', selectedListId, 'broadcasts'],
    enabled: !!selectedListId,
  });

  // Query for available students to add
  const { data: studentsData, isLoading: isLoadingAvailableStudents } = useQuery({
    queryKey: ['/api/students'],
    enabled: isAddStudentsDialogOpen,
  });

  // Flatten students data for the Add Students modal
  const availableStudents = studentsData ? [
    ...(studentsData.current || []),
    ...(studentsData.former || []),
    ...(studentsData.held || [])
  ].filter((student, index, self) => 
    // Remove duplicates by student ID
    index === self.findIndex(s => s.id === student.id)
  ).map(student => ({
    id: student.id,
    firstName: student.firstName,
    lastName: student.lastName,
    email: student.email,
    phone: student.phone
  })) : [];

  // Create list mutation
  const createListMutation = useMutation({
    mutationFn: (data: { name: string; description?: string; tags?: string[] }) =>
      apiRequest('POST', '/api/sms-lists', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/sms-lists'] });
      toast({ title: "Success", description: "SMS list created successfully" });
      setIsCreateListDialogOpen(false);
      setNewListName("");
      setNewListDescription("");
      setNewListTags("");
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error?.message || "Failed to create SMS list",
        variant: "destructive"
      });
    }
  });

  // Update list mutation
  const updateListMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: { name?: string; description?: string; tags?: string[] } }) =>
      apiRequest('PATCH', `/api/sms-lists/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/sms-lists'] });
      toast({ title: "Success", description: "List updated successfully" });
      setIsEditListDialogOpen(false);
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error?.message || "Failed to update list",
        variant: "destructive"
      });
    }
  });

  // Delete list mutation
  const deleteListMutation = useMutation({
    mutationFn: (id: string) => apiRequest('DELETE', `/api/sms-lists/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/sms-lists'] });
      toast({ title: "Success", description: "List deleted successfully" });
      setIsDeleteListDialogOpen(false);
      setSelectedListId(null);
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error?.message || "Failed to delete list",
        variant: "destructive"
      });
    }
  });

  // Toggle list active status mutation
  const toggleListActiveMutation = useMutation({
    mutationFn: ({ id, isActive }: { id: string; isActive: boolean }) =>
      apiRequest('PATCH', `/api/sms-lists/${id}`, { isActive }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/sms-lists'] });
      toast({ title: "Success", description: "List status updated" });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error?.message || "Failed to update list status",
        variant: "destructive"
      });
    }
  });

  // Add students mutation
  const addStudentsMutation = useMutation({
    mutationFn: ({ listId, userIds }: { listId: string; userIds: string[] }) =>
      apiRequest('POST', `/api/sms-lists/${listId}/members`, { userIds }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/sms-lists'] });
      toast({ title: "Success", description: "Students added successfully" });
      setIsAddStudentsDialogOpen(false);
      setSelectedStudentsToAdd([]);
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error?.message || "Failed to add students",
        variant: "destructive"
      });
    }
  });

  // Remove student mutation
  const removeStudentMutation = useMutation({
    mutationFn: ({ listId, userId }: { listId: string; userId: string }) =>
      apiRequest('DELETE', `/api/sms-lists/${listId}/members/${userId}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/sms-lists'] });
      toast({ title: "Success", description: "Student removed successfully" });
      setStudentToRemove(null);
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error?.message || "Failed to remove student",
        variant: "destructive"
      });
    }
  });

  // Broadcast mutations
  const createBroadcastMutation = useMutation({
    mutationFn: ({ listId, data }: { listId: string; data: any }) =>
      apiRequest('POST', `/api/sms-lists/${listId}/broadcasts`, data),
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error?.message || "Failed to save broadcast",
        variant: "destructive"
      });
    }
  });

  const updateBroadcastMutation = useMutation({
    mutationFn: ({ broadcastId, data }: { broadcastId: string; data: any }) =>
      apiRequest('PATCH', `/api/broadcasts/${broadcastId}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/sms-lists'] });
      toast({ title: "Success", description: "Broadcast updated successfully" });
      setIsComposerOpen(false);
      setBroadcastForm({ subject: "", messageContent: "", messagePlain: "", dynamicTags: [], attachmentUrls: [], scheduledFor: "", isScheduled: false });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error?.message || "Failed to update broadcast",
        variant: "destructive"
      });
    }
  });

  const sendBroadcastMutation = useMutation({
    mutationFn: (broadcastId: string) =>
      apiRequest('POST', `/api/broadcasts/${broadcastId}/send`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/sms-lists'] });
      toast({ title: "Success", description: "Broadcast sent successfully" });
      setIsSendConfirmOpen(false);
      setIsComposerOpen(false);
      setBroadcastForm({ subject: "", messageContent: "", messagePlain: "", dynamicTags: [], attachmentUrls: [], scheduledFor: "", isScheduled: false });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error?.message || "Failed to send broadcast",
        variant: "destructive"
      });
    }
  });

  // Helper functions for broadcast composer
  const insertTagAtCursor = (tag: string) => {
    if (!messageContentRef.current) return;

    const textarea = messageContentRef.current;
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const text = broadcastForm.messageContent;
    const before = text.substring(0, start);
    const after = text.substring(end);
    const newText = before + tag + after;

    setBroadcastForm(prev => ({ ...prev, messageContent: newText }));

    // Set cursor position after inserted tag
    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(start + tag.length, start + tag.length);
    }, 0);
  };

  const extractDynamicTags = (content: string): string[] => {
    const tagRegex = /\{\{(\w+)\}\}/g;
    const matches = content.match(tagRegex) || [];
    return [...new Set(matches)]; // Remove duplicates
  };

  const getPreviewMessage = (content: string): string => {
    const sampleData: { [key: string]: string } = {
      '{{firstName}}': 'John',
      '{{lastName}}': 'Doe',
      '{{email}}': 'john.doe@example.com',
      '{{courseName}}': 'Defensive Handgun Course',
      '{{scheduleDate}}': 'Jan 15, 2025'
    };

    let preview = content;
    Object.entries(sampleData).forEach(([tag, value]) => {
      preview = preview.replace(new RegExp(tag, 'g'), value);
    });
    return preview;
  };

  const getCharacterCount = (text: string) => {
    const count = text.length;
    if (count <= 160) {
      return { count, messages: 1, color: 'text-green-600' };
    } else if (count <= 320) {
      return { count, messages: 2, color: 'text-yellow-600' };
    } else {
      return { count, messages: Math.ceil(count / 153), color: 'text-red-600' };
    }
  };

  // Update messagePlain and dynamicTags when messageContent changes
  useEffect(() => {
    const plainText = broadcastForm.messageContent; // For SMS, just use plain text
    const tags = extractDynamicTags(broadcastForm.messageContent);
    setBroadcastForm(prev => ({ 
      ...prev, 
      messagePlain: plainText,
      dynamicTags: tags 
    }));
  }, [broadcastForm.messageContent]);

  // Handle real-time notifications when data changes
  useEffect(() => {
    if (!communicationsData || !communicationsData.data) {
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
    const emailData = (communicationsData?.data || []).filter(c => c.type === 'email');
    return {
      inbox: emailData.filter(c => c.direction === 'inbound').length, // Only inbound messages in inbox
      all: emailData.filter(c => c.direction === 'inbound').length, // Alias for inbox during transition
      unread: emailData.filter(c => !c.isRead).length,
      sent: emailData.filter(c => c.direction === 'outbound').length,
      flagged: emailData.filter(c => c.isFlagged).length
    };
  };

  const getSMSCounts = () => {
    const smsData = (communicationsData?.data || []).filter(c => c.type === 'sms');
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
    studentName: string;
    recentCourseInfo: string;
    messages: Communication[];
    lastMessage: Communication;
    unreadCount: number;
  }

  const getSMSConversations = (): Conversation[] => {
    const smsData = (communicationsData?.data || []).filter(c => c.type === 'sms');
    const conversationMap = new Map<string, Communication[]>();

    // Normalize phone number by removing all non-digits
    const normalizePhone = (phone: string) => phone.replace(/\D/g, '');

    // Group messages by phone number (use the "other" party's number)
    smsData.forEach(msg => {
      const rawPhoneNumber = msg.direction === 'inbound' ? msg.fromAddress : msg.toAddress;
      const phoneNumber = normalizePhone(rawPhoneNumber);
      const existing = conversationMap.get(phoneNumber) || [];
      conversationMap.set(phoneNumber, [...existing, msg]);
    });

    // Convert to array and sort each conversation by date
    const conversations: Conversation[] = Array.from(conversationMap.entries()).map(([phoneNumber, messages]) => {
      const sorted = messages.sort((a, b) => new Date(b.sentAt).getTime() - new Date(a.sentAt).getTime());

      // Get student name from the most recent message with user data
      const messageWithUser = sorted.find(m => m.user);
      const user = messageWithUser?.user;
      const studentName = user ? `${user.firstName} ${user.lastName}` : phoneNumber;

      // Get most recent course info from enrollment data
      let recentCourseInfo = '';
      if (messageWithUser?.enrollment?.course && messageWithUser?.enrollment?.schedule) {
        const course = messageWithUser.enrollment.course;
        const schedule = messageWithUser.enrollment.schedule;
        const abbreviation = course.abbreviation || course.name.substring(0, 3).toUpperCase();
        const scheduleDate = format(new Date(schedule.startDate), 'MMM d');
        recentCourseInfo = `${scheduleDate} ${abbreviation}`;
      }

      return {
        phoneNumber,
        studentName,
        recentCourseInfo,
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
    const normalizePhone = (phone: string) => phone.replace(/\D/g, '');
    const normalizedPhone = normalizePhone(phoneNumber);

    return smsData
      .filter(msg => 
        (msg.direction === 'inbound' && normalizePhone(msg.fromAddress) === normalizedPhone) ||
        (msg.direction === 'outbound' && normalizePhone(msg.toAddress) === normalizedPhone)
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

      {/* Credit Meter */}
      {user && hasInstructorPrivileges(user) && (
        <CreditMeter onPurchaseClick={() => setIsPurchaseCreditsDialogOpen(true)} />
      )}

      {/* Purchase Credits Dialog */}
      {user && hasInstructorPrivileges(user) && (
        <PurchaseCreditsDialog
          open={isPurchaseCreditsDialogOpen}
          onOpenChange={setIsPurchaseCreditsDialogOpen}
        />
      )}

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

      {/* Main sections for SMS Management, Email Templates, and Notifications */}
      <Tabs value={activeSection} onValueChange={setActiveSection} className="w-full">
        <TabsList className="grid w-full grid-cols-3 h-auto">
          <TabsTrigger value="sms-management" data-testid="tab-section-sms-management" className="text-xs sm:text-sm px-2 py-2">
            <MessageSquare className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2 flex-shrink-0" />
            <span className="truncate">SMS Management</span>
          </TabsTrigger>
          <TabsTrigger value="email-templates" data-testid="tab-section-email-templates" className="text-xs sm:text-sm px-2 py-2">
            <Mail className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2 flex-shrink-0" />
            <span className="truncate">Email Templates</span>
          </TabsTrigger>
          <TabsTrigger value="notifications" data-testid="tab-section-notifications" className="text-xs sm:text-sm px-2 py-2">
            <Bell className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2 flex-shrink-0" />
            <span className="truncate">Notifications</span>
          </TabsTrigger>
        </TabsList>

        {/* Email Templates Section */}
        <TabsContent value="email-templates" className="space-y-4" data-testid="content-section-email-templates">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <Mail className="h-5 w-5" />
                  <span>Email Templates</span>
                </div>
                <Button 
                  size="sm" 
                  onClick={() => {
                    window.location.href = "/course-management#notifications";
                  }}
                  data-testid="button-create-email-template"
                >
                  Manage Templates
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
                    <div className="flex space-x-2 justify-center">
                      <Button 
                        variant="outline" 
                        size="sm" 
                        onClick={() => {
                          toast({
                            title: "Template Management",
                            description: "Email template editing is available in Course Management > Notifications tab",
                          });
                          setLocation("/course-management?tab=notifications");
                        }}
                        data-testid="button-edit-template-registration"
                      >
                        <Edit className="h-4 w-4 mr-1" />
                        Edit
                      </Button>
                      <Button 
                        variant="outline" 
                        size="sm" 
                        onClick={() => {
                          toast({
                            title: "Template Management",
                            description: "Email template previewing is available in Course Management > Notifications tab",
                          });
                          setLocation("/course-management?tab=notifications");
                        }}
                        data-testid="button-preview-template-registration"
                      >
                        <Eye className="h-4 w-4 mr-1" />
                        Preview
                      </Button>
                    </div>
                  </CardContent>
                </Card>

                <Card className="border-dashed">
                  <CardContent className="p-6 text-center">
                    <Clock className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                    <h3 className="font-medium mb-2">Course Reminder</h3>
                    <p className="text-sm text-muted-foreground mb-4">Sent 24 hours before course starts</p>
                    <div className="flex space-x-2 justify-center">
                      <Button 
                        variant="outline" 
                        size="sm" 
                        onClick={() => {
                          toast({
                            title: "Template Management",
                            description: "Email template editing is available in Course Management > Notifications tab",
                          });
                          setLocation("/course-management?tab=notifications");
                        }}
                        data-testid="button-edit-template-reminder"
                      >
                        <Edit className="h-4 w-4 mr-1" />
                        Edit
                      </Button>
                      <Button 
                        variant="outline" 
                        size="sm" 
                        onClick={() => {
                          toast({
                            title: "Template Management",
                            description: "Email template previewing is available in Course Management > Notifications tab",
                          });
                          setLocation("/course-management?tab=notifications");
                        }}
                        data-testid="button-preview-template-reminder"
                      >
                        <Eye className="h-4 w-4 mr-1" />
                        Preview
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Notifications Section */}
        <TabsContent value="notifications" className="space-y-4" data-testid="content-section-notifications">
          <NotificationsManagement />
        </TabsContent>

        {/* SMS Management Section */}
        <TabsContent value="sms-management" className="space-y-4" data-testid="content-section-sms-management">
          <Tabs value={activeSMSTab} onValueChange={setActiveSMSTab} className="w-full">
            <TabsList className="grid w-full grid-cols-5">
              <TabsTrigger value="inbox" data-testid="tab-sms-inbox">
                <MessageSquare className="h-4 w-4 mr-2" />
                Inbox
              </TabsTrigger>
              <TabsTrigger value="compose" data-testid="tab-sms-compose">
                <MessageSquare className="h-4 w-4 mr-2" />
                Compose
              </TabsTrigger>
              <TabsTrigger value="lists" data-testid="tab-sms-lists">
                <List className="h-4 w-4 mr-2" />
                Lists
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
                    <Button 
                      size="sm" 
                      onClick={() => setIsCreateTemplateDialogOpen(true)}
                      data-testid="button-create-sms-template"
                    >
                      Create Template
                    </Button>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {!smsTemplates || smsTemplates.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      <MessageSquare className="h-12 w-12 mx-auto mb-4" />
                      <p>Create and manage SMS templates for course notifications and reminders.</p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {smsTemplates.map((template: any) => (
                        <div
                          key={template.id}
                          className="flex items-start justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors"
                          data-testid={`template-${template.id}`}
                        >
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2">
                              <h3 className="font-semibold">{template.name}</h3>
                              <Badge variant="secondary" className="text-xs">
                                {template.category}
                              </Badge>
                            </div>
                            <div 
                              className="text-sm text-muted-foreground prose prose-sm max-w-none"
                              dangerouslySetInnerHTML={{ __html: template.content }}
                            />
                            {template.imageUrl && (
                              <div className="mt-2">
                                <img 
                                  src={template.imageUrl} 
                                  alt={template.name}
                                  className="max-w-[200px] max-h-[200px] object-contain rounded"
                                />
                              </div>
                            )}
                          </div>
                          <div className="flex items-center gap-2 ml-4">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                setEditingTemplate(template);
                                setTemplateName(template.name);
                                setTemplateContent(template.content);
                                setTemplateCategory(template.category);
                                setTemplateImageUrl(template.imageUrl);
                                setIsCreateTemplateDialogOpen(true);
                              }}
                              data-testid={`button-edit-template-${template.id}`}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                if (confirm('Are you sure you want to delete this template?')) {
                                  deleteTemplateMutation.mutate(template.id);
                                }
                              }}
                              data-testid={`button-delete-template-${template.id}`}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
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
                              onClick={() => {
                                setSelectedConversation(conversation.phoneNumber);
                                // Auto-mark all unread inbound messages as read when clicking into conversation
                                const messages = getConversationMessages(conversation.phoneNumber);
                                const unreadMessages = messages.filter(m => !m.isRead && m.direction === 'inbound');
                                unreadMessages.forEach(msg => markAsReadMutation.mutate(msg.id));
                              }}
                              className={`p-4 border-b cursor-pointer hover:bg-muted/50 transition-colors ${
                                selectedConversation === conversation.phoneNumber ? 'bg-muted' : ''
                              }`}
                              data-testid={`conversation-${conversation.phoneNumber}`}
                            >
                              <div className="flex items-start justify-between mb-1">
                                <div className="flex-1 min-w-0">
                                  <div className="font-medium text-sm truncate">
                                    {conversation.studentName}
                                  </div>
                                  {conversation.recentCourseInfo && (
                                    <div className="text-xs text-muted-foreground truncate">
                                      {conversation.recentCourseInfo}
                                    </div>
                                  )}
                                </div>
                                <div className="text-xs text-muted-foreground ml-2 flex-shrink-0">
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
                              <div>
                                <h3 className="font-semibold">
                                  {getSMSConversations().find(c => c.phoneNumber === selectedConversation)?.studentName || selectedConversation}
                                </h3>
                                {getSMSConversations().find(c => c.phoneNumber === selectedConversation)?.recentCourseInfo && (
                                  <div className="text-xs text-muted-foreground">
                                    {getSMSConversations().find(c => c.phoneNumber === selectedConversation)?.recentCourseInfo}
                                  </div>
                                )}
                              </div>
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

            {/* SMS Lists Tab */}
            <TabsContent value="lists" className="space-y-4" data-testid="content-sms-lists">
              {!selectedListId ? (
                <Card>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <CardTitle className="flex items-center space-x-2">
                        <List className="h-5 w-5" />
                        <span>SMS Lists</span>
                      </CardTitle>
                      <Button 
                        onClick={() => setIsCreateListDialogOpen(true)}
                        data-testid="button-create-list"
                      >
                        <Plus className="h-4 w-4 mr-2" />
                        Create List
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                  {/* Search Bar */}
                  <div className="flex items-center space-x-2">
                    <div className="relative flex-1">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        placeholder="Search lists by name..."
                        value={listSearchTerm}
                        onChange={(e) => setListSearchTerm(e.target.value)}
                        className="pl-9"
                        data-testid="input-search-lists"
                      />
                    </div>
                  </div>

                  {/* Loading State */}
                  {isLoadingLists && (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {[1, 2, 3].map((i) => (
                        <Card key={i} className="animate-pulse">
                          <CardContent className="p-6">
                            <div className="h-4 bg-muted rounded w-3/4 mb-3"></div>
                            <div className="h-3 bg-muted rounded w-1/2 mb-2"></div>
                            <div className="h-3 bg-muted rounded w-2/3"></div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  )}

                  {/* Empty State */}
                  {!isLoadingLists && (!smsLists || smsLists.length === 0) && (
                    <div className="text-center py-12">
                      <List className="h-16 w-16 mx-auto mb-4 text-muted-foreground opacity-50" />
                      <h3 className="text-lg font-medium text-muted-foreground mb-2">No SMS Lists</h3>
                      <p className="text-sm text-muted-foreground mb-4">
                        Create your first SMS list to start organizing contacts for broadcast messaging
                      </p>
                      <Button onClick={() => setIsCreateListDialogOpen(true)} data-testid="button-create-first-list">
                        <Plus className="h-4 w-4 mr-2" />
                        Create Your First List
                      </Button>
                    </div>
                  )}

                  {/* Lists Grid */}
                  {!isLoadingLists && smsLists && smsLists.length > 0 && (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {smsLists
                        .filter(list => 
                          !listSearchTerm || 
                          list.name.toLowerCase().includes(listSearchTerm.toLowerCase()) ||
                          list.description?.toLowerCase().includes(listSearchTerm.toLowerCase())
                        )
                        .map((list) => (
                          <Card 
                            key={list.id} 
                            className="hover:shadow-md transition-shadow cursor-pointer"
                            onClick={() => setSelectedListId(list.id)}
                            data-testid={`card-list-${list.id}`}
                          >
                            <CardContent className="p-6">
                              {/* List Header */}
                              <div className="flex items-start justify-between mb-3">
                                <div className="flex items-center space-x-2">
                                  <List className="h-5 w-5 text-primary" />
                                  <h3 className="font-semibold text-lg truncate" data-testid={`text-list-name-${list.id}`}>
                                    {list.name}
                                  </h3>
                                </div>
                                {list.isActive ? (
                                  <Badge variant="default" className="text-xs" data-testid={`badge-active-${list.id}`}>
                                    Active
                                  </Badge>
                                ) : (
                                  <Badge variant="secondary" className="text-xs" data-testid={`badge-inactive-${list.id}`}>
                                    Inactive
                                  </Badge>
                                )}
                              </div>

                              {/* Description */}
                              {list.description && (
                                <p className="text-sm text-muted-foreground mb-3 line-clamp-2" data-testid={`text-description-${list.id}`}>
                                  {list.description}
                                </p>
                              )}

                              {/* Contact Count */}
                              <div className="flex items-center space-x-2 mb-3">
                                <Users className="h-4 w-4 text-muted-foreground" />
                                <span className="text-sm font-medium" data-testid={`text-member-count-${list.id}`}>
                                  {list.memberCount || 0} {list.memberCount === 1 ? 'contact' : 'contacts'}
                                </span>
                              </div>

                              {/* List Type Badge */}
                              <div className="mb-3">
                                {list.listType === 'course_schedule' ? (
                                  <Badge variant="outline" className="text-xs" data-testid={`badge-type-${list.id}`}>
                                    <Calendar className="h-3 w-3 mr-1" />
                                    Course Schedule
                                  </Badge>
                                ) : (
                                  <Badge variant="outline" className="text-xs" data-testid={`badge-type-${list.id}`}>
                                    Custom
                                  </Badge>
                                )}
                              </div>

                              {/* Tags */}
                              {list.tags && list.tags.length > 0 && (
                                <div className="flex flex-wrap gap-1 mb-3">
                                  {list.tags.map((tag, idx) => (
                                    <Badge key={idx} variant="secondary" className="text-xs" data-testid={`badge-tag-${list.id}-${idx}`}>
                                      {tag}
                                    </Badge>
                                  ))}
                                </div>
                              )}

                              {/* Date Created */}
                              <div className="text-xs text-muted-foreground flex items-center space-x-1" data-testid={`text-created-${list.id}`}>
                                <Clock className="h-3 w-3" />
                                <span>Created {format(new Date(list.createdAt), "MMM d, yyyy")}</span>
                              </div>
                            </CardContent>
                          </Card>
                        ))}
                    </div>
                  )}
                  </CardContent>
                </Card>
              ) : (
                // List Detail View
                <div className="space-y-4">
                  {isLoadingDetails ? (
                    <Card className="animate-pulse">
                      <CardContent className="p-6">
                        <div className="h-8 bg-muted rounded w-1/3 mb-4"></div>
                        <div className="h-4 bg-muted rounded w-2/3 mb-2"></div>
                        <div className="h-4 bg-muted rounded w-1/2"></div>
                      </CardContent>
                    </Card>
                  ) : listDetails && (
                    <>
                      {/* Header Section */}
                      <Card>
                        <CardContent className="p-6">
                          <div className="flex items-start justify-between mb-4">
                            <div className="flex items-center space-x-3">
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => {
                                  setSelectedListId(null);
                                  setActiveListTab("students");
                                }}
                                data-testid="button-back-to-lists"
                              >
                                <ArrowLeft className="h-4 w-4" />
                              </Button>
                              <div>
                                <h2 className="text-2xl font-bold" data-testid="text-list-detail-name">
                                  {listDetails.name}
                                </h2>
                                {listDetails.description && (
                                  <p className="text-muted-foreground mt-1" data-testid="text-list-detail-description">
                                    {listDetails.description}
                                  </p>
                                )}
                              </div>
                            </div>

                            <div className="flex items-center space-x-2">
                              {listDetails.listType === 'custom' && (
                                <>
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => {
                                      setEditListName(listDetails.name);
                                      setEditListDescription(listDetails.description || "");
                                      setEditListTags(listDetails.tags?.join(", ") || "");
                                      setIsEditListDialogOpen(true);
                                    }}
                                    data-testid="button-edit-list"
                                  >
                                    <Edit className="h-4 w-4 mr-2" />
                                    Edit
                                  </Button>
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => setIsDeleteListDialogOpen(true)}
                                    data-testid="button-delete-list"
                                  >
                                    <Trash2 className="h-4 w-4 mr-2" />
                                    Delete
                                  </Button>
                                </>
                              )}
                              <div className="flex items-center space-x-2">
                                <span className="text-sm text-muted-foreground">Active:</span>
                                <Button
                                  variant={listDetails.isActive ? "default" : "outline"}
                                  size="sm"
                                  onClick={() => {
                                    toggleListActiveMutation.mutate({
                                      id: listDetails.id,
                                      isActive: !listDetails.isActive
                                    });
                                  }}
                                  disabled={toggleListActiveMutation.isPending}
                                  data-testid="button-toggle-active"
                                >
                                  {listDetails.isActive ? "Active" : "Inactive"}
                                </Button>
                              </div>
                            </div>
                          </div>

                          {/* Stats Cards */}
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <Card>
                              <CardContent className="p-4">
                                <div className="flex items-center space-x-3">
                                  <div className="p-2 bg-blue-100 dark:bg-blue-900 rounded">
                                    <Users className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                                  </div>
                                  <div>
                                    <p className="text-sm text-muted-foreground">Total Contacts</p>
                                    <p className="text-2xl font-bold" data-testid="stat-total-contacts">
                                      {listStudents?.length || 0}
                                    </p>
                                  </div>
                                </div>
                              </CardContent>
                            </Card>

                            <Card>
                              <CardContent className="p-4">
                                <div className="flex items-center space-x-3">
                                  <div className="p-2 bg-green-100 dark:bg-green-900 rounded">
                                    <BarChart3 className="h-5 w-5 text-green-600 dark:text-green-400" />
                                  </div>
                                  <div>
                                    <p className="text-sm text-muted-foreground">Total Broadcasts</p>
                                    <p className="text-2xl font-bold" data-testid="stat-total-broadcasts">
                                      {listBroadcasts?.length || 0}
                                    </p>
                                  </div>
                                </div>
                              </CardContent>
                            </Card>

                            <Card>
                              <CardContent className="p-4">
                                <div className="flex items-center space-x-3">
                                  <div className="p-2 bg-purple-100 dark:bg-purple-900 rounded">
                                    <Clock className="h-5 w-5 text-purple-600 dark:text-purple-400" />
                                  </div>
                                  <div>
                                    <p className="text-sm text-muted-foreground">Last Broadcast</p>
                                    <p className="text-sm font-medium" data-testid="stat-last-broadcast">
                                      {listBroadcasts && listBroadcasts.length > 0
                                        ? format(new Date(listBroadcasts[0].sentAt || listBroadcasts[0].createdAt), "MMM d, yyyy")
                                        : "Never"}
                                    </p>
                                  </div>
                                </div>
                              </CardContent>
                            </Card>
                          </div>
                        </CardContent>
                      </Card>

                      {/* Tabbed Content */}
                      <Card>
                        <Tabs value={activeListTab} onValueChange={(v: any) => setActiveListTab(v)}>
                          <CardHeader>
                            <TabsList className="grid w-full max-w-md grid-cols-3">
                              <TabsTrigger value="students" data-testid="tab-students">
                                Students
                              </TabsTrigger>
                              <TabsTrigger value="broadcasts" data-testid="tab-broadcasts">
                                Broadcasts
                              </TabsTrigger>
                              <TabsTrigger value="details" data-testid="tab-details">
                                Details
                              </TabsTrigger>
                            </TabsList>
                          </CardHeader>

                          <CardContent>
                            {/* Students Tab */}
                            <TabsContent value="students" className="mt-0 space-y-4" data-testid="content-students">
                              <div className="flex items-center justify-between">
                                <div className="relative flex-1 max-w-sm">
                                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                  <Input
                                    placeholder="Search students..."
                                    value={studentSearchTerm}
                                    onChange={(e) => setStudentSearchTerm(e.target.value)}
                                    className="pl-9"
                                    data-testid="input-search-students"
                                  />
                                </div>
                                <Button
                                  onClick={() => setIsAddStudentsDialogOpen(true)}
                                  data-testid="button-add-students"
                                >
                                  <UserPlus className="h-4 w-4 mr-2" />
                                  Add Students
                                </Button>
                              </div>

                              {isLoadingStudents ? (
                                <div className="space-y-3">
                                  {[1, 2, 3].map((i) => (
                                    <div key={i} className="h-16 bg-muted rounded animate-pulse"></div>
                                  ))}
                                </div>
                              ) : !listStudents || listStudents.length === 0 ? (
                                <div className="text-center py-12">
                                  <Users className="h-16 w-16 mx-auto mb-4 text-muted-foreground opacity-50" />
                                  <h3 className="text-lg font-medium text-muted-foreground mb-2">No Students</h3>
                                  <p className="text-sm text-muted-foreground mb-4">
                                    Add students to this list to start broadcasting messages
                                  </p>
                                  <Button onClick={() => setIsAddStudentsDialogOpen(true)} data-testid="button-add-first-student">
                                    <UserPlus className="h-4 w-4 mr-2" />
                                    Add Students
                                  </Button>
                                </div>
                              ) : (
                                <div className="border rounded-lg overflow-hidden">
                                  <table className="w-full">
                                    <thead className="bg-muted">
                                      <tr>
                                        <th className="text-left p-3 text-sm font-medium">Name</th>
                                        <th className="text-left p-3 text-sm font-medium">Email</th>
                                        <th className="text-left p-3 text-sm font-medium">Phone</th>
                                        <th className="text-right p-3 text-sm font-medium">Actions</th>
                                      </tr>
                                    </thead>
                                    <tbody>
                                      {listStudents
                                        .filter((student: any) => {
                                          if (!studentSearchTerm) return true;
                                          const searchLower = studentSearchTerm.toLowerCase();
                                          const firstName = student.user?.firstName?.toLowerCase() || '';
                                          const lastName = student.user?.lastName?.toLowerCase() || '';
                                          const fullName = `${firstName} ${lastName}`.trim();
                                          const email = student.user?.email?.toLowerCase() || '';

                                          return fullName.includes(searchLower) || email.includes(searchLower);
                                        })
                                        .map((student: any, idx: number) => (
                                          <tr
                                            key={student.id}
                                            className="border-t hover:bg-muted/50"
                                            data-testid={`row-student-${idx}`}
                                          >
                                            <td className="p-3">
                                              <div className="font-medium" data-testid={`text-student-name-${idx}`}>
                                                {student.user?.firstName && student.user?.lastName 
                                                  ? `${student.user.firstName} ${student.user.lastName}`
                                                  : student.user?.email || "Unknown"}
                                              </div>
                                            </td>
                                            <td className="p-3 text-sm text-muted-foreground" data-testid={`text-student-email-${idx}`}>
                                              {student.user?.email || "-"}
                                            </td>
                                            <td className="p-3 text-sm text-muted-foreground" data-testid={`text-student-phone-${idx}`}>
                                              {student.user?.phone || "-"}
                                            </td>
                                            <td className="p-3 text-right">
                                              <Button
                                                variant="ghost"
                                                size="sm"
                                                onClick={() => setStudentToRemove(student.userId)}
                                                disabled={
                                                  (listDetails.listType === 'course_schedule' && student.autoAdded) ||
                                                  removeStudentMutation.isPending
                                                }
                                                data-testid={`button-remove-student-${idx}`}
                                              >
                                                <UserMinus className="h-4 w-4 mr-1" />
                                                Remove
                                              </Button>
                                            </td>
                                          </tr>
                                        ))}
                                    </tbody>
                                  </table>
                                </div>
                              )}
                            </TabsContent>

                            {/* Broadcasts Tab */}
                            <TabsContent value="broadcasts" className="mt-0 space-y-4" data-testid="content-broadcasts">
                              <div className="flex items-center justify-between">
                                <h3 className="text-lg font-semibold">Broadcasts</h3>
                                <Button
                                  onClick={() => {
                                    setComposerMode('create');
                                    setSelectedBroadcastId(null);
                                    setBroadcastForm({ subject: "", messageContent: "", messagePlain: "", dynamicTags: [], attachmentUrls: [], scheduledFor: "", isScheduled: false });
                                    setIsComposerOpen(true);
                                  }}
                                  data-testid="button-new-broadcast"
                                >
                                  <Plus className="h-4 w-4 mr-2" />
                                  New Broadcast
                                </Button>
                              </div>

                              {isLoadingBroadcasts ? (
                                <div className="space-y-3">
                                  {[1, 2, 3].map((i) => (
                                    <div key={i} className="h-24 bg-muted rounded animate-pulse"></div>
                                  ))}
                                </div>
                              ) : !listBroadcasts || listBroadcasts.length === 0 ? (
                                <div className="text-center py-12">
                                  <MessageSquare className="h-16 w-16 mx-auto mb-4 text-muted-foreground opacity-50" />
                                  <h3 className="text-lg font-medium text-muted-foreground mb-2">No Broadcasts</h3>
                                  <p className="text-sm text-muted-foreground mb-4">
                                    No broadcast messages have been sent to this list yet
                                  </p>
                                  <Button
                                    onClick={() => {
                                      setComposerMode('create');
                                      setSelectedBroadcastId(null);
                                      setBroadcastForm({ subject: "", messageContent: "", messagePlain: "", dynamicTags: [], attachmentUrls: [], scheduledFor: "", isScheduled: false });
                                      setIsComposerOpen(true);
                                    }}
                                    data-testid="button-create-first-broadcast"
                                  >
                                    <Plus className="h-4 w-4 mr-2" />
                                    Create Your First Broadcast
                                  </Button>
                                </div>
                              ) : (
                                <div className="space-y-3">
                                  {listBroadcasts.map((broadcast: any, idx: number) => (
                                    <Card key={broadcast.id} data-testid={`card-broadcast-${idx}`}>
                                      <CardContent className="p-4">
                                        <div className="flex items-start justify-between mb-2">
                                          <div className="flex-1">
                                            <h4 className="font-semibold" data-testid={`text-broadcast-subject-${idx}`}>
                                              {broadcast.subject || "Broadcast Message"}
                                            </h4>
                                            <p className="text-sm text-muted-foreground mt-1 line-clamp-2" data-testid={`text-broadcast-preview-${idx}`}>
                                              {broadcast.messagePlain}
                                            </p>
                                          </div>
                                          <Badge
                                            variant={
                                              broadcast.status === 'sent' ? 'default' :
                                              broadcast.status === 'sending' ? 'secondary' :
                                              broadcast.status === 'failed' ? 'destructive' :
                                              'outline'
                                            }
                                            data-testid={`badge-broadcast-status-${idx}`}
                                          >
                                            {broadcast.status}
                                          </Badge>
                                        </div>

                                        <div className="flex items-center space-x-4 text-sm text-muted-foreground">
                                          <div className="flex items-center space-x-1">
                                            <Clock className="h-3 w-3" />
                                            <span data-testid={`text-broadcast-date-${idx}`}>
                                              {format(new Date(broadcast.sentAt || broadcast.createdAt), "MMM d, yyyy h:mm a")}
                                            </span>
                                          </div>
                                          <div className="flex items-center space-x-1">
                                            <Users className="h-3 w-3" />
                                            <span data-testid={`text-broadcast-recipients-${idx}`}>
                                              {broadcast.totalRecipients || 0} recipients
                                            </span>
                                          </div>
                                          {broadcast.attachmentUrls && broadcast.attachmentUrls.length > 0 && (
                                            <div className="flex items-center space-x-1">
                                              <Paperclip className="h-3 w-3" />
                                              <span data-testid={`text-broadcast-attachments-${idx}`}>
                                                {broadcast.attachmentUrls.length} attachment{broadcast.attachmentUrls.length !== 1 ? 's' : ''}
                                              </span>
                                            </div>
                                          )}
                                          {broadcast.successCount !== undefined && (
                                            <>
                                              <div className="flex items-center space-x-1">
                                                <CheckCircle className="h-3 w-3 text-green-600" />
                                                <span data-testid={`text-broadcast-success-${idx}`}>
                                                  {broadcast.successCount} sent
                                                </span>
                                              </div>
                                              <div className="flex items-center space-x-1">
                                                <XCircle className="h-3 w-3 text-red-600" />
                                                <span data-testid={`text-broadcast-failed-${idx}`}>
                                                  {broadcast.failedCount} failed
                                                </span>
                                              </div>
                                            </>
                                          )}
                                        </div>
                                      </CardContent>
                                    </Card>
                                  ))}
                                </div>
                              )}
                            </TabsContent>

                            {/* Details Tab */}
                            <TabsContent value="details" className="mt-0 space-y-4" data-testid="content-details">
                              <div className="space-y-4">
                                <div>
                                  <label className="text-sm font-medium text-muted-foreground">List Type</label>
                                  <div className="mt-1">
                                    {listDetails.listType === 'course_schedule' ? (
                                      <Badge variant="outline" data-testid="badge-detail-type">
                                        <Calendar className="h-3 w-3 mr-1" />
                                        Course Schedule
                                      </Badge>
                                    ) : (
                                      <Badge variant="outline" data-testid="badge-detail-type">
                                        Custom
                                      </Badge>
                                    )}
                                  </div>
                                </div>

                                <div>
                                  <label className="text-sm font-medium text-muted-foreground">Created</label>
                                  <p className="mt-1" data-testid="text-detail-created">
                                    {format(new Date(listDetails.createdAt), "MMMM d, yyyy 'at' h:mm a")}
                                  </p>
                                </div>

                                {listDetails.updatedAt && (
                                  <div>
                                    <label className="text-sm font-medium text-muted-foreground">Last Updated</label>
                                    <p className="mt-1" data-testid="text-detail-updated">
                                      {format(new Date(listDetails.updatedAt), "MMMM d, yyyy 'at' h:mm a")}
                                    </p>
                                  </div>
                                )}

                                <div>
                                  <div className="flex items-center justify-between mb-2">
                                    <label className="text-sm font-medium text-muted-foreground">Tags</label>
                                    {listDetails.listType === 'custom' && (
                                      <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => {
                                          setEditListTags(listDetails.tags?.join(", ") || "");
                                          setIsEditListDialogOpen(true);
                                        }}
                                        data-testid="button-edit-tags"
                                      >
                                        <Edit className="h-3 w-3 mr-1" />
                                        Edit Tags
                                      </Button>
                                    )}
                                  </div>
                                  <div className="flex flex-wrap gap-2">
                                    {listDetails.tags && listDetails.tags.length > 0 ? (
                                      listDetails.tags.map((tag: string, idx: number) => (
                                        <Badge key={idx} variant="secondary" data-testid={`badge-detail-tag-${idx}`}>
                                          <Tag className="h-3 w-3 mr-1" />
                                          {tag}
                                        </Badge>
                                      ))
                                    ) : (
                                      <p className="text-sm text-muted-foreground">No tags</p>
                                    )}
                                  </div>
                                </div>

                                {listDetails.listType === 'course_schedule' && listDetails.schedule && (
                                  <div>
                                    <label className="text-sm font-medium text-muted-foreground">Associated Course Schedule</label>
                                    <Card className="mt-2">
                                      <CardContent className="p-4">
                                        <div className="space-y-2">
                                          <div>
                                            <span className="text-sm font-medium">Course:</span>
                                            <span className="text-sm ml-2" data-testid="text-detail-course">
                                              {listDetails.schedule.course?.name || "Unknown"}
                                            </span>
                                          </div>
                                          <div>
                                            <span className="text-sm font-medium">Schedule:</span>
                                            <span className="text-sm ml-2" data-testid="text-detail-schedule">
                                              {format(new Date(listDetails.schedule.startDate), "MMM d")} - {format(new Date(listDetails.schedule.endDate), "MMM d, yyyy")}
                                            </span>
                                          </div>
                                        </div>
                                      </CardContent>
                                    </Card>
                                  </div>
                                )}
                              </div>
                            </TabsContent>
                          </CardContent>
                        </Tabs>
                      </Card>
                    </>
                  )}
                </div>
              )}
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

      {/* Create List Dialog */}
      <Dialog open={isCreateListDialogOpen} onOpenChange={setIsCreateListDialogOpen}>
        <DialogContent className="max-w-md" data-testid="dialog-create-list">
          <DialogHeader>
            <DialogTitle className="flex items-center space-x-2">
              <List className="h-5 w-5" />
              <span>Create New SMS List</span>
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2">
                List Name <span className="text-red-500">*</span>
              </label>
              <Input
                placeholder="Enter list name..."
                value={newListName}
                onChange={(e) => setNewListName(e.target.value)}
                data-testid="input-list-name"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">
                Description
              </label>
              <Textarea
                placeholder="Enter list description..."
                value={newListDescription}
                onChange={(e) => setNewListDescription(e.target.value)}
                rows={3}
                className="resize-none"
                data-testid="textarea-list-description"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">
                Tags (comma-separated)
              </label>
              <Input
                placeholder="e.g., students, instructors, advanced"
                value={newListTags}
                onChange={(e) => setNewListTags(e.target.value)}
                data-testid="input-list-tags"
              />
              <p className="text-xs text-muted-foreground mt-1">
                Separate multiple tags with commas
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setIsCreateListDialogOpen(false);
                setNewListName("");
                setNewListDescription("");
                setNewListTags("");
              }}
              data-testid="button-cancel-create-list"
            >
              Cancel
            </Button>
            <Button
              onClick={() => {
                if (!newListName.trim()) {
                  toast({
                    title: "Validation Error",
                    description: "List name is required",
                    variant: "destructive"
                  });
                  return;
                }

                const tags = newListTags
                  .split(',')
                  .map(t => t.trim())
                  .filter(t => t.length > 0);

                createListMutation.mutate({
                  name: newListName.trim(),
                  description: newListDescription.trim() || undefined,
                  tags: tags.length > 0 ? tags : undefined
                });
              }}
              disabled={!newListName.trim() || createListMutation.isPending}
              data-testid="button-submit-create-list"
            >
              {createListMutation.isPending ? "Creating..." : "Create List"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add Students Dialog */}
      <Dialog open={isAddStudentsDialogOpen} onOpenChange={setIsAddStudentsDialogOpen}>
        <DialogContent className="max-w-2xl" data-testid="dialog-add-students">
          <DialogHeader>
            <DialogTitle className="flex items-center space-x-2">
              <UserPlus className="h-5 w-5" />
              <span>Add Students to List</span>
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            {isLoadingAvailableStudents ? (
              <div className="space-y-2">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="h-12 bg-muted rounded animate-pulse"></div>
                ))}
              </div>
            ) : availableStudents && availableStudents.length > 0 ? (
              <>
                <p className="text-sm text-muted-foreground">
                  Select students to add to this list
                </p>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search by name or email..."
                    value={addStudentSearchTerm}
                    onChange={(e) => setAddStudentSearchTerm(e.target.value)}
                    className="pl-9"
                    data-testid="input-search-add-students"
                  />
                </div>
                <div className="border rounded-lg max-h-96 overflow-y-auto">
                  {availableStudents
                    .filter((student: any) => 
                      !listStudents?.some((s: any) => s.userId === student.id)
                    )
                    .filter((student: any) => {
                      if (!addStudentSearchTerm) return true;
                      const searchLower = addStudentSearchTerm.toLowerCase();
                      const fullName = `${student.firstName} ${student.lastName}`.toLowerCase();
                      return fullName.includes(searchLower) || 
                             student.email?.toLowerCase().includes(searchLower);
                    })
                    .map((student: any, idx: number) => (
                      <div
                        key={student.id}
                        className="flex items-center space-x-3 p-3 border-b last:border-b-0 hover:bg-muted"
                        data-testid={`row-available-student-${idx}`}
                      >
                        <input
                          type="checkbox"
                          checked={selectedStudentsToAdd.includes(student.id)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedStudentsToAdd([...selectedStudentsToAdd, student.id]);
                            } else {
                              setSelectedStudentsToAdd(selectedStudentsToAdd.filter(id => id !== student.id));
                            }
                          }}
                          className="h-4 w-4"
                          data-testid={`checkbox-student-${idx}`}
                        />
                        <div className="flex-1">
                          <div className="font-medium" data-testid={`text-student-name-${idx}`}>
                            {student.firstName} {student.lastName}
                          </div>
                          <div className="text-sm text-muted-foreground" data-testid={`text-student-email-${idx}`}>
                            {student.email}
                          </div>
                        </div>
                        {student.phone && (
                          <div className="text-sm text-muted-foreground" data-testid={`text-student-phone-${idx}`}>
                            {student.phone}
                          </div>
                        )}
                      </div>
                    ))}
                </div>
                <div className="text-sm text-muted-foreground">
                  {selectedStudentsToAdd.length} student{selectedStudentsToAdd.length !== 1 ? 's' : ''} selected
                </div>
              </>
            ) : (
              <div className="text-center py-8">
                <Users className="h-12 w-12 mx-auto mb-3 text-muted-foreground opacity-50" />
                <p className="text-sm text-muted-foreground">
                  No available students to add
                </p>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setIsAddStudentsDialogOpen(false);
                setSelectedStudentsToAdd([]);
                setAddStudentSearchTerm("");
              }}
              data-testid="button-cancel-add-students"
            >
              Cancel
            </Button>
            <Button
              onClick={() => {
                if (selectedListId && selectedStudentsToAdd.length > 0) {
                  addStudentsMutation.mutate({
                    listId: selectedListId,
                    userIds: selectedStudentsToAdd
                  });
                }
              }}
              disabled={selectedStudentsToAdd.length === 0 || addStudentsMutation.isPending}
              data-testid="button-submit-add-students"
            >
              {addStudentsMutation.isPending ? "Adding..." : `Add ${selectedStudentsToAdd.length} Student${selectedStudentsToAdd.length !== 1 ? 's' : ''}`}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Remove Student Confirmation Dialog */}
      <Dialog open={!!studentToRemove} onOpenChange={(open) => !open && setStudentToRemove(null)}>
        <DialogContent className="max-w-md" data-testid="dialog-remove-student">
          <DialogHeader>
            <DialogTitle className="flex items-center space-x-2">
              <UserMinus className="h-5 w-5" />
              <span>Remove Student</span>
            </DialogTitle>
          </DialogHeader>

          <p className="text-sm text-muted-foreground">
            Are you sure you want to remove this student from the list? This action cannot be undone.
          </p>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setStudentToRemove(null)}
              data-testid="button-cancel-remove-student"
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => {
                if (selectedListId && studentToRemove) {
                  removeStudentMutation.mutate({
                    listId: selectedListId,
                    userId: studentToRemove
                  });
                }
              }}
              disabled={removeStudentMutation.isPending}
              data-testid="button-confirm-remove-student"
            >
              {removeStudentMutation.isPending ? "Removing..." : "Remove Student"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete List Confirmation Dialog */}
      <Dialog open={isDeleteListDialogOpen} onOpenChange={setIsDeleteListDialogOpen}>
        <DialogContent className="max-w-md" data-testid="dialog-delete-list">
          <DialogHeader>
            <DialogTitle className="flex items-center space-x-2">
              <Trash2 className="h-5 w-5" />
              <span>Delete List</span>
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">
              Are you sure you want to delete this list? This action cannot be undone.
            </p>
            {listStudents && listStudents.length > 0 && (
              <div className="p-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded">
                <p className="text-sm text-amber-800 dark:text-amber-200">
                  <strong>Warning:</strong> This list has {listStudents.length} student{listStudents.length !== 1 ? 's' : ''}. 
                  All students will be removed from the list.
                </p>
              </div>
            )}
            {listBroadcasts && listBroadcasts.length > 0 && (
              <div className="p-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded">
                <p className="text-sm text-amber-800 dark:text-amber-200">
                  <strong>Note:</strong> This list has {listBroadcasts.length} broadcast{listBroadcasts.length !== 1 ? 's' : ''}. 
                  Broadcast history will be preserved but will no longer be associated with this list.
                </p>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsDeleteListDialogOpen(false)}
              data-testid="button-cancel-delete-list"
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => {
                if (selectedListId) {
                  deleteListMutation.mutate(selectedListId);
                }
              }}
              disabled={deleteListMutation.isPending}
              data-testid="button-confirm-delete-list"
            >
              {deleteListMutation.isPending ? "Deleting..." : "Delete List"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit List Dialog */}
      <Dialog open={isEditListDialogOpen} onOpenChange={setIsEditListDialogOpen}>
        <DialogContent className="max-w-md" data-testid="dialog-edit-list">
          <DialogHeader>
            <DialogTitle className="flex items-center space-x-2">
              <Edit className="h-5 w-5" />
              <span>Edit List</span>
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2">
                List Name <span className="text-red-500">*</span>
              </label>
              <Input
                placeholder="Enter list name..."
                value={editListName}
                onChange={(e) => setEditListName(e.target.value)}
                data-testid="input-edit-list-name"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">
                Description
              </label>
              <Textarea
                placeholder="Enter list description..."
                value={editListDescription}
                onChange={(e) => setEditListDescription(e.target.value)}
                rows={3}
                className="resize-none"
                data-testid="textarea-edit-list-description"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">
                Tags (comma-separated)
              </label>
              <Input
                placeholder="e.g., students, instructors, advanced"
                value={editListTags}
                onChange={(e) => setEditListTags(e.target.value)}
                data-testid="input-edit-list-tags"
              />
              <p className="text-xs text-muted-foreground mt-1">
                Separate multiple tags with commas
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setIsEditListDialogOpen(false);
                setEditListName("");
                setEditListDescription("");
                setEditListTags("");
              }}
              data-testid="button-cancel-edit-list"
            >
              Cancel
            </Button>
            <Button
              onClick={() => {
                if (!editListName.trim()) {
                  toast({
                    title: "Validation Error",
                    description: "List name is required",
                    variant: "destructive"
                  });
                  return;
                }

                const tags = editListTags
                  .split(',')
                  .map(t => t.trim())
                  .filter(t => t.length > 0);

                if (selectedListId) {
                  updateListMutation.mutate({
                    id: selectedListId,
                    data: {
                      name: editListName.trim(),
                      description: editListDescription.trim() || undefined,
                      tags: tags.length > 0 ? tags : undefined
                    }
                  });
                }
              }}
              disabled={!editListName.trim() || updateListMutation.isPending}
              data-testid="button-submit-edit-list"
            >
              {updateListMutation.isPending ? "Saving..." : "Save Changes"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Broadcast Composer Dialog */}
      <Dialog open={isComposerOpen} onOpenChange={setIsComposerOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto" data-testid="dialog-broadcast-composer">
          <DialogHeader>
            <DialogTitle className="flex items-center space-x-2">
              <Send className="h-5 w-5" />
              <span>{composerMode === 'create' ? 'Create Broadcast Message' : 'Edit Broadcast'}</span>
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-6 py-4">
            {/* Subject Field */}
            <div>
              <label className="block text-sm font-medium mb-2">
                Subject (Optional)
              </label>
              <Input
                placeholder="For tracking purposes only - not sent in SMS"
                value={broadcastForm.subject}
                onChange={(e) => setBroadcastForm(prev => ({ ...prev, subject: e.target.value }))}
                data-testid="input-broadcast-subject"
              />
              <p className="text-xs text-muted-foreground mt-1">
                Subject is for your reference only and won't be included in the SMS
              </p>
            </div>

            {/* Dynamic Tags Section */}
            <div>
              <label className="block text-sm font-medium mb-2">
                Insert Dynamic Tags
              </label>
              <div className="flex flex-wrap gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => insertTagAtCursor('{{firstName}}')}
                  data-testid="button-tag-firstname"
                >
                  <Tag className="h-3 w-3 mr-1" />
                  First Name
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => insertTagAtCursor('{{lastName}}')}
                  data-testid="button-tag-lastname"
                >
                  <Tag className="h-3 w-3 mr-1" />
                  Last Name
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => insertTagAtCursor('{{email}}')}
                  data-testid="button-tag-email"
                >
                  <Tag className="h-3 w-3 mr-1" />
                  Email
                </Button>
                {listDetails?.listType === 'course_schedule' && (
                  <>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => insertTagAtCursor('{{courseName}}')}
                      data-testid="button-tag-coursename"
                    >
                      <Tag className="h-3 w-3 mr-1" />
                      Course Name
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => insertTagAtCursor('{{scheduleDate}}')}
                      data-testid="button-tag-scheduledate"
                    >
                      <Tag className="h-3 w-3 mr-1" />
                      Schedule Date
                    </Button>
                  </>
                )}
              </div>
              <p className="text-xs text-muted-foreground mt-2">
                Click a tag to insert it at the cursor position. Tags will be replaced with actual values when sending.
              </p>
            </div>

            {/* Message Content Field */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-sm font-medium">
                  Message Content <span className="text-red-500">*</span>
                </label>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    const template = "Hi {{firstName}}, this is a reminder about your upcoming course on {{scheduleDate}}. Please let us know if you have any questions!";
                    setBroadcastForm(prev => ({ ...prev, messageContent: template }));
                  }}
                  data-testid="button-use-template"
                >
                  <FileText className="h-3 w-3 mr-1" />
                  Use Template
                </Button>
              </div>
              <Textarea
                ref={messageContentRef}
                placeholder="Type your message here... Use the tags above to personalize your message."
                value={broadcastForm.messageContent}
                onChange={(e) => setBroadcastForm(prev => ({ ...prev, messageContent: e.target.value }))}
                rows={6}
                className="resize-none"
                data-testid="textarea-broadcast-message"
              />

              {/* Character Counter */}
              <div className="flex items-center justify-between mt-2">
                <div className={`text-sm font-medium ${getCharacterCount(broadcastForm.messageContent).color}`}>
                  {getCharacterCount(broadcastForm.messageContent).count} characters
                  {' • '}
                  {getCharacterCount(broadcastForm.messageContent).messages} message{getCharacterCount(broadcastForm.messageContent).messages !== 1 ? 's' : ''}
                </div>
                {getCharacterCount(broadcastForm.messageContent).count > 160 && (
                  <Badge variant="secondary" className="text-xs">
                    SMS will be split into multiple messages
                  </Badge>
                )}
              </div>

              {getCharacterCount(broadcastForm.messageContent).count > 320 && (
                <p className="text-xs text-red-600 mt-1">
                  ⚠️ Message is quite long. Consider shortening it for better deliverability.
                </p>
              )}
            </div>

            {/* Attachments Section */}
            <div>
              <label className="block text-sm font-medium mb-2">
                Attachments (Optional)
              </label>
              <p className="text-xs text-muted-foreground mb-3">
                Attach images or documents to share with recipients
              </p>

              <div className="space-y-3">
                {/* Upload Button */}
                {broadcastForm.attachmentUrls.length < 5 && (
                  <ObjectUploader
                    maxNumberOfFiles={1}
                    maxFileSize={10485760}
                    onComplete={(result) => {
                      if (result.successful && result.successful.length > 0) {
                        const uploadedUrl = result.successful[0].uploadURL;
                        setBroadcastForm(prev => ({
                          ...prev,
                          attachmentUrls: [...prev.attachmentUrls, uploadedUrl]
                        }));
                        toast({
                          title: "Success",
                          description: "File uploaded successfully",
                        });
                      }
                    }}
                    data-testid="button-add-attachment"
                  >
                    Add Attachment
                  </ObjectUploader>
                )}

                {/* Attached Files List */}
                {broadcastForm.attachmentUrls.length > 0 && (
                  <div className="space-y-2" data-testid="list-attachments">
                    {broadcastForm.attachmentUrls.map((url, index) => {
                      const filename = url.split('/').pop()?.split('?')[0] || 'file';
                      const isImage = /\.(jpg|jpeg|png|gif|webp)$/i.test(filename);

                      return (
                        <Card key={index} className="p-3">
                          <div className="flex items-center space-x-3">
                            {isImage ? (
                              <div className="flex-shrink-0 w-12 h-12 rounded overflow-hidden bg-muted">
                                <img
                                  src={url}
                                  alt={filename}
                                  className="w-full h-full object-cover"
                                />
                              </div>
                            ) : (
                              <div className="flex-shrink-0 w-12 h-12 rounded bg-muted flex items-center justify-center">
                                <FileText className="h-6 w-6 text-muted-foreground" />
                              </div>
                            )}
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium truncate">
                                {filename}
                              </p>
                              {isImage && (
                                <Badge variant="secondary" className="text-xs mt-1">
                                  <ImageIcon className="h-3 w-3 mr-1" />
                                  Image
                                </Badge>
                              )}
                            </div>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                setBroadcastForm(prev => ({
                                  ...prev,
                                  attachmentUrls: prev.attachmentUrls.filter((_, i) => i !== index)
                                }));
                              }}
                              data-testid={`button-remove-attachment-${index}`}
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          </div>
                        </Card>
                      );
                    })}
                  </div>
                )}

                {broadcastForm.attachmentUrls.length >= 5 && (
                  <p className="text-xs text-muted-foreground">
                    Maximum of 5 attachments reached
                  </p>
                )}
              </div>
            </div>

            {/* Scheduling Section */}
            <div>
              <div className="flex items-center space-x-2 mb-3">
                <input
                  type="checkbox"
                  id="schedule-checkbox"
                  checked={broadcastForm.isScheduled}
                  onChange={(e) => setBroadcastForm(prev => ({
                    ...prev,
                    isScheduled: e.target.checked,
                    scheduledFor: e.target.checked ? prev.scheduledFor : ""
                  }))}
                  className="h-4 w-4 rounded border-gray-300"
                  data-testid="checkbox-schedule-broadcast"
                />
                <label htmlFor="schedule-checkbox" className="text-sm font-medium cursor-pointer">
                  Schedule for later
                </label>
              </div>

              {broadcastForm.isScheduled && (
                <div>
                  <label className="block text-sm font-medium mb-2">
                    Send Date & Time
                  </label>
                  <Input
                    type="datetime-local"
                    value={broadcastForm.scheduledFor}
                    onChange={(e) => setBroadcastForm(prev => ({ ...prev, scheduledFor: e.target.value }))}
                    step="300"
                    min={new Date(Date.now() + 5 * 60 * 1000).toISOString().slice(0, 16)}
                    className="w-full"
                    data-testid="input-scheduled-datetime"
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Time intervals are in 5-minute increments. Minimum 5 minutes from now.
                  </p>
                </div>
              )}
            </div>

            {/* Message Preview Section */}
            {broadcastForm.messageContent && (
              <div>
                <label className="block text-sm font-medium mb-2">
                  Preview (with sample data)
                </label>
                <div className="p-4 bg-muted rounded-lg border border-border" data-testid="preview-broadcast-message">
                  <p className="text-sm whitespace-pre-wrap">
                    {getPreviewMessage(broadcastForm.messageContent)}
                  </p>
                </div>
                {broadcastForm.dynamicTags.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-2">
                    <span className="text-xs text-muted-foreground">Tags used:</span>
                    {broadcastForm.dynamicTags.map((tag, idx) => (
                      <Badge key={idx} variant="outline" className="text-xs" data-testid={`badge-used-tag-${idx}`}>
                        {tag}
                      </Badge>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          <DialogFooter className="flex items-center justify-between sm:justify-between">
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setIsComposerOpen(false);
                setBroadcastForm({ subject: "", messageContent: "", messagePlain: "", dynamicTags: [], attachmentUrls: [], scheduledFor: "", isScheduled: false });
              }}
              data-testid="button-cancel-composer"
            >
              Cancel
            </Button>
            <div className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={async () => {
                  if (!broadcastForm.messageContent.trim()) {
                    toast({
                      title: "Error",
                      description: "Message content cannot be empty",
                      variant: "destructive"
                    });
                    return;
                  }

                  if (selectedListId) {
                    try {
                      await createBroadcastMutation.mutateAsync({
                        listId: selectedListId,
                        data: {
                          subject: broadcastForm.subject || null,
                          messageContent: broadcastForm.messageContent,
                          messagePlain: broadcastForm.messagePlain,
                          dynamicTags: broadcastForm.dynamicTags,
                          attachmentUrls: broadcastForm.attachmentUrls,
                          scheduledFor: broadcastForm.isScheduled && broadcastForm.scheduledFor ? new Date(broadcastForm.scheduledFor).toISOString() : null,
                          status: 'draft'
                        }
                      });

                      // Success - manually handle
                      queryClient.invalidateQueries({ queryKey: ['/api/sms-lists'] });
                      toast({ title: "Success", description: "Draft saved successfully" });
                      setIsComposerOpen(false);
                      setBroadcastForm({ subject: "", messageContent: "", messagePlain: "", dynamicTags: [], attachmentUrls: [], scheduledFor: "", isScheduled: false });
                    } catch (error) {
                      // Error already handled by mutation onError
                    }
                  }
                }}
                disabled={createBroadcastMutation.isPending || !broadcastForm.messageContent.trim()}
                data-testid="button-save-draft"
              >
                {createBroadcastMutation.isPending ? "Saving..." : "Save Draft"}
              </Button>
              <Button
                type="button"
                onClick={() => {
                  if (!broadcastForm.messageContent.trim()) {
                    toast({
                      title: "Error",
                      description: "Message content cannot be empty",
                      variant: "destructive"
                    });
                    return;
                  }
                  setIsSendConfirmOpen(true);
                }}
                disabled={!broadcastForm.messageContent.trim()}
                data-testid="button-send-broadcast"
              >
                <Send className="h-4 w-4 mr-2" />
                Send Broadcast
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Send Confirmation Dialog */}
      <Dialog open={isSendConfirmOpen} onOpenChange={setIsSendConfirmOpen}>
        <DialogContent className="max-w-md" data-testid="dialog-send-confirmation">
          <DialogHeader>
            <DialogTitle className="flex items-center space-x-2">
              <Send className="h-5 w-5" />
              <span>Confirm Send Broadcast</span>
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div className="p-4 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded">
              <p className="text-sm text-amber-800 dark:text-amber-200 font-medium mb-2">
                {broadcastForm.isScheduled && broadcastForm.scheduledFor
                  ? `⏰ You are about to schedule this message for ${new Date(broadcastForm.scheduledFor).toLocaleString()}`
                  : '⚠️ You are about to send this message to all list students'}
              </p>
              <p className="text-xs text-amber-700 dark:text-amber-300">
                This action cannot be undone. Make sure your message is correct before proceeding.
              </p>
            </div>

            <div>
              <label className="text-sm font-medium text-muted-foreground">Recipients</label>
              <p className="text-2xl font-bold" data-testid="text-recipient-count">
                {listStudents?.length || 0} students
              </p>
            </div>

            <div>
              <label className="text-sm font-medium text-muted-foreground">Message Preview</label>
              <div className="mt-2 p-3 bg-muted rounded border border-border" data-testid="preview-send-message">
                <p className="text-sm whitespace-pre-wrap">
                  {getPreviewMessage(broadcastForm.messageContent)}
                </p>
              </div>
            </div>

            <div>
              <label className="text-sm font-medium text-muted-foreground">Estimated Cost</label>
              <p className="text-sm mt-1">
                ${((listStudents?.length || 0) * getCharacterCount(broadcastForm.messageContent).messages * 0.0079).toFixed(2)}
                {' '}
                <span className="text-muted-foreground">
                  ({listStudents?.length || 0} recipients × {getCharacterCount(broadcastForm.messageContent).messages} message{getCharacterCount(broadcastForm.messageContent).messages !== 1 ? 's' : ''} × $0.0079/msg)
                </span>
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsSendConfirmOpen(false)}
              data-testid="button-cancel-send"
            >
              Cancel
            </Button>
            <Button
              onClick={async () => {
                if (!selectedListId) {
                  toast({
                    title: "Error",
                    description: "No list selected",
                    variant: "destructive"
                  });
                  return;
                }

                try {
                  // First create/save the broadcast
                  const result = await createBroadcastMutation.mutateAsync({
                    listId: selectedListId,
                    data: {
                      subject: broadcastForm.subject || null,
                      messageContent: broadcastForm.messageContent,
                      messagePlain: broadcastForm.messagePlain,
                      dynamicTags: broadcastForm.dynamicTags,
                      attachmentUrls: broadcastForm.attachmentUrls,
                      scheduledFor: broadcastForm.isScheduled && broadcastForm.scheduledFor ? new Date(broadcastForm.scheduledFor).toISOString() : null,
                      status: 'draft'
                    }
                  });

                  // Then send it (or schedule it)
                  if (result?.id) {
                    await sendBroadcastMutation.mutateAsync(result.id);

                    // Success - manually close dialogs and reset form
                    await queryClient.invalidateQueries({ queryKey: ['/api/sms-lists'] });

                    toast({ 
                      title: "Success", 
                      description: broadcastForm.isScheduled && broadcastForm.scheduledFor 
                        ? "Broadcast scheduled successfully" 
                        : "Broadcast sent successfully" 
                    });

                    setIsSendConfirmOpen(false);
                    setIsComposerOpen(false);
                    setBroadcastForm({ subject: "", messageContent: "", messagePlain: "", dynamicTags: [], attachmentUrls: [], scheduledFor: "", isScheduled: false });
                  } else {
                    toast({
                      title: "Error",
                      description: "Failed to create broadcast - no ID returned",
                      variant: "destructive"
                    });
                  }
                } catch (error: any) {
                  toast({
                    title: "Error",
                    description: error?.message || "Failed to send broadcast",
                    variant: "destructive"
                  });
                }
              }}
              disabled={sendBroadcastMutation.isPending || createBroadcastMutation.isPending}
              data-testid="button-confirm-send"
            >
              {sendBroadcastMutation.isPending || createBroadcastMutation.isPending ? (
                broadcastForm.isScheduled && broadcastForm.scheduledFor ? "Scheduling..." : "Sending..."
              ) : (
                <>
                  <Send className="h-4 w-4 mr-2" />
                  {broadcastForm.isScheduled && broadcastForm.scheduledFor ? "Confirm & Schedule" : "Confirm & Send"}
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Create/Edit SMS Template Dialog */}
      <Dialog open={isCreateTemplateDialogOpen} onOpenChange={(open) => {
        setIsCreateTemplateDialogOpen(open);
        if (!open) {
          setEditingTemplate(null);
          setTemplateName("");
          setTemplateContent("");
          setTemplateCategory("announcement");
          setTemplateImageUrl(null);
        }
      }}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingTemplate ? 'Edit SMS Template' : 'Create SMS Template'}</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="template-name">Template Name</Label>
                <Input
                  id="template-name"
                  placeholder="e.g., Course Reminder, Payment Notice"
                  value={templateName}
                  onChange={(e) => setTemplateName(e.target.value)}
                  data-testid="input-template-name"
                />
              </div>

              <div>
                <Label htmlFor="template-category">Category</Label>
                <Select value={templateCategory} onValueChange={setTemplateCategory}>
                  <SelectTrigger id="template-category" data-testid="select-template-category">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="announcement">Announcement</SelectItem>
                    <SelectItem value="reminder">Reminder</SelectItem>
                    <SelectItem value="payment_notice">Payment Notice</SelectItem>
                    <SelectItem value="course_specific">Course Specific</SelectItem>
                    <SelectItem value="welcome">Welcome</SelectItem>
                    <SelectItem value="certificate">Certificate</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <Label>Message Content</Label>
                <div className="flex gap-1">
                  {[
                    { label: 'First Name', value: '{{ student.firstName }}' },
                    { label: 'Last Name', value: '{{ student.lastName }}' },
                    { label: 'Course', value: '{{ course.name }}' },
                    { label: 'Date', value: '{{ schedule.date }}' },
                  ].map((variable) => (
                    <Button
                      key={variable.value}
                      type="button"
                      size="sm"
                      variant="outline"
                      className="h-7 text-xs"
                      onClick={() => {
                        if (quillRef.current) {
                          const editor = quillRef.current.getEditor();
                          const cursorPosition = editor.getSelection()?.index || editor.getLength();
                          editor.insertText(cursorPosition, variable.value, 'user');
                          editor.setSelection(cursorPosition + variable.value.length);
                        }
                      }}
                      data-testid={`button-insert-${variable.label.toLowerCase().replace(' ', '-')}`}
                    >
                      {variable.label}
                    </Button>
                  ))}
                </div>
              </div>
              <div className="border rounded-md">
                <ReactQuill
                  ref={quillRef}
                  value={templateContent}
                  onChange={setTemplateContent}
                  theme="snow"
                  placeholder="Write your SMS template message..."
                  modules={{
                    toolbar: [
                      ['bold', 'italic', 'underline'],
                      ['link'],
                      [{ 'list': 'ordered'}, { 'list': 'bullet' }],
                      ['clean']
                    ]
                  }}
                />
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Click the buttons above to insert variables into your template
              </p>
            </div>

            <div>
              <Label>Image Attachment (Optional)</Label>
              <div className="mt-2">
                {templateImageUrl ? (
                  <div className="relative inline-block">
                    <img 
                      src={templateImageUrl} 
                      alt="Template" 
                      className="max-w-xs rounded border"
                    />
                    <Button
                      type="button"
                      size="sm"
                      variant="destructive"
                      className="absolute top-2 right-2"
                      onClick={() => setTemplateImageUrl(null)}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ) : (
                  <ObjectUploader
                    onComplete={(result) => {
                      if (result.successful && result.successful[0]) {
                        setTemplateImageUrl(result.successful[0].uploadURL);
                      }
                    }}
                  >
                    <ImageIcon className="mr-2 h-4 w-4" />
                    Upload Image
                  </ObjectUploader>
                )}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Upload an image to include in your SMS template (PNG, JPG, GIF)
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setIsCreateTemplateDialogOpen(false);
                setTemplateName("");
                setTemplateContent("");
                setTemplateCategory("announcement");
                setTemplateImageUrl(null);
              }}
              data-testid="button-cancel-template"
            >
              Cancel
            </Button>
            <Button
              type="button"
              onClick={() => {
                if (!templateName.trim()) {
                  toast({
                    title: "Template Name Required",
                    description: "Please enter a name for your template",
                    variant: "destructive"
                  });
                  return;
                }
                if (!templateContent.trim()) {
                  toast({
                    title: "Content Required",
                    description: "Please enter message content for your template",
                    variant: "destructive"
                  });
                  return;
                }
                if (!user?.id && !editingTemplate) {
                  toast({
                    title: "Authentication Error",
                    description: "Please log in to create templates",
                    variant: "destructive"
                  });
                  return;
                }

                if (editingTemplate) {
                  updateTemplateMutation.mutate({
                    id: editingTemplate.id,
                    name: templateName,
                    content: templateContent,
                    imageUrl: templateImageUrl,
                    category: templateCategory
                  });
                } else {
                  createTemplateMutation.mutate({
                    name: templateName,
                    content: templateContent,
                    imageUrl: templateImageUrl,
                    type: 'sms',
                    category: templateCategory,
                    createdBy: user.id
                  });
                }
              }}
              disabled={createTemplateMutation.isPending || updateTemplateMutation.isPending}
              data-testid="button-save-template"
            >
              {(createTemplateMutation.isPending || updateTemplateMutation.isPending) ? (
                <>
                  <div className="animate-spin w-4 h-4 border-2 border-transparent border-t-current rounded-full mr-2" />
                  {editingTemplate ? 'Updating...' : 'Creating...'}
                </>
              ) : (
                <>
                  <CheckCircle className="h-4 w-4 mr-2" />
                  {editingTemplate ? 'Update Template' : 'Create Template'}
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}