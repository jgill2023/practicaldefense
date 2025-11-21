import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { UserPlus, Trash2, Mail, Phone } from "lucide-react";
import { formatDateSafe } from "@/lib/dateUtils";

interface WaitlistDialogProps {
  scheduleId: string | null;
  courseTitle?: string;
  onClose: () => void;
}

export function WaitlistDialog({ scheduleId, courseTitle, onClose }: WaitlistDialogProps) {
  const { toast } = useToast();

  const { data: waitlistEntries = [], isLoading } = useQuery({
    queryKey: ["/api/instructor/schedules", scheduleId, "waitlist"],
    enabled: !!scheduleId,
  });

  const inviteFromWaitlistMutation = useMutation({
    mutationFn: async (waitlistId: string) => {
      return await apiRequest("POST", `/api/instructor/waitlist/${waitlistId}/invite`, {});
    },
    onSuccess: () => {
      toast({
        title: "Student Invited",
        description: "The student has been invited to enroll in the course.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/instructor/schedules", scheduleId, "waitlist"] });
    },
    onError: (error: any) => {
      toast({
        title: "Failed to Invite",
        description: error.message,
        variant: "destructive",
      });
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
    },
    onError: (error: any) => {
      toast({
        title: "Failed to Remove",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleInvite = (waitlistId: string) => {
    if (window.confirm("Are you sure you want to invite this student to enroll? They will receive a notification.")) {
      inviteFromWaitlistMutation.mutate(waitlistId);
    }
  };

  const handleRemove = (waitlistId: string) => {
    if (window.confirm("Are you sure you want to remove this student from the waitlist?")) {
      removeFromWaitlistMutation.mutate(waitlistId);
    }
  };

  return (
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
                            entry.status === 'waiting' ? 'bg-blue-100 text-blue-700' :
                            entry.status === 'invited' ? 'bg-green-100 text-green-700' :
                            entry.status === 'enrolled' ? 'bg-gray-100 text-gray-700' :
                            'bg-red-100 text-red-700'
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
                                className="h-8 px-3 text-green-600 hover:text-green-700 hover:bg-green-50"
                                onClick={() => handleInvite(entry.id)}
                                disabled={inviteFromWaitlistMutation.isPending}
                                data-testid={`button-invite-waitlist-${entry.id}`}
                              >
                                <UserPlus className="h-4 w-4 mr-1" />
                                Invite
                              </Button>
                            )}
                            
                            {(entry.status === 'waiting' || entry.status === 'invited') && (
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-8 px-3 text-red-600 hover:text-red-700 hover:bg-red-50"
                                onClick={() => handleRemove(entry.id)}
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
  );
}
