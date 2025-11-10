import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { UserPlus, Calendar, MapPin, Users } from "lucide-react";

interface CrossEnrollmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  studentId: string;
  studentName: string;
}

export function CrossEnrollmentModal({ isOpen, onClose, studentId, studentName }: CrossEnrollmentModalProps) {
  const [selectedScheduleId, setSelectedScheduleId] = useState<string>("");
  const [notes, setNotes] = useState<string>("");
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch available schedules from all instructors for cross-enrollment
  const { data: availableSchedules, isLoading: schedulesLoading } = useQuery({
    queryKey: ['/api/cross-enrollment/available-schedules', studentId],
    queryFn: async () => {
      const response = await fetch(`/api/cross-enrollment/available-schedules?studentId=${studentId}`);
      if (!response.ok) throw new Error('Failed to fetch schedules');
      return response.json();
    },
    enabled: isOpen,
  });

  // Cross-enrollment mutation
  const crossEnrollMutation = useMutation({
    mutationFn: async (data: {
      studentId: string;
      scheduleId: string;
      notes: string;
    }) => {
      return await apiRequest("POST", `/api/instructor/enrollments`, data);
    },
    onSuccess: (data) => {
      if (data.success) {
        toast({
          title: "Student Enrolled",
          description: `${studentName} has been successfully enrolled in the course`,
        });
        
        // Invalidate all relevant queries to ensure fresh data
        queryClient.invalidateQueries({ 
          predicate: (query) => query.queryKey[0] === "/api/instructor/roster"
        });
        queryClient.invalidateQueries({ queryKey: ["/api/instructor/enrollments"] });
        queryClient.invalidateQueries({ queryKey: ["/api/instructor/courses"] });
        queryClient.invalidateQueries({ queryKey: ["/api/students"] });
        
        // Close modal and reset form
        onClose();
        setSelectedScheduleId("");
        setNotes("");
      } else {
        toast({
          title: "Enrollment Failed",
          description: data.error || "Failed to enroll student",
          variant: "destructive",
        });
      }
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to enroll student",
        variant: "destructive",
      });
    },
  });

  const handleSubmit = () => {
    if (!selectedScheduleId) {
      toast({
        title: "Schedule Required",
        description: "Please select a course schedule for the student",
        variant: "destructive",
      });
      return;
    }

    crossEnrollMutation.mutate({
      studentId,
      scheduleId: selectedScheduleId,
      notes: notes.trim() || `Cross-enrolled in additional course`,
    });
  };

  const handleClose = () => {
    if (!crossEnrollMutation.isPending) {
      onClose();
      setSelectedScheduleId("");
      setNotes("");
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-lg" data-testid="modal-cross-enrollment">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2" data-testid="title-cross-enrollment">
            <UserPlus className="h-5 w-5" />
            Enroll Student in Additional Course
          </DialogTitle>
          <p className="text-sm text-muted-foreground" data-testid="text-student-name">
            Enrolling: <span className="font-medium">{studentName}</span>
          </p>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="schedule-select">Select Course Schedule</Label>
            {schedulesLoading ? (
              <div className="flex items-center justify-center py-4">
                <div className="animate-spin w-5 h-5 border-2 border-primary border-t-transparent rounded-full" />
                <span className="ml-3 text-muted-foreground">Loading available schedules...</span>
              </div>
            ) : !availableSchedules || availableSchedules.length === 0 ? (
              <div className="p-4 bg-muted rounded-lg text-sm text-muted-foreground" data-testid="text-no-schedules">
                No available course schedules found. Please create a new course schedule first.
              </div>
            ) : (
              <Select
                value={selectedScheduleId}
                onValueChange={setSelectedScheduleId}
                disabled={crossEnrollMutation.isPending}
                data-testid="select-course-schedule"
              >
                <SelectTrigger id="schedule-select">
                  <SelectValue placeholder="Select a course schedule" />
                </SelectTrigger>
                <SelectContent>
                  {availableSchedules.map((schedule: any) => {
                    const isNearFull = schedule.availableSpots <= 3;
                    return (
                      <SelectItem 
                        key={schedule.id} 
                        value={schedule.id}
                        data-testid={`option-schedule-${schedule.id}`}
                      >
                        {schedule.courseTitle} - {schedule.instructorName} - {format(new Date(schedule.startDate), 'MMM d, yyyy')} at {schedule.startTime} ({schedule.availableSpots} spots available)
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">Notes (Optional)</Label>
            <Textarea
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Add any notes about this enrollment..."
              disabled={crossEnrollMutation.isPending}
              rows={3}
              data-testid="textarea-notes"
            />
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={handleClose}
            disabled={crossEnrollMutation.isPending}
            data-testid="button-cancel-cross-enrollment"
          >
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={crossEnrollMutation.isPending || !selectedScheduleId}
            data-testid="button-confirm-cross-enrollment"
          >
            {crossEnrollMutation.isPending ? (
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-current mr-2" />
            ) : null}
            Enroll Student
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}