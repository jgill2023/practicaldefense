import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { Layout } from "@/components/Layout";
import { Users, Phone, Mail, Edit, Calendar, ArrowLeft, Eye, Download, FileSpreadsheet, FileText, Share2, UserPen, MessageSquare, Shuffle } from "lucide-react";
import { Link } from "wouter";
import { EmailNotificationModal } from "@/components/EmailNotificationModal";
import { SmsNotificationModal } from "@/components/SmsNotificationModal";
import { RescheduleModal } from "@/components/RescheduleModal";
import { CrossEnrollmentModal } from "@/components/CrossEnrollmentModal";
import { PaymentDetailsModal } from "@/components/PaymentDetailsModal";
import { AllStudentsDirectory } from "@/components/AllStudentsDirectory";
import { RosterDialog } from "@/components/RosterDialog";
import { format } from "date-fns";

// Phone number formatting utility
function formatPhoneNumber(phone: string | undefined | null): string {
  if (!phone) return '';

  // Remove all non-digit characters
  const digits = phone.replace(/\D/g, '');

  // Format as (###) ###-####
  if (digits.length === 10) {
    return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
  }

  // If 11 digits and starts with 1, remove the 1 and format
  if (digits.length === 11 && digits[0] === '1') {
    return `(${digits.slice(1, 4)}) ${digits.slice(4, 7)}-${digits.slice(7)}`;
  }

  // Return original if not standard format
  return phone;
}

// Edit student form schema
const editStudentSchema = z.object({
  email: z.string().email("Please enter a valid email address").optional().or(z.literal("")),
  phone: z.string().optional(),
  concealedCarryLicenseExpiration: z.string().optional(),
});

type EditStudentFormData = z.infer<typeof editStudentSchema>;

// Types for student data
interface Student {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  concealedCarryLicenseExpiration?: string;
  enrollments: {
    id: string;
    courseTitle: string;
    courseAbbreviation?: string;
    scheduleDate: string;
    scheduleStartTime: string;
    scheduleEndTime: string;
    paymentStatus: string;
  }[];
}

interface StudentsData {
  current: Student[];
  former: Student[];
  held: Student[];
}

interface CourseSchedule {
  id: string;
  courseId: string;
  courseTitle: string;
  courseAbbreviation?: string;
  startDate: string;
  endDate: string;
  startTime: string;
  endTime: string;
  location?: string;
  maxSpots: number;
  availableSpots: number;
  enrollmentCount: number;
}

