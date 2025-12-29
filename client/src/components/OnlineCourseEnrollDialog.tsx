import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation } from "@tanstack/react-query";
import { loadStripe } from "@stripe/stripe-js";
import { Elements, PaymentElement, useStripe, useElements } from "@stripe/react-stripe-js";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Loader2, CheckCircle, CreditCard, User, AlertCircle } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";

const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLIC_KEY || '');

const enrollmentFormSchema = z.object({
  firstName: z.string().min(1, "First name is required"),
  lastName: z.string().min(1, "Last name is required"),
  email: z.string().email("Please enter a valid email address"),
  phone: z.string().min(10, "Please enter a valid phone number"),
  dateOfBirth: z.string().min(1, "Date of birth is required"),
  streetAddress: z.string().min(1, "Street address is required"),
  city: z.string().min(1, "City is required"),
  state: z.string().length(2, "Please select a state"),
  zipCode: z.string().regex(/^\d{5}(-\d{4})?$/, "Please enter a valid ZIP code"),
});

type EnrollmentFormData = z.infer<typeof enrollmentFormSchema>;

interface OnlineCourseEnrollDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  courseName: string;
  coursePrice: number;
}

const US_STATES = [
  { value: "AL", label: "Alabama" },
  { value: "AK", label: "Alaska" },
  { value: "AZ", label: "Arizona" },
  { value: "AR", label: "Arkansas" },
  { value: "CA", label: "California" },
  { value: "CO", label: "Colorado" },
  { value: "CT", label: "Connecticut" },
  { value: "DE", label: "Delaware" },
  { value: "FL", label: "Florida" },
  { value: "GA", label: "Georgia" },
  { value: "HI", label: "Hawaii" },
  { value: "ID", label: "Idaho" },
  { value: "IL", label: "Illinois" },
  { value: "IN", label: "Indiana" },
  { value: "IA", label: "Iowa" },
  { value: "KS", label: "Kansas" },
  { value: "KY", label: "Kentucky" },
  { value: "LA", label: "Louisiana" },
  { value: "ME", label: "Maine" },
  { value: "MD", label: "Maryland" },
  { value: "MA", label: "Massachusetts" },
  { value: "MI", label: "Michigan" },
  { value: "MN", label: "Minnesota" },
  { value: "MS", label: "Mississippi" },
  { value: "MO", label: "Missouri" },
  { value: "MT", label: "Montana" },
  { value: "NE", label: "Nebraska" },
  { value: "NV", label: "Nevada" },
  { value: "NH", label: "New Hampshire" },
  { value: "NJ", label: "New Jersey" },
  { value: "NM", label: "New Mexico" },
  { value: "NY", label: "New York" },
  { value: "NC", label: "North Carolina" },
  { value: "ND", label: "North Dakota" },
  { value: "OH", label: "Ohio" },
  { value: "OK", label: "Oklahoma" },
  { value: "OR", label: "Oregon" },
  { value: "PA", label: "Pennsylvania" },
  { value: "RI", label: "Rhode Island" },
  { value: "SC", label: "South Carolina" },
  { value: "SD", label: "South Dakota" },
  { value: "TN", label: "Tennessee" },
  { value: "TX", label: "Texas" },
  { value: "UT", label: "Utah" },
  { value: "VT", label: "Vermont" },
  { value: "VA", label: "Virginia" },
  { value: "WA", label: "Washington" },
  { value: "WV", label: "West Virginia" },
  { value: "WI", label: "Wisconsin" },
  { value: "WY", label: "Wyoming" },
];

