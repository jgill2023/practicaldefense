import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { 
  Bell, 
  Trash2, 
  Mail, 
  Phone,
  AlertCircle,
  CheckCircle
} from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import type { CourseWithSchedules, CourseNotificationSignup } from "@shared/schema";
import { formatDateSafe } from "@/lib/dateUtils";

export function CourseNotificationSignups() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedCourseId, setSelectedCourseId] = useState<string>("");

  // Fetch instructor's courses
  const { data: courses = [], isLoading: coursesLoading } = useQuery<CourseWithSchedules[]>({
    queryKey: ["/api/instructor/courses"],
    retry: false,
  });

  // Fetch notification signups for selected course
  const { data: signups = [], isLoading: signupsLoading } = useQuery<CourseNotificationSignup[]>({
    queryKey: ["/api/instructor/courses", selectedCourseId, "notification-signups"],
    queryFn: async () => {
      if (!selectedCourseId) return [];
      const response = await apiRequest("GET", `/api/instructor/courses/${selectedCourseId}/notification-signups`);
      return response.json();
    },
    enabled: !!selectedCourseId,
    retry: false,
  });

  // Delete signup mutation
  const deleteSignupMutation = useMutation({
    mutationFn: async (signupId: string) => {
      const response = await apiRequest("DELETE", `/api/instructor/notification-signups/${signupId}`);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ 
        queryKey: ["/api/instructor/courses", selectedCourseId, "notification-signups"] 
      });
      toast({
        title: "Signup Deleted",
        description: "The notification signup has been removed.",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to delete signup. Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleDeleteSignup = (signupId: string) => {
    if (confirm("Are you sure you want to remove this notification signup? The person will no longer receive notifications when new schedules are created.")) {
      deleteSignupMutation.mutate(signupId);
    }
  };

  const selectedCourse = courses.find(c => c.id === selectedCourseId);

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold mb-2 flex items-center gap-2">
          <Bell className="w-5 h-5" />
          Course Notification Signups
        </h3>
        <p className="text-sm text-muted-foreground mb-4">
          View and manage people who have signed up to be notified when new course schedules are created.
        </p>
      </div>

      {/* Course Selector */}
      <Card>
        <CardHeader className="pb-4">
          <CardTitle className="text-base">Select Course</CardTitle>
        </CardHeader>
        <CardContent>
          <Select value={selectedCourseId} onValueChange={setSelectedCourseId}>
            <SelectTrigger className="w-full" data-testid="select-course-signups">
              <SelectValue placeholder="Choose a course to view signups" />
            </SelectTrigger>
            <SelectContent>
              {coursesLoading ? (
                <SelectItem value="loading" disabled>Loading courses...</SelectItem>
              ) : courses.length === 0 ? (
                <SelectItem value="none" disabled>No courses available</SelectItem>
              ) : (
                courses.map((course) => (
                  <SelectItem key={course.id} value={course.id} data-testid={`option-course-${course.id}`}>
                    {course.title}
                  </SelectItem>
                ))
              )}
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      {/* Signups List */}
      {selectedCourseId && (
        <Card>
          <CardHeader className="pb-4">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">
                Notification Signups
                {selectedCourse && <span className="ml-2 text-muted-foreground">for {selectedCourse.title}</span>}
              </CardTitle>
              {signups.length > 0 && (
                <Badge variant="secondary" data-testid="status-signup-count">
                  {signups.length} {signups.length === 1 ? 'signup' : 'signups'}
                </Badge>
              )}
            </div>
          </CardHeader>
          <CardContent>
            {signupsLoading ? (
              <div className="flex items-center justify-center py-8">
                <div className="animate-spin w-6 h-6 border-2 border-primary border-t-transparent rounded-full" data-testid="loading-signups" />
              </div>
            ) : signups.length === 0 ? (
              <div className="text-center py-8">
                <Bell className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-base font-medium text-foreground mb-2">No Signups Yet</h3>
                <p className="text-sm text-muted-foreground">
                  No one has signed up for notifications for this course yet.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {signups.map((signup) => (
                  <div
                    key={signup.id}
                    className="flex items-center justify-between p-4 bg-muted rounded-lg hover:bg-muted/80 transition-colors"
                    data-testid={`signup-${signup.id}`}
                  >
                    <div className="flex-1 space-y-2">
                      <div className="flex items-center space-x-3">
                        <div>
                          <div className="font-medium text-sm" data-testid={`text-name-${signup.id}`}>
                            {signup.firstName} {signup.lastName}
                          </div>
                          <div className="flex items-center space-x-4 text-xs text-muted-foreground mt-1">
                            {signup.email && (
                              <div className="flex items-center space-x-1" data-testid={`text-email-${signup.id}`}>
                                <Mail className="h-3 w-3" />
                                <span>{signup.email}</span>
                              </div>
                            )}
                            {signup.phone && (
                              <div className="flex items-center space-x-1" data-testid={`text-phone-${signup.id}`}>
                                <Phone className="h-3 w-3" />
                                <span>{signup.phone}</span>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center space-x-4 text-xs text-muted-foreground">
                        <div className="flex items-center space-x-1">
                          <span className="font-medium">Notification Preferences:</span>
                          <div className="flex items-center space-x-2">
                            {signup.notifyByEmail && (
                              <Badge variant="outline" className="text-xs py-0 h-5">
                                <Mail className="h-3 w-3 mr-1" />
                                Email
                              </Badge>
                            )}
                            {signup.notifyBySms && (
                              <Badge variant="outline" className="text-xs py-0 h-5">
                                <Phone className="h-3 w-3 mr-1" />
                                SMS
                              </Badge>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center space-x-1">
                          <span className="font-medium">Signed up:</span>
                          <span>{formatDateSafe(signup.createdAt)}</span>
                        </div>
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDeleteSignup(signup.id)}
                      disabled={deleteSignupMutation.isPending}
                      data-testid={`button-delete-signup-${signup.id}`}
                      className="text-destructive hover:text-destructive hover:bg-destructive/10"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Info Card */}
      <Card className="border-blue-200 bg-blue-50 dark:bg-blue-950 dark:border-blue-800">
        <CardContent className="p-4">
          <div className="flex items-start space-x-3">
            <AlertCircle className="h-5 w-5 text-blue-600 dark:text-blue-400 mt-0.5 flex-shrink-0" />
            <div className="space-y-2 text-sm">
              <p className="font-medium text-blue-900 dark:text-blue-100">How Course Notifications Work</p>
              <ul className="list-disc list-inside space-y-1 text-blue-800 dark:text-blue-200">
                <li>Students can sign up on course pages to receive notifications</li>
                <li>When you create a new schedule, all signups receive automatic notifications</li>
                <li>Notifications are sent via their preferred method (email and/or SMS)</li>
                <li>You can remove signups if someone no longer wants to receive notifications</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
