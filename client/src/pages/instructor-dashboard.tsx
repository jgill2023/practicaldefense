import { useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Layout } from "@/components/Layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { isUnauthorizedError } from "@/lib/authUtils";
import { Plus, BarChart, GraduationCap, DollarSign, Users, TrendingUp } from "lucide-react";
import type { CourseWithSchedules, EnrollmentWithDetails, User } from "@shared/schema";

export default function InstructorDashboard() {
  const { user, isLoading, isAuthenticated } = useAuth();
  const { toast } = useToast();
  const [, setLocation] = useLocation();

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
        <Card>
          <CardHeader>
            <CardTitle>Recent Course Activity</CardTitle>
          </CardHeader>
          <CardContent>
            {coursesLoading ? (
              <div className="space-y-4">
                {[1, 2].map(i => (
                  <div key={i} className="animate-pulse p-4 bg-muted rounded-lg">
                    <div className="h-4 bg-muted-foreground/20 rounded w-1/3 mb-2" />
                    <div className="h-3 bg-muted-foreground/20 rounded w-1/2" />
                  </div>
                ))}
              </div>
            ) : courses.length > 0 ? (
              <div className="space-y-4">
                {courses.slice(0, 5).map(course => {
                  const enrollmentCount = enrollments.filter(e => e.courseId === course.id).length;
                  const nextSchedule = course.schedules
                    .filter(s => s.startDate && new Date(s.startDate) > new Date())
                    .sort((a, b) => new Date(a.startDate!).getTime() - new Date(b.startDate!).getTime())[0];
                  
                  return (
                    <div key={course.id} className="flex items-center justify-between p-4 bg-muted rounded-lg">
                      <div className="flex items-center space-x-4">
                        <div className="bg-primary/10 w-10 h-10 rounded-full flex items-center justify-center">
                          <GraduationCap className="h-5 w-5 text-primary" />
                        </div>
                        <div>
                          <h5 className="font-medium text-card-foreground" data-testid={`text-course-name-${course.id}`}>
                            {course.title}
                          </h5>
                          <p className="text-sm text-muted-foreground">
                            {nextSchedule && nextSchedule.startDate 
                              ? `${new Date(nextSchedule.startDate!).toLocaleDateString()} • ${enrollmentCount} students registered`
                              : `${enrollmentCount} total enrollments`
                            }
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Badge variant={course.isActive ? "default" : "secondary"}>
                          {course.isActive ? "Active" : "Inactive"}
                        </Badge>
                        <Button variant="ghost" size="sm" data-testid={`button-manage-course-${course.id}`}>
                          Manage
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="text-center py-8">
                <GraduationCap className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
                <h3 className="text-lg font-medium text-muted-foreground mb-2">No courses yet</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  Create your first course to start managing your training business
                </p>
                <Button data-testid="button-create-first-course">
                  <Plus className="mr-2 h-4 w-4" />
                  Create Your First Course
                </Button>
              </div>
            )}
            
            {courses.length > 5 && (
              <div className="mt-6 text-center">
                <Button variant="link" data-testid="button-view-all-courses">
                  View All Courses →
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}
