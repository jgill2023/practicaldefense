import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { MessageSquare, Send, AlertTriangle, CheckCircle, X } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";

interface SmsNotificationModalProps {
  isOpen: boolean;
  onClose: () => void;
  studentName: string;
  phoneNumber: string;
  studentId?: string;
  enrollmentId?: string;
  courseId?: string;
  scheduleId?: string;
  appointmentId?: string;
}

export function SmsNotificationModal({
  isOpen,
  onClose,
  studentName,
  phoneNumber,
  studentId,
  enrollmentId,
  courseId,
  scheduleId,
  appointmentId
}: SmsNotificationModalProps) {
  const [message, setMessage] = useState("");
  const { toast } = useToast();

  const sendSmsMutation = useMutation({
    mutationFn: async (data: { message: string; phoneNumber: string }) => {
      return await apiRequest("POST", "/api/notifications/sms", {
        to: [data.phoneNumber],
        message: data.message,
        studentId,
        enrollmentId,
        courseId,
        scheduleId,
        appointmentId
      });
    },
    onSuccess: (data) => {
      if (data.success) {
        let description = `Message sent to ${studentName}`;
        
        // Add information about excluded students if any
        if (data.excludedCount && data.excludedCount > 0) {
          description += `. Note: ${data.excludedCount} recipient(s) excluded (opted out of SMS)`;
        }
        
        toast({
          title: "SMS Sent Successfully",
          description,
        });
        setMessage("");
        onClose();
      } else if (data.blockedByFilter) {
        toast({
          title: "Message Blocked",
          description: `Content filtering blocked this message: ${data.filteredReason}`,
          variant: "destructive",
        });
      } else {
        toast({
          title: "SMS Failed",
          description: data.error || "Failed to send SMS",
          variant: "destructive",
        });
      }
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to send SMS",
        variant: "destructive",
      });
    },
  });

  const handleSend = () => {
    if (!message.trim()) {
      toast({
        title: "Message Required",
        description: "Please enter a message to send",
        variant: "destructive",
      });
      return;
    }

    if (!phoneNumber) {
      toast({
        title: "Phone Number Missing",
        description: "Student does not have a phone number on file",
        variant: "destructive",
      });
      return;
    }

    sendSmsMutation.mutate({
      message: message.trim(),
      phoneNumber
    });
  };

  const characterCount = message.length;
  const maxLength = 1600; // Twilio's SMS limit
  const isOverLimit = characterCount > maxLength;

  const availableVariables = [
    { label: "{{ student.firstName }}", value: "{{ student.firstName }}" },
    { label: "{{ student.lastName }}", value: "{{ student.lastName }}" },
    { label: "{{ course.name }}", value: "{{ course.name }}" },
    { label: "{{ schedule.startDate }}", value: "{{ schedule.startDate }}" },
    { label: "{{ appointmentType.title }}", value: "{{ appointmentType.title }}" },
    { label: "{{ appointment.startTime }}", value: "{{ appointment.startTime }}" },
    { label: "{{ appointment.endTime }}", value: "{{ appointment.endTime }}" },
  ];

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <MessageSquare className="h-5 w-5 text-primary" />
            <DialogTitle>Send SMS Notification</DialogTitle>
          </div>
        </DialogHeader>

        <div className="space-y-4">
          {/* Student Info */}
          <div className="p-3 bg-muted rounded-lg">
            <div>
              <p className="font-medium" data-testid="text-student-name">
                {studentName}
              </p>
              <p className="text-sm text-muted-foreground" data-testid="text-phone-number">
                {phoneNumber}
              </p>
            </div>
          </div>

          {/* Content Filtering Warning */}
          <Alert>
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription className="text-sm">
              SMS messages are subject to ultra-strict content filtering. Educational content should be sent via email for better delivery.
            </AlertDescription>
          </Alert>

          {/* Message Input */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="message" className="text-sm font-medium">
                Message
              </Label>
              <span className={`text-xs ${isOverLimit ? 'text-destructive' : 'text-muted-foreground'}`}>
                {characterCount}/{maxLength}
              </span>
            </div>
            <Textarea
              id="message"
              placeholder="Enter your message..."
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              className={`min-h-[100px] ${isOverLimit ? 'border-destructive' : ''}`}
              data-testid="textarea-sms-message"
            />
            {isOverLimit && (
              <p className="text-xs text-destructive">
                Message exceeds SMS character limit
              </p>
            )}
          </div>

          {/* Variables */}
          <div className="space-y-2">
            <Label htmlFor="variables" className="text-sm font-medium">
              Available Variables
            </Label>
            <div className="flex flex-wrap gap-2">
              {availableVariables.map((variable) => (
                <Button
                  key={variable.value}
                  variant="outline"
                  size="xs"
                  onClick={() => setMessage(message + variable.value)}
                  className="text-xs"
                >
                  {variable.label}
                </Button>
              ))}
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex justify-end space-x-2 pt-4">
            <Button
              variant="outline"
              onClick={onClose}
              disabled={sendSmsMutation.isPending}
              data-testid="button-cancel-sms"
            >
              Cancel
            </Button>
            <Button
              onClick={handleSend}
              disabled={sendSmsMutation.isPending || !message.trim() || isOverLimit}
              data-testid="button-send-sms"
            >
              {sendSmsMutation.isPending ? (
                <>
                  <div className="animate-spin w-4 h-4 border-2 border-primary border-t-transparent rounded-full mr-2" />
                  Sending...
                </>
              ) : (
                <>
                  <Send className="h-4 w-4 mr-2" />
                  Send SMS
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}