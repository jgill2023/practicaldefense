
import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { useMutation } from "@tanstack/react-query";
import { Elements, PaymentElement, useStripe, useElements } from '@stripe/react-stripe-js';
import { loadStripe } from '@stripe/stripe-js';
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Calendar, Clock, Users, User, DollarSign, CreditCard, Shield, Tag, Check, X } from "lucide-react";
import type { CourseWithSchedules, CourseSchedule } from "@shared/schema";
import { formatDateSafe } from "@/lib/dateUtils";
import { PolicyModal } from "@/components/PolicyModal";

// Load Stripe (if configured)
const stripePublicKey = import.meta.env.VITE_STRIPE_PUBLIC_KEY;
const stripePromise = stripePublicKey ? loadStripe(stripePublicKey) : null;

interface RegistrationModalProps {
  course: CourseWithSchedules;
  onClose: () => void;
  isWaitlist?: boolean;
}

const CheckoutForm = ({ enrollment, confirmEnrollmentMutation }: { enrollment: any; confirmEnrollmentMutation: any }) => {
  const stripe = useStripe();
  const elements = useElements();
  const { toast } = useToast();
  const [isProcessing, setIsProcessing] = useState(false);

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

      <div className="flex items-center space-x-2 text-sm text-black">
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
            Complete Payment
          </>
        )}
      </Button>
    </form>
  );
};

