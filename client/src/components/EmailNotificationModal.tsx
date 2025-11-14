import { useState, useRef } from "react";
import { useMutation } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Mail, Send, Info } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import ReactQuill from "react-quill";
import "react-quill/dist/quill.snow.css";

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
  const [isHtml, setIsHtml] = useState(true);
  const quillRef = useRef<ReactQuill>(null);
  const { toast } = useToast();

  // Available variables for email templates
  const variables = [
    { key: "student.firstName", label: "Student First Name", value: studentName.split(' ')[0] || studentName },
    { key: "student.lastName", label: "Student Last Name", value: studentName.split(' ').slice(1).join(' ') || "" },
    { key: "course.name", label: "Course Name", value: "Course Name" },
    { key: "schedule.startDate", label: "Schedule Date", value: "Schedule Date" },
    { key: "appointmentType.title", label: "Appointment Type", value: "Appointment Type" },
    { key: "appointment.startTime", label: "Appointment Start Time", value: "Appointment Start Time" },
    { key: "appointment.endTime", label: "Appointment End Time", value: "Appointment End Time" },
  ];

  // Function to insert variable into editor
  const insertVariable = (variable: string) => {
    if (quillRef.current) {
      const editor = quillRef.current.getEditor();
      const cursorPosition = editor.getSelection()?.index || editor.getLength();
      editor.insertText(cursorPosition, `{{ ${variable} }}`, 'user');
      editor.setSelection(cursorPosition + variable.length + 6); // Position cursor after inserted text
    }
  };

  const sendEmailMutation = useMutation({
    mutationFn: async (data: { subject: string; message: string; emailAddress: string; isHtml: boolean }) => {
      return await apiRequest("POST", "/api/notifications/email", {
        to: [data.emailAddress],
        subject: data.subject,
        content: data.message,
        isHtml: data.isHtml
      });
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
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <Mail className="h-5 w-5 text-primary" />
            <DialogTitle>Send Email Notification</DialogTitle>
          </div>
        </DialogHeader>

        <div className="space-y-4">
          {/* Student Info */}
          <div className="p-3 bg-muted rounded-lg">
            <div>
              <p className="font-medium" data-testid="text-student-name">
                {studentName}
              </p>
              <p className="text-sm text-muted-foreground" data-testid="text-email-address">
                {emailAddress}
              </p>
            </div>
          </div>

          {/* Available Variables */}
          <div className="space-y-2">
            <Label className="text-sm font-medium">Available Variables (Click to Insert)</Label>
            <div className="flex flex-wrap gap-2">
              {variables.map((variable) => (
                <Button
                  key={variable.key}
                  variant="outline"
                  size="sm"
                  onClick={() => insertVariable(variable.key)}
                  className="text-xs h-7"
                  data-testid={`button-variable-${variable.key.replace('.', '-')}`}
                >
                  {`{{ ${variable.key} }}`}
                </Button>
              ))}
            </div>
          </div>

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
            <div className="border rounded-md" data-testid="rich-text-editor">
              <ReactQuill
                ref={quillRef}
                theme="snow"
                value={message}
                onChange={setMessage}
                placeholder="Enter your message..."
                style={{ height: '300px' }}
                modules={{
                  toolbar: [
                    [{ 'font': [] }],
                    [{ 'size': ['small', false, 'large', 'huge'] }],
                    [{ 'header': [1, 2, 3, 4, 5, 6, false] }],
                    ['bold', 'italic', 'underline', 'strike'],
                    [{ 'color': [] }, { 'background': [] }],
                    [{ 'script': 'sub'}, { 'script': 'super' }],
                    [{ 'list': 'ordered'}, { 'list': 'bullet' }, { 'list': 'check' }],
                    [{ 'indent': '-1'}, { 'indent': '+1' }],
                    [{ 'direction': 'rtl' }],
                    [{ 'align': [] }],
                    ['link', 'image', 'video'],
                    ['blockquote', 'code-block'],
                    ['clean']
                  ],
                  clipboard: {
                    // toggle to add extra line breaks when pasting HTML:
                    matchVisual: false,
                  }
                }}
                formats={[
                  'header', 'font', 'size',
                  'bold', 'italic', 'underline', 'strike', 'blockquote',
                  'list', 'bullet', 'indent',
                  'link', 'image', 'video',
                  'align', 'color', 'background',
                  'script', 'code-block', 'direction'
                ]}
              />
            </div>
            <div className="h-16" /> {/* Increased spacer for larger Quill toolbar */}
          </div>

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