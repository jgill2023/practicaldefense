import { useAuth } from "@/hooks/useAuth";
import { isInstructorOrHigher } from "@/lib/authUtils";
import { Layout } from "@/components/Layout";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { InstructorGoogleCalendarSettings } from "@/components/instructor/GoogleCalendarSettings";
import { AlertCircle, Loader2 } from "lucide-react";

export default function SettingsPage() {
  const { user, isLoading: authLoading } = useAuth();

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
            Configure integrations and platform settings
          </p>
        </div>

        <div className="space-y-6">
          <InstructorGoogleCalendarSettings />
        </div>
      </div>
    </Layout>
  );
}
