import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { useMutation, useQuery } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Loader2 } from "lucide-react";

interface EnrollmentFeedbackModalProps {
  isOpen: boolean;
  onClose: () => void;
  enrollmentId: string;
  userRole: 'instructor' | 'student' | 'superadmin';
  isInstructor: boolean; // Whether user is the instructor for this course
}

interface FeedbackData {
  id?: string;
  instructorFeedbackPositive?: string;
  instructorFeedbackOpportunities?: string;
  instructorFeedbackActionPlan?: string;
  studentNotes?: string;
  instructorFeedbackDate?: string;
  studentNotesDate?: string;
}

export function EnrollmentFeedbackModal({
  isOpen,
  onClose,
  enrollmentId,
  userRole,
  isInstructor,
}: EnrollmentFeedbackModalProps) {
  const { toast } = useToast();
  const [instructorFeedback, setInstructorFeedback] = useState({
    positive: "",
    opportunities: "",
    actionPlan: "",
  });
  const [studentNotes, setStudentNotes] = useState("");

  // Fetch existing feedback
  const { data: feedback, isLoading } = useQuery<FeedbackData>({
    queryKey: ['/api/enrollments', enrollmentId, 'feedback'],
    enabled: isOpen && !!enrollmentId,
    staleTime: 0, // Always refetch to ensure fresh data
  });

  // Update form when feedback is loaded or modal opens
  useEffect(() => {
    if (isOpen && feedback) {
      setInstructorFeedback({
        positive: feedback.instructorFeedbackPositive || "",
        opportunities: feedback.instructorFeedbackOpportunities || "",
        actionPlan: feedback.instructorFeedbackActionPlan || "",
      });
      setStudentNotes(feedback.studentNotes || "");
    } else if (isOpen && !feedback) {
      // Reset to empty when opening with no feedback
      setInstructorFeedback({ positive: "", opportunities: "", actionPlan: "" });
      setStudentNotes("");
    }
  }, [isOpen, feedback, enrollmentId]); // Add enrollmentId to dependencies

  // Reset form state when enrollmentId changes
  useEffect(() => {
    if (isOpen) {
      setInstructorFeedback({ positive: "", opportunities: "", actionPlan: "" });
      setStudentNotes("");
    }
  }, [enrollmentId, isOpen]);

  // Mutation for instructor feedback
  const updateInstructorFeedbackMutation = useMutation({
    mutationFn: async (data: typeof instructorFeedback) => {
      return apiRequest("PATCH", `/api/instructor/enrollments/${enrollmentId}/feedback`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/enrollments', enrollmentId, 'feedback'] });
      toast({
        title: "Feedback saved",
        description: "Instructor feedback has been saved successfully.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to save instructor feedback",
        variant: "destructive",
      });
    },
  });

  // Mutation for student notes
  const updateStudentNotesMutation = useMutation({
    mutationFn: async (notes: string) => {
      return apiRequest("PATCH", `/api/enrollments/${enrollmentId}/student-notes`, { notes });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/enrollments', enrollmentId, 'feedback'] });
      toast({
        title: "Notes saved",
        description: "Your notes have been saved successfully.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to save notes",
        variant: "destructive",
      });
    },
  });

  const handleSaveInstructorFeedback = () => {
    updateInstructorFeedbackMutation.mutate(instructorFeedback);
  };

  const handleSaveStudentNotes = () => {
    updateStudentNotesMutation.mutate(studentNotes);
  };

  const canEditInstructorFeedback = isInstructor || userRole === 'superadmin';
  const canEditStudentNotes = userRole === 'student';

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Course Feedback & Notes</DialogTitle>
        </DialogHeader>

        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <div className="space-y-6">
            {/* Instructor Feedback Section */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Instructor Feedback</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="positive-feedback">Positive Feedback</Label>
                  <Textarea
                    id="positive-feedback"
                    placeholder="What did the student do well?"
                    value={instructorFeedback.positive}
                    onChange={(e) =>
                      setInstructorFeedback({ ...instructorFeedback, positive: e.target.value })
                    }
                    disabled={!canEditInstructorFeedback}
                    rows={4}
                    className="resize-none"
                    data-testid="textarea-positive-feedback"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="opportunities-feedback">Areas of Opportunity</Label>
                  <Textarea
                    id="opportunities-feedback"
                    placeholder="What areas could the student improve?"
                    value={instructorFeedback.opportunities}
                    onChange={(e) =>
                      setInstructorFeedback({ ...instructorFeedback, opportunities: e.target.value })
                    }
                    disabled={!canEditInstructorFeedback}
                    rows={4}
                    className="resize-none"
                    data-testid="textarea-opportunities-feedback"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="action-plan-feedback">Action Plan</Label>
                  <Textarea
                    id="action-plan-feedback"
                    placeholder="What should the student work on next?"
                    value={instructorFeedback.actionPlan}
                    onChange={(e) =>
                      setInstructorFeedback({ ...instructorFeedback, actionPlan: e.target.value })
                    }
                    disabled={!canEditInstructorFeedback}
                    rows={4}
                    className="resize-none"
                    data-testid="textarea-action-plan-feedback"
                  />
                </div>

                {feedback?.instructorFeedbackDate && (
                  <p className="text-sm text-muted-foreground">
                    Last updated: {new Date(feedback.instructorFeedbackDate).toLocaleDateString()}
                  </p>
                )}

                {canEditInstructorFeedback && (
                  <Button
                    onClick={handleSaveInstructorFeedback}
                    disabled={updateInstructorFeedbackMutation.isPending}
                    className="w-full"
                    data-testid="button-save-instructor-feedback"
                  >
                    {updateInstructorFeedbackMutation.isPending && (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    )}
                    Save Instructor Feedback
                  </Button>
                )}
              </CardContent>
            </Card>

            <Separator />

            {/* Student Notes Section */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Student Notes</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="student-notes">My Notes & Reflections</Label>
                  <Textarea
                    id="student-notes"
                    placeholder="Add your personal notes, reflections, or questions..."
                    value={studentNotes}
                    onChange={(e) => setStudentNotes(e.target.value)}
                    disabled={!canEditStudentNotes}
                    rows={6}
                    className="resize-none"
                    data-testid="textarea-student-notes"
                  />
                </div>

                {feedback?.studentNotesDate && (
                  <p className="text-sm text-muted-foreground">
                    Last updated: {new Date(feedback.studentNotesDate).toLocaleDateString()}
                  </p>
                )}

                {canEditStudentNotes && (
                  <Button
                    onClick={handleSaveStudentNotes}
                    disabled={updateStudentNotesMutation.isPending}
                    className="w-full"
                    data-testid="button-save-student-notes"
                  >
                    {updateStudentNotesMutation.isPending && (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    )}
                    Save My Notes
                  </Button>
                )}
              </CardContent>
            </Card>

            <div className="flex justify-end">
              <Button variant="outline" onClick={onClose} data-testid="button-close-feedback">
                Close
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