function StudentsPage() {
  const [activeTab, setActiveTab] = useState("current");
  const [editingStudent, setEditingStudent] = useState<Student | null>(null);
  const [isExporting, setIsExporting] = useState(false);
  const [showExportModal, setShowExportModal] = useState(false);
  const [exportFormat, setExportFormat] = useState<'excel' | 'csv' | 'google-sheets'>('excel');
  const [selectedScheduleId, setSelectedScheduleId] = useState<string>('all');

  // Notification modal states
  const [emailModalOpen, setEmailModalOpen] = useState(false);
  const [smsModalOpen, setSmsModalOpen] = useState(false);
  const [rescheduleModalOpen, setRescheduleModalOpen] = useState(false);
  const [crossEnrollmentModalOpen, setCrossEnrollmentModalOpen] = useState(false);
  const [selectedStudentForNotification, setSelectedStudentForNotification] = useState<Student | null>(null);
  const [selectedEnrollmentForReschedule, setSelectedEnrollmentForReschedule] = useState<{student: Student, enrollment: any} | null>(null);
  const [selectedStudentForCrossEnrollment, setSelectedStudentForCrossEnrollment] = useState<Student | null>(null);
  const [paymentDetailsModalOpen, setPaymentDetailsModalOpen] = useState(false);
  const [selectedEnrollmentForPayment, setSelectedEnrollmentForPayment] = useState<string | null>(null);
  const [allStudentsDirectoryOpen, setAllStudentsDirectoryOpen] = useState(false);
  const [rosterDialogOpen, setRosterDialogOpen] = useState(false);
  const [selectedScheduleIdForRoster, setSelectedScheduleIdForRoster] = useState<string | null>(null);
  const [selectedCourseIdForRoster, setSelectedCourseIdForRoster] = useState<string | null>(null); // New state for courseId
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Query for students data
  const { data: studentsData, isLoading, isError, error } = useQuery<StudentsData>({
    queryKey: ['/api/students'],
  });

  // Query for course schedules
  const { data: courseSchedules } = useQuery<CourseSchedule[]>({
    queryKey: ['/api/instructor/course-schedules'],
    enabled: showExportModal, // Only fetch when modal is open
  });

  // Export handlers  
  const handleExportClick = (format: 'excel' | 'csv' | 'google-sheets') => {
    setExportFormat(format);
    setShowExportModal(true);
  };

  const handleExport = async (format: 'excel' | 'csv') => {
    if (isExporting) return;

    setIsExporting(true);
    try {
      const scheduleParam = selectedScheduleId !== 'all' ? `&scheduleId=${selectedScheduleId}` : '';
      const response = await fetch(`/api/instructor/roster/export?format=${format}${scheduleParam}`, {
        method: 'GET',
        credentials: 'include',
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || 'Export failed');
      }

      // Create download link
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `course-roster-${new Date().toISOString().split('T')[0]}.${format === 'excel' ? 'xlsx' : 'csv'}`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      toast({
        title: "Export Successful",
        description: `Course roster has been exported as ${format.toUpperCase()}`,
      });
    } catch (error: any) {
      toast({
        title: "Export Failed",
        description: error.message || "Failed to export course roster. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsExporting(false);
    }
  };

  const handleGoogleSheetsExport = async () => {
    if (isExporting) return;

    setIsExporting(true);
    try {
      const requestBody = selectedScheduleId !== 'all' ? { scheduleId: selectedScheduleId } : {};
      const response = await apiRequest("POST", "/api/instructor/roster/google-sheets", requestBody);

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ message: 'Export failed' }));
        throw new Error(errorData.message || 'Failed to export to Google Sheets');
      }

      const result = await response.json();

      if (result.action === 'setup_required') {
        toast({
          title: "Setup Required",
          description: result.message,
        });
      } else if (result.action === 'success') {
        toast({
          title: "Google Sheets Created!",
          description: (
            <div>
              <p>{result.message}</p>
              <a 
                href={result.spreadsheetUrl} 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-blue-500 underline mt-2 block"
              >
                Open Google Sheet
              </a>
            </div>
          ),
        });
      } else if (result.action === 'no_data') {
        toast({
          title: "No Data",
          description: result.message,
        });
      } else {
        toast({
          title: "Google Sheets Export",
          description: "Google Sheets export has been initiated.",
        });
      }
    } catch (error: any) {
      console.error("Google Sheets export error:", error);
      toast({
        title: "Export Failed",
        description: error.message || "Failed to create Google Sheets export. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsExporting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading students...</p>
        </div>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="text-red-500 mb-4">
            <Users className="h-12 w-12 mx-auto mb-2" />
          </div>
          <h3 className="text-lg font-semibold mb-2">Error Loading Students</h3>
          <p className="text-muted-foreground mb-4">
            {error?.message || "Failed to load students data. Please try again."}
          </p>
          <Button 
            onClick={() => window.location.reload()} 
            data-testid="button-retry-students"
          >
            Try Again
          </Button>
        </div>
      </div>
    );
  }

  const renderStudentsTable = (students: Student[], category: string) => {
    if (!students || students.length === 0) {
      return (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Users className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">No {category} Students</h3>
            <p className="text-muted-foreground text-center">
              {category === "current" && "No students are currently enrolled in upcoming courses."}
              {category === "former" && "No students have completed courses yet."}
            </p>
          </CardContent>
        </Card>
      );
    }

    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Users className="h-5 w-5" />
            <span>{category.charAt(0).toUpperCase() + category.slice(1)} Students ({students.length})</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[200px]">Name</TableHead>
                <TableHead className="w-[140px]">Phone</TableHead>
                <TableHead className="w-[280px]">Course</TableHead>
                <TableHead className="w-[160px]">License Expiration</TableHead>
                <TableHead className="w-[120px]">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {students.map((student) =>
                student.enrollments.map((enrollment, index) => (
                  <TableRow key={`${student.id}-${enrollment.id}`}>
                    {index === 0 && (
                      <TableCell rowSpan={student.enrollments.length} className="font-medium">
                        <div>
                          <p className="font-semibold">{student.firstName} {student.lastName}</p>
                          <button
                            onClick={() => {
                              setSelectedStudentForNotification(student);
                              setEmailModalOpen(true);
                            }}
                            className="text-sm text-blue-600 hover:text-blue-800 hover:underline cursor-pointer transition-colors"
                            title={`Send email to ${student.email}`}
                            data-testid={`link-email-${student.id}`}
                          >
                            {student.email}
                          </button>
                        </div>
                      </TableCell>
                    )}
                    {index === 0 && (
                      <TableCell rowSpan={student.enrollments.length}>
                        {student.phone ? (
                          <button
                            onClick={() => {
                              setSelectedStudentForNotification(student);
                              setSmsModalOpen(true);
                            }}
                            className="text-sm text-green-600 hover:text-green-800 hover:underline cursor-pointer transition-colors"
                            title={`Send SMS to ${student.phone}`}
                            data-testid={`link-sms-${student.id}`}
                          >
                            {formatPhoneNumber(student.phone)}
                          </button>
                        ) : (
                          <span className="text-sm text-muted-foreground">No phone</span>
                        )}
                      </TableCell>
                    )}
                    <TableCell>
                      <div className="space-y-1">
                        <button
                          onClick={() => {
                            // Get the first enrollment's schedule ID for the roster
                            const firstEnrollment = student.enrollments[0];
                            if (firstEnrollment && firstEnrollment.scheduleId) {
                              setSelectedScheduleIdForRoster(firstEnrollment.scheduleId);
                              setSelectedCourseIdForRoster(null); // Let the backend use schedule to find course
                              setRosterDialogOpen(true);
                            } else if (firstEnrollment) {
                              // Fallback if scheduleId is missing but enrollment exists
                              console.warn("Missing scheduleId for enrollment, using enrollment ID as fallback for roster dialog.");
                              setSelectedScheduleIdForRoster(firstEnrollment.id); 
                              setSelectedCourseIdForRoster(null);
                              setRosterDialogOpen(true);
                            }
                          }}
                          className="text-left hover:text-primary hover:underline transition-colors cursor-pointer"
                          data-testid={`button-course-roster-${enrollment.id}`}
                        >
                          {enrollment.courseTitle}
                        </button>
                        <div className="flex items-center space-x-1 text-xs text-muted-foreground">
                          <Calendar className="h-3 w-3" />
                          <span>
                            {format(new Date(enrollment.scheduleDate), "MMM d, yyyy")} at {enrollment.scheduleStartTime}
                          </span>
                        </div>
                        <Badge 
                          variant={enrollment.paymentStatus === 'paid' ? 'default' : 
                                   enrollment.paymentStatus === 'pending' ? 'secondary' : 'destructive'}
                          className={`text-xs cursor-pointer hover:opacity-80 transition-opacity ${
                            enrollment.paymentStatus === 'paid' ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' :
                            enrollment.paymentStatus === 'pending' ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200' :
                            ''
                          }`}
                          onClick={() => {
                            setSelectedEnrollmentForPayment(enrollment.id);
                            setPaymentDetailsModalOpen(true);
                          }}
                          data-testid={`badge-payment-status-${enrollment.id}`}
                        >
                          {enrollment.paymentStatus}
                        </Badge>
                      </div>
                    </TableCell>
                    {index === 0 && (
                      <TableCell rowSpan={student.enrollments.length}>
                        {student.concealedCarryLicenseExpiration ? (
                          <span className="text-sm">
                            {format(new Date(student.concealedCarryLicenseExpiration), "MMM d, yyyy")}
                          </span>
                        ) : (
                          <span className="text-sm text-muted-foreground">Not provided</span>
                        )}
                      </TableCell>
                    )}
                    <TableCell>
                      <div className="flex space-x-2">
                        {index === 0 && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setEditingStudent(student)}
                            title={`Edit ${student.firstName} ${student.lastName}`}
                            data-testid={`button-edit-${student.id}`}
                          >
                            <UserPen className="h-4 w-4" />
                          </Button>
                        )}
                        {index === 0 && category !== 'former' && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              setSelectedStudentForCrossEnrollment(student);
                              setCrossEnrollmentModalOpen(true);
                            }}
                            title={`Enroll ${student.firstName} ${student.lastName} in another course`}
                            data-testid={`button-enroll-course-${student.id}`}
                          >
                            <Users className="h-4 w-4" />
                          </Button>
                        )}
                        {category === 'current' ? (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              setSelectedEnrollmentForReschedule({ student, enrollment });
                              setRescheduleModalOpen(true);
                            }}
                            title={`Reschedule ${student.firstName} ${student.lastName}`}
                            data-testid={`button-reschedule-${student.id}-${enrollment.id}`}
                          >
                            <Shuffle className="h-4 w-4" />
                          </Button>
                        ) : (
                          index === 0 && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                setSelectedStudentForCrossEnrollment(student);
                                setCrossEnrollmentModalOpen(true);
                              }}
                              title={`Re-enroll ${student.firstName} ${student.lastName}`}
                              data-testid={`button-re-enroll-${student.id}`}
                            >
                              <Shuffle className="h-4 w-4" />
                            </Button>
                          )
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    );
  };

  return (
    <Layout>
      <div className="max-w-7xl mx-auto p-6">
      {/* Back to Dashboard Link */}
      <div className="mb-6">
        <Link href="/instructor-dashboard">
          <Button variant="ghost" size="sm" data-testid="button-back-to-dashboard">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Dashboard
          </Button>
        </Link>
      </div>

      <div className="mb-6 flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Students Management</h1>
          <p className="text-muted-foreground">
            Manage student information, track course progress, and communicate with your students.
          </p>
        </div>
        <Button
          variant="default"
          onClick={() => setAllStudentsDirectoryOpen(true)}
          className="shrink-0"
          data-testid="button-view-all-students"
        >
          <Users className="h-4 w-4 mr-2" />
          View All Students
        </Button>
      </div>

      {/* Export Section */}
      <div className="mb-6 p-4 bg-gray-50 dark:bg-gray-800 rounded-lg border">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h3 className="text-lg font-semibold mb-1">Export Course Rosters</h3>
            <p className="text-sm text-muted-foreground">
              Download or share your course rosters in different formats
            </p>
          </div>
          <div className="flex flex-col sm:flex-row gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleExportClick('excel')}
              disabled={isExporting}
              data-testid="button-export-excel"
              className="min-w-0 flex-1 sm:flex-none"
            >
              {isExporting ? (
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-current mr-1 sm:mr-2" />
              ) : (
                <FileSpreadsheet className="h-4 w-4 mr-1 sm:mr-2" />
              )}
              <span className="text-xs sm:text-sm">Excel</span>
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleExportClick('csv')}
              disabled={isExporting}
              data-testid="button-export-csv"
              className="min-w-0 flex-1 sm:flex-none"
            >
              {isExporting ? (
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-current mr-1 sm:mr-2" />
              ) : (
                <FileText className="h-4 w-4 mr-1 sm:mr-2" />
              )}
              <span className="text-xs sm:text-sm">CSV</span>
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleExportClick('google-sheets')}
              disabled={isExporting}
              data-testid="button-export-google-sheets"
              className="min-w-0 flex-1 sm:flex-none"
            >
              {isExporting ? (
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-current mr-1 sm:mr-2" />
              ) : (
                <Share2 className="h-4 w-4 mr-1 sm:mr-2" />
              )}
              <span className="text-xs sm:text-sm">Google Sheets</span>
            </Button>
          </div>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="current" data-testid="tab-current-students">
            Current Students
            {studentsData?.current && studentsData.current.length > 0 && (
              <Badge variant="secondary" className="ml-2">
                {studentsData.current.length}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="held" data-testid="tab-held-students">
            Held Students
            {studentsData?.held && studentsData.held.length > 0 && (
              <Badge variant="secondary" className="ml-2">
                {studentsData.held.length}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="former" data-testid="tab-former-students">
            Former Students
            {studentsData?.former && studentsData.former.length > 0 && (
              <Badge variant="secondary" className="ml-2">
                {studentsData.former.length}
              </Badge>
            )}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="current" className="space-y-4" data-testid="content-current-students">
          {renderStudentsTable(studentsData?.current || [], "current")}
        </TabsContent>

        <TabsContent value="held" className="space-y-4" data-testid="content-held-students">
          {renderStudentsTable(studentsData?.held || [], "held")}
        </TabsContent>

        <TabsContent value="former" className="space-y-4" data-testid="content-former-students">
          {renderStudentsTable(studentsData?.former || [], "former")}
        </TabsContent>
      </Tabs>

      {/* Edit Student Modal */}
      <Dialog open={!!editingStudent} onOpenChange={(open) => !open && setEditingStudent(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              Edit Student: {editingStudent?.firstName} {editingStudent?.lastName}
            </DialogTitle>
          </DialogHeader>
          {editingStudent && <EditStudentForm student={editingStudent} onClose={() => setEditingStudent(null)} />}
        </DialogContent>
      </Dialog>

      {/* Export Selection Modal */}
      <Dialog open={showExportModal} onOpenChange={setShowExportModal}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Export Course Roster</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium">Export Scope</label>
              <Select value={selectedScheduleId} onValueChange={setSelectedScheduleId}>
                <SelectTrigger data-testid="select-export-scope">
                  <SelectValue placeholder="Select course schedule" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Current Students</SelectItem>
                  {courseSchedules?.map((schedule) => (
                    <SelectItem key={schedule.id} value={schedule.id}>
                      {schedule.courseTitle} {schedule.courseAbbreviation ? `(${schedule.courseAbbreviation})` : ''} - {' '}
                      {format(new Date(schedule.startDate), 'MMM d, yyyy')} at {schedule.startTime} ({schedule.enrollmentCount} students)
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => setShowExportModal(false)}
              data-testid="button-cancel-export"
            >
              Cancel
            </Button>
            <Button
              onClick={() => {
                setShowExportModal(false);
                if (exportFormat === 'google-sheets') {
                  handleGoogleSheetsExport();
                } else {
                  handleExport(exportFormat as 'excel' | 'csv');
                }
              }}
              disabled={isExporting}
              data-testid="button-confirm-export"
            >
              {isExporting ? (
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-current mr-2" />
              ) : null}
              Export {exportFormat === 'google-sheets' ? 'Google Sheets' : exportFormat.toUpperCase()}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Email Notification Modal */}
      <EmailNotificationModal
        isOpen={emailModalOpen}
        onClose={() => {
          setEmailModalOpen(false);
          setSelectedStudentForNotification(null);
        }}
        studentName={selectedStudentForNotification ? `${selectedStudentForNotification.firstName} ${selectedStudentForNotification.lastName}` : ''}
        emailAddress={selectedStudentForNotification?.email || ''}
      />

      {/* SMS Notification Modal */}
      <SmsNotificationModal
        isOpen={smsModalOpen}
        onClose={() => {
          setSmsModalOpen(false);
          setSelectedStudentForNotification(null);
        }}
        studentName={selectedStudentForNotification ? `${selectedStudentForNotification.firstName} ${selectedStudentForNotification.lastName}` : ''}
        phoneNumber={selectedStudentForNotification?.phone || ''}
      />

      {/* Reschedule Modal */}
      {selectedEnrollmentForReschedule && (
        <RescheduleModal
          isOpen={rescheduleModalOpen}
          onClose={() => {
            setRescheduleModalOpen(false);
            setSelectedEnrollmentForReschedule(null);
          }}
          studentId={selectedEnrollmentForReschedule.student.id}
          studentName={`${selectedEnrollmentForReschedule.student.firstName} ${selectedEnrollmentForReschedule.student.lastName}`}
          enrollmentId={selectedEnrollmentForReschedule.enrollment.id}
          currentCourse={selectedEnrollmentForReschedule.enrollment.courseTitle}
          currentScheduleDate={selectedEnrollmentForReschedule.enrollment.scheduleDate}
        />
      )}

      {/* Cross-Enrollment Modal */}
      {selectedStudentForCrossEnrollment && (
        <CrossEnrollmentModal
          isOpen={crossEnrollmentModalOpen}
          onClose={() => {
            setCrossEnrollmentModalOpen(false);
            setSelectedStudentForCrossEnrollment(null);
          }}
          studentId={selectedStudentForCrossEnrollment.id}
          studentName={`${selectedStudentForCrossEnrollment.firstName} ${selectedStudentForCrossEnrollment.lastName}`}
        />
      )}

      {/* Payment Details Modal */}
      {selectedEnrollmentForPayment && (
        <PaymentDetailsModal
          isOpen={paymentDetailsModalOpen}
          onClose={() => {
            setPaymentDetailsModalOpen(false);
            setSelectedEnrollmentForPayment(null);
          }}
          enrollmentId={selectedEnrollmentForPayment}
        />
      )}

      {/* All Students Directory Modal */}
      <AllStudentsDirectory
        isOpen={allStudentsDirectoryOpen}
        onClose={() => setAllStudentsDirectoryOpen(false)}
      />

      {/* Roster Dialog */}
      <RosterDialog
        scheduleId={selectedScheduleIdForRoster}
        courseId={selectedCourseIdForRoster}
        isOpen={rosterDialogOpen}
        onClose={() => {
          setRosterDialogOpen(false);
          setSelectedScheduleIdForRoster(null);
          setSelectedCourseIdForRoster(null);
        }}
      />
      </div>
    </Layout>
  );
}

// Edit Student Form Component
function EditStudentForm({ student, onClose }: { student: Student; onClose: () => void }) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const form = useForm<EditStudentFormData>({
    resolver: zodResolver(editStudentSchema),
    defaultValues: {
      email: student.email || "",
      phone: student.phone || "",
      concealedCarryLicenseExpiration: student.concealedCarryLicenseExpiration 
        ? new Date(student.concealedCarryLicenseExpiration).toISOString().split('T')[0] 
        : "",
    },
  });

  const updateStudentMutation = useMutation({
    mutationFn: async (data: EditStudentFormData) => {
      // Clean phone number - remove all non-digit characters
      const cleanedPhone = data.phone ? data.phone.replace(/\D/g, '') : data.phone;

      const updateData = {
        ...data,
        phone: cleanedPhone,
        concealedCarryLicenseExpiration: data.concealedCarryLicenseExpiration 
          ? new Date(data.concealedCarryLicenseExpiration).toISOString() 
          : undefined,
      };
      return await apiRequest("PATCH", `/api/students/${student.id}`, updateData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/students'] });
      toast({
        title: "Student Updated",
        description: `${student.firstName} ${student.lastName}'s information has been updated.`,
      });
      onClose();
    },
    onError: (error) => {
      toast({
        title: "Update Failed", 
        description: error.message || "Failed to update student information.",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: EditStudentFormData) => {
    updateStudentMutation.mutate(data);
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="email"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Email Address</FormLabel>
              <FormControl>
                <Input 
                  type="email"
                  placeholder="student@example.com" 
                  {...field}
                  data-testid="input-student-email"
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="phone"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Phone Number</FormLabel>
              <FormControl>
                <Input 
                  placeholder="(555) 123-4567" 
                  {...field}
                  data-testid="input-student-phone"
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="concealedCarryLicenseExpiration"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Concealed Carry License Expiration</FormLabel>
              <FormControl>
                <Input 
                  type="date" 
                  {...field}
                  data-testid="input-license-expiration"
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="flex justify-end space-x-2">
          <Button 
            type="button" 
            variant="outline" 
            onClick={onClose}
            disabled={updateStudentMutation.isPending}
            data-testid="button-cancel-edit"
          >
            Cancel
          </Button>
          <Button 
            type="submit" 
            disabled={updateStudentMutation.isPending}
            data-testid="button-save-student"
          >
            {updateStudentMutation.isPending ? "Saving..." : "Save Changes"}
          </Button>
        </div>
      </form>
    </Form>
  );
}

export { StudentsPage };