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

// Load Stripe outside of component render
if (!import.meta.env.VITE_STRIPE_PUBLIC_KEY) {
  throw new Error('Missing required Stripe key: VITE_STRIPE_PUBLIC_KEY');
}
const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLIC_KEY);

const CheckoutForm = ({ enrollment, confirmEnrollmentMutation }: { enrollment: any; confirmEnrollmentMutation: any }) => {
  const stripe = useStripe();
  const elements = useElements();
  const { toast } = useToast();
  const [isProcessing, setIsProcessing] = useState(false);

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!stripe || !elements) {
      return;
    }

    setIsProcessing(true);

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
    } else if (paymentIntent && paymentIntent.status === 'succeeded') {
      // Confirm the enrollment on our backend
      confirmEnrollmentMutation.mutate({
        enrollmentId: enrollment.id,
        paymentIntentId: paymentIntent.id,
      });
    }
    
    setIsProcessing(false);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <PaymentElement />
      
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
            Complete Payment - ${getPaymentAmount(enrollment)}
          </>
        )}
      </Button>
    </form>
  );
};

export default function CourseRegistration() {
  const [, params] = useRoute("/course-registration/:id");
  const [, setLocation] = useLocation();
  const { isAuthenticated } = useAuth();
  const { toast } = useToast();
  
  const [selectedSchedule, setSelectedSchedule] = useState<CourseSchedule | null>(null);
  const [showPayment, setShowPayment] = useState(false);
  const [enrollmentId, setEnrollmentId] = useState<string | null>(null);
  const [clientSecret, setClientSecret] = useState("");
  const [taxInfo, setTaxInfo] = useState<{subtotal: number, tax: number, total: number, tax_included: boolean, originalAmount?: number, discountAmount?: number, promoCode?: any} | null>(null);
  const [promoCode, setPromoCode] = useState("");
  const [promoCodeApplied, setPromoCodeApplied] = useState<string | null>(null);
  const [isValidatingPromo, setIsValidatingPromo] = useState(false);
  const [promoError, setPromoError] = useState<string | null>(null);
  const [currentEnrollment, setCurrentEnrollment] = useState<any>(null);
  
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    dateOfBirth: '',
    agreeToTerms: false,
    paymentOption: 'full' as 'full' | 'deposit', // Default to full payment
    // Account creation fields (for non-authenticated users)
    password: '',
    confirmPassword: '',
    createAccount: !isAuthenticated, // Default to true if not authenticated
  });

  const { data: course, isLoading: courseLoading } = useQuery<CourseWithSchedules>({
    queryKey: ["/api/courses", params?.id],
    enabled: !!params?.id,
  });

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
      const response = await apiRequest("POST", "/api/validate-promo-code", {
        code: promoCode.trim(),
        courseId: currentEnrollment.courseId,
        amount: getPaymentAmount(currentEnrollment),
      });
      
      const validation = await response.json();

      if (validation.isValid) {
        setPromoCodeApplied(promoCode.trim());
        toast({
          title: "Promo Code Applied!",
          description: `You saved $${validation.discountAmount.toFixed(2)}`,
        });
        // Recreate payment intent with promo code
        createPaymentIntent(promoCode.trim());
      } else {
        setPromoError(validation.error || "Invalid promo code");
        toast({
          title: "Invalid Promo Code",
          description: validation.error || "Please check your code and try again.",
          variant: "destructive",
        });
      }
    } catch (error: any) {
      setPromoError("Failed to validate promo code");
      toast({
        title: "Validation Failed",
        description: "Unable to validate promo code. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsValidatingPromo(false);
    }
  };

  const removePromoCode = () => {
    setPromoCode("");
    setPromoCodeApplied(null);
    setPromoError(null);
    toast({
      title: "Promo Code Removed",
      description: "The discount has been removed from your order.",
    });
    // Recreate payment intent without promo code
    createPaymentIntent();
  };

  const createPaymentIntent = async (appliedPromoCode?: string, enrollment?: any) => {
    const enrollmentToUse = enrollment || currentEnrollment;
    if (!enrollmentToUse) return;

    try {
      const response = await apiRequest("POST", "/api/create-payment-intent", {
        enrollmentId: enrollmentToUse.id,
        promoCode: appliedPromoCode || undefined,
      });
      
      const data = await response.json();
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
    } catch (error) {
      toast({
        title: "Payment Setup Failed", 
        description: "Unable to initialize payment. Please try again.",
        variant: "destructive",
      });
    }
  };

  // Create payment intent when enrollment is set
  useEffect(() => {
    if (currentEnrollment) {
      createPaymentIntent(promoCodeApplied || undefined);
    }
  }, [currentEnrollment]);


  const enrollMutation = useMutation({
    mutationFn: async (enrollmentData: any) => {
      const response = await apiRequest("POST", "/api/course-registration", enrollmentData);
      return response.json();
    },
    onSuccess: (enrollment) => {
      toast({
        title: "Registration Initiated",
        description: "Now complete your payment below...",
      });
      setCurrentEnrollment(enrollment);
      setShowPayment(true);
      queryClient.invalidateQueries({ queryKey: ["/api/student/enrollments"] });
    },
    onError: (error) => {
      toast({
        title: "Registration Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const confirmEnrollmentMutation = useMutation({
    mutationFn: async ({ enrollmentId, paymentIntentId }: { enrollmentId: string; paymentIntentId: string }) => {
      const response = await apiRequest("POST", "/api/confirm-enrollment", {
        enrollmentId,
        paymentIntentId,
      });
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Payment Successful",
        description: "Your course registration is confirmed!",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/student/enrollments"] });
      setLocation('/student-portal');
    },
    onError: (error) => {
      toast({
        title: "Confirmation Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });


  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Account creation validation for non-authenticated users
    if (!isAuthenticated && formData.createAccount) {
      if (!formData.password || formData.password.length < 6) {
        toast({
          title: "Password Required",
          description: "Password must be at least 6 characters long",
          variant: "destructive",
        });
        return;
      }
      
      if (formData.password !== formData.confirmPassword) {
        toast({
          title: "Password Mismatch",
          description: "Passwords do not match",
          variant: "destructive",
        });
        return;
      }
    }

    if (!selectedSchedule) {
      toast({
        title: "Schedule Required",
        description: "Please select a course schedule",
        variant: "destructive",
      });
      return;
    }

    if (!formData.agreeToTerms) {
      toast({
        title: "Terms Required",
        description: "Please agree to the terms and conditions",
        variant: "destructive",
      });
      return;
    }


    enrollMutation.mutate({
      courseId: params?.id,
      scheduleId: selectedSchedule.id,
      status: 'pending',
      paymentStatus: 'pending',
      paymentOption: formData.paymentOption, // Pass the selected payment option
      // Student information
      studentInfo: {
        firstName: formData.firstName,
        lastName: formData.lastName,
        email: formData.email,
        phone: formData.phone,
        dateOfBirth: formData.dateOfBirth,
      },
      // Account creation (for non-authenticated users)
      accountCreation: !isAuthenticated && formData.createAccount ? {
        password: formData.password,
      } : undefined,
    });
  };

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
      schedule => 
        !schedule.deletedAt && // Exclude deleted schedules
        new Date(schedule.startDate) > new Date() && 
        schedule.availableSpots > 0
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

        <form onSubmit={handleSubmit} className="space-y-8">
          {/* Schedule Selection */}
          <Card>
            <CardHeader>
              <CardTitle>Choose Course Date</CardTitle>
            </CardHeader>
            <CardContent>
              {availableSchedules.length > 0 ? (
                <div className="space-y-4">
                  <Label htmlFor="schedule">Available Dates *</Label>
                  <Select onValueChange={(value) => {
                    const schedule = availableSchedules.find(s => s.id === value);
                    setSelectedSchedule(schedule || null);
                  }}>
                    <SelectTrigger data-testid="select-course-schedule">
                      <SelectValue placeholder="Select a course date" />
                    </SelectTrigger>
                    <SelectContent>
                      {availableSchedules.map((schedule) => (
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
                              {schedule.availableSpots} spots left
                            </span>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {selectedSchedule && (
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
                          {selectedSchedule.availableSpots} spots available
                        </div>
                      </div>
                    </div>
                  )}
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

              <div>
                <Label htmlFor="dateOfBirth">Date of Birth *</Label>
                <Input
                  id="dateOfBirth"
                  type="date"
                  value={formData.dateOfBirth}
                  onChange={(e) => setFormData(prev => ({ ...prev, dateOfBirth: e.target.value }))}
                  required
                  data-testid="input-date-of-birth"
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
          {course && (
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
                  onValueChange={(value: 'full' | 'deposit') => 
                    setFormData(prev => ({ ...prev, paymentOption: value }))
                  }
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

          {/* Payment Section */}
          {showPayment && currentEnrollment && clientSecret && (
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
                          {currentEnrollment?.course?.title || 'Course'}
                        </h4>
                        <p className="text-sm text-muted-foreground">
                          {currentEnrollment?.schedule?.startDate ? new Date(currentEnrollment.schedule.startDate).toLocaleDateString() : 'TBD'} - {currentEnrollment?.course?.duration || 'TBD'}
                        </p>
                        {currentEnrollment?.schedule?.location && (
                          <p className="text-sm text-muted-foreground">📍 {currentEnrollment.schedule.location}</p>
                        )}
                      </div>
                      <div className="text-right">
                        <div className="text-2xl font-bold text-primary" data-testid="text-order-price">
                          ${taxInfo?.total?.toFixed(2) || getPaymentAmount(currentEnrollment)}
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
                      <div className="flex justify-between text-sm text-muted-foreground">
                        <span>
                          {currentEnrollment?.paymentOption === 'deposit' ? 'Course deposit' : 'Course fee'}
                        </span>
                        <span>${taxInfo?.originalAmount?.toFixed(2) || getPaymentAmount(currentEnrollment)}</span>
                      </div>
                      {currentEnrollment?.paymentOption === 'deposit' && currentEnrollment?.course?.depositAmount && (
                        <div className="flex justify-between text-sm text-muted-foreground">
                          <span>Remaining balance (due later)</span>
                          <span>${currentEnrollment?.course?.price && currentEnrollment?.course?.depositAmount ? (parseFloat(currentEnrollment.course.price) - parseFloat(currentEnrollment.course.depositAmount)).toFixed(2) : '0.00'}</span>
                        </div>
                      )}
                      
                      {/* Promo Code Section */}
                      <div className="mt-4 p-3 border rounded-lg bg-muted/30">
                        <div className="flex items-center gap-2 mb-2">
                          <Tag className="h-4 w-4 text-muted-foreground" />
                          <span className="text-sm font-medium">Promo Code</span>
                        </div>
                        
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
                              disabled={!promoCode.trim() || isValidatingPromo}
                              size="sm"
                              data-testid="button-apply-promo"
                            >
                              {isValidatingPromo ? "Checking..." : "Apply"}
                            </Button>
                          </div>
                        ) : (
                          <div className="flex items-center justify-between bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-300 p-2 rounded">
                            <div className="flex items-center gap-2">
                              <Check className="h-4 w-4" />
                              <span className="text-sm font-medium" data-testid="text-applied-promo">
                                {promoCodeApplied} applied
                              </span>
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
                      </div>

                      {/* Show discount if applied */}
                      {taxInfo?.discountAmount && taxInfo.discountAmount > 0 && (
                        <div className="flex justify-between text-sm text-green-600 dark:text-green-400">
                          <span>Discount ({promoCodeApplied})</span>
                          <span data-testid="text-discount-amount">-${taxInfo.discountAmount.toFixed(2)}</span>
                        </div>
                      )}
                      
                      <div className="flex justify-between text-sm text-muted-foreground">
                        <span>Subtotal</span>
                        <span>${taxInfo?.subtotal?.toFixed(2) || getPaymentAmount(currentEnrollment)}</span>
                      </div>
                      {taxInfo?.tax_included && taxInfo.tax > 0 && (
                        <div className="flex justify-between text-sm text-muted-foreground">
                          <span>Tax</span>
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

              {/* Payment Form */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <CreditCard className="mr-2 h-5 w-5" />
                    Payment Information
                  </CardTitle>
                </CardHeader>
                <CardContent>
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
                    <CheckoutForm enrollment={currentEnrollment} confirmEnrollmentMutation={confirmEnrollmentMutation} />
                  </Elements>
                </CardContent>
              </Card>
            </div>
          )}

          {showPayment && currentEnrollment && !clientSecret && (
            <div className="mb-6">
              <Card>
                <CardContent className="p-8 text-center">
                  <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-foreground mb-2">Setting up payment...</h3>
                  <p className="text-muted-foreground">Please wait while we prepare your secure checkout</p>
                </CardContent>
              </Card>
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
                  <a href="#" className="text-accent hover:text-accent/80 transition-colors">
                    Terms of Service
                  </a>{' '}
                  and{' '}
                  <a href="#" className="text-accent hover:text-accent/80 transition-colors">
                    Privacy Policy
                  </a>
                  . I understand the risks associated with firearms training and accept full responsibility for my participation.
                </label>
              </div>
            </CardContent>
          </Card>

          {/* Submit Button */}
          {!showPayment && (
            <Card>
              <CardContent className="pt-6">
                <Button
                  type="submit"
                  size="lg"
                  className="w-full bg-secondary text-secondary-foreground hover:bg-secondary/90"
                  disabled={enrollMutation.isPending || !selectedSchedule || !formData.agreeToTerms}
                  data-testid="button-proceed-payment"
                >
                  {enrollMutation.isPending ? (
                    <>
                      <div className="animate-spin w-4 h-4 border-2 border-transparent border-t-current rounded-full mr-2" />
                      Processing...
                    </>
                  ) : (
                    <>
                      <DollarSign className="mr-2 h-4 w-4" />
                      Continue to Payment
                    </>
                  )}
                </Button>
                
                {selectedSchedule && course && (
                  <p className="text-center text-sm text-muted-foreground mt-4">
                    You will be charged ${course.price} for the course on {formatDateSafe(selectedSchedule.startDate.toString())}
                  </p>
                )}
              </CardContent>
            </Card>
          )}
        </form>

      </div>
    </Layout>
  );
}