function PaymentForm({ 
  enrollmentId, 
  onSuccess 
}: { 
  enrollmentId: string;
  onSuccess: () => void;
}) {
  const stripe = useStripe();
  const elements = useElements();
  const [isProcessing, setIsProcessing] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!stripe || !elements) {
      return;
    }

    setIsProcessing(true);
    setErrorMessage(null);

    const { error, paymentIntent } = await stripe.confirmPayment({
      elements,
      confirmParams: {
        return_url: `${window.location.origin}/online-course-confirmation?enrollmentId=${enrollmentId}`,
      },
      redirect: "if_required",
    });

    if (error) {
      setErrorMessage(error.message || "An error occurred with your payment");
      setIsProcessing(false);
    } else if (paymentIntent && paymentIntent.status === "succeeded") {
      toast({
        title: "Payment successful!",
        description: "Your enrollment is being processed. You'll receive your login details shortly.",
      });
      onSuccess();
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="bg-muted/50 p-4 rounded-lg">
        <PaymentElement />
      </div>
      
      {errorMessage && (
        <div className="flex items-center gap-2 text-red-500 text-sm bg-red-500/10 p-3 rounded-lg">
          <AlertCircle className="h-4 w-4" />
          {errorMessage}
        </div>
      )}
      
      <Button 
        type="submit" 
        className="w-full bg-[#006d7a] hover:bg-[#004149] text-white font-heading uppercase tracking-wide py-6"
        disabled={!stripe || isProcessing}
        data-testid="button-submit-payment"
      >
        {isProcessing ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Processing...
          </>
        ) : (
          <>
            <CreditCard className="mr-2 h-4 w-4" />
            Complete Enrollment
          </>
        )}
      </Button>
    </form>
  );
}

