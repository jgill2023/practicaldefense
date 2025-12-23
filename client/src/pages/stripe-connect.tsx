import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { isInstructorOrHigher, isAdminOrHigher } from "@/lib/authUtils";
import { Layout } from "@/components/Layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { 
  CreditCard, 
  CheckCircle2, 
  XCircle, 
  AlertCircle, 
  ExternalLink, 
  Loader2,
  Link as LinkIcon,
  Unlink,
  Key,
  Eye,
  EyeOff
} from "lucide-react";

interface StripeStatus {
  configured: boolean;
  onboarded: boolean;
  chargesEnabled: boolean;
  payoutsEnabled: boolean;
  businessName?: string;
  keyPrefix?: string;
  keyLast4?: string;
  hasStoredCredentials?: boolean;
  encryptionConfigured?: boolean;
  message: string;
}

export default function StripeConnectPage() {
  const { user, isLoading: authLoading } = useAuth();
  const { toast } = useToast();
  const [secretKey, setSecretKey] = useState("");
  const [publishableKey, setPublishableKey] = useState("");
  const [showSecretKey, setShowSecretKey] = useState(false);

  const { data: status, isLoading: statusLoading } = useQuery<StripeStatus>({
    queryKey: ["/api/stripe-connect/status"],
    enabled: !!user && isInstructorOrHigher(user),
  });

  const saveCredentialsMutation = useMutation({
    mutationFn: async (data: { secretKey: string; publishableKey?: string }) => {
      return apiRequest("POST", "/api/stripe-connect/credentials", data);
    },
    onSuccess: (data: any) => {
      toast({
        title: "Stripe Connected!",
        description: data.message || "Your Stripe API keys have been saved and validated.",
      });
      setSecretKey("");
      setPublishableKey("");
      queryClient.invalidateQueries({ queryKey: ["/api/stripe-connect/status"] });
    },
    onError: (error: any) => {
      let errorMessage = "Failed to save Stripe credentials";
      try {
        const errorData = JSON.parse(error.message.split(': ')[1] || '{}');
        errorMessage = errorData.error || errorMessage;
      } catch {
        errorMessage = error.message || errorMessage;
      }
      toast({
        title: "Connection Failed",
        description: errorMessage,
        variant: "destructive",
      });
    },
  });

  const disconnectMutation = useMutation({
    mutationFn: async () => {
      return apiRequest("DELETE", "/api/stripe-connect/disconnect");
    },
    onSuccess: () => {
      toast({
        title: "Stripe Disconnected",
        description: "Stripe has been disconnected. You can reconnect anytime.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/stripe-connect/status"] });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to disconnect Stripe",
        variant: "destructive",
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!secretKey.trim()) {
      toast({
        title: "Missing Secret Key",
        description: "Please enter your Stripe Secret Key",
        variant: "destructive",
      });
      return;
    }
    saveCredentialsMutation.mutate({ 
      secretKey: secretKey.trim(),
      publishableKey: publishableKey.trim() || undefined
    });
  };

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

  const isAdmin = isAdminOrHigher(user);

  return (
    <Layout>
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <div className="mb-8">
          <h1 className="text-3xl font-bold flex items-center gap-3">
            <CreditCard className="h-8 w-8" />
            Stripe Payments
          </h1>
          <p className="text-muted-foreground mt-2">
            Connect your Stripe account to accept payments
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
                <Badge variant="secondary">
                  <XCircle className="h-3 w-3 mr-1" />
                  Not Connected
                </Badge>
              )}
            </CardTitle>
            <CardDescription>
              Practical Defense Training payment processing status
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
                    Stripe is configured and ready to accept payments for Practical Defense Training.
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

                {status.keyPrefix && status.keyLast4 && (
                  <div className="mt-4 p-4 bg-muted rounded-lg">
                    <span className="text-sm text-muted-foreground">API Key:</span>
                    <span className="ml-2 font-mono">{status.keyPrefix}...{status.keyLast4}</span>
                  </div>
                )}

                {isAdmin && (
                  <div className="mt-6 pt-4 border-t">
                    <Button
                      variant="outline"
                      onClick={() => disconnectMutation.mutate()}
                      disabled={disconnectMutation.isPending}
                      className="text-red-600 hover:text-red-700 hover:bg-red-50"
                      data-testid="button-disconnect-stripe"
                    >
                      {disconnectMutation.isPending ? (
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      ) : (
                        <Unlink className="h-4 w-4 mr-2" />
                      )}
                      Disconnect Stripe
                    </Button>
                  </div>
                )}
              </div>
            ) : (
              <div className="space-y-6">
                <Alert>
                  <AlertCircle className="h-4 w-4" />
                  <AlertTitle>Stripe Not Connected</AlertTitle>
                  <AlertDescription>
                    {status?.message || "Enter your Stripe API keys to start accepting payments."}
                  </AlertDescription>
                </Alert>

                {isAdmin && (
                  <div className="space-y-6">
                    <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                      <h4 className="font-medium mb-3 text-blue-800">Setup Instructions:</h4>
                      <ol className="list-decimal list-inside text-sm text-blue-700 space-y-3">
                        <li>
                          <strong>Create or log in to your Stripe account:</strong>{" "}
                          <a 
                            href="https://dashboard.stripe.com/register" 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="text-primary hover:underline"
                          >
                            dashboard.stripe.com
                          </a>
                        </li>
                        <li>
                          <strong>Complete account setup:</strong> Stripe will guide you through identity verification, bank account connection, and tax information.
                        </li>
                        <li>
                          <strong>Get your API keys:</strong> Go to{" "}
                          <a 
                            href="https://dashboard.stripe.com/apikeys" 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="text-primary hover:underline"
                          >
                            Developers → API keys
                          </a>{" "}
                          and copy your keys.
                        </li>
                        <li>
                          <strong>Enter your keys below</strong> to connect your Stripe account.
                        </li>
                      </ol>
                    </div>

                    <form onSubmit={handleSubmit} className="space-y-4">
                      <div className="space-y-2">
                        <Label htmlFor="secretKey" className="flex items-center gap-2">
                          <Key className="h-4 w-4" />
                          Secret Key <span className="text-red-500">*</span>
                        </Label>
                        <div className="relative">
                          <Input
                            id="secretKey"
                            type={showSecretKey ? "text" : "password"}
                            value={secretKey}
                            onChange={(e) => setSecretKey(e.target.value)}
                            placeholder="sk_live_... or sk_test_..."
                            className="pr-10 font-mono"
                            data-testid="input-secret-key"
                          />
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="absolute right-0 top-0 h-full px-3"
                            onClick={() => setShowSecretKey(!showSecretKey)}
                          >
                            {showSecretKey ? (
                              <EyeOff className="h-4 w-4" />
                            ) : (
                              <Eye className="h-4 w-4" />
                            )}
                          </Button>
                        </div>
                        <p className="text-xs text-muted-foreground">
                          Your secret key starts with "sk_live_" for production or "sk_test_" for testing.
                        </p>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="publishableKey" className="flex items-center gap-2">
                          <Key className="h-4 w-4" />
                          Publishable Key <span className="text-muted-foreground text-xs">(optional)</span>
                        </Label>
                        <Input
                          id="publishableKey"
                          type="text"
                          value={publishableKey}
                          onChange={(e) => setPublishableKey(e.target.value)}
                          placeholder="pk_live_... or pk_test_..."
                          className="font-mono"
                          data-testid="input-publishable-key"
                        />
                        <p className="text-xs text-muted-foreground">
                          Your publishable key starts with "pk_live_" for production or "pk_test_" for testing.
                        </p>
                      </div>

                      <Alert>
                        <AlertCircle className="h-4 w-4" />
                        <AlertTitle>Security Note</AlertTitle>
                        <AlertDescription>
                          Your API keys are encrypted and stored securely. We only use them to process payments on your behalf.
                        </AlertDescription>
                      </Alert>

                      <Button
                        type="submit"
                        size="lg"
                        disabled={saveCredentialsMutation.isPending || !secretKey.trim()}
                        className="w-full"
                        data-testid="button-connect-stripe"
                      >
                        {saveCredentialsMutation.isPending ? (
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        ) : (
                          <LinkIcon className="h-4 w-4 mr-2" />
                        )}
                        Connect Stripe Account
                      </Button>
                    </form>
                  </div>
                )}

                {!isAdmin && (
                  <Alert variant="destructive">
                    <AlertCircle className="h-4 w-4" />
                    <AlertTitle>Admin Required</AlertTitle>
                    <AlertDescription>
                      Please contact an administrator to connect Stripe and enable payment processing.
                    </AlertDescription>
                  </Alert>
                )}
              </div>
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
              Practical Defense Training uses Stripe for secure payment processing. All payments are processed 
              directly through your Stripe account.
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
