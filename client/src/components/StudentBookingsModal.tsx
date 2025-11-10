
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Calendar, Clock, Mail, MessageSquare, User } from "lucide-react";
import { SmsNotificationModal } from "./SmsNotificationModal";
import { EmailNotificationModal } from "./EmailNotificationModal";

interface StudentBookingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

type Appointment = {
  id: string;
  startTime: string;
  endTime: string;
  status: string;
  appointmentType: {
    title: string;
    description: string | null;
  };
  student: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
    phone: string | null;
  };
};

export function StudentBookingsModal({ isOpen, onClose }: StudentBookingsModalProps) {
  const [selectedStudentForSms, setSelectedStudentForSms] = useState<{
    name: string;
    phone: string;
  } | null>(null);
  const [selectedStudentForEmail, setSelectedStudentForEmail] = useState<{
    name: string;
    email: string;
  } | null>(null);

  const { data: appointments = [], isLoading } = useQuery<Appointment[]>({
    queryKey: ["/api/appointments/instructor/appointments"],
    enabled: isOpen,
    retry: false,
  });

  const formatDateTime = (dateTime: string) => {
    const date = new Date(dateTime);
    return {
      date: date.toLocaleDateString('en-US', {
        weekday: 'short',
        month: 'short',
        day: 'numeric',
        year: 'numeric'
      }),
      time: date.toLocaleTimeString('en-US', {
        hour: 'numeric',
        minute: '2-digit',
        hour12: true
      })
    };
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'confirmed':
        return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
      case 'pending':
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200';
      case 'cancelled':
        return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200';
      case 'completed':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200';
    }
  };

  const handlePhoneClick = (student: { firstName: string; lastName: string; phone: string | null }) => {
    if (student.phone) {
      setSelectedStudentForSms({
        name: `${student.firstName} ${student.lastName}`,
        phone: student.phone
      });
    }
  };

  const handleEmailClick = (student: { firstName: string; lastName: string; email: string }) => {
    setSelectedStudentForEmail({
      name: `${student.firstName} ${student.lastName}`,
      email: student.email
    });
  };

  return (
    <>
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Student Bookings
            </DialogTitle>
            <DialogDescription>
              View and manage all student appointments
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {isLoading ? (
              <div className="text-center py-8">
                <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full mx-auto mb-4" />
                <p className="text-muted-foreground">Loading appointments...</p>
              </div>
            ) : appointments.length === 0 ? (
              <div className="text-center py-12">
                <Calendar className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">No bookings found</p>
              </div>
            ) : (
              appointments.map((appointment) => {
                const { date, time } = formatDateTime(appointment.startTime);
                const endTime = formatDateTime(appointment.endTime).time;
                const studentName = `${appointment.student.firstName} ${appointment.student.lastName}`;

                return (
                  <Card key={appointment.id} className="hover:shadow-md transition-shadow">
                    <CardContent className="pt-6">
                      <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
                        {/* Left Section - Student & Appointment Info */}
                        <div className="flex-1 space-y-3">
                          {/* Student Name */}
                          <div className="flex items-center gap-2">
                            <User className="h-4 w-4 text-muted-foreground" />
                            <span className="font-semibold text-lg">{studentName}</span>
                            <Badge className={getStatusColor(appointment.status)}>
                              {appointment.status}
                            </Badge>
                          </div>

                          {/* Appointment Type */}
                          <div className="pl-6">
                            <p className="font-medium text-primary">
                              {appointment.appointmentType.title}
                            </p>
                            {appointment.appointmentType.description && (
                              <p className="text-sm text-muted-foreground">
                                {appointment.appointmentType.description}
                              </p>
                            )}
                          </div>

                          {/* Date & Time */}
                          <div className="flex items-center gap-4 pl-6 text-sm">
                            <div className="flex items-center gap-1">
                              <Calendar className="h-3 w-3 text-muted-foreground" />
                              <span>{date}</span>
                            </div>
                            <div className="flex items-center gap-1">
                              <Clock className="h-3 w-3 text-muted-foreground" />
                              <span>{time} - {endTime}</span>
                            </div>
                          </div>

                          {/* Contact Info */}
                          <div className="pl-6 space-y-1">
                            {/* Phone */}
                            {appointment.student.phone ? (
                              <button
                                onClick={() => handlePhoneClick(appointment.student)}
                                className="flex items-center gap-2 text-sm hover:text-primary transition-colors group"
                                data-testid={`button-phone-${appointment.id}`}
                              >
                                <MessageSquare className="h-3 w-3 text-muted-foreground group-hover:text-primary" />
                                <span className="underline">{appointment.student.phone}</span>
                              </button>
                            ) : (
                              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                <MessageSquare className="h-3 w-3" />
                                <span>No phone number</span>
                              </div>
                            )}

                            {/* Email */}
                            <button
                              onClick={() => handleEmailClick(appointment.student)}
                              className="flex items-center gap-2 text-sm hover:text-primary transition-colors group"
                              data-testid={`button-email-${appointment.id}`}
                            >
                              <Mail className="h-3 w-3 text-muted-foreground group-hover:text-primary" />
                              <span className="underline">{appointment.student.email}</span>
                            </button>
                          </div>
                        </div>

                        {/* Right Section - Quick Actions */}
                        <div className="flex md:flex-col gap-2">
                          {appointment.student.phone && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handlePhoneClick(appointment.student)}
                              className="flex items-center gap-2"
                              data-testid={`button-sms-${appointment.id}`}
                            >
                              <MessageSquare className="h-4 w-4" />
                              <span className="hidden md:inline">SMS</span>
                            </Button>
                          )}
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleEmailClick(appointment.student)}
                            className="flex items-center gap-2"
                            data-testid={`button-email-action-${appointment.id}`}
                          >
                            <Mail className="h-4 w-4" />
                            <span className="hidden md:inline">Email</span>
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* SMS Notification Modal */}
      {selectedStudentForSms && (
        <SmsNotificationModal
          isOpen={!!selectedStudentForSms}
          onClose={() => setSelectedStudentForSms(null)}
          studentName={selectedStudentForSms.name}
          phoneNumber={selectedStudentForSms.phone}
        />
      )}

      {/* Email Notification Modal */}
      {selectedStudentForEmail && (
        <EmailNotificationModal
          isOpen={!!selectedStudentForEmail}
          onClose={() => setSelectedStudentForEmail(null)}
          studentName={selectedStudentForEmail.name}
          emailAddress={selectedStudentForEmail.email}
        />
      )}
    </>
  );
}
