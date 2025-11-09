import { useState, useMemo, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { Link } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Layout } from "@/components/Layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Calendar, momentLocalizer } from 'react-big-calendar';
import moment from 'moment';
import { 
  Calendar as CalendarIcon, 
  List, 
  Plus, 
  Users, 
  Clock,
  MapPin,
  Edit,
  Trash2,
  Copy,
  MoreHorizontal,
  Settings,
  Save,
  Archive,
  Eye,
  EyeOff,
  FileText,
  BadgePercent,
  ArrowLeft,
  Bell,
  ChevronDown
} from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { isUnauthorizedError } from "@/lib/authUtils";
import type { CourseWithSchedules, CourseScheduleWithSessions, User, AppSettings, InsertAppSettings } from "@shared/schema";
import { insertAppSettingsSchema } from "@shared/schema";
import 'react-big-calendar/lib/css/react-big-calendar.css';
import { EventCreationForm } from "@/components/EventCreationForm";
import { CourseCreationForm } from "@/components/CourseCreationForm";
import { EditCourseForm } from "@/components/EditCourseForm";
import { CourseManagementActions } from "@/components/CourseManagementActions";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { formatDateSafe } from "@/lib/dateUtils";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

const localizer = momentLocalizer(moment);

// Restore Course Button Component
function RestoreCourseButton({ course }: { course: CourseWithSchedules }) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const restoreMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("PATCH", `/api/instructor/courses/${course.id}/restore`);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/instructor/deleted-courses"] });
      queryClient.invalidateQueries({ queryKey: ["/api/instructor/courses-detailed"] });
      toast({
        title: "Course Restored",
        description: `"${course.title}" has been restored successfully.`,
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to restore course. Please try again.",
        variant: "destructive",
      });
    },
  });

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={() => restoreMutation.mutate()}
      disabled={restoreMutation.isPending}
      data-testid={`button-restore-${course.id}`}
    >
      {restoreMutation.isPending ? "Restoring..." : "Restore"}
    </Button>
  );
}

