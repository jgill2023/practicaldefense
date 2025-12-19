import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { useQuery } from "@tanstack/react-query";
import { isInstructorOrHigher } from "@/lib/authUtils";
import { Layout } from "@/components/Layout";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { AlertCircle, Loader2, Calendar, CheckCircle2, XCircle, ExternalLink, RefreshCw } from "lucide-react";
import { SiGoogle } from "react-icons/si";

export default function SettingsPage() {
  const { user, isLoading: authLoading } = useAuth();
  const { toast } = useToast();
  const [isConnecting, setIsConnecting] = useState(false);

  // Fetch runtime config for auth service URL
  const { data: appConfig } = useQuery<{ authServiceUrl: string | null }>({
    queryKey: ["/api/config"],
    queryFn: async () => {
      const response = await fetch("/api/config");
      if (!response.ok) {
        throw new Error("Failed to fetch config");
      }
      return response.json();
    },
  });

  const { data: calendarStatus, isLoading: calendarStatusLoading, refetch: refetchCalendarStatus } = useQuery<{
    connected: boolean;
    email?: string;
    syncStatus?: string;
    lastSyncAt?: string;
  }>({
    queryKey: ["/api/availability/instructor/google-status"],
    queryFn: async () => {
      const response = await fetch("/api/availability/instructor/google-status", {
        credentials: "include",
      });
      if (!response.ok) {
        if (response.status === 404) {
          return { connected: false };
        }
        throw new Error("Failed to fetch calendar status");
      }
      return response.json();
    },
    enabled: !!user && isInstructorOrHigher(user),
  });

  const handleConnectGoogle = () => {
    if (!user?.id) {
      toast({
        title: "Error",
        description: "User not authenticated",
        variant: "destructive",
      });
      return;
    }
    
    setIsConnecting(true);
    
    const authServiceUrl = appConfig?.authServiceUrl;
    if (!authServiceUrl) {
      toast({
        title: "Configuration Error",
        description: "Auth service URL is not configured",
        variant: "destructive",
      });
      setIsConnecting(false);
      return;
    }
    
    // Use /auth/callback as the return URL so the server can save credentials
    const callbackUrl = `${window.location.origin}/auth/callback?instructorId=${user.id}`;
    const returnUrl = encodeURIComponent(callbackUrl);
    const authUrl = `${authServiceUrl}/auth?instructorId=${user.id}&returnUrl=${returnUrl}`;
    window.location.href = authUrl;
  };

  const handleDisconnectGoogle = async () => {
    if (!confirm("Are you sure you want to disconnect your Google Calendar? Your availability will no longer sync with Google.")) {
      return;
    }
    setIsConnecting(true);
    try {
      const response = await fetch("/api/availability/instructor/google-disconnect", {
        method: "POST",
        credentials: "include",
      });
      if (!response.ok) {
        throw new Error("Failed to disconnect");
      }
      toast({
        title: "Disconnected",
        description: "Your Google Calendar has been disconnected.",
      });
      refetchCalendarStatus();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to disconnect Google Calendar",
        variant: "destructive",
      });
    } finally {
      setIsConnecting(false);
    }
  };

  if (authLoading) {
    return (
      <Layout>
        <div className="flex items-center justify-center min-h-[400px]">
          <Loader2 className="h-8 w-8 animate-spin text-primary" data-testid="loading-spinner" />
        </div>
      </Layout>
    );
  }

  if (!user || !isInstructorOrHigher(user)) {
    return (
      <Layout>
        <div className="container mx-auto py-8 px-4">
          <Alert variant="destructive" data-testid="alert-unauthorized">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Access Denied</AlertTitle>
            <AlertDescription>
              You don't have permission to access settings. Instructor or admin access is required.
            </AlertDescription>
          </Alert>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="container mx-auto py-8 px-4 max-w-4xl">
        <div className="mb-8">
          <h1 className="text-3xl font-bold" data-testid="text-page-title">Settings</h1>
          <p className="text-muted-foreground mt-2">
            Configure platform settings and integrations
          </p>
        </div>

        <div className="space-y-6">
          {/* Google Calendar Integration */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="h-5 w-5" />
                Google Calendar Integration
              </CardTitle>
              <CardDescription>
                Connect your Google Calendar to automatically sync your busy times and avoid double-booking
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {calendarStatusLoading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              ) : calendarStatus?.connected ? (
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-4 rounded-lg bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800">
                    <div className="flex items-center gap-3">
                      <CheckCircle2 className="h-5 w-5 text-green-600" />
                      <div>
                        <p className="font-medium text-green-800 dark:text-green-200">Connected</p>
                        {calendarStatus.email && (
                          <p className="text-sm text-green-600 dark:text-green-400">{calendarStatus.email}</p>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {calendarStatus.syncStatus && (
                        <Badge variant={calendarStatus.syncStatus === 'healthy' ? 'default' : 'destructive'}>
                          {calendarStatus.syncStatus}
                        </Badge>
                      )}
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => refetchCalendarStatus()}
                        data-testid="button-refresh-calendar-status"
                      >
                        <RefreshCw className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>

                  <div className="flex flex-col sm:flex-row gap-3">
                    <Button
                      variant="outline"
                      onClick={handleConnectGoogle}
                      disabled={isConnecting}
                      data-testid="button-reconnect-google"
                    >
                      {isConnecting ? (
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      ) : (
                        <SiGoogle className="h-4 w-4 mr-2" />
                      )}
                      Reconnect Account
                    </Button>
                    <Button
                      variant="destructive"
                      onClick={handleDisconnectGoogle}
                      disabled={isConnecting}
                      data-testid="button-disconnect-google"
                    >
                      {isConnecting ? (
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      ) : (
                        <XCircle className="h-4 w-4 mr-2" />
                      )}
                      Disconnect
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="flex items-center gap-3 p-4 rounded-lg bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800">
                    <AlertCircle className="h-5 w-5 text-amber-600" />
                    <div>
                      <p className="font-medium text-amber-800 dark:text-amber-200">Not Connected</p>
                      <p className="text-sm text-amber-600 dark:text-amber-400">
                        Connect your Google Calendar to sync your availability automatically
                      </p>
                    </div>
                  </div>

                  <Button
                    onClick={handleConnectGoogle}
                    disabled={isConnecting}
                    className="w-full sm:w-auto"
                    data-testid="button-connect-google"
                  >
                    {isConnecting ? (
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    ) : (
                      <SiGoogle className="h-4 w-4 mr-2" />
                    )}
                    Connect Google Calendar
                  </Button>
                </div>
              )}

              {/* Instructions */}
              <div className="mt-6 pt-6 border-t">
                <h4 className="font-medium mb-3">How it works:</h4>
                <ol className="list-decimal list-inside space-y-2 text-sm text-muted-foreground">
                  <li>Click "Connect Google Calendar" to authorize access</li>
                  <li>Select which Google account to connect</li>
                  <li>Grant permission to view your calendar events</li>
                  <li>Your busy times will automatically block off availability for appointments</li>
                </ol>

                <div className="mt-4 p-4 rounded-lg bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800">
                  <h5 className="font-medium text-blue-800 dark:text-blue-200 mb-2">What we access:</h5>
                  <ul className="text-sm text-blue-600 dark:text-blue-400 space-y-1">
                    <li>• <strong>Read-only</strong> access to view when you're busy</li>
                    <li>• We sync your calendar events to prevent double-booking</li>
                    <li>• We can create calendar events for new appointments</li>
                    <li>• You can disconnect at any time</li>
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </Layout>
  );
}
