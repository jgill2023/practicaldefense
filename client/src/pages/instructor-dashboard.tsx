import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Layout } from "@/components/Layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { CourseManagementActions } from "@/components/CourseManagementActions";
import { EditCourseForm } from "@/components/EditCourseForm";
import { isUnauthorizedError } from "@/lib/authUtils";
import { Plus, BarChart, GraduationCap, DollarSign, Users, TrendingUp, Clock, Archive, Eye, EyeOff, Trash2, Edit, MoreVertical } from "lucide-react";
import type { CourseWithSchedules, EnrollmentWithDetails, User } from "@shared/schema";

export default function InstructorDashboard() {
  const { user, isLoading, isAuthenticated } = useAuth();
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const [editingCourse, setEditingCourse] = useState<CourseWithSchedules | null>(null);

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

  // Categorize courses based on their status and schedules
  const categorizedCourses = {
    upcoming: courses.filter(course => {
      if (!course.isActive) return false;
      return course.schedules.some(schedule => 
        schedule.startDate && new Date(schedule.startDate) > new Date()
      );
    }),
    past: courses.filter(course => {
      if (!course.isActive) return false;
      return course.schedules.length > 0 && 
        course.schedules.every(schedule => 
          schedule.startDate && new Date(schedule.startDate) <= new Date()
        );
    }),
    pending: courses.filter(course => !course.isActive),
    archived: [] // No archived functionality yet, show empty for now
  };

  // Helper function to render course table for each category
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
          <div>Date</div>
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
            const lastSchedule = course.schedules
              .filter(s => s.startDate && new Date(s.startDate) <= new Date())
              .sort((a, b) => new Date(b.startDate!).getTime() - new Date(a.startDate!).getTime())[0];
            
            const displayDate = categoryName === 'upcoming' && nextSchedule?.startDate
              ? new Date(nextSchedule.startDate).toLocaleDateString()
              : categoryName === 'past' && lastSchedule?.startDate
              ? new Date(lastSchedule.startDate).toLocaleDateString()
              : '-';

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
                  {nextSchedule?.startTime && categoryName === 'upcoming' && (
                    <div className="text-xs text-muted-foreground">{nextSchedule.startTime}</div>
                  )}
                </div>
                <div className="text-sm">{enrollmentCount}</div>
                <div className="text-sm font-medium">${courseRevenue.toLocaleString()}</div>
                <div>
                  <Badge variant={
                    categoryName === 'upcoming' ? "default" :
                    categoryName === 'past' ? "secondary" :
                    categoryName === 'pending' ? "outline" :
                    "destructive"
                  } className="text-xs">
                    {categoryName === 'upcoming' && "Active"}
                    {categoryName === 'past' && "Completed"}
                    {categoryName === 'pending' && "Draft"}
                    {categoryName === 'archived' && "Archived"}
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
                    onClick={() => console.log('View roster for', course.title)}
                    data-testid={`button-roster-course-${course.id}`}
                  >
                    <Users className="h-4 w-4" />
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
                        onClick={() => console.log('Unpublish course', course.title)}
                        data-testid={`menuitem-unpublish-${course.id}`}
                      >
                        <EyeOff className="mr-2 h-4 w-4" />
                        Unpublish
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() => console.log('Archive course', course.title)}
                        data-testid={`menuitem-archive-${course.id}`}
                      >
                        <Archive className="mr-2 h-4 w-4" />
                        Archive
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem
                        onClick={() => console.log('Delete course', course.title)}
                        className="text-destructive"
                        data-testid={`menuitem-delete-${course.id}`}
                      >
                        <Trash2 className="mr-2 h-4 w-4" />
                        Delete Course
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

        {/* Course Management Section */}
        <div className="bg-card rounded-lg border">
          <div className="p-6">
            {/* Tab-style Navigation */}
            <Tabs defaultValue="active" className="w-full">
              <TabsList className="h-auto p-0 bg-transparent border-b border-border rounded-none justify-start w-full">
                <TabsTrigger 
                  value="active" 
                  className="flex items-center gap-2 pb-4 pt-0 px-0 mr-8 border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:text-primary rounded-none bg-transparent shadow-none text-muted-foreground data-[state=active]:bg-transparent hover:text-foreground"
                  data-testid="tab-active-courses"
                >
                  <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                  Active ({categorizedCourses.upcoming.length})
                </TabsTrigger>
                <TabsTrigger 
                  value="archived" 
                  className="flex items-center gap-2 pb-4 pt-0 px-0 mr-8 border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:text-primary rounded-none bg-transparent shadow-none text-muted-foreground data-[state=active]:bg-transparent hover:text-foreground"
                  data-testid="tab-archived-courses"
                >
                  <Archive className="w-4 h-4" />
                  Archived ({categorizedCourses.archived.length})
                </TabsTrigger>
                <TabsTrigger 
                  value="drafts" 
                  className="flex items-center gap-2 pb-4 pt-0 px-0 mr-8 border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:text-primary rounded-none bg-transparent shadow-none text-muted-foreground data-[state=active]:bg-transparent hover:text-foreground"
                  data-testid="tab-draft-courses"
                >
                  <Eye className="w-4 h-4" />
                  Drafts ({categorizedCourses.pending.length})
                </TabsTrigger>
                <TabsTrigger 
                  value="deleted" 
                  className="flex items-center gap-2 pb-4 pt-0 px-0 mr-8 border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:text-primary rounded-none bg-transparent shadow-none text-muted-foreground data-[state=active]:bg-transparent hover:text-foreground"
                  data-testid="tab-deleted-courses"
                >
                  <Trash2 className="w-4 h-4" />
                  Deleted (0)
                </TabsTrigger>
              </TabsList>

              {/* Tab Content */}
              <TabsContent value="active" className="mt-0">
                <div className="py-6">
                  <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                    <div className="w-4 h-4 bg-green-500 rounded-full"></div>
                    Active Courses
                  </h2>
                  {renderCourseTable('upcoming', categorizedCourses.upcoming)}
                </div>
              </TabsContent>

              <TabsContent value="archived" className="mt-0">
                <div className="py-6">
                  <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                    <Archive className="w-5 h-5" />
                    Archived Courses
                  </h2>
                  {renderCourseTable('archived', categorizedCourses.archived)}
                </div>
              </TabsContent>

              <TabsContent value="drafts" className="mt-0">
                <div className="py-6">
                  <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                    <Eye className="w-5 h-5" />
                    Draft Courses
                  </h2>
                  {renderCourseTable('pending', categorizedCourses.pending)}
                  {categorizedCourses.pending.length === 0 && !coursesLoading && (
                    <div className="mt-6 text-center">
                      <Button 
                        onClick={() => setLocation('/course-management')}
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
                  <div className="text-center py-12 text-muted-foreground">
                    No courses found in this category
                  </div>
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
    </Layout>
  );
}
