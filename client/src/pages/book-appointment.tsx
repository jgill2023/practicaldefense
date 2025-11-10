import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useRoute } from "wouter";
import { apiRequest } from "@/lib/queryClient";
import { Layout } from "@/components/Layout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { isUnauthorizedError } from "@/lib/authUtils";
import { Clock, DollarSign, CalendarClock, CheckCircle } from "lucide-react";
import type { User } from "@shared/schema";
import { DayPicker } from "react-day-picker";
import { cn } from "@/lib/utils";

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
  requiresApproval?: boolean;
  isAvailable?: boolean;
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
  const [showBookingModal, setShowBookingModal] = useState(false);
  const [availabilityMap, setAvailabilityMap] = useState<Record<string, boolean>>({});

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
    // Use local timezone to format the date
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const { data: availableSlots = [], isLoading: slotsLoading } = useQuery<TimeSlot[]>({
    queryKey: ["/api/appointments/available-slots", instructorId, selectedType?.id, selectedDate ? formatLocalDate(selectedDate) : null],
    queryFn: async ({ queryKey, signal }) => {
      const [, instructorIdParam, typeIdParam, dateStr] = queryKey;
      if (!typeIdParam || !dateStr) return [];
      
      // Create date range for the selected day
      const startDate = dateStr;
      const date = new Date(dateStr);
      date.setDate(date.getDate() + 1);
      const endDate = formatLocalDate(date);
      
      const response = await fetch(
        `/api/appointments/available-slots?instructorId=${instructorIdParam}&appointmentTypeId=${typeIdParam}&startDate=${startDate}&endDate=${endDate}`,
        { credentials: "include", signal }
      );
      if (!response.ok) {
        throw new Error(`${response.status}: ${response.statusText}`);
      }
      const allSlots = await response.json();
      console.log('All slots from API:', allSlots);
      console.log('Selected date string:', dateStr);
      
      // Filter to only slots that are available and on the selected date
      const filtered = allSlots.filter((slot: any) => {
        if (!slot.isAvailable) return false;
        
        // Parse the ISO string and extract date in local timezone
        const slotDate = new Date(slot.startTime);
        const slotDateStr = formatLocalDate(slotDate);
        console.log(`Slot start: ${slot.startTime}, formatted: ${slotDateStr}, match: ${slotDateStr === dateStr}`);
        return slotDateStr === dateStr;
      });
      
      console.log('Filtered slots:', filtered);
      return filtered;
    },
    enabled: isAuthenticated && !!instructorId && !!selectedType && !!selectedDate,
    retry: false,
  });

  // Fetch availability for the next 60 days when modal opens
  useEffect(() => {
    if (!showBookingModal || !selectedType || !instructorId) return;

    const fetchAvailability = async () => {
      const map: Record<string, boolean> = {};
      const today = new Date();
      const promises = [];

      const startDate = formatLocalDate(today);
      const endDate = new Date(today);
      endDate.setDate(today.getDate() + 60);
      const endDateStr = formatLocalDate(endDate);

      const promise = fetch(
        `/api/appointments/available-slots?instructorId=${instructorId}&appointmentTypeId=${selectedType.id}&startDate=${startDate}&endDate=${endDateStr}`,
        { credentials: "include" }
      )
        .then(res => res.json())
        .then(slots => {
          // Group slots by date
          slots.forEach((slot: any) => {
            if (slot.isAvailable) {
              const slotDate = new Date(slot.startTime);
              const dateStr = formatLocalDate(slotDate);
              map[dateStr] = true;
            }
          });
          
          // Mark dates without slots as unavailable
          for (let i = 0; i < 60; i++) {
            const date = new Date(today);
            date.setDate(today.getDate() + i);
            const dateStr = formatLocalDate(date);
            if (map[dateStr] === undefined) {
              map[dateStr] = false;
            }
          }
        })
        .catch(() => {
          // Mark all dates as unavailable on error
          for (let i = 0; i < 60; i++) {
            const date = new Date(today);
            date.setDate(today.getDate() + i);
            const dateStr = formatLocalDate(date);
            map[dateStr] = false;
          }
        });

      promises.push(promise);

      await Promise.all(promises);
      setAvailabilityMap(map);
    };

    fetchAvailability();
  }, [showBookingModal, selectedType, instructorId]);

  const bookAppointmentMutation = useMutation({
    mutationFn: async () => {
      if (!selectedType || !selectedSlot) {
        throw new Error("Missing required fields");
      }

      const response = await fetch("/api/appointments/book", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({
          instructorId,
          appointmentTypeId: selectedType.id,
          startTime: selectedSlot.startTime,
          endTime: selectedSlot.endTime,
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(errorText || `${response.status}: ${response.statusText}`);
      }

      return response.json();
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

  function handleBookNow(type: AppointmentType) {
    setSelectedType(type);
    setSelectedDate(undefined);
    setSelectedSlot(null);
    setShowBookingModal(true);
  }

  function handleCloseBookingModal() {
    setShowBookingModal(false);
    setSelectedDate(undefined);
    setSelectedSlot(null);
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

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {typesLoading ? (
            <div className="col-span-full text-center py-12 text-muted-foreground">
              Loading appointment types...
            </div>
          ) : appointmentTypes.length === 0 ? (
            <div className="col-span-full text-center py-12 text-muted-foreground">
              No appointment types available at this time.
            </div>
          ) : (
            appointmentTypes.map((type) => (
              <Card key={type.id} className="relative">
                <CardHeader>
                  <div className="flex items-start justify-between mb-2">
                    <CardTitle className="text-xl">{type.title}</CardTitle>
                    {type.requiresApproval && (
                      <Badge variant="outline" className="text-xs">Approval Required</Badge>
                    )}
                  </div>
                  {type.description && (
                    <CardDescription>{type.description}</CardDescription>
                  )}
                </CardHeader>
                <CardContent className="pointer-events-none">
                  <div className="space-y-3 mb-4">
                    <div className="flex items-center gap-2 text-sm">
                      <Clock className="h-4 w-4 text-muted-foreground" />
                      <span>{type.durationMinutes} minutes</span>
                    </div>
                    <div className="flex items-center gap-2 text-lg font-semibold">
                      <DollarSign className="h-5 w-5 text-muted-foreground" />
                      <span>${Number(type.price).toFixed(2)}</span>
                    </div>
                  </div>
                  <div className="pointer-events-auto relative z-10">
                    <Button
                      type="button"
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        handleBookNow(type);
                      }}
                      onTouchStart={(e) => {
                        e.stopPropagation();
                      }}
                      className="w-full min-h-[44px]"
                      data-testid={`button-book-${type.id}`}
                    >
                      Book Now
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>

        {/* Booking Modal */}
        <Dialog open={showBookingModal} onOpenChange={handleCloseBookingModal}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden" data-testid="dialog-booking-modal">
            <DialogHeader>
              <DialogTitle>Book {selectedType?.title}</DialogTitle>
              <DialogDescription>
                Select a date and time for your appointment
              </DialogDescription>
            </DialogHeader>
            
            <div className="grid md:grid-cols-2 gap-6 py-4">
              {/* Left Column - Calendar */}
              <div className="space-y-4">
                <div className="flex justify-center">
                  <DayPicker
                    mode="single"
                    selected={selectedDate}
                    onSelect={setSelectedDate}
                    disabled={(date) => date < new Date(new Date().setHours(0, 0, 0, 0))}
                    modifiers={{
                      available: (date) => {
                        const dateStr = formatLocalDate(date);
                        return availabilityMap[dateStr] === true;
                      },
                      unavailable: (date) => {
                        const dateStr = formatLocalDate(date);
                        return availabilityMap[dateStr] === false && date >= new Date(new Date().setHours(0, 0, 0, 0));
                      },
                    }}
                    modifiersStyles={{
                      available: {
                        position: 'relative',
                      },
                      unavailable: {
                        position: 'relative',
                      },
                    }}
                    components={{
                      Day: ({ date, ...props }) => {
                        const dateStr = formatLocalDate(date);
                        const hasAvailability = availabilityMap[dateStr] === true;
                        const noAvailability = availabilityMap[dateStr] === false && date >= new Date(new Date().setHours(0, 0, 0, 0));
                        
                        return (
                          <div className="relative">
                            {hasAvailability && (
                              <div className="absolute inset-0 rounded-full border-2 border-green-500 pointer-events-none" />
                            )}
                            {noAvailability && (
                              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                                <div className="w-full h-0.5 bg-red-500 rotate-45" />
                              </div>
                            )}
                            <button {...props} className={cn("relative z-10", props.className)} />
                          </div>
                        );
                      },
                    }}
                    className="rounded-md border p-3"
                  />
                </div>
                
                <div className="space-y-2 text-sm">
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded-full border-2 border-green-500" />
                    <span>Available slots</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="relative w-6 h-6">
                      <div className="absolute inset-0 flex items-center justify-center">
                        <div className="w-full h-0.5 bg-red-500 rotate-45" />
                      </div>
                    </div>
                    <span>No availability</span>
                  </div>
                </div>
              </div>

              {/* Right Column - Time Slots */}
              <div className="space-y-4">
                <div>
                  <h4 className="font-semibold mb-3">
                    {selectedDate ? formattedDate : 'Select a date'}
                  </h4>
                  
                  {!selectedDate ? (
                    <div className="text-center py-8 text-muted-foreground">
                      Please select a date to see available time slots
                    </div>
                  ) : slotsLoading ? (
                    <div className="text-center py-8 text-muted-foreground">
                      Loading available times...
                    </div>
                  ) : availableSlots.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      <p>No available time slots for this date.</p>
                      <p className="text-xs mt-2">Selected: {selectedDate ? formatLocalDate(selectedDate) : 'none'}</p>
                    </div>
                  ) : (
                    <div className="grid gap-2 max-h-96 overflow-y-auto pr-2">
                      {availableSlots.map((slot, index) => {
                        const startTime = new Date(slot.startTime);
                        const endTime = new Date(slot.endTime);
                        
                        // Format time in 12-hour format with AM/PM
                        const formatTime = (date: Date) => {
                          return date.toLocaleTimeString('en-US', { 
                            hour: 'numeric', 
                            minute: '2-digit', 
                            hour12: true 
                          });
                        };
                        
                        return (
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
                                {formatTime(startTime)} - {formatTime(endTime)}
                              </span>
                            </div>
                            {slot.requiresApproval && (
                              <Badge variant="outline" className="text-xs">Approval Required</Badge>
                            )}
                          </Button>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </DialogContent>
        </Dialog>

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
                    <span className="font-medium">
                      {new Date(selectedSlot.startTime).toLocaleTimeString('en-US', { 
                        hour: 'numeric', 
                        minute: '2-digit', 
                        hour12: true
                      })} - {new Date(selectedSlot.endTime).toLocaleTimeString('en-US', { 
                        hour: 'numeric', 
                        minute: '2-digit', 
                        hour12: true 
                      })}
                    </span>
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
