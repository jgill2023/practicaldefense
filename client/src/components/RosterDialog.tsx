import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, Phone, Mail, Calendar, DollarSign, X, FileText, AlertCircle, Award, RotateCcw, MessageSquare, FileSignature } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { format } from "date-fns";
import { SmsNotificationModal } from "./SmsNotificationModal";
import { EmailNotificationModal } from "./EmailNotificationModal";
import { PaymentDetailsModal } from "./PaymentDetailsModal";
import { PaymentReminderModal } from "./PaymentReminderModal";
import { RescheduleModal } from "./RescheduleModal";
import { EnrollmentFeedbackModal } from "./EnrollmentFeedbackModal";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";

interface RosterData {
  current: Array<{
    studentId: string;
    enrollmentId: string;
    firstName: string;
    lastName: string;
    email: string;
    phone: string | null;
    dateOfBirth: string | null;
    licenseExpiration: string | null;
    courseTitle: string;
    courseAbbreviation: string;
    scheduleDate: string;
    scheduleStartTime: string;
    scheduleEndTime: string;
    paymentStatus: string;
    enrollmentStatus: string;
    category: string;
    registrationDate: string;
    location: string;
    remainingBalance?: number;
    certificateIssued?: boolean;
    waiverStatus?: 'signed' | 'pending' | 'not_started';
    formStatus?: 'completed' | 'incomplete' | 'not_started';
    cancellationReason?: string;
  }>;
  former: Array<any>;
  held: Array<any>;
  summary: {
    totalEnrolled: number;
    paidStudents: number;
    pendingPayments: number;
    totalRevenue: number;
    courseTitle: string;
    scheduleDate: string;
    scheduleTime: string;
    location: string;
  };
}

interface RosterDialogProps {
  scheduleId?: string | null;
  courseId?: string | null;
  isOpen: boolean;
  onClose: () => void;
}

