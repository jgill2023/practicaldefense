import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import { RefreshCw, DollarSign, AlertCircle, UserMinus } from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

export type RefundPaymentType = 'enrollment' | 'appointment' | 'ecommerce_order';

export type RefundReason = 'requested_by_customer' | 'duplicate' | 'fraudulent' | 'other';

interface RefundPaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  paymentType: RefundPaymentType;
  entityId: string;
  paymentIntentId?: string;
  originalAmount: number;
  studentName: string;
  description: string;
  enrollmentId?: string;
  onSuccess?: () => void;
  queryKeysToInvalidate?: string[][];
}

export function RefundPaymentModal({
  isOpen,
  onClose,
  paymentType,
  entityId,
  paymentIntentId,
  originalAmount,
  studentName,
  description,
  enrollmentId,
  onSuccess,
  queryKeysToInvalidate = [],
}: RefundPaymentModalProps) {
  const { toast } = useToast();
  const [refundAmount, setRefundAmount] = useState("");
  const [refundReason, setRefundReason] = useState<RefundReason>("requested_by_customer");
  const [customReason, setCustomReason] = useState("");
  const [showHoldPrompt, setShowHoldPrompt] = useState(false);
  const [refundResult, setRefundResult] = useState<{ success: boolean; amountRefunded?: number } | null>(null);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  };

  const getRefundReasonLabel = (reason: RefundReason) => {
    switch (reason) {
      case 'requested_by_customer':
        return 'Requested by Customer';
      case 'duplicate':
        return 'Duplicate Payment';
      case 'fraudulent':
        return 'Fraudulent';
      case 'other':
        return 'Other';
      default:
        return reason;
    }
  };

  const getApiEndpoint = () => {
    switch (paymentType) {
      case 'enrollment':
        return `/api/instructor/refund-requests/${entityId}/process`;
      case 'appointment':
        return `/api/instructor/appointments/${entityId}/refund`;
      case 'ecommerce_order':
        return `/api/instructor/orders/${entityId}/refund`;
      default:
        return `/api/instructor/refund-requests/${entityId}/process`;
    }
  };

  const processRefundMutation = useMutation({
    mutationFn: async () => {
      const body: {
        refundAmount?: number;
        refundReason?: string;
        reason?: RefundReason;
      } = {};

      if (refundAmount && refundAmount.trim() !== "") {
        const amount = parseFloat(refundAmount);
        if (isNaN(amount) || amount <= 0) {
          throw new Error("Please enter a valid refund amount");
        }
        if (amount > originalAmount) {
          throw new Error(`Refund amount cannot exceed the original payment of ${formatCurrency(originalAmount)}`);
        }
        body.refundAmount = amount;
      }

      const reasonText = refundReason === 'other' && customReason.trim()
        ? customReason.trim()
        : getRefundReasonLabel(refundReason);

      body.refundReason = reasonText;
      body.reason = refundReason;

      return await apiRequest("POST", getApiEndpoint(), body);
    },
    onSuccess: (data) => {
      toast({
        title: "Refund Processed",
        description: `The refund has been processed successfully.`,
      });

      queryKeysToInvalidate.forEach((key) => {
        queryClient.invalidateQueries({ queryKey: key });
      });

      queryClient.invalidateQueries({ queryKey: ["/api/instructor/refund-requests"] });
      queryClient.invalidateQueries({ queryKey: ["/api/instructor/dashboard-stats"] });

      setRefundResult({
        success: true,
        amountRefunded: data?.amountRefunded || (refundAmount ? parseFloat(refundAmount) : originalAmount),
      });

      if (paymentType === 'enrollment' && enrollmentId) {
        setShowHoldPrompt(true);
      } else {
        handleClose();
        onSuccess?.();
      }
    },
    onError: (error: Error) => {
      toast({
        title: "Refund Failed",
        description: error.message || "Unable to process refund. Please try again.",
        variant: "destructive",
      });
    },
  });

  const moveToHeldMutation = useMutation({
    mutationFn: async () => {
      const notes = `Refund processed: ${formatCurrency(refundResult?.amountRefunded || originalAmount)} - ${getRefundReasonLabel(refundReason)}${refundReason === 'other' && customReason ? `: ${customReason}` : ''}`;

      return await apiRequest("PATCH", `/api/instructor/enrollments/${enrollmentId}/hold`, {
        notes,
      });
    },
    onSuccess: () => {
      toast({
        title: "Student Moved to Held List",
        description: `${studentName} has been moved to the held list.`,
      });

      queryKeysToInvalidate.forEach((key) => {
        queryClient.invalidateQueries({ queryKey: key });
      });

      queryClient.invalidateQueries({ queryKey: ["/api/instructor/roster"] });
      queryClient.invalidateQueries({ queryKey: ["/api/students"] });

      handleClose();
      onSuccess?.();
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to Move Student",
        description: error.message || "Unable to move student to held list. The refund was processed successfully.",
        variant: "destructive",
      });
      handleClose();
      onSuccess?.();
    },
  });

  const handleClose = () => {
    setRefundAmount("");
    setRefundReason("requested_by_customer");
    setCustomReason("");
    setShowHoldPrompt(false);
    setRefundResult(null);
    onClose();
  };

  const handleRefundSubmit = () => {
    processRefundMutation.mutate();
  };

  const handleConfirmHold = () => {
    moveToHeldMutation.mutate();
  };

  const handleSkipHold = () => {
    setShowHoldPrompt(false);
    handleClose();
    onSuccess?.();
  };

  const isPartialRefund = refundAmount && parseFloat(refundAmount) > 0 && parseFloat(refundAmount) < originalAmount;
  const refundDisplayAmount = refundAmount && parseFloat(refundAmount) > 0
    ? parseFloat(refundAmount)
    : originalAmount;

  return (
    <>
      <Dialog open={isOpen && !showHoldPrompt} onOpenChange={handleClose}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <div className="flex items-center gap-3">
              <RefreshCw className="h-5 w-5 text-purple-600" />
              <DialogTitle>Process Refund</DialogTitle>
            </div>
            <DialogDescription>
              Issue a full or partial refund for this payment.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6">
            <Card className="bg-slate-50">
              <CardContent className="pt-4">
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Student:</span>
                    <span className="font-medium" data-testid="text-refund-student-name">{studentName}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Description:</span>
                    <span className="font-medium text-right max-w-[200px]" data-testid="text-refund-description">{description}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Original Amount:</span>
                    <span className="font-medium text-lg" data-testid="text-original-amount">
                      {formatCurrency(originalAmount)}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>

            <div className="space-y-4">
              <div>
                <Label htmlFor="refund-amount" className="text-sm font-medium">
                  Refund Amount
                </Label>
                <div className="relative mt-1">
                  <DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="refund-amount"
                    type="number"
                    step="0.01"
                    min="0.01"
                    max={originalAmount}
                    placeholder={`Full refund: ${originalAmount.toFixed(2)}`}
                    value={refundAmount}
                    onChange={(e) => setRefundAmount(e.target.value)}
                    className="pl-9"
                    data-testid="input-refund-amount"
                  />
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  Leave empty for a full refund of {formatCurrency(originalAmount)}
                </p>
              </div>

              <div>
                <Label htmlFor="refund-reason" className="text-sm font-medium">
                  Refund Reason
                </Label>
                <Select
                  value={refundReason}
                  onValueChange={(value) => setRefundReason(value as RefundReason)}
                >
                  <SelectTrigger className="mt-1" data-testid="select-refund-reason">
                    <SelectValue placeholder="Select a reason" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="requested_by_customer" data-testid="option-reason-customer">
                      Requested by Customer
                    </SelectItem>
                    <SelectItem value="duplicate" data-testid="option-reason-duplicate">
                      Duplicate Payment
                    </SelectItem>
                    <SelectItem value="fraudulent" data-testid="option-reason-fraudulent">
                      Fraudulent
                    </SelectItem>
                    <SelectItem value="other" data-testid="option-reason-other">
                      Other
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {refundReason === 'other' && (
                <div>
                  <Label htmlFor="custom-reason" className="text-sm font-medium">
                    Custom Reason
                  </Label>
                  <Textarea
                    id="custom-reason"
                    placeholder="Enter the reason for this refund..."
                    value={customReason}
                    onChange={(e) => setCustomReason(e.target.value)}
                    className="mt-1"
                    rows={3}
                    data-testid="input-custom-reason"
                  />
                </div>
              )}
            </div>

            <Card className={isPartialRefund ? "border-yellow-200 bg-yellow-50" : "border-purple-200 bg-purple-50"}>
              <CardContent className="pt-4">
                <div className="flex items-start gap-2">
                  <AlertCircle className={`h-4 w-4 mt-0.5 ${isPartialRefund ? "text-yellow-600" : "text-purple-600"}`} />
                  <div className="text-sm">
                    <p className={`font-medium ${isPartialRefund ? "text-yellow-800" : "text-purple-800"}`}>
                      {isPartialRefund ? "Partial Refund" : "Full Refund"}
                    </p>
                    <p className={isPartialRefund ? "text-yellow-700" : "text-purple-700"}>
                      {formatCurrency(refundDisplayAmount)} will be refunded to the original payment method.
                      {paymentType === 'enrollment' && " The enrollment status will be updated to refunded."}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <div className="flex gap-3 pt-2">
              <Button
                onClick={handleRefundSubmit}
                disabled={processRefundMutation.isPending || (refundReason === 'other' && !customReason.trim())}
                className="flex-1 bg-purple-600 hover:bg-purple-700"
                data-testid="button-confirm-refund"
              >
                <RefreshCw className={`h-4 w-4 mr-2 ${processRefundMutation.isPending ? "animate-spin" : ""}`} />
                {processRefundMutation.isPending ? "Processing..." : `Refund ${formatCurrency(refundDisplayAmount)}`}
              </Button>
              <Button
                variant="outline"
                onClick={handleClose}
                disabled={processRefundMutation.isPending}
                data-testid="button-cancel-refund"
              >
                Cancel
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <AlertDialog open={showHoldPrompt} onOpenChange={(open) => !open && handleSkipHold()}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <div className="flex items-center gap-3 mb-2">
              <UserMinus className="h-6 w-6 text-amber-600" />
              <AlertDialogTitle>Move Student to Held List?</AlertDialogTitle>
            </div>
            <AlertDialogDescription className="space-y-2">
              <p>
                The refund of {formatCurrency(refundResult?.amountRefunded || originalAmount)} has been processed successfully for {studentName}.
              </p>
              <p>
                Would you like to move this student to the held list? Students on the held list can be rescheduled to a future class date.
              </p>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel
              onClick={handleSkipHold}
              disabled={moveToHeldMutation.isPending}
              data-testid="button-skip-hold"
            >
              No, Keep in Class
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmHold}
              disabled={moveToHeldMutation.isPending}
              className="bg-amber-600 hover:bg-amber-700"
              data-testid="button-confirm-hold"
            >
              {moveToHeldMutation.isPending ? (
                <>
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  Moving...
                </>
              ) : (
                "Yes, Move to Held"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
