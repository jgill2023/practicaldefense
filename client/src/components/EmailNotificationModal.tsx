import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Mail, Send, Info, X } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";

interface EmailNotificationModalProps {
  isOpen: boolean;
  onClose: () => void;
  studentName: string;
  emailAddress: string;
}

export function EmailNotificationModal({ 
  isOpen, 
  onClose, 
  studentName, 
  emailAddress 
}: EmailNotificationModalProps) {
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [isHtml, setIsHtml] = useState(false);
  const { toast } = useToast();

  const sendEmailMutation = useMutation({
    mutationFn: async (data: { subject: string; message: string; emailAddress: string; isHtml: boolean }) => {
      const response = await apiRequest("POST", "/api/notifications/email", {
        to: [data.emailAddress],
        subject: data.subject,
        content: data.message,
        isHtml: data.isHtml
      });
      return response.json();
    },
    onSuccess: (data) => {
      if (data.success) {
        toast({
          title: "Email Sent Successfully",
          description: `Email sent to ${studentName}`,
        });
        setSubject("");
        setMessage("");
        onClose();
      } else {
        toast({
          title: "Email Failed",
          description: data.error || "Failed to send email",
          variant: "destructive",
        });
      }
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to send email",
        variant: "destructive",
      });
    },
  });

  const handleSend = () => {
    if (!subject.trim()) {
      toast({
        title: "Subject Required",
        description: "Please enter an email subject",
        variant: "destructive",
      });
      return;
    }

    if (!message.trim()) {
      toast({
        title: "Message Required",
        description: "Please enter a message to send",
        variant: "destructive",
      });
      return;
    }

    if (!emailAddress) {
      toast({
        title: "Email Address Missing",
        description: "Student does not have an email address on file",
        variant: "destructive",
      });
      return;
    }

    sendEmailMutation.mutate({
      subject: subject.trim(),
      message: message.trim(),
      emailAddress,
      isHtml
    });
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Mail className="h-5 w-5 text-primary" />
              <DialogTitle>Send Email Notification</DialogTitle>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={onClose}
              data-testid="button-close-email-modal"
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
                <p className="text-sm text-muted-foreground" data-testid="text-email-address">
                  {emailAddress}
                </p>
              </div>
              <Badge variant="outline" className="text-xs">
                Educational Content
              </Badge>
            </div>
          </div>

          {/* Content Type Selection */}
          <div className="space-y-2">
            <Label className="text-sm font-medium">Content Format</Label>
            <div className="flex gap-2">
              <Button
                variant={!isHtml ? "default" : "outline"}
                size="sm"
                onClick={() => setIsHtml(false)}
                data-testid="button-format-text"
              >
                Plain Text
              </Button>
              <Button
                variant={isHtml ? "default" : "outline"}
                size="sm"
                onClick={() => setIsHtml(true)}
                data-testid="button-format-html"
              >
                HTML
              </Button>
            </div>
          </div>

          {/* Content Filtering Info */}
          <Alert>
            <Info className="h-4 w-4" />
            <AlertDescription className="text-sm">
              Email content filtering allows educational firearm training content. SMS may block this same content.
            </AlertDescription>
          </Alert>

          {/* Subject Input */}
          <div className="space-y-2">
            <Label htmlFor="subject" className="text-sm font-medium">
              Subject <span className="text-destructive">*</span>
            </Label>
            <Input
              id="subject"
              placeholder="Enter email subject..."
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              data-testid="input-email-subject"
            />
          </div>

          {/* Message Input */}
          <div className="space-y-2">
            <Label htmlFor="message" className="text-sm font-medium">
              Message <span className="text-destructive">*</span>
            </Label>
            <Textarea
              id="message"
              placeholder={isHtml ? "Enter your HTML message..." : "Enter your message..."}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              className="min-h-[120px]"
              data-testid="textarea-email-message"
            />
            {isHtml && (
              <p className="text-xs text-muted-foreground">
                You can use HTML tags like &lt;b&gt;, &lt;i&gt;, &lt;p&gt;, &lt;br&gt;, etc.
              </p>
            )}
          </div>

          {/* Template Variables Info */}
          <Alert>
            <Info className="h-4 w-4" />
            <AlertDescription className="text-sm">
              <strong>Available variables:</strong> {"{"}{"{"} student.firstName {"}"}{"}"}, {"{"}{"{"} student.lastName {"}"}{"}"}, {"{"}{"{"} course.name {"}"}{"}"}, {"{"}{"{"} schedule.startDate {"}"}{"}"}
            </AlertDescription>
          </Alert>

          {/* Action Buttons */}
          <div className="flex justify-end space-x-2 pt-4">
            <Button
              variant="outline"
              onClick={onClose}
              disabled={sendEmailMutation.isPending}
              data-testid="button-cancel-email"
            >
              Cancel
            </Button>
            <Button
              onClick={handleSend}
              disabled={sendEmailMutation.isPending || !subject.trim() || !message.trim()}
              data-testid="button-send-email"
            >
              {sendEmailMutation.isPending ? (
                <>
                  <div className="animate-spin w-4 h-4 border-2 border-primary border-t-transparent rounded-full mr-2" />
                  Sending...
                </>
              ) : (
                <>
                  <Send className="h-4 w-4 mr-2" />
                  Send Email
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}