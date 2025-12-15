import { useState, useEffect } from "react";
import { useLocation, useRoute } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useStripe, useElements, PaymentElement, Elements } from '@stripe/react-stripe-js';
import { loadStripe } from '@stripe/stripe-js';
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { Layout } from "@/components/Layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Badge } from "@/components/ui/badge";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Clock, Calendar, User, DollarSign, Users, CreditCard, Shield, Tag, Check, X } from "lucide-react";
import type { CourseWithSchedules, CourseSchedule } from "@shared/schema";
import { formatDateSafe } from "@/lib/dateUtils";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { PolicyModal } from "@/components/PolicyModal";

// Load Stripe outside of component render (if configured)
const stripePublicKey = import.meta.env.VITE_STRIPE_PUBLIC_KEY;
const stripePromise = stripePublicKey ? loadStripe(stripePublicKey) : null;

interface CheckoutFormProps {
  enrollment: any;
  confirmEnrollmentMutation: any;
  giftCardApplied?: {
    giftCardId: string;
    amountToApply: number;
    remainingBalance: number;
    amountLeft: number;
    code: string;
  } | null;
  taxInfo?: {
    subtotal: number;
    tax: number;
    total: number;
  } | null;
}

const CheckoutForm = ({ enrollment, confirmEnrollmentMutation, giftCardApplied, taxInfo }: CheckoutFormProps) => {
  const stripe = useStripe();
  const elements = useElements();
  const { toast } = useToast();
  const [isProcessing, setIsProcessing] = useState(false);

  // Calculate the payment amount after gift card
  const getPaymentAmount = () => {
    const baseAmount = taxInfo?.total ?? 0;
    const giftCardAmount = giftCardApplied?.amountToApply ?? 0;
    return Math.max(0, baseAmount - giftCardAmount);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!stripe || !elements) {
      return;
    }

    setIsProcessing(true);

    try {
      const { error, paymentIntent } = await stripe.confirmPayment({
        elements,
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
        // If there's a gift card applied, redeem it first
        if (giftCardApplied) {
          try {
            await apiRequest("POST", "/api/gift-cards/redeem", {
              giftCardId: giftCardApplied.giftCardId,
              amount: giftCardApplied.amountToApply,
              enrollmentId: enrollment.id,
            });
          } catch (redeemError: any) {
            console.error("Gift card redemption failed:", redeemError);
            // Continue with enrollment confirmation even if gift card redemption fails
            // The payment has already been processed
          }
        }

        // Confirm the enrollment on our backend
        confirmEnrollmentMutation.mutate({
          enrollmentId: enrollment.id,
          paymentIntentId: paymentIntent.id,
        });
      }
    } catch (err) {
      toast({
        title: "Payment Failed",
        description: "An unexpected error occurred. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const displayAmount = getPaymentAmount();

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <PaymentElement />

      {giftCardApplied && (
        <div className="p-3 bg-purple-50 dark:bg-purple-900/20 rounded-lg text-sm">
          <div className="flex justify-between text-purple-700 dark:text-purple-300">
            <span>Gift Card Credit:</span>
            <span>-${giftCardApplied.amountToApply.toFixed(2)}</span>
          </div>
          <div className="flex justify-between font-semibold mt-1">
            <span>Amount to charge:</span>
            <span>${displayAmount.toFixed(2)}</span>
          </div>
        </div>
      )}

      <div className="flex items-center space-x-2 text-sm text-success">
        <Shield className="h-4 w-4" />
        <span>Secured by Stripe - Your payment information is encrypted</span>
      </div>

      <Button
        type="submit"
        size="lg"
        className="w-full bg-secondary text-secondary-foreground hover:bg-secondary/90"
        disabled={!stripe || isProcessing || confirmEnrollmentMutation.isPending}
        data-testid="button-complete-payment"
      >
        {isProcessing || confirmEnrollmentMutation.isPending ? (
          <>
            <div className="animate-spin w-4 h-4 border-2 border-transparent border-t-current rounded-full mr-2" />
            Processing Payment...
          </>
        ) : (
          <>
            <CreditCard className="mr-2 h-4 w-4" />
            Complete Payment - ${displayAmount.toFixed(2)}
          </>
        )}
      </Button>
    </form>
  );
};




export default function CourseRegistration() {
  const [, params] = useRoute("/course-registration/:id");
  const [, setLocation] = useLocation();
  const { isAuthenticated, user } = useAuth();
  const { toast } = useToast();

  const [selectedSchedule, setSelectedSchedule] = useState<CourseSchedule | null>(null);
  const [clientSecret, setClientSecret] = useState("");
  const [taxInfo, setTaxInfo] = useState<{subtotal: number, tax: number, total: number, tax_included: boolean, originalAmount?: number, discountAmount?: number, promoCode?: any, handgunRentalFee?: number} | null>(null);
  const [handgunRentalAdded, setHandgunRentalAdded] = useState(false);
  const [promoCode, setPromoCode] = useState("");
  const [promoCodeApplied, setPromoCodeApplied] = useState<string | null>(null);
  const [isValidatingPromo, setIsValidatingPromo] = useState(false);
  const [promoError, setPromoError] = useState<string | null>(null);
  const [currentEnrollment, setCurrentEnrollment] = useState<any>(null);
  const [isDraftCreated, setIsDraftCreated] = useState(false);

  // Gift Card state
  const [giftCardCode, setGiftCardCode] = useState("");
  const [giftCardApplied, setGiftCardApplied] = useState<{
    giftCardId: string;
    amountToApply: number;
    remainingBalance: number;
    amountLeft: number;
    code: string;
  } | null>(null);
  const [isValidatingGiftCard, setIsValidatingGiftCard] = useState(false);
  const [giftCardError, setGiftCardError] = useState<string | null>(null);

  // State for policy modals
  const [policyModalOpen, setPolicyModalOpen] = useState<'terms' | 'privacy' | 'refund' | null>(null);

  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    agreeToTerms: false,
    paymentOption: 'full' as 'full' | 'deposit', // Default to full payment
    // Account creation fields (for non-authenticated users)
    password: '',
    confirmPassword: '',
    createAccount: !isAuthenticated, // Default to true if not authenticated
  });

  // Helper function to format date for HTML date input (YYYY-MM-DD) - timezone-safe
  const formatDateForInput = (dateValue: Date | string | null | undefined): string => {
    if (!dateValue) return '';

    try {
      // If already in YYYY-MM-DD format, return as-is
      if (typeof dateValue === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(dateValue)) {
        return dateValue;
      }

      // Convert to date and use UTC to avoid timezone shifts
      const date = typeof dateValue === 'string' ? new Date(dateValue) : dateValue;
      if (isNaN(date.getTime())) return '';

      // Use toISOString and slice to get YYYY-MM-DD without timezone conversion
      return date.toISOString().slice(0, 10);
    } catch (error) {
      return '';
    }
  };

  // Fetch all courses
  const { data: course, isLoading: courseLoading } = useQuery<CourseWithSchedules>({
    queryKey: ["/api/courses", params?.id],
    enabled: !!params?.id,
  });

  // Auto-populate form fields for logged-in students
  useEffect(() => {
    if (isAuthenticated && user) {
      setFormData(prev => ({
        ...prev,
        firstName: (user as any)?.firstName || '',
        lastName: (user as any)?.lastName || '',
        email: (user as any)?.email || '',
        phone: (user as any)?.phone || '',
        createAccount: false, // User is already authenticated
      }));
    }
  }, [isAuthenticated, user]);

  // Calculate the payment amount based on the payment option
  const getPaymentAmount = (enrollment: any) => {
    if (!enrollment) return 0;

    const coursePrice = parseFloat(enrollment.course.price);
    const depositAmount = enrollment.course.depositAmount ? parseFloat(enrollment.course.depositAmount) : null;

    if (enrollment.paymentOption === 'deposit' && depositAmount) {
      return depositAmount;
    }
    return coursePrice;
  };

  const validateAndApplyPromoCode = async () => {
    if (!promoCode.trim() || !currentEnrollment) return;

    setIsValidatingPromo(true);
    setPromoError(null);

    try {
      const data = await apiRequest("POST", "/api/course-registration/payment-intent", {
        enrollmentId: currentEnrollment.id,
        promoCode: promoCode.trim(),
        paymentOption: formData.paymentOption,
      });

      // Handle free enrollment (100% discount)
      if (data.isFree) {
        setPromoCodeApplied(promoCode.trim());
        setTaxInfo({
          originalAmount: data.originalAmount,
          subtotal: 0,
          discountAmount: data.discountAmount || 0,
          tax: 0,
          total: 0,
          tax_included: false,
          promoCode: data.promoCode
        });
        toast({
          title: "Promo Code Applied!",
          description: `This course is now free! You saved $${data.originalAmount?.toFixed(2) || '0.00'}`,
        });
      } else if (data.clientSecret) {
        setPromoCodeApplied(promoCode.trim());
        setClientSecret(data.clientSecret);
        setTaxInfo({
          originalAmount: data.originalAmount,
          subtotal: data.subtotal,
          discountAmount: data.discountAmount || 0,
          tax: data.tax,
          total: data.total,
          tax_included: data.tax_included,
          promoCode: data.promoCode
        });
        toast({
          title: "Promo Code Applied!",
          description: `You saved $${data.discountAmount?.toFixed(2) || '0.00'}`,
        });
      } else {
        setPromoError(data.error || "Invalid promo code");
        toast({
          title: "Invalid Promo Code",
          description: data.error || "Please check your code and try again.",
          variant: "destructive",
        });
      }
    } catch (error: any) {
      const errorMessage = error.message || "Failed to validate promo code";
      setPromoError(errorMessage);
      toast({
        title: "Validation Failed",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setIsValidatingPromo(false);
    }
  };

  const removePromoCode = async () => {
    setPromoCode("");
    setPromoCodeApplied(null);
    setPromoError(null);
    toast({
      title: "Promo Code Removed",
      description: "The discount has been removed from your order.",
    });
    // Recreate payment intent without promo code
    if (currentEnrollment) {
      createPaymentIntentMutation.mutate({
        enrollmentId: currentEnrollment.id,
        paymentOption: formData.paymentOption,
      });
    }
  };

  // Calculate the amount that would need to be paid (after promo and gift card)
  const getAmountAfterDiscounts = () => {
    const baseAmount = taxInfo?.total ?? 0;
    const giftCardAmount = giftCardApplied?.amountToApply ?? 0;
    return Math.max(0, baseAmount - giftCardAmount);
  };

  const validateAndApplyGiftCard = async () => {
    if (!giftCardCode.trim() || !taxInfo) return;

    setIsValidatingGiftCard(true);
    setGiftCardError(null);

    try {
      const amountNeeded = taxInfo.total - (giftCardApplied?.amountToApply ?? 0);
      
      const result = await apiRequest("POST", "/api/gift-cards/apply", {
        code: giftCardCode.trim().toUpperCase(),
        amount: amountNeeded,
      });

      if (!result.isValid) {
        setGiftCardError(result.error || "Invalid gift card code");
        toast({
          title: "Invalid Gift Card",
          description: result.error || "Please check your code and try again.",
          variant: "destructive",
        });
        return;
      }

      setGiftCardApplied({
        giftCardId: result.giftCardId,
        amountToApply: result.amountToApply,
        remainingBalance: result.remainingBalance,
        amountLeft: result.amountLeft || (result.remainingBalance - result.amountToApply),
        code: giftCardCode.trim().toUpperCase(),
      });
      setGiftCardCode("");
      
      toast({
        title: "Gift Card Applied!",
        description: `$${result.amountToApply.toFixed(2)} will be applied to your order.`,
      });

      // If gift card covers the full amount, we may not need Stripe
      const remainingToPay = taxInfo.total - result.amountToApply;
      if (remainingToPay <= 0) {
        // Gift card covers everything - no need for payment intent
        setClientSecret("");
      } else if (currentEnrollment && remainingToPay !== taxInfo.total) {
        // Need to update payment intent with reduced amount
        // For now, we'll handle this at confirmation time
      }
    } catch (error: any) {
      const errorMessage = error.message || "Failed to validate gift card";
      setGiftCardError(errorMessage);
      toast({
        title: "Validation Failed",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setIsValidatingGiftCard(false);
    }
  };

  const removeGiftCard = () => {
    setGiftCardApplied(null);
    setGiftCardCode("");
    setGiftCardError(null);
    toast({
      title: "Gift Card Removed",
      description: "The gift card has been removed from your order.",
    });
  };

  // Create draft enrollment when schedule is selected and form is valid
  const createDraftEnrollment = async (schedule: CourseSchedule) => {
    if (!course) {
      toast({
        title: "Error",
        description: "Course information not available",
        variant: "destructive",
      });
      return false;
    }

    if (!isAuthenticated && formData.createAccount) {
      if (!formData.password || formData.password.length < 6) {
        toast({
          title: "Password Required",
          description: "Password must be at least 6 characters long",
          variant: "destructive",
        });
        return false;
      }

      if (formData.password !== formData.confirmPassword) {
        toast({
          title: "Password Mismatch",
          description: "Passwords do not match",
          variant: "destructive",
        });
        return false;
      }
    }

    // Check required fields
    if (!formData.firstName || !formData.lastName || !formData.email || !formData.phone) {
      toast({
        title: "Required Fields Missing",
        description: "Please fill in all required student information fields",
        variant: "destructive",
      });
      return false;
    }

    if (!formData.agreeToTerms) {
      toast({
        title: "Terms Required",
        description: "Please agree to the terms and conditions",
        variant: "destructive",
      });
      return false;
    }

    initiateDraftMutation.mutate({
      courseId: course.id,
      scheduleId: schedule.id,
      paymentOption: formData.paymentOption,
      studentInfo: {
        firstName: formData.firstName,
        lastName: formData.lastName,
        email: formData.email,
        phone: formData.phone,
      },
      accountCreation: !isAuthenticated && formData.createAccount ? {
        password: formData.password,
      } : undefined,
    });

    return true;
  };


  const initiateDraftMutation = useMutation({
    mutationFn: async (enrollmentData: any) => {
      return await apiRequest("POST", "/api/course-registration/initiate", enrollmentData);
    },
    onSuccess: (enrollment) => {
      setCurrentEnrollment(enrollment);
      setIsDraftCreated(true);
      
      // Only create payment intent if the course has a price > 0
      if (course && parseFloat(course.price) > 0) {
        createPaymentIntentMutation.mutate({
          enrollmentId: enrollment.id,
          paymentOption: formData.paymentOption,
          handgunRentalAdded,
        });
      }
    },
    onError: (error) => {
      toast({
        title: "Registration Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const createPaymentIntentMutation = useMutation({
    mutationFn: async ({ enrollmentId, paymentOption, promoCode, handgunRentalAdded }: { enrollmentId: string; paymentOption: string; promoCode?: string; handgunRentalAdded?: boolean }) => {
      return await apiRequest("POST", "/api/course-registration/payment-intent", {
        enrollmentId,
        paymentOption,
        promoCode,
        handgunRentalAdded,
      });
    },
    onSuccess: (data) => {
      setClientSecret(data.clientSecret);
      setTaxInfo({
        originalAmount: data.originalAmount,
        subtotal: data.subtotal,
        discountAmount: data.discountAmount || 0,
        tax: data.tax,
        total: data.total,
        tax_included: data.tax_included,
        promoCode: data.promoCode,
        handgunRentalFee: data.handgunRentalFee,
      });
    },
    onError: (error) => {
      toast({
        title: "Payment Setup Failed",
        description: "Unable to initialize payment. Please try again.",
        variant: "destructive",
      });
    },
  });

  const confirmEnrollmentMutation = useMutation({
    mutationFn: async ({ enrollmentId, paymentIntentId, studentInfo }: { enrollmentId: string; paymentIntentId: string; studentInfo?: { firstName: string; lastName: string; email: string } }) => {
      return await apiRequest("POST", "/api/course-registration/confirm", {
        enrollmentId,
        paymentIntentId,
        ...(studentInfo && { studentInfo }),
      });
    },
    onSuccess: () => {
      toast({
        title: "Registration Successful",
        description: "Your course registration is confirmed!",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/student/enrollments"] });
      setLocation('/student-portal');
    },
    onError: (error) => {
      toast({
        title: "Registration Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });


  // Handle schedule selection and trigger payment form
  const handleScheduleChange = async (scheduleId: string) => {
    const schedule = availableSchedules.find(s => s.id === scheduleId);
    if (!schedule) return;

    setSelectedSchedule(schedule);

    // Create draft enrollment if we have all required info
    if (formData.firstName && formData.lastName && formData.email && formData.phone && formData.agreeToTerms) {
      await createDraftEnrollment(schedule);
    }
  };

  // Update payment option and recreate payment intent
  const handlePaymentOptionChange = (paymentOption: 'full' | 'deposit') => {
    setFormData(prev => ({ ...prev, paymentOption }));

    if (currentEnrollment && isDraftCreated) {
      createPaymentIntentMutation.mutate({
        enrollmentId: currentEnrollment.id,
        paymentOption,
        promoCode: promoCodeApplied || undefined,
        handgunRentalAdded,
      });
    }
  };

  // Handle handgun rental option change
  const handleHandgunRentalChange = (checked: boolean) => {
    setHandgunRentalAdded(checked);
    
    if (currentEnrollment && isDraftCreated) {
      createPaymentIntentMutation.mutate({
        enrollmentId: currentEnrollment.id,
        paymentOption: formData.paymentOption,
        promoCode: promoCodeApplied || undefined,
        handgunRentalAdded: checked,
      });
    }
  };

  // Watch for form changes and create/update draft when ready
  useEffect(() => {
    if (selectedSchedule && formData.firstName && formData.lastName && formData.email && formData.phone && formData.agreeToTerms && !isDraftCreated) {
      createDraftEnrollment(selectedSchedule);
    }
  }, [formData, selectedSchedule, isDraftCreated]);

  if (courseLoading || !course) {
    return (
      <Layout>
        <div className="max-w-3xl mx-auto px-4 py-12">
          <div className="animate-pulse">
            <div className="h-8 bg-muted rounded w-1/2 mb-4" />
            <div className="h-4 bg-muted rounded w-3/4 mb-8" />
            <Card>
              <CardContent className="p-6">
                <div className="space-y-4">
                  <div className="h-4 bg-muted rounded w-full" />
                  <div className="h-4 bg-muted rounded w-2/3" />
                  <div className="h-4 bg-muted rounded w-1/2" />
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </Layout>
    );
  }

  const availableSchedules = course.schedules
    .filter(
      schedule => {
        if (schedule.deletedAt || new Date(schedule.startDate) <= new Date()) {
          return false;
        }
        // Calculate actual available spots based on enrollments
        const enrollmentCount = schedule.enrollments?.filter((e: any) => 
          e.status === 'confirmed' || e.status === 'pending'
        ).length || 0;
        const maxSpots = Number(schedule.maxSpots) || 0;
        const actualAvailableSpots = Math.max(0, maxSpots - enrollmentCount);
        return actualAvailableSpots > 0;
      }
    )
    .sort((a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime()); // Sort by earliest date first

  return (
    <Layout>
      <div className="max-w-3xl mx-auto px-4 py-12">
        <div className="mb-8">
          <h1 className="text-3xl font-medium text-foreground mb-4" data-testid="text-course-title">
            Register for {course.title}
          </h1>
          <div 
            className="text-muted-foreground" 
            dangerouslySetInnerHTML={{ __html: course.description }}
          />
        </div>

        {/* Course Summary */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle>Course Information</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4">
              <div className="text-center">
                <div className="text-xl font-bold text-primary mb-1" data-testid="text-course-price">
                  ${course.price}
                </div>
                <div className="text-sm text-muted-foreground">Price</div>
              </div>
              <div className="text-center">
                <div className="text-xl font-bold text-accent mb-1" data-testid="text-course-duration">
                  {course.duration}
                </div>
                <div className="text-sm text-muted-foreground">Duration</div>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="space-y-8">
          {/* Schedule Selection */}
          <Card>
            <CardHeader>
              <CardTitle>Choose Course Date</CardTitle>
            </CardHeader>
            <CardContent>
              {availableSchedules.length > 0 ? (
                <div className="space-y-4">
                  <Label htmlFor="schedule">Available Dates *</Label>
                  <Select onValueChange={handleScheduleChange}>
                    <SelectTrigger data-testid="select-course-schedule">
                      <SelectValue placeholder="Select a course date" />
                    </SelectTrigger>
                    <SelectContent>
                      {availableSchedules.map((schedule) => {
                        // Calculate actual available spots
                        const enrollmentCount = schedule.enrollments?.filter((e: any) => 
                          e.status === 'confirmed' || e.status === 'pending'
                        ).length || 0;
                        const maxSpots = Number(schedule.maxSpots) || 0;
                        const actualAvailableSpots = Math.max(0, maxSpots - enrollmentCount);
                        
                        return (
                          <SelectItem key={schedule.id} value={schedule.id}>
                            <div className="flex items-center justify-between w-full">
                              <div className="flex flex-col">
                                <span className="font-medium">
                                  {formatDateSafe(schedule.startDate.toString())} - {formatDateSafe(schedule.endDate.toString())}
                                </span>
                                {schedule.location && (
                                  <span className="text-xs text-muted-foreground">
                                    📍 {schedule.location}
                                  </span>
                                )}
                              </div>
                              <span className="text-xs text-success ml-4">
                                {actualAvailableSpots} spots left
                              </span>
                            </div>
                          </SelectItem>
                        );
                      })}
                    </SelectContent>
                  </Select>
                  {selectedSchedule && (() => {
                    // Calculate actual available spots for selected schedule
                    const enrollmentCount = selectedSchedule.enrollments?.filter((e: any) => 
                      e.status === 'confirmed' || e.status === 'pending'
                    ).length || 0;
                    const maxSpots = Number(selectedSchedule.maxSpots) || 0;
                    const actualAvailableSpots = Math.max(0, maxSpots - enrollmentCount);
                    
                    return (
                      <div className="p-3 bg-accent/10 border border-accent/20 rounded-lg">
                        <div className="text-sm">
                          <div className="font-medium text-accent mb-1">Selected Date:</div>
                          <div className="flex items-center text-muted-foreground">
                            <Calendar className="mr-2 h-4 w-4 text-accent" />
                            {formatDateSafe(selectedSchedule.startDate.toString())} - {formatDateSafe(selectedSchedule.endDate.toString())}
                          </div>
                          {selectedSchedule.location && (
                            <div className="flex items-center text-muted-foreground mt-1">
                              <span className="mr-2">📍</span>
                              {selectedSchedule.location}
                            </div>
                          )}
                          <div className="flex items-center text-success mt-1">
                            <Users className="mr-2 h-4 w-4" />
                            {actualAvailableSpots} spots available
                          </div>
                        </div>
                      </div>
                    );
                  })()}
                </div>
              ) : (
                <div className="text-center py-8">
                  <Calendar className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
                  <h3 className="text-lg font-medium text-muted-foreground mb-2">No schedules available</h3>
                  <p className="text-sm text-muted-foreground">Please check back later for new course dates</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Student Information */}
          <Card>
            <CardHeader>
              <CardTitle>Student Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="firstName">First Name *</Label>
                  <Input
                    id="firstName"
                    value={formData.firstName}
                    onChange={(e) => setFormData(prev => ({ ...prev, firstName: e.target.value }))}
                    required
                    data-testid="input-first-name"
                  />
                </div>
                <div>
                  <Label htmlFor="lastName">Last Name *</Label>
                  <Input
                    id="lastName"
                    value={formData.lastName}
                    onChange={(e) => setFormData(prev => ({ ...prev, lastName: e.target.value }))}
                    required
                    data-testid="input-last-name"
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="email">Email Address *</Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                  required
                  data-testid="input-email"
                />
              </div>

              <div>
                <Label htmlFor="phone">Phone Number *</Label>
                <Input
                  id="phone"
                  type="tel"
                  value={formData.phone}
                  onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))}
                  required
                  data-testid="input-phone"
                />
              </div>

            </CardContent>
          </Card>

          {/* Account Creation (for non-authenticated users) */}
          {!isAuthenticated && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <User className="mr-2 h-5 w-5" />
                  Create Your Account
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-sm text-muted-foreground">
                  Create a secure account to complete your registration and track your training progress.
                </p>

                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="createAccount"
                    checked={formData.createAccount}
                    onCheckedChange={(checked) => 
                      setFormData(prev => ({ ...prev, createAccount: checked as boolean }))
                    }
                    data-testid="checkbox-create-account"
                  />
                  <Label htmlFor="createAccount" className="text-sm font-medium">
                    Create an account for me (recommended)
                  </Label>
                </div>

                {formData.createAccount && (
                  <div className="space-y-4 pl-6 border-l-2 border-primary/20">
                    <div>
                      <Label htmlFor="password">Password *</Label>
                      <Input
                        id="password"
                        type="password"
                        value={formData.password}
                        onChange={(e) => setFormData(prev => ({ ...prev, password: e.target.value }))}
                        placeholder="Minimum 6 characters"
                        required={formData.createAccount}
                        data-testid="input-password"
                      />
                    </div>
                    <div>
                      <Label htmlFor="confirmPassword">Confirm Password *</Label>
                      <Input
                        id="confirmPassword"
                        type="password"
                        value={formData.confirmPassword}
                        onChange={(e) => setFormData(prev => ({ ...prev, confirmPassword: e.target.value }))}
                        placeholder="Confirm your password"
                        required={formData.createAccount}
                        data-testid="input-confirm-password"
                      />
                    </div>
                    <div className="text-xs text-muted-foreground space-y-1">
                      <p>Benefits of creating an account:</p>
                      <ul className="list-disc list-inside space-y-1 ml-2">
                        <li>Track your training progress</li>
                        <li>View certificates and completion records</li>
                        <li>Receive updates about future courses</li>
                        <li>Faster registration for future courses</li>
                      </ul>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Payment Options */}
          {course && parseFloat(course.price) > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <DollarSign className="mr-2 h-5 w-5" />
                  Payment Options
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <RadioGroup
                  value={formData.paymentOption}
                  onValueChange={handlePaymentOptionChange}
                  className="space-y-3"
                >
                  <div className="flex items-center space-x-2 p-3 border rounded-lg hover:bg-muted/50 transition-colors">
                    <RadioGroupItem value="full" id="full" data-testid="radio-full-payment" />
                    <Label htmlFor="full" className="flex-1 cursor-pointer">
                      <div className="font-medium">Full Payment</div>
                      <div className="text-sm text-muted-foreground">
                        Pay the complete course fee: ${course.price}
                      </div>
                    </Label>
                  </div>

                  {course.depositAmount && (
                    <div className="flex items-center space-x-2 p-3 border rounded-lg hover:bg-muted/50 transition-colors">
                      <RadioGroupItem value="deposit" id="deposit" data-testid="radio-deposit-payment" />
                      <Label htmlFor="deposit" className="flex-1 cursor-pointer">
                        <div className="font-medium">Deposit Only</div>
                        <div className="text-sm text-muted-foreground">
                          Pay deposit now: ${course.depositAmount} (remaining ${(parseFloat(course.price) - parseFloat(course.depositAmount)).toFixed(2)} due later)
                        </div>
                      </Label>
                    </div>
                  )}
                </RadioGroup>

                {!course.depositAmount && (
                  <p className="text-sm text-muted-foreground">
                    Only full payment is available for this course.
                  </p>
                )}
              </CardContent>
            </Card>
          )}

          {/* Handgun Rental Upsell Option - Only for concealed carry courses */}
          {course && parseFloat(course.price) > 0 && selectedSchedule && (
            <Card className="border-2 border-dashed border-primary/30 bg-primary/5">
              <CardHeader>
                <CardTitle className="flex items-center text-primary">
                  <Shield className="mr-2 h-5 w-5" />
                  Handgun Rental Option
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-start space-x-3">
                  <Checkbox
                    id="handgun-rental"
                    checked={handgunRentalAdded}
                    onCheckedChange={handleHandgunRentalChange}
                    data-testid="checkbox-handgun-rental"
                    className="mt-1"
                  />
                  <div className="flex-1">
                    <Label htmlFor="handgun-rental" className="cursor-pointer">
                      <div className="flex items-center justify-between">
                        <span className="font-semibold text-foreground">Add Rental Handgun + Ammunition</span>
                        <Badge variant="secondary" className="ml-2">+$25.00</Badge>
                      </div>
                      <p className="text-sm text-muted-foreground mt-1">
                        Don't have your own handgun? We've got you covered! Includes rental handgun and all ammunition needed for the course.
                      </p>
                    </Label>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Payment Section - Show immediately when schedule is selected */}
          {selectedSchedule && parseFloat(course.price) > 0 && (
            <div className="space-y-6">
              <div className="text-center">
                <h2 className="text-2xl font-bold text-foreground mb-2">Complete Your Payment</h2>
                <p className="text-muted-foreground">Secure payment powered by Stripe</p>
              </div>

              {/* Order Summary */}
              <Card>
                <CardHeader>
                  <CardTitle>Order Summary</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex items-start justify-between">
                      <div>
                        <h4 className="font-semibold text-foreground" data-testid="text-order-course-title">
                          {course.title}
                        </h4>
                        <p className="text-sm text-muted-foreground">
                          {selectedSchedule.startDate ? new Date(selectedSchedule.startDate).toLocaleDateString() : 'TBD'} - {course.duration || 'TBD'}
                        </p>
                        {selectedSchedule.location && (
                          <p className="text-sm text-muted-foreground">📍 {selectedSchedule.location}</p>
                        )}
                      </div>
                      <div className="text-right">
                        <div className="text-2xl font-bold text-primary" data-testid="text-order-price">
                          ${formData.paymentOption === 'deposit' && course.depositAmount ? course.depositAmount : course.price}
                        </div>
                        <div className="flex gap-2 mt-2">
                          <Badge variant="outline">
                            {typeof currentEnrollment?.course?.category === 'string' ? currentEnrollment.course.category : 
                             (currentEnrollment?.course?.category && typeof currentEnrollment.course.category === 'object' && 'name' in currentEnrollment.course.category) 
                               ? (currentEnrollment.course.category as any).name || 'General' 
                               : 'General'}
                          </Badge>
                          {currentEnrollment?.paymentOption === 'deposit' && (
                            <Badge variant="secondary">
                              Deposit Payment
                            </Badge>
                          )}
                          {taxInfo?.tax_included && (
                            <Badge variant="default">
                              Tax Included
                            </Badge>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="border-t pt-4">
                      {currentEnrollment?.paymentOption === 'deposit' && currentEnrollment?.course?.depositAmount && (
                        <div className="flex justify-between text-sm text-muted-foreground">
                          <span>Remaining balance (due later)</span>
                          <span>${currentEnrollment?.course?.price && currentEnrollment?.course?.depositAmount ? (parseFloat(currentEnrollment.course.price) - parseFloat(currentEnrollment.course.depositAmount)).toFixed(2) : '0.00'}</span>
                        </div>
                      )}

                      <div className="flex justify-between text-sm text-muted-foreground">
                        <span>Subtotal</span>
                        <span>${taxInfo?.subtotal?.toFixed(2) || getPaymentAmount(currentEnrollment)}</span>
                      </div>

                      {/* Show handgun rental if added */}
                      {taxInfo?.handgunRentalFee && taxInfo.handgunRentalFee > 0 && (
                        <div className="flex justify-between text-sm text-blue-600 dark:text-blue-400">
                          <span>Handgun Rental + Ammo</span>
                          <span data-testid="text-rental-amount">+${taxInfo.handgunRentalFee.toFixed(2)}</span>
                        </div>
                      )}

                      {/* Show discount if applied */}
                      {taxInfo?.discountAmount && taxInfo.discountAmount > 0 && (
                        <div className="flex justify-between text-sm text-green-600 dark:text-green-400">
                          <span>Discount ({promoCodeApplied})</span>
                          <span data-testid="text-discount-amount">-${taxInfo.discountAmount.toFixed(2)}</span>
                        </div>
                      )}

                      {taxInfo?.tax_included && taxInfo.tax > 0 && (
                        <div className="flex justify-between text-sm text-muted-foreground">
                          <span>Tax (7.63%)</span>
                          <span>${taxInfo.tax.toFixed(2)}</span>
                        </div>
                      )}
                      <div className="flex justify-between text-sm text-muted-foreground">
                        <span>Processing fee</span>
                        <span>$0.00</span>
                      </div>
                      <div className="flex justify-between font-semibold text-lg mt-2 pt-2 border-t">
                        <span>Total due today</span>
                        <span data-testid="text-total-amount">${taxInfo?.total?.toFixed(2) || getPaymentAmount(currentEnrollment)}</span>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Promo Code Section */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <Tag className="mr-2 h-5 w-5" />
                    Promo Code
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <p className="text-sm text-muted-foreground">
                    Have a promo code? Enter it below to apply any available discounts to your order.
                  </p>

                  {!promoCodeApplied ? (
                    <div className="flex gap-2">
                      <Input
                        placeholder="Enter promo code"
                        value={promoCode}
                        onChange={(e) => setPromoCode(e.target.value.toUpperCase())}
                        onKeyDown={(e) => e.key === 'Enter' && validateAndApplyPromoCode()}
                        className="flex-1"
                        data-testid="input-promo-code"
                      />
                      <Button 
                        onClick={validateAndApplyPromoCode}
                        disabled={!promoCode.trim() || isValidatingPromo || !currentEnrollment}
                        size="sm"
                        data-testid="button-apply-promo"
                      >
                        {isValidatingPromo ? "Checking..." : "Apply"}
                      </Button>
                    </div>
                  ) : (
                    <div className="flex items-center justify-between bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-300 p-3 rounded-lg">
                      <div className="flex items-center gap-2">
                        <Check className="h-4 w-4" />
                        <span className="text-sm font-medium" data-testid="text-applied-promo">
                          {promoCodeApplied} applied
                        </span>
                        {taxInfo?.discountAmount && (
                          <span className="text-sm">- Saved ${taxInfo.discountAmount.toFixed(2)}</span>
                        )}
                      </div>
                      <Button 
                        onClick={removePromoCode}
                        variant="ghost" 
                        size="sm"
                        className="h-auto p-1 text-green-700 dark:text-green-300 hover:text-green-900 dark:hover:text-green-100"
                        data-testid="button-remove-promo"
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    </div>
                  )}

                  {promoError && (
                    <div className="text-red-600 text-sm mt-1" data-testid="text-promo-error">
                      {promoError}
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Gift Card Section */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <CreditCard className="mr-2 h-5 w-5" />
                    Gift Card
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <p className="text-sm text-muted-foreground">
                    Have a gift card? Enter the code below to apply it to your order.
                  </p>

                  {!giftCardApplied ? (
                    <div className="flex gap-2">
                      <Input
                        placeholder="Enter gift card code (e.g., GC-XXXX-XXXX-XXXX)"
                        value={giftCardCode}
                        onChange={(e) => setGiftCardCode(e.target.value.toUpperCase())}
                        onKeyDown={(e) => e.key === 'Enter' && validateAndApplyGiftCard()}
                        className="flex-1"
                        data-testid="input-gift-card-code"
                      />
                      <Button 
                        onClick={validateAndApplyGiftCard}
                        disabled={!giftCardCode.trim() || isValidatingGiftCard || !taxInfo}
                        size="sm"
                        data-testid="button-apply-gift-card"
                      >
                        {isValidatingGiftCard ? "Checking..." : "Apply"}
                      </Button>
                    </div>
                  ) : (
                    <div className="flex items-center justify-between bg-purple-50 dark:bg-purple-900/20 text-purple-700 dark:text-purple-300 p-3 rounded-lg">
                      <div className="flex items-center gap-2">
                        <Check className="h-4 w-4" />
                        <span className="text-sm font-medium" data-testid="text-applied-gift-card">
                          Gift Card Applied
                        </span>
                        <span className="text-sm">
                          - ${giftCardApplied.amountToApply.toFixed(2)} credit
                        </span>
                      </div>
                      <Button 
                        onClick={removeGiftCard}
                        variant="ghost" 
                        size="sm"
                        className="h-auto p-1 text-purple-700 dark:text-purple-300 hover:text-purple-900 dark:hover:text-purple-100"
                        data-testid="button-remove-gift-card"
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    </div>
                  )}

                  {giftCardError && (
                    <div className="text-red-600 text-sm mt-1" data-testid="text-gift-card-error">
                      {giftCardError}
                    </div>
                  )}

                  {giftCardApplied && giftCardApplied.amountLeft > 0 && (
                    <div className="text-sm text-muted-foreground">
                      Remaining gift card balance after purchase: ${giftCardApplied.amountLeft.toFixed(2)}
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Updated Order Summary with Gift Card */}
              {giftCardApplied && taxInfo && (
                <Card className="border-purple-200 dark:border-purple-800">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base">Updated Order Total</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span>Subtotal</span>
                        <span>${taxInfo.subtotal.toFixed(2)}</span>
                      </div>
                      {taxInfo.discountAmount && taxInfo.discountAmount > 0 && (
                        <div className="flex justify-between text-sm text-green-600">
                          <span>Promo Discount</span>
                          <span>-${taxInfo.discountAmount.toFixed(2)}</span>
                        </div>
                      )}
                      {taxInfo.tax > 0 && (
                        <div className="flex justify-between text-sm">
                          <span>Tax</span>
                          <span>${taxInfo.tax.toFixed(2)}</span>
                        </div>
                      )}
                      <div className="flex justify-between text-sm text-purple-600 dark:text-purple-400">
                        <span>Gift Card Credit</span>
                        <span>-${giftCardApplied.amountToApply.toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between font-semibold text-lg mt-2 pt-2 border-t">
                        <span>Amount Due</span>
                        <span data-testid="text-amount-after-gift-card">
                          ${getAmountAfterDiscounts().toFixed(2)}
                        </span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Gift Card Covers Full Amount */}
              {giftCardApplied && getAmountAfterDiscounts() <= 0 && (
                <Card className="bg-purple-50 dark:bg-purple-900/20 border-purple-200 dark:border-purple-800">
                  <CardHeader>
                    <CardTitle className="flex items-center text-purple-600 dark:text-purple-400">
                      <Check className="mr-2 h-5 w-5" />
                      Gift Card Covers Full Amount
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <p className="text-muted-foreground">
                        Your gift card covers the full cost of this course. Click below to complete your registration.
                      </p>
                      <Button
                        onClick={async () => {
                          if (!formData.agreeToTerms) {
                            toast({
                              title: "Terms Required",
                              description: "Please agree to the terms and conditions.",
                              variant: "destructive",
                            });
                            return;
                          }
                          
                          try {
                            // Redeem the gift card first
                            await apiRequest("POST", "/api/gift-cards/redeem", {
                              giftCardId: giftCardApplied.giftCardId,
                              amount: giftCardApplied.amountToApply,
                              enrollmentId: currentEnrollment.id,
                            });
                            
                            // Then confirm the enrollment
                            confirmEnrollmentMutation.mutate({
                              enrollmentId: currentEnrollment.id,
                              paymentIntentId: 'gift-card-payment',
                              studentInfo: {
                                firstName: formData.firstName,
                                lastName: formData.lastName,
                                email: formData.email,
                              }
                            });
                          } catch (error: any) {
                            toast({
                              title: "Payment Failed",
                              description: error.message || "Failed to process gift card payment",
                              variant: "destructive",
                            });
                          }
                        }}
                        disabled={confirmEnrollmentMutation.isPending || !formData.agreeToTerms}
                        size="lg"
                        className="w-full bg-purple-600 hover:bg-purple-700 text-white"
                        data-testid="button-complete-gift-card-registration"
                      >
                        {confirmEnrollmentMutation.isPending ? (
                          <>
                            <div className="animate-spin w-4 h-4 border-2 border-transparent border-t-current rounded-full mr-2" />
                            Completing Registration...
                          </>
                        ) : (
                          <>
                            <CreditCard className="mr-2 h-4 w-4" />
                            Complete Registration with Gift Card
                          </>
                        )}
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Free Enrollment - No payment required */}
              {taxInfo && taxInfo.total === 0 ? (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center text-green-600">
                      <Check className="mr-2 h-5 w-5" />
                      Free Enrollment - No Payment Required
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <p className="text-muted-foreground">
                        Your promo code has made this course completely free! Click below to complete your registration.
                      </p>
                      <Button
                        onClick={() => {
                          if (!formData.agreeToTerms) {
                            toast({
                              title: "Terms Required",
                              description: "Please agree to the terms and conditions.",
                              variant: "destructive",
                            });
                            return;
                          }
                          confirmEnrollmentMutation.mutate({
                            enrollmentId: currentEnrollment.id,
                            paymentIntentId: 'free-enrollment',
                            studentInfo: {
                              firstName: formData.firstName,
                              lastName: formData.lastName,
                              email: formData.email,
                            }
                          });
                        }}
                        disabled={confirmEnrollmentMutation.isPending || !formData.agreeToTerms}
                        size="lg"
                        className="w-full bg-green-600 hover:bg-green-700 text-white"
                        data-testid="button-complete-free-registration"
                      >
                        {confirmEnrollmentMutation.isPending ? (
                          <>
                            <div className="animate-spin w-4 h-4 border-2 border-transparent border-t-current rounded-full mr-2" />
                            Completing Registration...
                          </>
                        ) : (
                          <>
                            <Check className="mr-2 h-4 w-4" />
                            Complete Free Registration
                          </>
                        )}
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ) : clientSecret ? (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center">
                      <CreditCard className="mr-2 h-5 w-5" />
                      Payment Information
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {!stripePromise ? (
                      <div className="p-4 bg-yellow-50 dark:bg-yellow-900/20 text-yellow-800 dark:text-yellow-300 rounded-lg">
                        <p className="text-sm">
                          Payment processing is currently unavailable. Please contact support to complete your registration.
                        </p>
                      </div>
                    ) : (
                      <Elements 
                        key={clientSecret}
                        stripe={stripePromise} 
                        options={{ 
                          clientSecret,
                          appearance: {
                            theme: 'stripe',
                            variables: {
                              colorPrimary: '#1F2937',
                            }
                          }
                        }}
                      >
                        <CheckoutForm 
                          enrollment={currentEnrollment} 
                          confirmEnrollmentMutation={confirmEnrollmentMutation}
                          giftCardApplied={giftCardApplied}
                          taxInfo={taxInfo}
                        />
                      </Elements>
                    )}
                  </CardContent>
                </Card>
              ) : (
                <Card>
                  <CardContent className="p-8 text-center">
                    <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-foreground mb-2">Setting up payment...</h3>
                    <p className="text-muted-foreground">Please complete the student information above to continue</p>
                  </CardContent>
                </Card>
              )}

            </div>
          )}

          {/* Terms and Conditions */}
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-start space-x-3">
                <Checkbox
                  id="terms"
                  checked={formData.agreeToTerms}
                  onCheckedChange={(checked) => 
                    setFormData(prev => ({ ...prev, agreeToTerms: checked === true }))
                  }
                  data-testid="checkbox-agree-terms"
                />
                <label htmlFor="terms" className="text-sm text-muted-foreground leading-relaxed">
                  I agree to the{' '}
                  <button
                    type="button"
                    onClick={() => setPolicyModalOpen('terms')}
                    className="text-accent hover:text-accent/80 transition-colors cursor-pointer underline"
                  >
                    Terms of Service
                  </button>
                  ,{' '}
                  <button
                    type="button"
                    onClick={() => setPolicyModalOpen('privacy')}
                    className="text-accent hover:text-accent/80 transition-colors cursor-pointer underline"
                  >
                    Privacy Policy
                  </button>
                  , and{' '}
                  <button
                    type="button"
                    onClick={() => setPolicyModalOpen('refund')}
                    className="text-accent hover:text-accent/80 transition-colors cursor-pointer underline"
                  >
                    Refund Policy
                  </button>
                  . I also consent to receive text messages related to my class registration, reminders, and important updates from Apache Solutions. Message and data rates may apply. You may reply STOP at anytime to unsubscribe from SMS notifications.
                </label>
              </div>
            </CardContent>
          </Card>

          {/* Free Course Registration - Show when schedule is selected and course is free */}
          {selectedSchedule && parseFloat(course.price) === 0 && (
            <Card className="bg-green-50 border-green-200">
              <CardContent className="p-8 text-center">
                <div className="mb-4">
                  <Check className="h-12 w-12 text-green-600 mx-auto" />
                </div>
                <h3 className="text-lg font-medium text-foreground mb-2">Free Course Registration</h3>
                <p className="text-muted-foreground mb-4">
                  This is a free course. Click the button below to complete your registration.
                </p>
                <Button
                  size="lg"
                  className="w-full bg-secondary text-secondary-foreground hover:bg-secondary/90"
                  onClick={() => {
                    if (currentEnrollment) {
                      confirmEnrollmentMutation.mutate({
                        enrollmentId: currentEnrollment.id,
                        paymentIntentId: 'free-course',
                      });
                    }
                  }}
                  disabled={!currentEnrollment || confirmEnrollmentMutation.isPending}
                >
                  {confirmEnrollmentMutation.isPending ? 'Completing Registration...' : 'Complete Free Registration'}
                </Button>
              </CardContent>
            </Card>
          )}

          {/* Show loading when creating draft */}
          {selectedSchedule && initiateDraftMutation.isPending && (
            <Card>
              <CardContent className="p-8 text-center">
                <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full mx-auto mb-4" />
                <h3 className="text-lg font-medium text-foreground mb-2">Preparing your registration...</h3>
                <p className="text-muted-foreground">Please wait while we set up your course enrollment</p>
              </CardContent>
            </Card>
          )}
        </div>

      </div>

      {/* Policy Modals */}
      {policyModalOpen && (
        <PolicyModal 
          isOpen={true} 
          onClose={() => setPolicyModalOpen(null)} 
          type={policyModalOpen}
        />
      )}
    </Layout>
  );
}