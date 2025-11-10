import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { Loader2, MessageSquare, Mail, Check, Star } from "lucide-react";
import { Elements, PaymentElement, useStripe, useElements } from "@stripe/react-stripe-js";
import { loadStripe } from "@stripe/stripe-js";

const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLIC_KEY || '');

interface CreditPackage {
  id: string;
  name: string;
  description: string | null;
  smsCredits: number;
  emailCredits: number;
  price: string;
  isPopular: boolean;
}

interface PurchaseCreditsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

function PaymentForm({ packageId, onSuccess }: { packageId: string; onSuccess: () => void }) {
  const stripe = useStripe();
  const elements = useElements();
  const { toast } = useToast();
  const [isProcessing, setIsProcessing] = useState(false);
  const queryClient = useQueryClient();

  const confirmPurchaseMutation = useMutation({
    mutationFn: async (paymentIntentId: string) => {
      return apiRequest<{ success: boolean }>({
        url: '/api/credits/confirm-purchase',
        method: 'POST',
        data: { paymentIntentId },
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/credits/balance'] });
      queryClient.invalidateQueries({ queryKey: ['/api/credits/transactions'] });
      toast({
        title: "Credits purchased successfully!",
        description: "Your credits have been added to your account.",
      });
      onSuccess();
    },
    onError: (error: any) => {
      toast({
        title: "Purchase confirmation failed",
        description: error.message || "Failed to confirm your purchase. Please contact support.",
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

    try {
      const { error, paymentIntent } = await stripe.confirmPayment({
        elements,
        redirect: 'if_required',
      });

      if (error) {
        toast({
          title: "Payment failed",
          description: error.message,
          variant: "destructive",
        });
      } else if (paymentIntent && paymentIntent.status === 'succeeded') {
        await confirmPurchaseMutation.mutateAsync(paymentIntent.id);
      }
    } catch (error: any) {
      toast({
        title: "Payment error",
        description: error.message || "An unexpected error occurred",
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <PaymentElement />
      <Button
        type="submit"
        disabled={!stripe || isProcessing}
        className="w-full"
        data-testid="button-submit-payment"
      >
        {isProcessing ? (
          <>
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            Processing...
          </>
        ) : (
          'Complete Purchase'
        )}
      </Button>
    </form>
  );
}

export function PurchaseCreditsDialog({ open, onOpenChange }: PurchaseCreditsDialogProps) {
  const { toast } = useToast();
  const [selectedPackageId, setSelectedPackageId] = useState<string | null>(null);
  const [clientSecret, setClientSecret] = useState<string | null>(null);

  const { data: packages, isLoading } = useQuery<CreditPackage[]>({
    queryKey: ['/api/credits/packages'],
    enabled: open,
  });

  const createPaymentIntentMutation = useMutation({
    mutationFn: async (packageId: string) => {
      return apiRequest<{ clientSecret: string; packageName: string; amount: number }>({
        url: '/api/credits/create-payment-intent',
        method: 'POST',
        data: { packageId },
      });
    },
    onSuccess: (data) => {
      setClientSecret(data.clientSecret);
    },
    onError: (error: any) => {
      toast({
        title: "Failed to initiate purchase",
        description: error.message || "Please try again later",
        variant: "destructive",
      });
      setSelectedPackageId(null);
    },
  });

  const handlePackageSelect = (packageId: string) => {
    setSelectedPackageId(packageId);
    createPaymentIntentMutation.mutate(packageId);
  };

  const handleSuccess = () => {
    setSelectedPackageId(null);
    setClientSecret(null);
    onOpenChange(false);
  };

  const handleBack = () => {
    setSelectedPackageId(null);
    setClientSecret(null);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto" data-testid="purchase-credits-dialog">
        <DialogHeader>
          <DialogTitle>Purchase Message Credits</DialogTitle>
          <DialogDescription>
            {selectedPackageId
              ? "Complete your purchase with a credit card"
              : "Choose a package to add SMS and Email credits to your account"
            }
          </DialogDescription>
        </DialogHeader>

        {selectedPackageId && clientSecret ? (
          <div className="space-y-4">
            <Button
              variant="outline"
              onClick={handleBack}
              disabled={createPaymentIntentMutation.isPending}
              data-testid="button-back-to-packages"
            >
              ← Back to Packages
            </Button>
            <Elements stripe={stripePromise} options={{ clientSecret }}>
              <PaymentForm packageId={selectedPackageId} onSuccess={handleSuccess} />
            </Elements>
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {isLoading ? (
              <div className="col-span-full text-center py-8">
                <Loader2 className="w-8 h-8 animate-spin mx-auto mb-2" />
                <p className="text-sm text-muted-foreground">Loading packages...</p>
              </div>
            ) : packages && packages.length > 0 ? (
              packages.map((pkg) => (
                <Card
                  key={pkg.id}
                  className={`relative cursor-pointer transition-all hover:shadow-lg ${
                    pkg.isPopular ? 'border-2 border-primary' : ''
                  }`}
                  onClick={() => handlePackageSelect(pkg.id)}
                  data-testid={`package-card-${pkg.id}`}
                >
                  {pkg.isPopular && (
                    <Badge className="absolute -top-3 left-1/2 -translate-x-1/2" data-testid="popular-badge">
                      <Star className="w-3 h-3 mr-1" />
                      Most Popular
                    </Badge>
                  )}
                  <CardContent className="pt-6">
                    <div className="text-center mb-4">
                      <h3 className="text-lg font-semibold mb-1" data-testid={`package-name-${pkg.id}`}>{pkg.name}</h3>
                      {pkg.description && (
                        <p className="text-xs text-muted-foreground" data-testid={`package-description-${pkg.id}`}>{pkg.description}</p>
                      )}
                    </div>
                    <div className="text-center mb-4">
                      <div className="text-3xl font-bold" data-testid={`package-price-${pkg.id}`}>${parseFloat(pkg.price).toFixed(2)}</div>
                    </div>
                    <div className="space-y-2 mb-4">
                      {pkg.smsCredits > 0 && (
                        <div className="flex items-center justify-between text-sm" data-testid={`package-sms-${pkg.id}`}>
                          <div className="flex items-center gap-2">
                            <MessageSquare className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                            <span>SMS Messages</span>
                          </div>
                          <span className="font-semibold">{pkg.smsCredits.toLocaleString()}</span>
                        </div>
                      )}
                      {pkg.emailCredits > 0 && (
                        <div className="flex items-center justify-between text-sm" data-testid={`package-email-${pkg.id}`}>
                          <div className="flex items-center gap-2">
                            <Mail className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                            <span>Email Messages</span>
                          </div>
                          <span className="font-semibold">{pkg.emailCredits.toLocaleString()}</span>
                        </div>
                      )}
                    </div>
                    <Button className="w-full" data-testid={`button-select-package-${pkg.id}`}>
                      <Check className="w-4 h-4 mr-2" />
                      Select Package
                    </Button>
                  </CardContent>
                </Card>
              ))
            ) : (
              <div className="col-span-full text-center py-8">
                <p className="text-muted-foreground">No packages available at this time</p>
              </div>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
