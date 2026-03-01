import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { useQuery, useMutation } from "@tanstack/react-query";
import { isInstructorOrHigher, canCreateAccounts, isAdminOrHigher } from "@/lib/authUtils";
import { DashboardLayout } from "@/components/DashboardLayout";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AlertCircle, Loader2, Calendar, CheckCircle2, XCircle, ExternalLink, RefreshCw, Save, Settings as SettingsIcon, UserCog, FileSignature } from "lucide-react";
import { SiGoogle } from "react-icons/si";
import { UserManagementContent } from "./user-management";
import { AdminWaiversContent } from "./admin-waivers";

interface GoogleCalendar {
  id: string;
  summary: string;
  primary?: boolean;
  accessRole?: string;
}

export default function SettingsPage() {
  const { user, isLoading: authLoading } = useAuth();
  const { toast } = useToast();
  const [isConnecting, setIsConnecting] = useState(false);
  const [selectedCalendarId, setSelectedCalendarId] = useState<string>("");
  const [isSavingCalendar, setIsSavingCalendar] = useState(false);

  const searchParams = new URLSearchParams(window.location.search);
  const initialTab = searchParams.get("tab") || "integrations";
  const [activeTab, setActiveTab] = useState(initialTab);

  const handleTabChange = (value: string) => {
    setActiveTab(value);
    const url = new URL(window.location.href);
    url.searchParams.set("tab", value);
    window.history.replaceState({}, "", url.toString());
  };

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
    selectedCalendarId?: string;
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
      const data = await response.json();
      if (data.selectedCalendarId) {
        setSelectedCalendarId(data.selectedCalendarId);
      }
      return data;
    },
    enabled: !!user && isInstructorOrHigher(user),
  });

  // Fetch available calendars from our backend proxy (which calls Auth Broker with API key)
  const { data: calendars, isLoading: calendarsLoading, refetch: refetchCalendars } = useQuery<GoogleCalendar[]>({
    queryKey: ["/api/calendars/list", user?.id],
    queryFn: async () => {
      if (!user?.id) {
        return [];
      }
      const response = await fetch(`/api/calendars/list?instructorId=${user.id}`, {
        credentials: "include",
      });
      if (!response.ok) {
        throw new Error("Failed to fetch calendars");
      }
      const data = await response.json();
      return data.calendars || [];
    },
    enabled: !!calendarStatus?.connected && !!user?.id,
  });

  // Save selected calendar via our backend proxy (which calls Auth Broker with API key)
  const handleSaveCalendar = async () => {
    if (!selectedCalendarId || !user?.id) {
      toast({
        title: "Error",
        description: "Please select a calendar",
        variant: "destructive",
      });
      return;
    }

    setIsSavingCalendar(true);
    try {
      const response = await fetch(`/api/calendars/select`, {
        method: "PATCH",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          instructorId: user.id,
          calendarId: selectedCalendarId,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to save calendar selection");
      }

      toast({
        title: "Calendar Saved",
        description: "Your calendar selection has been saved successfully.",
      });
      refetchCalendarStatus();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to save calendar selection",
        variant: "destructive",
      });
    } finally {
      setIsSavingCalendar(false);
    }
  };

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
      <DashboardLayout>
        <div className="flex items-center justify-center min-h-[400px]">
          <Loader2 className="h-8 w-8 animate-spin text-primary" data-testid="loading-spinner" />
        </div>
      </DashboardLayout>
    );
  }

  if (!user || !isInstructorOrHigher(user)) {
    return (
      <DashboardLayout>
        <div className="container mx-auto py-8 px-4">
          <Alert variant="destructive" data-testid="alert-unauthorized">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Access Denied</AlertTitle>
            <AlertDescription>
              You don't have permission to access settings. Instructor or admin access is required.
            </AlertDescription>
          </Alert>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold" data-testid="text-page-title">Settings</h1>
          <p className="text-muted-foreground">Manage integrations, users, and waivers</p>
        </div>

        <Tabs value={activeTab} onValueChange={handleTabChange}>
          <TabsList className="grid w-fit grid-cols-3">
            <TabsTrigger value="integrations" className="flex items-center space-x-2">
              <SettingsIcon className="h-4 w-4" />
              <span>Integrations</span>
            </TabsTrigger>
            {canCreateAccounts(user) && (
              <TabsTrigger value="users" className="flex items-center space-x-2">
                <UserCog className="h-4 w-4" />
                <span>User Management</span>
              </TabsTrigger>
            )}
            {isAdminOrHigher(user) && (
              <TabsTrigger value="waivers" className="flex items-center space-x-2">
                <FileSignature className="h-4 w-4" />
                <span>Waivers</span>
              </TabsTrigger>
            )}
          </TabsList>

          <TabsContent value="integrations" className="mt-6">
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

                  {/* Calendar Selection */}
                  <div className="p-4 rounded-lg bg-muted/50 border">
                    <Label htmlFor="calendar-select" className="text-sm font-medium mb-2 block">
                      Select Calendar for Availability Sync
                    </Label>
                    <p className="text-xs text-muted-foreground mb-3">
                      Choose which calendar to use for checking your availability and blocking busy times.
                    </p>
                    <div className="flex flex-col sm:flex-row gap-3">
                      {calendarsLoading ? (
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <Loader2 className="h-4 w-4 animate-spin" />
                          Loading calendars...
                        </div>
                      ) : calendars && calendars.length > 0 ? (
                        <>
                          <Select
                            value={selectedCalendarId}
                            onValueChange={setSelectedCalendarId}
                          >
                            <SelectTrigger className="w-full sm:w-[300px]" id="calendar-select" data-testid="select-calendar">
                              <SelectValue placeholder="Select a calendar" />
                            </SelectTrigger>
                            <SelectContent>
                              {calendars.map((calendar) => (
                                <SelectItem key={calendar.id} value={calendar.id}>
                                  {calendar.summary}
                                  {calendar.primary && " (Primary)"}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <Button
                            onClick={handleSaveCalendar}
                            disabled={isSavingCalendar || !selectedCalendarId}
                            data-testid="button-save-calendar"
                          >
                            {isSavingCalendar ? (
                              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                            ) : (
                              <Save className="h-4 w-4 mr-2" />
                            )}
                            Save Selection
                          </Button>
                        </>
                      ) : (
                        <p className="text-sm text-muted-foreground">
                          No calendars available. Try reconnecting your account.
                        </p>
                      )}
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
                  <div className="flex items-center gap-3 p-4 rounded-lg bg-amber-50 border border-amber-200">
                    <AlertCircle className="h-5 w-5 text-amber-600" />
                    <div>
                      <p className="font-medium text-amber-900">Not Connected</p>
                      <p className="text-sm text-amber-700">
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

                <div className="mt-4 p-4 rounded-lg bg-gray-50 border border-gray-200">
                  <h5 className="font-medium text-gray-900 mb-2">What we access:</h5>
                  <ul className="text-sm text-gray-600 space-y-1">
                    <li>• <strong>Read-only</strong> access to view when you're busy</li>
                    <li>• We sync your calendar events to prevent double-booking</li>
                    <li>• We can create calendar events for new appointments</li>
                    <li>• You can disconnect at any time</li>
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>
          </TabsContent>

          {canCreateAccounts(user) && (
            <TabsContent value="users" className="mt-6">
              <UserManagementContent />
            </TabsContent>
          )}

          {isAdminOrHigher(user) && (
            <TabsContent value="waivers" className="mt-6">
              <AdminWaiversContent />
            </TabsContent>
          )}
        </Tabs>
      </div>
    </DashboardLayout>
  );
}
