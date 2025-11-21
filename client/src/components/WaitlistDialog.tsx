import { useState } from "react";
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
import { useToast } from "@/hooks/use-toast";
import { UserPlus, Trash2, Mail, Phone, RefreshCw } from "lucide-react";
import { formatDateSafe } from "@/lib/dateUtils";
import { WaitlistNotificationModal } from "./WaitlistNotificationModal";

interface WaitlistDialogProps {
  scheduleId: string | null;
  courseTitle?: string;
  courseId?: string;
  onClose: () => void;
}

export function WaitlistDialog({ scheduleId, courseTitle, courseId, onClose }: WaitlistDialogProps) {
  const { toast } = useToast();
  const [showInviteConfirm, setShowInviteConfirm] = useState(false);
  const [showRemoveConfirm, setShowRemoveConfirm] = useState(false);
  const [selectedEntry, setSelectedEntry] = useState<any | null>(null);
  const [showNotificationModal, setShowNotificationModal] = useState(false);
  const [isReinvite, setIsReinvite] = useState(false);

  const { data: waitlistEntries = [], isLoading } = useQuery({
    queryKey: ["/api/instructor/schedules", scheduleId, "waitlist"],
    enabled: !!scheduleId,
  });

  const inviteFromWaitlistMutation = useMutation({
    mutationFn: async (waitlistId: string) => {
      return await apiRequest("POST", `/api/instructor/waitlist/${waitlistId}/invite`, {});
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/instructor/schedules", scheduleId, "waitlist"] });
      setShowInviteConfirm(false);
      // Open notification modal after successful invite
      setShowNotificationModal(true);
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

  const handleNotificationModalClose = () => {
    setShowNotificationModal(false);
    setSelectedEntry(null);
    setIsReinvite(false);
  };

  return (
    <>
      <Dialog open={!!scheduleId} onOpenChange={onClose}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Waitlist Management</DialogTitle>
            <DialogDescription>
              {courseTitle && `Course: ${courseTitle}`}
            </DialogDescription>
          </DialogHeader>

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

      {/* Notification Modal */}
      {showNotificationModal && selectedEntry && (
        <WaitlistNotificationModal
          isOpen={showNotificationModal}
          onClose={handleNotificationModalClose}
          studentName={`${selectedEntry.student?.firstName} ${selectedEntry.student?.lastName}`}
          studentEmail={selectedEntry.student?.email || ''}
          studentPhone={selectedEntry.student?.phone || ''}
          studentId={selectedEntry.studentId}
          scheduleId={scheduleId || ''}
          courseId={courseId || ''}
          isReinvite={isReinvite}
        />
      )}
    </>
  );
}
