import { useEffect, useState, useMemo } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { useLocation, Link } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Layout } from "@/components/Layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { CourseManagementActions } from "@/components/CourseManagementActions";
import { EditCourseForm } from "@/components/EditCourseForm";
import { EditScheduleForm } from "@/components/EditScheduleForm";
import { EventCreationForm } from "@/components/EventCreationForm";
import { CategoryManagement } from "@/components/CategoryManagement";
import { RosterDialog } from "@/components/RosterDialog";
import { WaitlistDialog } from "@/components/WaitlistDialog";
import { isUnauthorizedError, hasInstructorPrivileges } from "@/lib/authUtils";
import { Plus, BarChart, GraduationCap, DollarSign, Users, TrendingUp, Clock, Archive, Eye, EyeOff, Trash2, Edit, MoreVertical, CalendarPlus, Calendar, Copy, FolderOpen, Settings, Download, CalendarClock, ChevronUp, ChevronDown, XCircle, UsersRound } from "lucide-react";
import type { CourseWithSchedules, EnrollmentWithDetails, User } from "@shared/schema";
import { formatDateShort, formatDateSafe } from "@/lib/dateUtils";
import { AppointmentsModal } from "@/components/AppointmentsModal";
import { getEnrollmentStatusClassName } from "@/lib/statusColors";

// Placeholder for SmsNotificationModal component
const SmsNotificationModal = ({ isOpen, onClose, studentName, phoneNumber, studentId, enrollmentId, courseId, scheduleId }: any) => {
  // This is a placeholder. Replace with the actual component import if available.
  // The backend NotificationEngine will use studentId, enrollmentId, courseId, and scheduleId
  // to correctly substitute template variables for the SMS.
  return null;
};

