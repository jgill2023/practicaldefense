
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CalendarClock, Clock, Mail, Phone, User } from "lucide-react";
import { format } from "date-fns";
import { StudentProfileModal } from "./StudentProfileModal";

interface Appointment {
  id: string;
  appointmentType: {
    id: string;
    title: string;
    durationMinutes: number;
    price: number;
  };
  student: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
    phone?: string;
  } | null;
  startTime: string;
  endTime: string;
  status: string;
  paymentStatus: string;
}

interface AppointmentsModalProps {
  isOpen: boolean;
  onClose: () => void;
  instructorId: string;
}

export function AppointmentsModal({ isOpen, onClose, instructorId }: AppointmentsModalProps) {
  const [selectedStudentId, setSelectedStudentId] = useState<string | null>(null);
  const [showStudentProfile, setShowStudentProfile] = useState(false);

  const { data: appointments = [], isLoading, isError } = useQuery<Appointment[]>({
    queryKey: [`/api/appointments/instructor/${instructorId}/appointments`],
    enabled: isOpen && !!instructorId,
  });

  const handleAppointmentClick = (appointment: Appointment) => {
    if (appointment.student?.id) {
      setSelectedStudentId(appointment.student.id);
      setShowStudentProfile(true);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'confirmed':
        return 'bg-green-100 text-green-800';
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      case 'cancelled':
        return 'bg-red-100 text-red-800';
      case 'completed':
        return 'bg-blue-100 text-blue-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const formatPhoneNumber = (phone: string | undefined) => {
    if (!phone) return 'N/A';
    const digits = phone.replace(/\D/g, '');
    if (digits.length === 10) {
      return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
    }
    return phone;
  };

  return (
    <>
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <div className="flex items-center gap-3">
              <CalendarClock className="h-5 w-5 text-purple-600" />
              <DialogTitle className="text-xl">Appointments</DialogTitle>
            </div>
            <DialogDescription>
              Click on an appointment to view student details and send messages
            </DialogDescription>
          </DialogHeader>

          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin w-8 h-8 border-2 border-primary border-t-transparent rounded-full" />
              <span className="ml-3 text-muted-foreground">Loading appointments...</span>
            </div>
          ) : isError ? (
            <div className="flex items-center justify-center py-12">
              <div className="text-center">
                <CalendarClock className="h-12 w-12 text-destructive mx-auto mb-4" />
                <h3 className="text-lg font-semibold mb-2">Failed to Load Appointments</h3>
                <p className="text-muted-foreground">Unable to retrieve appointments. Please try again.</p>
              </div>
            </div>
          ) : appointments.length === 0 ? (
            <div className="text-center py-12">
              <CalendarClock className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-medium text-foreground mb-2">No Appointments</h3>
              <p className="text-muted-foreground">You don't have any appointments scheduled yet.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {appointments.map((appointment) => (
                <Card
                  key={appointment.id}
                  className="cursor-pointer hover:bg-muted/50 transition-colors"
                  onClick={() => handleAppointmentClick(appointment)}
                  data-testid={`appointment-card-${appointment.id}`}
                >
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-2">
                          <h4 className="font-semibold text-lg">
                            {appointment.student ? 
                              `${appointment.student.firstName} ${appointment.student.lastName}` : 
                              'Guest Appointment'}
                          </h4>
                          <Badge className={getStatusColor(appointment.status)}>
                            {appointment.status}
                          </Badge>
                        </div>
                        
                        <div className="space-y-1 text-sm text-muted-foreground">
                          <div className="flex items-center gap-2">
                            <CalendarClock className="h-4 w-4" />
                            <span className="font-medium">{appointment.appointmentType.title}</span>
                          </div>
                          
                          <div className="flex items-center gap-2">
                            <Clock className="h-4 w-4" />
                            <span>
                              {format(new Date(appointment.startTime), "MMM d, yyyy 'at' h:mm a")}
                            </span>
                          </div>

                          {appointment.student && (
                            <>
                              <div className="flex items-center gap-2">
                                <Mail className="h-4 w-4" />
                                <span className="truncate">{appointment.student.email}</span>
                              </div>

                              <div className="flex items-center gap-2">
                                <Phone className="h-4 w-4" />
                                <span>{formatPhoneNumber(appointment.student.phone)}</span>
                              </div>
                            </>
                          )}
                        </div>
                      </div>

                      <div className="text-right flex-shrink-0">
                        <div className="text-sm text-muted-foreground mb-1">
                          {appointment.appointmentType.durationMinutes} min
                        </div>
                        <div className="font-semibold text-lg">
                          ${Number(appointment.appointmentType.price).toFixed(2)}
                        </div>
                        <Badge variant="outline" className="mt-1">
                          {appointment.paymentStatus}
                        </Badge>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {selectedStudentId && (
        <StudentProfileModal
          isOpen={showStudentProfile}
          onClose={() => {
            setShowStudentProfile(false);
            setSelectedStudentId(null);
          }}
          studentId={selectedStudentId}
          onEmailClick={(name, email) => {
            // This will be handled by the StudentProfileModal component
          }}
          onSmsClick={(name, phone) => {
            // This will be handled by the StudentProfileModal component
          }}
        />
      )}
    </>
  );
}
