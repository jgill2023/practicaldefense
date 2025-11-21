import { useState, useRef, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useToast } from "@/hooks/use-toast";
import { UserPlus, Trash2, Mail, Phone, RefreshCw, Send, ArrowLeft, AlertTriangle } from "lucide-react";
import { formatDateSafe } from "@/lib/dateUtils";
import ReactQuill from "react-quill";
import "react-quill/dist/quill.snow.css";

interface WaitlistDialogProps {
  scheduleId: string | null;
  courseTitle?: string;
  courseId?: string;
  onClose: () => void;
}

const DEFAULT_TEMPLATE = `Hey {{ student.firstName }},
We have good news, a spot in our {{ schedule.startDate }} {{ course.name }} Course has just opened up. Log in to your student dashboard and enroll today to secure your seat!`;

export function WaitlistDialog({ scheduleId, courseTitle, courseId, onClose }: WaitlistDialogProps) {
  const { toast } = useToast();
  const [showInviteConfirm, setShowInviteConfirm] = useState(false);
  const [showRemoveConfirm, setShowRemoveConfirm] = useState(false);
  const [showCancelCompositionConfirm, setShowCancelCompositionConfirm] = useState(false);
  const [cancelAction, setCancelAction] = useState<'close' | 'back'>('back');
  const [selectedEntry, setSelectedEntry] = useState<any | null>(null);
  const [isReinvite, setIsReinvite] = useState(false);
  const [showNotificationSelect, setShowNotificationSelect] = useState(false);
  const [showComposition, setShowComposition] = useState(false);
  const [notificationTab, setNotificationTab] = useState<"email" | "sms">("email");
  
  // Email state
  const [emailSubject, setEmailSubject] = useState("");
  const [emailMessage, setEmailMessage] = useState("");
  const [isHtml, setIsHtml] = useState(true);
  const quillRef = useRef<ReactQuill>(null);
  
  // SMS state
  const [smsMessage, setSmsMessage] = useState("");

  const { data: waitlistEntries = [], isLoading } = useQuery({
    queryKey: ["/api/instructor/schedules", scheduleId, "waitlist"],
    enabled: !!scheduleId,
  });

  // Available variables for templates
  const variables = [
    { key: "student.firstName", label: "Student First Name" },
    { key: "student.lastName", label: "Student Last Name" },
    { key: "course.name", label: "Course Name" },
    { key: "schedule.startDate", label: "Schedule Date" },
  ];

  // Function to insert variable into email editor
  const insertVariable = (variable: string) => {
    if (quillRef.current) {
      const editor = quillRef.current.getEditor();
      const cursorPosition = editor.getSelection()?.index || editor.getLength();
      editor.insertText(cursorPosition, `{{ ${variable} }}`, 'user');
      editor.setSelection(cursorPosition + variable.length + 6);
    }
  };

  // Function to insert variable into SMS textarea
  const insertSmsVariable = (variable: string) => {
    setSmsMessage(prev => prev + `{{ ${variable} }}`);
  };

  const inviteFromWaitlistMutation = useMutation({
    mutationFn: async (waitlistId: string) => {
      return await apiRequest("POST", `/api/instructor/waitlist/${waitlistId}/invite`, {});
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/instructor/schedules", scheduleId, "waitlist"] });
      setShowInviteConfirm(false);
      // Show notification selection UI
      setShowNotificationSelect(true);
    },
    onError: (error: any) => {
      toast({
        title: "Failed to Invite",
        description: error.message,
        variant: "destructive",
      });
      setShowInviteConfirm(false);
    },
  });

  const removeFromWaitlistMutation = useMutation({
    mutationFn: async (waitlistId: string) => {
      return await apiRequest("DELETE", `/api/waitlist/${waitlistId}`, {});
    },
    onSuccess: () => {
      toast({
        title: "Removed from Waitlist",
        description: "The student has been removed from the waitlist.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/instructor/schedules", scheduleId, "waitlist"] });
      setShowRemoveConfirm(false);
      setSelectedEntry(null);
    },
    onError: (error: any) => {
      toast({
        title: "Failed to Remove",
        description: error.message,
        variant: "destructive",
      });
      setShowRemoveConfirm(false);
    },
  });

  const sendEmailMutation = useMutation({
    mutationFn: async (data: { subject: string; message: string; emailAddress: string; isHtml: boolean }) => {
      return await apiRequest("POST", "/api/notifications/email", {
        to: [data.emailAddress],
        subject: data.subject,
        content: data.message,
        isHtml: data.isHtml,
        studentId: selectedEntry?.studentId,
        courseId,
        scheduleId,
      });
    },
    onSuccess: (data) => {
      if (data.success) {
        toast({
          title: "Email Sent Successfully",
          description: `Email sent to ${selectedEntry?.student?.firstName} ${selectedEntry?.student?.lastName}`,
        });
        resetAllState();
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

  const sendSmsMutation = useMutation({
    mutationFn: async (data: { message: string; phoneNumber: string }) => {
      return await apiRequest("POST", "/api/notifications/sms", {
        to: [data.phoneNumber],
        message: data.message,
        studentId: selectedEntry?.studentId,
        courseId,
        scheduleId,
      });
    },
    onSuccess: (data) => {
      if (data.success) {
        let description = `Message sent to ${selectedEntry?.student?.firstName} ${selectedEntry?.student?.lastName}`;
        
        if (data.excludedCount && data.excludedCount > 0) {
          description += `. Note: ${data.excludedCount} recipient(s) excluded (opted out of SMS)`;
        }
        
        toast({
          title: "SMS Sent Successfully",
          description,
        });
        resetAllState();
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

  const handleInviteClick = (entry: any, reinvite: boolean = false) => {
    setSelectedEntry(entry);
    setIsReinvite(reinvite);
    setShowInviteConfirm(true);
  };

  const handleConfirmInvite = () => {
    if (selectedEntry) {
      inviteFromWaitlistMutation.mutate(selectedEntry.id);
    }
  };

  const handleRemoveClick = (entry: any) => {
    setSelectedEntry(entry);
    setShowRemoveConfirm(true);
  };

  const handleConfirmRemove = () => {
    if (selectedEntry) {
      removeFromWaitlistMutation.mutate(selectedEntry.id);
    }
  };

  const handleSendEmail = () => {
    if (!emailSubject.trim()) {
      toast({
        title: "Subject Required",
        description: "Please enter an email subject",
        variant: "destructive",
      });
      return;
    }

    if (!emailMessage.trim()) {
      toast({
        title: "Message Required",
        description: "Please enter a message to send",
        variant: "destructive",
      });
      return;
    }

    if (!selectedEntry?.student?.email) {
      toast({
        title: "Email Address Missing",
        description: "Student does not have an email address on file",
        variant: "destructive",
      });
      return;
    }

    sendEmailMutation.mutate({
      subject: emailSubject.trim(),
      message: emailMessage.trim(),
      emailAddress: selectedEntry.student.email,
      isHtml,
    });
  };

  const handleSendSms = () => {
    if (!smsMessage.trim()) {
      toast({
        title: "Message Required",
        description: "Please enter a message to send",
        variant: "destructive",
      });
      return;
    }

    if (!selectedEntry?.student?.phone) {
      toast({
        title: "Phone Number Missing",
        description: "Student does not have a phone number on file",
        variant: "destructive",
      });
      return;
    }

    sendSmsMutation.mutate({
      message: smsMessage.trim(),
      phoneNumber: selectedEntry.student.phone,
    });
  };

  const resetAllState = () => {
    setShowNotificationSelect(false);
    setShowComposition(false);
    setSelectedEntry(null);
    setIsReinvite(false);
    setEmailSubject("");
    setEmailMessage("");
    setSmsMessage("");
    setNotificationTab("email");
  };

  const handleBackToList = () => {
    // Warn if navigating away without sending
    setCancelAction('back');
    setShowCancelCompositionConfirm(true);
  };

  const handleBackToNotificationSelect = () => {
    setShowComposition(false);
    setEmailSubject("");
    setEmailMessage("");
    setSmsMessage("");
  };

  const handleComposeClick = () => {
    setShowComposition(true);
  };

  const handleConfirmCancelComposition = () => {
    setShowCancelCompositionConfirm(false);
    resetAllState();
    if (cancelAction === 'close') {
      onClose();
    }
  };

  const handleDialogClose = () => {
    // Reset composition state if active to prevent stale state
    if (showNotificationSelect || showComposition) {
      setCancelAction('close');
      setShowCancelCompositionConfirm(true);
      return;
    }
    resetAllState();
    onClose();
  };

  // Set default template when composition opens
  useEffect(() => {
    if (showComposition && selectedEntry) {
      setEmailSubject(`Spot Available: ${courseTitle || 'Course'}`);
      setEmailMessage(DEFAULT_TEMPLATE);
      setSmsMessage(DEFAULT_TEMPLATE);
    }
  }, [showComposition, selectedEntry, courseTitle]);

  const smsCharacterCount = smsMessage.length;
  const smsMaxLength = 1600;
  const isSmsOverLimit = smsCharacterCount > smsMaxLength;

  return (
    <>
      <Dialog open={!!scheduleId} onOpenChange={(open) => !open && handleDialogClose()}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {showComposition ? (isReinvite ? 'Reinvite Student' : 'Invite Student') : 'Waitlist Management'}
            </DialogTitle>
            <DialogDescription>
              {showComposition 
                ? `Send a notification to ${selectedEntry?.student?.firstName} ${selectedEntry?.student?.lastName} inviting them to complete their enrollment.`
                : courseTitle && `Course: ${courseTitle}`
              }
            </DialogDescription>
          </DialogHeader>

          {showComposition ? (
            // Notification Composition View
            <div className="mt-4 space-y-4">
              <Button
                variant="ghost"
                size="sm"
                onClick={handleBackToList}
                className="mb-2"
                data-testid="button-back-to-list"
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Waitlist
              </Button>

              <Tabs value={notificationTab} onValueChange={(v) => setNotificationTab(v as "email" | "sms")}>
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="email" data-testid="tab-email">
                    <Mail className="h-4 w-4 mr-2" />
                    Email
                  </TabsTrigger>
                  <TabsTrigger value="sms" data-testid="tab-sms">
                    <Phone className="h-4 w-4 mr-2" />
                    SMS
                  </TabsTrigger>
                </TabsList>

                {/* Email Tab */}
                <TabsContent value="email" className="space-y-4 mt-4">
                  <div className="bg-muted/50 dark:bg-muted/20 p-3 rounded-lg">
                    <div className="flex items-start gap-2">
                      <Mail className="h-4 w-4 mt-0.5 text-muted-foreground" />
                      <div className="flex-1">
                        <p className="text-sm font-medium">Email Address</p>
                        <p className="text-sm text-muted-foreground">{selectedEntry?.student?.email || 'No email on file'}</p>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="email-subject">Subject</Label>
                    <Input
                      id="email-subject"
                      value={emailSubject}
                      onChange={(e) => setEmailSubject(e.target.value)}
                      placeholder="Email subject"
                      data-testid="input-email-subject"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Message</Label>
                    <div className="border rounded-md">
                      <ReactQuill
                        ref={quillRef}
                        theme="snow"
                        value={emailMessage}
                        onChange={setEmailMessage}
                        placeholder="Enter your message here..."
                        className="bg-white dark:bg-gray-950"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label className="text-sm text-muted-foreground">Insert Variables</Label>
                    <div className="flex flex-wrap gap-2">
                      {variables.map((variable) => (
                        <Button
                          key={variable.key}
                          variant="outline"
                          size="sm"
                          onClick={() => insertVariable(variable.key)}
                          data-testid={`button-insert-${variable.key}`}
                        >
                          {`{{ ${variable.key} }}`}
                        </Button>
                      ))}
                    </div>
                  </div>

                  <Alert>
                    <AlertDescription className="text-sm">
                      Variables will be replaced with actual student and course data when the email is sent.
                    </AlertDescription>
                  </Alert>

                  <div className="flex justify-end gap-3 pt-4">
                    <Button
                      variant="outline"
                      onClick={handleBackToList}
                      data-testid="button-cancel-email"
                    >
                      Cancel
                    </Button>
                    <Button
                      onClick={handleSendEmail}
                      disabled={sendEmailMutation.isPending}
                      data-testid="button-send-email"
                    >
                      <Send className="h-4 w-4 mr-2" />
                      {sendEmailMutation.isPending ? "Sending..." : "Send Email"}
                    </Button>
                  </div>
                </TabsContent>

                {/* SMS Tab */}
                <TabsContent value="sms" className="space-y-4 mt-4">
                  <div className="bg-muted/50 dark:bg-muted/20 p-3 rounded-lg">
                    <div className="flex items-start gap-2">
                      <Phone className="h-4 w-4 mt-0.5 text-muted-foreground" />
                      <div className="flex-1">
                        <p className="text-sm font-medium">Phone Number</p>
                        <p className="text-sm text-muted-foreground">{selectedEntry?.student?.phone || 'No phone number on file'}</p>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label htmlFor="sms-message">Message</Label>
                      <span className={`text-sm ${isSmsOverLimit ? 'text-red-600 dark:text-red-400' : 'text-muted-foreground'}`}>
                        {smsCharacterCount} / {smsMaxLength}
                      </span>
                    </div>
                    <Textarea
                      id="sms-message"
                      value={smsMessage}
                      onChange={(e) => setSmsMessage(e.target.value)}
                      placeholder="Enter your message here..."
                      rows={6}
                      className="resize-none"
                      data-testid="textarea-sms-message"
                    />
                    {isSmsOverLimit && (
                      <Alert variant="destructive">
                        <AlertTriangle className="h-4 w-4" />
                        <AlertDescription className="text-sm">
                          Message exceeds the maximum length of {smsMaxLength} characters
                        </AlertDescription>
                      </Alert>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label className="text-sm text-muted-foreground">Insert Variables</Label>
                    <div className="flex flex-wrap gap-2">
                      {variables.map((variable) => (
                        <Button
                          key={variable.key}
                          variant="outline"
                          size="sm"
                          onClick={() => insertSmsVariable(variable.key)}
                          data-testid={`button-insert-sms-${variable.key}`}
                        >
                          {`{{ ${variable.key} }}`}
                        </Button>
                      ))}
                    </div>
                  </div>

                  <Alert>
                    <AlertDescription className="text-sm">
                      Variables will be replaced with actual student and course data when the SMS is sent. Students who have opted out of SMS will not receive this message.
                    </AlertDescription>
                  </Alert>

                  <div className="flex justify-end gap-3 pt-4">
                    <Button
                      variant="outline"
                      onClick={handleBackToList}
                      data-testid="button-cancel-sms"
                    >
                      Cancel
                    </Button>
                    <Button
                      onClick={handleSendSms}
                      disabled={sendSmsMutation.isPending || isSmsOverLimit}
                      data-testid="button-send-sms"
                    >
                      <Send className="h-4 w-4 mr-2" />
                      {sendSmsMutation.isPending ? "Sending..." : "Send SMS"}
                    </Button>
                  </div>
                </TabsContent>
              </Tabs>
            </div>
          ) : (
            // Waitlist Table View
            <div className="mt-4">
              {isLoading ? (
                <div className="text-center py-8 text-muted-foreground">Loading waitlist...</div>
              ) : waitlistEntries.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <p>No students on the waitlist</p>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="text-sm text-muted-foreground mb-2">
                    {waitlistEntries.length} {waitlistEntries.length === 1 ? 'student' : 'students'} on waitlist
                  </div>
                  
                  <div className="border rounded-lg overflow-hidden">
                    <table className="w-full">
                      <thead className="bg-muted">
                        <tr>
                          <th className="px-4 py-3 text-left text-sm font-medium">Position</th>
                          <th className="px-4 py-3 text-left text-sm font-medium">Student</th>
                          <th className="px-4 py-3 text-left text-sm font-medium">Contact</th>
                          <th className="px-4 py-3 text-left text-sm font-medium">Status</th>
                          <th className="px-4 py-3 text-left text-sm font-medium">Joined</th>
                          <th className="px-4 py-3 text-center text-sm font-medium">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y">
                        {waitlistEntries.map((entry: any) => (
                          <tr key={entry.id} className="hover:bg-muted/50">
                            <td className="px-4 py-3 text-sm font-medium">
                              #{entry.position}
                            </td>
                            <td className="px-4 py-3 text-sm">
                              <div className="font-medium">
                                {entry.student?.firstName} {entry.student?.lastName}
                              </div>
                            </td>
                            <td className="px-4 py-3 text-sm">
                              <div className="space-y-1">
                                {entry.student?.email && (
                                  <div className="flex items-center text-muted-foreground">
                                    <Mail className="h-3 w-3 mr-1" />
                                    <span className="text-xs">{entry.student.email}</span>
                                  </div>
                                )}
                                {entry.student?.phone && (
                                  <div className="flex items-center text-muted-foreground">
                                    <Phone className="h-3 w-3 mr-1" />
                                    <span className="text-xs">{entry.student.phone}</span>
                                  </div>
                                )}
                              </div>
                            </td>
                            <td className="px-4 py-3 text-sm">
                              <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                                entry.status === 'waiting' ? 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-200' :
                                entry.status === 'invited' ? 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-200' :
                                entry.status === 'enrolled' ? 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-200' :
                                'bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-200'
                              }`}>
                                {entry.status.charAt(0).toUpperCase() + entry.status.slice(1)}
                              </span>
                            </td>
                            <td className="px-4 py-3 text-sm text-muted-foreground">
                              {formatDateSafe(entry.createdAt)}
                            </td>
                            <td className="px-4 py-3 text-sm">
                              <div className="flex items-center justify-center gap-2">
                                {entry.status === 'waiting' && (
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="h-8 px-3 text-green-600 hover:text-green-700 hover:bg-green-50 dark:text-green-400 dark:hover:text-green-300 dark:hover:bg-green-950"
                                    onClick={() => handleInviteClick(entry, false)}
                                    disabled={inviteFromWaitlistMutation.isPending}
                                    data-testid={`button-invite-waitlist-${entry.id}`}
                                  >
                                    <UserPlus className="h-4 w-4 mr-1" />
                                    Invite
                                  </Button>
                                )}

                                {entry.status === 'invited' && (
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="h-8 px-3 text-blue-600 hover:text-blue-700 hover:bg-blue-50 dark:text-blue-400 dark:hover:text-blue-300 dark:hover:bg-blue-950"
                                    onClick={() => handleInviteClick(entry, true)}
                                    disabled={inviteFromWaitlistMutation.isPending}
                                    data-testid={`button-reinvite-waitlist-${entry.id}`}
                                  >
                                    <RefreshCw className="h-4 w-4 mr-1" />
                                    Reinvite
                                  </Button>
                                )}
                                
                                {(entry.status === 'waiting' || entry.status === 'invited') && (
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="h-8 px-3 text-red-600 hover:text-red-700 hover:bg-red-50 dark:text-red-400 dark:hover:text-red-300 dark:hover:bg-red-950"
                                    onClick={() => handleRemoveClick(entry)}
                                    disabled={removeFromWaitlistMutation.isPending}
                                    data-testid={`button-remove-waitlist-${entry.id}`}
                                  >
                                    <Trash2 className="h-4 w-4 mr-1" />
                                    Remove
                                  </Button>
                                )}
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Invite Confirmation Dialog */}
      <AlertDialog open={showInviteConfirm} onOpenChange={setShowInviteConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {isReinvite ? 'Reinvite Student' : 'Invite Student'}
            </AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to {isReinvite ? 'reinvite' : 'invite'} this student to enroll? They will receive a notification.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setSelectedEntry(null)}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmInvite} data-testid="button-confirm-invite">
              OK
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Remove Confirmation Dialog */}
      <AlertDialog open={showRemoveConfirm} onOpenChange={setShowRemoveConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove from Waitlist</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to remove this student from the waitlist?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setSelectedEntry(null)}>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleConfirmRemove}
              className="bg-red-600 hover:bg-red-700"
              data-testid="button-confirm-remove"
            >
              Remove
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Cancel Composition Confirmation Dialog */}
      <AlertDialog open={showCancelCompositionConfirm} onOpenChange={setShowCancelCompositionConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Cancel Notification?</AlertDialogTitle>
            <AlertDialogDescription>
              The student has been marked as invited but will not receive a notification until you send one. Are you sure you want to cancel?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Continue Editing</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleConfirmCancelComposition}
              className="bg-yellow-600 hover:bg-yellow-700"
              data-testid="button-confirm-cancel-composition"
            >
              Cancel Anyway
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
