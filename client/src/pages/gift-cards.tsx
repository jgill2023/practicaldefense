import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import Layout from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Separator } from "@/components/ui/separator";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useToast } from "@/hooks/use-toast";
import { Gift, Mail, Download, CheckCircle, Loader2, CreditCard, ArrowLeft, ArrowRight } from "lucide-react";
import { loadStripe } from "@stripe/stripe-js";
import { Elements, PaymentElement, useStripe, useElements } from "@stripe/react-stripe-js";
import { apiRequest } from "@/lib/queryClient";
import type { GiftCardTheme } from "@shared/schema";

const stripePromise = import.meta.env.VITE_STRIPE_PUBLIC_KEY 
  ? loadStripe(import.meta.env.VITE_STRIPE_PUBLIC_KEY)
  : null;

const PRESET_AMOUNTS = [25, 50, 75, 100, 150, 200, 250, 500];

const purchaseFormSchema = z.object({
  amount: z.number().min(10, "Minimum amount is $10").max(500, "Maximum amount is $500"),
  themeId: z.string().uuid("Please select a theme"),
  deliveryMethod: z.enum(["email", "download"]),
  purchaserName: z.string().min(1, "Your name is required"),
  purchaserEmail: z.string().email("Valid email is required"),
  recipientName: z.string().optional(),
  recipientEmail: z.string().email("Valid recipient email is required").optional().or(z.literal("")),
  personalMessage: z.string().max(500, "Message cannot exceed 500 characters").optional(),
}).refine((data) => {
  if (data.deliveryMethod === "email") {
    return data.recipientEmail && data.recipientEmail.length > 0;
  }
  return true;
}, {
  message: "Recipient email is required for email delivery",
  path: ["recipientEmail"],
});

type PurchaseFormData = z.infer<typeof purchaseFormSchema>;

