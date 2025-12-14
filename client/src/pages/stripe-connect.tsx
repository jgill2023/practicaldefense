import { useEffect, useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { useAuth } from "@/hooks/useAuth";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { isAdminOrHigher, isInstructorOrHigher } from "@/lib/authUtils";
import { Layout } from "@/components/Layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { 
  CreditCard, 
  CheckCircle2, 
  XCircle, 
  AlertCircle, 
  ExternalLink, 
  Settings, 
  Loader2,
  Link as LinkIcon,
  Unlink
} from "lucide-react";

interface StripeConnectConfig {
  configured: boolean;
  clientId?: string;
}

interface StripeConnectStatus {
  connected: boolean;
  accountId: string | null;
  chargesEnabled: boolean;
  payoutsEnabled: boolean;
  detailsSubmitted: boolean;
  onboardingComplete: boolean;
  connectedAt?: string;
}

export default function StripeConnectPage() {
  const { user, isLoading: authLoading } = useAuth();
  const { toast } = useToast();
  const [location, setLocation] = useLocation();
  const [clientIdInput, setClientIdInput] = useState("");

  const urlParams = new URLSearchParams(window.location.search);
  const successParam = urlParams.get("success");
  const errorParam = urlParams.get("error");

  useEffect(() => {
    if (successParam === "true") {
      toast({
        title: "Success!",
        description: "Your Stripe account has been connected successfully.",
      });
      window.history.replaceState({}, "", "/stripe-connect");
      queryClient.invalidateQueries({ queryKey: ["/api/stripe-connect/status"] });
    } else if (errorParam) {
      toast({
        title: "Connection Failed",
        description: decodeURIComponent(errorParam),
        variant: "destructive",
      });
      window.history.replaceState({}, "", "/stripe-connect");
    }
  }, [successParam, errorParam, toast]);

  const { data: config, isLoading: configLoading } = useQuery<StripeConnectConfig>({
    queryKey: ["/api/stripe-connect/config"],
    enabled: !!user && isInstructorOrHigher(user),
  });

  const { data: status, isLoading: statusLoading } = useQuery<StripeConnectStatus>({
    queryKey: ["/api/stripe-connect/status"],
    enabled: !!user && isInstructorOrHigher(user),
  });

  const saveConfigMutation = useMutation({
    mutationFn: async (stripeClientId: string) => {
      return apiRequest("POST", "/api/stripe-connect/config", { stripeClientId: stripeClientId || null });
    },
    onSuccess: () => {
      toast({
        title: "Configuration Saved",
        description: "Stripe Client ID has been updated.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/stripe-connect/config"] });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to save configuration",
        variant: "destructive",
      });
    },
  });

  const getOAuthLinkMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("GET", "/api/stripe-connect/oauth-link");
      return response;
    },
    onSuccess: (data: any) => {
      if (data.url) {
        window.location.href = data.url;
      }
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to generate connection link",
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
        title: "Disconnected",
        description: "Your Stripe account has been disconnected.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/stripe-connect/status"] });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to disconnect account",
        variant: "destructive",
      });
    },
  });

  useEffect(() => {
    if (config?.clientId) {
      setClientIdInput(config.clientId);
    }
  }, [config]);

  if (authLoading) {
    return (
      <Layout>
        <div className="flex items-center justify-center min-h-screen">
          <Loader2 className="h-8 w-8 animate-spin" />
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
            <AlertTitle>Unauthorized</AlertTitle>
            <AlertDescription>
              You need instructor access to view this page.
            </AlertDescription>
          </Alert>
        </div>
      </Layout>
    );
  }

  const isAdmin = isAdminOrHigher(user);
  const isLoadingAny = configLoading || statusLoading;

  return (
    <Layout>
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <div className="mb-8">
          <h1 className="text-3xl font-bold flex items-center gap-3">
            <CreditCard className="h-8 w-8" />
            Payment Settings
          </h1>
          <p className="text-muted-foreground mt-2">
            Connect your Stripe account to receive payments directly
          </p>
        </div>

        {isAdmin && (
          <Card className="mb-8">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Settings className="h-5 w-5" />
                Platform Configuration
              </CardTitle>
              <CardDescription>
                Configure the Stripe Connect Client ID for this platform. This allows instructors to connect their Stripe accounts.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="client-id-input">Stripe Client ID</Label>
                <div className="flex gap-2">
                  <Input
                    id="client-id-input"
                    data-testid="input-stripe-client-id"
                    placeholder="ca_xxxxxxxxxxxxxxxx"
                    value={clientIdInput}
                    onChange={(e) => setClientIdInput(e.target.value)}
                    className="font-mono"
                  />
                  <Button
                    data-testid="button-save-client-id"
                    onClick={() => saveConfigMutation.mutate(clientIdInput)}
                    disabled={saveConfigMutation.isPending}
                  >
                    {saveConfigMutation.isPending ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      "Save"
                    )}
                  </Button>
                </div>
                <p className="text-sm text-muted-foreground">
                  Find your Client ID in the{" "}
                  <a
                    href="https://dashboard.stripe.com/settings/connect"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-primary hover:underline inline-flex items-center gap-1"
                    data-testid="link-stripe-dashboard-settings"
                  >
                    Stripe Dashboard <ExternalLink className="h-3 w-3" />
                  </a>
                </p>
              </div>

              <Alert data-testid="alert-redirect-uri">
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>Redirect URI Configuration</AlertTitle>
                <AlertDescription className="space-y-2">
                  <p>Add this redirect URI to your Stripe Connect settings:</p>
                  <code className="block bg-muted p-2 rounded text-sm font-mono break-all" data-testid="text-redirect-uri">
                    {window.location.origin}/api/stripe-connect/oauth/callback
                  </code>
                </AlertDescription>
              </Alert>

              <div className="flex items-center gap-2">
                <Badge variant={config?.configured ? "default" : "secondary"} data-testid="badge-config-status">
                  {config?.configured ? "Configured" : "Not Configured"}
                </Badge>
              </div>
            </CardContent>
          </Card>
        )}

        <Separator className="my-8" />

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <LinkIcon className="h-5 w-5" />
              Your Stripe Account
            </CardTitle>
            <CardDescription>
              Connect your Stripe account to receive payments from course enrollments and appointments
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {isLoadingAny ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-8 w-8 animate-spin" />
              </div>
            ) : !config?.configured ? (
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>Stripe Connect Not Configured</AlertTitle>
                <AlertDescription>
                  {isAdmin
                    ? "Please configure the Stripe Client ID above before connecting accounts."
                    : "Stripe Connect is not yet configured for this platform. Please contact an administrator."}
                </AlertDescription>
              </Alert>
            ) : status?.connected ? (
              <div className="space-y-6">
                <div className="flex items-center gap-3">
                  <CheckCircle2 className="h-8 w-8 text-green-500" />
                  <div>
                    <h3 className="font-semibold text-lg">Account Connected</h3>
                    <p className="text-sm text-muted-foreground font-mono">
                      {status.accountId}
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <StatusBadge
                    label="Charges Enabled"
                    enabled={status.chargesEnabled}
                    testId="status-charges-enabled"
                  />
                  <StatusBadge
                    label="Payouts Enabled"
                    enabled={status.payoutsEnabled}
                    testId="status-payouts-enabled"
                  />
                  <StatusBadge
                    label="Details Submitted"
                    enabled={status.detailsSubmitted}
                    testId="status-details-submitted"
                  />
                  <StatusBadge
                    label="Onboarding Complete"
                    enabled={status.onboardingComplete}
                    testId="status-onboarding-complete"
                  />
                </div>

                {status.connectedAt && (
                  <p className="text-sm text-muted-foreground">
                    Connected on {new Date(status.connectedAt).toLocaleDateString()}
                  </p>
                )}

                {!status.chargesEnabled && (
                  <Alert variant="destructive">
                    <AlertCircle className="h-4 w-4" />
                    <AlertTitle>Action Required</AlertTitle>
                    <AlertDescription>
                      Your Stripe account is not fully set up. Please complete the onboarding process in your{" "}
                      <a
                        href="https://dashboard.stripe.com"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="underline"
                      >
                        Stripe Dashboard
                      </a>{" "}
                      to start receiving payments.
                    </AlertDescription>
                  </Alert>
                )}

                <div className="flex gap-3">
                  <Button
                    variant="outline"
                    asChild
                  >
                    <a
                      href="https://dashboard.stripe.com"
                      target="_blank"
                      rel="noopener noreferrer"
                      data-testid="link-stripe-dashboard"
                    >
                      Open Stripe Dashboard
                      <ExternalLink className="h-4 w-4 ml-2" />
                    </a>
                  </Button>
                  <Button
                    variant="destructive"
                    data-testid="button-disconnect-stripe"
                    onClick={() => disconnectMutation.mutate()}
                    disabled={disconnectMutation.isPending}
                  >
                    {disconnectMutation.isPending ? (
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    ) : (
                      <Unlink className="h-4 w-4 mr-2" />
                    )}
                    Disconnect Account
                  </Button>
                </div>
              </div>
            ) : (
              <div className="space-y-6">
                <div className="flex items-center gap-3">
                  <XCircle className="h-8 w-8 text-muted-foreground" />
                  <div>
                    <h3 className="font-semibold text-lg">No Account Connected</h3>
                    <p className="text-sm text-muted-foreground">
                      Connect your Stripe account to start receiving payments
                    </p>
                  </div>
                </div>

                <Alert>
                  <AlertCircle className="h-4 w-4" />
                  <AlertTitle>How it works</AlertTitle>
                  <AlertDescription>
                    <ul className="list-disc list-inside space-y-1 mt-2">
                      <li>Click "Connect Stripe Account" to authorize with Stripe</li>
                      <li>You can connect an existing Stripe account or create a new one</li>
                      <li>Once connected, payments will be routed directly to your account</li>
                      <li>Platform fees (if any) are automatically deducted</li>
                    </ul>
                  </AlertDescription>
                </Alert>

                <Button
                  data-testid="button-connect-stripe"
                  onClick={() => getOAuthLinkMutation.mutate()}
                  disabled={getOAuthLinkMutation.isPending}
                  size="lg"
                  className="w-full md:w-auto"
                >
                  {getOAuthLinkMutation.isPending ? (
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  ) : (
                    <LinkIcon className="h-4 w-4 mr-2" />
                  )}
                  Connect Stripe Account
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}

function StatusBadge({ 
  label, 
  enabled, 
  testId 
}: { 
  label: string; 
  enabled: boolean;
  testId: string;
}) {
  return (
    <div 
      className="flex flex-col items-center p-3 rounded-lg bg-muted/50"
      data-testid={testId}
    >
      {enabled ? (
        <CheckCircle2 className="h-6 w-6 text-green-500 mb-1" />
      ) : (
        <XCircle className="h-6 w-6 text-muted-foreground mb-1" />
      )}
      <span className="text-xs text-center text-muted-foreground">{label}</span>
    </div>
  );
}
