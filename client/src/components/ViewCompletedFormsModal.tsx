import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { FileText, Calendar, CheckCircle, AlertCircle } from "lucide-react";
import { format } from "date-fns";
import { useToast } from "@/hooks/use-toast";

interface ViewCompletedFormsModalProps {
  enrollmentId: string;
  courseId: string;
  studentName: string;
  isOpen: boolean;
  onClose: () => void;
}

export function ViewCompletedFormsModal({ enrollmentId, courseId, studentName, isOpen, onClose }: ViewCompletedFormsModalProps) {
  const { toast } = useToast();

  const { data: enrollment, isLoading: enrollmentLoading, error: enrollmentError } = useQuery<any>({
    queryKey: ['/api/enrollments', enrollmentId, 'form-completion'],
    enabled: isOpen && !!enrollmentId,
  });

  const { data: courseForms, isLoading: formsLoading, error: formsError } = useQuery<any[]>({
    queryKey: ['/api/course-forms', courseId],
    enabled: isOpen && !!courseId,
  });

  const submissionData = useMemo(() => {
    if (!enrollment?.formSubmissionData) return null;
    
    try {
      if (typeof enrollment.formSubmissionData === 'string') {
        return JSON.parse(enrollment.formSubmissionData);
      }
      return enrollment.formSubmissionData;
    } catch (error) {
      console.error('Failed to parse form submission data:', error);
      return null;
    }
  }, [enrollment?.formSubmissionData]);

  const isLoading = enrollmentLoading || formsLoading;

  const renderFieldValue = (field: any, value: any) => {
    if (!value || value === '') return <span className="text-muted-foreground italic">Not provided</span>;

    switch (field.fieldType) {
      case 'checkbox':
        return <Badge variant={value === true || value === 'true' ? 'default' : 'secondary'}>
          {value === true || value === 'true' ? 'Yes' : 'No'}
        </Badge>;
      case 'select':
      case 'radio':
        return <span className="font-medium">{value}</span>;
      case 'date':
        try {
          return <span className="font-medium">{format(new Date(value), 'MMMM d, yyyy')}</span>;
        } catch {
          return <span className="font-medium">{value}</span>;
        }
      case 'textarea':
        return <p className="whitespace-pre-wrap text-sm">{value}</p>;
      default:
        return <span className="font-medium">{value}</span>;
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-green-600" />
            Submitted Forms - {studentName}
          </DialogTitle>
        </DialogHeader>

        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
              <p className="text-muted-foreground">Loading forms...</p>
            </div>
          </div>
        ) : enrollmentError || formsError ? (
          <div className="flex items-center justify-center py-12">
            <div className="text-center">
              <AlertCircle className="h-12 w-12 text-destructive mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">Failed to Load Forms</h3>
              <p className="text-muted-foreground">Unable to retrieve form data. Please try again.</p>
            </div>
          </div>
        ) : !submissionData || !courseForms || courseForms.length === 0 ? (
          <div className="flex items-center justify-center py-12">
            <div className="text-center">
              <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">No form submissions found</p>
            </div>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Submission Info */}
            {enrollment.formSubmittedAt && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground pb-4 border-b">
                <Calendar className="h-4 w-4" />
                <span>Submitted: {format(new Date(enrollment.formSubmittedAt), 'MMM d, yyyy h:mm a')}</span>
              </div>
            )}

            {courseForms.map((form: any) => (
              <Card key={form.id} className="border-2 border-green-200">
                <CardHeader className="bg-green-50 dark:bg-green-900/20">
                  <CardTitle className="flex items-center justify-between text-lg">
                    <span className="flex items-center gap-2">
                      <CheckCircle className="h-5 w-5 text-green-600" />
                      {form.title}
                    </span>
                    {form.isRequired && (
                      <Badge variant="secondary" className="bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200">
                        Required
                      </Badge>
                    )}
                  </CardTitle>
                  {form.description && (
                    <p className="text-sm text-muted-foreground mt-2">{form.description}</p>
                  )}
                </CardHeader>
                <CardContent className="pt-6">
                  {form.fields && form.fields.length > 0 ? (
                    <div className="space-y-4">
                      {form.fields.map((field: any) => {
                        const fieldValue = submissionData[field.id];
                        
                        return (
                          <div key={field.id} className="border-b pb-4 last:border-b-0">
                            <label className="text-sm font-medium text-muted-foreground block mb-1">
                              {field.label}
                              {field.isRequired && <span className="text-red-500 ml-1">*</span>}
                            </label>
                            <div className="mt-1">
                              {renderFieldValue(field, fieldValue)}
                            </div>
                            {field.helpText && (
                              <p className="text-xs text-muted-foreground mt-1">{field.helpText}</p>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground">No fields configured for this form.</p>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        <div className="flex justify-end pt-4 border-t">
          <Button onClick={onClose} data-testid="button-close-forms">Close</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
