import { Layout } from "@/components/Layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Clock, Mail, AlertCircle } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";

export default function PendingApprovalPage() {
  const { user } = useAuth();

  return (
    <Layout>
      <div className="max-w-3xl mx-auto p-6 min-h-[70vh] flex items-center justify-center">
        <Card className="w-full">
          <CardHeader className="text-center">
            <div className="flex justify-center mb-4">
              <div className="rounded-full bg-yellow-100 dark:bg-yellow-900/20 p-4">
                <Clock className="w-12 h-12 text-yellow-600 dark:text-yellow-500" />
              </div>
            </div>
            <CardTitle className="text-2xl">Account Pending Approval</CardTitle>
            <CardDescription className="text-base mt-2">
              Your account is currently awaiting approval from an administrator
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>What happens next?</AlertTitle>
              <AlertDescription>
                An instructor or administrator will review your account application shortly. Once approved, you'll have full access to:
                <ul className="list-disc list-inside mt-2 ml-4 space-y-1">
                  <li>Browse and register for courses</li>
                  <li>Book training appointments</li>
                  <li>Access your student portal</li>
                  <li>Manage your profile and documents</li>
                </ul>
              </AlertDescription>
            </Alert>

            {user?.statusReason && user?.userStatus === 'rejected' && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>Account Rejected</AlertTitle>
                <AlertDescription>
                  {user.statusReason}
                </AlertDescription>
              </Alert>
            )}

            <div className="bg-muted p-4 rounded-lg">
              <h3 className="font-medium mb-2 flex items-center gap-2">
                <Mail className="w-4 h-4" />
                Need Help?
              </h3>
              <p className="text-sm text-muted-foreground mb-3">
                If you have questions about your application status, please contact us:
              </p>
              <div className="flex flex-col sm:flex-row gap-2">
                <Button variant="outline" asChild className="flex-1">
                  <a href="/contact">Contact Us</a>
                </Button>
                <Button variant="outline" asChild className="flex-1">
                  <a href="mailto:support@tactical-advantage.com">Email Support</a>
                </Button>
              </div>
            </div>

            <div className="text-center">
              <Button onClick={() => window.location.reload()} variant="secondary">
                Refresh Status
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}
