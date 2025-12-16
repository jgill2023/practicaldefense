import { useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { 
  Calendar, 
  CheckCircle2, 
  XCircle, 
  AlertCircle, 
  Loader2,
  Link as LinkIcon,
  Unlink,
  RefreshCw
} from "lucide-react";

interface InstructorCalendar {
  id: string;
  instructorId: string;
  calendarId: string;
  calendarName: string;
  calendarColor?: string;
  blocksAvailability: boolean;
  isPrimary: boolean;
}

interface InstructorGoogleCalendarStatus {
  configured: boolean;
  connected: boolean;
  syncEnabled: boolean;
  blockingEnabled: boolean;
  calendars: InstructorCalendar[];
  primaryCalendarId?: string;
  timezone?: string;
}

export function InstructorGoogleCalendarSettings() {
  const { toast } = useToast();

  const urlParams = new URLSearchParams(window.location.search);
  const gcalSuccess = urlParams.get("gcal_success");
  const gcalError = urlParams.get("gcal_error");

  useEffect(() => {
    if (gcalSuccess === "true") {
      toast({
        title: "Success!",
        description: "Your Google Calendar has been connected successfully.",
      });
      window.history.replaceState({}, "", window.location.pathname);
      queryClient.invalidateQueries({ queryKey: ["/api/instructor-google-calendar/status"] });
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
      window.history.replaceState({}, "", window.location.pathname);
    }
  }, [gcalSuccess, gcalError, toast]);

  const { data: status, isLoading: statusLoading } = useQuery<InstructorGoogleCalendarStatus>({
    queryKey: ["/api/instructor-google-calendar/status"],
  });

  const getOAuthLinkMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("GET", "/api/instructor-google-calendar/oauth-link");
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
      return apiRequest("POST", "/api/instructor-google-calendar/disconnect");
    },
    onSuccess: () => {
      toast({
        title: "Disconnected",
        description: "Google Calendar has been disconnected.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/instructor-google-calendar/status"] });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to disconnect",
        variant: "destructive",
      });
    },
  });

  const refreshCalendarsMutation = useMutation({
    mutationFn: async () => {
      return apiRequest("POST", "/api/instructor-google-calendar/calendars/refresh");
    },
    onSuccess: () => {
      toast({
        title: "Calendars Refreshed",
        description: "Your calendar list has been updated.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/instructor-google-calendar/status"] });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to refresh calendars",
        variant: "destructive",
      });
    },
  });

  const updateSettingsMutation = useMutation({
    mutationFn: async (settings: { syncEnabled?: boolean; blockingEnabled?: boolean }) => {
      return apiRequest("PATCH", "/api/instructor-google-calendar/settings", settings);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/instructor-google-calendar/status"] });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update settings",
        variant: "destructive",
      });
    },
  });

  const updateCalendarBlockingMutation = useMutation({
    mutationFn: async ({ calendarId, blocksAvailability }: { calendarId: string; blocksAvailability: boolean }) => {
      return apiRequest("PATCH", `/api/instructor-google-calendar/calendars/${encodeURIComponent(calendarId)}/blocking`, { blocksAvailability });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/instructor-google-calendar/status"] });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update calendar settings",
        variant: "destructive",
      });
    },
  });

  if (statusLoading) {
    return (
      <Card data-testid="card-instructor-gcal">
        <CardHeader>
          <div className="flex items-center gap-3">
            <Calendar className="h-6 w-6 text-primary" />
            <div>
              <CardTitle>Google Calendar Integration</CardTitle>
              <CardDescription>
                Connect your Google Calendar to manage your availability
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-2 text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            Loading status...
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card data-testid="card-instructor-gcal">
      <CardHeader>
        <div className="flex items-center gap-3">
          <Calendar className="h-6 w-6 text-primary" />
          <div>
            <CardTitle>Google Calendar Integration</CardTitle>
            <CardDescription>
              Connect your Google Calendar to automatically block availability during busy times and sync appointment bookings
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {!status?.configured ? (
          <Alert data-testid="alert-gcal-not-configured">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Not Available</AlertTitle>
            <AlertDescription>
              Google Calendar integration is not configured on this platform. Contact your administrator to enable this feature.
            </AlertDescription>
          </Alert>
        ) : (
          <>
            <div className="flex items-center gap-3">
              <span className="font-medium">Connection Status:</span>
              {status.connected ? (
                <Badge variant="default" className="bg-green-500" data-testid="badge-instructor-gcal-connected">
                  <CheckCircle2 className="h-3 w-3 mr-1" />
                  Connected
                </Badge>
              ) : (
                <Badge variant="secondary" data-testid="badge-instructor-gcal-disconnected">
                  <XCircle className="h-3 w-3 mr-1" />
                  Not Connected
                </Badge>
              )}
            </div>

            {status.connected ? (
              <>
                <Separator />
                
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label htmlFor="sync-enabled" className="text-base font-medium">Sync Appointments to Calendar</Label>
                      <p className="text-sm text-muted-foreground">
                        Automatically create calendar events when appointments are booked
                      </p>
                    </div>
                    <Switch
                      id="sync-enabled"
                      checked={status.syncEnabled}
                      onCheckedChange={(checked) => updateSettingsMutation.mutate({ syncEnabled: checked })}
                      disabled={updateSettingsMutation.isPending}
                      data-testid="switch-sync-enabled"
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label htmlFor="blocking-enabled" className="text-base font-medium">Block Availability from Calendar</Label>
                      <p className="text-sm text-muted-foreground">
                        Automatically mark appointment slots as unavailable during your calendar events
                      </p>
                    </div>
                    <Switch
                      id="blocking-enabled"
                      checked={status.blockingEnabled}
                      onCheckedChange={(checked) => updateSettingsMutation.mutate({ blockingEnabled: checked })}
                      disabled={updateSettingsMutation.isPending}
                      data-testid="switch-blocking-enabled"
                    />
                  </div>
                </div>

                {status.blockingEnabled && status.calendars.length > 0 && (
                  <>
                    <Separator />
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <Label className="text-base font-medium">Calendars That Block Availability</Label>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => refreshCalendarsMutation.mutate()}
                          disabled={refreshCalendarsMutation.isPending}
                          data-testid="button-refresh-calendars"
                        >
                          {refreshCalendarsMutation.isPending ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <RefreshCw className="h-4 w-4" />
                          )}
                          <span className="ml-2">Refresh</span>
                        </Button>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        Select which calendars should block your appointment availability
                      </p>
                      <div className="space-y-2">
                        {status.calendars.map((calendar) => (
                          <div 
                            key={calendar.id} 
                            className="flex items-center justify-between p-3 border rounded-lg"
                            data-testid={`calendar-item-${calendar.id}`}
                          >
                            <div className="flex items-center gap-3">
                              <div 
                                className="w-3 h-3 rounded-full" 
                                style={{ backgroundColor: calendar.calendarColor || '#4285f4' }}
                              />
                              <div>
                                <span className="font-medium">{calendar.calendarName}</span>
                                {calendar.isPrimary && (
                                  <Badge variant="outline" className="ml-2 text-xs">Primary</Badge>
                                )}
                              </div>
                            </div>
                            <Switch
                              checked={calendar.blocksAvailability}
                              onCheckedChange={(checked) => 
                                updateCalendarBlockingMutation.mutate({ 
                                  calendarId: calendar.calendarId, 
                                  blocksAvailability: checked 
                                })
                              }
                              disabled={updateCalendarBlockingMutation.isPending}
                              data-testid={`switch-calendar-${calendar.id}`}
                            />
                          </div>
                        ))}
                      </div>
                    </div>
                  </>
                )}

                <Separator />
                <div className="pt-2">
                  <Button
                    variant="destructive"
                    onClick={() => disconnectMutation.mutate()}
                    disabled={disconnectMutation.isPending}
                    data-testid="button-disconnect-instructor-gcal"
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
                  data-testid="button-connect-instructor-gcal"
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
  );
}
