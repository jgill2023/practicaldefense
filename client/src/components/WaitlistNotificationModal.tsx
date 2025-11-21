import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { EmailNotificationModal } from "./EmailNotificationModal";
import { SmsNotificationModal } from "./SmsNotificationModal";
import { Mail, MessageSquare } from "lucide-react";

interface WaitlistNotificationModalProps {
  isOpen: boolean;
  onClose: () => void;
  studentName: string;
  studentEmail: string;
  studentPhone: string;
  studentId: string;
  scheduleId: string;
  courseId: string;
  isReinvite?: boolean;
}

export function WaitlistNotificationModal({
  isOpen,
  onClose,
  studentName,
  studentEmail,
  studentPhone,
  studentId,
  scheduleId,
  courseId,
  isReinvite = false,
}: WaitlistNotificationModalProps) {
  const [selectedTab, setSelectedTab] = useState<"email" | "sms">("email");
  const [showEmailModal, setShowEmailModal] = useState(false);
  const [showSmsModal, setShowSmsModal] = useState(false);

  const handleSendEmail = () => {
    setShowEmailModal(true);
  };

  const handleSendSms = () => {
    setShowSmsModal(true);
  };

  const handleClose = () => {
    setShowEmailModal(false);
    setShowSmsModal(false);
    onClose();
  };

  return (
    <>
      <Dialog open={isOpen && !showEmailModal && !showSmsModal} onOpenChange={onClose}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              {isReinvite ? 'Reinvite Student' : 'Invite Student to Enroll'}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Send a notification to <span className="font-semibold">{studentName}</span> inviting them to complete their enrollment.
            </p>

            <Tabs value={selectedTab} onValueChange={(v) => setSelectedTab(v as "email" | "sms")} className="w-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="email" className="flex items-center gap-2">
                  <Mail className="h-4 w-4" />
                  Email
                </TabsTrigger>
                <TabsTrigger value="sms" className="flex items-center gap-2">
                  <MessageSquare className="h-4 w-4" />
                  SMS
                </TabsTrigger>
              </TabsList>

              <TabsContent value="email" className="mt-4">
                <div className="space-y-3">
                  <div className="p-3 bg-muted rounded-md">
                    <p className="text-sm font-medium">Email Address</p>
                    <p className="text-sm text-muted-foreground">{studentEmail}</p>
                  </div>
                  <Button
                    onClick={handleSendEmail}
                    className="w-full"
                    data-testid="button-send-email-notification"
                  >
                    <Mail className="h-4 w-4 mr-2" />
                    Compose Email
                  </Button>
                </div>
              </TabsContent>

              <TabsContent value="sms" className="mt-4">
                <div className="space-y-3">
                  <div className="p-3 bg-muted rounded-md">
                    <p className="text-sm font-medium">Phone Number</p>
                    <p className="text-sm text-muted-foreground">{studentPhone || 'No phone number on file'}</p>
                  </div>
                  <Button
                    onClick={handleSendSms}
                    className="w-full"
                    disabled={!studentPhone}
                    data-testid="button-send-sms-notification"
                  >
                    <MessageSquare className="h-4 w-4 mr-2" />
                    Compose SMS
                  </Button>
                  {!studentPhone && (
                    <p className="text-xs text-muted-foreground text-center">
                      Student has no phone number on file
                    </p>
                  )}
                </div>
              </TabsContent>
            </Tabs>

            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={onClose}>
                Cancel
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {showEmailModal && (
        <EmailNotificationModal
          isOpen={showEmailModal}
          onClose={handleClose}
          studentName={studentName}
          emailAddress={studentEmail}
          studentId={studentId}
          courseId={courseId}
          scheduleId={scheduleId}
        />
      )}

      {showSmsModal && studentPhone && (
        <SmsNotificationModal
          isOpen={showSmsModal}
          onClose={handleClose}
          studentName={studentName}
          phoneNumber={studentPhone}
          studentId={studentId}
          courseId={courseId}
          scheduleId={scheduleId}
        />
      )}
    </>
  );
}
