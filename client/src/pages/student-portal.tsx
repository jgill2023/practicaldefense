import { useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { useQuery } from "@tanstack/react-query";
import { Layout } from "@/components/Layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { AlertCircle, CreditCard, CheckCircle2, AlertTriangle, Shield, Bell } from "lucide-react";
import { Calendar, Clock, FileText, Download, BookOpen, Award } from "lucide-react";
import type { EnrollmentWithDetails } from "@shared/schema";

// Enhanced enrollment card component with payment and form status
function EnhancedEnrollmentCard({ enrollment }: { enrollment: EnrollmentWithDetails }) {
  const { data: paymentBalance } = useQuery({
    queryKey: ['/api/enrollments', enrollment.id, 'payment-balance'],
    enabled: !!enrollment.id,
    retry: false,
  });
  
  const { data: formStatus } = useQuery({
    queryKey: ['/api/enrollments', enrollment.id, 'form-completion'],
    enabled: !!enrollment.id,
    retry: false,
  });

  return (
    <div className="p-4 bg-muted rounded-lg">
      <div className="flex items-start justify-between mb-3">
        <h4 className="font-semibold text-card-foreground" data-testid={`text-course-title-${enrollment.id}`}>
          {enrollment.course.title}
        </h4>
        <Badge variant="outline">
          {enrollment.status === 'confirmed' ? 'Confirmed' : enrollment.status}
        </Badge>
      </div>
      
      {/* Course Details */}
      <div className="space-y-1 text-sm text-muted-foreground mb-3">
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

      {/* Payment & Form Status */}
      <div className="grid grid-cols-2 gap-4 mb-3">
        {/* Payment Status */}
        <div className="space-y-1">
          <div className="flex items-center text-xs text-muted-foreground">
            <CreditCard className="mr-1 h-3 w-3" />
            Payment Status
          </div>
          {paymentBalance?.hasRemainingBalance ? (
            <div className="flex items-center space-x-1">
              <AlertCircle className="h-3 w-3 text-yellow-500" />
              <span className="text-xs text-yellow-600 font-medium">
                ${paymentBalance.remainingBalance.toFixed(2)} due
              </span>
            </div>
          ) : (
            <div className="flex items-center space-x-1">
              <CheckCircle2 className="h-3 w-3 text-success" />
              <span className="text-xs text-success font-medium">Paid in full</span>
            </div>
          )}
        </div>

        {/* Form Status */}
        <div className="space-y-1">
          <div className="flex items-center text-xs text-muted-foreground">
            <FileText className="mr-1 h-3 w-3" />
            Forms Status
          </div>
          {formStatus?.isComplete ? (
            <div className="flex items-center space-x-1">
              <CheckCircle2 className="h-3 w-3 text-success" />
              <span className="text-xs text-success font-medium">Complete</span>
            </div>
          ) : (
            <div className="flex items-center space-x-1">
              <AlertCircle className="h-3 w-3 text-yellow-500" />
              <span className="text-xs text-yellow-600 font-medium">
                {formStatus?.missingForms?.length || 0} pending
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex flex-wrap gap-2">
        {paymentBalance?.hasRemainingBalance && (
          <Button variant="outline" size="sm" data-testid={`button-make-payment-${enrollment.id}`}>
            <CreditCard className="mr-2 h-4 w-4" />
            Make Payment
          </Button>
        )}
        
        {!formStatus?.isComplete && (
          <Button variant="outline" size="sm" data-testid={`button-complete-forms-${enrollment.id}`}>
            <FileText className="mr-2 h-4 w-4" />
            Complete Forms
          </Button>
        )}
        
        {enrollment.waiverUrl && (
          <Button variant="outline" size="sm" data-testid={`button-download-waiver-${enrollment.id}`}>
            <Download className="mr-2 h-4 w-4" />
            Download Waiver
          </Button>
        )}
      </div>
    </div>
  );
}

export default function StudentPortal() {
  const { user, isLoading, isAuthenticated } = useAuth();
  const { toast } = useToast();

  const { data: enrollments = [], isLoading: enrollmentsLoading } = useQuery<EnrollmentWithDetails[]>({
    queryKey: ["/api/student/enrollments"],
    enabled: isAuthenticated,
    retry: false,
  });

  // Add license expiration warning calculation
  const getLicenseWarning = () => {
    if (!user?.concealedCarryLicenseExpiration) return null;
    
    const expirationDate = new Date(user.concealedCarryLicenseExpiration);
    const today = new Date();
    const daysUntilExpiration = Math.ceil((expirationDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    
    if (daysUntilExpiration <= 30) {
      return {
        level: 'critical',
        message: `License expires in ${daysUntilExpiration} days`,
        color: 'destructive'
      };
    } else if (daysUntilExpiration <= 90) {
      return {
        level: 'warning', 
        message: `License expires in ${daysUntilExpiration} days`,
        color: 'warning'
      };
    }
    return null;
  };
  
  const licenseWarning = getLicenseWarning();

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
            <div className="flex items-center space-x-4 mt-4 sm:mt-0">
              {/* License Status */}
              {user?.concealedCarryLicenseExpiration && (
                <div className="flex items-center space-x-2">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                    licenseWarning?.level === 'critical' ? 'bg-destructive/10' : 
                    licenseWarning?.level === 'warning' ? 'bg-yellow-500/10' : 
                    'bg-success/10'
                  }`}>
                    <Shield className={`h-5 w-5 ${
                      licenseWarning?.level === 'critical' ? 'text-destructive' :
                      licenseWarning?.level === 'warning' ? 'text-yellow-500' :
                      'text-success'
                    }`} />
                  </div>
                  <div>
                    <div className="text-sm font-medium">CCW License</div>
                    <div className="text-xs text-primary-foreground/80">
                      {licenseWarning ? licenseWarning.message : 'Valid'}
                    </div>
                  </div>
                </div>
              )}
              {/* Profile Status */}
              <div className="flex items-center space-x-2">
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

        {/* License Management Section */}
        {user?.concealedCarryLicenseExpiration && (
          <Card className="mb-8">
            <CardHeader>
              <CardTitle className="flex items-center">
                <Shield className="mr-2 h-5 w-5" />
                License Management
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div>
                    <h4 className="font-medium mb-2">Concealed Carry License Status</h4>
                    <div className="flex items-center space-x-2">
                      <div className={`w-3 h-3 rounded-full ${
                        licenseWarning?.level === 'critical' ? 'bg-destructive' :
                        licenseWarning?.level === 'warning' ? 'bg-yellow-500' :
                        'bg-success'
                      }`}></div>
                      <span className={`text-sm font-medium ${
                        licenseWarning?.level === 'critical' ? 'text-destructive' :
                        licenseWarning?.level === 'warning' ? 'text-yellow-600' :
                        'text-success'
                      }`}>
                        {licenseWarning ? licenseWarning.message : 'License Valid'}
                      </span>
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    {user.concealedCarryLicenseIssued && (
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Issued:</span>
                        <span>{new Date(user.concealedCarryLicenseIssued).toLocaleDateString()}</span>
                      </div>
                    )}
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Expires:</span>
                      <span>{new Date(user.concealedCarryLicenseExpiration).toLocaleDateString()}</span>
                    </div>
                  </div>
                </div>
                
                <div className="space-y-4">
                  <div>
                    <h4 className="font-medium mb-2">Renewal Reminders</h4>
                    <div className="space-y-2">
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">License Expiration:</span>
                        <div className="flex items-center space-x-2">
                          <span>{user.enableLicenseExpirationReminder ? 'Enabled' : 'Disabled'}</span>
                          <Bell className={`h-4 w-4 ${user.enableLicenseExpirationReminder ? 'text-primary' : 'text-muted-foreground'}`} />
                        </div>
                      </div>
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">Refresher Course:</span>
                        <div className="flex items-center space-x-2">
                          <span>{user.enableRefresherReminder ? 'Enabled' : 'Disabled'}</span>
                          <Bell className={`h-4 w-4 ${user.enableRefresherReminder ? 'text-primary' : 'text-muted-foreground'}`} />
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  {licenseWarning && (
                    <div className={`p-3 rounded-lg border ${
                      licenseWarning.level === 'critical' ? 'bg-destructive/5 border-destructive/20' :
                      'bg-yellow-50 border-yellow-200 dark:bg-yellow-900/10'
                    }`}>
                      <div className="flex items-start space-x-2">
                        <AlertTriangle className={`h-4 w-4 mt-0.5 ${
                          licenseWarning.level === 'critical' ? 'text-destructive' : 'text-yellow-500'
                        }`} />
                        <div className="text-sm">
                          <p className="font-medium">Action Required</p>
                          <p className="text-muted-foreground">
                            {licenseWarning.level === 'critical' 
                              ? 'Your license is expiring soon. Please renew immediately.'
                              : 'Consider scheduling a renewal soon to avoid any issues.'
                            }
                          </p>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        )}

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
                    <EnhancedEnrollmentCard key={enrollment.id} enrollment={enrollment} />
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
