import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useRoute } from "wouter";
import { apiRequest } from "@/lib/queryClient";
import { Layout } from "@/components/Layout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Calendar } from "@/components/ui/calendar";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { isUnauthorizedError } from "@/lib/authUtils";
import { Clock, DollarSign, CalendarClock, CheckCircle } from "lucide-react";
import type { User } from "@shared/schema";

type AppointmentType = {
  id: string;
  instructorId: string;
  title: string;
  description: string | null;
  durationMinutes: number;
  price: number;
  requiresApproval: boolean;
  isActive: boolean;
};

type TimeSlot = {
  startTime: string;
  endTime: string;
  requiresApproval: boolean;
};

export default function BookAppointmentPage() {
  const { user, isLoading: authLoading, isAuthenticated } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [, params] = useRoute("/book-appointment/:instructorId");

  const [selectedType, setSelectedType] = useState<AppointmentType | null>(null);
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(undefined);
  const [selectedSlot, setSelectedSlot] = useState<TimeSlot | null>(null);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);

  const instructorId = params?.instructorId || "";

  const { data: appointmentTypes = [], isLoading: typesLoading } = useQuery<AppointmentType[]>({
    queryKey: ["/api/appointments/student/types", instructorId],
    queryFn: async ({ queryKey, signal }) => {
      const [, instructorIdParam] = queryKey;
      const response = await fetch(`/api/appointments/student/types?instructorId=${instructorIdParam}`, {
        credentials: "include",
        signal,
      });
      if (!response.ok) {
        throw new Error(`${response.status}: ${response.statusText}`);
      }
      return response.json();
    },
    enabled: isAuthenticated && !!instructorId,
    retry: false,
  });

  const formatLocalDate = (date: Date): string => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const { data: availableSlots = [], isLoading: slotsLoading } = useQuery<TimeSlot[]>({
    queryKey: ["/api/appointments/student/slots", instructorId, selectedType?.id, selectedDate ? formatLocalDate(selectedDate) : null],
    queryFn: async ({ queryKey, signal }) => {
      const [, instructorIdParam, typeIdParam, dateStr] = queryKey;
      if (!typeIdParam || !dateStr) return [];
      const response = await fetch(
        `/api/appointments/student/slots?instructorId=${instructorIdParam}&appointmentTypeId=${typeIdParam}&date=${dateStr}`,
        { credentials: "include", signal }
      );
      if (!response.ok) {
        throw new Error(`${response.status}: ${response.statusText}`);
      }
      return response.json();
    },
    enabled: isAuthenticated && !!instructorId && !!selectedType && !!selectedDate,
    retry: false,
  });

  const bookAppointmentMutation = useMutation({
    mutationFn: async () => {
      if (!selectedType || !selectedDate || !selectedSlot) {
        throw new Error("Missing required fields");
      }

      const startDateTime = new Date(selectedDate);
      const [hours, minutes] = selectedSlot.startTime.split(':');
      startDateTime.setHours(parseInt(hours), parseInt(minutes), 0, 0);

      const body = {
        instructorId,
        appointmentTypeId: selectedType.id,
        startTime: startDateTime.toISOString(),
      };

      const data = await apiRequest("POST", "/api/appointments/student/book", body);
      return data;
    },
    onSuccess: (data) => {
      if (data.appointment) {
        toast({
          title: selectedType?.requiresApproval ? "Booking Requested" : "Booking Confirmed",
          description: selectedType?.requiresApproval
            ? "Your appointment request has been submitted and is pending instructor approval."
            : "Your appointment has been confirmed! You'll receive a confirmation email shortly.",
        });

        queryClient.invalidateQueries({ queryKey: ["/api/appointments/student/bookings"] });
        setShowConfirmDialog(false);
        setSelectedType(null);
        setSelectedDate(undefined);
        setSelectedSlot(null);
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

  function handleSlotSelect(slot: TimeSlot) {
    setSelectedSlot(slot);
    setShowConfirmDialog(true);
  }

  function handleConfirmBooking() {
    bookAppointmentMutation.mutate();
  }

  if (authLoading || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  const formattedDate = selectedDate
    ? selectedDate.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })
    : null;

  return (
    <Layout>
      <div className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2" data-testid="text-page-title">
            Book an Appointment
          </h1>
          <p className="text-muted-foreground">
            Select an appointment type and choose an available time slot
          </p>
        </div>

        <div className="grid lg:grid-cols-2 gap-8">
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Step 1: Choose Appointment Type</CardTitle>
                <CardDescription>
                  Select the type of appointment you'd like to book
                </CardDescription>
              </CardHeader>
              <CardContent>
                {typesLoading ? (
                  <div className="text-center py-8 text-muted-foreground">Loading appointment types...</div>
                ) : appointmentTypes.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    No appointment types available at this time.
                  </div>
                ) : (
                  <div className="space-y-3">
                    {appointmentTypes.map((type) => (
                      <button
                        key={type.id}
                        onClick={() => {
                          setSelectedType(type);
                          setSelectedDate(undefined);
                          setSelectedSlot(null);
                        }}
                        className={`w-full text-left border rounded-lg p-4 transition-all ${
                          selectedType?.id === type.id
                            ? 'border-primary bg-primary/5'
                            : 'border-border hover:border-primary/50'
                        }`}
                        data-testid={`button-select-type-${type.id}`}
                      >
                        <div className="flex items-start justify-between mb-2">
                          <h3 className="font-semibold text-lg">{type.title}</h3>
                          {selectedType?.id === type.id && (
                            <CheckCircle className="h-5 w-5 text-primary" />
                          )}
                        </div>
                        {type.description && (
                          <p className="text-sm text-muted-foreground mb-3">{type.description}</p>
                        )}
                        <div className="flex items-center gap-4 text-sm">
                          <div className="flex items-center gap-1">
                            <Clock className="h-4 w-4 text-muted-foreground" />
                            <span>{type.durationMinutes} min</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <DollarSign className="h-4 w-4 text-muted-foreground" />
                            <span>${Number(type.price).toFixed(2)}</span>
                          </div>
                          {type.requiresApproval && (
                            <Badge variant="outline" className="text-xs">Requires Approval</Badge>
                          )}
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {selectedType && (
              <Card>
                <CardHeader>
                  <CardTitle>Step 2: Select Date</CardTitle>
                  <CardDescription>
                    Choose a date to see available time slots
                  </CardDescription>
                </CardHeader>
                <CardContent className="flex justify-center">
                  <Calendar
                    mode="single"
                    selected={selectedDate}
                    onSelect={setSelectedDate}
                    disabled={(date) => date < new Date(new Date().setHours(0, 0, 0, 0))}
                    className="rounded-md border"
                    data-testid="calendar-date-picker"
                  />
                </CardContent>
              </Card>
            )}
          </div>

          <div>
            {selectedType && selectedDate && (
              <Card>
                <CardHeader>
                  <CardTitle>Step 3: Choose Time</CardTitle>
                  <CardDescription>
                    Available time slots for {formattedDate}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {slotsLoading ? (
                    <div className="text-center py-8 text-muted-foreground">Loading available times...</div>
                  ) : availableSlots.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      No available time slots for this date. Please select a different date.
                    </div>
                  ) : (
                    <div className="grid gap-2 max-h-96 overflow-y-auto">
                      {availableSlots.map((slot, index) => (
                        <Button
                          key={index}
                          variant="outline"
                          onClick={() => handleSlotSelect(slot)}
                          className="justify-between h-auto py-3"
                          data-testid={`button-select-slot-${index}`}
                        >
                          <div className="flex items-center gap-2">
                            <CalendarClock className="h-4 w-4" />
                            <span className="font-medium">
                              {slot.startTime} - {slot.endTime}
                            </span>
                          </div>
                          {slot.requiresApproval && (
                            <Badge variant="outline" className="text-xs">Approval Required</Badge>
                          )}
                        </Button>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            )}
          </div>
        </div>

        <Dialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
          <DialogContent data-testid="dialog-confirm-booking">
            <DialogHeader>
              <DialogTitle>Confirm Appointment</DialogTitle>
              <DialogDescription>
                Please review your appointment details before confirming
              </DialogDescription>
            </DialogHeader>
            {selectedType && selectedDate && selectedSlot && (
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Appointment Type:</span>
                    <span className="font-medium">{selectedType.title}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Date:</span>
                    <span className="font-medium">{formattedDate}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Time:</span>
                    <span className="font-medium">{selectedSlot.startTime} - {selectedSlot.endTime}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Duration:</span>
                    <span className="font-medium">{selectedType.durationMinutes} minutes</span>
                  </div>
                  <div className="flex justify-between text-lg font-semibold pt-2 border-t">
                    <span>Total:</span>
                    <span>${Number(selectedType.price).toFixed(2)}</span>
                  </div>
                </div>
                {selectedType.requiresApproval && (
                  <div className="bg-muted p-3 rounded-md">
                    <p className="text-sm text-muted-foreground">
                      This appointment requires instructor approval. You'll be notified once the instructor reviews your request.
                    </p>
                  </div>
                )}
              </div>
            )}
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowConfirmDialog(false)}>
                Cancel
              </Button>
              <Button
                onClick={handleConfirmBooking}
                disabled={bookAppointmentMutation.isPending}
                data-testid="button-confirm-booking"
              >
                {bookAppointmentMutation.isPending ? "Processing..." : "Confirm Booking"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </Layout>
  );
}
