import { useEffect, useState } from "react";
import { useSearch, useLocation } from "wouter";
import { Elements, PaymentElement, useStripe, useElements } from "@stripe/react-stripe-js";
import { getStripePromise } from "@/lib/stripe";
import { apiRequest } from "@/lib/queryClient";
import { Layout } from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Loader2, CheckCircle, AlertCircle, ShoppingCart } from "lucide-react";

interface RecoveryData {
  cartType: string;
  sourceRecordId: string;
  itemDescription: string;
  amount: string;
  customerEmail: string;
  customerFirstName: string;
  clientSecret?: string;
  alreadyCompleted?: boolean;
  courseName?: string;
  courseId?: string;
  scheduleId?: string;
  orderId?: string;
}

function PaymentForm({ recoveryData, onSuccess }: { recoveryData: RecoveryData; onSuccess: () => void }) {
  const stripe = useStripe();
  const elements = useElements();
  const [isProcessing, setIsProcessing] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!stripe || !elements) return;

    setIsProcessing(true);
    setErrorMessage(null);

    const { error, paymentIntent } = await stripe.confirmPayment({
      elements,
      confirmParams: {
        return_url: `${window.location.origin}/recover?completed=true`,
      },
      redirect: "if_required",
    });

    if (error) {
      setErrorMessage(error.message || "An error occurred with your payment");
      setIsProcessing(false);
    } else if (paymentIntent && paymentIntent.status === "succeeded") {
      // Call the appropriate confirm endpoint based on cart type
      try {
        switch (recoveryData.cartType) {
          case 'online_course':
            await apiRequest("POST", "/api/online-course/confirm-payment", {
              enrollmentId: recoveryData.sourceRecordId,
              paymentIntentId: paymentIntent.id,
            });
            break;
          case 'merch_order':
            await apiRequest("POST", "/api/store/confirm-order", {
              orderId: recoveryData.orderId || recoveryData.sourceRecordId,
              paymentIntentId: paymentIntent.id,
            });
            break;
          case 'gift_card':
            await apiRequest("POST", "/api/giftcards/purchase/complete", {
              paymentIntentId: paymentIntent.id,
            });
            break;
          // in_person_course confirmation is handled by its own confirm endpoint
          case 'in_person_course':
            await apiRequest("POST", "/api/confirm-enrollment", {
              enrollmentId: recoveryData.sourceRecordId,
              paymentIntentId: paymentIntent.id,
            });
            break;
        }
      } catch (err) {
        console.error("Confirm endpoint failed, webhook will handle:", err);
      }
      onSuccess();
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="bg-zinc-800/50 p-4 rounded-lg space-y-2">
        <div className="flex justify-between text-sm">
          <span className="text-zinc-400">Item</span>
          <span className="text-white">{recoveryData.itemDescription}</span>
        </div>
        {parseFloat(recoveryData.amount) > 0 && (
          <div className="flex justify-between text-lg font-bold pt-2 border-t border-zinc-700">
            <span className="text-white">Total</span>
            <span className="text-white">${parseFloat(recoveryData.amount).toFixed(2)}</span>
          </div>
        )}
      </div>

      <div className="bg-zinc-800/50 p-4 rounded-lg">
        <PaymentElement />
      </div>

      {errorMessage && (
        <div className="flex items-center gap-2 text-red-400 text-sm bg-red-500/10 p-3 rounded-lg">
          <AlertCircle className="h-4 w-4 flex-shrink-0" />
          {errorMessage}
        </div>
      )}

      <Button
        type="submit"
        className="w-full bg-[#004149] hover:bg-[#006d7a] text-white font-heading uppercase tracking-wide py-6 text-lg"
        disabled={!stripe || isProcessing}
      >
        {isProcessing ? (
          <span className="flex items-center gap-2">
            <Loader2 className="h-5 w-5 animate-spin" />
            Processing...
          </span>
        ) : (
          "Complete Payment"
        )}
      </Button>
    </form>
  );
}

