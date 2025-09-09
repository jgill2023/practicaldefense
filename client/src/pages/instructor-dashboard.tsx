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
import { CourseManagementActions } from "@/components/CourseManagementActions";
import { EditCourseForm } from "@/components/EditCourseForm";
import { isUnauthorizedError } from "@/lib/authUtils";
import { Plus, BarChart, GraduationCap, DollarSign, Users, TrendingUp, Clock, Archive, Eye, EyeOff } from "lucide-react";
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
      if (!course.isActive || course.isArchived) return false;
      return course.schedules.some(schedule => 
        schedule.startDate && new Date(schedule.startDate) > new Date()
      );
    }),
    past: courses.filter(course => {
      if (!course.isActive || course.isArchived) return false;
      return course.schedules.length > 0 && 
        course.schedules.every(schedule => 
          schedule.startDate && new Date(schedule.startDate) <= new Date()
        );
    }),
    pending: courses.filter(course => !course.isActive && !course.isArchived),
    archived: courses.filter(course => course.isArchived)
  };

  // Helper function to render course table for each category
  const renderCourseTable = (categoryName: string, courseList: CourseWithSchedules[]) => {
    if (coursesLoading) {
      return (
        <div className="space-y-4">
          {[1, 2, 3].map(i => (
            <div key={i} className="animate-pulse p-4 bg-muted rounded-lg">
              <div className="h-4 bg-muted-foreground/20 rounded w-1/3 mb-2" />
              <div className="h-3 bg-muted-foreground/20 rounded w-1/2" />
            </div>
          ))}
        </div>
      );
    }

    if (courseList.length === 0) {
      return (
        <div className="text-center py-12">
          <h3 className="text-lg font-medium text-muted-foreground mb-2">No courses found in this category</h3>
          <p className="text-sm text-muted-foreground">
            {categoryName === 'active' && "Create new courses or schedule existing ones to see them here"}
            {categoryName === 'drafts' && "Draft courses will appear here when you create them"}
            {categoryName === 'archived' && "Archived courses will be shown here"}
          </p>
        </div>
      );
    }

    return (
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b text-left">
              <th className="pb-3 text-sm font-medium text-muted-foreground">Course</th>
              <th className="pb-3 text-sm font-medium text-muted-foreground">Date</th>
              <th className="pb-3 text-sm font-medium text-muted-foreground">Students</th>
              <th className="pb-3 text-sm font-medium text-muted-foreground">Revenue</th>
              <th className="pb-3 text-sm font-medium text-muted-foreground">Status</th>
              <th className="pb-3 text-sm font-medium text-muted-foreground">Actions</th>
            </tr>
          </thead>
          <tbody>
            {courseList.map(course => {
              const enrollmentCount = enrollments.filter(e => e.courseId === course.id).length;
              const nextSchedule = course.schedules
                .filter(s => s.startDate && new Date(s.startDate) > new Date())
                .sort((a, b) => new Date(a.startDate!).getTime() - new Date(b.startDate!).getTime())[0];
              const lastSchedule = course.schedules
                .filter(s => s.startDate && new Date(s.startDate) <= new Date())
                .sort((a, b) => new Date(b.startDate!).getTime() - new Date(a.startDate!).getTime())[0];
              
              const courseRevenue = enrollmentCount * course.price;
              
              return (
                <tr key={course.id} className="border-b hover:bg-muted/50">
                  <td className="py-4">
                    <div className="font-medium" data-testid={`text-course-name-${course.id}`}>
                      {course.title}
                    </div>
                    <div className="text-sm text-muted-foreground">
                      {course.schedules.length} schedule{course.schedules.length !== 1 ? 's' : ''}
                    </div>
                  </td>
                  <td className="py-4 text-sm text-muted-foreground">
                    {categoryName === 'active' && nextSchedule && nextSchedule.startDate 
                      ? new Date(nextSchedule.startDate!).toLocaleDateString()
                      : lastSchedule && lastSchedule.startDate
                      ? new Date(lastSchedule.startDate!).toLocaleDateString()
                      : "No date set"
                    }
                  </td>
                  <td className="py-4 text-sm">
                    {enrollmentCount}
                  </td>
                  <td className="py-4 text-sm">
                    ${courseRevenue.toLocaleString()}
                  </td>
                  <td className="py-4">
                    <Badge variant={
                      categoryName === 'active' ? "default" :
                      categoryName === 'drafts' ? "outline" :
                      "secondary"
                    }>
                      {categoryName === 'active' && "Active"}
                      {categoryName === 'drafts' && "Draft"}
                      {categoryName === 'archived' && "Archived"}
                    </Badge>
                  </td>
                  <td className="py-4">
                    <CourseManagementActions 
                      course={course}
                      onEditCourse={(course) => setEditingCourse(course)}
                    />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
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

        {/* Course Management */}
        <div className="bg-white rounded-lg border">
          <Tabs defaultValue="active" className="w-full">
            <div className="border-b">
              <TabsList className="h-auto p-0 bg-transparent justify-start rounded-none w-full">
                <TabsTrigger 
                  value="active" 
                  className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-6 py-4"
                  data-testid="tab-active-courses"
                >
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                    Active ({categorizedCourses.upcoming.length})
                  </div>
                </TabsTrigger>
                <TabsTrigger 
                  value="archived" 
                  className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-6 py-4"
                  data-testid="tab-archived-courses"
                >
                  <div className="flex items-center gap-2">
                    <Archive className="h-4 w-4" />
                    Archived ({categorizedCourses.archived.length})
                  </div>
                </TabsTrigger>
                <TabsTrigger 
                  value="drafts" 
                  className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-6 py-4"
                  data-testid="tab-draft-courses"
                >
                  <div className="flex items-center gap-2">
                    <EyeOff className="h-4 w-4" />
                    Drafts ({categorizedCourses.pending.length})
                  </div>
                </TabsTrigger>
                <TabsTrigger 
                  value="deleted" 
                  className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-6 py-4"
                  data-testid="tab-deleted-courses"
                >
                  <div className="flex items-center gap-2">
                    <Trash2 className="h-4 w-4" />
                    Deleted (0)
                  </div>
                </TabsTrigger>
              </TabsList>
            </div>

            <TabsContent value="active" className="p-0 m-0">
              <div className="p-6">
                <div className="flex items-center mb-6">
                  <div className="w-2 h-2 bg-green-500 rounded-full mr-2"></div>
                  <h2 className="text-xl font-semibold">Active Courses</h2>
                </div>
                {renderCourseTable('active', categorizedCourses.upcoming)}
              </div>
            </TabsContent>

            <TabsContent value="archived" className="p-0 m-0">
              <div className="p-6">
                <div className="flex items-center mb-6">
                  <Archive className="h-5 w-5 mr-2" />
                  <h2 className="text-xl font-semibold">Archived Courses</h2>
                </div>
                {renderCourseTable('archived', categorizedCourses.archived)}
              </div>
            </TabsContent>

            <TabsContent value="drafts" className="p-0 m-0">
              <div className="p-6">
                <div className="flex items-center mb-6">
                  <EyeOff className="h-5 w-5 mr-2" />
                  <h2 className="text-xl font-semibold">Draft Courses</h2>
                </div>
                {renderCourseTable('drafts', categorizedCourses.pending)}
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

            <TabsContent value="deleted" className="p-0 m-0">
              <div className="p-6">
                <div className="flex items-center mb-6">
                  <Trash2 className="h-5 w-5 mr-2" />
                  <h2 className="text-xl font-semibold">Deleted Courses</h2>
                </div>
                <div className="text-center py-12">
                  <Trash2 className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
                  <h3 className="text-lg font-medium text-muted-foreground mb-2">No deleted courses</h3>
                  <p className="text-sm text-muted-foreground">
                    Deleted courses will appear here
                  </p>
                </div>
              </div>
            </TabsContent>
          </Tabs>
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
