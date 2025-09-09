import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { useLocation } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Layout } from "@/components/Layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
import { CourseCreationForm } from "@/components/CourseCreationForm";
import { isUnauthorizedError } from "@/lib/authUtils";
import { Plus, BarChart, GraduationCap, DollarSign, Users, TrendingUp, Clock, Archive, Eye, EyeOff, Trash2, Edit, MoreVertical, CalendarPlus, Calendar, Copy } from "lucide-react";
import type { CourseWithSchedules, EnrollmentWithDetails, User } from "@shared/schema";
import { formatDateShort, formatDateSafe } from "@/lib/dateUtils";

export default function InstructorDashboard() {
  const { user, isLoading, isAuthenticated } = useAuth();
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();
  const [editingCourse, setEditingCourse] = useState<CourseWithSchedules | null>(null);
  const [editingSchedule, setEditingSchedule] = useState<any | null>(null);
  const [showEventForm, setShowEventForm] = useState(false);
  const [showCourseForm, setShowCourseForm] = useState(false);
  
  // Permanent deletion confirmation states
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState('');
  const [deleteTarget, setDeleteTarget] = useState<{type: 'course' | 'schedule', id: string, title: string} | null>(null);

  const { data: courses = [], isLoading: coursesLoading } = useQuery<CourseWithSchedules[]>({
    queryKey: ["/api/instructor/courses"],
    enabled: isAuthenticated && (user as User)?.role === 'instructor',
    retry: false,
  });

  const { data: enrollments = [], isLoading: enrollmentsLoading } = useQuery<EnrollmentWithDetails[]>({
    queryKey: ["/api/instructor/enrollments"],
    enabled: isAuthenticated && (user as User)?.role === 'instructor',
    retry: false,
  });

  const { data: deletedCourses = [], isLoading: deletedCoursesLoading } = useQuery<CourseWithSchedules[]>({
    queryKey: ["/api/instructor/deleted-courses"],
    enabled: isAuthenticated && (user as User)?.role === 'instructor',
    retry: false,
  });

  const { data: deletedSchedules = [], isLoading: deletedSchedulesLoading } = useQuery<any[]>({
    queryKey: ["/api/instructor/deleted-schedules"],
    enabled: isAuthenticated && (user as User)?.role === 'instructor',
    retry: false,
  });

  // Fetch dashboard statistics
  const { data: dashboardStats, isLoading: statsLoading } = useQuery<{
    upcomingCourses: number;
    pastCourses: number;
    allStudents: number;
    totalRevenue: number;
    outstandingRevenue: number;
  }>({
    queryKey: ["/api/instructor/dashboard-stats"],
    enabled: isAuthenticated && (user as User)?.role === 'instructor',
    retry: false,
  });

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
          window.location.href = "/api/login";
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
          window.location.href = "/api/login";
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
          window.location.href = "/api/login";
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
      const response = await apiRequest("POST", `/api/instructor/schedules/${scheduleId}/duplicate`);
      return response.json();
    },
    onSuccess: (data) => {
      toast({
        title: "Schedule Duplicated",
        description: "Schedule has been duplicated successfully. Opening edit form...",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/instructor/courses"] });
      
      // Open edit form for the newly duplicated schedule
      setTimeout(() => {
        setEditingSchedule(data.schedule);
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
          window.location.href = "/api/login";
        }, 500);
        return;
      }
      toast({
        title: "Duplication Failed",
        description: "Failed to duplicate schedule. Please try again.",
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
          window.location.href = "/api/login";
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
          window.location.href = "/api/login";
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
          window.location.href = "/api/login";
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
          window.location.href = "/api/login";
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
    },
    onError: (error) => {
      if (isUnauthorizedError(error)) {
        toast({
          title: "Unauthorized",
          description: "You are logged out. Logging in again...",
          variant: "destructive",
        });
        setTimeout(() => {
          window.location.href = "/api/login";
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
    },
    onError: (error) => {
      if (isUnauthorizedError(error)) {
        toast({
          title: "Unauthorized",
          description: "You are logged out. Logging in again...",
          variant: "destructive",
        });
        setTimeout(() => {
          window.location.href = "/api/login";
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
    if (!isLoading && (!isAuthenticated || (user as User)?.role !== 'instructor')) {
      toast({
        title: "Unauthorized",
        description: "You need instructor access to view this page. Redirecting...",
        variant: "destructive",
      });
      setTimeout(() => {
        window.location.href = "/api/login";
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
  const pastCourses = dashboardStats?.pastCourses || 0;
  const allStudents = dashboardStats?.allStudents || 0;
  const totalRevenue = dashboardStats?.totalRevenue || 0;
  const outstandingRevenue = dashboardStats?.outstandingRevenue || 0;

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
      <div className="space-y-3">
        {scheduleList.map((schedule) => {
          const displayDate = schedule.startDate 
            ? formatDateShort(schedule.startDate)
            : '-';
          
          const displayTime = schedule.startTime && schedule.endTime 
            ? `${schedule.startTime.slice(0,5)} - ${schedule.endTime.slice(0,5)}`
            : '-';

          const scheduleEnrollments = enrollments.filter(e => e.scheduleId === schedule.id);
          const enrollmentCount = scheduleEnrollments.length;
          const spotsLeft = schedule.availableSpots;
          
          // Revenue calculations
          const coursePrice = parseFloat(schedule.course.price.toString());
          const paidEnrollments = scheduleEnrollments.filter(e => e.paymentStatus === 'paid');
          const pendingEnrollments = scheduleEnrollments.filter(e => e.paymentStatus === 'pending');
          
          const collectedRevenue = paidEnrollments.length * coursePrice;
          const outstandingRevenue = pendingEnrollments.length * coursePrice;
          
          return (
            <div key={schedule.id} className="bg-card border rounded-lg p-4 hover:shadow-sm transition-shadow">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 space-y-3">
                  {/* Course title and spots left */}
                  <div className="flex items-center gap-3">
                    <h3 className="font-medium text-card-foreground" data-testid={`text-schedule-course-${schedule.id}`}>
                      {schedule.course.title}
                    </h3>
                    {spotsLeft <= 10 && spotsLeft > 0 && (
                      <Badge variant="destructive" className="text-xs">
                        {spotsLeft} spots left
                      </Badge>
                    )}
                    {spotsLeft === 0 && (
                      <Badge variant="destructive" className="text-xs">
                        Full
                      </Badge>
                    )}
                    {spotsLeft > 10 && (
                      <Badge variant="secondary" className="text-xs">
                        {spotsLeft} spots left
                      </Badge>
                    )}
                  </div>
                  
                  {/* Course details with revenue in a compact layout */}
                  <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 text-sm text-muted-foreground">
                    <div className="flex items-center gap-1">
                      <Calendar className="h-4 w-4" />
                      <span>{displayDate}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Users className="h-4 w-4" />
                      <span>{enrollmentCount} enrolled</span>
                    </div>
                    <div>
                      <div className="text-xs text-muted-foreground">Collected Revenue</div>
                      <div className="font-medium text-emerald-600">${collectedRevenue.toLocaleString()}</div>
                    </div>
                    <div>
                      <div className="text-xs text-muted-foreground">Outstanding Revenue</div>
                      <div className="font-medium text-amber-600">${outstandingRevenue.toLocaleString()}</div>
                    </div>
                  </div>
                </div>
                
                {/* Actions */}
                <div className="flex items-center gap-2">
                  {/* Edit Schedule Button */}
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 w-8 p-0 text-muted-foreground hover:text-foreground"
                    onClick={() => setEditingSchedule(schedule)}
                    data-testid={`button-edit-schedule-${schedule.id}`}
                  >
                    <Edit className="h-4 w-4" />
                  </Button>
                  
                  {/* View Roster Button */}
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 w-8 p-0 text-muted-foreground hover:text-foreground"
                    onClick={() => console.log('View roster for schedule', schedule.id)}
                    data-testid={`button-roster-schedule-${schedule.id}`}
                  >
                    <Users className="h-4 w-4" />
                  </Button>
                  
                  {/* Duplicate Schedule Button */}
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 w-8 p-0 text-muted-foreground hover:text-foreground"
                    onClick={() => duplicateScheduleMutation.mutate(schedule.id)}
                    disabled={duplicateScheduleMutation.isPending}
                    data-testid={`button-duplicate-schedule-${schedule.id}`}
                  >
                    <Copy className="h-4 w-4" />
                  </Button>
                  
                  {/* More Actions Dropdown */}
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 w-8 p-0 text-muted-foreground hover:text-foreground"
                        data-testid={`button-more-schedule-${schedule.id}`}
                      >
                        <MoreVertical className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem
                        onClick={() => unpublishScheduleMutation.mutate(schedule.id)}
                        disabled={unpublishScheduleMutation.isPending}
                        data-testid={`menuitem-unpublish-schedule-${schedule.id}`}
                      >
                        <EyeOff className="mr-2 h-4 w-4" />
                        {unpublishScheduleMutation.isPending ? 'Unpublishing...' : 'Unpublish'}
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() => cancelScheduleMutation.mutate(schedule.id)}
                        disabled={cancelScheduleMutation.isPending}
                        data-testid={`menuitem-cancel-schedule-${schedule.id}`}
                      >
                        <Trash2 className="mr-2 h-4 w-4" />
                        {cancelScheduleMutation.isPending ? 'Cancelling...' : 'Cancel'}
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem
                        onClick={() => {
                          if (window.confirm('Are you sure you want to permanently delete this training schedule? This action cannot be undone.')) {
                            deleteScheduleMutation.mutate(schedule.id);
                          }
                        }}
                        disabled={deleteScheduleMutation.isPending}
                        className="text-destructive"
                        data-testid={`menuitem-delete-schedule-${schedule.id}`}
                      >
                        <Trash2 className="mr-2 h-4 w-4" />
                        {deleteScheduleMutation.isPending ? 'Deleting...' : 'Delete Schedule'}
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    );
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
      <div className="overflow-x-auto">
        {/* Table Header */}
        <div className="grid gap-4 p-4 border-b bg-muted/30 text-sm font-medium text-muted-foreground" style={{ gridTemplateColumns: '2fr 1.5fr 1fr 1fr 1fr 1.5fr' }}>
          <div>Course</div>
          <div>Next Course</div>
          <div>Students</div>
          <div>Revenue</div>
          <div>Status</div>
          <div>Actions</div>
        </div>
        
        {/* Table Body */}
        <div className="divide-y">
          {courseList.map(course => {
            const enrollmentCount = enrollments.filter(e => e.courseId === course.id).length;
            const nextSchedule = course.schedules
              .filter(s => s.startDate && new Date(s.startDate) > new Date())
              .sort((a, b) => new Date(a.startDate!).getTime() - new Date(b.startDate!).getTime())[0];
            
            const displayDate = nextSchedule?.startDate
              ? formatDateShort(nextSchedule.startDate)
              : 'NONE';

            const courseRevenue = enrollmentCount * parseFloat(course.price.toString());
            
            return (
              <div key={course.id} className="grid gap-4 p-4 hover:bg-muted/20 transition-colors" style={{ gridTemplateColumns: '2fr 1.5fr 1fr 1fr 1fr 1.5fr' }}>
                <div>
                  <div className="font-medium text-card-foreground" data-testid={`text-course-name-${course.id}`}>
                    {course.title}
                  </div>
                  <div className="text-sm text-muted-foreground">{course.category}</div>
                </div>
                <div className="text-sm">
                  {displayDate}
                  {nextSchedule?.startTime && (
                    <div className="text-xs text-muted-foreground">{nextSchedule.startTime}</div>
                  )}
                </div>
                <div className="text-sm">{enrollmentCount}</div>
                <div className="text-sm font-medium">${courseRevenue.toLocaleString()}</div>
                <div>
                  <Badge variant={
                    course.isActive ? "default" :
                    categoryName === 'archived' ? "destructive" :
                    "outline"
                  } className="text-xs">
                    {course.isActive ? "Active" : 
                     categoryName === 'archived' ? "Archived" : 
                     "Unpublished"}
                  </Badge>
                </div>
                <div className="flex items-center gap-2">
                  {/* Edit Course Button */}
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 w-8 p-0 text-muted-foreground hover:text-foreground"
                    onClick={() => setEditingCourse(course)}
                    data-testid={`button-edit-course-${course.id}`}
                  >
                    <Edit className="h-4 w-4" />
                  </Button>
                  
                  {/* View Roster Button */}
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 w-8 p-0 text-muted-foreground hover:text-foreground"
                    onClick={() => console.log('View roster for course', course.id)}
                    data-testid={`button-roster-course-${course.id}`}
                  >
                    <Users className="h-4 w-4" />
                  </Button>
                  
                  {/* Duplicate Course Button */}
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 w-8 p-0 text-muted-foreground hover:text-foreground"
                    onClick={() => duplicateCourseMutation.mutate(course.id)}
                    disabled={duplicateCourseMutation.isPending}
                    data-testid={`button-duplicate-course-${course.id}`}
                  >
                    <Copy className="h-4 w-4" />
                  </Button>
                  
                  {/* More Actions Dropdown */}
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 w-8 p-0 text-muted-foreground hover:text-foreground"
                        data-testid={`button-more-actions-${course.id}`}
                      >
                        <MoreVertical className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem
                        onClick={() => unpublishCourseMutation.mutate(course.id)}
                        disabled={unpublishCourseMutation.isPending}
                        data-testid={`menuitem-unpublish-${course.id}`}
                      >
                        <EyeOff className="mr-2 h-4 w-4" />
                        {unpublishCourseMutation.isPending ? 'Unpublishing...' : 'Unpublish'}
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() => archiveCourseMutation.mutate(course.id)}
                        disabled={archiveCourseMutation.isPending}
                        data-testid={`menuitem-archive-${course.id}`}
                      >
                        <Archive className="mr-2 h-4 w-4" />
                        {archiveCourseMutation.isPending ? 'Archiving...' : 'Archive'}
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem
                        onClick={() => {
                          if (window.confirm('Are you sure you want to permanently delete this course? This action cannot be undone.')) {
                            deleteCourseMutation.mutate(course.id);
                          }
                        }}
                        disabled={deleteCourseMutation.isPending}
                        className="text-destructive"
                        data-testid={`menuitem-delete-${course.id}`}
                      >
                        <Trash2 className="mr-2 h-4 w-4" />
                        {deleteCourseMutation.isPending ? 'Deleting...' : 'Delete Course'}
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  return (
    <Layout>
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
            <div className="flex items-center space-x-4 mt-4 sm:mt-0">
              <Button 
                className="bg-accent text-accent-foreground hover:bg-accent/90"
                onClick={() => setLocation('/course-management')}
                data-testid="button-manage-courses"
              >
                <Plus className="mr-2 h-4 w-4" />
                Manage Courses
              </Button>
              <Button 
                className="bg-secondary text-secondary-foreground hover:bg-secondary/90"
                data-testid="button-view-reports"
              >
                <BarChart className="mr-2 h-4 w-4" />
                Reports
              </Button>
            </div>
          </div>
        </div>

        {/* Dashboard Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-6 mb-8">
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

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Past Courses</CardTitle>
              <GraduationCap className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-muted-foreground" data-testid="text-past-courses">
                {statsLoading ? '...' : pastCourses}
              </div>
              <p className="text-sm text-muted-foreground">Completed events</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">All Students</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-accent" data-testid="text-all-students">
                {statsLoading ? '...' : allStudents}
              </div>
              <p className="text-sm text-muted-foreground">Unique students</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-success" data-testid="text-total-revenue">
                {statsLoading ? '...' : `$${totalRevenue.toLocaleString()}`}
              </div>
              <p className="text-sm text-muted-foreground">Lifetime earnings</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Outstanding Revenue</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-secondary" data-testid="text-outstanding-revenue">
                {statsLoading ? '...' : `$${outstandingRevenue.toLocaleString()}`}
              </div>
              <p className="text-sm text-muted-foreground">Deposit balance</p>
            </CardContent>
          </Card>
        </div>

        {/* Schedule Management Section */}
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
              <TabsList className="h-auto p-0 bg-transparent border-b border-border rounded-none justify-start w-full">
                <TabsTrigger 
                  value="upcoming" 
                  className="flex items-center gap-2 pb-4 pt-0 px-0 mr-8 border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:text-primary rounded-none bg-transparent shadow-none text-muted-foreground data-[state=active]:bg-transparent hover:text-foreground"
                  data-testid="tab-upcoming-schedules"
                >
                  <Clock className="w-4 h-4" />
                  Upcoming ({categorizedSchedules.upcoming.length})
                </TabsTrigger>
                <TabsTrigger 
                  value="past" 
                  className="flex items-center gap-2 pb-4 pt-0 px-0 mr-8 border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:text-primary rounded-none bg-transparent shadow-none text-muted-foreground data-[state=active]:bg-transparent hover:text-foreground"
                  data-testid="tab-past-schedules"
                >
                  <Archive className="w-4 h-4" />
                  Past ({categorizedSchedules.past.length})
                </TabsTrigger>
                <TabsTrigger 
                  value="cancelled" 
                  className="flex items-center gap-2 pb-4 pt-0 px-0 mr-8 border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:text-primary rounded-none bg-transparent shadow-none text-muted-foreground data-[state=active]:bg-transparent hover:text-foreground"
                  data-testid="tab-cancelled-schedules"
                >
                  <Trash2 className="w-4 h-4" />
                  Cancelled ({categorizedSchedules.cancelled.length})
                </TabsTrigger>
                <TabsTrigger 
                  value="deleted" 
                  className="flex items-center gap-2 pb-4 pt-0 px-0 mr-8 border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:text-primary rounded-none bg-transparent shadow-none text-muted-foreground data-[state=active]:bg-transparent hover:text-foreground"
                  data-testid="tab-deleted-schedules"
                >
                  <Trash2 className="w-4 h-4" />
                  Deleted ({deletedSchedules.length})
                </TabsTrigger>
              </TabsList>

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
                                  <span className="whitespace-nowrap">{formatDateSafe(schedule.startDate)}</span>
                                  <span className="whitespace-nowrap">{schedule.startTime} - {schedule.endTime}</span>
                                  {schedule.location && <span className="truncate">{schedule.location}</span>}
                                </div>
                                <Badge variant="destructive" className="mb-2">Deleted</Badge>
                                <p className="text-sm text-muted-foreground">
                                  Deleted on {schedule.deletedAt ? formatDateSafe(schedule.deletedAt) : 'Unknown'}
                                </p>
                              </div>
                              <div className="flex-shrink-0 w-full sm:w-auto">
                                <Button
                                  onClick={() => openDeleteConfirmation('schedule', schedule.id, `${schedule.course.title} - ${formatDateSafe(schedule.startDate)}`)}
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

        {/* Course Types Section */}
        <div className="bg-card rounded-lg border">
          <div className="p-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold">Active Course Types</h2>
              <Button 
                onClick={() => setShowCourseForm(true)}
                className="bg-primary hover:bg-primary/90 text-primary-foreground"
                data-testid="button-create-new-course"
              >
                <Plus className="w-4 h-4 mr-2" />
                Create New Course
              </Button>
            </div>
            <Tabs defaultValue="active" className="w-full">
              <TabsList className="h-auto p-0 bg-transparent border-b border-border rounded-none justify-start w-full">
                <TabsTrigger 
                  value="active" 
                  className="flex items-center gap-2 pb-4 pt-0 px-0 mr-8 border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:text-primary rounded-none bg-transparent shadow-none text-muted-foreground data-[state=active]:bg-transparent hover:text-foreground"
                  data-testid="tab-active-courses"
                >
                  <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                  Active ({categorizedCourseTypes.active.length})
                </TabsTrigger>
                <TabsTrigger 
                  value="archived" 
                  className="flex items-center gap-2 pb-4 pt-0 px-0 mr-8 border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:text-primary rounded-none bg-transparent shadow-none text-muted-foreground data-[state=active]:bg-transparent hover:text-foreground"
                  data-testid="tab-archived-courses"
                >
                  <Archive className="w-4 h-4" />
                  Archived ({categorizedCourseTypes.archived.length})
                </TabsTrigger>
                <TabsTrigger 
                  value="drafts" 
                  className="flex items-center gap-2 pb-4 pt-0 px-0 mr-8 border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:text-primary rounded-none bg-transparent shadow-none text-muted-foreground data-[state=active]:bg-transparent hover:text-foreground"
                  data-testid="tab-draft-courses"
                >
                  <Eye className="w-4 h-4" />
                  Drafts ({categorizedCourseTypes.drafts.length})
                </TabsTrigger>
                <TabsTrigger 
                  value="deleted" 
                  className="flex items-center gap-2 pb-4 pt-0 px-0 mr-8 border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:text-primary rounded-none bg-transparent shadow-none text-muted-foreground data-[state=active]:bg-transparent hover:text-foreground"
                  data-testid="tab-deleted-courses"
                >
                  <Trash2 className="w-4 h-4" />
                  Deleted ({deletedCourses.length})
                </TabsTrigger>
              </TabsList>

              {/* Tab Content */}
              <TabsContent value="active" className="mt-0">
                <div className="py-6">
                  <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                    <div className="w-4 h-4 bg-green-500 rounded-full"></div>
                    Active Courses
                  </h2>
                  {renderCourseTable('active', categorizedCourseTypes.active)}
                </div>
              </TabsContent>

              <TabsContent value="archived" className="mt-0">
                <div className="py-6">
                  <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                    <Archive className="w-5 h-5" />
                    Archived Courses
                  </h2>
                  {renderCourseTable('archived', categorizedCourseTypes.archived)}
                </div>
              </TabsContent>

              <TabsContent value="drafts" className="mt-0">
                <div className="py-6">
                  <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                    <Eye className="w-5 h-5" />
                    Draft Courses
                  </h2>
                  {renderCourseTable('drafts', categorizedCourseTypes.drafts)}
                  {categorizedCourseTypes.drafts.length === 0 && !coursesLoading && (
                    <div className="mt-6 text-center">
                      <Button 
                        onClick={() => setShowCourseForm(true)}
                        data-testid="button-create-course"
                      >
                        <Plus className="mr-2 h-4 w-4" />
                        Create Your First Course
                      </Button>
                    </div>
                  )}
                </div>
              </TabsContent>

              <TabsContent value="deleted" className="mt-0">
                <div className="py-6">
                  <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                    <Trash2 className="w-5 h-5" />
                    Deleted Courses
                  </h2>
                  {deletedCoursesLoading ? (
                    <div className="flex items-center justify-center py-8">
                      <div className="animate-spin w-6 h-6 border-2 border-primary border-t-transparent rounded-full" />
                    </div>
                  ) : deletedCourses.length === 0 ? (
                    <div className="text-center py-8">
                      <Trash2 className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                      <h3 className="text-lg font-medium text-foreground mb-2">No Deleted Courses</h3>
                      <p className="text-muted-foreground">Deleted course types will appear here.</p>
                    </div>
                  ) : (
                    <div className="grid gap-6">
                      {deletedCourses.map((course) => (
                        <Card key={course.id} className="border border-destructive/20 bg-destructive/5">
                          <CardContent className="p-4 sm:p-6">
                            <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
                              <div className="flex-1 min-w-0">
                                <h3 className="font-semibold text-lg mb-2 truncate" data-testid={`text-course-title-${course.id}`}>
                                  {course.title}
                                </h3>
                                <p className="text-muted-foreground mb-4 line-clamp-2">{course.briefDescription || course.description}</p>
                                <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 text-sm text-muted-foreground mb-4">
                                  <span className="whitespace-nowrap">${course.price}</span>
                                  <span className="whitespace-nowrap">{course.duration}</span>
                                  <span className="whitespace-nowrap">{course.category}</span>
                                </div>
                                <Badge variant="destructive" className="mb-2">Deleted</Badge>
                                <p className="text-sm text-muted-foreground">
                                  Deleted on {course.deletedAt ? formatDateSafe(course.deletedAt) : 'Unknown'}
                                </p>
                              </div>
                              <div className="flex-shrink-0 w-full sm:w-auto">
                                <Button
                                  onClick={() => openDeleteConfirmation('course', course.id, course.title)}
                                  variant="destructive"
                                  size="sm"
                                  disabled={permanentDeleteCourseMutation.isPending}
                                  className="w-full sm:w-auto"
                                  data-testid={`button-permanent-delete-course-${course.id}`}
                                >
                                  <Trash2 className="w-4 h-4 mr-2" />
                                  {permanentDeleteCourseMutation.isPending ? "Deleting..." : "Delete Permanently"}
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

      {/* Course Creation Form Modal */}
      <CourseCreationForm
        isOpen={showCourseForm}
        onClose={() => setShowCourseForm(false)}
        onCourseCreated={() => {
          setShowCourseForm(false);
          // The form handles query invalidation internally
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
    </Layout>
  );
}
