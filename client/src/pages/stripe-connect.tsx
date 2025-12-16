import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { isInstructorOrHigher } from "@/lib/authUtils";
import { Layout } from "@/components/Layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { 
  CreditCard, 
  CheckCircle2, 
  XCircle, 
  AlertCircle, 
  ExternalLink, 
  Loader2
} from "lucide-react";

interface StripeStatus {
  configured: boolean;
  chargesEnabled: boolean;
  payoutsEnabled: boolean;
  businessName?: string;
  message: string;
}

export default function StripeConnectPage() {
  const { user, isLoading: authLoading } = useAuth();

  const { data: status, isLoading: statusLoading } = useQuery<StripeStatus>({
    queryKey: ["/api/stripe-connect/status"],
    enabled: !!user && isInstructorOrHigher(user),
  });

  if (authLoading) {
    return (
      <Layout>
        <div className="flex items-center justify-center min-h-screen">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </Layout>
    );
  }

  if (!user || !isInstructorOrHigher(user)) {
    return (
      <Layout>
        <div className="container mx-auto px-4 py-8">
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Access Denied</AlertTitle>
            <AlertDescription>
              You need to be an instructor or admin to access this page.
            </AlertDescription>
          </Alert>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <div className="mb-8">
          <h1 className="text-3xl font-bold flex items-center gap-3">
            <CreditCard className="h-8 w-8" />
            Stripe Payments
          </h1>
          <p className="text-muted-foreground mt-2">
            View the status of your Stripe payment processing
          </p>
        </div>

        {/* Status Card */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              Payment Status
              {statusLoading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : status?.configured ? (
                <Badge className="bg-green-100 text-green-800 hover:bg-green-100">
                  <CheckCircle2 className="h-3 w-3 mr-1" />
                  Active
                </Badge>
              ) : (
                <Badge variant="destructive">
                  <XCircle className="h-3 w-3 mr-1" />
                  Not Configured
                </Badge>
              )}
            </CardTitle>
            <CardDescription>
              Apache Solutions payment processing status
            </CardDescription>
          </CardHeader>
          <CardContent>
            {statusLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : status?.configured ? (
              <div className="space-y-4">
                <Alert className="bg-green-50 border-green-200">
                  <CheckCircle2 className="h-4 w-4 text-green-600" />
                  <AlertTitle className="text-green-800">Payments Active</AlertTitle>
                  <AlertDescription className="text-green-700">
                    Stripe is configured and ready to accept payments for Apache Solutions.
                    All payments go directly to your business account.
                  </AlertDescription>
                </Alert>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                  <div className="p-4 border rounded-lg">
                    <div className="flex items-center gap-2 mb-2">
                      {status.chargesEnabled ? (
                        <CheckCircle2 className="h-5 w-5 text-green-600" />
                      ) : (
                        <XCircle className="h-5 w-5 text-red-600" />
                      )}
                      <span className="font-medium">Charges</span>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {status.chargesEnabled 
                        ? "Your account can accept payments" 
                        : "Charges are not enabled"}
                    </p>
                  </div>

                  <div className="p-4 border rounded-lg">
                    <div className="flex items-center gap-2 mb-2">
                      {status.payoutsEnabled ? (
                        <CheckCircle2 className="h-5 w-5 text-green-600" />
                      ) : (
                        <XCircle className="h-5 w-5 text-red-600" />
                      )}
                      <span className="font-medium">Payouts</span>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {status.payoutsEnabled 
                        ? "Daily payouts are enabled" 
                        : "Payouts are not enabled"}
                    </p>
                  </div>
                </div>

                {status.businessName && (
                  <div className="mt-4 p-4 bg-muted rounded-lg">
                    <span className="text-sm text-muted-foreground">Business Name:</span>
                    <span className="ml-2 font-medium">{status.businessName}</span>
                  </div>
                )}
              </div>
            ) : (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>Stripe Not Configured</AlertTitle>
                <AlertDescription>
                  {status?.message || "Stripe API keys need to be configured to accept payments."}
                  <br />
                  <span className="text-sm mt-2 block">
                    Please ensure STRIPE_SECRET_KEY is set in your environment variables.
                  </span>
                </AlertDescription>
              </Alert>
            )}
          </CardContent>
        </Card>

        {/* Information Card */}
        <Card>
          <CardHeader>
            <CardTitle>About Stripe Integration</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-muted-foreground">
              Apache Solutions uses Stripe for secure payment processing. All payments are processed 
              directly through our Stripe account.
            </p>
            
            <Separator />
            
            <div className="space-y-3">
              <h4 className="font-medium">Payment Features:</h4>
              <ul className="list-disc list-inside text-sm text-muted-foreground space-y-1">
                <li>Secure credit card processing</li>
                <li>Automatic receipts sent to customers</li>
                <li>Daily payouts to your bank account</li>
                <li>PCI-compliant payment handling</li>
                <li>Full refund capabilities</li>
              </ul>
            </div>

            <Separator />

            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <ExternalLink className="h-4 w-4" />
              <span>
                Manage your Stripe account settings, view transactions, and process refunds at{" "}
                <a 
                  href="https://dashboard.stripe.com" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="text-primary hover:underline"
                  data-testid="link-stripe-dashboard"
                >
                  dashboard.stripe.com
                </a>
              </span>
            </div>
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}