export function OnlineCourseEnrollDialog({
  isOpen,
  onOpenChange,
  courseName,
  coursePrice,
}: OnlineCourseEnrollDialogProps) {
  const [step, setStep] = useState<"info" | "payment" | "success">("info");
  const [enrollmentId, setEnrollmentId] = useState<string | null>(null);
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [pricingDetails, setPricingDetails] = useState<{
    subtotal: number;
    tax: number;
    total: number;
  } | null>(null);
  const { toast } = useToast();

  const form = useForm<EnrollmentFormData>({
    resolver: zodResolver(enrollmentFormSchema),
    defaultValues: {
      firstName: "",
      lastName: "",
      email: "",
      phone: "",
      dateOfBirth: "",
      streetAddress: "",
      city: "",
      state: "NM",
      zipCode: "",
    },
  });

  const initiateEnrollmentMutation = useMutation({
    mutationFn: async (data: EnrollmentFormData) => {
      const response = await apiRequest("POST", "/api/online-course/initiate-enrollment", {
        ...data,
        courseName,
        coursePrice,
      });
      return response.json();
    },
    onSuccess: (data) => {
      setEnrollmentId(data.enrollmentId);
      setClientSecret(data.clientSecret);
      setPricingDetails({
        subtotal: data.subtotal,
        tax: data.tax,
        total: data.total,
      });
      setStep("payment");
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to initiate enrollment. Please try again.",
        variant: "destructive",
      });
    },
  });

  const onSubmitInfo = (data: EnrollmentFormData) => {
    initiateEnrollmentMutation.mutate(data);
  };

  const handlePaymentSuccess = () => {
    setStep("success");
  };

  const handleClose = () => {
    if (step !== "success") {
      onOpenChange(false);
    }
    if (step === "success") {
      setStep("info");
      setEnrollmentId(null);
      setClientSecret(null);
      setPricingDetails(null);
      form.reset();
      onOpenChange(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto bg-[#1D1D20] border-border">
        <DialogHeader>
          <DialogTitle className="text-xl font-heading uppercase tracking-widest text-foreground">
            {step === "success" ? "Enrollment Complete!" : `Enroll in ${courseName}`}
          </DialogTitle>
          {step === "info" && (
            <DialogDescription className="text-muted-foreground">
              Complete your information below to enroll in the online course.
            </DialogDescription>
          )}
          {step === "payment" && pricingDetails && (
            <DialogDescription className="text-muted-foreground">
              Review your order and complete payment.
            </DialogDescription>
          )}
        </DialogHeader>

        {step === "info" && (
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmitInfo)} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="firstName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>First Name</FormLabel>
                      <FormControl>
                        <Input 
                          placeholder="John" 
                          {...field} 
                          className="bg-background border-border"
                          data-testid="input-first-name"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="lastName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Last Name</FormLabel>
                      <FormControl>
                        <Input 
                          placeholder="Doe" 
                          {...field} 
                          className="bg-background border-border"
                          data-testid="input-last-name"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email</FormLabel>
                    <FormControl>
                      <Input 
                        type="email" 
                        placeholder="john@example.com" 
                        {...field} 
                        className="bg-background border-border"
                        data-testid="input-email"
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
                        type="tel" 
                        placeholder="(505) 555-1234" 
                        {...field} 
                        className="bg-background border-border"
                        data-testid="input-phone"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="dateOfBirth"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Date of Birth</FormLabel>
                    <FormControl>
                      <Input 
                        type="date" 
                        {...field} 
                        className="bg-background border-border"
                        data-testid="input-dob"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="streetAddress"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Street Address</FormLabel>
                    <FormControl>
                      <Input 
                        placeholder="123 Main St" 
                        {...field} 
                        className="bg-background border-border"
                        data-testid="input-street"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-6 gap-4">
                <FormField
                  control={form.control}
                  name="city"
                  render={({ field }) => (
                    <FormItem className="col-span-3">
                      <FormLabel>City</FormLabel>
                      <FormControl>
                        <Input 
                          placeholder="Albuquerque" 
                          {...field} 
                          className="bg-background border-border"
                          data-testid="input-city"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="state"
                  render={({ field }) => (
                    <FormItem className="col-span-1">
                      <FormLabel>State</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger className="bg-background border-border" data-testid="select-state">
                            <SelectValue placeholder="State" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {US_STATES.map((state) => (
                            <SelectItem key={state.value} value={state.value}>
                              {state.value}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="zipCode"
                  render={({ field }) => (
                    <FormItem className="col-span-2">
                      <FormLabel>ZIP Code</FormLabel>
                      <FormControl>
                        <Input 
                          placeholder="87102" 
                          {...field} 
                          className="bg-background border-border"
                          data-testid="input-zip"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="bg-muted/50 p-4 rounded-lg mt-4">
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">Course Price</span>
                  <span className="text-foreground font-bold">${coursePrice.toFixed(2)}</span>
                </div>
                <p className="text-xs text-muted-foreground mt-2">
                  NM Gross Receipts Tax will be calculated on the next step.
                </p>
              </div>

              <Button 
                type="submit" 
                className="w-full bg-[#006d7a] hover:bg-[#004149] text-white font-heading uppercase tracking-wide py-6"
                disabled={initiateEnrollmentMutation.isPending}
                data-testid="button-continue-to-payment"
              >
                {initiateEnrollmentMutation.isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Processing...
                  </>
                ) : (
                  <>
                    <User className="mr-2 h-4 w-4" />
                    Continue to Payment
                  </>
                )}
              </Button>
            </form>
          </Form>
        )}

        {step === "payment" && clientSecret && pricingDetails && (
          <div className="space-y-4">
            <div className="bg-muted/50 p-4 rounded-lg space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Course</span>
                <span className="text-foreground">{courseName}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Subtotal</span>
                <span className="text-foreground">${pricingDetails.subtotal.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">NM Gross Receipts Tax</span>
                <span className="text-foreground">${pricingDetails.tax.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-lg font-bold pt-2 border-t border-border">
                <span className="text-foreground">Total</span>
                <span className="text-foreground">${pricingDetails.total.toFixed(2)}</span>
              </div>
            </div>

            <Elements 
              stripe={stripePromise} 
              options={{ 
                clientSecret,
                appearance: {
                  theme: 'night',
                  variables: {
                    colorPrimary: '#006d7a',
                    colorBackground: '#1D1D20',
                    colorText: '#ffffff',
                    colorDanger: '#ef4444',
                    fontFamily: 'system-ui, sans-serif',
                    borderRadius: '8px',
                  },
                },
              }}
            >
              <PaymentForm 
                enrollmentId={enrollmentId!} 
                onSuccess={handlePaymentSuccess} 
              />
            </Elements>

            <Button 
              type="button" 
              variant="ghost"
              className="w-full text-muted-foreground hover:text-foreground"
              onClick={() => setStep("info")}
              data-testid="button-back-to-info"
            >
              Back to Information
            </Button>
          </div>
        )}

        {step === "success" && (
          <div className="text-center py-8 space-y-4">
            <div className="mx-auto w-16 h-16 bg-green-500/20 rounded-full flex items-center justify-center">
              <CheckCircle className="h-10 w-10 text-green-500" />
            </div>
            <h3 className="text-xl font-heading uppercase tracking-widest text-foreground">
              You're Enrolled!
            </h3>
            <p className="text-muted-foreground max-w-md mx-auto">
              Thank you for enrolling in {courseName}. Your Moodle login credentials will be sent to your email and phone shortly.
            </p>
            <p className="text-sm text-muted-foreground">
              Check your inbox (and spam folder) for your course access details.
            </p>
            <Button 
              onClick={handleClose}
              className="bg-[#006d7a] hover:bg-[#004149] text-white font-heading uppercase tracking-wide mt-4"
              data-testid="button-close-success"
            >
              Done
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