export default function RecoverPage() {
  const search = useSearch();
  const [, setLocation] = useLocation();
  const params = new URLSearchParams(search);
  const token = params.get("token");
  const completed = params.get("completed");

  const [status, setStatus] = useState<"loading" | "ready" | "success" | "error" | "expired">("loading");
  const [recoveryData, setRecoveryData] = useState<RecoveryData | null>(null);
  const [errorMessage, setErrorMessage] = useState("");

  const stripePromise = getStripePromise();

  useEffect(() => {
    if (completed === "true") {
      setStatus("success");
      return;
    }

    if (!token) {
      setStatus("error");
      setErrorMessage("No recovery token provided.");
      return;
    }

    async function fetchRecoveryData() {
      try {
        const res = await fetch(`/api/recover/${token}`);
        const data = await res.json();

        if (!res.ok) {
          if (res.status === 410) {
            setStatus("expired");
          } else {
            setStatus("error");
            setErrorMessage(data.message || "Unable to load recovery data.");
          }
          return;
        }

        if (data.alreadyCompleted) {
          setStatus("success");
          return;
        }

        if (!data.clientSecret) {
          setStatus("error");
          setErrorMessage("This payment session is no longer available. Please start a new checkout.");
          return;
        }

        setRecoveryData(data);
        setStatus("ready");
      } catch (err) {
        setStatus("error");
        setErrorMessage("Unable to load recovery data. Please try again later.");
      }
    }

    fetchRecoveryData();
  }, [token, completed]);

  return (
    <Layout>
      <div className="min-h-[60vh] flex items-center justify-center px-4 py-12">
        <div className="max-w-md w-full">
          {status === "loading" && (
            <div className="text-center">
              <Loader2 className="h-12 w-12 animate-spin text-[#004149] mx-auto mb-4" />
              <p className="text-zinc-400">Loading your order...</p>
            </div>
          )}

          {status === "success" && (
            <div className="text-center space-y-4">
              <CheckCircle className="h-16 w-16 text-green-500 mx-auto" />
              <h1 className="text-2xl font-heading uppercase text-white">Payment Complete!</h1>
              <p className="text-zinc-400">
                Your payment has been processed successfully. You should receive a confirmation shortly.
              </p>
              <Button
                onClick={() => setLocation("/")}
                className="bg-[#004149] hover:bg-[#006d7a] text-white"
              >
                Return to Home
              </Button>
            </div>
          )}

          {status === "expired" && (
            <div className="text-center space-y-4">
              <AlertCircle className="h-16 w-16 text-yellow-500 mx-auto" />
              <h1 className="text-2xl font-heading uppercase text-white">Link Expired</h1>
              <p className="text-zinc-400">
                This recovery link has expired. Please visit our website to start a new checkout.
              </p>
              <Button
                onClick={() => setLocation("/")}
                className="bg-[#004149] hover:bg-[#006d7a] text-white"
              >
                Visit Website
              </Button>
            </div>
          )}

          {status === "error" && (
            <div className="text-center space-y-4">
              <AlertCircle className="h-16 w-16 text-red-500 mx-auto" />
              <h1 className="text-2xl font-heading uppercase text-white">Something Went Wrong</h1>
              <p className="text-zinc-400">{errorMessage}</p>
              <Button
                onClick={() => setLocation("/")}
                className="bg-[#004149] hover:bg-[#006d7a] text-white"
              >
                Return to Home
              </Button>
            </div>
          )}

          {status === "ready" && recoveryData && recoveryData.clientSecret && (
            <div className="space-y-6">
              <div className="text-center space-y-2">
                <ShoppingCart className="h-12 w-12 text-[#004149] mx-auto" />
                <h1 className="text-2xl font-heading uppercase text-white">
                  Complete Your Purchase
                </h1>
                <p className="text-zinc-400">
                  Hi {recoveryData.customerFirstName || "there"}, finish your checkout below.
                </p>
              </div>

              <Elements
                stripe={stripePromise}
                options={{
                  clientSecret: recoveryData.clientSecret,
                  appearance: {
                    theme: "night",
                    variables: {
                      colorPrimary: "#006d7a",
                      colorBackground: "#1D1D20",
                      colorText: "#ffffff",
                      colorDanger: "#ef4444",
                      fontFamily: "system-ui, sans-serif",
                      borderRadius: "8px",
                    },
                  },
                }}
              >
                <PaymentForm
                  recoveryData={recoveryData}
                  onSuccess={() => setStatus("success")}
                />
              </Elements>
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
}