// Delete Permanently Button Component
function DeletePermanentlyButton({ course }: { course: CourseWithSchedules }) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isOpen, setIsOpen] = useState(false);
  const [confirmText, setConfirmText] = useState("");

  const deleteMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("DELETE", `/api/instructor/courses/${course.id}/permanent`);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/instructor/deleted-courses"] });
      toast({
        title: "Course Permanently Deleted",
        description: `"${course.title}" has been permanently deleted.`,
      });
      setIsOpen(false);
      setConfirmText("");
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to permanently delete course. Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleDelete = () => {
    if (confirmText === "DELETE") {
      deleteMutation.mutate();
    }
  };

  return (
    <>
      <Button
        variant="destructive"
        size="sm"
        onClick={() => setIsOpen(true)}
        data-testid={`button-delete-permanently-${course.id}`}
      >
        Delete Permanently
      </Button>

      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Permanently Delete Course</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="text-sm text-muted-foreground">
              <p className="mb-2">You are about to permanently delete:</p>
              <p className="font-semibold text-foreground">"{course.title}"</p>
            </div>
            <div className="p-4 bg-destructive/10 border border-destructive/20 rounded-lg">
              <p className="text-sm text-destructive font-medium mb-2">⚠️ Warning</p>
              <p className="text-sm text-muted-foreground">
                This action cannot be undone. The course and all its associated data will be permanently removed.
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirm-text" className="text-sm font-medium">
                Type <code className="bg-muted px-1 py-0.5 rounded text-xs">DELETE</code> to confirm:
              </Label>
              <Input
                id="confirm-text"
                type="text"
                value={confirmText}
                onChange={(e) => setConfirmText(e.target.value)}
                placeholder="Type DELETE here"
                data-testid={`input-confirm-delete-${course.id}`}
              />
            </div>
            <div className="flex justify-end space-x-2">
              <Button
                variant="outline"
                onClick={() => {
                  setIsOpen(false);
                  setConfirmText("");
                }}
                data-testid={`button-cancel-delete-${course.id}`}
              >
                Cancel
              </Button>
              <Button
                variant="destructive"
                onClick={handleDelete}
                disabled={confirmText !== "DELETE" || deleteMutation.isPending}
                data-testid={`button-confirm-delete-${course.id}`}
              >
                {deleteMutation.isPending ? "Deleting..." : "Delete Permanently"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

// Category Visibility Control Component
function CategoryVisibilityControl({ 
  category, 
  courses, 
  onCategoryToggle, 
  onCourseToggle 
}: { 
  category: any; 
  courses: any[]; 
  onCategoryToggle: (categoryId: string, visible: boolean) => void;
  onCourseToggle: (courseId: string, visible: boolean) => void;
}) {
  const [isCategoryVisible, setIsCategoryVisible] = useState(category.showOnHomePage !== false);
  const visibleCoursesCount = courses.filter(c => c.showOnHomePage !== false).length;

  return (
    <div className="border rounded-lg p-4 space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div 
            className="w-4 h-4 rounded-full" 
            style={{ backgroundColor: category.color || '#3b82f6' }}
          />
          <div>
            <h4 className="font-medium text-sm">{category.name}</h4>
            <p className="text-xs text-muted-foreground">
              {visibleCoursesCount} of {courses.length} courses visible
            </p>
          </div>
        </div>
        <div className="flex items-center space-x-2">
          <Label htmlFor={`category-${category.id}`} className="text-xs text-muted-foreground">
            Show on home page
          </Label>
          <Switch
            id={`category-${category.id}`}
            checked={isCategoryVisible}
            onCheckedChange={(checked) => {
              setIsCategoryVisible(checked);
              onCategoryToggle(category.id, checked);
            }}
            data-testid={`switch-category-${category.id}`}
          />
        </div>
      </div>

      {courses.length > 0 && (
        <Accordion type="single" collapsible className="w-full">
          <AccordionItem value="courses" className="border-0">
            <AccordionTrigger className="text-xs py-2 hover:no-underline">
              <span className="text-muted-foreground">
                Show/hide individual courses ({courses.length})
              </span>
            </AccordionTrigger>
            <AccordionContent className="space-y-2 pt-2">
              {courses.map((course) => (
                <div 
                  key={course.id} 
                  className="flex items-center justify-between py-2 px-3 bg-muted/50 rounded"
                >
                  <span className="text-sm">{course.title}</span>
                  <Switch
                    checked={course.showOnHomePage !== false}
                    onCheckedChange={(checked) => onCourseToggle(course.id, checked)}
                    data-testid={`switch-course-${course.id}`}
                  />
                </div>
              ))}
            </AccordionContent>
          </AccordionItem>
        </Accordion>
      )}
    </div>
  );
}

export default function CourseManagement() {
  const { user, isAuthenticated } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedView, setSelectedView] = useState<'calendar' | 'list'>('calendar');
  const [showCreateEventModal, setShowCreateEventModal] = useState(false);
  const [showCreateCourseModal, setShowCreateCourseModal] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<{course: CourseWithSchedules, schedule: CourseScheduleWithSessions} | null>(null);
  const [editingCourse, setEditingCourse] = useState<CourseWithSchedules | null>(null);
  const [selectedCourseForEvent, setSelectedCourseForEvent] = useState<CourseWithSchedules | null>(null);

  // Fetch instructor's courses with detailed schedules
  const { data: courses = [], isLoading: coursesLoading } = useQuery<CourseWithSchedules[]>({
    queryKey: ["/api/instructor/courses-detailed"],
    enabled: isAuthenticated && (user as User)?.role === 'instructor',
    retry: false,
  });

  // Fetch app settings
  const { data: appSettings } = useQuery<AppSettings>({
    queryKey: ["/api/app-settings"],
    enabled: isAuthenticated && (user as User)?.role === 'instructor',
    retry: false,
  });

  // Fetch deleted courses
  const { data: deletedCourses = [], isLoading: deletedCoursesLoading } = useQuery<CourseWithSchedules[]>({
    queryKey: ["/api/instructor/deleted-courses"],
    enabled: isAuthenticated && (user as User)?.role === 'instructor',
    retry: false,
  });

  // Fetch categories for visibility controls
  const { data: categories = [] } = useQuery<any[]>({
    queryKey: ["/api/categories"],
    enabled: isAuthenticated && (user as User)?.role === 'instructor',
    retry: false,
  });

  // Categorize courses by status
  const categorizedCourseTypes = useMemo(() => {
    const active: CourseWithSchedules[] = courses.filter(c => c.isActive === true);
    const unpublished: CourseWithSchedules[] = courses.filter(c => c.isActive === false);
    const archived: CourseWithSchedules[] = [];
    const drafts: CourseWithSchedules[] = [];

    return { active, unpublished, archived, drafts };
  }, [courses]);

  // Form for app settings
  const settingsForm = useForm<InsertAppSettings>({
    resolver: zodResolver(insertAppSettingsSchema),
    defaultValues: {
      homeCoursesLimit: appSettings?.homeCoursesLimit ?? 20,
    },
  });

  // Update form when settings load
  useEffect(() => {
    if (appSettings) {
      settingsForm.reset({
        homeCoursesLimit: appSettings.homeCoursesLimit,
      });
    }
  }, [appSettings, settingsForm]);

  // App settings update mutation
  const updateSettingsMutation = useMutation({
    mutationFn: async (data: InsertAppSettings) => {
      const response = await apiRequest("PATCH", "/api/app-settings", data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/app-settings"] });
      toast({
        title: "Settings Updated",
        description: "Home page course limit has been updated successfully.",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to update settings. Please try again.",
        variant: "destructive",
      });
    },
  });

  // Render course table function
  const renderCourseTable = (type: 'active' | 'archived' | 'drafts', courseList: CourseWithSchedules[]) => {
    if (coursesLoading) {
      return (
        <div className="flex items-center justify-center py-8">
          <div className="animate-spin w-6 h-6 border-2 border-primary border-t-transparent rounded-full" />
        </div>
      );
    }

    if (courseList.length === 0) {
      return (
        <div className="text-center py-8">
          <div className="w-12 h-12 text-muted-foreground mx-auto mb-4">
            {type === 'active' && <div className="w-12 h-12 bg-green-500 rounded-full flex items-center justify-center text-white font-bold">A</div>}
            {type === 'archived' && <Archive className="w-12 h-12" />}
            {type === 'drafts' && <Eye className="w-12 h-12" />}
          </div>
          <h3 className="text-lg font-medium text-foreground mb-2">
            No {type.charAt(0).toUpperCase() + type.slice(1)} Courses
          </h3>
          <p className="text-muted-foreground">
            {type === 'active' && "Published course types will appear here."}
            {type === 'archived' && "Archived course types will appear here."}
            {type === 'drafts' && "Draft course types will appear here."}
          </p>
        </div>
      );
    }

    return (
      <div className="grid grid-cols-1 gap-4 sm:gap-6">
        {courseList.map((course) => (
          <Card key={course.id} className={`transition-all hover:shadow-md ${
            type === 'archived' ? 'border-amber-200 bg-amber-50 dark:bg-amber-950/20 dark:border-amber-800' :
            type === 'drafts' ? 'border-gray-200 bg-gray-50 dark:bg-gray-950/20 dark:border-gray-800' :
            'border-green-200 bg-green-50 dark:bg-green-950/20 dark:border-green-800'
          }`}>
            <CardContent className="p-4 sm:p-6">
              <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between mb-2">
                    <h3 className="font-semibold text-lg truncate" data-testid={`text-course-title-${course.id}`}>
                      {course.title}
                    </h3>
                    <Badge 
                      variant={
                        type === 'active' ? 'default' :
                        type === 'archived' ? 'secondary' : 
                        'outline'
                      }
                      className="ml-2 flex-shrink-0"
                    >
                      {type === 'active' ? 'Published' : 
                       type === 'archived' ? 'Archived' : 
                       'Draft'}
                    </Badge>
                  </div>

                  <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 text-sm text-muted-foreground mb-4">
                    <span className="whitespace-nowrap">${course.price}</span>
                    <span className="whitespace-nowrap">{course.duration}</span>
                    <span className="whitespace-nowrap">
                      {typeof course.category === 'string' ? course.category : 
                       (course.category && typeof course.category === 'object' && 'name' in course.category) 
                         ? (course.category as any).name || 'General' 
                         : 'General'}
                    </span>
                    <span className="whitespace-nowrap">{course.schedules?.length || 0} schedules</span>
                  </div>
                </div>
                <div className="flex-shrink-0 w-full sm:w-auto">
                  <CourseManagementActions 
                    course={course}
                    onEditCourse={(course) => setEditingCourse(course)}
                    onCreateEvent={(course) => {
                      setSelectedCourseForEvent(course);
                      setShowCreateEventModal(true);
                    }}
                    data-testid={`actions-course-${course.id}`}
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  };

  // Transform course schedules into calendar events
  const calendarEvents = useMemo(() => {
    return courses.flatMap(course => 
      course.schedules.map(schedule => {
        // Parse dates properly - handle both string and Date formats
        const startDateStr = schedule.startDate instanceof Date 
          ? schedule.startDate.toISOString().split('T')[0]
          : typeof schedule.startDate === 'string' && schedule.startDate
            ? (schedule.startDate as string).split('T')[0]?.split(' ')[0] 
            : new Date().toISOString().split('T')[0]; // Fallback to today

        const endDateStr = schedule.endDate instanceof Date
          ? schedule.endDate.toISOString().split('T')[0]
          : typeof schedule.endDate === 'string' && schedule.endDate
            ? (schedule.endDate as string).split('T')[0]?.split(' ')[0]
            : new Date().toISOString().split('T')[0]; // Fallback to today

        return {
          id: schedule.id,
          title: `${course.title}`,
          start: new Date(`${startDateStr}T${schedule.startTime}:00`), // Format: "2025-09-27T08:30:00"
          end: new Date(`${endDateStr}T${schedule.endTime}:00`),       // Format: "2025-09-28T16:30:00"
          resource: {
            course,
            schedule,
            enrollmentCount: schedule.enrollments?.filter((e: any) => e.status !== 'hold').length || 0,
            waitlistCount: schedule.waitlistEntries?.length || 0,
          }
        };
      })
    );
  }, [courses]);

  // Handle event selection in calendar
  const handleSelectEvent = (event: any) => {
    setSelectedEvent(event.resource);
  };

  // Custom event style function
  const eventStyleGetter = (event: any) => {
    const { course } = event.resource;
    // Use the category color if available, otherwise fallback to a default color
    const backgroundColor = course.category?.color || '#3b82f6'; // Use category color or default blue

    return {
      style: {
        backgroundColor,
        borderRadius: '4px',
        opacity: 0.8,
        color: 'white',
        border: '0px',
        display: 'block',
        fontSize: '11px',
        lineHeight: '1.2'
      }
    };
  };

  if (!isAuthenticated || (user as User)?.role !== 'instructor') {
    return (
      <Layout>
        <div className="min-h-screen flex items-center justify-center">
          <div className="text-center">
            <h1 className="text-2xl font-bold mb-4">Access Denied</h1>
            <p className="text-muted-foreground">You need instructor access to view this page.</p>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Back to Dashboard Link */}
        <div className="mb-6">
          <Link href="/instructor-dashboard">
            <Button variant="ghost" size="sm" data-testid="button-back-to-dashboard">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Dashboard
            </Button>
          </Link>
        </div>

        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Course Management</h1>
            <p className="text-muted-foreground mt-1">
              Manage your training courses, schedules, and enrollments
            </p>
          </div>
          <div className="flex flex-col sm:flex-row sm:items-center space-y-2 sm:space-y-0 sm:space-x-4 mt-4 sm:mt-0">
            <Link href="/promo-codes">
              <Button variant="default" data-testid="button-manage-promos">
                <BadgePercent className="mr-2 h-4 w-4" />
                Manage Promos
              </Button>
            </Link>
            <Link href="/course-forms-management">
              <Button variant="outline" className="border-primary text-primary hover:bg-primary hover:text-primary-foreground" data-testid="button-manage-forms">
                <FileText className="mr-2 h-4 w-4" />
                Course Forms
              </Button>
            </Link>
            <Dialog open={showCreateCourseModal} onOpenChange={setShowCreateCourseModal}>
              <DialogTrigger asChild>
                <Button className="bg-primary text-primary-foreground hover:bg-primary/90" data-testid="button-create-course">
                  <Plus className="mr-2 h-4 w-4" />
                  Create Course
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
                <CourseCreationForm 
                  isOpen={showCreateCourseModal}
                  onClose={() => setShowCreateCourseModal(false)}
                  onCourseCreated={() => {
                    queryClient.invalidateQueries({ queryKey: ["/api/instructor/courses"] });
                    queryClient.invalidateQueries({ queryKey: ["/api/instructor/courses-detailed"] });
                    setShowCreateCourseModal(false);
                  }}
                />
              </DialogContent>
            </Dialog>
          </div>
        </div>

        {/* Settings Tile */}
        <Card className="mb-6">
          <CardHeader className="pb-4">
            <CardTitle className="flex items-center space-x-2 text-lg">
              <Settings className="h-5 w-5" />
              <span>Home Page Settings</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Course Limit Setting */}
            <form 
              onSubmit={settingsForm.handleSubmit((data) => {
                updateSettingsMutation.mutate(data);
              })}
              className="flex items-center space-x-4"
            >
              <div className="flex items-center space-x-2">
                <Label htmlFor="homeCoursesLimit" className="text-sm font-medium">
                  Courses to display on home page:
                </Label>
                <Input
                  id="homeCoursesLimit"
                  type="number"
                  min="1"
                  max="50"
                  className="w-20"
                  {...settingsForm.register("homeCoursesLimit", { valueAsNumber: true })}
                  data-testid="input-home-courses-limit"
                />
                <Button 
                  type="submit" 
                  size="sm" 
                  disabled={updateSettingsMutation.isPending}
                  data-testid="button-save-home-courses-limit"
                >
                  <Save className="mr-1 h-3 w-3" />
                  {updateSettingsMutation.isPending ? "Saving..." : "Save"}
                </Button>
              </div>
              {settingsForm.formState.errors.homeCoursesLimit && (
                <p className="text-sm text-destructive" data-testid="status-home-courses-limit">
                  {settingsForm.formState.errors.homeCoursesLimit.message}
                </p>
              )}
            </form>

            <Separator />

            {/* Category Visibility Controls */}
            <Accordion type="single" collapsible className="w-full">
              <AccordionItem value="category-visibility" className="border-0">
                <AccordionTrigger className="hover:no-underline py-3">
                  <div className="flex items-center gap-2">
                    <Settings className="h-4 w-4" />
                    <div>
                      <h3 className="text-sm font-semibold text-left">Category Visibility Management</h3>
                      <p className="text-sm text-muted-foreground text-left">
                        Click to expand and manage which categories and courses appear on the home page
                      </p>
                    </div>
                  </div>
                </AccordionTrigger>
                <AccordionContent>
                  <ScrollArea className="h-96 w-full rounded-md border">
                    <div className="p-4 space-y-3">
                      {categories.map((category) => (
                        <CategoryVisibilityControl 
                          key={category.id}
                          category={category}
                          courses={courses.filter((c: any) => c.categoryId === category.id)}
                          onCategoryToggle={(categoryId, visible) => {
                            apiRequest('PATCH', `/api/categories/${categoryId}/home-visibility`, { showOnHomePage: visible })
                              .then(() => {
                                queryClient.invalidateQueries({ queryKey: ["/api/categories"] });
                                toast({
                                  title: "Success",
                                  description: `Category visibility updated`,
                                });
                              }).catch((error) => {
                                toast({
                                  title: "Error",
                                  description: error.message || "Failed to update category visibility",
                                  variant: "destructive",
                                });
                              });
                          }}
                          onCourseToggle={(courseId, visible) => {
                            apiRequest('PATCH', `/api/courses/${courseId}/home-visibility`, { showOnHomePage: visible })
                              .then(() => {
                                queryClient.invalidateQueries({ queryKey: ["/api/instructor/courses"] });
                                queryClient.invalidateQueries({ queryKey: ["/api/instructor/courses-detailed"] });
                                toast({
                                  title: "Success",
                                  description: `Course visibility updated`,
                                });
                              }).catch((error) => {
                                toast({
                                  title: "Error",
                                  description: error.message || "Failed to update course visibility",
                                  variant: "destructive",
                                });
                              });
                          }}
                        />
                      ))}
                    </div>
                    <ScrollBar orientation="vertical" />
                  </ScrollArea>
                </AccordionContent>
              </AccordionItem>
            </Accordion>
          </CardContent>
        </Card>

        {/* Active Courses Section */}
        <Card className="mb-6">
          <CardHeader className="pb-4">
            <CardTitle className="flex items-center space-x-2 text-lg">
              <div className="w-5 h-5 bg-green-500 rounded-full"></div>
              <span>Active Courses</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="active" className="w-full">
              <div className="overflow-x-auto">
                <TabsList className="h-auto p-0 bg-transparent border-b border-border rounded-none justify-start min-w-max w-full">
                  <TabsTrigger 
                    value="active" 
                    className="flex items-center gap-2 pb-4 pt-0 px-0 mr-4 sm:mr-8 border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:text-primary rounded-none bg-transparent shadow-none text-muted-foreground data-[state=active]:bg-transparent hover:text-foreground whitespace-nowrap"
                    data-testid="tab-active-courses"
                  >
                    <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                    Active ({categorizedCourseTypes.active.length})
                  </TabsTrigger>
                  <TabsTrigger 
                    value="unpublished" 
                    className="flex items-center gap-2 pb-4 pt-0 px-0 mr-4 sm:mr-8 border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:text-primary rounded-none bg-transparent shadow-none text-muted-foreground data-[state=active]:bg-transparent hover:text-foreground whitespace-nowrap"
                    data-testid="tab-unpublished-courses"
                  >
                    <EyeOff className="w-4 h-4" />
                    Unpublished ({categorizedCourseTypes.unpublished.length})
                  </TabsTrigger>
                  <TabsTrigger 
                    value="archived" 
                    className="flex items-center gap-2 pb-4 pt-0 px-0 mr-4 sm:mr-8 border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:text-primary rounded-none bg-transparent shadow-none text-muted-foreground data-[state=active]:bg-transparent hover:text-foreground whitespace-nowrap"
                    data-testid="tab-archived-courses"
                  >
                    <Archive className="w-4 h-4" />
                    Archived ({categorizedCourseTypes.archived.length})
                  </TabsTrigger>
                  <TabsTrigger 
                    value="drafts" 
                    className="flex items-center gap-2 pb-4 pt-0 px-0 mr-4 sm:mr-8 border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:text-primary rounded-none bg-transparent shadow-none text-muted-foreground data-[state=active]:bg-transparent hover:text-foreground whitespace-nowrap"
                    data-testid="tab-draft-courses"
                  >
                    <Eye className="w-4 h-4" />
                    Drafts ({categorizedCourseTypes.drafts.length})
                  </TabsTrigger>
                  <TabsTrigger 
                    value="deleted" 
                    className="flex items-center gap-2 pb-4 pt-0 px-0 mr-4 sm:mr-8 border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:text-primary rounded-none bg-transparent shadow-none text-muted-foreground data-[state=active]:bg-transparent hover:text-foreground whitespace-nowrap"
                    data-testid="tab-deleted-courses"
                  >
                    <Trash2 className="w-4 h-4" />
                    Deleted ({deletedCourses.length})
                  </TabsTrigger>
                </TabsList>
              </div>

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

              <TabsContent value="unpublished" className="mt-0">
                <div className="py-6">
                  <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                    <EyeOff className="w-5 h-5" />
                    Unpublished Courses
                  </h2>
                  {renderCourseTable('drafts', categorizedCourseTypes.unpublished)}
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
                        onClick={() => setShowCreateCourseModal(true)}
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
                    <div className="grid grid-cols-1 gap-4 sm:gap-6">
                      {deletedCourses.map((course) => (
                        <Card key={course.id} className="border-destructive/20 bg-destructive/5">
                          <CardContent className="p-4 sm:p-6">
                            <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
                              <div className="flex-1 min-w-0">
                                <div className="flex items-start justify-between mb-2">
                                  <h3 className="font-semibold text-lg truncate" data-testid={`text-course-title-${course.id}`}>
                                    {course.title}
                                  </h3>
                                  <Badge variant="destructive" className="ml-2 flex-shrink-0">
                                    Deleted
                                  </Badge>
                                </div>

                                <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 text-sm text-muted-foreground mb-4">
                                  <span className="whitespace-nowrap">${course.price}</span>
                                  <span className="whitespace-nowrap">{course.duration}</span>
                                  <span className="whitespace-nowrap">
                                    {typeof course.category === 'string' ? course.category : 
                                     (course.category && typeof course.category === 'object' && 'name' in course.category) 
                                       ? (course.category as any).name || 'General' 
                                       : 'General'}
                                  </span>
                                  <span className="whitespace-nowrap">{course.schedules?.length || 0} schedules</span>
                                </div>

                                <div className="flex flex-wrap gap-2">
                                  <RestoreCourseButton course={course} />
                                  <DeletePermanentlyButton course={course} />
                                </div>
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
          </CardContent>
        </Card>

        {/* View Toggle */}
        <Tabs value={selectedView} onValueChange={(value) => setSelectedView(value as 'calendar' | 'list')} className="mb-6">
          <TabsList className="grid w-fit grid-cols-2">
            <TabsTrigger value="calendar" className="flex items-center space-x-2" data-testid="tab-calendar">
              <CalendarIcon className="h-4 w-4" />
              <span>Calendar</span>
            </TabsTrigger>
            <TabsTrigger value="list" className="flex items-center space-x-2" data-testid="tab-list">
              <List className="h-4 w-4" />
              <span>List View</span>
            </TabsTrigger>
          </TabsList>

          {/* Calendar View */}
          <TabsContent value="calendar" className="mt-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span>Training Calendar</span>
                  <div className="flex items-center space-x-4 text-sm">
                    <div className="flex items-center space-x-2">
                      <div className="w-3 h-3 bg-success rounded"></div>
                      <span className="text-muted-foreground">Available</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <div className="w-3 h-3 bg-amber-500 rounded"></div>
                      <span className="text-muted-foreground">Nearly Full</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <div className="w-3 h-3 bg-destructive rounded"></div>
                      <span className="text-muted-foreground">Full</span>
                    </div>
                  </div>
                </CardTitle>
              </CardHeader>
              <CardContent>
                {coursesLoading ? (
                  <div className="h-[600px] flex items-center justify-center">
                    <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
                  </div>
                ) : (
                  <div className="h-[600px]">
                    <Calendar
                      localizer={localizer}
                      events={calendarEvents}
                      startAccessor="start"
                      endAccessor="end"
                      onSelectEvent={handleSelectEvent}
                      eventPropGetter={eventStyleGetter}
                      views={['month', 'week', 'day']}
                      defaultView="month"
                      popup
                      className="bg-background"
                      data-testid="calendar-view"
                    />
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* List View */}
          <TabsContent value="list" className="mt-6">
            <Card>
              <CardHeader>
                <CardTitle>Upcoming Events</CardTitle>
              </CardHeader>
              <CardContent>
                {coursesLoading ? (
                  <div className="space-y-4">
                    {[1, 2, 3].map(i => (
                      <div key={i} className="animate-pulse p-4 bg-muted rounded-lg">
                        <div className="h-4 bg-muted-foreground/20 rounded w-1/3 mb-2" />
                        <div className="h-3 bg-muted-foreground/20 rounded w-1/2" />
                      </div>
                    ))}
                  </div>
                ) : calendarEvents.length > 0 ? (
                  <div className="space-y-4" data-testid="events-list">
                    {calendarEvents
                      .filter(event => event.start >= new Date())
                      .sort((a, b) => a.start.getTime() - b.start.getTime())
                      .map(event => (
                        <div key={event.id} className="p-4 bg-muted rounded-lg hover:bg-muted/80 transition-colors">
                          <div className="flex items-center justify-between">
                            <div className="flex-1">
                              <div className="flex items-center space-x-3 mb-2">
                                <h3 className="font-medium text-lg" data-testid={`event-title-${event.id}`}>
                                  {event.title}
                                </h3>
                                <Badge 
                                  variant={event.resource.schedule.availableSpots > 0 ? "default" : "destructive"}
                                  data-testid={`event-status-${event.id}`}
                                >
                                  {event.resource.schedule.availableSpots > 0 
                                    ? `${event.resource.schedule.availableSpots} spots left` 
                                    : 'Full'
                                  }
                                </Badge>
                              </div>
                              <div className="flex items-center space-x-6 text-sm text-muted-foreground">
                                <div className="flex items-center space-x-1">
                                  <CalendarIcon className="h-4 w-4" />
                                  <span>{moment(event.start).format('MMM DD, YYYY')}</span>
                                </div>
                                <div className="flex items-center space-x-1">
                                  <Clock className="h-4 w-4" />
                                  <span>{moment(event.start).format('h:mm A')} - {moment(event.end).format('h:mm A')}</span>
                                </div>
                                <div className="flex items-center space-x-1">
                                  <Users className="h-4 w-4" />
                                  <span>{event.resource.enrollmentCount} enrolled</span>
                                </div>
                                {event.resource.schedule.location && (
                                  <div className="flex items-center space-x-1">
                                    <MapPin className="h-4 w-4" />
                                    <span>{event.resource.schedule.location}</span>
                                  </div>
                                )}
                              </div>
                            </div>
                            <div className="flex items-center space-x-2">
                              <Button variant="outline" size="sm" data-testid={`button-edit-${event.id}`}>
                                <Edit className="h-4 w-4" />
                              </Button>
                              <Button variant="outline" size="sm" data-testid={`button-copy-${event.id}`}>
                                <Copy className="h-4 w-4" />
                              </Button>
                              <Button variant="outline" size="sm" data-testid={`button-more-${event.id}`}>
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </div>
                          </div>
                        </div>
                      ))}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <CalendarIcon className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
                    <h3 className="text-lg font-medium text-muted-foreground mb-2">No events scheduled</h3>
                    <p className="text-sm text-muted-foreground mb-4">
                      Create your first training event to get started
                    </p>
                    <Button onClick={() => setShowCreateEventModal(true)} data-testid="button-create-first-event">
                      <Plus className="mr-2 h-4 w-4" />
                      Create Your First Event
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Event Details Modal */}
        {selectedEvent && (
          <Dialog open={!!selectedEvent} onOpenChange={() => setSelectedEvent(null)}>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>Event Details</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <h3 className="font-medium mb-2">Event Information</h3>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-muted-foreground">Start Date:</span>
                      <div>{moment(selectedEvent.schedule.startDate).format('MMM DD, YYYY')}</div>
                    </div>
                    <div>
                      <span className="text-muted-foreground">End Date:</span>
                      <div>{moment(selectedEvent.schedule.endDate).format('MMM DD, YYYY')}</div>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Time:</span>
                      <div>{selectedEvent.schedule.startTime} - {selectedEvent.schedule.endTime}</div>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Available Spots:</span>
                      <div>{selectedEvent.schedule.availableSpots} / {selectedEvent.schedule.maxSpots}</div>
                    </div>
                  </div>
                </div>
                <div className="flex justify-end space-x-2">
                  <Button variant="outline" onClick={() => setSelectedEvent(null)}>
                    Close
                  </Button>
                  <Button 
                    onClick={() => {
                      setEditingCourse(selectedEvent.course);
                      setSelectedEvent(null);
                    }}
                    data-testid="button-manage-event"
                  >
                    Manage Event
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        )}

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

        {/* Create Event Modal */}
        {showCreateEventModal && (
          <EventCreationForm
            isOpen={showCreateEventModal}
            onClose={() => {
              setShowCreateEventModal(false);
              setSelectedCourseForEvent(null);
            }}
            onEventCreated={() => {
              setShowCreateEventModal(false);
              setSelectedCourseForEvent(null);
              queryClient.invalidateQueries({ queryKey: ['/api/instructor/courses'] });
            }}
            preSelectedCourseId={selectedCourseForEvent?.id}
          />
        )}
      </div>
    </Layout>
  );
}