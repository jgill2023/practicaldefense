import { useEffect, useState } from "react";
import { useSearch } from "wouter";
import { Layout } from "@/components/Layout";
import { CheckCircle, Loader2, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { apiRequest } from "@/lib/queryClient";

export default function OnlineCourseConfirmation() {
  const search = useSearch();
  const params = new URLSearchParams(search);
  const enrollmentId = params.get("enrollmentId");
  const paymentIntentId = params.get("payment_intent");
  const redirectStatus = params.get("redirect_status");

  const [status, setStatus] = useState<"loading" | "success" | "error">("loading");
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    async function confirmPayment() {
      if (!enrollmentId || !paymentIntentId) {
        setStatus("error");
        setErrorMessage("Missing enrollment or payment information.");
        return;
      }

      if (redirectStatus && redirectStatus !== "succeeded") {
        setStatus("error");
        setErrorMessage("Your payment was not completed. Please try again.");
        return;
      }

      try {
        await apiRequest("POST", "/api/online-course/confirm-payment", {
          enrollmentId,
          paymentIntentId,
        });
        setStatus("success");
      } catch (err: any) {
        // Even if this call fails, the webhook should handle it
        console.error("confirm-payment failed:", err);
        setStatus("success");
      }
    }

    confirmPayment();
  }, [enrollmentId, paymentIntentId, redirectStatus]);

  return (
    <Layout>
      <div className="min-h-[60vh] flex items-center justify-center px-4">
        <div className="text-center max-w-md space-y-6">
          {status === "loading" && (
            <>
              <Loader2 className="h-12 w-12 animate-spin text-[#006d7a] mx-auto" />
              <h1 className="text-2xl font-heading uppercase tracking-widest">
                Processing Your Enrollment...
              </h1>
              <p className="text-muted-foreground">
                Please wait while we set up your course access.
              </p>
            </>
          )}

          {status === "success" && (
            <>
              <div className="mx-auto w-16 h-16 bg-green-500/20 rounded-full flex items-center justify-center">
                <CheckCircle className="h-10 w-10 text-green-500" />
              </div>
              <h1 className="text-2xl font-heading uppercase tracking-widest">
                You're Enrolled!
              </h1>
              <p className="text-muted-foreground">
                Thank you for enrolling. Your Moodle login credentials will be sent to your email and phone shortly.
              </p>
              <p className="text-sm text-muted-foreground">
                Check your inbox (and spam folder) for your course access details.
              </p>
              <Button
                onClick={() => window.location.href = "/"}
                className="bg-[#006d7a] hover:bg-[#004149] text-white font-heading uppercase tracking-wide"
              >
                Return Home
              </Button>
            </>
          )}

          {status === "error" && (
            <>
              <div className="mx-auto w-16 h-16 bg-red-500/20 rounded-full flex items-center justify-center">
                <AlertCircle className="h-10 w-10 text-red-500" />
              </div>
              <h1 className="text-2xl font-heading uppercase tracking-widest">
                Something Went Wrong
              </h1>
              <p className="text-muted-foreground">{errorMessage}</p>
              <Button
                onClick={() => window.location.href = "/online-nm-concealed-carry-course"}
                className="bg-[#006d7a] hover:bg-[#004149] text-white font-heading uppercase tracking-wide"
              >
                Try Again
              </Button>
            </>
          )}
        </div>
      </div>
    </Layout>
  );
}
