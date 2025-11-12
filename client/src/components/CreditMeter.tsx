import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { MessageSquare, Mail, ShoppingCart, TrendingDown, TrendingUp } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/hooks/useAuth";
import { hasInstructorPrivileges } from "@/lib/authUtils";

interface CreditBalance {
  smsCredits: number;
  emailCredits: number;
}

interface CreditMeterProps {
  onPurchaseClick?: () => void;
}

export function CreditMeter({ onPurchaseClick }: CreditMeterProps) {
  const { user, isAuthenticated } = useAuth();
  
  const { data: credits, isLoading } = useQuery<CreditBalance>({
    queryKey: ['/api/credits/balance'],
    enabled: isAuthenticated && !!user && hasInstructorPrivileges(user),
  });

  if (isLoading) {
    return (
      <Card className="mb-6" data-testid="credit-meter-loading">
        <CardContent className="pt-6">
          <div className="animate-pulse space-y-4">
            <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/4"></div>
            <div className="h-10 bg-gray-200 dark:bg-gray-700 rounded"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!credits) return null;

  const smsCredits = credits.smsCredits || 0;
  const emailCredits = credits.emailCredits || 0;

  // Define thresholds for color coding
  const SMS_WARNING_THRESHOLD = 50;
  const SMS_CRITICAL_THRESHOLD = 10;
  const EMAIL_WARNING_THRESHOLD = 200;
  const EMAIL_CRITICAL_THRESHOLD = 50;

  // Helper function to get color based on remaining credits
  const getCreditColor = (current: number, warning: number, critical: number) => {
    if (current <= critical) return "destructive";
    if (current <= warning) return "warning";
    return "default";
  };

  // Helper function to get percentage (capped at 100)
  const getPercentage = (current: number, max: number) => {
    return Math.min((current / max) * 100, 100);
  };

  const smsStatus = getCreditColor(smsCredits, SMS_WARNING_THRESHOLD, SMS_CRITICAL_THRESHOLD);
  const emailStatus = getCreditColor(emailCredits, EMAIL_WARNING_THRESHOLD, EMAIL_CRITICAL_THRESHOLD);

  // Calculate percentage for progress bars (using reasonable maximums for display)
  const smsPercentage = getPercentage(smsCredits, 200);
  const emailPercentage = getPercentage(emailCredits, 300);

  return (
    <Card className="mb-6 border-2" data-testid="credit-meter">
      <CardContent className="pt-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <h3 className="text-lg font-semibold">Message Credits</h3>
            {(smsStatus === "destructive" || emailStatus === "destructive") && (
              <Badge variant="destructive" className="animate-pulse" data-testid="critical-badge">
                <TrendingDown className="w-3 h-3 mr-1" />
                Critical
              </Badge>
            )}
            {(smsStatus === "warning" || emailStatus === "warning") && smsStatus !== "destructive" && emailStatus !== "destructive" && (
              <Badge variant="outline" className="bg-yellow-50 dark:bg-yellow-900/20 border-yellow-300 dark:border-yellow-700" data-testid="warning-badge">
                <TrendingDown className="w-3 h-3 mr-1" />
                Low
              </Badge>
            )}
            {smsStatus === "default" && emailStatus === "default" && (
              <Badge variant="outline" className="bg-green-50 dark:bg-green-900/20 border-green-300 dark:border-green-700" data-testid="healthy-badge">
                <TrendingUp className="w-3 h-3 mr-1" />
                Healthy
              </Badge>
            )}
          </div>
          
        </div>

        <div className="space-y-4">
          {/* SMS Credits */}
          <div className="space-y-2" data-testid="sms-credits-section">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <MessageSquare className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                <span className="text-sm font-medium">SMS Messages</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-lg font-bold" data-testid="sms-credits-count">{smsCredits.toLocaleString()}</span>
                <span className="text-sm text-muted-foreground">credits</span>
              </div>
            </div>
            <Progress
              value={smsPercentage}
              className={`h-2 ${
                smsStatus === "destructive"
                  ? "bg-red-100 dark:bg-red-900/20"
                  : smsStatus === "warning"
                  ? "bg-yellow-100 dark:bg-yellow-900/20"
                  : "bg-green-100 dark:bg-green-900/20"
              }`}
              indicatorClassName={
                smsStatus === "destructive"
                  ? "bg-red-600 dark:bg-red-500"
                  : smsStatus === "warning"
                  ? "bg-yellow-600 dark:bg-yellow-500"
                  : "bg-green-600 dark:bg-green-500"
              }
              data-testid="sms-credits-progress"
            />
            {smsStatus === "destructive" && (
              <p className="text-xs text-red-600 dark:text-red-400" data-testid="sms-critical-message">
                ⚠️ Critical: Less than {SMS_CRITICAL_THRESHOLD} SMS credits remaining
              </p>
            )}
            {smsStatus === "warning" && (
              <p className="text-xs text-yellow-600 dark:text-yellow-400" data-testid="sms-warning-message">
                ⚠️ Low: Less than {SMS_WARNING_THRESHOLD} SMS credits remaining
              </p>
            )}
          </div>

          {/* Email Credits */}
          <div className="space-y-2" data-testid="email-credits-section">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Mail className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                <span className="text-sm font-medium">Email Messages</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-lg font-bold" data-testid="email-credits-count">{emailCredits.toLocaleString()}</span>
                <span className="text-sm text-muted-foreground">credits</span>
              </div>
            </div>
            <Progress
              value={emailPercentage}
              className={`h-2 ${
                emailStatus === "destructive"
                  ? "bg-red-100 dark:bg-red-900/20"
                  : emailStatus === "warning"
                  ? "bg-yellow-100 dark:bg-yellow-900/20"
                  : "bg-green-100 dark:bg-green-900/20"
              }`}
              indicatorClassName={
                emailStatus === "destructive"
                  ? "bg-red-600 dark:bg-red-500"
                  : emailStatus === "warning"
                  ? "bg-yellow-600 dark:bg-yellow-500"
                  : "bg-green-600 dark:bg-green-500"
              }
              data-testid="email-credits-progress"
            />
            {emailStatus === "destructive" && (
              <p className="text-xs text-red-600 dark:text-red-400" data-testid="email-critical-message">
                ⚠️ Critical: Less than {EMAIL_CRITICAL_THRESHOLD} email credits remaining
              </p>
            )}
            {emailStatus === "warning" && (
              <p className="text-xs text-yellow-600 dark:text-yellow-400" data-testid="email-warning-message">
                ⚠️ Low: Less than {EMAIL_WARNING_THRESHOLD} email credits remaining
              </p>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
