import { useState, useEffect } from "react";
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
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { useToast } from "@/hooks/use-toast";
import { Loader2, CheckCircle, CreditCard, AlertCircle } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";

const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLIC_KEY || '');

const enrollmentFormSchema = z.object({
  firstName: z.string().min(1, "First name is required"),
  lastName: z.string().min(1, "Last name is required"),
  email: z.string().email("Please enter a valid email address"),
  phone: z.string().min(10, "Please enter a valid phone number"),
});

type EnrollmentFormData = z.infer<typeof enrollmentFormSchema>;

interface OnlineCourseEnrollDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  courseName: string;
  coursePrice: number;
}

interface CheckoutFormProps {
  enrollmentId: string;
  onSuccess: () => void;
  pricingDetails: {
    subtotal: number;
    tax: number;
    total: number;
  };
  courseName: string;
}

function CheckoutForm({ enrollmentId, onSuccess, pricingDetails, courseName }: CheckoutFormProps) {
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
            Complete Enrollment - ${pricingDetails.total.toFixed(2)}
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
  const [step, setStep] = useState<"form" | "success">("form");
  const [enrollmentId, setEnrollmentId] = useState<string | null>(null);
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [pricingDetails, setPricingDetails] = useState<{
    subtotal: number;
    tax: number;
    total: number;
  } | null>(null);
  const [isInitiating, setIsInitiating] = useState(false);
  const { toast } = useToast();

  const form = useForm<EnrollmentFormData>({
    resolver: zodResolver(enrollmentFormSchema),
    defaultValues: {
      firstName: "",
      lastName: "",
      email: "",
      phone: "",
    },
  });

  const initiateEnrollmentMutation = useMutation({
    mutationFn: async (data: EnrollmentFormData) => {
      const response = await apiRequest("POST", "/api/online-course/initiate-enrollment", {
        ...data,
        courseName,
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
      setIsInitiating(false);
    },
    onError: (error: Error) => {
      setIsInitiating(false);
      toast({
        title: "Error",
        description: error.message || "Failed to initiate enrollment. Please try again.",
        variant: "destructive",
      });
    },
  });

  const watchedValues = form.watch();
  
  useEffect(() => {
    const { firstName, lastName, email, phone } = watchedValues;
    const isValid = firstName && lastName && email && phone && phone.length >= 10;
    
    if (isValid && !clientSecret && !isInitiating && !initiateEnrollmentMutation.isPending) {
      const emailValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
      if (emailValid) {
        setIsInitiating(true);
        initiateEnrollmentMutation.mutate({ firstName, lastName, email, phone });
      }
    }
  }, [watchedValues.firstName, watchedValues.lastName, watchedValues.email, watchedValues.phone]);

  const handlePaymentSuccess = () => {
    setStep("success");
  };

  const handleClose = () => {
    if (step === "success") {
      setStep("form");
      setEnrollmentId(null);
      setClientSecret(null);
      setPricingDetails(null);
      setIsInitiating(false);
      form.reset();
    }
    onOpenChange(false);
  };

  const handleOpenChange = (open: boolean) => {
    if (!open) {
      handleClose();
    } else {
      onOpenChange(open);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-[500px] max-h-[90vh] overflow-y-auto bg-[#1D1D20] border-border">
        <DialogHeader>
          <DialogTitle className="text-xl font-heading uppercase tracking-widest text-foreground">
            {step === "success" ? "Enrollment Complete!" : `Enroll in ${courseName}`}
          </DialogTitle>
          {step === "form" && (
            <DialogDescription className="text-muted-foreground">
              Complete your information below to enroll in the online course.
            </DialogDescription>
          )}
        </DialogHeader>

        {step === "form" && (
          <div className="space-y-6">
            <Form {...form}>
              <div className="space-y-4">
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
              </div>
            </Form>

            {clientSecret && pricingDetails ? (
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
                <CheckoutForm 
                  enrollmentId={enrollmentId!} 
                  onSuccess={handlePaymentSuccess}
                  pricingDetails={pricingDetails}
                  courseName={courseName}
                />
              </Elements>
            ) : (
              <div className="bg-muted/50 p-4 rounded-lg">
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">Course Price</span>
                  <span className="text-foreground font-bold">${coursePrice.toFixed(2)}</span>
                </div>
                <p className="text-xs text-muted-foreground mt-2">
                  {isInitiating || initiateEnrollmentMutation.isPending ? (
                    <span className="flex items-center gap-2">
                      <Loader2 className="h-3 w-3 animate-spin" />
                      Loading payment form...
                    </span>
                  ) : (
                    "Complete the form above to see payment options. NM Gross Receipts Tax will be added."
                  )}
                </p>
              </div>
            )}
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
