import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, Phone, Mail, Calendar, DollarSign, X, FileText, AlertCircle } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { format } from "date-fns";

interface RosterData {
  current: Array<{
    studentId: string;
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
  }>;
  former: Array<any>;
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
  scheduleId: string | null;
  isOpen: boolean;
  onClose: () => void;
}

export function RosterDialog({ scheduleId, isOpen, onClose }: RosterDialogProps) {
  const { data: rosterData, isLoading, error } = useQuery<RosterData>({
    queryKey: ["/api/instructor/roster", scheduleId],
    queryFn: async () => {
      if (!scheduleId) return null;
      const response = await apiRequest("GET", `/api/instructor/roster?scheduleId=${scheduleId}`);
      return response.json();
    },
    enabled: !!scheduleId && isOpen,
  });

  const getPaymentStatusBadge = (status: string) => {
    switch (status) {
      case 'paid':
        return <Badge variant="default" className="bg-green-500 hover:bg-green-600">Paid</Badge>;
      case 'pending':
        return <Badge variant="secondary" className="bg-yellow-500 hover:bg-yellow-600 text-white">Pending</Badge>;
      case 'failed':
        return <Badge variant="destructive">Failed</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
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

  if (!scheduleId || !isOpen) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Users className="h-5 w-5 text-primary" />
              <DialogTitle className="text-xl">Course Roster</DialogTitle>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={onClose}
              data-testid="button-close-roster"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
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
        ) : !rosterData || rosterData.current.length === 0 ? (
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
              <CardContent>
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
              <CardContent>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Student</TableHead>
                        <TableHead>Contact</TableHead>
                        <TableHead>License Exp.</TableHead>
                        <TableHead>Payment Status</TableHead>
                        <TableHead>Enrollment Status</TableHead>
                        <TableHead>Registered</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {rosterData.current.map((student, index) => (
                        <TableRow key={`${student.studentId}-${index}`} data-testid={`row-student-${student.studentId}`}>
                          <TableCell>
                            <div>
                              <p className="font-medium" data-testid={`text-student-name-${student.studentId}`}>
                                {student.firstName} {student.lastName}
                              </p>
                              <p className="text-sm text-muted-foreground" data-testid={`text-student-email-${student.studentId}`}>
                                {student.email}
                              </p>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex gap-2">
                              {student.phone && (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => window.open(`tel:${student.phone}`, '_self')}
                                  title={`Call ${student.phone}`}
                                  data-testid={`button-call-${student.studentId}`}
                                >
                                  <Phone className="h-4 w-4" />
                                </Button>
                              )}
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => window.open(`mailto:${student.email}?subject=Course%20Information`, '_blank')}
                                title={`Email ${student.email}`}
                                data-testid={`button-email-${student.studentId}`}
                              >
                                <Mail className="h-4 w-4" />
                              </Button>
                            </div>
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
                            {getPaymentStatusBadge(student.paymentStatus)}
                          </TableCell>
                          <TableCell data-testid={`badge-enrollment-${student.studentId}`}>
                            {getEnrollmentStatusBadge(student.enrollmentStatus)}
                          </TableCell>
                          <TableCell>
                            <span className="text-sm" data-testid={`text-registration-date-${student.studentId}`}>
                              {formatDate(student.registrationDate)}
                            </span>
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
      </DialogContent>
    </Dialog>
  );
}