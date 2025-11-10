import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Calendar } from "@/components/ui/calendar";
import { isUnauthorizedError } from "@/lib/authUtils";
import { Clock, DollarSign, CheckCircle, X } from "lucide-react";
import type { AppointmentType } from "@shared/schema";

type TimeSlot = {
  startTime: string; // ISO string from API
  endTime: string; // ISO string from API
  requiresApproval: boolean;
  isAvailable?: boolean;
};

// Helper to format ISO time to 12-hour format
const formatTimeFromISO = (isoString: string): string => {
  const date = new Date(isoString);
  return date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
};

type DayAvailability = {
  [date: string]: boolean;
};

interface BookingModalProps {
  appointmentType: AppointmentType | null;
  instructorId: string;
  open: boolean;
  onClose: () => void;
}

export function BookingModal({ appointmentType, instructorId, open, onClose }: BookingModalProps) {
  const { user, isAuthenticated } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [selectedDate, setSelectedDate] = useState<Date | undefined>(undefined);
  const [selectedSlot, setSelectedSlot] = useState<TimeSlot | null>(null);
  const [currentMonth, setCurrentMonth] = useState<Date>(new Date());

  // Reset state when modal opens/closes
  useEffect(() => {
    if (!open) {
      setSelectedDate(undefined);
      setSelectedSlot(null);
    }
  }, [open]);

  const formatLocalDate = (date: Date): string => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  // Get start and end of current displayed month
  const getMonthRange = (month: Date) => {
    const start = new Date(month.getFullYear(), month.getMonth(), 1);
    const end = new Date(month.getFullYear(), month.getMonth() + 1, 0);
    return { start, end };
  };

  const { start: monthStart, end: monthEnd } = getMonthRange(currentMonth);

  // Fetch all available slots for the month to determine day availability
  const { data: monthSlots = [] } = useQuery<any[]>({
    queryKey: ["/api/appointments/available-slots", instructorId, appointmentType?.id, formatLocalDate(monthStart), formatLocalDate(monthEnd)],
    queryFn: async ({ queryKey, signal }) => {
      const [, instructorIdParam, typeIdParam, startDate, endDate] = queryKey;
      if (!typeIdParam || !startDate || !endDate) return [];
      const response = await fetch(
        `/api/appointments/available-slots?instructorId=${instructorIdParam}&appointmentTypeId=${typeIdParam}&startDate=${startDate}&endDate=${endDate}`,
        { credentials: "include", signal }
      );
      if (!response.ok) return [];
      return response.json();
    },
    enabled: isAuthenticated && !!instructorId && !!appointmentType,
    retry: false,
  });

  // Build day availability map
  const dayAvailability: DayAvailability = {};
  monthSlots.forEach((slot: any) => {
    const slotDate = new Date(slot.startTime);
    const dateKey = formatLocalDate(slotDate);
    dayAvailability[dateKey] = true;
  });

  // Fetch available slots for selected date
  const { data: availableSlots = [], isLoading: slotsLoading } = useQuery<TimeSlot[]>({
    queryKey: ["/api/appointments/available-slots-day", instructorId, appointmentType?.id, selectedDate ? selectedDate.getTime() : null],
    queryFn: async ({ queryKey, signal }) => {
      const [, instructorIdParam, typeIdParam, dateTimestamp] = queryKey;
      if (!typeIdParam || !dateTimestamp || !selectedDate) return [];
      
      // Use the actual selectedDate object to avoid timezone issues
      const dayStart = new Date(selectedDate);
      dayStart.setHours(0, 0, 0, 0);
      
      const dayEnd = new Date(selectedDate);
      dayEnd.setHours(23, 59, 59, 999);
      
      const response = await fetch(
        `/api/appointments/available-slots?instructorId=${instructorIdParam}&appointmentTypeId=${typeIdParam}&startDate=${formatLocalDate(dayStart)}&endDate=${formatLocalDate(dayEnd)}`,
        { credentials: "include", signal }
      );
      if (!response.ok) {
        throw new Error(`${response.status}: ${response.statusText}`);
      }
      return response.json();
    },
    enabled: isAuthenticated && !!instructorId && !!appointmentType && !!selectedDate,
    retry: false,
  });

  const bookAppointmentMutation = useMutation({
    mutationFn: async () => {
      if (!appointmentType || !selectedSlot) {
        throw new Error("Missing required fields");
      }

      // The selectedSlot already contains ISO timestamps from the API
      // Just use them directly
      const body = {
        instructorId,
        appointmentTypeId: appointmentType.id,
        startTime: selectedSlot.startTime,
        endTime: selectedSlot.endTime,
      };

      const data = await apiRequest("POST", "/api/appointments/book", body);
      return data;
    },
    onSuccess: (data) => {
      if (data.appointment) {
        toast({
          title: appointmentType?.requiresApproval ? "Booking Requested" : "Booking Confirmed",
          description: appointmentType?.requiresApproval
            ? "Your appointment request has been submitted and is pending instructor approval."
            : "Your appointment has been confirmed! You'll receive a confirmation email shortly.",
        });

        // Invalidate all appointment-related queries
        queryClient.invalidateQueries({ queryKey: ["/api/appointments/my-appointments"] });
        queryClient.invalidateQueries({ 
          predicate: (query) => {
            const key = query.queryKey[0];
            return typeof key === 'string' && key.startsWith('/api/appointments/available-slots');
          }
        });
        onClose();
      }
    },
    onError: (error: any) => {
      if (isUnauthorizedError(error)) {
        toast({
          title: "Unauthorized",
          description: "Session expired. Redirecting to login...",
          variant: "destructive",
        });
        setTimeout(() => window.location.href = "/api/login", 500);
        return;
      }
      toast({
        title: "Booking Failed",
        description: error?.message || "Failed to book appointment. Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleBooking = () => {
    bookAppointmentMutation.mutate();
  };

  if (!appointmentType) return null;

  // Show login prompt for unauthenticated users
  if (!isAuthenticated) {
    return (
      <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
        <DialogContent className="max-w-md" data-testid="booking-modal-login-required">
          <DialogHeader>
            <DialogTitle>Login Required</DialogTitle>
          </DialogHeader>
          <div className="text-center py-8">
            <p className="text-muted-foreground mb-6">
              Please log in to book an appointment
            </p>
            <div className="space-y-3">
              <Button
                className="w-full bg-black text-white hover:bg-black/90"
                onClick={() => window.location.href = '/api/login'}
                data-testid="button-login"
              >
                Log In
              </Button>
              <Button
                variant="outline"
                className="w-full"
                onClick={onClose}
                data-testid="button-cancel"
              >
                Cancel
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto" data-testid="booking-modal">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle className="text-2xl">{appointmentType.title}</DialogTitle>
            <Button
              variant="ghost"
              size="icon"
              onClick={onClose}
              data-testid="button-close-modal"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
          <div className="flex items-center gap-4 text-sm text-muted-foreground mt-2">
            <div className="flex items-center gap-1">
              <Clock className="h-4 w-4" />
              <span>{appointmentType.durationMinutes} minutes</span>
            </div>
            <div className="flex items-center gap-1">
              <DollarSign className="h-4 w-4" />
              <span className="font-semibold">${Number(appointmentType.price).toFixed(2)}</span>
            </div>
            {appointmentType.requiresApproval && (
              <Badge variant="outline" className="text-xs">Approval Required</Badge>
            )}
          </div>
        </DialogHeader>

        <div className="grid md:grid-cols-2 gap-6 mt-4">
          {/* Left Column - Calendar */}
          <div className="border rounded-lg p-4">
            <h3 className="font-semibold mb-4">Select a Date</h3>
            <style>{`
              .booking-calendar {
                width: 100%;
              }
              .booking-calendar .rdp-months {
                width: 100%;
              }
              .booking-calendar .rdp-month {
                width: 100%;
              }
              .booking-calendar .rdp-caption {
                display: flex;
                justify-content: center;
                padding: 0;
                margin-bottom: 1rem;
              }
              .booking-calendar .rdp-caption_label {
                font-size: 1rem;
                font-weight: 600;
              }
              .booking-calendar .rdp-nav {
                position: absolute;
                width: 100%;
                display: flex;
                justify-content: space-between;
              }
              .booking-calendar .rdp-nav_button {
                width: 2rem;
                height: 2rem;
              }
              .booking-calendar .rdp-table {
                width: 100%;
                max-width: 100%;
              }
              .booking-calendar .rdp-head_cell {
                font-size: 0.75rem;
                font-weight: 600;
                text-align: center;
                padding: 0.25rem;
              }
              .booking-calendar .rdp-cell {
                text-align: center;
                padding: 2px;
              }
              .booking-calendar .rdp-day {
                width: 2.5rem;
                height: 2.5rem;
                font-size: 0.875rem;
                border-radius: 0.375rem;
              }
              .booking-calendar .rdp-day_button {
                position: relative;
                width: 100%;
                height: 100%;
              }
              .booking-calendar .rdp-day_button.day-available {
                border: 2px solid #10b981;
                border-radius: 50%;
              }
              .booking-calendar .rdp-day_button.day-unavailable {
                opacity: 0.4;
                position: relative;
              }
              .booking-calendar .rdp-day_button.day-unavailable::before {
                content: '';
                position: absolute;
                top: 10%;
                left: 10%;
                width: 80%;
                height: 80%;
                background: linear-gradient(to top right, transparent 0%, transparent calc(50% - 1px), #ef4444 calc(50% - 1px), #ef4444 calc(50% + 1px), transparent calc(50% + 1px), transparent 100%);
              }
              .booking-calendar .rdp-day_selected {
                background-color: hsl(var(--primary));
                color: hsl(var(--primary-foreground));
              }
              .booking-calendar .rdp-day_today {
                font-weight: 600;
              }
            `}</style>
            <Calendar
              mode="single"
              selected={selectedDate}
              onSelect={setSelectedDate}
              onMonthChange={setCurrentMonth}
              disabled={(date) => {
                const today = new Date();
                today.setHours(0, 0, 0, 0);
                return date < today;
              }}
              modifiers={{
                available: (date) => {
                  const dateKey = formatLocalDate(date);
                  return dayAvailability[dateKey] === true;
                },
                unavailable: (date) => {
                  const today = new Date();
                  today.setHours(0, 0, 0, 0);
                  if (date < today) return false;
                  const dateKey = formatLocalDate(date);
                  return dayAvailability[dateKey] !== true;
                },
              }}
              modifiersClassNames={{
                available: "day-available",
                unavailable: "day-unavailable",
              }}
              className="booking-calendar"
              data-testid="booking-calendar"
            />
            <div className="mt-4 space-y-2 text-xs text-muted-foreground">
              <div className="flex items-center gap-2">
                <div className="flex items-end justify-center w-6 h-6 border rounded">
                  <div className="w-1 h-1 rounded-full bg-green-500 mb-0.5"></div>
                </div>
                <span>Available slots</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="flex items-center justify-center w-6 h-6 border rounded opacity-40 relative">
                  <span>15</span>
                  <div className="absolute top-1/2 left-1 right-1 h-px bg-red-500"></div>
                </div>
                <span>No availability</span>
              </div>
            </div>
          </div>

          {/* Right Column - Time Slots */}
          <div className="border rounded-lg p-4">
            <h3 className="font-semibold mb-4">
              {selectedDate ? `Available Times for ${selectedDate.toLocaleDateString()}` : "Select a date to see available times"}
            </h3>
            
            {!selectedDate ? (
              <div className="text-center text-muted-foreground py-12">
                <Clock className="mx-auto h-12 w-12 mb-4 opacity-50" />
                <p>Please select a date from the calendar</p>
              </div>
            ) : slotsLoading ? (
              <div className="space-y-2">
                {[1, 2, 3].map(i => (
                  <div key={i} className="h-12 bg-muted animate-pulse rounded"></div>
                ))}
              </div>
            ) : availableSlots.length === 0 ? (
              <div className="text-center text-muted-foreground py-12">
                <X className="mx-auto h-12 w-12 mb-4 opacity-50" />
                <p>No available times for this date</p>
              </div>
            ) : (
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {availableSlots
                  .filter(slot => slot.isAvailable !== false)
                  .map((slot, index) => (
                    <Button
                      key={index}
                      variant={selectedSlot === slot ? "default" : "outline"}
                      className="w-full justify-start"
                      onClick={() => setSelectedSlot(slot)}
                      data-testid={`time-slot-${index}`}
                    >
                      <Clock className="h-4 w-4 mr-2" />
                      {formatTimeFromISO(slot.startTime)} - {formatTimeFromISO(slot.endTime)}
                      {selectedSlot === slot && <CheckCircle className="h-4 w-4 ml-auto" />}
                    </Button>
                  ))}
              </div>
            )}

            {selectedSlot && (
              <div className="mt-6 space-y-3">
                <div className="border-t pt-4">
                  <div className="flex justify-between items-center mb-4">
                    <span className="text-sm font-medium">Total</span>
                    <span className="text-lg font-bold">${Number(appointmentType.price).toFixed(2)}</span>
                  </div>
                  <Button
                    className="w-full bg-black text-white hover:bg-black/90"
                    onClick={handleBooking}
                    disabled={bookAppointmentMutation.isPending}
                    data-testid="button-confirm-booking"
                  >
                    {bookAppointmentMutation.isPending ? "Booking..." : "Confirm Booking"}
                  </Button>
                  {appointmentType.requiresApproval && (
                    <p className="text-xs text-muted-foreground text-center mt-2">
                      Your booking will be pending instructor approval
                    </p>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
