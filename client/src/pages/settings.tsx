import { useEffect, useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
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
import { InstructorGoogleCalendarSettings } from "@/components/instructor/GoogleCalendarSettings";
import { 
  Calendar, 
  CheckCircle2, 
  XCircle, 
  AlertCircle, 
  ExternalLink, 
  Loader2,
  Link as LinkIcon,
  Unlink
} from "lucide-react";

interface GoogleCalendarStatus {
  configured: boolean;
  authorized: boolean;
  calendarId: string;
}

export default function SettingsPage() {
  const { user, isLoading: authLoading } = useAuth();
  const { toast } = useToast();
  const [calendarIdInput, setCalendarIdInput] = useState("");

  const urlParams = new URLSearchParams(window.location.search);
  const gcalSuccess = urlParams.get("gcal_success");
  const gcalError = urlParams.get("gcal_error");

  useEffect(() => {
    if (gcalSuccess === "true") {
      toast({
        title: "Success!",
        description: "Google Calendar has been connected successfully.",
      });
      window.history.replaceState({}, "", "/settings");
      queryClient.invalidateQueries({ queryKey: ["/api/google-calendar/status"] });
    } else if (gcalError) {
      let errorMessage = "Failed to connect Google Calendar.";
      switch (gcalError) {
        case "access_denied":
          errorMessage = "Access was denied. Please try again.";
          break;
        case "missing_params":
          errorMessage = "Missing required parameters.";
          break;
        case "invalid_state":
          errorMessage = "Invalid or expired authorization link. Please try again.";
          break;
        case "unauthorized":
          errorMessage = "You don't have permission to connect Google Calendar.";
          break;
        case "exchange_failed":
          errorMessage = "Failed to complete authorization. Please try again.";
          break;
      }
      toast({
        title: "Connection Failed",
        description: errorMessage,
        variant: "destructive",
      });
      window.history.replaceState({}, "", "/settings");
    }
  }, [gcalSuccess, gcalError, toast]);

  const { data: gcalStatus, isLoading: statusLoading } = useQuery<GoogleCalendarStatus>({
    queryKey: ["/api/google-calendar/status"],
    enabled: !!user && isAdminOrHigher(user),
  });

  const getOAuthLinkMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("GET", "/api/google-calendar/oauth-link");
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
      return apiRequest("POST", "/api/google-calendar/disconnect");
    },
    onSuccess: () => {
      toast({
        title: "Disconnected",
        description: "Google Calendar has been disconnected.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/google-calendar/status"] });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to disconnect",
        variant: "destructive",
      });
    },
  });

  const updateCalendarIdMutation = useMutation({
    mutationFn: async (calendarId: string) => {
      return apiRequest("POST", "/api/google-calendar/calendar-id", { calendarId });
    },
    onSuccess: () => {
      toast({
        title: "Calendar Updated",
        description: "Calendar ID has been updated successfully.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/google-calendar/status"] });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update calendar ID",
        variant: "destructive",
      });
    },
  });

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

  const isAdmin = isAdminOrHigher(user);

  return (
    <Layout>
      <div className="container mx-auto py-8 px-4 max-w-4xl">
        <div className="mb-8">
          <h1 className="text-3xl font-bold" data-testid="text-page-title">Settings</h1>
          <p className="text-muted-foreground mt-2">
            Configure integrations and platform settings
          </p>
        </div>

        <div className="space-y-6">
          <InstructorGoogleCalendarSettings />

          {isAdmin && (
            <Card data-testid="card-google-calendar">
            <CardHeader>
              <div className="flex items-center gap-3">
                <Calendar className="h-6 w-6 text-primary" />
                <div>
                  <CardTitle>Google Calendar Integration</CardTitle>
                  <CardDescription>
                    Sync appointment bookings with Google Calendar automatically
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {statusLoading ? (
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Loading status...
                </div>
              ) : !gcalStatus?.configured ? (
                <Alert data-testid="alert-gcal-not-configured">
                  <AlertCircle className="h-4 w-4" />
                  <AlertTitle>Not Configured</AlertTitle>
                  <AlertDescription>
                    Google Calendar integration requires GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET 
                    environment variables to be set.
                  </AlertDescription>
                </Alert>
              ) : (
                <>
                  <div className="flex items-center gap-3">
                    <span className="font-medium">Connection Status:</span>
                    {gcalStatus.authorized ? (
                      <Badge variant="default" className="bg-green-500" data-testid="badge-gcal-connected">
                        <CheckCircle2 className="h-3 w-3 mr-1" />
                        Connected
                      </Badge>
                    ) : (
                      <Badge variant="secondary" data-testid="badge-gcal-disconnected">
                        <XCircle className="h-3 w-3 mr-1" />
                        Not Connected
                      </Badge>
                    )}
                  </div>

                  {gcalStatus.authorized ? (
                    <>
                      <Separator />
                      <div className="space-y-3">
                        <div>
                          <Label htmlFor="calendarId">Calendar ID</Label>
                          <p className="text-sm text-muted-foreground mb-2">
                            Current: <code className="bg-muted px-1 rounded">{gcalStatus.calendarId}</code>
                          </p>
                          <div className="flex gap-2">
                            <Input
                              id="calendarId"
                              placeholder="Enter calendar ID (default: primary)"
                              value={calendarIdInput}
                              onChange={(e) => setCalendarIdInput(e.target.value)}
                              data-testid="input-calendar-id"
                            />
                            <Button
                              onClick={() => updateCalendarIdMutation.mutate(calendarIdInput || "primary")}
                              disabled={updateCalendarIdMutation.isPending}
                              data-testid="button-update-calendar-id"
                            >
                              {updateCalendarIdMutation.isPending ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : (
                                "Update"
                              )}
                            </Button>
                          </div>
                        </div>
                      </div>
                      <Separator />
                      <div className="pt-2">
                        <Button
                          variant="destructive"
                          onClick={() => disconnectMutation.mutate()}
                          disabled={disconnectMutation.isPending}
                          data-testid="button-disconnect-gcal"
                        >
                          {disconnectMutation.isPending ? (
                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          ) : (
                            <Unlink className="h-4 w-4 mr-2" />
                          )}
                          Disconnect Google Calendar
                        </Button>
                      </div>
                    </>
                  ) : (
                    <div className="pt-2">
                      <Button
                        onClick={() => getOAuthLinkMutation.mutate()}
                        disabled={getOAuthLinkMutation.isPending}
                        data-testid="button-connect-gcal"
                      >
                        {getOAuthLinkMutation.isPending ? (
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        ) : (
                          <LinkIcon className="h-4 w-4 mr-2" />
                        )}
                        Connect Google Calendar
                      </Button>
                      <p className="text-sm text-muted-foreground mt-2">
                        You'll be redirected to Google to authorize access to your calendar.
                      </p>
                    </div>
                  )}
                </>
              )}
            </CardContent>
          </Card>
          )}
        </div>
      </div>
    </Layout>
  );
}
