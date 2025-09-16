import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Calendar, Clock, Users, Info, X } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { format } from "date-fns";

interface RescheduleModalProps {
  isOpen: boolean;
  onClose: () => void;
  studentId: string;
  studentName: string;
  enrollmentId: string;
  currentCourse: string;
  currentScheduleDate: string;
}

interface AvailableSchedule {
  id: string;
  courseId: string;
  courseTitle: string;
  startDate: string;
  endDate: string;
  startTime: string;
  endTime: string;
  location: string;
  availableSpots: number;
  maxSpots: number;
}

type RescheduleAction = 'reschedule' | 'hold';

export function RescheduleModal({ 
  isOpen, 
  onClose, 
  studentId,
  studentName,
  enrollmentId,
  currentCourse,
  currentScheduleDate
}: RescheduleModalProps) {
  const [action, setAction] = useState<RescheduleAction>('reschedule');
  const [selectedScheduleId, setSelectedScheduleId] = useState<string>("");
  const [notes, setNotes] = useState("");
  const { toast } = useToast();

  // Fetch available schedules for rescheduling
  const { data: availableSchedules = [], isLoading: schedulesLoading } = useQuery<AvailableSchedule[]>({
    queryKey: ["/api/instructor/available-schedules", enrollmentId],
    queryFn: async () => {
      const response = await apiRequest("GET", `/api/instructor/available-schedules?excludeEnrollmentId=${enrollmentId}`);
      return response.json();
    },
    enabled: isOpen && action === 'reschedule',
  });

  const rescheduleMutation = useMutation({
    mutationFn: async (data: { 
      action: RescheduleAction; 
      newScheduleId?: string;
      notes: string;
    }) => {
      const endpoint = data.action === 'reschedule' 
        ? `/api/instructor/enrollments/${enrollmentId}/reschedule`
        : `/api/instructor/enrollments/${enrollmentId}/hold`;
      
      const payload = data.action === 'reschedule' 
        ? { newScheduleId: data.newScheduleId, notes: data.notes }
        : { notes: data.notes };

      const response = await apiRequest("PATCH", endpoint, payload);
      return response.json();
    },
    onSuccess: (data) => {
      if (data.success) {
        toast({
          title: action === 'reschedule' ? "Student Rescheduled" : "Student Placed on Hold",
          description: action === 'reschedule' 
            ? `${studentName} has been moved to the new schedule`
            : `${studentName} has been placed on the hold list`,
        });
        
        // Invalidate relevant queries
        queryClient.invalidateQueries({ queryKey: ["/api/instructor/roster"] });
        queryClient.invalidateQueries({ queryKey: ["/api/instructor/enrollments"] });
        queryClient.invalidateQueries({ queryKey: ["/api/instructor/courses"] });
        
        onClose();
      } else {
        toast({
          title: "Reschedule Failed",
          description: data.error || "Failed to reschedule student",
          variant: "destructive",
        });
      }
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to reschedule student",
        variant: "destructive",
      });
    },
  });

  const handleSubmit = () => {
    if (action === 'reschedule') {
      if (!selectedScheduleId) {
        toast({
          title: "Schedule Required",
          description: "Please select a new schedule for the student",
          variant: "destructive",
        });
        return;
      }
    }

    rescheduleMutation.mutate({
      action,
      newScheduleId: selectedScheduleId || undefined,
      notes: notes.trim()
    });
  };

  const formatDate = (dateString: string) => {
    try {
      return format(new Date(dateString), "MMM d, yyyy");
    } catch {
      return dateString;
    }
  };

  const formatTime = (timeString: string) => {
    try {
      const [hours, minutes] = timeString.split(':');
      const date = new Date();
      date.setHours(parseInt(hours), parseInt(minutes));
      return format(date, "h:mm a");
    } catch {
      return timeString;
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <Calendar className="h-5 w-5 text-primary" />
            <DialogTitle>Reschedule Student</DialogTitle>
          </div>
        </DialogHeader>

        <div className="space-y-6">
          {/* Current Enrollment Info */}
          <Card className="border-blue-200 bg-blue-50">
            <CardContent className="pt-6">
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-sm text-blue-700">Student:</span>
                  <span className="font-medium text-blue-800" data-testid="text-student-name">
                    {studentName}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-blue-700">Current Course:</span>
                  <span className="font-medium text-blue-800" data-testid="text-current-course">
                    {currentCourse}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-blue-700">Current Schedule:</span>
                  <span className="font-medium text-blue-800" data-testid="text-current-schedule">
                    {formatDate(currentScheduleDate)}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Action Selection */}
          <div className="space-y-2">
            <Label className="text-sm font-medium">Reschedule Action</Label>
            <div className="flex gap-2">
              <Button
                variant={action === 'reschedule' ? "default" : "outline"}
                size="sm"
                onClick={() => setAction('reschedule')}
                data-testid="button-action-reschedule"
              >
                <Calendar className="h-4 w-4 mr-2" />
                Reschedule to New Date
              </Button>
              <Button
                variant={action === 'hold' ? "default" : "outline"}
                size="sm"
                onClick={() => setAction('hold')}
                data-testid="button-action-hold"
              >
                <Clock className="h-4 w-4 mr-2" />
                Place on Hold List
              </Button>
            </div>
          </div>

          {action === 'reschedule' ? (
            <>
              {/* Schedule Selection */}
              <div className="space-y-3">
                <Label className="text-sm font-medium">
                  Select New Schedule <span className="text-destructive">*</span>
                </Label>
                
                {schedulesLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <div className="animate-spin w-6 h-6 border-2 border-primary border-t-transparent rounded-full" />
                    <span className="ml-3 text-muted-foreground">Loading available schedules...</span>
                  </div>
                ) : availableSchedules.length === 0 ? (
                  <Alert>
                    <Info className="h-4 w-4" />
                    <AlertDescription>
                      No available schedules found for rescheduling. You may need to create a new schedule or consider placing the student on hold.
                    </AlertDescription>
                  </Alert>
                ) : (
                  <div className="space-y-3">
                    {availableSchedules.map((schedule) => (
                      <Card 
                        key={schedule.id}
                        className={`cursor-pointer transition-all ${
                          selectedScheduleId === schedule.id 
                            ? 'border-primary bg-primary/5' 
                            : 'hover:border-muted-foreground/50'
                        }`}
                        onClick={() => setSelectedScheduleId(schedule.id)}
                        data-testid={`card-schedule-${schedule.id}`}
                      >
                        <CardContent className="pt-4">
                          <div className="flex items-center justify-between">
                            <div className="space-y-1">
                              <div className="flex items-center gap-2">
                                <h4 className="font-medium">{schedule.courseTitle}</h4>
                                <Badge variant="outline" className="text-xs">
                                  {schedule.availableSpots}/{schedule.maxSpots} spots
                                </Badge>
                              </div>
                              <div className="flex items-center gap-4 text-sm text-muted-foreground">
                                <div className="flex items-center gap-1">
                                  <Calendar className="h-3 w-3" />
                                  {formatDate(schedule.startDate)}
                                </div>
                                <div className="flex items-center gap-1">
                                  <Clock className="h-3 w-3" />
                                  {formatTime(schedule.startTime)} - {formatTime(schedule.endTime)}
                                </div>
                              </div>
                              <p className="text-sm text-muted-foreground">{schedule.location}</p>
                            </div>
                            <div className="flex items-center">
                              {selectedScheduleId === schedule.id ? (
                                <Badge variant="default">Selected</Badge>
                              ) : schedule.availableSpots === 0 ? (
                                <Badge variant="destructive">Full</Badge>
                              ) : (
                                <Badge variant="secondary">Available</Badge>
                              )}
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </div>
            </>
          ) : (
            <Alert>
              <Info className="h-4 w-4" />
              <AlertDescription>
                Placing {studentName} on hold will remove them from the current schedule without assigning a new one. 
                They can be rescheduled to a future course at any time.
              </AlertDescription>
            </Alert>
          )}

          {/* Notes */}
          <div className="space-y-2">
            <Label htmlFor="notes" className="text-sm font-medium">
              Notes {action === 'hold' && <span className="text-destructive">*</span>}
            </Label>
            <Textarea
              id="notes"
              placeholder={action === 'reschedule' 
                ? "Optional: Add notes about the reschedule reason..."
                : "Required: Explain why the student is being placed on hold..."
              }
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="min-h-[80px]"
              data-testid="textarea-reschedule-notes"
            />
          </div>

          {/* Action Buttons */}
          <div className="flex justify-end space-x-2 pt-4">
            <Button
              variant="outline"
              onClick={onClose}
              disabled={rescheduleMutation.isPending}
              data-testid="button-cancel-reschedule"
            >
              Cancel
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={rescheduleMutation.isPending || 
                       (action === 'reschedule' && !selectedScheduleId) ||
                       (action === 'hold' && !notes.trim())}
              data-testid="button-confirm-reschedule"
            >
              {rescheduleMutation.isPending ? (
                <>
                  <div className="animate-spin w-4 h-4 border-2 border-primary border-t-transparent rounded-full mr-2" />
                  {action === 'reschedule' ? 'Rescheduling...' : 'Placing on Hold...'}
                </>
              ) : (
                <>
                  {action === 'reschedule' ? (
                    <>
                      <Calendar className="h-4 w-4 mr-2" />
                      Reschedule Student
                    </>
                  ) : (
                    <>
                      <Clock className="h-4 w-4 mr-2" />
                      Place on Hold
                    </>
                  )}
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}