export function RosterDialog({ scheduleId, courseId, isOpen, onClose }: RosterDialogProps) {
  // Modal states
  const [smsModal, setSmsModal] = useState<{ isOpen: boolean; studentName: string; phoneNumber: string }>({ isOpen: false, studentName: "", phoneNumber: "" });
  const [emailModal, setEmailModal] = useState<{ isOpen: boolean; studentName: string; emailAddress: string }>({ isOpen: false, studentName: "", emailAddress: "" });
  const [paymentModal, setPaymentModal] = useState<{ isOpen: boolean; studentId: string; studentName: string; enrollmentId: string }>({ isOpen: false, studentId: "", studentName: "", enrollmentId: "" });
  const [reminderModal, setReminderModal] = useState<{ isOpen: boolean; studentName: string; studentEmail: string; studentPhone?: string; remainingBalance: number; courseName: string; scheduleDate: string }>({ isOpen: false, studentName: "", studentEmail: "", remainingBalance: 0, courseName: "", scheduleDate: "" });
  const [rescheduleModal, setRescheduleModal] = useState<{ isOpen: boolean; studentId: string; studentName: string; enrollmentId: string; currentCourse: string; currentScheduleDate: string }>({ isOpen: false, studentId: "", studentName: "", enrollmentId: "", currentCourse: "", currentScheduleDate: "" });
  const [formReminderModal, setFormReminderModal] = useState({
    isOpen: false,
    studentName: '',
    studentEmail: '',
    studentPhone: '',
    reminderType: '' as 'waiver' | 'form'
  });
  const [feedbackModal, setFeedbackModal] = useState<{ isOpen: boolean; enrollmentId: string; studentName: string }>({ isOpen: false, enrollmentId: "", studentName: "" });


  const { data: rosterData, isLoading, error } = useQuery<RosterData>({
    queryKey: ["/api/instructor/roster", scheduleId, courseId],
    queryFn: async () => {
      if (!scheduleId && !courseId) return null;
      const params = scheduleId ? `scheduleId=${scheduleId}` : `courseId=${courseId}`;
      return await apiRequest("GET", `/api/instructor/roster?${params}`);
    },
    enabled: (!!scheduleId || !!courseId) && isOpen,
  });

  const getPaymentStatusBadge = (status: string, remainingBalance?: number, onClick?: () => void) => {
    const className = onClick ? "cursor-pointer hover:opacity-80" : "";

    switch (status) {
      case 'paid':
        return (
          <Badge
            variant="default"
            className={`bg-green-500 hover:bg-green-600 ${className}`}
            onClick={onClick}
          >
            Paid
          </Badge>
        );
      case 'partial':
        return (
          <Badge
            variant="secondary"
            className={`bg-yellow-500 hover:bg-yellow-600 text-white ${className}`}
            onClick={onClick}
          >
            Partial (${remainingBalance ? `$${remainingBalance} due` : 'balance due'})
          </Badge>
        );
      case 'pending':
        return (
          <Badge
            variant="secondary"
            className={`bg-orange-500 hover:bg-orange-600 text-white ${className}`}
            onClick={onClick}
          >
            Pending
          </Badge>
        );
      case 'failed':
        return (
          <Badge
            variant="destructive"
            className={className}
            onClick={onClick}
          >
            Failed
          </Badge>
        );
      default:
        return (
          <Badge
            variant="outline"
            className={className}
            onClick={onClick}
          >
            {status}
          </Badge>
        );
    }
  };

  const handleSmsClick = (studentName: string, phoneNumber: string) => {
    setSmsModal({ isOpen: true, studentName, phoneNumber });
  };

  const handleEmailClick = (studentName: string, emailAddress: string) => {
    setEmailModal({ isOpen: true, studentName, emailAddress });
  };

  const handlePaymentClick = (studentId: string, studentName: string, enrollmentId: string) => {
    setPaymentModal({ isOpen: true, studentId, studentName, enrollmentId });
  };

  const handleReminderClick = (student: any) => {
    setReminderModal({
      isOpen: true,
      studentName: `${student.firstName} ${student.lastName}`,
      studentEmail: student.email,
      studentPhone: student.phone,
      remainingBalance: student.remainingBalance || 0,
      courseName: student.courseTitle,
      scheduleDate: formatDate(student.scheduleDate)
    });
  };

  const handleFormReminderClick = (student: any, reminderType: 'waiver' | 'form') => {
    setFormReminderModal({
      isOpen: true,
      studentName: `${student.firstName} ${student.lastName}`,
      studentEmail: student.email,
      studentPhone: student.phone,
      reminderType
    });
  };

  const handleRescheduleClick = (student: any) => {
    setRescheduleModal({
      isOpen: true,
      studentId: student.studentId,
      studentName: `${student.firstName} ${student.lastName}`,
      enrollmentId: student.enrollmentId,
      currentCourse: student.courseTitle,
      currentScheduleDate: student.scheduleDate
    });
  };

  const getEnrollmentStatusBadge = (status: string) => {
    switch (status) {
      case 'confirmed':
        return <Badge variant="default" className="bg-blue-500 hover:bg-blue-600">Confirmed</Badge>;
      case 'pending':
        return <Badge variant="secondary">Pending</Badge>;
      case 'cancelled':
        return <Badge variant="destructive">Cancelled</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const formatDate = (dateString: string) => {
    try {
      return format(new Date(dateString), "MMM d, yyyy");
    } catch {
      return dateString;
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  };

  if ((!scheduleId && !courseId) || !isOpen) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-[95vw] sm:max-w-4xl max-h-[90vh] overflow-y-auto p-4 sm:p-6 pr-20">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Course Roster
          </DialogTitle>
        </DialogHeader>

        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin w-8 h-8 border-2 border-primary border-t-transparent rounded-full" />
            <span className="ml-3 text-muted-foreground">Loading roster...</span>
          </div>
        ) : error ? (
          <div className="flex items-center justify-center py-12">
            <div className="text-center">
              <AlertCircle className="h-12 w-12 text-destructive mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">Failed to Load Roster</h3>
              <p className="text-muted-foreground">Unable to retrieve roster data. Please try again.</p>
            </div>
          </div>
        ) : !rosterData ? (
          <div className="flex items-center justify-center py-12">
            <div className="text-center">
              <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">No Data Available</h3>
              <p className="text-muted-foreground">Unable to load roster data.</p>
            </div>
          </div>
        ) : rosterData.current.length === 0 ? (
          <div className="flex items-center justify-center py-12">
            <div className="text-center">
              <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">No Students Enrolled</h3>
              <p className="text-muted-foreground">This course schedule doesn't have any enrolled students yet.</p>
            </div>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Course Summary */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <FileText className="h-5 w-5" />
                  Course Information
                </CardTitle>
              </CardHeader>
              <CardContent className="pr-4">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Course</p>
                    <p className="text-lg font-semibold" data-testid="text-course-title">
                      {rosterData.summary.courseTitle}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Schedule</p>
                    <p className="font-medium" data-testid="text-schedule-info">
                      {formatDate(rosterData.summary.scheduleDate)} at {rosterData.summary.scheduleTime}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Location</p>
                    <p className="font-medium" data-testid="text-location">
                      {rosterData.summary.location}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Total Revenue</p>
                    <p className="text-lg font-bold text-green-600" data-testid="text-revenue">
                      {formatCurrency(rosterData.summary.totalRevenue)}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Enrollment Summary */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center">
                    <Users className="h-8 w-8 text-blue-500 mr-3" />
                    <div>
                      <p className="text-2xl font-bold" data-testid="text-total-enrolled">
                        {rosterData.summary.totalEnrolled}
                      </p>
                      <p className="text-sm text-muted-foreground">Total Enrolled</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center">
                    <DollarSign className="h-8 w-8 text-green-500 mr-3" />
                    <div>
                      <p className="text-2xl font-bold" data-testid="text-paid-students">
                        {rosterData.summary.paidStudents}
                      </p>
                      <p className="text-sm text-muted-foreground">Paid Students</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center">
                    <AlertCircle className="h-8 w-8 text-yellow-500 mr-3" />
                    <div>
                      <p className="text-2xl font-bold" data-testid="text-pending-payments">
                        {rosterData.summary.pendingPayments}
                      </p>
                      <p className="text-sm text-muted-foreground">Pending Payments</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Student Roster Table */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Student Roster</CardTitle>
              </CardHeader>
              <CardContent className="pr-4">
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="text-left">Student Name</TableHead>
                        <TableHead className="text-left">Phone</TableHead>
                        <TableHead className="text-left">Email</TableHead>
                        <TableHead className="text-center">License Exp.</TableHead>
                        <TableHead className="text-center">Payment Status</TableHead>
                        <TableHead className="text-center">Waiver</TableHead>
                        <TableHead className="text-center">Forms</TableHead>
                        <TableHead className="text-center">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {rosterData.current.map((student, index) => (
                        <TableRow key={`${student.studentId}-${index}`} data-testid={`row-student-${student.studentId}`}>
                          <TableCell>
                            <p className="font-medium" data-testid={`text-student-name-${student.studentId}`}>
                              {student.firstName} {student.lastName}
                            </p>
                          </TableCell>
                          <TableCell>
                            {student.phone ? (
                              <Button
                                variant="link"
                                size="sm"
                                className="p-0 h-auto font-normal text-blue-600 hover:text-blue-800"
                                onClick={() => handleSmsClick(`${student.firstName} ${student.lastName}`, student.phone!)}
                                title={`Send SMS to ${student.phone}`}
                                data-testid={`link-phone-${student.studentId}`}
                              >
                                {student.phone}
                              </Button>
                            ) : (
                              <span className="text-sm text-muted-foreground">Not provided</span>
                            )}
                          </TableCell>
                          <TableCell>
                            <Button
                              variant="link"
                              size="sm"
                              className="p-0 h-auto font-normal text-blue-600 hover:text-blue-800"
                              onClick={() => handleEmailClick(`${student.firstName} ${student.lastName}`, student.email)}
                              title={`Send email to ${student.email}`}
                              data-testid={`link-email-${student.studentId}`}
                            >
                              {student.email}
                            </Button>
                          </TableCell>
                          <TableCell>
                            {student.licenseExpiration ? (
                              <span className="text-sm" data-testid={`text-license-exp-${student.studentId}`}>
                                {formatDate(student.licenseExpiration)}
                              </span>
                            ) : (
                              <span className="text-sm text-muted-foreground">Not provided</span>
                            )}
                          </TableCell>
                          <TableCell data-testid={`badge-payment-${student.studentId}`}>
                            {getPaymentStatusBadge(
                              student.paymentStatus,
                              student.remainingBalance,
                              () => handlePaymentClick(student.studentId, `${student.firstName} ${student.lastName}`, student.enrollmentId)
                            )}
                            {student.paymentStatus === 'partial' && student.remainingBalance && student.remainingBalance > 0 && (
                              <Button
                                variant="outline"
                                size="sm"
                                className="ml-2 h-8 w-8 border-orange-200 bg-orange-50 text-orange-600 hover:bg-orange-100 hover:border-orange-300"
                                onClick={() => handleReminderClick(student)}
                                title="Send payment reminder"
                                data-testid={`button-payment-reminder-${student.studentId}`}
                              >
                                <MessageSquare className="h-4 w-4" />
                              </Button>
                            )}
                          </TableCell>

                          {/* Waiver Status Icon */}
                          <TableCell className="text-center">
                            {(() => {
                              const waiverStatus = student.waiverStatus || 'not_started';
                              const isComplete = waiverStatus === 'signed';
                              const isIncomplete = waiverStatus === 'pending';

                              if (isComplete) {
                                // Show green checkmark for signed waivers - not clickable
                                return (
                                  <div className="inline-flex items-center justify-center h-8 w-8" data-testid={`waiver-status-${student.studentId}`}>
                                    <svg className="h-5 w-5 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                                    </svg>
                                  </div>
                                );
                              }

                              return (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-8 w-8 p-0"
                                  onClick={() => handleFormReminderClick(student, 'waiver')}
                                  data-testid={`waiver-status-${student.studentId}`}
                                >
                                  {isIncomplete ? (
                                    <FileSignature className="h-5 w-5 text-gray-400" />
                                  ) : (
                                    <FileSignature className="h-5 w-5 text-red-500" />
                                  )}
                                </Button>
                              );
                            })()}
                          </TableCell>

                          {/* Information Form Status Icon */}
                          <TableCell className="text-center">
                            {(() => {
                              const formStatus = student.formStatus || 'not_started';
                              const isComplete = formStatus === 'completed';
                              const isIncomplete = formStatus === 'incomplete';

                              if (isComplete) {
                                // Show green checkmark for completed forms - not clickable
                                return (
                                  <div className="inline-flex items-center justify-center h-8 w-8" data-testid={`form-status-${student.studentId}`}>
                                    <svg className="h-5 w-5 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                                    </svg>
                                  </div>
                                );
                              }

                              return (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-8 w-8 p-0"
                                  onClick={() => handleFormReminderClick(student, 'form')}
                                  data-testid={`form-status-${student.studentId}`}
                                >
                                  {isIncomplete ? (
                                    <FileText className="h-5 w-5 text-gray-400" />
                                  ) : (
                                    <FileText className="h-5 w-5 text-red-500" />
                                  )}
                                </Button>
                              );
                            })()}
                          </TableCell>

                          <TableCell className="text-center">
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="outline" size="sm" className="h-8 w-8 p-0">
                                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <circle cx="12" cy="12" r="1" />
                                    <circle cx="12" cy="5" r="1" />
                                    <circle cx="12" cy="19" r="1" />
                                  </svg>
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem
                                  onClick={() => setFeedbackModal({ isOpen: true, enrollmentId: student.enrollmentId, studentName: `${student.firstName} ${student.lastName}` })}
                                  className="group"
                                  data-testid={`dropdown-feedback-${student.studentId}`}
                                >
                                  <FileText className="mr-2 h-4 w-4 text-muted-foreground group-hover:text-primary" />
                                  Feedback & Notes
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  onClick={() => alert('Certificate management coming soon')}
                                  className="group"
                                  data-testid={`dropdown-certificate-${student.studentId}`}
                                >
                                  <Award className="mr-2 h-4 w-4 text-muted-foreground group-hover:text-primary" />
                                  Issue/View Certificate
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  onClick={() => handleRescheduleClick(student)}
                                  className="group"
                                  data-testid={`dropdown-reschedule-${student.studentId}`}
                                >
                                  <RotateCcw className="mr-2 h-4 w-4 text-muted-foreground group-hover:text-primary" />
                                  Reschedule Student
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* All Modals */}
        <SmsNotificationModal
          isOpen={smsModal.isOpen}
          onClose={() => setSmsModal({ ...smsModal, isOpen: false })}
          studentName={smsModal.studentName}
          phoneNumber={smsModal.phoneNumber}
        />

        <EmailNotificationModal
          isOpen={emailModal.isOpen}
          onClose={() => setEmailModal({ ...emailModal, isOpen: false })}
          studentName={emailModal.studentName}
          emailAddress={emailModal.emailAddress}
        />

        <PaymentDetailsModal
          isOpen={paymentModal.isOpen}
          onClose={() => setPaymentModal({ ...paymentModal, isOpen: false })}
          studentId={paymentModal.studentId}
          studentName={paymentModal.studentName}
          enrollmentId={paymentModal.enrollmentId}
        />

        <PaymentReminderModal
          isOpen={reminderModal.isOpen}
          onClose={() => setReminderModal({ ...reminderModal, isOpen: false })}
          studentName={reminderModal.studentName}
          studentEmail={reminderModal.studentEmail}
          studentPhone={reminderModal.studentPhone}
          remainingBalance={reminderModal.remainingBalance}
          courseName={reminderModal.courseName}
          scheduleDate={reminderModal.scheduleDate}
        />

        {/* Form/Waiver Reminder Modal */}
        <Dialog open={formReminderModal.isOpen} onOpenChange={(open) => !open && setFormReminderModal({ ...formReminderModal, isOpen: false })}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                Send {formReminderModal.reminderType === 'waiver' ? 'Waiver' : 'Information Form'} Reminder
              </DialogTitle>
            </DialogHeader>

            <div className="space-y-4">
              {/* Student Info */}
              <div className="p-3 bg-muted rounded-lg">
                <p className="font-medium">{formReminderModal.studentName}</p>
                <p className="text-sm text-muted-foreground">{formReminderModal.studentEmail}</p>
                {formReminderModal.studentPhone && (
                  <p className="text-sm text-muted-foreground">{formReminderModal.studentPhone}</p>
                )}
              </div>

              {/* Reminder Type */}
              <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  {formReminderModal.reminderType === 'waiver' ? (
                    <FileSignature className="h-5 w-5 text-yellow-600" />
                  ) : (
                    <FileText className="h-5 w-5 text-yellow-600" />
                  )}
                  <p className="font-medium text-yellow-800">
                    {formReminderModal.reminderType === 'waiver'
                      ? 'Student has not completed the waiver'
                      : 'Student has not completed the information form'}
                  </p>
                </div>
                <p className="text-sm text-yellow-700">
                  Send a reminder to complete the required {formReminderModal.reminderType === 'waiver' ? 'waiver' : 'information form'}.
                </p>
              </div>

              {/* Send Options */}
              <div className="flex flex-col sm:flex-row gap-3">
                <Button
                  className="flex-1"
                  onClick={() => {
                    setEmailModal({
                      isOpen: true,
                      studentName: formReminderModal.studentName,
                      emailAddress: formReminderModal.studentEmail
                    });
                    setFormReminderModal({ ...formReminderModal, isOpen: false });
                  }}
                  data-testid="button-send-email-reminder"
                >
                  <Mail className="h-4 w-4 mr-2" />
                  Send Email Reminder
                </Button>

                {formReminderModal.studentPhone && (
                  <Button
                    className="flex-1"
                    variant="outline"
                    onClick={() => {
                      setSmsModal({
                        isOpen: true,
                        studentName: formReminderModal.studentName,
                        phoneNumber: formReminderModal.studentPhone
                      });
                      setFormReminderModal({ ...formReminderModal, isOpen: false });
                    }}
                    data-testid="button-send-sms-reminder"
                  >
                    <MessageSquare className="h-4 w-4 mr-2" />
                    Send SMS Reminder
                  </Button>
                )}
              </div>

              {/* Close Button */}
              <div className="flex justify-end pt-2">
                <Button
                  variant="outline"
                  onClick={() => setFormReminderModal({ ...formReminderModal, isOpen: false })}
                  data-testid="button-cancel-form-reminder"
                >
                  Cancel
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        <RescheduleModal
          isOpen={rescheduleModal.isOpen}
          onClose={() => setRescheduleModal({ ...rescheduleModal, isOpen: false })}
          studentId={rescheduleModal.studentId}
          studentName={rescheduleModal.studentName}
          enrollmentId={rescheduleModal.enrollmentId}
          currentCourse={rescheduleModal.currentCourse}
          currentScheduleDate={rescheduleModal.currentScheduleDate}
        />

        <EnrollmentFeedbackModal
          isOpen={feedbackModal.isOpen}
          onClose={() => setFeedbackModal({ ...feedbackModal, isOpen: false })}
          enrollmentId={feedbackModal.enrollmentId}
          userRole="instructor"
          isInstructor={true}
        />
      </DialogContent>
    </Dialog>
  );
}