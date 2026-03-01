import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useParams } from "wouter";
import { DashboardLayout } from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { CreditCard, DollarSign, Calendar, Tag, AlertCircle, MessageSquare, Mail, RefreshCw, ArrowLeft } from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { format } from "date-fns";
import { useToast } from "@/hooks/use-toast";
import { RefundPaymentModal } from "@/components/RefundPaymentModal";

interface PaymentDetails {
  enrollmentId: string;
  paymentStatus: string;
  totalAmount: number;
  amountPaid: number;
  remainingBalance: number;
  paymentDate?: string;
  paymentMethod?: string;
  promoCode?: string;
  promoDiscount?: number;
  transactionId?: string;
  courseName: string;
  scheduleDate: string;
  studentName: string;
  taxAmount?: number | null;
  taxRate?: number | null;
  paymentIntentId?: string;
  paymentHistory: Array<{
    id: string;
    amount: number;
    paymentDate: string;
    paymentMethod: string;
    status: string;
    transactionId?: string;
  }>;
}

export default function PaymentDetailsPage() {
  const { enrollmentId } = useParams<{ enrollmentId: string }>();
  const { toast } = useToast();
  const [showRefundModal, setShowRefundModal] = useState(false);

  const { data: paymentDetails, isLoading, error } = useQuery<PaymentDetails>({
    queryKey: ["/api/instructor/payment-details", enrollmentId],
    queryFn: async () => {
      return await apiRequest("GET", `/api/instructor/payment-details/${enrollmentId}`);
    },
    enabled: !!enrollmentId,
  });

  const sendSMSReminderMutation = useMutation({
    mutationFn: async () => {
      return await apiRequest("POST", "/api/instructor/send-payment-reminder", {
        enrollmentId,
        method: "sms",
      });
    },
    onSuccess: () => {
      toast({
        title: "SMS Reminder Sent",
        description: "Payment reminder has been sent via text message.",
      });
    },
    onError: () => {
      toast({
        title: "Failed to Send SMS",
        description: "Unable to send SMS reminder. Please try again.",
        variant: "destructive",
      });
    },
  });

  const sendEmailReminderMutation = useMutation({
    mutationFn: async () => {
      return await apiRequest("POST", "/api/instructor/send-payment-reminder", {
        enrollmentId,
        method: "email",
      });
    },
    onSuccess: () => {
      toast({
        title: "Email Reminder Sent",
        description: "Payment reminder has been sent via email.",
      });
    },
    onError: () => {
      toast({
        title: "Failed to Send Email",
        description: "Unable to send email reminder. Please try again.",
        variant: "destructive",
      });
    },
  });

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    try {
      return format(new Date(dateString), "MMM d, yyyy 'at' h:mm a");
    } catch {
      return dateString;
    }
  };

  const getPaymentStatusBadge = (status: string) => {
    switch (status) {
      case 'paid':
        return <Badge variant="default" className="bg-green-500 hover:bg-green-600">Paid in Full</Badge>;
      case 'partial':
        return <Badge variant="secondary" className="bg-yellow-500 hover:bg-yellow-600 text-white">Partial Payment</Badge>;
      case 'pending':
        return <Badge variant="secondary">Payment Pending</Badge>;
      case 'failed':
        return <Badge variant="destructive">Payment Failed</Badge>;
      case 'refunded':
        return <Badge variant="outline" className="border-purple-300 text-purple-600">Refunded</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const handleRefundSuccess = () => {
    queryClient.invalidateQueries({ queryKey: ["/api/instructor/payment-details", enrollmentId] });
    setShowRefundModal(false);
  };

  const studentName = paymentDetails?.studentName || "Loading...";

  return (
    <DashboardLayout>
      <div className="max-w-4xl mx-auto">
        <Button variant="ghost" onClick={() => window.history.back()} className="mb-4">
          <ArrowLeft className="h-4 w-4 mr-2" /> Back
        </Button>

        <div className="flex items-center gap-3 mb-6">
          <CreditCard className="h-5 w-5 text-primary" />
          <h1 className="text-2xl font-semibold">Payment Details</h1>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin w-8 h-8 border-2 border-primary border-t-transparent rounded-full" />
            <span className="ml-3 text-muted-foreground">Loading payment details...</span>
          </div>
        ) : error ? (
          <div className="flex items-center justify-center py-12">
            <div className="text-center">
              <AlertCircle className="h-12 w-12 text-destructive mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">Failed to Load Payment Details</h3>
              <p className="text-muted-foreground">Unable to retrieve payment information. Please try again.</p>
            </div>
          </div>
        ) : !paymentDetails ? (
          <div className="flex items-center justify-center py-12">
            <div className="text-center">
              <CreditCard className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">No Payment Information</h3>
              <p className="text-muted-foreground">No payment details found for this enrollment.</p>
            </div>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Student & Course Info */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Enrollment Summary</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Student:</span>
                  <span className="font-medium" data-testid="text-student-name">{studentName}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Course:</span>
                  <span className="font-medium" data-testid="text-course-name">{paymentDetails.courseName}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Schedule:</span>
                  <span className="font-medium" data-testid="text-schedule-date">
                    {format(new Date(paymentDetails.scheduleDate), "MMM d, yyyy")}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Status:</span>
                  <div data-testid="badge-payment-status">
                    {getPaymentStatusBadge(paymentDetails.paymentStatus)}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Payment Summary */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <DollarSign className="h-5 w-5" />
                  Payment Summary
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Tax and Discount Breakdown */}
                <div className="space-y-2 p-4 bg-slate-50 rounded-lg border border-slate-200">
                  {/* Subtotal (before discount) */}
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Subtotal (Course Price)</span>
                    <span className="font-medium" data-testid="text-subtotal-amount">
                      {formatCurrency(
                        paymentDetails.taxAmount != null && paymentDetails.taxAmount > 0
                          ? paymentDetails.totalAmount - paymentDetails.taxAmount + (paymentDetails.promoDiscount || 0)
                          : paymentDetails.totalAmount + (paymentDetails.promoDiscount || 0)
                      )}
                    </span>
                  </div>

                  {/* Promo Discount */}
                  {paymentDetails.promoDiscount != null && paymentDetails.promoDiscount > 0 && (
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground flex items-center gap-1">
                        <Tag className="h-3 w-3" />
                        Discount {paymentDetails.promoCode && `(${paymentDetails.promoCode})`}
                      </span>
                      <span className="font-medium text-green-600" data-testid="text-discount-amount">
                        -{formatCurrency(paymentDetails.promoDiscount)}
                      </span>
                    </div>
                  )}

                  {/* Tax */}
                  {paymentDetails.taxAmount != null && paymentDetails.taxAmount > 0 && (
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">
                        Sales Tax{paymentDetails.taxRate ? ` (${(paymentDetails.taxRate * 100).toFixed(2)}%)` : ''}
                      </span>
                      <span className="font-medium" data-testid="text-tax-amount">
                        {formatCurrency(paymentDetails.taxAmount)}
                      </span>
                    </div>
                  )}

                  <Separator />

                  {/* Total */}
                  <div className="flex justify-between font-semibold">
                    <span>Total</span>
                    <span data-testid="text-total-with-tax">
                      {formatCurrency(paymentDetails.totalAmount)}
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="text-center p-4 bg-blue-50 rounded-lg">
                    <p className="text-sm text-muted-foreground">Total Amount</p>
                    <p className="text-2xl font-bold text-blue-600" data-testid="text-total-amount">
                      {formatCurrency(paymentDetails.totalAmount)}
                    </p>
                  </div>
                  <div className="text-center p-4 bg-green-50 rounded-lg">
                    <p className="text-sm text-muted-foreground">Amount Paid</p>
                    <p className="text-2xl font-bold text-green-600" data-testid="text-amount-paid">
                      {formatCurrency(paymentDetails.amountPaid)}
                    </p>
                  </div>
                  <div className="text-center p-4 bg-red-50 rounded-lg">
                    <p className="text-sm text-muted-foreground">Remaining Balance</p>
                    <p className="text-2xl font-bold text-red-600" data-testid="text-remaining-balance">
                      {formatCurrency(paymentDetails.remainingBalance)}
                    </p>
                  </div>
                </div>

                {paymentDetails.promoCode && (
                  <>
                    <Separator />
                    <div className="flex items-center justify-between p-3 bg-purple-50 rounded-lg">
                      <div className="flex items-center gap-2">
                        <Tag className="h-4 w-4 text-purple-600" />
                        <span className="text-sm font-medium">Promo Code Applied</span>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-mono" data-testid="text-promo-code">
                          {paymentDetails.promoCode}
                        </p>
                        {paymentDetails.promoDiscount != null && paymentDetails.promoDiscount > 0 && (
                          <p className="text-sm text-green-600" data-testid="text-promo-discount">
                            -{formatCurrency(paymentDetails.promoDiscount)}
                          </p>
                        )}
                      </div>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>

            {/* Payment History */}
            {paymentDetails.paymentHistory && paymentDetails.paymentHistory.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <Calendar className="h-5 w-5" />
                    Payment History
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {paymentDetails.paymentHistory.map((payment, index) => (
                      <div key={payment.id} className="flex items-center justify-between p-3 border rounded-lg">
                        <div>
                          <p className="font-medium" data-testid={`text-payment-amount-${index}`}>
                            {formatCurrency(payment.amount)}
                          </p>
                          <p className="text-sm text-muted-foreground" data-testid={`text-payment-date-${index}`}>
                            {formatDate(payment.paymentDate)}
                          </p>
                          {payment.transactionId && (
                            <p className="text-xs text-muted-foreground font-mono" data-testid={`text-transaction-id-${index}`}>
                              ID: {payment.transactionId}
                            </p>
                          )}
                        </div>
                        <div className="text-right">
                          <Badge
                            variant={payment.status === 'completed' ? 'default' : 'secondary'}
                            data-testid={`badge-payment-status-${index}`}
                          >
                            {payment.status}
                          </Badge>
                          <p className="text-sm text-muted-foreground mt-1" data-testid={`text-payment-method-${index}`}>
                            {payment.paymentMethod}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Refund Section for Paid Enrollments */}
            {paymentDetails.paymentStatus === 'paid' && (
              <Card className="border-purple-200 bg-purple-50">
                <CardContent className="pt-6">
                  <div className="space-y-4">
                    <div className="flex items-center gap-2">
                      <RefreshCw className="h-5 w-5 text-purple-600" />
                      <div>
                        <p className="font-medium text-purple-800">Process Refund</p>
                        <p className="text-sm text-purple-700">
                          Issue a full or partial refund for this enrollment
                        </p>
                      </div>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setShowRefundModal(true)}
                      className="bg-white hover:bg-purple-100"
                      data-testid="button-initiate-refund"
                    >
                      <RefreshCw className="h-4 w-4 mr-2" />
                      Process Refund
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Balance Due Notice with Reminder Options */}
            {paymentDetails.remainingBalance > 0 && (
              <Card className="border-yellow-200 bg-yellow-50">
                <CardContent className="pt-6">
                  <div className="space-y-4">
                    <div className="flex items-center gap-2">
                      <AlertCircle className="h-5 w-5 text-yellow-600" />
                      <div>
                        <p className="font-medium text-yellow-800">Outstanding Balance</p>
                        <p className="text-sm text-yellow-700">
                          Student has a remaining balance of {formatCurrency(paymentDetails.remainingBalance)}
                        </p>
                      </div>
                    </div>
                    <Separator className="bg-yellow-200" />
                    <div>
                      <p className="text-sm font-medium text-yellow-800 mb-3">Send Payment Reminder:</p>
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => sendSMSReminderMutation.mutate()}
                          disabled={sendSMSReminderMutation.isPending}
                          className="bg-white hover:bg-yellow-100"
                          data-testid="button-send-sms-reminder"
                        >
                          <MessageSquare className="h-4 w-4 mr-2" />
                          {sendSMSReminderMutation.isPending ? "Sending..." : "Send SMS"}
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => sendEmailReminderMutation.mutate()}
                          disabled={sendEmailReminderMutation.isPending}
                          className="bg-white hover:bg-yellow-100"
                          data-testid="button-send-email-reminder"
                        >
                          <Mail className="h-4 w-4 mr-2" />
                          {sendEmailReminderMutation.isPending ? "Sending..." : "Send Email"}
                        </Button>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        )}
      </div>

      {/* Refund Payment Modal */}
      {paymentDetails && (
        <RefundPaymentModal
          isOpen={showRefundModal}
          onClose={() => setShowRefundModal(false)}
          paymentType="enrollment"
          entityId={enrollmentId!}
          paymentIntentId={paymentDetails.paymentIntentId}
          originalAmount={paymentDetails.amountPaid}
          studentName={studentName}
          description={`${paymentDetails.courseName} - ${format(new Date(paymentDetails.scheduleDate), "MMM d, yyyy")}`}
          enrollmentId={enrollmentId!}
          onSuccess={handleRefundSuccess}
          queryKeysToInvalidate={[
            ["/api/instructor/payment-details", enrollmentId!],
            ["/api/instructor/refund-requests"],
            ["/api/instructor/dashboard-stats"],
            ["/api/instructor/roster"],
            ["/api/students"],
          ]}
        />
      )}
    </DashboardLayout>
  );
}