export function RegistrationModal({ course, onClose, isWaitlist = false }: RegistrationModalProps) {
  const { isAuthenticated, user } = useAuth();
  const { toast } = useToast();
  const [, setLocation] = useLocation();

  const [selectedSchedule, setSelectedSchedule] = useState<CourseSchedule | null>(null);
  const [clientSecret, setClientSecret] = useState("");
  const [taxInfo, setTaxInfo] = useState<{subtotal: number, tax: number, total: number, tax_included: boolean, originalAmount?: number, discountAmount?: number, promoCode?: any} | null>(null);
  const [promoCode, setPromoCode] = useState("");
  const [promoCodeApplied, setPromoCodeApplied] = useState<string | null>(null);
  const [isValidatingPromo, setIsValidatingPromo] = useState(false);
  const [promoError, setPromoError] = useState<string | null>(null);
  const [currentEnrollment, setCurrentEnrollment] = useState<any>(null);
  const [isDraftCreated, setIsDraftCreated] = useState(false);
  const [policyModalOpen, setPolicyModalOpen] = useState<'terms' | 'privacy' | 'refund' | null>(null);

  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    agreeToTerms: false,
    paymentOption: 'full' as 'full' | 'deposit',
    password: '',
    confirmPassword: '',
    createAccount: !isAuthenticated,
  });

  // Find the next available schedule
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
    .sort((a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime());

  // Auto-populate form fields for logged-in students
  useEffect(() => {
    if (isAuthenticated && user) {
      setFormData(prev => ({
        ...prev,
        firstName: (user as any)?.firstName || '',
        lastName: (user as any)?.lastName || '',
        email: (user as any)?.email || '',
        phone: (user as any)?.phone || '',
        createAccount: false,
      }));
    }
  }, [isAuthenticated, user]);

  const formatDateForInput = (dateValue: Date | string | null | undefined): string => {
    if (!dateValue) return '';
    try {
      if (typeof dateValue === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(dateValue)) {
        return dateValue;
      }
      const date = typeof dateValue === 'string' ? new Date(dateValue) : dateValue;
      if (isNaN(date.getTime())) return '';
      return date.toISOString().slice(0, 10);
    } catch (error) {
      return '';
    }
  };

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

  const removePromoCode = async () => {
    setPromoCode("");
    setPromoCodeApplied(null);
    setPromoError(null);
    if (currentEnrollment) {
      createPaymentIntentMutation.mutate({
        enrollmentId: currentEnrollment.id,
        paymentOption: formData.paymentOption,
      });
    }
  };

  const createDraftEnrollment = async (schedule: CourseSchedule) => {
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
    mutationFn: async ({ enrollmentId, paymentOption, promoCode }: { enrollmentId: string; paymentOption: string; promoCode?: string }) => {
      return await apiRequest("POST", "/api/course-registration/payment-intent", {
        enrollmentId,
        paymentOption,
        promoCode,
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
        promoCode: data.promoCode
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
      onClose();
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

  const joinWaitlistMutation = useMutation({
    mutationFn: async ({ courseId, scheduleId, notes }: { courseId: string; scheduleId: string; notes?: string }) => {
      return await apiRequest("POST", "/api/waitlist/join", {
        courseId,
        scheduleId,
        notes,
      });
    },
    onSuccess: () => {
      toast({
        title: "Joined Waitlist",
        description: "You've been added to the waitlist. We'll notify you if a seat becomes available.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/student/waitlist"] });
      onClose();
      setLocation('/student-portal');
    },
    onError: (error) => {
      toast({
        title: "Failed to Join Waitlist",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleScheduleChange = async (scheduleId: string) => {
    const schedule = availableSchedules.find(s => s.id === scheduleId);
    if (!schedule) return;

    setSelectedSchedule(schedule);

    if (formData.firstName && formData.lastName && formData.email && formData.phone && formData.agreeToTerms) {
      await createDraftEnrollment(schedule);
    }
  };

  const handlePaymentOptionChange = (paymentOption: 'full' | 'deposit') => {
    setFormData(prev => ({ ...prev, paymentOption }));

    if (currentEnrollment && isDraftCreated) {
      createPaymentIntentMutation.mutate({
        enrollmentId: currentEnrollment.id,
        paymentOption,
        promoCode: promoCodeApplied || undefined,
      });
    }
  };

  useEffect(() => {
    if (selectedSchedule && formData.firstName && formData.lastName && formData.email && formData.phone && formData.agreeToTerms && !isDraftCreated) {
      createDraftEnrollment(selectedSchedule);
    }
  }, [formData, selectedSchedule, isDraftCreated]);

  // Get the first sold-out schedule for waitlist
  const soldOutSchedule = isWaitlist ? course.schedules
    .filter(schedule => {
      if (schedule.deletedAt || new Date(schedule.startDate) <= new Date() || schedule.notes?.includes('CANCELLED:')) {
        return false;
      }
      // Calculate actual available spots based on enrollments
      const enrollmentCount = schedule.enrollments?.filter((e: any) => 
        e.status === 'confirmed' || e.status === 'pending'
      ).length || 0;
      const maxSpots = Number(schedule.maxSpots) || 0;
      const actualAvailableSpots = Math.max(0, maxSpots - enrollmentCount);
      return actualAvailableSpots === 0;
    })
    .sort((a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime())[0] : null;

  const handleJoinWaitlist = () => {
    if (!soldOutSchedule) {
      toast({
        title: "No Schedule Available",
        description: "There are no sold-out schedules available for this course.",
        variant: "destructive",
      });
      return;
    }

    if (!formData.firstName || !formData.lastName || !formData.email || !formData.phone) {
      toast({
        title: "Required Fields Missing",
        description: "Please fill in all required student information fields",
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

    joinWaitlistMutation.mutate({
      courseId: course.id,
      scheduleId: soldOutSchedule.id,
      notes: `${formData.firstName} ${formData.lastName} - ${formData.email} - ${formData.phone}`,
    });
  };

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[95vh] overflow-y-auto" data-testid="modal-registration">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold text-card-foreground">
            {isWaitlist ? "Join Waitlist" : "Course Registration"}
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-6">
          {/* Course Summary */}
          <div className="bg-muted p-4 rounded-lg">
            <h4 className="font-semibold text-card-foreground mb-2" data-testid="text-modal-course-title">
              {course.title}
            </h4>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-muted-foreground">Category:</span>
                <Badge className="ml-2" data-testid="badge-modal-category">
                  {typeof course.category === 'string' ? course.category : 
                   (course.category && typeof course.category === 'object' && 'name' in course.category) 
                     ? (course.category as any).name || 'General' 
                     : 'General'}
                </Badge>
              </div>
              <div>
                <span className="text-muted-foreground">Duration:</span>
                <span className="ml-2 font-medium" data-testid="text-modal-duration">{course.duration}</span>
              </div>
              <div>
                <span className="text-muted-foreground">Price:</span>
                <span className="ml-2 font-medium text-black" data-testid="text-modal-price">${course.price}</span>
              </div>
              <div>
                <span className="text-muted-foreground">Instructor:</span>
                <span className="ml-2 font-medium" data-testid="text-modal-instructor">
                  {course.instructor.firstName} {course.instructor.lastName}
                </span>
              </div>
            </div>
          </div>

          {/* Schedule Selection - Hidden for waitlist */}
          {!isWaitlist && (
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
                                <span>{formatDateSafe(schedule.startDate.toString())} - {actualAvailableSpots} spots left</span>
                              </div>
                            </SelectItem>
                          );
                        })}
                      </SelectContent>
                    </Select>
                    {selectedSchedule && (
                      <div className="p-3 bg-black/10 border border-black/20 rounded-lg">
                        <div className="text-sm">
                          <div className="font-medium text-black mb-1">Selected Date:</div>
                          <div className="flex items-center text-muted-foreground">
                            <Calendar className="mr-2 h-4 w-4 text-black" />
                            {formatDateSafe(selectedSchedule.startDate.toString())}
                          </div>
                          {selectedSchedule.location && (
                            <div className="flex items-center text-muted-foreground mt-1">
                              <span className="mr-2">📍</span>
                              {selectedSchedule.location}
                            </div>
                          )}
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
          )}

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
          {!isAuthenticated && formData.createAccount && !isWaitlist && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <User className="mr-2 h-5 w-5" />
                  Create Your Account
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="password">Password *</Label>
                  <Input
                    id="password"
                    type="password"
                    value={formData.password}
                    onChange={(e) => setFormData(prev => ({ ...prev, password: e.target.value }))}
                    placeholder="Minimum 6 characters"
                    required
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
                    required
                    data-testid="input-confirm-password"
                  />
                </div>
              </CardContent>
            </Card>
          )}

          {/* Waitlist Acknowledgement */}
          {isWaitlist && (
            <Card className="bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800">
              <CardContent className="p-6">
                <div className="space-y-4">
                  <div className="flex items-start space-x-3">
                    <Users className="h-5 w-5 text-blue-600 dark:text-blue-400 mt-0.5 flex-shrink-0" />
                    <div className="text-sm text-blue-900 dark:text-blue-100">
                      <p className="font-medium mb-2">You are joining the waitlist for this course.</p>
                      <p className="text-blue-800 dark:text-blue-200">
                        We'll notify you via email if any seats become available. You will not be charged at this time.
                      </p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Payment Options */}
          {!isWaitlist && parseFloat(course.price) > 0 && course.depositAmount && (
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
                  <div className="flex items-center space-x-2 p-3 border rounded-lg">
                    <RadioGroupItem value="full" id="full" data-testid="radio-full-payment" />
                    <Label htmlFor="full" className="flex-1 cursor-pointer">
                      <div className="font-medium">Full Payment - ${course.price}</div>
                    </Label>
                  </div>

                  <div className="flex items-center space-x-2 p-3 border rounded-lg">
                    <RadioGroupItem value="deposit" id="deposit" data-testid="radio-deposit-payment" />
                    <Label htmlFor="deposit" className="flex-1 cursor-pointer">
                      <div className="font-medium">Deposit - ${course.depositAmount}</div>
                      <div className="text-sm text-muted-foreground">
                        (remaining ${(parseFloat(course.price) - parseFloat(course.depositAmount)).toFixed(2)} due later)
                      </div>
                    </Label>
                  </div>
                </RadioGroup>
              </CardContent>
            </Card>
          )}

          {/* Free Course Registration */}
          {!isWaitlist && selectedSchedule && parseFloat(course.price) === 0 && (
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

          {/* Payment Section */}
          {!isWaitlist && selectedSchedule && parseFloat(course.price) > 0 && clientSecret && (
            <>
              {/* Promo Code Section */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <Tag className="mr-2 h-5 w-5" />
                    Promo Code
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {!promoCodeApplied ? (
                    <div className="flex gap-2">
                      <Input
                        placeholder="Enter promo code"
                        value={promoCode}
                        onChange={(e) => setPromoCode(e.target.value.toUpperCase())}
                        data-testid="input-promo-code"
                      />
                      <Button 
                        onClick={validateAndApplyPromoCode}
                        disabled={!promoCode.trim() || isValidatingPromo}
                        size="sm"
                      >
                        {isValidatingPromo ? "Checking..." : "Apply"}
                      </Button>
                    </div>
                  ) : (
                    <div className="flex items-center justify-between bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-300 p-3 rounded-lg">
                      <div className="flex items-center gap-2">
                        <Check className="h-4 w-4" />
                        <span className="text-sm font-medium">{promoCodeApplied} applied</span>
                      </div>
                      <Button onClick={removePromoCode} variant="ghost" size="sm">
                        <X className="h-3 w-3" />
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Order Summary */}
              <Card>
                <CardHeader>
                  <CardTitle>Order Summary</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Subtotal</span>
                    <span>${taxInfo?.subtotal?.toFixed(2) || '0.00'}</span>
                  </div>
                  {taxInfo?.discountAmount && taxInfo.discountAmount > 0 && (
                    <div className="flex justify-between text-sm text-green-600">
                      <span>Discount</span>
                      <span>-${taxInfo.discountAmount.toFixed(2)}</span>
                    </div>
                  )}
                  {taxInfo?.tax_included && taxInfo.tax > 0 && (
                    <div className="flex justify-between text-sm">
                      <span>Tax</span>
                      <span>${taxInfo.tax.toFixed(2)}</span>
                    </div>
                  )}
                  <div className="flex justify-between font-semibold text-lg pt-2 border-t">
                    <span>Total</span>
                    <span>${taxInfo?.total?.toFixed(2) || '0.00'}</span>
                  </div>
                </CardContent>
              </Card>

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
                          if (!formData.firstName || !formData.lastName || !formData.email) {
                            toast({
                              title: "Missing Information",
                              description: "Please fill in all required fields.",
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
              ) : (
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
                        <CheckoutForm enrollment={currentEnrollment} confirmEnrollmentMutation={confirmEnrollmentMutation} />
                      </Elements>
                    )}
                  </CardContent>
                </Card>
              )}
            </>
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
                    className="text-black hover:text-black/80 transition-colors underline"
                  >
                    Terms of Service
                  </button>
                  ,{' '}
                  <button
                    type="button"
                    onClick={() => setPolicyModalOpen('privacy')}
                    className="text-black hover:text-black/80 transition-colors underline"
                  >
                    Privacy Policy
                  </button>
                  , and{' '}
                  <button
                    type="button"
                    onClick={() => setPolicyModalOpen('refund')}
                    className="text-black hover:text-black/80 transition-colors underline"
                  >
                    Refund Policy
                  </button>
                  . I also consent to receive text messages related to my class registration, reminders, and important updates from Tactical Advantage. Message and data rates may apply. You may reply STOP at anytime to unsubscribe from SMS notifications.
                </label>
              </div>
            </CardContent>
          </Card>

          {/* Join Waitlist Button */}
          {isWaitlist && (
            <Button
              type="button"
              size="lg"
              className="w-full bg-primary text-primary-foreground hover:bg-primary/90"
              onClick={handleJoinWaitlist}
              disabled={joinWaitlistMutation.isPending || !formData.agreeToTerms}
              data-testid="button-join-waitlist"
            >
              {joinWaitlistMutation.isPending ? (
                <>
                  <div className="animate-spin w-4 h-4 border-2 border-transparent border-t-current rounded-full mr-2" />
                  Joining Waitlist...
                </>
              ) : (
                <>
                  <Users className="mr-2 h-4 w-4" />
                  Join Waitlist
                </>
              )}
            </Button>
          )}
        </div>
      </DialogContent>

      {/* Policy Modals */}
      {policyModalOpen && (
        <PolicyModal 
          isOpen={true} 
          onClose={() => setPolicyModalOpen(null)} 
          type={policyModalOpen}
        />
      )}
    </Dialog>
  );
}
