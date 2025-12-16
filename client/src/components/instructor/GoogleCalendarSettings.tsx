import { useEffect, useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { 
  Calendar, 
  CheckCircle2, 
  XCircle, 
  AlertCircle, 
  Loader2,
  Link as LinkIcon,
  Unlink,
  RefreshCw,
  Plus
} from "lucide-react";

interface InstructorCalendar {
  id: string;
  name: string;
  color?: string;
  isPrimary?: boolean;
}

interface InstructorGoogleCalendarStatus {
  configured: boolean;
  connected: boolean;
  syncEnabled: boolean;
  blockingEnabled: boolean;
  calendars: InstructorCalendar[];
  selectedCalendarId?: string;
  timezone?: string;
}

const INSTRUCTOROPS_AUTH_URL = "https://auth.instructorops.com";

export function InstructorGoogleCalendarSettings() {
  const { toast } = useToast();
  const { user } = useAuth();
  const [showCalendarPicker, setShowCalendarPicker] = useState(false);
  const [selectedCalendarId, setSelectedCalendarId] = useState<string>("");
  const [availableCalendars, setAvailableCalendars] = useState<InstructorCalendar[]>([]);
  const [isLoadingCalendars, setIsLoadingCalendars] = useState(false);

  const urlParams = new URLSearchParams(window.location.search);
  const googleConnected = urlParams.get("google");
  const selectCalendar = urlParams.get("selectCalendar");
  const calendarIdParam = urlParams.get("calendarId");
  const errorReason = urlParams.get("reason");
  const gcalSuccess = urlParams.get("gcal_success");
  const gcalError = urlParams.get("gcal_error");

  const { data: status, isLoading: statusLoading, refetch: refetchStatus } = useQuery<InstructorGoogleCalendarStatus>({
    queryKey: ["/api/instructor-google-calendar/status"],
  });

  useEffect(() => {
    if (googleConnected === "connected") {
      queryClient.invalidateQueries({ queryKey: ["/api/instructor-google-calendar/status"] });
      
      setShowCalendarPicker(true);
      fetchAvailableCalendars();
      
      toast({
        title: "Google Connected!",
        description: "Please select a calendar for your appointments.",
      });
      
      const newUrl = new URL(window.location.href);
      newUrl.searchParams.delete("google");
      newUrl.searchParams.delete("selectCalendar");
      newUrl.searchParams.delete("calendarId");
      window.history.replaceState({}, "", newUrl.pathname + newUrl.search);
    } else if (googleConnected === "error") {
      let errorMessage = "Failed to connect Google Calendar.";
      switch (errorReason) {
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
        case "no_instructor":
          errorMessage = "Instructor not found. Please try again.";
          break;
      }
      toast({
        title: "Connection Failed",
        description: errorMessage,
        variant: "destructive",
      });
      
      const newUrl = new URL(window.location.href);
      newUrl.searchParams.delete("google");
      newUrl.searchParams.delete("reason");
      window.history.replaceState({}, "", newUrl.pathname + newUrl.search);
    }
    
    if (gcalSuccess === "true") {
      queryClient.invalidateQueries({ queryKey: ["/api/instructor-google-calendar/status"] });
      
      setShowCalendarPicker(true);
      fetchAvailableCalendars();
      
      toast({
        title: "Google Connected!",
        description: "Please select a calendar for your appointments.",
      });
      window.history.replaceState({}, "", window.location.pathname);
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
  }, [googleConnected, selectCalendar, errorReason, gcalSuccess, gcalError, toast, status?.selectedCalendarId]);

  const fetchAvailableCalendars = async () => {
    if (!user?.id) return;
    
    setIsLoadingCalendars(true);
    try {
      const response = await fetch(`/api/instructor-google-calendar/calendars`);
      if (response.ok) {
        const calendars = await response.json();
        setAvailableCalendars(calendars);
      } else {
        toast({
          title: "Error",
          description: "Failed to fetch calendars. Please try again.",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Error fetching calendars:", error);
      toast({
        title: "Error",
        description: "Failed to connect to calendar service.",
        variant: "destructive",
      });
    } finally {
      setIsLoadingCalendars(false);
    }
  };

  useEffect(() => {
    if (status?.selectedCalendarId) {
      setSelectedCalendarId(status.selectedCalendarId);
    }
  }, [status?.selectedCalendarId]);

  const handleConnectGoogleCalendar = (mode: "existing" | "create") => {
    if (!user?.id) return;
    
    const returnUrl = encodeURIComponent(window.location.origin + "/settings");
    const connectUrl = `${INSTRUCTOROPS_AUTH_URL}/google/start?instructorId=${user.id}&returnUrl=${returnUrl}&mode=${mode}`;
    window.location.href = connectUrl;
  };

  const selectCalendarMutation = useMutation({
    mutationFn: async (calendarId: string) => {
      return apiRequest("POST", "/api/instructor-google-calendar/select-calendar", {
        calendarId,
      });
    },
    onSuccess: () => {
      toast({
        title: "Calendar Connected",
        description: "Your calendar has been selected and connected successfully.",
      });
      setShowCalendarPicker(false);
      queryClient.invalidateQueries({ queryKey: ["/api/instructor-google-calendar/status"] });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to select calendar",
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

  const createCalendarMutation = useMutation({
    mutationFn: async (calendarName: string) => {
      const response = await apiRequest("POST", "/api/instructor-google-calendar/create-calendar", {
        name: calendarName,
      });
      return response.json();
    },
    onSuccess: async (data) => {
      toast({
        title: "Calendar Created",
        description: "Your new calendar has been created successfully.",
      });
      
      await fetchAvailableCalendars();
      
      if (data.calendarId) {
        setSelectedCalendarId(data.calendarId);
        selectCalendarMutation.mutate(data.calendarId);
      }
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create calendar",
        variant: "destructive",
      });
    },
  });

  const handleSelectCalendar = () => {
    if (selectedCalendarId && selectedCalendarId !== "no_calendars") {
      selectCalendarMutation.mutate(selectedCalendarId);
    }
  };

  const handleCreateNewCalendar = () => {
    const calendarName = `${user?.firstName || 'My'} Website Appointments`;
    createCalendarMutation.mutate(calendarName);
  };

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

  if (showCalendarPicker) {
    return (
      <Card data-testid="card-instructor-gcal-picker">
        <CardHeader>
          <div className="flex items-center gap-3">
            <Calendar className="h-6 w-6 text-primary" />
            <div>
              <CardTitle>Select Your Calendar</CardTitle>
              <CardDescription>
                Choose which calendar to use for website bookings
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {isLoadingCalendars ? (
            <div className="flex items-center gap-2 text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              Loading your calendars...
            </div>
          ) : (
            <>
              <div className="space-y-2">
                <Label htmlFor="calendar-select">Select a calendar</Label>
                <Select value={selectedCalendarId} onValueChange={setSelectedCalendarId}>
                  <SelectTrigger data-testid="select-calendar-dropdown">
                    <SelectValue placeholder="Choose a calendar..." />
                  </SelectTrigger>
                  <SelectContent>
                    {availableCalendars.length > 0 ? (
                      availableCalendars.map((calendar) => (
                        <SelectItem 
                          key={calendar.id} 
                          value={calendar.id}
                          data-testid={`calendar-option-${calendar.id}`}
                        >
                          <div className="flex items-center gap-2">
                            {calendar.color && (
                              <div 
                                className="w-3 h-3 rounded-full" 
                                style={{ backgroundColor: calendar.color }}
                              />
                            )}
                            <span>{calendar.name}</span>
                            {calendar.isPrimary && (
                              <Badge variant="outline" className="text-xs">Primary</Badge>
                            )}
                          </div>
                        </SelectItem>
                      ))
                    ) : (
                      <SelectItem value="no_calendars" disabled>
                        No calendars found - try refreshing
                      </SelectItem>
                    )}
                  </SelectContent>
                </Select>
              </div>

              <div className="flex flex-wrap gap-2">
                <Button
                  onClick={handleSelectCalendar}
                  disabled={!selectedCalendarId || selectedCalendarId === "no_calendars" || selectCalendarMutation.isPending}
                  data-testid="button-confirm-calendar"
                >
                  {selectCalendarMutation.isPending ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <CheckCircle2 className="h-4 w-4 mr-2" />
                  )}
                  Confirm Selection
                </Button>
                <Button
                  variant="outline"
                  onClick={fetchAvailableCalendars}
                  disabled={isLoadingCalendars}
                  data-testid="button-refresh-calendars-picker"
                >
                  {isLoadingCalendars ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <RefreshCw className="h-4 w-4 mr-2" />
                  )}
                  Refresh
                </Button>
                <Button
                  variant="outline"
                  onClick={() => setShowCalendarPicker(false)}
                  disabled={selectCalendarMutation.isPending}
                  data-testid="button-cancel-calendar-picker"
                >
                  Cancel
                </Button>
              </div>

              {availableCalendars.length === 0 && !isLoadingCalendars && (
                <Alert>
                  <AlertCircle className="h-4 w-4" />
                  <AlertTitle>No calendars found</AlertTitle>
                  <AlertDescription>
                    We couldn't fetch your calendars. Try clicking "Refresh" or go back and use "Create New Calendar" instead.
                  </AlertDescription>
                </Alert>
              )}
            </>
          )}
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
        <div className="flex items-center gap-3">
          <span className="font-medium">Connection Status:</span>
          {status?.connected ? (
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

        {status?.connected ? (
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

            {status.calendars && status.calendars.length > 0 && (
              <>
                <Separator />
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <Label className="text-base font-medium">Connected Calendars</Label>
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
                            style={{ backgroundColor: calendar.color || '#4285f4' }}
                          />
                          <div>
                            <span className="font-medium">{calendar.name}</span>
                            {calendar.isPrimary && (
                              <Badge variant="outline" className="ml-2 text-xs">Primary</Badge>
                            )}
                          </div>
                        </div>
                        <CheckCircle2 className="h-4 w-4 text-green-500" />
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
          <div className="pt-2 space-y-4">
            <div className="flex flex-col sm:flex-row gap-3">
              <Button
                onClick={() => handleConnectGoogleCalendar("existing")}
                data-testid="button-connect-existing-gcal"
              >
                <LinkIcon className="h-4 w-4 mr-2" />
                Connect Existing Calendar
              </Button>
              <Button
                variant="outline"
                onClick={() => handleConnectGoogleCalendar("create")}
                data-testid="button-create-new-gcal"
              >
                <Plus className="h-4 w-4 mr-2" />
                Create New Calendar
              </Button>
            </div>
            <p className="text-sm text-muted-foreground">
              You'll be redirected to Google to authorize access to your calendar.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
