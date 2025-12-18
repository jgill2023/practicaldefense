import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Calendar } from "@/components/ui/calendar";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Clock, DollarSign, CheckCircle, CalendarCheck, Loader2 } from "lucide-react";
import { format, parseISO } from "date-fns";

interface FreeSlot {
  startTime: string;
  endTime: string;
  durationMinutes: number;
}

interface AppointmentType {
  id: string;
  title: string;
  description: string | null;
  durationMinutes: number;
  price: string;
  requiresApproval: boolean;
}

interface PublicBookingFormProps {
  instructorId: string;
  appointmentTypes: AppointmentType[];
  instructorName?: string;
}

export function PublicBookingForm({ instructorId, appointmentTypes, instructorName }: PublicBookingFormProps) {
  const { toast } = useToast();

  const [selectedType, setSelectedType] = useState<AppointmentType | null>(null);
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(undefined);
  const [selectedSlot, setSelectedSlot] = useState<FreeSlot | null>(null);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [bookingSuccess, setBookingSuccess] = useState(false);
  const [meetLink, setMeetLink] = useState<string | null>(null);

  const [studentName, setStudentName] = useState("");
  const [studentEmail, setStudentEmail] = useState("");
  const [studentPhone, setStudentPhone] = useState("");
  const [studentNotes, setStudentNotes] = useState("");

  const dateString = selectedDate ? format(selectedDate, "yyyy-MM-dd") : "";

  const { data: availability, isLoading: slotsLoading } = useQuery<{
    date: string;
    instructorId: string;
    slotDurationMinutes: number;
    slots: FreeSlot[];
  }>({
    queryKey: ["/api/availability", dateString, instructorId, selectedType?.durationMinutes],
    queryFn: async () => {
      const response = await fetch(
        `/api/availability/${dateString}?instructorId=${instructorId}&slotDuration=${selectedType?.durationMinutes || 30}`
      );
      if (!response.ok) {
        throw new Error("Failed to fetch availability");
      }
      return response.json();
    },
    enabled: !!selectedType && !!selectedDate,
  });

  const bookMutation = useMutation({
    mutationFn: async (data: {
      instructorId: string;
      appointmentTypeId: string;
      startTime: string;
      endTime: string;
      studentName: string;
      studentEmail: string;
      studentPhone?: string;
      studentNotes?: string;
    }) => {
      const response = await fetch("/api/availability/book", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Booking failed");
      }
      return response.json();
    },
    onSuccess: (data) => {
      setBookingSuccess(true);
      setMeetLink(data.booking.meetLink || null);
      toast({
        title: "Booking Confirmed!",
        description: `Your appointment has been ${data.booking.status === 'pending' ? 'submitted for approval' : 'confirmed'}.`,
      });
    },
    onError: (error: any) => {
      toast({
        title: "Booking Failed",
        description: error.message || "Failed to create booking. Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleBookSlot = () => {
    if (!selectedType || !selectedSlot) return;

    bookMutation.mutate({
      instructorId,
      appointmentTypeId: selectedType.id,
      startTime: selectedSlot.startTime,
      endTime: selectedSlot.endTime,
      studentName,
      studentEmail,
      studentPhone: studentPhone || undefined,
      studentNotes: studentNotes || undefined,
    });
  };

  const formatTime = (isoString: string) => {
    try {
      return format(parseISO(isoString), "h:mm a");
    } catch {
      return isoString;
    }
  };

  const resetForm = () => {
    setSelectedType(null);
    setSelectedDate(undefined);
    setSelectedSlot(null);
    setStudentName("");
    setStudentEmail("");
    setStudentPhone("");
    setStudentNotes("");
    setBookingSuccess(false);
    setMeetLink(null);
    setShowConfirmDialog(false);
  };

  if (bookingSuccess) {
    return (
      <Card className="max-w-lg mx-auto">
        <CardContent className="pt-6">
          <div className="text-center space-y-4">
            <CheckCircle className="h-16 w-16 text-green-500 mx-auto" />
            <h3 className="text-xl font-semibold">Booking Confirmed!</h3>
            <p className="text-muted-foreground">
              Your appointment with {instructorName || "the instructor"} has been booked.
            </p>
            {meetLink && (
              <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-md">
                <p className="text-sm text-muted-foreground mb-2">Google Meet Link:</p>
                <a
                  href={meetLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-600 hover:underline break-all"
                  data-testid="link-meet"
                >
                  {meetLink}
                </a>
              </div>
            )}
            <Button onClick={resetForm} variant="outline" data-testid="button-book-another">
              Book Another Appointment
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold" data-testid="heading-book-appointment">
          Book an Appointment
        </h2>
        <p className="text-muted-foreground">
          {instructorName ? `Schedule a session with ${instructorName}` : "Select a service and pick a time"}
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle>1. Select Service</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {appointmentTypes.map((type) => (
              <div
                key={type.id}
                className={`p-4 border rounded-lg cursor-pointer transition-colors ${
                  selectedType?.id === type.id
                    ? "border-primary bg-primary/5"
                    : "hover:border-primary/50"
                }`}
                onClick={() => {
                  setSelectedType(type);
                  setSelectedDate(undefined);
                  setSelectedSlot(null);
                }}
                data-testid={`service-${type.id}`}
              >
                <div className="flex justify-between items-start mb-2">
                  <h4 className="font-medium">{type.title}</h4>
                  <Badge variant="secondary">
                    <DollarSign className="h-3 w-3 mr-1" />
                    {parseFloat(type.price).toFixed(2)}
                  </Badge>
                </div>
                {type.description && (
                  <p className="text-sm text-muted-foreground mb-2">{type.description}</p>
                )}
                <div className="flex items-center text-sm text-muted-foreground">
                  <Clock className="h-4 w-4 mr-1" />
                  {type.durationMinutes} minutes
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>2. Pick a Date</CardTitle>
          </CardHeader>
          <CardContent>
            <Calendar
              mode="single"
              selected={selectedDate}
              onSelect={(date) => {
                setSelectedDate(date);
                setSelectedSlot(null);
              }}
              disabled={(date) => date < new Date(new Date().setHours(0, 0, 0, 0)) || !selectedType}
              className="rounded-md border"
              data-testid="calendar-booking"
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CalendarCheck className="h-5 w-5" />
              3. Choose Time
            </CardTitle>
            {selectedDate && (
              <CardDescription>
                {format(selectedDate, "MMMM d, yyyy")}
              </CardDescription>
            )}
          </CardHeader>
          <CardContent>
            {!selectedType || !selectedDate ? (
              <p className="text-muted-foreground text-center py-8" data-testid="text-select-service-date">
                Please select a service and date first
              </p>
            ) : slotsLoading ? (
              <div className="text-center py-8">
                <Loader2 className="h-6 w-6 animate-spin mx-auto text-muted-foreground" />
              </div>
            ) : availability?.slots && availability.slots.length > 0 ? (
              <div className="grid gap-2 max-h-64 overflow-y-auto">
                {availability.slots.map((slot, index) => (
                  <Button
                    key={index}
                    variant={selectedSlot?.startTime === slot.startTime ? "default" : "outline"}
                    className="justify-start"
                    onClick={() => setSelectedSlot(slot)}
                    data-testid={`time-slot-${index}`}
                  >
                    <Clock className="h-4 w-4 mr-2" />
                    {formatTime(slot.startTime)} - {formatTime(slot.endTime)}
                  </Button>
                ))}
              </div>
            ) : (
              <p className="text-muted-foreground text-center py-8" data-testid="text-no-slots-available">
                No available times for this date
              </p>
            )}

            {selectedSlot && (
              <Button
                className="w-full mt-4"
                onClick={() => setShowConfirmDialog(true)}
                data-testid="button-continue-booking"
              >
                Continue
              </Button>
            )}
          </CardContent>
        </Card>
      </div>

      <Dialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Complete Your Booking</DialogTitle>
            <DialogDescription>
              {selectedType?.title} on {selectedDate && format(selectedDate, "MMMM d, yyyy")} at{" "}
              {selectedSlot && formatTime(selectedSlot.startTime)}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="studentName">Name *</Label>
              <Input
                id="studentName"
                value={studentName}
                onChange={(e) => setStudentName(e.target.value)}
                placeholder="Your full name"
                data-testid="input-student-name"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="studentEmail">Email *</Label>
              <Input
                id="studentEmail"
                type="email"
                value={studentEmail}
                onChange={(e) => setStudentEmail(e.target.value)}
                placeholder="your.email@example.com"
                data-testid="input-student-email"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="studentPhone">Phone (optional)</Label>
              <Input
                id="studentPhone"
                type="tel"
                value={studentPhone}
                onChange={(e) => setStudentPhone(e.target.value)}
                placeholder="(555) 123-4567"
                data-testid="input-student-phone"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="studentNotes">Notes (optional)</Label>
              <Textarea
                id="studentNotes"
                value={studentNotes}
                onChange={(e) => setStudentNotes(e.target.value)}
                placeholder="Anything you'd like the instructor to know..."
                data-testid="input-student-notes"
              />
            </div>
            <div className="p-3 bg-muted rounded-md">
              <div className="flex justify-between text-sm">
                <span>Service:</span>
                <span className="font-medium">{selectedType?.title}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span>Duration:</span>
                <span>{selectedType?.durationMinutes} min</span>
              </div>
              <div className="flex justify-between text-sm font-medium">
                <span>Price:</span>
                <span>${selectedType && parseFloat(selectedType.price).toFixed(2)}</span>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowConfirmDialog(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleBookSlot}
              disabled={!studentName || !studentEmail || bookMutation.isPending}
              data-testid="button-confirm-booking"
            >
              {bookMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Booking...
                </>
              ) : (
                "Confirm Booking"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
