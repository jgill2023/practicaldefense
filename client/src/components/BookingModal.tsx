import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Calendar } from "@/components/ui/calendar";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { isUnauthorizedError } from "@/lib/authUtils";
import { Clock, DollarSign, CheckCircle, X, LogIn } from "lucide-react";
import { Elements, PaymentElement, useStripe, useElements } from '@stripe/react-stripe-js';
import { loadStripe } from '@stripe/stripe-js';
import type { AppointmentType } from "@shared/schema";

// Initialize Stripe
const stripePromise = import.meta.env.VITE_STRIPE_PUBLIC_KEY 
  ? loadStripe(import.meta.env.VITE_STRIPE_PUBLIC_KEY)
  : null;

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
  const [showBookingForm, setShowBookingForm] = useState(false);
  const [selectedDurationHours, setSelectedDurationHours] = useState<number>(2); // For variable duration appointments
  const [clientSecret, setClientSecret] = useState<string>("");
  const [paymentIntentId, setPaymentIntentId] = useState<string>("");
  
  // Booking form state
  const [bookingForm, setBookingForm] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    password: '',
    notes: '',
  });

  // Initialize duration based on appointment type
  useEffect(() => {
    if (appointmentType && (appointmentType as any).isVariableDuration) {
      const minHours = (appointmentType as any).minimumDurationHours || 2;
      setSelectedDurationHours(minHours);
    }
  }, [appointmentType]);

  // Reset state when modal opens/closes
  useEffect(() => {
    if (!open) {
      setSelectedDate(undefined);
      setSelectedSlot(null);
      setShowBookingForm(false);
      // Reset to the appointment type's minimum hours, or default to 2
      const minHours = (appointmentType as any)?.minimumDurationHours || 2;
      setSelectedDurationHours(minHours);
      setBookingForm({
        firstName: '',
        lastName: '',
        email: '',
        phone: '',
        password: '',
        notes: '',
      });
    }
  }, [open, appointmentType]);

  // Pre-populate form for authenticated users
  useEffect(() => {
    if (isAuthenticated && user) {
      setBookingForm(prev => ({
        ...prev,
        firstName: user.firstName || '',
        lastName: user.lastName || '',
        email: user.email || '',
        phone: user.phone || '',
        password: '', // Don't pre-populate password
      }));
    }
  }, [isAuthenticated, user]);

  const formatLocalDate = (date: Date): string => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  // Generate duration options for variable-duration appointments
  const getDurationOptions = () => {
    if (!(appointmentType as any)?.isVariableDuration) return [];
    
    const minHours = (appointmentType as any).minimumDurationHours || 2;
    const incrementMinutes = (appointmentType as any).durationIncrementMinutes || 60;
    const incrementHours = incrementMinutes / 60;
    
    const options = [];
    for (let hours = minHours; hours <= minHours + 6; hours += incrementHours) {
      options.push(hours);
    }
    return options;
  };

  // Calculate total price for the booking
  const getTotalPrice = () => {
    if ((appointmentType as any)?.isVariableDuration) {
      const pricePerHour = Number((appointmentType as any).pricePerHour || 0);
      return pricePerHour * selectedDurationHours;
    }
    return Number(appointmentType?.price || 0);
  };

  // Calculate end time for variable duration
  const getCalculatedEndTime = (startTime: string, durationHours: number) => {
    const start = new Date(startTime);
    const end = new Date(start.getTime() + durationHours * 60 * 60 * 1000);
    return end.toISOString();
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
    queryKey: ["/api/appointments/available-slots", instructorId, appointmentType?.id, formatLocalDate(monthStart), formatLocalDate(monthEnd), selectedDurationHours],
    queryFn: async ({ queryKey, signal }) => {
      const [, instructorIdParam, typeIdParam, startDate, endDate, durationHours] = queryKey;
      if (!typeIdParam || !startDate || !endDate) return [];
      const url = new URL('/api/appointments/available-slots', window.location.origin);
      url.searchParams.set('instructorId', String(instructorIdParam));
      url.searchParams.set('appointmentTypeId', String(typeIdParam));
      url.searchParams.set('startDate', String(startDate));
      url.searchParams.set('endDate', String(endDate));
      if ((appointmentType as any)?.isVariableDuration && durationHours) {
        url.searchParams.set('durationHours', String(durationHours));
      }
      const response = await fetch(url.toString(), { credentials: "include", signal });
      if (!response.ok) return [];
      return response.json();
    },
    enabled: !!instructorId && !!appointmentType,
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
    queryKey: ["/api/appointments/available-slots-day", instructorId, appointmentType?.id, selectedDate ? selectedDate.getTime() : null, selectedDurationHours],
    queryFn: async ({ queryKey, signal }) => {
      const [, instructorIdParam, typeIdParam, dateTimestamp, durationHours] = queryKey;
      if (!typeIdParam || !dateTimestamp || !selectedDate) return [];
      
      // Use the actual selectedDate object to avoid timezone issues
      const dayStart = new Date(selectedDate);
      dayStart.setHours(0, 0, 0, 0);
      
      const dayEnd = new Date(selectedDate);
      dayEnd.setHours(23, 59, 59, 999);
      
      const url = new URL('/api/appointments/available-slots', window.location.origin);
      url.searchParams.set('instructorId', String(instructorIdParam));
      url.searchParams.set('appointmentTypeId', String(typeIdParam));
      url.searchParams.set('startDate', formatLocalDate(dayStart));
      url.searchParams.set('endDate', formatLocalDate(dayEnd));
      if ((appointmentType as any)?.isVariableDuration && durationHours) {
        url.searchParams.set('durationHours', String(durationHours));
      }
      
      const response = await fetch(url.toString(), { credentials: "include", signal });
      if (!response.ok) {
        throw new Error(`${response.status}: ${response.statusText}`);
      }
      return response.json();
    },
    enabled: !!instructorId && !!appointmentType && !!selectedDate,
    retry: false,
  });

  const bookAppointmentMutation = useMutation({
    mutationFn: async () => {
      if (!appointmentType || !selectedSlot) {
        throw new Error("Missing required fields");
      }

      // If authenticated, book directly
      if (isAuthenticated) {
        const isVariableDuration = (appointmentType as any).isVariableDuration;
        const body = {
          instructorId,
          appointmentTypeId: appointmentType.id,
          startTime: selectedSlot.startTime,
          endTime: isVariableDuration ? getCalculatedEndTime(selectedSlot.startTime, selectedDurationHours) : selectedSlot.endTime,
          studentNotes: bookingForm.notes,
          partySize: 1, // Default party size for appointments
          actualDurationMinutes: isVariableDuration ? selectedDurationHours * 60 : undefined,
          totalPrice: isVariableDuration ? getTotalPrice() : undefined,
        };
        return await apiRequest("POST", "/api/appointments/book", body);
      }

      // If not authenticated, create account + book in one request
      // Validate form fields
      if (!bookingForm.firstName || !bookingForm.lastName || !bookingForm.email) {
        throw new Error("Please fill in name and email");
      }

      // Password is optional - if not provided, guest booking is created
      if (bookingForm.password && bookingForm.password.length < 8) {
        throw new Error("Password must be at least 8 characters long");
      }

      const isVariableDuration = (appointmentType as any).isVariableDuration;
      const body = {
        // Account creation fields
        firstName: bookingForm.firstName,
        lastName: bookingForm.lastName,
        email: bookingForm.email,
        phone: bookingForm.phone,
        password: bookingForm.password || undefined, // Optional password
        // Appointment booking fields
        instructorId,
        appointmentTypeId: appointmentType.id,
        startTime: selectedSlot.startTime,
        endTime: isVariableDuration ? getCalculatedEndTime(selectedSlot.startTime, selectedDurationHours) : selectedSlot.endTime,
        studentNotes: bookingForm.notes,
        partySize: 1, // Default party size for appointments
        actualDurationMinutes: isVariableDuration ? selectedDurationHours * 60 : undefined,
        totalPrice: isVariableDuration ? getTotalPrice() : undefined,
      };

      return await apiRequest("POST", "/api/appointments/book-with-signup", body);
    },
    onSuccess: (data) => {
      // Handle both response formats:
      // - /book endpoint returns appointment directly
      // - /book-with-signup returns { appointment, isNewUser, linkedExistingAccount, etc. }
      const appointment = data.appointment || data;
      
      if (appointment && appointment.id) {
        // Extract flags (may be undefined for authenticated user bookings via /book endpoint)
        const { 
          isNewUser = false, 
          linkedExistingAccount = false, 
          needsPasswordSetup = false, 
          autoLoggedIn = false 
        } = data;
        
        let description = "";
        if (linkedExistingAccount) {
          description = "Your appointment has been linked to your existing account! Login to view it in your dashboard.";
        } else if (isNewUser && needsPasswordSetup) {
          description = "Appointment booked! Check your email for a link to set up your password.";
        } else if (isNewUser) {
          description = "Account created and appointment booked! You'll receive a confirmation email shortly.";
        } else if (appointmentType?.requiresApproval) {
          description = "Your appointment request has been submitted and is pending instructor approval.";
        } else {
          description = "Your appointment has been confirmed! You'll receive a confirmation email shortly.";
        }
        
        toast({
          title: appointmentType?.requiresApproval ? "Booking Requested" : "Booking Confirmed",
          description,
        });

        // Invalidate all appointment-related queries
        queryClient.invalidateQueries({ queryKey: ["/api/appointments/my-appointments"] });
        queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
        queryClient.invalidateQueries({ 
          predicate: (query) => {
            const key = query.queryKey[0];
            return typeof key === 'string' && key.startsWith('/api/appointments/available-slots');
          }
        });
        
        // Only reload if user was auto-logged in (new user with password)
        // For authenticated users or linked accounts, just close the modal
        if (autoLoggedIn === true) {
          setTimeout(() => window.location.reload(), 1500);
        } else {
          onClose();
        }
      }
    },
    onError: (error: any) => {
      if (isUnauthorizedError(error)) {
        toast({
          title: "Unauthorized",
          description: "Session expired. Redirecting to login...",
          variant: "destructive",
        });
        setTimeout(() => window.location.href = "/login", 500);
        return;
      }
      toast({
        title: "Booking Failed",
        description: error?.message || "Failed to book appointment. Please try again.",
        variant: "destructive",
      });
    },
  });

  // Create payment intent when booking form opens
  useEffect(() => {
    if (showBookingForm && selectedSlot && appointmentType && !clientSecret) {
      const createPaymentIntent = async () => {
        try {
          const isVariableDuration = (appointmentType as any).isVariableDuration;
          const response = await apiRequest("POST", "/api/appointments/create-payment-intent", {
            instructorId,
            appointmentTypeId: appointmentType.id,
            startTime: selectedSlot.startTime,
            endTime: isVariableDuration ? getCalculatedEndTime(selectedSlot.startTime, selectedDurationHours) : selectedSlot.endTime,
            durationHours: isVariableDuration ? selectedDurationHours : undefined,
          });

          if (response.clientSecret) {
            setClientSecret(response.clientSecret);
          }
        } catch (error: any) {
          toast({
            title: "Error",
            description: error.message || "Failed to initialize payment",
            variant: "destructive",
          });
          setShowBookingForm(false);
        }
      };

      createPaymentIntent();
    }
  }, [showBookingForm, selectedSlot, appointmentType]);

  const handleBooking = () => {
    // Show booking form when user clicks confirm
    setShowBookingForm(true);
  };

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    bookAppointmentMutation.mutate();
  };

  // Payment Form Component - renders inside Elements provider
  function PaymentFormContent() {
    const stripe = useStripe();
    const elements = useElements();
    const [isProcessing, setIsProcessing] = useState(false);

    const handlePaymentSubmit = async (e: React.FormEvent) => {
      e.preventDefault();

      if (!stripe || !elements) {
        return;
      }

      // Validate form fields for non-authenticated users
      if (!isAuthenticated) {
        if (!bookingForm.firstName || !bookingForm.lastName || !bookingForm.email) {
          toast({
            title: "Error",
            description: "Please fill in all required fields",
            variant: "destructive",
          });
          return;
        }

        if (bookingForm.password && bookingForm.password.length < 8) {
          toast({
            title: "Error",
            description: "Password must be at least 8 characters long",
            variant: "destructive",
          });
          return;
        }
      }

      setIsProcessing(true);

      try {
        // Confirm payment
        const { error, paymentIntent } = await stripe.confirmPayment({
          elements,
          confirmParams: {
            return_url: `${window.location.origin}/appointments`, // Redirect after payment
          },
          redirect: 'if_required',
        });

        if (error) {
          toast({
            title: "Payment Failed",
            description: error.message,
            variant: "destructive",
          });
          setIsProcessing(false);
          return;
        }

        if (paymentIntent && paymentIntent.status === 'succeeded') {
          // Payment successful, now book the appointment
          try {
            const isVariableDuration = (appointmentType as any).isVariableDuration;
            const bookingData = {
              instructorId,
              appointmentTypeId: appointmentType.id,
              startTime: selectedSlot!.startTime,
              endTime: isVariableDuration ? getCalculatedEndTime(selectedSlot!.startTime, selectedDurationHours) : selectedSlot!.endTime,
              partySize: 1,
              actualDurationMinutes: isVariableDuration ? selectedDurationHours * 60 : undefined,
              totalPrice: isVariableDuration ? getTotalPrice() : undefined,
              paymentIntentId: paymentIntent.id,
            };

            let response;
            if (isAuthenticated) {
              response = await apiRequest("POST", "/api/appointments/book", bookingData);
            } else {
              response = await apiRequest("POST", "/api/appointments/book-with-signup", {
                ...bookingData,
                firstName: bookingForm.firstName,
                lastName: bookingForm.lastName,
                email: bookingForm.email,
                phone: bookingForm.phone,
                password: bookingForm.password || undefined,
              });
            }

            toast({
              title: "Booking Confirmed",
              description: "Your payment was successful and your appointment has been booked!",
            });

            // Invalidate queries to refresh availability and user data
            queryClient.invalidateQueries({ queryKey: ["/api/appointments/my-appointments"] });
            queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
            queryClient.invalidateQueries({ queryKey: ["/api/appointments/available-slots"] });
            queryClient.invalidateQueries({ queryKey: ["/api/appointments/available-slots-day"] });

            // Close dialogs
            setShowBookingForm(false);
            onClose();
          } catch (bookingError: any) {
            toast({
              title: "Booking Failed",
              description: bookingError.message || "Payment succeeded but booking failed. Please contact support.",
              variant: "destructive",
            });
          }
        }
      } catch (paymentError: any) {
        toast({
          title: "Error",
          description: paymentError.message || "An error occurred",
          variant: "destructive",
        });
      } finally {
        setIsProcessing(false);
      }
    };

    return (
      <form onSubmit={handlePaymentSubmit} className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="firstName">
              First Name <span className="text-destructive">*</span>
            </Label>
            <Input
              id="firstName"
              value={bookingForm.firstName}
              onChange={(e) => setBookingForm(prev => ({ ...prev, firstName: e.target.value }))}
              required
              disabled={isAuthenticated}
              data-testid="input-first-name"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="lastName">
              Last Name <span className="text-destructive">*</span>
            </Label>
            <Input
              id="lastName"
              value={bookingForm.lastName}
              onChange={(e) => setBookingForm(prev => ({ ...prev, lastName: e.target.value }))}
              required
              disabled={isAuthenticated}
              data-testid="input-last-name"
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="email">
            Email <span className="text-destructive">*</span>
          </Label>
          <Input
            id="email"
            type="email"
            value={bookingForm.email}
            onChange={(e) => setBookingForm(prev => ({ ...prev, email: e.target.value }))}
            required
            disabled={isAuthenticated}
            data-testid="input-email"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="phone">Phone</Label>
          <Input
            id="phone"
            type="tel"
            value={bookingForm.phone}
            onChange={(e) => setBookingForm(prev => ({ ...prev, phone: e.target.value }))}
            disabled={isAuthenticated}
            data-testid="input-phone"
          />
        </div>

        {!isAuthenticated && (
          <div className="space-y-2">
            <Label htmlFor="password">
              Create Password (Optional)
            </Label>
            <Input
              id="password"
              type="password"
              value={bookingForm.password}
              onChange={(e) => setBookingForm(prev => ({ ...prev, password: e.target.value }))}
              minLength={8}
              placeholder="Leave blank to receive password setup email"
              data-testid="input-password"
            />
            <p className="text-xs text-muted-foreground">
              {bookingForm.password 
                ? "Your account will be created when you complete the booking"
                : "We'll email you a link to set up your password after booking"
              }
            </p>
          </div>
        )}

        <div className="border-t pt-4">
          <Label className="text-sm font-medium mb-2 block">Payment Information</Label>
          <PaymentElement />
        </div>

        <div className="border-t pt-4 space-y-3">
          <div className="flex justify-between items-center">
            <span className="text-sm font-medium">Total</span>
            <span className="text-lg font-bold">${getTotalPrice().toFixed(2)}</span>
          </div>
          <Button
            type="submit"
            className="w-full bg-black text-white hover:bg-black/90"
            disabled={isProcessing || !stripe || !elements}
            data-testid="button-submit-booking"
          >
            {isProcessing ? "Processing..." : "Complete Booking"}
          </Button>
          {appointmentType?.requiresApproval && (
            <p className="text-xs text-muted-foreground text-center">
              Your booking will be pending instructor approval
            </p>
          )}
        </div>
      </form>
    );
  }

  if (!appointmentType) return null;

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
            {(appointmentType as any).isVariableDuration ? (
              <>
                <div className="flex items-center gap-1">
                  <Clock className="h-4 w-4" />
                  <span>{(appointmentType as any).minimumDurationHours}+ hours</span>
                </div>
                <div className="flex items-center gap-1">
                  <DollarSign className="h-4 w-4" />
                  <span className="font-semibold">${Number((appointmentType as any).pricePerHour).toFixed(2)}/hour</span>
                </div>
                <Badge variant="outline" className="text-xs">Variable Duration</Badge>
              </>
            ) : (
              <>
                <div className="flex items-center gap-1">
                  <Clock className="h-4 w-4" />
                  <span>{appointmentType.durationMinutes} minutes</span>
                </div>
                <div className="flex items-center gap-1">
                  <DollarSign className="h-4 w-4" />
                  <span className="font-semibold">${Number(appointmentType.price).toFixed(2)}</span>
                </div>
              </>
            )}
            {appointmentType.requiresApproval && (
              <Badge variant="outline" className="text-xs">Approval Required</Badge>
            )}
          </div>
        </DialogHeader>

        {/* Duration Selector (for variable duration appointments) */}
        {(appointmentType as any).isVariableDuration && (
          <div className="mt-4 p-4 border rounded-lg bg-muted/50">
            <Label htmlFor="duration-select-main" className="text-sm font-medium mb-2 block">
              Select Duration
            </Label>
            <select
              id="duration-select-main"
              className="w-full border border-input rounded-md px-3 py-2 text-sm bg-background"
              value={selectedDurationHours}
              onChange={(e) => {
                setSelectedDurationHours(Number(e.target.value));
                // Reset slot selection when duration changes
                setSelectedSlot(null);
              }}
              data-testid="select-duration-main"
            >
              {getDurationOptions().map(hours => (
                <option key={hours} value={hours}>
                  {hours} {hours === 1 ? 'hour' : 'hours'} - ${(Number((appointmentType as any).pricePerHour) * hours).toFixed(2)}
                </option>
              ))}
            </select>
            <p className="text-xs text-muted-foreground mt-2">
              Time slots will show {selectedDurationHours}-hour blocks at ${Number((appointmentType as any).pricePerHour).toFixed(2)}/hour
            </p>
          </div>
        )}

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
                position: relative;
              }
              .booking-calendar .rdp-day_button {
                position: relative;
                width: 100%;
                height: 100%;
              }
              .booking-calendar .rdp-day.day-available::after {
                content: '';
                position: absolute;
                bottom: 4px;
                left: 50%;
                transform: translateX(-50%);
                width: 5px;
                height: 5px;
                border-radius: 50%;
                background-color: #10b981;
                pointer-events: none;
                z-index: 10;
              }
              .booking-calendar .rdp-day.day-unavailable {
                opacity: 0.4;
              }
              .booking-calendar .rdp-day.day-unavailable::before {
                content: '';
                position: absolute;
                top: 50%;
                left: 15%;
                right: 15%;
                height: 1.5px;
                background-color: #ef4444;
                transform: translateY(-50%);
                pointer-events: none;
                z-index: 10;
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
              classNames={{
                day: "rdp-day",
              }}
              className="booking-calendar"
              data-testid="booking-calendar"
            />
            <div className="mt-4 space-y-2 text-xs text-muted-foreground">
              <div className="flex items-center gap-2">
                <div className="flex items-end justify-center w-6 h-6 border rounded relative">
                  <span className="text-xs">1</span>
                  <div className="absolute bottom-0.5 w-1 h-1 rounded-full bg-green-500"></div>
                </div>
                <span>Available slots</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="flex items-center justify-center w-6 h-6 border rounded opacity-40 relative">
                  <span className="text-xs">15</span>
                  <div className="absolute top-1/2 left-1.5 right-1.5 h-px bg-red-500"></div>
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
                  {(appointmentType as any).isVariableDuration ? (
                    <div className="space-y-2 mb-4">
                      <div className="flex justify-between text-sm text-muted-foreground">
                        <span>${Number((appointmentType as any).pricePerHour).toFixed(2)}/hour × {selectedDurationHours} hours</span>
                        <span>${(Number((appointmentType as any).pricePerHour) * selectedDurationHours).toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between items-center border-t pt-2">
                        <span className="text-sm font-medium">Total</span>
                        <span className="text-lg font-bold">${getTotalPrice().toFixed(2)}</span>
                      </div>
                    </div>
                  ) : (
                    <div className="flex justify-between items-center mb-4">
                      <span className="text-sm font-medium">Total</span>
                      <span className="text-lg font-bold">${Number(appointmentType.price).toFixed(2)}</span>
                    </div>
                  )}
                  
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

      {/* Booking Form Dialog with Stripe Payment */}
      <Dialog open={showBookingForm} onOpenChange={setShowBookingForm}>
        <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto" data-testid="booking-form-dialog">
          <DialogHeader>
            <DialogTitle>Complete Your Booking</DialogTitle>
          </DialogHeader>

          {!isAuthenticated && (
            <div className="flex items-center justify-center gap-2 py-2 text-sm text-muted-foreground">
              <LogIn className="h-4 w-4" />
              <span>Returning student?</span>
              <Button
                variant="link"
                className="h-auto p-0 text-sm font-semibold"
                onClick={() => window.location.href = '/login'}
                data-testid="button-login-link"
              >
                Login to autopopulate
              </Button>
            </div>
          )}

          {clientSecret && stripePromise ? (
            <Elements stripe={stripePromise} options={{ clientSecret }}>
              <PaymentFormContent />
            </Elements>
          ) : (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" aria-label="Loading payment form"/>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </Dialog>
  );
}
