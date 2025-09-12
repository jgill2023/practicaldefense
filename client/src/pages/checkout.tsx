import { useStripe, Elements, PaymentElement, useElements } from '@stripe/react-stripe-js';
import { loadStripe } from '@stripe/stripe-js';
import { useEffect, useState } from 'react';
import { useLocation, useRoute } from 'wouter';
import { useQuery, useMutation } from '@tanstack/react-query';
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Layout } from "@/components/Layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CreditCard, Shield } from "lucide-react";
import type { EnrollmentWithDetails } from "@shared/schema";

// Make sure to call `loadStripe` outside of a component's render to avoid
// recreating the `Stripe` object on every render.
if (!import.meta.env.VITE_STRIPE_PUBLIC_KEY) {
  throw new Error('Missing required Stripe key: VITE_STRIPE_PUBLIC_KEY');
}
const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLIC_KEY);

const CheckoutForm = ({ enrollment }: { enrollment: EnrollmentWithDetails }) => {
  const stripe = useStripe();
  const elements = useElements();
  const { toast } = useToast();
  const [, setLocation] = useLocation();
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

export default function Checkout() {
  const [, params] = useRoute("/checkout");
  const [clientSecret, setClientSecret] = useState("");
  const { toast } = useToast();
  
  // Get enrollment ID from URL params
  const urlParams = new URLSearchParams(window.location.search);
  const enrollmentId = urlParams.get('enrollmentId');

  const { data: enrollments, isLoading } = useQuery<EnrollmentWithDetails[]>({
    queryKey: ["/api/student/enrollments"],
    enabled: !!enrollmentId,
  });
  
  const enrollment = enrollments?.find(e => e.id === enrollmentId);

  // Calculate the payment amount based on the payment option (for display purposes)
  const getPaymentAmount = (enrollment: any) => {
    if (!enrollment) return 0;
    
    const coursePrice = parseFloat(enrollment.course.price);
    const depositAmount = enrollment.course.depositAmount ? parseFloat(enrollment.course.depositAmount) : null;
    
    if (enrollment.paymentOption === 'deposit' && depositAmount) {
      return depositAmount;
    }
    return coursePrice;
  };

  useEffect(() => {
    if (!enrollment) return;
    
    // Create PaymentIntent as soon as the page loads - server calculates amount
    apiRequest("POST", "/api/create-payment-intent", {
      enrollmentId: enrollment.id,
    })
      .then((res) => res.json())
      .then((data) => {
        setClientSecret(data.clientSecret);
      })
      .catch((error) => {
        toast({
          title: "Payment Setup Failed",
          description: "Unable to initialize payment. Please try again.",
          variant: "destructive",
        });
      });
  }, [enrollment, toast]);

  if (isLoading || !enrollment) {
    return (
      <Layout>
        <div className="max-w-2xl mx-auto px-4 py-12">
          <div className="animate-pulse">
            <div className="h-8 bg-muted rounded w-1/2 mb-4" />
            <Card>
              <CardContent className="p-6">
                <div className="space-y-4">
                  <div className="h-4 bg-muted rounded w-full" />
                  <div className="h-4 bg-muted rounded w-2/3" />
                  <div className="h-10 bg-muted rounded" />
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </Layout>
    );
  }

  if (!clientSecret) {
    return (
      <Layout>
        <div className="max-w-2xl mx-auto px-4 py-12">
          <Card>
            <CardContent className="p-8 text-center">
              <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full mx-auto mb-4" />
              <h3 className="text-lg font-medium text-foreground mb-2">Setting up payment...</h3>
              <p className="text-muted-foreground">Please wait while we prepare your secure checkout</p>
            </CardContent>
          </Card>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="max-w-2xl mx-auto px-4 py-12">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-foreground mb-4" data-testid="text-checkout-title">
            Complete Your Registration
          </h1>
          <p className="text-muted-foreground">Secure payment powered by Stripe</p>
        </div>

        {/* Order Summary */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle>Order Summary</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-start justify-between">
                <div>
                  <h4 className="font-semibold text-foreground" data-testid="text-order-course-title">
                    {enrollment.course.title}
                  </h4>
                  <p className="text-sm text-muted-foreground">
                    {new Date(enrollment.schedule.startDate).toLocaleDateString()} - {enrollment.course.duration}
                  </p>
                  {enrollment.schedule.location && (
                    <p className="text-sm text-muted-foreground">📍 {enrollment.schedule.location}</p>
                  )}
                </div>
                <div className="text-right">
                  <div className="text-2xl font-bold text-primary" data-testid="text-order-price">
                    ${getPaymentAmount(enrollment)}
                  </div>
                  <div className="flex gap-2 mt-2">
                    <Badge variant="outline">
                      {typeof enrollment.course.category === 'string' ? enrollment.course.category : 
                       (enrollment.course.category && typeof enrollment.course.category === 'object' && 'name' in enrollment.course.category) 
                         ? (enrollment.course.category as any).name || 'General' 
                         : 'General'}
                    </Badge>
                    {enrollment.paymentOption === 'deposit' && (
                      <Badge variant="secondary">
                        Deposit Payment
                      </Badge>
                    )}
                  </div>
                </div>
              </div>
              
              <div className="border-t pt-4">
                <div className="flex justify-between text-sm text-muted-foreground">
                  <span>Full course fee</span>
                  <span>${enrollment.course.price}</span>
                </div>
                {enrollment.paymentOption === 'deposit' && enrollment.course.depositAmount && (
                  <>
                    <div className="flex justify-between text-sm text-muted-foreground">
                      <span>Paying today (deposit)</span>
                      <span>${enrollment.course.depositAmount}</span>
                    </div>
                    <div className="flex justify-between text-sm text-muted-foreground">
                      <span>Remaining balance</span>
                      <span>${(parseFloat(enrollment.course.price) - parseFloat(enrollment.course.depositAmount)).toFixed(2)}</span>
                    </div>
                  </>
                )}
                <div className="flex justify-between text-sm text-muted-foreground">
                  <span>Processing fee</span>
                  <span>$0.00</span>
                </div>
                <div className="flex justify-between font-semibold text-lg mt-2 pt-2 border-t">
                  <span>Total due today</span>
                  <span data-testid="text-total-amount">${getPaymentAmount(enrollment)}</span>
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
            {/* Make SURE to wrap the form in <Elements> which provides the stripe context. */}
            <Elements 
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
              <CheckoutForm enrollment={enrollment} />
            </Elements>
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}
