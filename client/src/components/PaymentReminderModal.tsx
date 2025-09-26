import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { DollarSign, Mail, MessageSquare, Send, AlertTriangle, X } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";

interface PaymentReminderModalProps {
  isOpen: boolean;
  onClose: () => void;
  studentName: string;
  studentEmail: string;
  studentPhone?: string;
  remainingBalance: number;
  courseName: string;
  scheduleDate: string;
}

type ReminderMethod = 'email' | 'sms' | 'both';
type ReminderTone = 'friendly' | 'professional' | 'urgent';

export function PaymentReminderModal({ 
  isOpen, 
  onClose, 
  studentName,
  studentEmail,
  studentPhone,
  remainingBalance,
  courseName,
  scheduleDate
}: PaymentReminderModalProps) {
  const [method, setMethod] = useState<ReminderMethod>('email');
  const [tone, setTone] = useState<ReminderTone>('friendly');
  const [customSubject, setCustomSubject] = useState("");
  const [customMessage, setCustomMessage] = useState("");
  const [useTemplate, setUseTemplate] = useState(true);
  const { toast } = useToast();

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  };

  const getTemplateContent = (tone: ReminderTone) => {
    const baseVariables = {
      studentName,
      courseName,
      scheduleDate,
      remainingBalance: formatCurrency(remainingBalance)
    };

    switch (tone) {
      case 'friendly':
        return {
          subject: `Friendly Reminder: Course Payment for ${courseName}`,
          message: `Hi ${studentName},

Hope you're doing well! This is a friendly reminder about your upcoming course registration.

Course: ${courseName}
Schedule Date: ${scheduleDate}
Remaining Balance: ${formatCurrency(remainingBalance)}

We're excited to have you join us for this training. Please complete your payment at your earliest convenience to secure your spot.

If you have any questions or need assistance with payment, feel free to reach out!

Best regards,
Practical Defense Training Team`
        };
      case 'professional':
        return {
          subject: `Payment Reminder: ${courseName} - Balance Due`,
          message: `Dear ${studentName},

This is a payment reminder for your enrollment in ${courseName}.

Course Details:
- Course: ${courseName}
- Scheduled Date: ${scheduleDate}
- Outstanding Balance: ${formatCurrency(remainingBalance)}

Please submit your payment by the course date to maintain your enrollment. You can complete your payment online through your student portal.

For any payment-related inquiries, please contact our office.

Sincerely,
Practical Defense Training Administration`
        };
      case 'urgent':
        return {
          subject: `URGENT: Payment Required - ${courseName}`,
          message: `${studentName},

IMMEDIATE ATTENTION REQUIRED: Your payment for ${courseName} is past due.

Outstanding Balance: ${formatCurrency(remainingBalance)}
Course Date: ${scheduleDate}

Your enrollment may be cancelled if payment is not received promptly. Please submit payment immediately to avoid losing your spot in this course.

Contact us immediately if you need assistance.

Practical Defense Training`
        };
      default:
        return { subject: '', message: '' };
    }
  };

  const sendReminderMutation = useMutation({
    mutationFn: async (data: { 
      method: ReminderMethod; 
      subject: string; 
      message: string;
      recipients: { email?: string; phone?: string; };
    }) => {
      const response = await apiRequest("POST", "/api/notifications/payment-reminder", {
        method: data.method,
        subject: data.subject,
        message: data.message,
        recipients: data.recipients,
        studentName,
        courseName,
        remainingBalance,
        scheduleDate
      });
      return response.json();
    },
    onSuccess: (data) => {
      if (data.success) {
        toast({
          title: "Payment Reminder Sent",
          description: `Reminder sent to ${studentName} via ${method === 'both' ? 'email and SMS' : method}`,
        });
        onClose();
      } else {
        toast({
          title: "Reminder Failed",
          description: data.error || "Failed to send payment reminder",
          variant: "destructive",
        });
      }
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to send payment reminder",
        variant: "destructive",
      });
    },
  });

  const handleSend = () => {
    const template = useTemplate ? getTemplateContent(tone) : null;
    const subject = useTemplate ? template!.subject : customSubject;
    const message = useTemplate ? template!.message : customMessage;

    if (!subject.trim()) {
      toast({
        title: "Subject Required",
        description: "Please enter a subject for the reminder",
        variant: "destructive",
      });
      return;
    }

    if (!message.trim()) {
      toast({
        title: "Message Required",
        description: "Please enter a message for the reminder",
        variant: "destructive",
      });
      return;
    }

    if ((method === 'email' || method === 'both') && !studentEmail) {
      toast({
        title: "Email Address Missing",
        description: "Student does not have an email address on file",
        variant: "destructive",
      });
      return;
    }

    if ((method === 'sms' || method === 'both') && !studentPhone) {
      toast({
        title: "Phone Number Missing",
        description: "Student does not have a phone number on file",
        variant: "destructive",
      });
      return;
    }

    sendReminderMutation.mutate({
      method,
      subject,
      message,
      recipients: {
        email: studentEmail,
        phone: studentPhone
      }
    });
  };

  const template = useTemplate ? getTemplateContent(tone) : null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <DollarSign className="h-5 w-5 text-primary" />
            <DialogTitle>Send Payment Reminder</DialogTitle>
          </div>
        </DialogHeader>

        <div className="space-y-6">
          {/* Payment Summary */}
          <Card className="border-red-200 bg-red-50">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium text-red-800" data-testid="text-student-name">
                    {studentName}
                  </p>
                  <p className="text-sm text-red-700" data-testid="text-course-info">
                    {courseName} - {scheduleDate}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-sm text-red-700">Outstanding Balance</p>
                  <p className="text-2xl font-bold text-red-600" data-testid="text-balance-due">
                    {formatCurrency(remainingBalance)}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Method Selection */}
          <div className="space-y-2">
            <Label className="text-sm font-medium">Reminder Method</Label>
            <div className="flex gap-2">
              <Button
                variant={method === 'email' ? "default" : "outline"}
                size="sm"
                onClick={() => setMethod('email')}
                disabled={!studentEmail}
                data-testid="button-method-email"
              >
                <Mail className="h-4 w-4 mr-2" />
                Email Only
              </Button>
              <Button
                variant={method === 'sms' ? "default" : "outline"}
                size="sm"
                onClick={() => setMethod('sms')}
                disabled={!studentPhone}
                data-testid="button-method-sms"
              >
                <MessageSquare className="h-4 w-4 mr-2" />
                SMS Only
              </Button>
              <Button
                variant={method === 'both' ? "default" : "outline"}
                size="sm"
                onClick={() => setMethod('both')}
                disabled={!studentEmail || !studentPhone}
                data-testid="button-method-both"
              >
                Both
              </Button>
            </div>
            <div className="text-xs text-muted-foreground">
              {!studentEmail && "Email not available"} 
              {!studentEmail && !studentPhone && " • "}
              {!studentPhone && "Phone not available"}
            </div>
          </div>

          {/* Content Type */}
          <div className="space-y-2">
            <Label className="text-sm font-medium">Message Content</Label>
            <div className="flex gap-2">
              <Button
                variant={useTemplate ? "default" : "outline"}
                size="sm"
                onClick={() => setUseTemplate(true)}
                data-testid="button-use-template"
              >
                Use Template
              </Button>
              <Button
                variant={!useTemplate ? "default" : "outline"}
                size="sm"
                onClick={() => setUseTemplate(false)}
                data-testid="button-custom-message"
              >
                Custom Message
              </Button>
            </div>
          </div>

          {useTemplate ? (
            <>
              {/* Tone Selection */}
              <div className="space-y-2">
                <Label className="text-sm font-medium">Message Tone</Label>
                <Select value={tone} onValueChange={(value: ReminderTone) => setTone(value)}>
                  <SelectTrigger data-testid="select-tone">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="friendly">Friendly</SelectItem>
                    <SelectItem value="professional">Professional</SelectItem>
                    <SelectItem value="urgent">Urgent</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Template Preview */}
              <Card>
                <CardContent className="pt-6 space-y-3">
                  <div>
                    <Label className="text-sm font-medium">Subject Preview</Label>
                    <p className="text-sm p-2 bg-muted rounded" data-testid="text-template-subject">
                      {template?.subject}
                    </p>
                  </div>
                  <div>
                    <Label className="text-sm font-medium">Message Preview</Label>
                    <div className="text-sm p-3 bg-muted rounded whitespace-pre-wrap max-h-32 overflow-y-auto" data-testid="text-template-message">
                      {template?.message}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </>
          ) : (
            <>
              {/* Custom Subject */}
              <div className="space-y-2">
                <Label htmlFor="custom-subject" className="text-sm font-medium">
                  Subject <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="custom-subject"
                  placeholder="Enter custom subject..."
                  value={customSubject}
                  onChange={(e) => setCustomSubject(e.target.value)}
                  data-testid="input-custom-subject"
                />
              </div>

              {/* Custom Message */}
              <div className="space-y-2">
                <Label htmlFor="custom-message" className="text-sm font-medium">
                  Message <span className="text-destructive">*</span>
                </Label>
                <Textarea
                  id="custom-message"
                  placeholder="Enter your custom message..."
                  value={customMessage}
                  onChange={(e) => setCustomMessage(e.target.value)}
                  className="min-h-[120px]"
                  data-testid="textarea-custom-message"
                />
              </div>
            </>
          )}

          {/* SMS Content Warning */}
          {(method === 'sms' || method === 'both') && (
            <Alert>
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription className="text-sm">
                SMS messages are subject to strict content filtering. Consider using email for detailed payment instructions.
              </AlertDescription>
            </Alert>
          )}

          {/* Action Buttons */}
          <div className="flex justify-end space-x-2 pt-4">
            <Button
              variant="outline"
              onClick={onClose}
              disabled={sendReminderMutation.isPending}
              data-testid="button-cancel-reminder"
            >
              Cancel
            </Button>
            <Button
              onClick={handleSend}
              disabled={sendReminderMutation.isPending}
              data-testid="button-send-reminder"
            >
              {sendReminderMutation.isPending ? (
                <>
                  <div className="animate-spin w-4 h-4 border-2 border-primary border-t-transparent rounded-full mr-2" />
                  Sending...
                </>
              ) : (
                <>
                  <Send className="h-4 w-4 mr-2" />
                  Send Reminder
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}