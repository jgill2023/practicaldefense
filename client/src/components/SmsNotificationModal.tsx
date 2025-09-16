import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { MessageSquare, Send, AlertTriangle, CheckCircle, X } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";

interface SmsNotificationModalProps {
  isOpen: boolean;
  onClose: () => void;
  studentName: string;
  phoneNumber: string;
}

export function SmsNotificationModal({ 
  isOpen, 
  onClose, 
  studentName, 
  phoneNumber 
}: SmsNotificationModalProps) {
  const [message, setMessage] = useState("");
  const [purpose, setPurpose] = useState<'educational' | 'administrative' | 'marketing'>('educational');
  const { toast } = useToast();

  const sendSmsMutation = useMutation({
    mutationFn: async (data: { message: string; phoneNumber: string; purpose: string }) => {
      const response = await apiRequest("POST", "/api/notifications/sms", {
        to: [data.phoneNumber],
        message: data.message,
        purpose: data.purpose
      });
      return response.json();
    },
    onSuccess: (data) => {
      if (data.success) {
        toast({
          title: "SMS Sent Successfully",
          description: `Message sent to ${studentName}`,
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
      phoneNumber,
      purpose
    });
  };

  const characterCount = message.length;
  const maxLength = 1600; // Twilio's SMS limit
  const isOverLimit = characterCount > maxLength;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <MessageSquare className="h-5 w-5 text-primary" />
              <DialogTitle>Send SMS Notification</DialogTitle>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={onClose}
              data-testid="button-close-sms-modal"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </DialogHeader>

        <div className="space-y-4">
          {/* Student Info */}
          <div className="p-3 bg-muted rounded-lg">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium" data-testid="text-student-name">
                  {studentName}
                </p>
                <p className="text-sm text-muted-foreground" data-testid="text-phone-number">
                  {phoneNumber}
                </p>
              </div>
              <Badge variant="outline" className="text-xs">
                {purpose.charAt(0).toUpperCase() + purpose.slice(1)}
              </Badge>
            </div>
          </div>

          {/* Purpose Selection */}
          <div className="space-y-2">
            <Label className="text-sm font-medium">Message Purpose</Label>
            <div className="flex gap-2">
              {(['educational', 'administrative', 'marketing'] as const).map((p) => (
                <Button
                  key={p}
                  variant={purpose === p ? "default" : "outline"}
                  size="sm"
                  onClick={() => setPurpose(p)}
                  data-testid={`button-purpose-${p}`}
                >
                  {p.charAt(0).toUpperCase() + p.slice(1)}
                </Button>
              ))}
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