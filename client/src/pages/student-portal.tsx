import { useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { useQuery } from "@tanstack/react-query";
import { Layout } from "@/components/Layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Calendar, Clock, FileText, Download, BookOpen, Award } from "lucide-react";
import type { EnrollmentWithDetails } from "@shared/schema";

export default function StudentPortal() {
  const { user, isLoading, isAuthenticated } = useAuth();
  const { toast } = useToast();

  const { data: enrollments = [], isLoading: enrollmentsLoading } = useQuery<EnrollmentWithDetails[]>({
    queryKey: ["/api/student/enrollments"],
    enabled: isAuthenticated,
    retry: false,
  });

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      toast({
        title: "Unauthorized",
        description: "You need to be logged in to view this page. Redirecting...",
        variant: "destructive",
      });
      setTimeout(() => {
        window.location.href = "/api/login";
      }, 2000);
      return;
    }
  }, [isAuthenticated, isLoading, toast]);

  if (isLoading || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  const confirmedEnrollments = enrollments.filter(e => e.status === 'confirmed');
  const completedEnrollments = enrollments.filter(e => e.status === 'completed');
  const upcomingClasses = confirmedEnrollments.filter(e => e.schedule?.startDate && new Date(e.schedule.startDate) > new Date());
  const completionRate = enrollments.length > 0 
    ? Math.round((completedEnrollments.length / enrollments.length) * 100)
    : 0;

  return (
    <Layout>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Portal Header */}
        <div className="bg-primary rounded-xl p-6 text-primary-foreground mb-8">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h1 className="text-2xl font-bold mb-1" data-testid="text-student-name">
                Welcome, {user?.firstName} {user?.lastName}
              </h1>
              <p className="text-primary-foreground/80">Your training dashboard and course management</p>
            </div>
            <div className="flex items-center space-x-2 mt-4 sm:mt-0">
              <div className="bg-success/10 w-10 h-10 rounded-full flex items-center justify-center">
                <FileText className="h-5 w-5 text-success" />
              </div>
              <div>
                <div className="text-sm font-medium">Profile Complete</div>
                <div className="text-xs text-primary-foreground/80">All waivers submitted</div>
              </div>
            </div>
          </div>
        </div>

        {/* Dashboard Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Courses</CardTitle>
              <BookOpen className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-primary" data-testid="text-total-courses">{enrollments.length}</div>
              <p className="text-sm text-muted-foreground">Enrolled courses</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Upcoming Classes</CardTitle>
              <Calendar className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-accent" data-testid="text-upcoming-classes">{upcomingClasses.length}</div>
              <p className="text-sm text-muted-foreground">This month</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Completed</CardTitle>
              <Award className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-success" data-testid="text-completed-courses">{completedEnrollments.length}</div>
              <p className="text-sm text-muted-foreground">Certificates earned</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Progress</CardTitle>
              <Clock className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-secondary mb-2" data-testid="text-completion-rate">{completionRate}%</div>
              <Progress value={completionRate} className="h-2" />
            </CardContent>
          </Card>
        </div>

        <div className="grid lg:grid-cols-2 gap-8">
          {/* Upcoming Classes */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Calendar className="mr-2 h-5 w-5" />
                Upcoming Classes
              </CardTitle>
            </CardHeader>
            <CardContent>
              {enrollmentsLoading ? (
                <div className="space-y-4">
                  {[1, 2].map(i => (
                    <div key={i} className="animate-pulse p-4 bg-muted rounded-lg">
                      <div className="h-4 bg-muted-foreground/20 rounded w-2/3 mb-2" />
                      <div className="h-3 bg-muted-foreground/20 rounded w-1/2" />
                    </div>
                  ))}
                </div>
              ) : upcomingClasses.length > 0 ? (
                <div className="space-y-4">
                  {upcomingClasses.map(enrollment => (
                    <div key={enrollment.id} className="p-4 bg-muted rounded-lg">
                      <div className="flex items-start justify-between mb-2">
                        <h4 className="font-semibold text-card-foreground" data-testid={`text-course-title-${enrollment.id}`}>
                          {enrollment.course.title}
                        </h4>
                        <Badge variant="outline">
                          {enrollment.status === 'confirmed' ? 'Confirmed' : enrollment.status}
                        </Badge>
                      </div>
                      <div className="space-y-1 text-sm text-muted-foreground">
                        <div className="flex items-center">
                          <Calendar className="mr-2 h-4 w-4" />
                          {new Date(enrollment.schedule.startDate).toLocaleDateString()}
                        </div>
                        <div className="flex items-center">
                          <Clock className="mr-2 h-4 w-4" />
                          {enrollment.course.duration}
                        </div>
                        {enrollment.schedule.location && (
                          <div className="flex items-center">
                            <span className="mr-2">📍</span>
                            {enrollment.schedule.location}
                          </div>
                        )}
                      </div>
                      {enrollment.waiverUrl && (
                        <Button variant="outline" size="sm" className="mt-3" data-testid={`button-download-waiver-${enrollment.id}`}>
                          <Download className="mr-2 h-4 w-4" />
                          Download Waiver
                        </Button>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <Calendar className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
                  <h3 className="text-lg font-medium text-muted-foreground mb-2">No upcoming classes</h3>
                  <p className="text-sm text-muted-foreground">Browse available courses to enroll in new classes</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Course History */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <BookOpen className="mr-2 h-5 w-5" />
                Course History
              </CardTitle>
            </CardHeader>
            <CardContent>
              {enrollmentsLoading ? (
                <div className="space-y-4">
                  {[1, 2].map(i => (
                    <div key={i} className="animate-pulse p-4 bg-muted rounded-lg">
                      <div className="h-4 bg-muted-foreground/20 rounded w-2/3 mb-2" />
                      <div className="h-3 bg-muted-foreground/20 rounded w-1/2" />
                    </div>
                  ))}
                </div>
              ) : enrollments.length > 0 ? (
                <div className="space-y-4">
                  {enrollments.slice(0, 5).map(enrollment => (
                    <div key={enrollment.id} className="p-4 bg-muted rounded-lg">
                      <div className="flex items-start justify-between mb-2">
                        <h4 className="font-semibold text-card-foreground" data-testid={`text-history-course-${enrollment.id}`}>
                          {enrollment.course.title}
                        </h4>
                        <Badge 
                          variant={
                            enrollment.status === 'completed' ? 'default' :
                            enrollment.status === 'confirmed' ? 'secondary' : 
                            'outline'
                          }
                        >
                          {enrollment.status}
                        </Badge>
                      </div>
                      <div className="text-sm text-muted-foreground">
                        <div>Completed: {enrollment.schedule?.endDate ? new Date(enrollment.schedule.endDate).toLocaleDateString() : 'TBD'}</div>
                        <div>Instructor: Course instructor</div>
                      </div>
                      {enrollment.status === 'completed' && (
                        <Button variant="outline" size="sm" className="mt-3" data-testid={`button-download-certificate-${enrollment.id}`}>
                          <Award className="mr-2 h-4 w-4" />
                          Download Certificate
                        </Button>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <BookOpen className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
                  <h3 className="text-lg font-medium text-muted-foreground mb-2">No course history</h3>
                  <p className="text-sm text-muted-foreground">Your completed courses will appear here</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </Layout>
  );
}