function ThemeCard({ 
  theme, 
  isSelected, 
  onSelect 
}: { 
  theme: GiftCardTheme; 
  isSelected: boolean; 
  onSelect: () => void;
}) {
  return (
    <Card 
      className={`cursor-pointer transition-all hover:shadow-md ${
        isSelected 
          ? "ring-2 ring-[#5170FF] shadow-lg" 
          : "hover:border-[#5170FF]/50"
      }`}
      onClick={onSelect}
      data-testid={`theme-card-${theme.id}`}
    >
      <CardContent className="p-4">
        <div 
          className="aspect-[3/2] rounded-lg mb-3 flex items-center justify-center overflow-hidden"
          style={{ 
            backgroundColor: theme.accentColor || '#3b82f6',
            backgroundImage: theme.previewImageUrl ? `url(${theme.previewImageUrl})` : undefined,
            backgroundSize: 'cover',
            backgroundPosition: 'center',
          }}
        >
          {!theme.previewImageUrl && (
            <Gift className="w-12 h-12 text-white/80" />
          )}
        </div>
        <p className="text-center font-medium text-sm">{theme.name}</p>
        {isSelected && (
          <div className="flex justify-center mt-2">
            <CheckCircle className="w-5 h-5 text-[#5170FF]" />
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function AmountSelector({ 
  value, 
  onChange 
}: { 
  value: number; 
  onChange: (amount: number) => void;
}) {
  const [customAmount, setCustomAmount] = useState<string>("");
  const isCustom = !PRESET_AMOUNTS.includes(value) && value > 0;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-4 gap-3">
        {PRESET_AMOUNTS.map((amount) => (
          <Button
            key={amount}
            type="button"
            variant={value === amount ? "default" : "outline"}
            className={value === amount ? "bg-[#5170FF] hover:bg-[#5170FF]/90" : ""}
            onClick={() => {
              onChange(amount);
              setCustomAmount("");
            }}
            data-testid={`amount-${amount}`}
          >
            ${amount}
          </Button>
        ))}
      </div>
      <div className="flex items-center gap-3">
        <Label htmlFor="custom-amount" className="whitespace-nowrap">Custom:</Label>
        <div className="relative flex-1">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">$</span>
          <Input
            id="custom-amount"
            type="number"
            min={10}
            max={500}
            placeholder="10-500"
            className="pl-7"
            value={customAmount}
            onChange={(e) => {
              const val = e.target.value;
              setCustomAmount(val);
              const num = parseFloat(val);
              if (!isNaN(num) && num >= 10 && num <= 500) {
                onChange(num);
              }
            }}
            data-testid="custom-amount-input"
          />
        </div>
      </div>
      {isCustom && customAmount && (
        <p className="text-sm text-muted-foreground">Custom amount: ${value.toFixed(2)}</p>
      )}
    </div>
  );
}

function PaymentForm({ 
  clientSecret,
  amount,
  onSuccess,
  onError
}: { 
  clientSecret: string;
  amount: number;
  onSuccess: (paymentIntentId: string) => void;
  onError: (error: string) => void;
}) {
  const stripe = useStripe();
  const elements = useElements();
  const [isProcessing, setIsProcessing] = useState(false);
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!stripe || !elements) {
      return;
    }

    setIsProcessing(true);

    try {
      const { error, paymentIntent } = await stripe.confirmPayment({
        elements,
        confirmParams: {
          return_url: window.location.href,
        },
        redirect: "if_required",
      });

      if (error) {
        onError(error.message || "Payment failed");
        toast({
          title: "Payment Failed",
          description: error.message,
          variant: "destructive",
        });
      } else if (paymentIntent && paymentIntent.status === "succeeded") {
        onSuccess(paymentIntent.id);
      }
    } catch (err: any) {
      onError(err.message || "An error occurred");
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="p-4 bg-muted/50 rounded-lg">
        <div className="flex justify-between items-center mb-4">
          <span className="text-lg font-medium">Gift Card Amount</span>
          <span className="text-2xl font-bold text-[#5170FF]">${amount.toFixed(2)}</span>
        </div>
        <PaymentElement />
      </div>
      <Button 
        type="submit" 
        className="w-full bg-[#5170FF] hover:bg-[#5170FF]/90"
        size="lg"
        disabled={!stripe || isProcessing}
        data-testid="submit-payment"
      >
        {isProcessing ? (
          <>
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            Processing...
          </>
        ) : (
          <>
            <CreditCard className="w-4 h-4 mr-2" />
            Pay ${amount.toFixed(2)}
          </>
        )}
      </Button>
    </form>
  );
}

function SuccessView({ 
  giftCardCode,
  amount,
  deliveryMethod,
  recipientEmail,
  onPurchaseAnother
}: {
  giftCardCode?: string;
  amount: number;
  deliveryMethod: "email" | "download";
  recipientEmail?: string;
  onPurchaseAnother: () => void;
}) {
  const copyToClipboard = () => {
    if (giftCardCode) {
      navigator.clipboard.writeText(giftCardCode);
    }
  };

  return (
    <div className="text-center py-8">
      <div className="w-20 h-20 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-6">
        <CheckCircle className="w-10 h-10 text-green-600" />
      </div>
      <h2 className="text-2xl font-bold mb-2">Gift Card Purchased!</h2>
      <p className="text-muted-foreground mb-6">
        Your ${amount.toFixed(2)} gift card has been created successfully.
      </p>

      {deliveryMethod === "download" && giftCardCode ? (
        <Card className="max-w-md mx-auto mb-6">
          <CardHeader>
            <CardTitle className="text-lg">Your Gift Card Code</CardTitle>
            <CardDescription>Save this code - it will only be shown once!</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="bg-muted p-4 rounded-lg font-mono text-lg tracking-wider text-center mb-4">
              {giftCardCode}
            </div>
            <Button 
              variant="outline" 
              className="w-full"
              onClick={copyToClipboard}
              data-testid="copy-code"
            >
              Copy to Clipboard
            </Button>
          </CardContent>
        </Card>
      ) : (
        <Card className="max-w-md mx-auto mb-6">
          <CardHeader>
            <CardTitle className="text-lg">Gift Card Sent!</CardTitle>
            <CardDescription>
              The gift card has been sent to {recipientEmail}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-center gap-2 text-muted-foreground">
              <Mail className="w-5 h-5" />
              <span>Check the inbox for the gift card email</span>
            </div>
          </CardContent>
        </Card>
      )}

      <Button 
        onClick={onPurchaseAnother}
        variant="outline"
        data-testid="purchase-another"
      >
        Purchase Another Gift Card
      </Button>
    </div>
  );
}

function GiftCardPurchaseContent() {
  const { toast } = useToast();
  const [step, setStep] = useState<"details" | "payment" | "success">("details");
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [paymentIntentId, setPaymentIntentId] = useState<string | null>(null);
  const [purchaseResult, setPurchaseResult] = useState<{
    code?: string;
    amount: number;
    deliveryMethod: "email" | "download";
    recipientEmail?: string;
  } | null>(null);

  const { data: themes = [], isLoading: themesLoading } = useQuery<GiftCardTheme[]>({
    queryKey: ["/api/gift-cards/themes"],
  });

  const form = useForm<PurchaseFormData>({
    resolver: zodResolver(purchaseFormSchema),
    defaultValues: {
      amount: 50,
      themeId: "",
      deliveryMethod: "email",
      purchaserName: "",
      purchaserEmail: "",
      recipientName: "",
      recipientEmail: "",
      personalMessage: "",
    },
  });

  const createPaymentIntentMutation = useMutation({
    mutationFn: async (data: PurchaseFormData) => {
      const response = await apiRequest("POST", "/api/gift-cards/purchase/create-payment-intent", data);
      return response.json();
    },
    onSuccess: (data) => {
      setClientSecret(data.clientSecret);
      setStep("payment");
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to initiate payment",
        variant: "destructive",
      });
    },
  });

  const completePurchaseMutation = useMutation({
    mutationFn: async (paymentIntentId: string) => {
      const response = await apiRequest("POST", "/api/gift-cards/purchase/complete", { paymentIntentId });
      return response.json();
    },
    onSuccess: (data) => {
      setPurchaseResult({
        code: data.code,
        amount: data.amount,
        deliveryMethod: data.deliveryMethod,
        recipientEmail: form.getValues("recipientEmail"),
      });
      setStep("success");
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to complete purchase",
        variant: "destructive",
      });
    },
  });

  const handleDetailsSubmit = form.handleSubmit((data) => {
    createPaymentIntentMutation.mutate(data);
  });

  const handlePaymentSuccess = (paymentIntentId: string) => {
    setPaymentIntentId(paymentIntentId);
    completePurchaseMutation.mutate(paymentIntentId);
  };

  const handlePaymentError = (error: string) => {
    toast({
      title: "Payment Failed",
      description: error,
      variant: "destructive",
    });
  };

  const handlePurchaseAnother = () => {
    form.reset();
    setStep("details");
    setClientSecret(null);
    setPaymentIntentId(null);
    setPurchaseResult(null);
  };

  const deliveryMethod = form.watch("deliveryMethod");
  const selectedThemeId = form.watch("themeId");

  if (step === "success" && purchaseResult) {
    return (
      <SuccessView
        giftCardCode={purchaseResult.code}
        amount={purchaseResult.amount}
        deliveryMethod={purchaseResult.deliveryMethod}
        recipientEmail={purchaseResult.recipientEmail}
        onPurchaseAnother={handlePurchaseAnother}
      />
    );
  }

  return (
    <div className="space-y-8">
      {/* Progress Steps */}
      <div className="flex items-center justify-center gap-4 mb-8">
        <div className={`flex items-center gap-2 ${step === "details" ? "text-[#5170FF]" : "text-muted-foreground"}`}>
          <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
            step === "details" ? "bg-[#5170FF] text-white" : "bg-muted"
          }`}>
            1
          </div>
          <span className="hidden sm:inline">Gift Card Details</span>
        </div>
        <ArrowRight className="w-4 h-4 text-muted-foreground" />
        <div className={`flex items-center gap-2 ${step === "payment" ? "text-[#5170FF]" : "text-muted-foreground"}`}>
          <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
            step === "payment" ? "bg-[#5170FF] text-white" : "bg-muted"
          }`}>
            2
          </div>
          <span className="hidden sm:inline">Payment</span>
        </div>
      </div>

      {step === "details" && (
        <Form {...form}>
          <form onSubmit={handleDetailsSubmit} className="space-y-8">
            {/* Theme Selection */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Gift className="w-5 h-5" />
                  Choose a Design
                </CardTitle>
                <CardDescription>Select a theme for your gift card</CardDescription>
              </CardHeader>
              <CardContent>
                {themesLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
                  </div>
                ) : themes.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <Gift className="w-12 h-12 mx-auto mb-4 opacity-50" />
                    <p>No themes available</p>
                  </div>
                ) : (
                  <FormField
                    control={form.control}
                    name="themeId"
                    render={({ field }) => (
                      <FormItem>
                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                          {themes.map((theme) => (
                            <ThemeCard
                              key={theme.id}
                              theme={theme}
                              isSelected={field.value === theme.id}
                              onSelect={() => field.onChange(theme.id)}
                            />
                          ))}
                        </div>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                )}
              </CardContent>
            </Card>

            {/* Amount Selection */}
            <Card>
              <CardHeader>
                <CardTitle>Select Amount</CardTitle>
                <CardDescription>Choose a value between $10 and $500</CardDescription>
              </CardHeader>
              <CardContent>
                <FormField
                  control={form.control}
                  name="amount"
                  render={({ field }) => (
                    <FormItem>
                      <AmountSelector
                        value={field.value}
                        onChange={field.onChange}
                      />
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </CardContent>
            </Card>

            {/* Delivery Method */}
            <Card>
              <CardHeader>
                <CardTitle>Delivery Method</CardTitle>
                <CardDescription>How would you like to deliver this gift card?</CardDescription>
              </CardHeader>
              <CardContent>
                <FormField
                  control={form.control}
                  name="deliveryMethod"
                  render={({ field }) => (
                    <FormItem>
                      <RadioGroup
                        value={field.value}
                        onValueChange={field.onChange}
                        className="grid grid-cols-1 sm:grid-cols-2 gap-4"
                      >
                        <Label
                          htmlFor="email"
                          className={`flex items-center gap-4 p-4 rounded-lg border-2 cursor-pointer transition-colors ${
                            field.value === "email" 
                              ? "border-[#5170FF] bg-[#5170FF]/5" 
                              : "border-muted hover:border-[#5170FF]/50"
                          }`}
                        >
                          <RadioGroupItem value="email" id="email" />
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <Mail className="w-5 h-5 text-[#5170FF]" />
                              <span className="font-medium">Email to Recipient</span>
                            </div>
                            <p className="text-sm text-muted-foreground mt-1">
                              We'll send the gift card directly to your recipient
                            </p>
                          </div>
                        </Label>
                        <Label
                          htmlFor="download"
                          className={`flex items-center gap-4 p-4 rounded-lg border-2 cursor-pointer transition-colors ${
                            field.value === "download" 
                              ? "border-[#5170FF] bg-[#5170FF]/5" 
                              : "border-muted hover:border-[#5170FF]/50"
                          }`}
                        >
                          <RadioGroupItem value="download" id="download" />
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <Download className="w-5 h-5 text-[#5170FF]" />
                              <span className="font-medium">Get Code Now</span>
                            </div>
                            <p className="text-sm text-muted-foreground mt-1">
                              Receive the code immediately to share yourself
                            </p>
                          </div>
                        </Label>
                      </RadioGroup>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </CardContent>
            </Card>

            {/* Purchaser Information */}
            <Card>
              <CardHeader>
                <CardTitle>Your Information</CardTitle>
                <CardDescription>We'll send a confirmation to this email</CardDescription>
              </CardHeader>
              <CardContent className="grid gap-4 sm:grid-cols-2">
                <FormField
                  control={form.control}
                  name="purchaserName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Your Name</FormLabel>
                      <FormControl>
                        <Input placeholder="John Doe" {...field} data-testid="purchaser-name" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="purchaserEmail"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Your Email</FormLabel>
                      <FormControl>
                        <Input type="email" placeholder="you@example.com" {...field} data-testid="purchaser-email" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </CardContent>
            </Card>

            {/* Recipient Information (for email delivery) */}
            {deliveryMethod === "email" && (
              <Card>
                <CardHeader>
                  <CardTitle>Recipient Information</CardTitle>
                  <CardDescription>Who are you sending this gift card to?</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid gap-4 sm:grid-cols-2">
                    <FormField
                      control={form.control}
                      name="recipientName"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Recipient Name (Optional)</FormLabel>
                          <FormControl>
                            <Input placeholder="Jane Doe" {...field} data-testid="recipient-name" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="recipientEmail"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Recipient Email</FormLabel>
                          <FormControl>
                            <Input type="email" placeholder="recipient@example.com" {...field} data-testid="recipient-email" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  <FormField
                    control={form.control}
                    name="personalMessage"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Personal Message (Optional)</FormLabel>
                        <FormControl>
                          <Textarea 
                            placeholder="Add a personal message to your gift card..."
                            className="min-h-[100px]"
                            {...field}
                            data-testid="personal-message"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </CardContent>
              </Card>
            )}

            {/* Submit Button */}
            <div className="flex justify-end">
              <Button 
                type="submit" 
                size="lg"
                className="bg-[#5170FF] hover:bg-[#5170FF]/90"
                disabled={createPaymentIntentMutation.isPending}
                data-testid="proceed-to-payment"
              >
                {createPaymentIntentMutation.isPending ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Processing...
                  </>
                ) : (
                  <>
                    Continue to Payment
                    <ArrowRight className="w-4 h-4 ml-2" />
                  </>
                )}
              </Button>
            </div>
          </form>
        </Form>
      )}

      {step === "payment" && clientSecret && stripePromise && (
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Button 
                variant="ghost" 
                size="icon"
                onClick={() => setStep("details")}
                data-testid="back-to-details"
              >
                <ArrowLeft className="w-4 h-4" />
              </Button>
              <div>
                <CardTitle>Complete Payment</CardTitle>
                <CardDescription>Enter your payment details to purchase the gift card</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <Elements 
              stripe={stripePromise} 
              options={{ 
                clientSecret,
                appearance: {
                  theme: 'stripe',
                  variables: {
                    colorPrimary: '#5170FF',
                  },
                },
              }}
            >
              <PaymentForm
                clientSecret={clientSecret}
                amount={form.getValues("amount")}
                onSuccess={handlePaymentSuccess}
                onError={handlePaymentError}
              />
            </Elements>
          </CardContent>
        </Card>
      )}

      {completePurchaseMutation.isPending && (
        <div className="fixed inset-0 bg-background/80 flex items-center justify-center z-50">
          <Card className="p-8">
            <div className="flex flex-col items-center gap-4">
              <Loader2 className="w-8 h-8 animate-spin text-[#5170FF]" />
              <p className="text-lg font-medium">Creating your gift card...</p>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}

export default function GiftCardsPage() {
  return (
    <Layout>
      <div className="min-h-screen bg-gradient-to-b from-[#5170FF]/5 to-background">
        <div className="max-w-4xl mx-auto px-4 py-12">
          <div className="text-center mb-12">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-[#5170FF]/10 mb-4">
              <Gift className="w-8 h-8 text-[#5170FF]" />
            </div>
            <h1 className="text-3xl md:text-4xl font-bold mb-4">Give the Gift of Training</h1>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Purchase a gift card for friends or family to use towards courses and training sessions.
              Gift cards never expire and can be used for any of our services.
            </p>
          </div>

          <GiftCardPurchaseContent />
        </div>
      </div>
    </Layout>
  );
}