export default function InstructorDashboard() {
  const { user, isLoading, isAuthenticated } = useAuth();
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();
  const [editingCourse, setEditingCourse] = useState<CourseWithSchedules | null>(null);
  const [editingSchedule, setEditingSchedule] = useState<any | null>(null);
  const [showEventForm, setShowEventForm] = useState(false);

  // Roster dialog states
  const [selectedScheduleId, setSelectedScheduleId] = useState<string | null>(null);
  const [selectedCourseId, setSelectedCourseId] = useState<string | null>(null);
  const [showRosterDialog, setShowRosterDialog] = useState(false);

  // Waitlist dialog states
  const [waitlistScheduleId, setWaitlistScheduleId] = useState<string | null>(null);
  const [waitlistCourseTitle, setWaitlistCourseTitle] = useState<string>("");
  const [waitlistCourseId, setWaitlistCourseId] = useState<string>("");

  // Permanent deletion confirmation states
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState('');
  const [deleteTarget, setDeleteTarget] = useState<{type: 'course' | 'schedule', id: string, title: string} | null>(null);

  // Online students modal state
  const [showOnlineStudentsModal, setShowOnlineStudentsModal] = useState(false);

  // SMS notification modal states
  const [smsModalData, setSmsModalData] = useState<any | null>(null);

  // Appointments modal state
  const [showAppointmentsModal, setShowAppointmentsModal] = useState(false);

  const { data: courses = [], isLoading: coursesLoading } = useQuery<CourseWithSchedules[]>({
    queryKey: ["/api/instructor/courses"],
    enabled: isAuthenticated && hasInstructorPrivileges(user as User),
    retry: false,
  });

  const { data: enrollments = [], isLoading: enrollmentsLoading } = useQuery<EnrollmentWithDetails[]>({
    queryKey: ["/api/instructor/enrollments"],
    enabled: isAuthenticated && hasInstructorPrivileges(user as User),
    retry: false,
  });

  const { data: deletedCourses = [], isLoading: deletedCoursesLoading } = useQuery<CourseWithSchedules[]>({
    queryKey: ["/api/instructor/deleted-courses"],
    enabled: isAuthenticated && hasInstructorPrivileges(user as User),
    retry: false,
  });

  const { data: deletedSchedules = [], isLoading: deletedSchedulesLoading } = useQuery<any[]>({
    queryKey: ["/api/instructor/deleted-schedules"],
    enabled: isAuthenticated && hasInstructorPrivileges(user as User),
    retry: false,
  });

  // Fetch dashboard statistics
  const { data: dashboardStats, isLoading: statsLoading } = useQuery<{
    upcomingCourses: number;
    onlineStudents: number;
    allStudents: number;
    totalRevenue: number;
    outstandingRevenue: number;
    refundRequests: number;
    totalAppointments: number;
  }>({
    queryKey: ["/api/instructor/dashboard-stats"],
    enabled: isAuthenticated && hasInstructorPrivileges(user as User),
    retry: false,
  });

  // Fetch refund requests
  const { data: refundRequests = [] } = useQuery<EnrollmentWithDetails[]>({
    queryKey: ["/api/instructor/refund-requests"],
    enabled: isAuthenticated && hasInstructorPrivileges(user as User),
    retry: false,
  });

  // Refund requests modal state
  const [showRefundRequestsModal, setShowRefundRequestsModal] = useState(false);
  const [refundFormData, setRefundFormData] = useState<{[key: string]: {amount: string, reason: string}}>({});
  const [expandedRefundId, setExpandedRefundId] = useState<string | null>(null);

  // Archive course mutation
  const archiveCourseMutation = useMutation({
    mutationFn: async (courseId: string) => {
      await apiRequest("PATCH", `/api/instructor/courses/${courseId}/archive`);
    },
    onSuccess: () => {
      toast({
        title: "Course Archived",
        description: "Course has been archived successfully.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/instructor/courses"] });
    },
    onError: (error) => {
      if (isUnauthorizedError(error)) {
        toast({
          title: "Unauthorized",
          description: "You are logged out. Logging in again...",
          variant: "destructive",
        });
        setTimeout(() => {
          window.location.href = "/login";
        }, 500);
        return;
      }
      toast({
        title: "Archive Failed",
        description: "Failed to archive course. Please try again.",
        variant: "destructive",
      });
    },
  });

  // Reorder courses mutation
  const reorderCoursesMutation = useMutation({
    mutationFn: async (updates: {id: string; sortOrder: number}[]) => {
      await apiRequest("POST", "/api/instructor/courses/reorder", { updates });
    },
    onSuccess: () => {
      toast({
        title: "Order Updated",
        description: "Course order has been updated successfully.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/instructor/courses"] });
      queryClient.invalidateQueries({ queryKey: ["/api/courses"] });
    },
    onError: (error) => {
      toast({
        title: "Reorder Failed",
        description: "Failed to reorder courses. Please try again.",
        variant: "destructive",
      });
    },
  });

  // Delete course mutation
  const deleteCourseMutation = useMutation({
    mutationFn: async (courseId: string) => {
      await apiRequest("DELETE", `/api/instructor/courses/${courseId}`);
    },
    onSuccess: () => {
      toast({
        title: "Course Deleted",
        description: "Course has been permanently deleted.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/instructor/courses"] });
    },
    onError: (error) => {
      if (isUnauthorizedError(error)) {
        toast({
          title: "Unauthorized",
          description: "You are logged out. Logging in again...",
          variant: "destructive",
        });
        setTimeout(() => {
          window.location.href = "/login";
        }, 500);
        return;
      }
      const errorMessage = error.message.includes('Cannot delete course')
        ? error.message.split(': ')[1] || 'Cannot delete course with existing data'
        : 'Failed to delete course. Please try again.';
      toast({
        title: "Delete Failed",
        description: errorMessage,
        variant: "destructive",
      });
    },
  });

  // Duplicate course mutation
  const duplicateCourseMutation = useMutation({
    mutationFn: async (courseId: string) => {
      const response = await apiRequest("POST", `/api/instructor/courses/${courseId}/duplicate`);
      return response.json();
    },
    onSuccess: (data) => {
      toast({
        title: "Course Duplicated",
        description: "Course has been duplicated successfully. Opening edit form...",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/instructor/courses"] });

      // Open edit form for the newly duplicated course
      setTimeout(() => {
        setEditingCourse(data.course);
      }, 500);
    },
    onError: (error) => {
      if (isUnauthorizedError(error)) {
        toast({
          title: "Unauthorized",
          description: "You are logged out. Logging in again...",
          variant: "destructive",
        });
        setTimeout(() => {
          window.location.href = "/login";
        }, 500);
        return;
      }
      toast({
        title: "Duplication Failed",
        description: "Failed to duplicate course. Please try again.",
        variant: "destructive",
      });
    },
  });

  // Duplicate schedule mutation
  const duplicateScheduleMutation = useMutation({
    mutationFn: async (scheduleId: string) => {
      const data = await apiRequest("POST", `/api/instructor/schedules/${scheduleId}/duplicate`);
      return data;
    },
    onSuccess: (data) => {
      toast({
        title: "Schedule Duplicated",
        description: "Schedule has been duplicated successfully. Opening edit form...",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/instructor/courses"] });

      // Open edit form for the newly duplicated schedule
      if (data && data.schedule) {
        setTimeout(() => {
          setEditingSchedule(data.schedule);
        }, 500);
      }
    },
    onError: (error: any) => {
      if (isUnauthorizedError(error)) {
        toast({
          title: "Unauthorized",
          description: "You are logged out. Logging in again...",
          variant: "destructive",
        });
        setTimeout(() => {
          window.location.href = "/login";
        }, 500);
        return;
      }
      toast({
        title: "Duplication Failed",
        description: error?.message || "Failed to duplicate schedule. Please try again.",
        variant: "destructive",
      });
    },
  });

  // Unpublish course mutation
  const unpublishCourseMutation = useMutation({
    mutationFn: async (courseId: string) => {
      await apiRequest("PATCH", `/api/instructor/courses/${courseId}/unpublish`);
    },
    onSuccess: () => {
      toast({
        title: "Course Unpublished",
        description: "Course has been unpublished successfully.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/instructor/courses"] });
    },
    onError: (error) => {
      if (isUnauthorizedError(error)) {
        toast({
          title: "Unauthorized",
          description: "You are logged out. Logging in again...",
          variant: "destructive",
        });
        setTimeout(() => {
          window.location.href = "/login";
        }, 500);
        return;
      }
      toast({
        title: "Unpublish Failed",
        description: "Failed to unpublish course. Please try again.",
        variant: "destructive",
      });
    },
  });

  // Schedule management mutations
  const deleteScheduleMutation = useMutation({
    mutationFn: async (scheduleId: string) => {
      await apiRequest("DELETE", `/api/instructor/schedules/${scheduleId}`);
    },
    onSuccess: () => {
      toast({
        title: "Schedule Deleted",
        description: "Training schedule has been moved to deleted items.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/instructor/courses"] });
      queryClient.invalidateQueries({ queryKey: ["/api/instructor/deleted-schedules"] });
      queryClient.invalidateQueries({ queryKey: ["/api/instructor/dashboard-stats"] });
    },
    onError: (error) => {
      if (isUnauthorizedError(error)) {
        toast({
          title: "Unauthorized",
          description: "You are logged out. Logging in again...",
          variant: "destructive",
        });
        setTimeout(() => {
          window.location.href = "/login";
        }, 500);
        return;
      }
      const errorMessage = error.message.includes('Cannot delete schedule')
        ? error.message.split(': ')[1] || 'Cannot delete schedule with existing enrollments'
        : 'Failed to delete schedule. Please try again.';
      toast({
        title: "Delete Failed",
        description: errorMessage,
        variant: "destructive",
      });
    },
  });

  const cancelScheduleMutation = useMutation({
    mutationFn: async (scheduleId: string) => {
      await apiRequest("PATCH", `/api/instructor/schedules/${scheduleId}/cancel`);
    },
    onSuccess: () => {
      toast({
        title: "Schedule Cancelled",
        description: "Training schedule has been cancelled successfully.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/instructor/courses"] });
      queryClient.invalidateQueries({ queryKey: ["/api/instructor/dashboard-stats"] });
    },
    onError: (error) => {
      if (isUnauthorizedError(error)) {
        toast({
          title: "Unauthorized",
          description: "You are logged out. Logging in again...",
          variant: "destructive",
        });
        setTimeout(() => {
          window.location.href = "/login";
        }, 500);
        return;
      }
      toast({
        title: "Cancel Failed",
        description: "Failed to cancel schedule. Please try again.",
        variant: "destructive",
      });
    },
  });

  const unpublishScheduleMutation = useMutation({
    mutationFn: async (scheduleId: string) => {
      await apiRequest("PATCH", `/api/instructor/schedules/${scheduleId}/unpublish`);
    },
    onSuccess: () => {
      toast({
        title: "Schedule Unpublished",
        description: "Training schedule has been unpublished successfully.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/instructor/courses"] });
      queryClient.invalidateQueries({ queryKey: ["/api/instructor/dashboard-stats"] });
    },
    onError: (error) => {
      if (isUnauthorizedError(error)) {
        toast({
          title: "Unauthorized",
          description: "You are logged out. Logging in again...",
          variant: "destructive",
        });
        setTimeout(() => {
          window.location.href = "/login";
        }, 500);
        return;
      }
      toast({
        title: "Unpublish Failed",
        description: "Failed to unpublish schedule. Please try again.",
        variant: "destructive",
      });
    },
  });

  // Function to export roster for a specific schedule
  const handleExportRoster = (scheduleId: string, courseTitle: string) => {
    try {
      // Create download link to trigger Excel export
      const exportUrl = `/api/instructor/roster/export?scheduleId=${scheduleId}&format=excel`;
      const link = document.createElement('a');
      link.href = exportUrl;
      link.download = `roster-${courseTitle.replace(/\s+/g, '-')}-${new Date().toISOString().split('T')[0]}.xlsx`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      toast({
        title: "Exporting Roster",
        description: "Downloading roster spreadsheet...",
      });
    } catch (error) {
      toast({
        title: "Export Failed",
        description: "Failed to export roster. Please try again.",
        variant: "destructive",
      });
    }
  };

  // Permanent delete course mutation (hard delete)
  const permanentDeleteCourseMutation = useMutation({
    mutationFn: async (courseId: string) => {
      await apiRequest("DELETE", `/api/instructor/courses/${courseId}/permanent`);
    },
    onSuccess: () => {
      toast({
        title: "Course Permanently Deleted",
        description: "Course has been permanently removed and cannot be recovered.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/instructor/deleted-courses"] });
      queryClient.invalidateQueries({ queryKey: ["/api/instructor/courses"] });
    },
    onError: (error) => {
      if (isUnauthorizedError(error)) {
        toast({
          title: "Unauthorized",
          description: "You are logged out. Logging in again...",
          variant: "destructive",
        });
        setTimeout(() => {
          window.location.href = "/login";
        }, 500);
        return;
      }
      toast({
        title: "Delete Failed",
        description: "Failed to permanently delete course. Please try again.",
        variant: "destructive",
      });
    },
  });

  // Permanent delete schedule mutation (hard delete)
  const permanentDeleteScheduleMutation = useMutation({
    mutationFn: async (scheduleId: string) => {
      await apiRequest("DELETE", `/api/instructor/schedules/${scheduleId}/permanent`);
    },
    onSuccess: () => {
      toast({
        title: "Schedule Permanently Deleted",
        description: "Schedule has been permanently removed and cannot be recovered.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/instructor/deleted-schedules"] });
      queryClient.invalidateQueries({ queryKey: ["/api/instructor/courses"] });
    },
    onError: (error) => {
      if (isUnauthorizedError(error)) {
        toast({
          title: "Unauthorized",
          description: "You are logged out. Logging in again...",
          variant: "destructive",
        });
        setTimeout(() => {
          window.location.href = "/login";
        }, 500);
        return;
      }
      toast({
        title: "Delete Failed",
        description: "Failed to permanently delete schedule. Please try again.",
        variant: "destructive",
      });
    },
  });

  // Process refund mutation
  const processRefundMutation = useMutation({
    mutationFn: async ({ enrollmentId, refundAmount, refundReason }: { enrollmentId: string, refundAmount?: number, refundReason?: string }) => {
      const body: any = {};
      if (refundAmount !== undefined && refundAmount > 0) {
        body.refundAmount = refundAmount;
      }
      if (refundReason) {
        body.refundReason = refundReason;
      }
      await apiRequest("POST", `/api/instructor/refund-requests/${enrollmentId}/process`, body);
    },
    onSuccess: (_, variables) => {
      toast({
        title: "Refund Processed",
        description: "Refund has been processed successfully and the student has been notified.",
      });
      // Clear the form data for this enrollment
      setRefundFormData(prev => {
        const updated = { ...prev };
        delete updated[variables.enrollmentId];
        return updated;
      });
      setExpandedRefundId(null);
      queryClient.invalidateQueries({ queryKey: ["/api/instructor/refund-requests"] });
      queryClient.invalidateQueries({ queryKey: ["/api/instructor/dashboard-stats"] });
    },
    onError: (error: any) => {
      if (isUnauthorizedError(error)) {
        toast({
          title: "Unauthorized",
          description: "You are logged out. Logging in again...",
          variant: "destructive",
        });
        setTimeout(() => {
          window.location.href = "/login";
        }, 500);
        return;
      }
      toast({
        title: "Process Failed",
        description: error?.message || "Failed to process refund. Please try again.",
        variant: "destructive",
      });
    },
  });

  // Helper function to open delete confirmation dialog
  const openDeleteConfirmation = (type: 'course' | 'schedule', id: string, title: string) => {
    setDeleteTarget({ type, id, title });
    setDeleteConfirmText('');
    setShowDeleteConfirm(true);
  };

  // Handle permanent deletion confirmation
  const handleDeleteConfirmation = () => {
    if (deleteConfirmText === 'DELETE' && deleteTarget) {
      if (deleteTarget.type === 'course') {
        permanentDeleteCourseMutation.mutate(deleteTarget.id);
      } else {
        permanentDeleteScheduleMutation.mutate(deleteTarget.id);
      }
      setShowDeleteConfirm(false);
      setDeleteTarget(null);
      setDeleteConfirmText('');
    }
  };

  useEffect(() => {
    if (!isLoading && isAuthenticated && user && !hasInstructorPrivileges(user as User)) {
      toast({
        title: "Unauthorized",
        description: "You need instructor access to view this page. Redirecting...",
        variant: "destructive",
      });
      setTimeout(() => {
        window.location.href = "/login";
      }, 2000);
      return;
    }
  }, [isAuthenticated, isLoading, user, toast]);

  if (isLoading || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  // Use dashboard statistics from API
  const upcomingCourses = dashboardStats?.upcomingCourses || 0;
  const onlineStudents = dashboardStats?.onlineStudents || 0;
  const allStudents = dashboardStats?.allStudents || 0;
  const totalRevenue = dashboardStats?.totalRevenue || 0;
  const outstandingRevenue = dashboardStats?.outstandingRevenue || 0;
  const totalAppointments = dashboardStats?.totalAppointments || 0;

  // Transform courses into schedule items for the dashboard
  const schedules = useMemo(() => {
    if (!courses) return [];

    return courses.flatMap(course =>
      (course.schedules || [])
        .filter(schedule => !schedule.deletedAt) // Filter out deleted schedules
        .map(schedule => {
          const enrollmentCount = schedule.enrollments?.filter((e: any) => e.status !== 'cancelled').length || 0;
          const isCancelled = schedule.notes?.includes('CANCELLED:');
          const calculatedSpots = isCancelled ? 0 : Math.max(0, schedule.maxSpots - enrollmentCount);
          
          return {
            id: schedule.id,
            courseId: course.id,
            courseTitle: course.title,
            courseAbbreviation: course.abbreviation,
            categoryColor: course.category?.color || '#3b82f6',
            startDate: schedule.startDate,
            endDate: schedule.endDate,
            startTime: schedule.startTime,
            endTime: schedule.endTime,
            location: schedule.location,
            maxSpots: schedule.maxSpots,
            availableSpots: calculatedSpots,
            enrollmentCount: enrollmentCount,
            status: calculatedSpots > 0 ? 'active' : 'full',
          };
        })
    ).sort((a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime());
  }, [courses]);


  // Get all schedules from all courses and categorize them
  const allSchedules = courses.flatMap(course =>
    course.schedules.map(schedule => ({
      ...schedule,
      course
    }))
  );

  // Categorize schedules by status and date
  const categorizedSchedules = {
    upcoming: allSchedules.filter(schedule =>
      schedule.course.isActive &&
      schedule.startDate &&
      new Date(schedule.startDate) > new Date() &&
      !schedule.notes?.includes('CANCELLED:') // Exclude cancelled schedules
    ).sort((a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime()),

    past: allSchedules.filter(schedule =>
      schedule.course.isActive &&
      schedule.startDate &&
      new Date(schedule.startDate) <= new Date() &&
      !schedule.notes?.includes('CANCELLED:') // Exclude cancelled schedules
    ).sort((a, b) => new Date(b.startDate).getTime() - new Date(a.startDate).getTime()),

    cancelled: allSchedules.filter(schedule =>
      schedule.course.isActive &&
      schedule.notes?.includes('CANCELLED:') // Include only cancelled schedules
    ).sort((a, b) => new Date(b.startDate).getTime() - new Date(a.startDate).getTime())
  };

  // Categorize course types (unique courses)
  const categorizedCourseTypes = {
    active: courses.filter(course => course.isActive),
    drafts: courses.filter(course => !course.isActive),
    archived: [] // Placeholder for archived course types
  };

  // Helper function to render schedule cards for each category
  const renderScheduleCards = (categoryName: string, scheduleList: any[]) => {
    if (coursesLoading) {
      return (
        <div className="animate-pulse space-y-3">
          <div className="bg-card border rounded-lg p-4">
            <div className="space-y-3">
              <div className="h-6 bg-muted rounded w-3/4"></div>
              <div className="grid grid-cols-2 gap-4">
                <div className="h-4 bg-muted rounded"></div>
                <div className="h-4 bg-muted rounded"></div>
              </div>
            </div>
          </div>
        </div>
      );
    }

    if (scheduleList.length === 0) {
      return (
        <div className="text-center py-8 text-muted-foreground">
          No {categoryName} training sessions
        </div>
      );
    }

    return (
      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        <div className="max-h-96 overflow-y-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200 sticky top-0">
              <tr>
                <th className="px-6 py-4 text-left text-sm font-medium text-gray-600">Course</th>
                <th className="px-6 py-4 text-left text-sm font-medium text-gray-600">Date</th>
                <th className="px-6 py-4 text-center text-sm font-medium text-gray-600">Students</th>
                <th className="px-6 py-4 text-center text-sm font-medium text-gray-600">Revenue</th>
                <th className="px-6 py-4 text-center text-sm font-medium text-gray-600">Status</th>
                <th className="px-6 py-4 text-center text-sm font-medium text-gray-600">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {scheduleList.map((schedule) => {
            const displayDate = schedule.startDate
              ? formatDateShort(schedule.startDate)
              : '-';

            const displayTime = schedule.startTime && schedule.endTime
              ? `${schedule.startTime.slice(0,5)} - ${schedule.endTime.slice(0,5)}`
              : '-';

            // Count only confirmed enrollments for this schedule
            const scheduleEnrollments = enrollments.filter(e =>
              e.scheduleId === schedule.id &&
              e.status === 'confirmed' &&
              e.studentId !== null
            );
            const enrollmentCount = scheduleEnrollments.length;
            
            // Calculate spots left: maxSpots - enrollmentCount
            // For cancelled schedules, show 0
            const isCancelled = schedule.notes?.includes('CANCELLED:');
            const spotsLeft = isCancelled ? 0 : Math.max(0, schedule.maxSpots - enrollmentCount);

            // Revenue calculations
            const coursePrice = parseFloat(schedule.course.price.toString());
            const paidEnrollments = scheduleEnrollments.filter(e => e.paymentStatus === 'paid');
            const pendingEnrollments = scheduleEnrollments.filter(e => e.paymentStatus === 'pending');

            const collectedRevenue = paidEnrollments.length * coursePrice;
            const outstandingRevenue = pendingEnrollments.length * coursePrice;

            return (
              <tr key={schedule.id} className="hover:bg-gray-50 transition-colors">
                <td className="px-6 py-4">
                  <button
                    onClick={() => {
                      setSelectedScheduleId(schedule.id);
                      setSelectedCourseId(schedule.course.id); // Set courseId here
                      setShowRosterDialog(true);
                    }}
                    className="text-left hover:bg-gray-50 rounded p-1 -m-1 transition-colors w-full"
                  >
                    <div className="font-medium text-gray-900 hover:text-primary transition-colors" data-testid={`text-schedule-course-${schedule.id}`}>
                      {schedule.course.title}
                    </div>
                    <div className="text-sm text-gray-500">
                      {typeof schedule.course.category === 'string' ? schedule.course.category :
                       (schedule.course.category && typeof schedule.course.category === 'object' && 'name' in schedule.course.category)
                         ? (schedule.course.category as any).name || 'General'
                         : 'General'}
                    </div>
                    {spotsLeft <= 10 && spotsLeft > 0 && (
                      <span className="inline-block mt-1 px-2 py-1 text-xs bg-red-100 text-red-800 rounded-full">
                        {spotsLeft} spots left
                      </span>
                    )}
                    {spotsLeft === 0 && (
                      <span className="inline-block mt-1 px-2 py-1 text-xs bg-red-100 text-red-800 rounded-full">
                        Full
                      </span>
                    )}
                    {spotsLeft > 10 && (
                      <span className="inline-block mt-1 px-2 py-1 text-xs bg-gray-100 text-gray-800 rounded-full">
                        {spotsLeft} spots left
                      </span>
                    )}
                  </button>
                </td>
                <td className="px-6 py-4 text-sm text-gray-900">
                  <div>{displayDate}</div>
                  {displayTime !== '-' && (
                    <div className="text-xs text-gray-500">{displayTime}</div>
                  )}
                </td>
                <td className="px-6 py-4 text-center text-sm text-gray-900">{enrollmentCount}</td>
                <td className="px-6 py-4 text-center">
                  <div className="font-medium text-green-600">${collectedRevenue.toLocaleString()}</div>
                  {outstandingRevenue > 0 && (
                    <div className="text-xs text-amber-600">${outstandingRevenue.toLocaleString()}</div>
                  )}
                </td>
                <td className="px-6 py-4 text-center">
                  <span className={`inline-block px-2 py-1 text-xs rounded-full ${
                    schedule.status === 'cancelled'
                      ? 'bg-red-100 text-red-800'
                      : 'bg-green-100 text-green-800'
                  }`}>
                    {schedule.status === 'cancelled' ? 'Cancelled' : 'Active'}
                  </span>
                </td>
                <td className="px-6 py-4">
                  <div className="flex items-center justify-center gap-2">
                    {/* Edit Schedule Button */}
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 w-8 p-0 text-gray-400 hover:text-gray-600"
                          onClick={() => setEditingSchedule(schedule)}
                          data-testid={`button-edit-schedule-${schedule.id}`}
                          aria-label="Edit schedule"
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>Edit Schedule</p>
                      </TooltipContent>
                    </Tooltip>

                    {/* View Roster Button */}
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 w-8 p-0 text-gray-400 hover:text-gray-600"
                          onClick={() => {
                            setSelectedScheduleId(schedule.id);
                            setSelectedCourseId(schedule.course.id);
                            setShowRosterDialog(true);
                          }}
                          data-testid={`button-roster-schedule-${schedule.id}`}
                          aria-label="View roster"
                        >
                          <Users className="h-4 w-4" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>View Roster</p>
                      </TooltipContent>
                    </Tooltip>

                    {/* View Waitlist Button */}
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 w-8 p-0 text-gray-400 hover:text-blue-600"
                          onClick={() => {
                            setWaitlistScheduleId(schedule.id);
                            setWaitlistCourseTitle(schedule.course.title);
                            setWaitlistCourseId(schedule.courseId);
                          }}
                          data-testid={`button-waitlist-schedule-${schedule.id}`}
                          aria-label="View waitlist"
                        >
                          <UsersRound className="h-4 w-4" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>View Waitlist</p>
                      </TooltipContent>
                    </Tooltip>

                    {/* Export Roster Button */}
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 w-8 p-0 text-gray-400 hover:text-green-600"
                          onClick={() => handleExportRoster(schedule.id, schedule.course.title)}
                          data-testid={`button-export-roster-${schedule.id}`}
                          aria-label="Export roster"
                        >
                          <Download className="h-4 w-4" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>Export Roster</p>
                      </TooltipContent>
                    </Tooltip>

                    {/* More Actions Dropdown */}
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 w-8 p-0 text-gray-400 hover:text-gray-600"
                          data-testid={`button-more-actions-${schedule.id}`}
                          aria-label="More actions"
                          aria-haspopup="menu"
                        >
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem
                          onClick={() => {
                            duplicateScheduleMutation.mutate(schedule.id);
                          }}
                          disabled={duplicateScheduleMutation.isPending}
                          data-testid={`menu-duplicate-schedule-${schedule.id}`}
                        >
                          <Copy className="mr-2 h-4 w-4" />
                          Duplicate Schedule
                        </DropdownMenuItem>
                        
                        <DropdownMenuSeparator />
                        
                        <DropdownMenuItem
                          onClick={() => {
                            if (window.confirm('Are you sure you want to cancel this training schedule? It will be moved to the Cancelled tab and students will no longer be able to register.')) {
                              cancelScheduleMutation.mutate(schedule.id);
                            }
                          }}
                          disabled={cancelScheduleMutation.isPending}
                          className="text-orange-600 focus:text-orange-600"
                          data-testid={`menu-cancel-schedule-${schedule.id}`}
                        >
                          <XCircle className="mr-2 h-4 w-4" />
                          Cancel Schedule
                        </DropdownMenuItem>
                        
                        <DropdownMenuItem
                          onClick={() => {
                            if (window.confirm('Are you sure you want to permanently delete this training schedule? This action cannot be undone.')) {
                              deleteScheduleMutation.mutate(schedule.id);
                            }
                          }}
                          disabled={deleteScheduleMutation.isPending}
                          className="text-destructive focus:text-destructive"
                          data-testid={`menu-delete-schedule-${schedule.id}`}
                        >
                          <Trash2 className="mr-2 h-4 w-4" />
                          Delete Schedule
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </td>
              </tr>
            );
            })}
            </tbody>
          </table>
        </div>
      </div>
    );
  };

  // Helper function to move courses up/down
  const moveCourse = (courseId: string, direction: 'up' | 'down', courseList: CourseWithSchedules[]) => {
    const currentIndex = courseList.findIndex(c => c.id === courseId);
    if (currentIndex === -1) return;

    // Can't move up if already at the top
    if (direction === 'up' && currentIndex === 0) return;
    // Can't move down if already at the bottom
    if (direction === 'down' && currentIndex === courseList.length - 1) return;

    // Calculate the swap index
    const swapIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1;

    // Get the courses
    const currentCourse = courseList[currentIndex];
    const swapCourse = courseList[swapIndex];

    // Create updates array - swap the sortOrder values
    const updates = [
      { id: currentCourse.id, sortOrder: swapCourse.sortOrder || swapIndex },
      { id: swapCourse.id, sortOrder: currentCourse.sortOrder || currentIndex },
    ];

    // Execute the mutation
    reorderCoursesMutation.mutate(updates);
  };

  // Helper function to render course types table for each category
  const renderCourseTable = (categoryName: string, courseList: CourseWithSchedules[]) => {
    if (coursesLoading) {
      return (
        <div className="space-y-3">
          {[1, 2, 3].map(i => (
            <div key={i} className="animate-pulse grid grid-cols-6 gap-4 p-4 border-b">
              <div className="h-4 bg-muted-foreground/20 rounded" />
              <div className="h-4 bg-muted-foreground/20 rounded" />
              <div className="h-4 bg-muted-foreground/20 rounded" />
              <div className="h-4 bg-muted-foreground/20 rounded" />
              <div className="h-4 bg-muted-foreground/20 rounded" />
              <div className="h-4 bg-muted-foreground/20 rounded" />
            </div>
          ))}
        </div>
      );
    }

    if (courseList.length === 0) {
      return (
        <div className="text-center py-12 text-muted-foreground">
          No courses found in this category
        </div>
      );
    }

    return (
      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        <div className="max-h-96 overflow-y-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200 sticky top-0">
              <tr>
                <th className="px-3 py-4 text-center text-sm font-medium text-gray-600">Sort</th>
                <th className="px-6 py-4 text-left text-sm font-medium text-gray-600">Course</th>
                <th className="px-6 py-4 text-left text-sm font-medium text-gray-600">Date</th>
                <th className="px-6 py-4 text-center text-sm font-medium text-gray-600">Students</th>
                <th className="px-6 py-4 text-center text-sm font-medium text-gray-600">Revenue</th>
                <th className="px-6 py-4 text-center text-sm font-medium text-gray-600">Status</th>
                <th className="px-6 py-4 text-center text-sm font-medium text-gray-600">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {courseList.map((course, index) => {
              const enrollmentCount = enrollments.filter(e => e.courseId === course.id).length;
              const nextSchedule = course.schedules
                .filter(s => s.startDate && new Date(s.startDate) > new Date())
                .sort((a, b) => new Date(a.startDate!).getTime() - new Date(b.startDate!).getTime())[0];

              const displayDate = nextSchedule?.startDate
                ? formatDateShort(nextSchedule.startDate.toString())
                : 'NONE';

              const courseRevenue = enrollmentCount * parseFloat(course.price.toString());

              return (
                <tr key={course.id} className="hover:bg-gray-50 transition-colors">
                  {/* Sort arrows column */}
                  <td className="px-3 py-4">
                    <div className="flex flex-col items-center gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-6 w-6 p-0 text-gray-400 hover:text-gray-600 disabled:opacity-30"
                        onClick={() => moveCourse(course.id, 'up', courseList)}
                        disabled={index === 0 || reorderCoursesMutation.isPending}
                        data-testid={`button-move-up-course-${course.id}`}
                      >
                        <ChevronUp className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-6 w-6 p-0 text-gray-400 hover:text-gray-600 disabled:opacity-30"
                        onClick={() => moveCourse(course.id, 'down', courseList)}
                        disabled={index === courseList.length - 1 || reorderCoursesMutation.isPending}
                        data-testid={`button-move-down-course-${course.id}`}
                      >
                        <ChevronDown className="h-4 w-4" />
                      </Button>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="font-medium text-gray-900" data-testid={`text-course-name-${course.id}`}>
                      {course.title}
                    </div>
                    <div className="text-sm text-gray-500">
                      {typeof course.category === 'string' ? course.category :
                       (course.category && typeof course.category === 'object' && 'name' in course.category)
                         ? (course.course.category as any).name || 'General'
                         : 'General'}
                    </div>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-900">
                    <div>{displayDate}</div>
                    {nextSchedule?.startTime && (
                      <div className="text-xs text-gray-500">{nextSchedule.startTime}</div>
                    )}
                  </td>
                  <td className="px-6 py-4 text-center text-sm text-gray-900">{enrollmentCount}</td>
                  <td className="px-6 py-4 text-center text-sm font-medium text-gray-900">${courseRevenue.toLocaleString()}</td>
                  <td className="px-6 py-4 text-center">
                    <span className={`inline-block px-2 py-1 text-xs rounded-full ${
                      course.isActive
                        ? 'bg-green-100 text-green-800'
                        : categoryName === 'archived'
                        ? 'bg-red-100 text-red-800'
                        : 'bg-gray-100 text-gray-800'
                    }`}>
                      {course.isActive ? "Active" :
                       categoryName === 'archived' ? "Archived" :
                       "Unpublished"}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center justify-center gap-2">
                      {/* View Button */}
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 w-8 p-0 text-gray-400 hover:text-gray-600"
                            onClick={() => setEditingCourse(course)}
                            data-testid={`button-view-course-${course.id}`}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>View Course</p>
                        </TooltipContent>
                      </Tooltip>

                      {/* Edit Course Button */}
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 w-8 p-0 text-gray-400 hover:text-gray-600"
                            onClick={() => setEditingCourse(course)}
                            data-testid={`button-edit-course-${course.id}`}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>Edit Course</p>
                        </TooltipContent>
                      </Tooltip>

                      {/* View Roster Button */}
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 w-8 p-0 text-gray-400 hover:text-gray-600"
                            onClick={() => {
                              // For course roster, we need to find a schedule first
                              // Since our API works with schedules, let's use the first available schedule
                              const firstSchedule = course.schedules?.[0];
                              if (firstSchedule) {
                                setSelectedScheduleId(firstSchedule.id);
                                setSelectedCourseId(course.id); // Set courseId here
                                setShowRosterDialog(true);
                              } else {
                                console.log('No schedules available for course', course.id);
                              }
                            }}
                            data-testid={`button-roster-course-${course.id}`}
                          >
                            <Users className="h-4 w-4" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>View Students</p>
                        </TooltipContent>
                      </Tooltip>

                      {/* Delete Course Button */}
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 w-8 p-0 text-gray-400 hover:text-red-600"
                            onClick={() => {
                              if (window.confirm('Are you sure you want to permanently delete this course? This action cannot be undone.')) {
                                deleteCourseMutation.mutate(course.id);
                              }
                            }}
                            disabled={deleteCourseMutation.isPending}
                            data-testid={`button-delete-course-${course.id}`}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>Delete Course</p>
                        </TooltipContent>
                      </Tooltip>
                    </div>
                  </td>
                </tr>
              );
            })}
            </tbody>
          </table>
        </div>
      </div>
    );
  };

  return (
    <Layout theme="light">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Dashboard Header */}
        <div className="bg-primary rounded-xl p-6 text-primary-foreground mb-8">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h1 className="text-2xl font-bold mb-1" data-testid="text-instructor-name">
                {(user as User)?.firstName} {(user as User)?.lastName} - Instructor Dashboard
              </h1>
              <p className="text-primary-foreground/80">Manage your training business efficiently</p>
            </div>
            <div className="flex items-center space-x-4 mt-4 sm:mt-0 overflow-x-auto">
              <Button
                className="bg-accent text-black hover:bg-accent/90 whitespace-nowrap"
                onClick={() => setLocation('/course-management')}
                data-testid="button-manage-courses"
              >
                <Plus className="mr-2 h-4 w-4" />
                Manage Courses
              </Button>
              <Button
                className="bg-secondary text-black hover:bg-secondary/90 whitespace-nowrap"
                data-testid="button-view-reports"
              >
                <BarChart className="mr-2 h-4 w-4" />
                Reports
              </Button>
              <Button
                className="bg-white text-black border border-primary/20 hover:bg-gray-50 whitespace-nowrap"
                onClick={() => setLocation('/appointments')}
                data-testid="button-appointment-settings"
              >
                <CalendarClock className="mr-2 h-4 w-4" />
                Appointments
              </Button>
            </div>
          </div>
        </div>

        {/* Dashboard Stats */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-6 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Upcoming Courses</CardTitle>
              <GraduationCap className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-primary" data-testid="text-upcoming-courses">
                {statsLoading ? '...' : upcomingCourses}
              </div>
              <p className="text-sm text-muted-foreground">Scheduled events</p>
            </CardContent>
          </Card>

          <Card
            className="cursor-pointer hover:bg-muted/50 transition-colors"
            onClick={() => setShowAppointmentsModal(true)}
            data-testid="card-bookings"
          >
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Bookings</CardTitle>
              <CalendarClock className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-purple-600" data-testid="text-total-appointments">
                {statsLoading ? '...' : totalAppointments}
              </div>
              <p className="text-sm text-muted-foreground">Total appointments</p>
            </CardContent>
          </Card>

          <Link href="/students" data-testid="link-all-students">
            <Card className="cursor-pointer hover:bg-muted/50 transition-colors">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">All Students</CardTitle>
                <Users className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-blue-600" data-testid="text-all-students">
                  {statsLoading ? '...' : allStudents}
                </div>
                <p className="text-sm text-muted-foreground">Unique learners</p>
              </CardContent>
            </Card>
          </Link>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-green-600" data-testid="text-total-revenue">
                {statsLoading ? '...' : `$${totalRevenue.toLocaleString()}`}
              </div>
              <p className="text-sm text-muted-foreground">From all courses</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Outstanding Revenue</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-amber-600" data-testid="text-outstanding-revenue">
                {statsLoading ? '...' : `$${outstandingRevenue.toLocaleString()}`}
              </div>
              <p className="text-sm text-muted-foreground">Pending payments</p>
            </CardContent>
          </Card>

          <Card
            className="cursor-pointer hover:bg-muted/50 transition-colors"
            onClick={() => setShowRefundRequestsModal(true)}
          >
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Refund Requests</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-red-600" data-testid="text-refund-requests">
                {statsLoading ? '...' : dashboardStats?.refundRequests || 0}
              </div>
              <p className="text-sm text-muted-foreground">Pending refunds</p>
            </CardContent>
          </Card>
        </div>

        {/* Schedule Section */}
        <div className="bg-card rounded-lg border mb-8">
          <div className="p-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold">Schedule</h2>
              <Button
                onClick={() => setShowEventForm(true)}
                className="bg-primary hover:bg-primary/90 text-primary-foreground"
                data-testid="button-schedule-course"
              >
                <CalendarPlus className="w-4 h-4 mr-2" />
                Schedule Course
              </Button>
            </div>
            <Tabs defaultValue="upcoming" className="w-full">
              <div className="overflow-x-auto">
                <TabsList className="h-auto p-0 bg-transparent border-b border-border rounded-none justify-start min-w-max w-full">
                  <TabsTrigger
                    value="upcoming"
                    className="flex items-center gap-2 pb-4 pt-0 px-0 mr-4 sm:mr-8 border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:text-primary rounded-none bg-transparent shadow-none text-muted-foreground data-[state=active]:bg-transparent hover:text-foreground whitespace-nowrap"
                    data-testid="tab-upcoming-schedules"
                  >
                    <Clock className="w-4 h-4" />
                    Upcoming ({categorizedSchedules.upcoming.length})
                  </TabsTrigger>
                  <TabsTrigger
                    value="past"
                    className="flex items-center gap-2 pb-4 pt-0 px-0 mr-4 sm:mr-8 border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:text-primary rounded-none bg-transparent shadow-none text-muted-foreground data-[state=active]:bg-transparent hover:text-foreground whitespace-nowrap"
                    data-testid="tab-past-schedules"
                  >
                    <Archive className="w-4 h-4" />
                    Past ({categorizedSchedules.past.length})
                  </TabsTrigger>
                  <TabsTrigger
                    value="cancelled"
                    className="flex items-center gap-2 pb-4 pt-0 px-0 mr-4 sm:mr-8 border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:text-primary rounded-none bg-transparent shadow-none text-muted-foreground data-[state=active]:bg-transparent hover:text-foreground whitespace-nowrap"
                    data-testid="tab-cancelled-schedules"
                  >
                    <Trash2 className="w-4 h-4" />
                    Cancelled ({categorizedSchedules.cancelled.length})
                  </TabsTrigger>
                  <TabsTrigger
                    value="deleted"
                    className="flex items-center gap-2 pb-4 pt-0 px-0 mr-4 sm:mr-8 border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:text-primary rounded-none bg-transparent shadow-none text-muted-foreground data-[state=active]:bg-transparent hover:text-foreground whitespace-nowrap"
                    data-testid="tab-deleted-schedules"
                  >
                    <Trash2 className="w-4 h-4" />
                    Deleted ({deletedSchedules.length})
                  </TabsTrigger>
                </TabsList>
              </div>

              {/* Schedule Tab Content */}
              <TabsContent value="upcoming" className="mt-0">
                <div className="py-6">
                  {renderScheduleCards('upcoming', categorizedSchedules.upcoming)}
                </div>
              </TabsContent>

              <TabsContent value="past" className="mt-0">
                <div className="py-6">
                  {renderScheduleCards('past', categorizedSchedules.past)}
                </div>
              </TabsContent>

              <TabsContent value="cancelled" className="mt-0">
                <div className="py-6">
                  {renderScheduleCards('cancelled', categorizedSchedules.cancelled)}
                </div>
              </TabsContent>

              <TabsContent value="deleted" className="mt-0">
                <div className="py-6">
                  {deletedSchedulesLoading ? (
                    <div className="flex items-center justify-center py-8">
                      <div className="animate-spin w-6 h-6 border-2 border-primary border-t-transparent rounded-full" />
                    </div>
                  ) : deletedSchedules.length === 0 ? (
                    <div className="text-center py-8">
                      <Trash2 className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                      <h3 className="text-lg font-medium text-foreground mb-2">No Deleted Schedules</h3>
                      <p className="text-muted-foreground">Deleted training schedules will appear here.</p>
                    </div>
                  ) : (
                    <div className="grid gap-6">
                      {deletedSchedules.map((schedule: any) => (
                        <Card key={schedule.id} className="border border-destructive/20 bg-destructive/5">
                          <CardContent className="p-4 sm:p-6">
                            <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
                              <div className="flex-1 min-w-0">
                                <h3 className="font-semibold text-lg mb-2 truncate" data-testid={`text-schedule-title-${schedule.id}`}>
                                  {schedule.course?.title || 'Unknown Course'}
                                </h3>
                                <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 text-sm text-muted-foreground mb-4">
                                  <span className="whitespace-nowrap">{schedule.startDate ? formatDateSafe(schedule.startDate.toString()) : 'Unknown'}</span>
                                  <span className="whitespace-nowrap">{schedule.startTime} - {schedule.endTime}</span>
                                  {schedule.location && <span className="truncate">{schedule.location}</span>}
                                </div>
                                <Badge variant="destructive" className="mb-2">Deleted</Badge>
                                <p className="text-sm text-muted-foreground">
                                  Deleted on {schedule.deletedAt ? formatDateSafe(schedule.deletedAt.toString()) : 'Unknown'}
                                </p>
                              </div>
                              <div className="flex-shrink-0 w-full sm:w-auto">
                                <Button
                                  onClick={() => openDeleteConfirmation('schedule', schedule.id, `${schedule.course.title} - ${schedule.startDate ? formatDateSafe(schedule.startDate.toString()) : 'Unknown'}`)}
                                  variant="destructive"
                                  size="sm"
                                  disabled={permanentDeleteScheduleMutation.isPending}
                                  className="w-full sm:w-auto"
                                  data-testid={`button-permanent-delete-schedule-${schedule.id}`}
                                >
                                  <Trash2 className="w-4 h-4 mr-2" />
                                  {permanentDeleteScheduleMutation.isPending ? "Deleting..." : "Delete Permanently"}
                                </Button>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  )}
                </div>
              </TabsContent>
            </Tabs>
          </div>
        </div>


        {/* Category Management Section */}
        <div className="bg-card rounded-lg border mt-8">
          <div className="p-6">
            <Accordion type="single" collapsible className="w-full">
              <AccordionItem value="category-management" className="border-0">
                <AccordionTrigger className="hover:no-underline py-3">
                  <div className="flex items-center gap-2">
                    <Settings className="h-4 w-4" />
                    <div>
                      <h2 className="text-xl font-semibold text-left flex items-center gap-2">
                        Category Management
                      </h2>
                      <p className="text-sm text-muted-foreground text-left mt-1">
                        Click to expand and manage course categories
                      </p>
                    </div>
                  </div>
                </AccordionTrigger>
                <AccordionContent>
                  <CategoryManagement />
                </AccordionContent>
              </AccordionItem>
            </Accordion>
          </div>
        </div>
      </div>

      {/* Edit Course Form */}
      {editingCourse && (
        <EditCourseForm
          course={editingCourse}
          isOpen={!!editingCourse}
          onClose={() => setEditingCourse(null)}
          onCourseUpdated={() => {
            // Course list will automatically refresh via query invalidation
          }}
        />
      )}

      {/* Edit Schedule Form */}
      {editingSchedule && (
        <EditScheduleForm
          schedule={editingSchedule}
          isOpen={!!editingSchedule}
          onClose={() => setEditingSchedule(null)}
          onScheduleUpdated={() => {
            // Schedule list will automatically refresh via query invalidation
          }}
        />
      )}

      {/* Event Creation Form Modal */}
      <EventCreationForm
        isOpen={showEventForm}
        onClose={() => setShowEventForm(false)}
        onEventCreated={() => {
          setShowEventForm(false);
          // The form handles query invalidation internally
        }}
      />

      {/* Roster Dialog */}
      <RosterDialog
        scheduleId={selectedScheduleId}
        courseId={selectedCourseId}
        isOpen={showRosterDialog}
        onClose={() => {
          setShowRosterDialog(false);
          setSelectedScheduleId(null);
          setSelectedCourseId(null);
        }}
      />

      {/* Waitlist Dialog */}
      <WaitlistDialog
        scheduleId={waitlistScheduleId}
        courseTitle={waitlistCourseTitle}
        courseId={waitlistCourseId}
        onClose={() => {
          setWaitlistScheduleId(null);
          setWaitlistCourseTitle("");
          setWaitlistCourseId("");
        }}
      />

      {/* Permanent Delete Confirmation Dialog */}
      <Dialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-red-600">
              Permanent Deletion Confirmation
            </DialogTitle>
            <DialogDescription>
              You are about to permanently delete{' '}
              <span className="font-semibold">{deleteTarget?.title}</span>.
              This action cannot be undone and will permanently remove all data.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <Label htmlFor="confirmText" className="text-sm font-medium">
                Type <span className="font-mono font-bold text-red-600">DELETE</span> to confirm:
              </Label>
              <Input
                id="confirmText"
                value={deleteConfirmText}
                onChange={(e) => setDeleteConfirmText(e.target.value)}
                placeholder="Type DELETE to confirm"
                className="mt-1"
                autoComplete="off"
              />
            </div>

            <div className="flex gap-3 justify-end">
              <Button
                variant="outline"
                onClick={() => {
                  setShowDeleteConfirm(false);
                  setDeleteTarget(null);
                  setDeleteConfirmText('');
                }}
              >
                Cancel
              </Button>
              <Button
                variant="destructive"
                onClick={handleDeleteConfirmation}
                disabled={deleteConfirmText !== 'DELETE' || (deleteTarget?.type === 'course' && permanentDeleteCourseMutation.isPending) || (deleteTarget?.type === 'schedule' && permanentDeleteScheduleMutation.isPending)}
              >
                {((deleteTarget?.type === 'course' && permanentDeleteCourseMutation.isPending) || (deleteTarget?.type === 'schedule' && permanentDeleteScheduleMutation.isPending)) ? 'Deleting...' : 'Delete Permanently'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Refund Requests Modal */}
      <Dialog open={showRefundRequestsModal} onOpenChange={setShowRefundRequestsModal}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Refund Requests</DialogTitle>
            <DialogDescription>
              Students who have requested refunds for their enrollments
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {refundRequests.length === 0 ? (
              <div className="text-center py-8">
                <DollarSign className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-medium text-foreground mb-2">No Pending Refund Requests</h3>
                <p className="text-muted-foreground">All refund requests have been processed.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {refundRequests.map((enrollment) => (
                  <Card key={enrollment.id}>
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <h4 className="font-semibold text-lg mb-2">
                            {enrollment.student?.firstName} {enrollment.student?.lastName}
                          </h4>
                          <div className="space-y-1 text-sm text-muted-foreground">
                            <p>
                              <span className="font-medium">Email:</span> {enrollment.student?.email}
                            </p>
                            <p>
                              <span className="font-medium">Course:</span> {enrollment.course?.title}
                            </p>
                            <p>
                              <span className="font-medium">Schedule:</span>{' '}
                              {enrollment.schedule?.startDate ? formatDateSafe(enrollment.schedule.startDate.toString()) : 'N/A'}
                            </p>
                            <p>
                              <span className="font-medium">Requested:</span>{' '}
                              {enrollment.refundRequestedAt ? formatDateSafe(enrollment.refundRequestedAt.toString()) : 'N/A'}
                            </p>
                            <p>
                              <span className="font-medium">Amount:</span> ${enrollment.course?.price ? parseFloat(enrollment.course.price.toString()).toFixed(2) : '0.00'}
                            </p>
                          </div>
                        </div>
                        <div className="flex-shrink-0 ml-4">
                          {expandedRefundId !== enrollment.id ? (
                            <Button
                              onClick={() => {
                                setExpandedRefundId(enrollment.id);
                                // Initialize form data if not exists
                                if (!refundFormData[enrollment.id]) {
                                  setRefundFormData(prev => ({
                                    ...prev,
                                    [enrollment.id]: { amount: '', reason: '' }
                                  }));
                                }
                              }}
                              size="sm"
                              data-testid={`button-process-refund-${enrollment.id}`}
                            >
                              Process Refund
                            </Button>
                          ) : (
                            <Button
                              variant="outline"
                              onClick={() => {
                                setExpandedRefundId(null);
                              }}
                              size="sm"
                              data-testid={`button-collapse-refund-${enrollment.id}`}
                            >
                              Cancel
                            </Button>
                          )}
                        </div>
                      </div>

                      {/* Refund Form - Shows when expanded */}
                      {expandedRefundId === enrollment.id && (
                        <div className="mt-4 p-4 bg-purple-50 rounded-lg border border-purple-200">
                          <div className="space-y-3">
                            <div>
                              <Label htmlFor={`refund-amount-${enrollment.id}`} className="text-sm font-medium">
                                Refund Amount (Optional)
                              </Label>
                              <Input
                                id={`refund-amount-${enrollment.id}`}
                                type="number"
                                step="0.01"
                                min="0"
                                max={enrollment.course?.price ? parseFloat(enrollment.course.price.toString()) : undefined}
                                placeholder={`Leave empty for full refund ($${enrollment.course?.price ? parseFloat(enrollment.course.price.toString()).toFixed(2) : '0.00'})`}
                                value={refundFormData[enrollment.id]?.amount || ''}
                                onChange={(e) => {
                                  setRefundFormData(prev => ({
                                    ...prev,
                                    [enrollment.id]: {
                                      ...prev[enrollment.id],
                                      amount: e.target.value
                                    }
                                  }));
                                }}
                                className="bg-white mt-1"
                                data-testid={`input-refund-amount-${enrollment.id}`}
                              />
                              <p className="text-xs text-purple-700 mt-1">
                                Full refund amount: ${enrollment.course?.price ? parseFloat(enrollment.course.price.toString()).toFixed(2) : '0.00'}
                              </p>
                            </div>

                            <div>
                              <Label htmlFor={`refund-reason-${enrollment.id}`} className="text-sm font-medium">
                                Refund Reason (Optional)
                              </Label>
                              <Textarea
                                id={`refund-reason-${enrollment.id}`}
                                placeholder="Enter reason for refund (e.g., Student requested cancellation)"
                                value={refundFormData[enrollment.id]?.reason || ''}
                                onChange={(e) => {
                                  setRefundFormData(prev => ({
                                    ...prev,
                                    [enrollment.id]: {
                                      ...prev[enrollment.id],
                                      reason: e.target.value
                                    }
                                  }));
                                }}
                                className="bg-white mt-1"
                                rows={3}
                                data-testid={`input-refund-reason-${enrollment.id}`}
                              />
                            </div>

                            <div className="flex gap-2 pt-2">
                              <Button
                                onClick={() => {
                                  const formData = refundFormData[enrollment.id];
                                  const amount = formData?.amount ? parseFloat(formData.amount) : undefined;

                                  if (amount !== undefined && (isNaN(amount) || amount <= 0)) {
                                    toast({
                                      title: "Invalid Amount",
                                      description: "Please enter a valid refund amount or leave empty for full refund.",
                                      variant: "destructive",
                                    });
                                    return;
                                  }

                                  processRefundMutation.mutate({
                                    enrollmentId: enrollment.id,
                                    refundAmount: amount,
                                    refundReason: formData?.reason || undefined
                                  });
                                }}
                                disabled={processRefundMutation.isPending}
                                className="bg-purple-600 hover:bg-purple-700"
                                data-testid={`button-confirm-refund-${enrollment.id}`}
                              >
                                {processRefundMutation.isPending ? "Processing..." : "Confirm Refund"}
                              </Button>
                              <Button
                                variant="outline"
                                onClick={() => {
                                  setExpandedRefundId(null);
                                }}
                                disabled={processRefundMutation.isPending}
                                data-testid={`button-cancel-refund-form-${enrollment.id}`}
                              >
                                Cancel
                              </Button>
                            </div>

                            <div className="bg-white p-3 rounded-lg border border-purple-200">
                              <p className="text-xs text-purple-700">
                                <strong>Note:</strong> Processing this refund will create a refund in Stripe,
                                update the enrollment status to "Refunded", and automatically send a notification
                                to the student.
                              </p>
                            </div>
                          </div>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Appointments Modal */}
      {user && (
        <AppointmentsModal
          isOpen={showAppointmentsModal}
          onClose={() => setShowAppointmentsModal(false)}
          instructorId={(user as User).id}
        />
      )}

      {/* Online Students Modal */}
      <Dialog open={showOnlineStudentsModal} onOpenChange={setShowOnlineStudentsModal}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader className="relative">
            <DialogTitle className="flex items-center gap-2 pr-8">
              <Users className="h-5 w-5 text-purple-600" />
              Online Students
            </DialogTitle>
            <DialogDescription>
              Students enrolled in the online New Mexico concealed carry course
            </DialogDescription>
          </DialogHeader>

          <Tabs defaultValue="current" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="current" data-testid="tab-current-online-students">
                Current Students
              </TabsTrigger>
              <TabsTrigger value="former" data-testid="tab-former-online-students">
                Former Students
              </TabsTrigger>
            </TabsList>

            <TabsContent value="current" className="mt-4" data-testid="content-current-online-students">
              <div className="space-y-4">
                {statsLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <div className="animate-spin w-6 h-6 border-2 border-primary border-t-transparent rounded-full" />
                  </div>
                ) : onlineStudents === 0 ? (
                  <div className="text-center py-8">
                    <Users className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-foreground mb-2">No Current Online Students</h3>
                    <p className="text-muted-foreground">No students are currently enrolled in the online CCW course.</p>
                  </div>
                ) : (
                  <div className="border rounded-lg overflow-hidden">
                    <table className="w-full">
                      <thead className="bg-gray-50 border-b border-gray-200">
                        <tr>
                          <th className="px-6 py-4 text-left text-sm font-medium text-gray-600">Student</th>
                          <th className="px-6 py-4 text-left text-sm font-medium text-gray-600">Email</th>
                          <th className="px-6 py-4 text-left text-sm font-medium text-gray-600">Phone</th>
                          <th className="px-6 py-4 text-center text-sm font-medium text-gray-600">Payment Status</th>
                          <th className="px-6 py-4 text-center text-sm font-medium text-gray-600">Enrollment Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {enrollments
                          .filter(e => {
                            // Filter for online New Mexico concealed carry course
                            return e.course?.title &&
                              e.course.title.toLowerCase().includes('online') &&
                              (e.course.title.toLowerCase().includes('concealed carry') ||
                               e.course.title.toLowerCase().includes('ccw')) &&
                              e.course.title.toLowerCase().includes('new mexico') &&
                              e.studentId !== null &&
                              (e.status === 'confirmed' || e.status === 'pending');
                          })
                          .map((enrollment) => (
                            <tr key={enrollment.id} className="hover:bg-gray-50">
                              <td className="px-6 py-4">
                                <div className="font-medium text-gray-900">
                                  {enrollment.student?.firstName} {enrollment.student?.lastName}
                                </div>
                              </td>
                              <td className="px-6 py-4">
                                <a
                                  href={`mailto:${enrollment.student?.email}`}
                                  className="text-blue-600 hover:text-blue-800 hover:underline flex items-center gap-1"
                                >
                                  {enrollment.student?.email}
                                </a>
                              </td>
                              <td className="px-6 py-4 text-sm text-gray-900">
                                {enrollment.student?.phone || '-'}
                              </td>
                              <td className="px-6 py-4 text-center">
                                <Badge
                                  variant={enrollment.paymentStatus === 'paid' ? 'default' : 'secondary'}
                                  className={enrollment.paymentStatus === 'paid' ? 'bg-green-500' : 'bg-amber-500'}
                                >
                                  {enrollment.paymentStatus}
                                </Badge>
                              </td>
                              <td className="px-6 py-4 text-center">
                                <Badge className={getEnrollmentStatusClassName(enrollment.status)}>
                                  {enrollment.status}
                                </Badge>
                              </td>
                            </tr>
                          ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </TabsContent>

            <TabsContent value="former" className="mt-4" data-testid="content-former-online-students">
              <div className="text-center py-8">
                <Users className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-medium text-foreground mb-2">Former Students</h3>
                <p className="text-muted-foreground">
                  Online students who have attended an in-person training session will appear here.
                </p>
                <p className="text-sm text-muted-foreground mt-2">
                  This functionality will be added soon.
                </p>
              </div>
            </TabsContent>
          </Tabs>
        </DialogContent>
      </Dialog>
    </Layout>
  );
}