import React, { useEffect, useState, useMemo } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Layout } from "@/components/Layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormDescription, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { AlertCircle, CreditCard, CheckCircle2, AlertTriangle, Shield, Bell, Edit, Save, X, DollarSign, FileSignature, Users } from "lucide-react";
import { Calendar, Clock, FileText, Download, BookOpen, Award, Target } from "lucide-react";
import { Separator } from "@/components/ui/separator";
import type { EnrollmentWithDetails, User, CourseWithSchedules, CourseSchedule } from "@shared/schema";
import { useLocation } from "wouter";
import { StudentBookingsModal } from "@/components/StudentBookingsModal";
import { EnrollmentFeedbackModal } from "@/components/EnrollmentFeedbackModal";
import { WaiverSigningInterface } from "@/components/WaiverSigningInterface";
import { getEnrollmentStatusClassName } from "@/lib/statusColors";

// Types for the query responses
type PaymentBalanceResponse = {
  hasRemainingBalance: boolean;
  remainingBalance: number;
};

type FormStatusResponse = {
  isComplete: boolean;
  totalForms: number;
  completedForms: number;
  missingForms: Array<{ id: string; title: string; isRequired: boolean }>;
};

// Edit profile form schema
const editProfileSchema = z.object({
  firstName: z.string().min(1, "First name is required"),
  lastName: z.string().min(1, "Last name is required"),
  preferredName: z.string().optional(),
  email: z.string().email("Invalid email address"),
  phone: z.string().optional(),
  streetAddress: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  zipCode: z.string().optional(),
  dateOfBirth: z.string().optional(),
  concealedCarryLicenseIssued: z.string().optional(),
  concealedCarryLicenseExpiration: z.string().optional(),
  emergencyContactName: z.string().optional(),
  emergencyContactPhone: z.string().optional(),
  preferredContactMethods: z.array(z.string()).optional(),
  enableLicenseExpirationReminder: z.boolean().optional(),
  enableRefresherReminder: z.boolean().optional(),
  smsConsent: z.boolean().optional(),
  enableSmsNotifications: z.boolean().optional(),
  enableSmsReminders: z.boolean().optional(),
  enableSmsPaymentNotices: z.boolean().optional(),
  enableSmsAnnouncements: z.boolean().optional(),
});

type EditProfileForm = z.infer<typeof editProfileSchema>;

// Form completion interface component
function FormCompletionInterface({ enrollment, onClose }: { enrollment: EnrollmentWithDetails; onClose: () => void }) {
  const { toast } = useToast();
  const { user } = useAuth();
  const typedUser = user as User;
  const [formData, setFormData] = useState<Record<string, any>>({});
  const [editableFields, setEditableFields] = useState<Record<string, boolean>>({});
  const [initiallyAutopopulatedFields, setInitiallyAutopopulatedFields] = useState<Set<string>>(new Set());

  // Fetch course information forms for this course
  const { data: courseForms, isLoading } = useQuery({
    queryKey: ['/api/course-forms', enrollment.course.id],
    enabled: !!enrollment.course.id,
    retry: false,
  });

  // Parse and memoize existing form submission to avoid infinite loops
  const existingSubmission = useMemo(() => {
    if (!enrollment.formSubmissionData) return null;
    
    try {
      // formSubmissionData is stored as a JSON string in the database
      if (typeof enrollment.formSubmissionData === 'string') {
        const parsed = JSON.parse(enrollment.formSubmissionData);
        return parsed && typeof parsed === 'object' ? parsed : null;
      } else if (typeof enrollment.formSubmissionData === 'object') {
        // Already an object (shouldn't happen but handle it)
        return enrollment.formSubmissionData as Record<string, any>;
      }
    } catch (error) {
      console.error('Failed to parse form submission data:', error);
      return null;
    }
    return null;
  }, [enrollment.formSubmissionData]);

  const hasExistingSubmission = !!existingSubmission;

  // Show error toast if parsing failed (only once when component mounts or data changes)
  useEffect(() => {
    if (enrollment.formSubmissionData && !existingSubmission) {
      // Parsing failed
      toast({
        title: "Error Loading Forms",
        description: "There was an issue loading your saved form data. Please re-enter your information.",
        variant: "destructive",
      });
    }
  }, [enrollment.formSubmissionData, existingSubmission]);
  
  // Load existing form submissions or autopopulate fields on mount
  useEffect(() => {
    if (courseForms && courseForms.length > 0 && typedUser) {
      // Check if forms have already been submitted
      if (existingSubmission) {
        // Load existing form responses
        setFormData(existingSubmission);
        // Mark no fields as autopopulated since they're from saved submissions
        setInitiallyAutopopulatedFields(new Set());
      } else {
        // Autopopulate fields for new form submission
        const fieldMapping: Record<string, any> = {
          'first name': typedUser.firstName,
          'last name': typedUser.lastName,
          'email': typedUser.email,
          'email address': typedUser.email,
          'phone': typedUser.phone,
          'phone number': typedUser.phone,
          'date of birth': typedUser.dateOfBirth ? new Date(typedUser.dateOfBirth).toISOString().split('T')[0] : '',
          'address': typedUser.streetAddress,
          'street address': typedUser.streetAddress,
          'current physical address': typedUser.streetAddress,
          'city': typedUser.city,
          'state': typedUser.state,
          'zip': typedUser.zipCode,
          'zip code': typedUser.zipCode,
          'emergency contact first and last name': typedUser.emergencyContactName,
          'emergency contact name': typedUser.emergencyContactName,
          'emergency contact phone number': typedUser.emergencyContactPhone,
          'emergency contact phone': typedUser.emergencyContactPhone,
          'do you consent to receiving text message notifications?': 'Yes',
          'do you consent to receive text messages': 'Yes',
          'text message consent': 'Yes',
        };

        const autoPopulatedData: Record<string, any> = {};
        const autopopulatedFieldIds = new Set<string>();

        courseForms.forEach((form: any) => {
          form.fields?.forEach((field: any) => {
            const normalizedLabel = field.label.toLowerCase().trim();
            const mappedValue = fieldMapping[normalizedLabel];

            if (mappedValue !== undefined && mappedValue !== null && mappedValue !== '') {
              autoPopulatedData[field.id] = mappedValue;
              autopopulatedFieldIds.add(field.id);
            }
          });
        });

        setFormData(autoPopulatedData);
        setInitiallyAutopopulatedFields(autopopulatedFieldIds);
      }
    }
  }, [courseForms, typedUser, existingSubmission]);

  // Form submission mutation - must be called before any early returns
  const submitFormMutation = useMutation({
    mutationFn: async (formResponses: Record<string, any>) => {
      return await apiRequest("POST", "/api/enrollment-form-submissions", {
        enrollmentId: enrollment.id,
        formResponses,
      });
    },
    onSuccess: () => {
      // Invalidate queries to refresh data
      queryClient.invalidateQueries({ queryKey: ["/api/student/enrollments"] });
      queryClient.invalidateQueries({ queryKey: [`/api/enrollments/${enrollment.id}/form-completion`] });
      queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });

      // Show success message
      toast({
        title: "Forms Submitted",
        description: "Your course information forms have been submitted successfully.",
      });

      // Close the dialog
      onClose();
    },
    onError: (error) => {
      toast({
        title: "Submission Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleFieldChange = (fieldId: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      [fieldId]: value
    }));
  };

  const toggleFieldEdit = (fieldId: string) => {
    setEditableFields(prev => ({
      ...prev,
      [fieldId]: !prev[fieldId]
    }));
  };

  const isFieldAutopopulated = (fieldId: string) => {
    return initiallyAutopopulatedFields.has(fieldId) && !editableFields[fieldId];
  };

  // Check if a field should be visible based on conditional logic
  const isFieldVisible = (field: any) => {
    // If no conditional logic, always show the field
    if (!field.showWhenFieldId || !field.showWhenValue) {
      return true;
    }

    // Get the conditional field's current value
    const conditionalFieldValue = formData[field.showWhenFieldId];
    
    // Handle checkbox fields (which store arrays)
    if (Array.isArray(conditionalFieldValue)) {
      return conditionalFieldValue.includes(field.showWhenValue);
    }
    
    // Handle all other field types (select, radio, text, etc.)
    return conditionalFieldValue === field.showWhenValue;
  };

  const renderField = (field: any) => {
    const value = formData[field.id] || '';
    const isAutopopulated = isFieldAutopopulated(field.id);
    const isEditable = editableFields[field.id] || !isAutopopulated;

    switch (field.fieldType) {
      case 'text':
        return (
          <div key={field.id} className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor={field.id}>
                {field.label}
                {field.isRequired && <span className="text-destructive ml-1">*</span>}
              </Label>
              {isAutopopulated && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => toggleFieldEdit(field.id)}
                  className="h-6 px-2"
                >
                  <Edit className="h-3 w-3 mr-1" />
                  {isEditable ? 'Lock' : 'Edit'}
                </Button>
              )}
            </div>
            <Input
              id={field.id}
              placeholder={field.placeholder || ''}
              value={value}
              onChange={(e) => handleFieldChange(field.id, e.target.value)}
              required={field.isRequired}
              disabled={!isEditable}
              className={!isEditable ? 'bg-muted cursor-not-allowed' : ''}
            />
          </div>
        );

      case 'email':
        return (
          <div key={field.id} className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor={field.id}>
                {field.label}
                {field.isRequired && <span className="text-destructive ml-1">*</span>}
              </Label>
              {isAutopopulated && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => toggleFieldEdit(field.id)}
                  className="h-6 px-2"
                >
                  <Edit className="h-3 w-3 mr-1" />
                  {isEditable ? 'Lock' : 'Edit'}
                </Button>
              )}
            </div>
            <Input
              id={field.id}
              type="email"
              placeholder={field.placeholder || ''}
              value={value}
              onChange={(e) => handleFieldChange(field.id, e.target.value)}
              required={field.isRequired}
              disabled={!isEditable}
              className={!isEditable ? 'bg-muted cursor-not-allowed' : ''}
            />
          </div>
        );

      case 'phone':
        return (
          <div key={field.id} className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor={field.id}>
                {field.label}
                {field.isRequired && <span className="text-destructive ml-1">*</span>}
              </Label>
              {isAutopopulated && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => toggleFieldEdit(field.id)}
                  className="h-6 px-2"
                >
                  <Edit className="h-3 w-3 mr-1" />
                  {isEditable ? 'Lock' : 'Edit'}
                </Button>
              )}
            </div>
            <Input
              id={field.id}
              type="tel"
              placeholder={field.placeholder || ''}
              value={value}
              onChange={(e) => handleFieldChange(field.id, e.target.value)}
              required={field.isRequired}
              disabled={!isEditable}
              className={!isEditable ? 'bg-muted cursor-not-allowed' : ''}
            />
          </div>
        );

      case 'date':
        return (
          <div key={field.id} className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor={field.id}>
                {field.label}
                {field.isRequired && <span className="text-destructive ml-1">*</span>}
              </Label>
              {isAutopopulated && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => toggleFieldEdit(field.id)}
                  className="h-6 px-2"
                >
                  <Edit className="h-3 w-3 mr-1" />
                  {isEditable ? 'Lock' : 'Edit'}
                </Button>
              )}
            </div>
            <Input
              id={field.id}
              type="date"
              value={value}
              onChange={(e) => handleFieldChange(field.id, e.target.value)}
              required={field.isRequired}
              disabled={!isEditable}
              className={!isEditable ? 'bg-muted cursor-not-allowed' : ''}
            />
          </div>
        );

      case 'textarea':
        return (
          <div key={field.id} className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor={field.id}>
                {field.label}
                {field.isRequired && <span className="text-destructive ml-1">*</span>}
              </Label>
              {isAutopopulated && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => toggleFieldEdit(field.id)}
                  className="h-6 px-2"
                >
                  <Edit className="h-3 w-3 mr-1" />
                  {isEditable ? 'Lock' : 'Edit'}
                </Button>
              )}
            </div>
            <Textarea
              id={field.id}
              placeholder={field.placeholder || ''}
              value={value}
              onChange={(e) => handleFieldChange(field.id, e.target.value)}
              required={field.isRequired}
              rows={4}
              disabled={!isEditable}
              className={!isEditable ? 'bg-muted cursor-not-allowed' : ''}
            />
          </div>
        );

      case 'select':
        return (
          <div key={field.id} className="space-y-2">
            <Label htmlFor={field.id}>
              {field.label}
              {field.isRequired && <span className="text-destructive ml-1">*</span>}
            </Label>
            <select
              id={field.id}
              value={value}
              onChange={(e) => handleFieldChange(field.id, e.target.value)}
              required={field.isRequired}
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            >
              <option value="">Select an option</option>
              {field.options?.map((option: string) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </div>
        );

      case 'checkbox':
        if (field.options && field.options.length > 0) {
          return (
            <div key={field.id} className="space-y-3">
              <Label>
                {field.label}
                {field.isRequired && <span className="text-destructive ml-1">*</span>}
              </Label>
              <div className="space-y-2">
                {field.options.map((option: string) => (
                  <div key={option} className="flex items-center space-x-2">
                    <Checkbox
                      id={`${field.id}-${option}`}
                      checked={value === option}
                      onCheckedChange={(checked) => {
                        if (checked) {
                          handleFieldChange(field.id, option);
                        } else if (value === option) {
                          handleFieldChange(field.id, '');
                        }
                      }}
                    />
                    <Label htmlFor={`${field.id}-${option}`} className="font-normal cursor-pointer">
                      {option}
                    </Label>
                  </div>
                ))}
              </div>
            </div>
          );
        }
        return (
          <div key={field.id} className="flex items-center space-x-2">
            <Checkbox
              id={field.id}
              checked={value === true}
              onCheckedChange={(checked) => handleFieldChange(field.id, checked)}
            />
            <Label htmlFor={field.id} className="font-normal">
              {field.label}
              {field.isRequired && <span className="text-destructive ml-1">*</span>}
            </Label>
          </div>
        );

      default:
        return (
          <div key={field.id} className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor={field.id}>
                {field.label}
                {field.isRequired && <span className="text-destructive ml-1">*</span>}
              </Label>
              {isAutopopulated && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => toggleFieldEdit(field.id)}
                  className="h-6 px-2"
                >
                  <Edit className="h-3 w-3 mr-1" />
                  {isEditable ? 'Lock' : 'Edit'}
                </Button>
              )}
            </div>
            <Input
              id={field.id}
              placeholder={field.placeholder || ''}
              value={value}
              onChange={(e) => handleFieldChange(field.id, e.target.value)}
              required={field.isRequired}
              disabled={!isEditable}
              className={!isEditable ? 'bg-muted cursor-not-allowed' : ''}
            />
          </div>
        );
    }
  };

  const handleSubmit = () => {
    // Validate required fields (only for visible fields)
    const allForms = courseForms || [];
    let hasErrors = false;

    for (const form of allForms) {
      for (const field of form.fields || []) {
        // Only validate if the field is visible based on conditional logic
        if (field.isRequired && isFieldVisible(field) && !formData[field.id]) {
          hasErrors = true;
          toast({
            title: "Missing Required Field",
            description: `Please complete the required field: ${field.label}`,
            variant: "destructive",
          });
          break;
        }
      }
      if (hasErrors) break;
    }

    if (!hasErrors) {
      submitFormMutation.mutate(formData);
    }
  };

  return (
    <Dialog open={true} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {hasExistingSubmission ? 'Edit Course Information Forms' : 'Complete Course Information Forms'}
          </DialogTitle>
          <DialogDescription>
            {hasExistingSubmission 
              ? `Review and edit your submitted information forms for ${enrollment?.course.title}` 
              : `Please complete the required information forms for ${enrollment?.course.title}`}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-6">
          <div className="p-4 bg-muted rounded-lg">
            <h4 className="font-semibold mb-2">{enrollment.course.title}</h4>
            <p className="text-sm text-muted-foreground">
              {new Date(enrollment.schedule.startDate).toLocaleDateString()}
            </p>
          </div>

          {isLoading ? (
            <div className="text-center py-8">
              <p className="text-muted-foreground">Loading forms...</p>
            </div>
          ) : !courseForms || courseForms.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-muted-foreground">No forms required for this course.</p>
            </div>
          ) : (
            <div className="space-y-6">
              {courseForms.map((form: any) => (
              <Card key={form.id} className="border-2">
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    <span>{form.title}</span>
                    {form.isRequired && (
                      <Badge variant="secondary" className="bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200">
                        Required
                      </Badge>
                    )}
                  </CardTitle>
                  {form.description && (
                    <p className="text-sm text-muted-foreground">{form.description}</p>
                  )}
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {form.fields && form.fields.length > 0 ? (
                      form.fields
                        .filter((field: any) => isFieldVisible(field))
                        .map((field: any) => renderField(field))
                    ) : (
                      <p className="text-sm text-muted-foreground">No fields configured for this form.</p>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
            </div>
          )}

          {courseForms && courseForms.length > 0 && !isLoading && (
            <div className="flex justify-end space-x-3 pt-4 border-t">
              <Button variant="outline" onClick={() => {
                toast({
                  title: "Draft Saved",
                  description: "Your progress has been saved.",
                });
              }}>
                Save Draft
              </Button>
              <Button onClick={handleSubmit} disabled={submitFormMutation.isPending}>
                {submitFormMutation.isPending 
                  ? (hasExistingSubmission ? 'Updating...' : 'Submitting...') 
                  : (hasExistingSubmission ? 'Update Forms' : 'Submit All Forms')}
              </Button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

// Live-Fire Range Registration Modal
function LiveFireRegistrationModal({ course, schedule, onClose }: {
  course: CourseWithSchedules;
  schedule: CourseSchedule;
  onClose: () => void;
}) {
  const { user } = useAuth();
  const { toast } = useToast();
  const typedUser = user as User;
  const [, navigate] = useLocation();

  const [formData, setFormData] = useState<Record<string, any>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Fetch course information forms for this course
  const { data: courseForms, isLoading } = useQuery({
    queryKey: ['/api/course-forms', course.id],
    enabled: !!course.id,
    retry: false,
  });

  // Auto-populate fields on mount
  useEffect(() => {
    if (courseForms && courseForms.length > 0 && typedUser) {
      const fieldMapping: Record<string, any> = {
        'first name': typedUser.firstName,
        'last name': typedUser.lastName,
        'email': typedUser.email,
        'email address': typedUser.email,
        'phone': typedUser.phone,
        'phone number': typedUser.phone,
        'date of birth': typedUser.dateOfBirth ? new Date(typedUser.dateOfBirth).toISOString().split('T')[0] : '',
        'address': typedUser.streetAddress,
        'street address': typedUser.streetAddress,
        'current physical address': typedUser.streetAddress,
        'city': typedUser.city,
        'state': typedUser.state,
        'zip': typedUser.zipCode,
        'zip code': typedUser.zipCode,
        'emergency contact first and last name': typedUser.emergencyContactName,
        'emergency contact name': typedUser.emergencyContactName,
        'emergency contact phone number': typedUser.emergencyContactPhone,
        'emergency contact phone': typedUser.emergencyContactPhone,
      };

      const autoPopulatedData: Record<string, any> = {};

      courseForms.forEach((form: any) => {
        form.fields?.forEach((field: any) => {
          const normalizedLabel = field.label.toLowerCase().trim();
          const mappedValue = fieldMapping[normalizedLabel];

          if (mappedValue !== undefined && mappedValue !== null && mappedValue !== '') {
            autoPopulatedData[field.id] = mappedValue;
          }
        });
      });

      setFormData(autoPopulatedData);
    }
  }, [courseForms, typedUser]);

  const handleSubmit = async () => {
    setIsSubmitting(true);
    try {
      // Create enrollment for the live-fire session
      const enrollment = await apiRequest("POST", "/api/course-registration/initiate", {
        courseId: course.id,
        scheduleId: schedule.id,
        paymentOption: 'full',
        studentInfo: {
          firstName: typedUser.firstName,
          lastName: typedUser.lastName,
          email: typedUser.email,
        },
      });

      // Submit form responses
      if (Object.keys(formData).length > 0) {
        await apiRequest("POST", "/api/enrollment-form-submissions", {
          enrollmentId: enrollment.id,
          formResponses: formData,
        });
      }

      // Since it's a free course, finalize the enrollment
      await apiRequest("POST", "/api/course-registration/confirm", {
        enrollmentId: enrollment.id,
        paymentIntentId: 'free-course',
        studentInfo: {
          firstName: typedUser.firstName,
          lastName: typedUser.lastName,
          email: typedUser.email,
        },
      });

      toast({
        title: "Registration Successful",
        description: "You've been registered for the Live-Fire Range Session!",
      });

      queryClient.invalidateQueries({ queryKey: ["/api/student/enrollments"] });
      onClose();
    } catch (error: any) {
      toast({
        title: "Registration Failed",
        description: error.message || "Failed to register for the session.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const renderField = (field: any) => {
    const value = formData[field.id] || '';

    switch (field.fieldType) {
      case 'text':
      case 'email':
      case 'phone':
        return (
          <div key={field.id} className="space-y-2">
            <Label htmlFor={field.id}>
              {field.label}
              {field.isRequired && <span className="text-destructive ml-1">*</span>}
            </Label>
            <Input
              id={field.id}
              type={field.fieldType === 'email' ? 'email' : field.fieldType === 'phone' ? 'tel' : 'text'}
              placeholder={field.placeholder || ''}
              value={value}
              onChange={(e) => setFormData(prev => ({ ...prev, [field.id]: e.target.value }))}
              required={field.isRequired}
            />
          </div>
        );

      case 'date':
        return (
          <div key={field.id} className="space-y-2">
            <Label htmlFor={field.id}>
              {field.label}
              {field.isRequired && <span className="text-destructive ml-1">*</span>}
            </Label>
            <Input
              id={field.id}
              type="date"
              value={value}
              onChange={(e) => setFormData(prev => ({ ...prev, [field.id]: e.target.value }))}
              required={field.isRequired}
            />
          </div>
        );

      case 'textarea':
        return (
          <div key={field.id} className="space-y-2">
            <Label htmlFor={field.id}>
              {field.label}
              {field.isRequired && <span className="text-destructive ml-1">*</span>}
            </Label>
            <Textarea
              id={field.id}
              placeholder={field.placeholder || ''}
              value={value}
              onChange={(e) => setFormData(prev => ({ ...prev, [field.id]: e.target.value }))}
              required={field.isRequired}
              rows={4}
            />
          </div>
        );

      case 'select':
        return (
          <div key={field.id} className="space-y-2">
            <Label htmlFor={field.id}>
              {field.label}
              {field.isRequired && <span className="text-destructive ml-1">*</span>}
            </Label>
            <select
              id={field.id}
              value={value}
              onChange={(e) => setFormData(prev => ({ ...prev, [field.id]: e.target.value }))}
              required={field.isRequired}
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            >
              <option value="">Select an option</option>
              {field.options?.map((option: string) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </div>
        );

      case 'checkbox':
        if (field.options && field.options.length > 0) {
          return (
            <div key={field.id} className="space-y-3">
              <Label>
                {field.label}
                {field.isRequired && <span className="text-destructive ml-1">*</span>}
              </Label>
              <div className="space-y-2">
                {field.options.map((option: string) => (
                  <div key={option} className="flex items-center space-x-2">
                    <Checkbox
                      id={`${field.id}-${option}`}
                      checked={value === option}
                      onCheckedChange={(checked) => {
                        if (checked) {
                          setFormData(prev => ({ ...prev, [field.id]: option }));
                        } else if (value === option) {
                          setFormData(prev => ({ ...prev, [field.id]: '' }));
                        }
                      }}
                    />
                    <Label htmlFor={`${field.id}-${option}`} className="font-normal cursor-pointer">
                      {option}
                    </Label>
                  </div>
                ))}
              </div>
            </div>
          );
        }
        return (
          <div key={field.id} className="flex items-center space-x-2">
            <Checkbox
              id={field.id}
              checked={value === true}
              onCheckedChange={(checked) => setFormData(prev => ({ ...prev, [field.id]: checked }))}
            />
            <Label htmlFor={field.id} className="font-normal">
              {field.label}
              {field.isRequired && <span className="text-destructive ml-1">*</span>}
            </Label>
          </div>
        );

      default:
        return (
          <div key={field.id} className="space-y-2">
            <Label htmlFor={field.id}>
              {field.label}
              {field.isRequired && <span className="text-destructive ml-1">*</span>}
            </Label>
            <Input
              id={field.id}
              placeholder={field.placeholder || ''}
              value={value}
              onChange={(e) => setFormData(prev => ({ ...prev, [field.id]: e.target.value }))}
              required={field.isRequired}
            />
          </div>
        );
    }
  };

  return (
    <Dialog open={true} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Register for Live-Fire Range Session</DialogTitle>
          <DialogDescription>
            Complete the information below to register for your live-fire range session.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Session Details */}
          <Card className="bg-muted">
            <CardContent className="pt-6">
              <div className="flex items-center space-x-2 mb-2">
                <Calendar className="h-4 w-4 text-accent" />
                <span className="font-medium">
                  {new Date(schedule.startDate).toLocaleDateString('en-US', {
                    weekday: 'long',
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric'
                  })}
                </span>
              </div>
              <div className="flex items-center space-x-4 text-sm text-muted-foreground">
                <div className="flex items-center">
                  <Clock className="mr-1 h-3 w-3" />
                  {schedule.startTime} - {schedule.endTime}
                </div>
                {schedule.location && (
                  <div className="flex items-center">
                    <span className="mr-1">📍</span>
                    {schedule.location}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Course Forms */}
          {isLoading ? (
            <div className="text-center py-8">
              <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full mx-auto mb-4" />
              <p className="text-muted-foreground">Loading registration form...</p>
            </div>
          ) : courseForms && courseForms.length > 0 ? (
            <div className="space-y-6">
              {courseForms.map((form: any) => (
                <Card key={form.id} className="border-2">
                  <CardHeader>
                    <CardTitle className="flex items-center justify-between">
                      <span>{form.title}</span>
                      {form.isRequired && (
                        <Badge variant="secondary" className="bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200">
                          Required
                        </Badge>
                      )}
                    </CardTitle>
                    {form.description && (
                      <p className="text-sm text-muted-foreground">{form.description}</p>
                    )}
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {form.fields && form.fields.length > 0 ? (
                        form.fields.map((field: any) => renderField(field))
                      ) : (
                        <p className="text-sm text-muted-foreground">No fields configured for this form.</p>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">
                No forms are currently required for this session.
              </p>
            </div>
          )}

          {/* Submit Button */}
          <div className="flex justify-end space-x-3 pt-4 border-t">
            <Button variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button onClick={handleSubmit} disabled={isSubmitting}>
              {isSubmitting ? (
                <>
                  <div className="animate-spin w-4 h-4 border-2 border-transparent border-t-current rounded-full mr-2" />
                  Registering...
                </>
              ) : (
                'Complete Registration'
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// Live-Fire Range Sessions Section Component
function LiveFireRangeSessionsSection() {
  const { toast } = useToast();
  const [showAll, setShowAll] = useState(false);
  const [selectedSchedule, setSelectedSchedule] = useState<any>(null);
  const [showRegistrationForm, setShowRegistrationForm] = useState(false);

  // Fetch the Live-Fire Range Session course
  const { data: courses = [] } = useQuery<CourseWithSchedules[]>({
    queryKey: ["/api/courses"],
  });

  const liveFireCourse = courses.find(course =>
    course.title.toLowerCase().includes('live-fire') &&
    course.title.toLowerCase().includes('range')
  );

  // Get upcoming schedules for the Live-Fire Range Session
  const upcomingSchedules = useMemo(() => {
    if (!liveFireCourse || !liveFireCourse.schedules) return [];

    const now = new Date();
    return liveFireCourse.schedules
      .filter(schedule =>
        !schedule.deletedAt &&
        new Date(schedule.startDate) > now &&
        schedule.availableSpots > 0
      )
      .sort((a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime());
  }, [liveFireCourse]);

  const displayedSchedules = showAll ? upcomingSchedules : upcomingSchedules.slice(0, 5);

  const handleRegisterClick = (schedule: any) => {
    setSelectedSchedule(schedule);
    setShowRegistrationForm(true);
  };

  if (!liveFireCourse || upcomingSchedules.length === 0) {
    return null;
  }

  return (
    <>
      <Card className="mb-8 border-2 border-accent">
        <CardHeader className="bg-accent/5">
          <CardTitle className="flex items-center">
            <Target className="mr-2 h-5 w-5 text-accent" />
            Live-Fire Range Sessions Available
          </CardTitle>
          <p className="text-sm text-muted-foreground mt-2">
            Complete your Online New Mexico Concealed Carry Course by attending a required live-fire range session.
          </p>
        </CardHeader>
        <CardContent className="pt-6">
          <div className="space-y-3">
            {displayedSchedules.map((schedule) => (
              <div
                key={schedule.id}
                className="p-4 border rounded-lg hover:border-accent transition-colors"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center space-x-2 mb-2">
                      <Calendar className="h-4 w-4 text-accent" />
                      <span className="font-medium">
                        {new Date(schedule.startDate).toLocaleDateString('en-US', {
                          weekday: 'long',
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric'
                        })}
                      </span>
                    </div>
                    <div className="flex items-center space-x-4 text-sm text-muted-foreground">
                      <div className="flex items-center">
                        <Clock className="mr-1 h-3 w-3" />
                        {schedule.startTime} - {schedule.endTime}
                      </div>
                      {schedule.location && (
                        <div className="flex items-center">
                          <span className="mr-1">📍</span>
                          {schedule.location}
                        </div>
                      )}
                      <div className="flex items-center">
                        <Users className="mr-1 h-3 w-3" />
                        {schedule.availableSpots} spots left
                      </div>
                    </div>
                  </div>
                  <Button
                    onClick={() => handleRegisterClick(schedule)}
                    disabled={schedule.availableSpots === 0}
                    className="ml-4"
                  >
                    Register
                  </Button>
                </div>
              </div>
            ))}
          </div>

          {upcomingSchedules.length > 5 && (
            <div className="mt-4 text-center">
              <Button
                variant="outline"
                onClick={() => setShowAll(!showAll)}
              >
                {showAll ? 'Show Less' : `View ${upcomingSchedules.length - 5} More Sessions`}
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Registration Form Dialog */}
      {showRegistrationForm && selectedSchedule && liveFireCourse && (
        <LiveFireRegistrationModal
          course={liveFireCourse}
          schedule={selectedSchedule}
          onClose={() => {
            setShowRegistrationForm(false);
            setSelectedSchedule(null);
          }}
        />
      )}
    </>
  );
}

// Enhanced enrollment card component with payment and form status
function EnhancedEnrollmentCard({
  enrollment,
  onCompleteFormsClick,
  onCompleteWaiverClick,
  onRequestTransferClick,
  onUnenrollClick,
}: {
  enrollment: EnrollmentWithDetails;
  onCompleteFormsClick: (enrollment: EnrollmentWithDetails) => void;
  onCompleteWaiverClick: (enrollment: EnrollmentWithDetails) => void;
  onRequestTransferClick: (enrollment: EnrollmentWithDetails) => void;
  onUnenrollClick: (enrollment: EnrollmentWithDetails) => void;
}) {
  const { data: paymentBalance } = useQuery<PaymentBalanceResponse>({
    queryKey: ['/api/enrollments', enrollment.id, 'payment-balance'],
    enabled: !!enrollment.id,
    retry: false,
  });

  const { data: formStatus } = useQuery<FormStatusResponse>({
    queryKey: ['/api/enrollments', enrollment.id, 'form-completion'],
    enabled: !!enrollment.id,
    retry: false,
  });

  // Query waiver status for this enrollment
  const { data: waiverStatus } = useQuery({
    queryKey: ['/api/enrollments', enrollment.id, 'waiver-status'],
    queryFn: async () => {
      const response = await fetch(`/api/enrollments/${enrollment.id}/waiver-instances`, {
        credentials: 'include'
      });
      if (!response.ok) return { hasPendingWaivers: false, allSigned: true };
      const waivers = await response.json();
      const pending = waivers.filter((w: any) => w.status === 'pending');
      const allSigned = waivers.length > 0 && waivers.every((w: any) => w.status === 'signed');
      return { hasPendingWaivers: pending.length > 0, allSigned };
    },
    enabled: !!enrollment.id,
    retry: false,
  });

  return (
    <div className="p-4 bg-muted rounded-lg">
      <div className="flex items-start justify-between mb-3">
        <h4 className="font-semibold text-card-foreground" data-testid={`text-course-title-${enrollment.id}`}>
          {enrollment.course.title}
        </h4>
        <Badge className={getEnrollmentStatusClassName(enrollment.status)}>
          {enrollment.status}
        </Badge>
      </div>

      {/* Course Details */}
      <div className="space-y-1 text-sm text-muted-foreground mb-3">
        <div className="flex items-center">
          <Calendar className="mr-2 h-4 w-4" />
          {new Date(enrollment.schedule.startDate).toLocaleDateString()}
        </div>
        <div className="flex items-center">
          <Clock className="mr-2 h-4 w-4" />
          {enrollment.course.duration}
        </div>
        {enrollment.schedule.location && (
          <div className="flex items-center">
            <span className="mr-2">📍</span>
            {enrollment.schedule.location}
          </div>
        )}
      </div>

      {/* Payment & Form Status */}
      <div className="grid grid-cols-3 gap-4 mb-3">
        {/* Payment Status */}
        <div className="space-y-1">
          <div className="flex items-center text-xs text-muted-foreground">
            <CreditCard className="mr-1 h-3 w-3" />
            Payment
          </div>
          {paymentBalance?.hasRemainingBalance ? (
            <div className="flex items-center space-x-1">
              <AlertCircle className="h-3 w-3 text-yellow-500" />
              <span className="text-xs text-yellow-600 font-medium">
                ${paymentBalance.remainingBalance.toFixed(2)} due
              </span>
            </div>
          ) : (
            <div className="flex items-center space-x-1">
              <CheckCircle2 className="h-3 w-3 text-success" />
              <span className="text-xs text-success font-medium">Paid</span>
            </div>
          )}
        </div>

        {/* Form Status */}
        <div className="space-y-1">
          <div className="flex items-center text-xs text-muted-foreground">
            <FileText className="mr-1 h-3 w-3" />
            Forms
          </div>
          {formStatus?.isComplete ? (
            <div className="flex items-center space-x-1">
              <CheckCircle2 className="h-3 w-3 text-success" />
              <span className="text-xs text-success font-medium">Complete</span>
            </div>
          ) : (
            <div className="flex items-center space-x-1">
              <AlertCircle className="h-3 w-3 text-yellow-500" />
              <span className="text-xs text-yellow-600 font-medium">
                {formStatus?.missingForms?.length || 0} pending
              </span>
            </div>
          )}
        </div>

        {/* Waiver Status */}
        <div className="space-y-1">
          <div className="flex items-center text-xs text-muted-foreground">
            <FileSignature className="mr-1 h-3 w-3" />
            Waiver
          </div>
          {waiverStatus?.allSigned ? (
            <div className="flex items-center space-x-1">
              <CheckCircle2 className="h-3 w-3 text-success" />
              <span className="text-xs text-success font-medium">Signed</span>
            </div>
          ) : waiverStatus?.hasPendingWaivers ? (
            <div className="flex items-center space-x-1">
              <AlertCircle className="h-3 w-3 text-yellow-500" />
              <span className="text-xs text-yellow-600 font-medium">Pending</span>
            </div>
          ) : (
            <div className="flex items-center space-x-1">
              <AlertCircle className="h-3 w-3 text-muted-foreground" />
              <span className="text-xs text-muted-foreground font-medium">N/A</span>
            </div>
          )}
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex flex-wrap gap-2 items-center">
        <div className="flex flex-wrap gap-2 flex-1">
          {paymentBalance?.hasRemainingBalance && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                window.location.href = `/checkout?enrollmentId=${enrollment.id}`;
              }}
              data-testid={`button-make-payment-${enrollment.id}`}
            >
              <CreditCard className="mr-2 h-4 w-4" />
              Make Payment
            </Button>
          )}

          {formStatus && formStatus.totalForms > 0 && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => onCompleteFormsClick(enrollment)}
              data-testid={`button-complete-forms-${enrollment.id}`}
            >
              <FileText className="mr-2 h-4 w-4" />
              {formStatus.isComplete ? 'Edit Forms' : 'Complete Forms'}
            </Button>
          )}

          {waiverStatus?.hasPendingWaivers && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => onCompleteWaiverClick(enrollment)}
              data-testid={`button-complete-waiver-${enrollment.id}`}
            >
              <FileSignature className="mr-2 h-4 w-4" />
              Complete Waiver
            </Button>
          )}

          {enrollment.waiverUrl && (
            <Button variant="outline" size="sm" data-testid={`button-download-waiver-${enrollment.id}`}>
              <Download className="mr-2 h-4 w-4" />
              Download Waiver
            </Button>
          )}

          {/* Request Transfer Button */}
          <Button
            variant="outline"
            size="sm"
            onClick={() => onRequestTransferClick(enrollment)}
            data-testid={`button-request-transfer-${enrollment.id}`}
          >
            <Edit className="mr-2 h-4 w-4" />
            Request Transfer
          </Button>
        </div>

        {/* Unenroll Button - Right aligned and smaller */}
        <Button
          variant="destructive"
          size="sm"
          onClick={() => onUnenrollClick(enrollment)}
          data-testid={`button-unenroll-${enrollment.id}`}
          className="ml-auto text-xs px-2 py-1 h-7"
        >
          <X className="mr-1 h-3 w-3" />
          Unenroll Me
        </Button>
      </div>
    </div>
  );
}

// Edit Profile Dialog Component
function EditProfileDialog({ isOpen, onClose, user }: {
  isOpen: boolean;
  onClose: () => void;
  user: User;
}) {
  const { toast } = useToast();

  // Contact method options
  const contactMethods = [
    { id: 'text', label: 'Text Message' },
    { id: 'email', label: 'Email' },
    { id: 'phone', label: 'Phone Call' }
  ];

  // Convert dates to string format for form inputs
  const formatDateForInput = (date: Date | string | null) => {
    if (!date) return '';

    // Handle string dates
    if (typeof date === 'string') {
      const parsedDate = new Date(date);
      if (isNaN(parsedDate.getTime())) return '';
      return parsedDate.toISOString().split('T')[0];
    }

    // Handle Date objects
    if (date instanceof Date) {
      return date.toISOString().split('T')[0];
    }

    return '';
  };

  const form = useForm<EditProfileForm>({
    resolver: zodResolver(editProfileSchema),
    defaultValues: {
      firstName: user.firstName || '',
      lastName: user.lastName || '',
      preferredName: user.preferredName || '',
      email: user.email || '',
      phone: user.phone || '',
      streetAddress: user.streetAddress || '',
      city: user.city || '',
      state: user.state || '',
      zipCode: user.zipCode || '',
      dateOfBirth: formatDateForInput(user.dateOfBirth),
      concealedCarryLicenseIssued: formatDateForInput(user.concealedCarryLicenseIssued),
      concealedCarryLicenseExpiration: formatDateForInput(user.concealedCarryLicenseExpiration),
      emergencyContactName: user.emergencyContactName || '',
      emergencyContactPhone: user.emergencyContactPhone || '',
      preferredContactMethods: user.preferredContactMethods || [],
      enableLicenseExpirationReminder: user.enableLicenseExpirationReminder ?? true,
      enableRefresherReminder: user.enableRefresherReminder ?? true,
      smsConsent: user.smsConsent ?? true,
      enableSmsNotifications: user.enableSmsNotifications ?? true,
      enableSmsReminders: user.enableSmsReminders ?? true,
      enableSmsPaymentNotices: user.enableSmsPaymentNotices ?? false,
      enableSmsAnnouncements: user.enableSmsAnnouncements ?? false,
    },
  });

  // Reset form when dialog opens or user data changes
  useEffect(() => {
    if (isOpen) {
      form.reset({
        firstName: user.firstName || '',
        lastName: user.lastName || '',
        preferredName: user.preferredName || '',
        email: user.email || '',
        phone: user.phone || '',
        streetAddress: user.streetAddress || '',
        city: user.city || '',
        state: user.state || '',
        zipCode: user.zipCode || '',
        dateOfBirth: formatDateForInput(user.dateOfBirth),
        concealedCarryLicenseIssued: formatDateForInput(user.concealedCarryLicenseIssued),
        concealedCarryLicenseExpiration: formatDateForInput(user.concealedCarryLicenseExpiration),
        emergencyContactName: user.emergencyContactName || '',
        emergencyContactPhone: user.emergencyContactPhone || '',
        preferredContactMethods: user.preferredContactMethods || [],
        enableLicenseExpirationReminder: user.enableLicenseExpirationReminder ?? true,
        enableRefresherReminder: user.enableRefresherReminder ?? true,
        smsConsent: user.smsConsent ?? true,
        enableSmsNotifications: user.enableSmsNotifications ?? true,
        enableSmsReminders: user.enableSmsReminders ?? true,
        enableSmsPaymentNotices: user.enableSmsPaymentNotices ?? false,
        enableSmsAnnouncements: user.enableSmsAnnouncements ?? false,
      });
    }
  }, [isOpen, user, form]);

  const updateProfileMutation = useMutation({
    mutationFn: (data: EditProfileForm) => apiRequest('PUT', '/api/profile', data),
    onSuccess: () => {
      toast({
        title: "Profile Updated",
        description: "Your profile has been successfully updated.",
        variant: "default",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/auth/user'] });
      onClose();
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update profile. Please try again.",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: EditProfileForm) => {
    updateProfileMutation.mutate(data);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center">
            <Edit className="mr-2 h-5 w-5" />
            Edit Profile
          </DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            {/* Basic Information */}
            <div className="space-y-4">
              <h3 className="text-lg font-medium">Basic Information</h3>

              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="firstName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>First Name *</FormLabel>
                      <FormControl>
                        <Input {...field} data-testid="input-first-name" />
                      </FormControl>
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="lastName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Last Name *</FormLabel>
                      <FormControl>
                        <Input {...field} data-testid="input-last-name" />
                      </FormControl>
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="preferredName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Preferred Name (Nickname)</FormLabel>
                    <FormControl>
                      <Input {...field} data-testid="input-preferred-name" />
                    </FormControl>
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="dateOfBirth"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Date of Birth</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} data-testid="input-date-of-birth" />
                    </FormControl>
                  </FormItem>
                )}
              />
            </div>

            {/* Contact Information */}
            <div className="space-y-4">
              <h3 className="text-lg font-medium">Contact Information</h3>

              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email Address *</FormLabel>
                    <FormControl>
                      <Input type="email" {...field} data-testid="input-email" />
                    </FormControl>
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="phone"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Phone Number</FormLabel>
                    <FormControl>
                      <Input {...field} type="tel" placeholder="(555) 123-4567" data-testid="input-phone" />
                    </FormControl>
                  </FormItem>
                )}
              />

              {/* Mailing Address Fields */}
              <FormField
                control={form.control}
                name="streetAddress"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Street Address</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="123 Main Street" data-testid="input-street-address" />
                    </FormControl>
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-3 gap-4">
                <FormField
                  control={form.control}
                  name="city"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>City</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="Albuquerque" data-testid="input-city" />
                      </FormControl>
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="state"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>State</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="NM" maxLength={2} data-testid="input-state" />
                      </FormControl>
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="zipCode"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>ZIP Code</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="87101" data-testid="input-zip-code" />
                      </FormControl>
                    </FormItem>
                  )}
                />
              </div>
            </div>

            {/* License Information */}
            {/* Hidden for now as per user request */}
            {/* 
            <div className="space-y-4">
              <h3 className="text-lg font-medium">License Information</h3>

              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="concealedCarryLicenseIssued"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>NM CCL Issue Date</FormLabel>
                      <FormControl>
                        <Input type="date" {...field} data-testid="input-ccl-issued" />
                      </FormControl>
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="concealedCarryLicenseExpiration"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>NM CCL Expiration Date</FormLabel>
                      <FormControl>
                        <Input type="date" {...field} data-testid="input-ccl-expiration" />
                      </FormControl>
                    </FormItem>
                  )}
                />
              </div>
            </div>

            <Separator />
            */}

            {/* License Renewal Reminders */}
            {/* Hidden for now as per user request */}
            {/* 
            <div className="space-y-4">
              <h3 className="text-lg font-medium">License Renewal Reminders</h3>
              <div className="space-y-3">
                <FormField
                  control={form.control}
                  name="enableLicenseExpirationReminder"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm">
                      <div className="space-y-0.5">
                        <FormLabel className="text-base font-medium">
                          License Expiration Reminders
                        </FormLabel>
                        <FormDescription>
                          Receive reminders when your concealed carry license is expiring
                        </FormDescription>
                      </div>
                      <FormControl>
                        <Switch
                          checked={field.value}
                          onCheckedChange={field.onChange}
                          data-testid="switch-license-expiration"
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="enableRefresherReminder"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm">
                      <div className="space-y-0.5">
                        <FormLabel className="text-base font-medium">
                          Refresher Course Reminders
                        </FormLabel>
                        <FormDescription>
                          Receive reminders to take a refresher course before license renewal
                        </FormDescription>
                      </div>
                      <FormControl>
                        <Switch
                          checked={field.value}
                          onCheckedChange={field.onChange}
                          data-testid="switch-refresher-reminder"
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />
              </div>
            </div>

            <Separator />
            */}

            {/* Emergency Contact Information */}
            <div className="space-y-4">
              <h3 className="text-lg font-medium">Emergency Contact</h3>

              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="emergencyContactName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Emergency Contact Name</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="Full Name" data-testid="input-emergency-contact-name" />
                      </FormControl>
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="emergencyContactPhone"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Emergency Contact Phone</FormLabel>
                      <FormControl>
                        <Input {...field} type="tel" placeholder="(555) 123-4567" data-testid="input-emergency-contact-phone" />
                      </FormControl>
                    </FormItem>
                  )}
                />
              </div>
            </div>

            {/* Contact Preferences */}
            <div className="space-y-4">
              <h3 className="text-lg font-medium">Preferred Contact Methods</h3>
              <FormField
                control={form.control}
                name="preferredContactMethods"
                render={() => (
                  <FormItem>
                    <div className="grid grid-cols-3 gap-4">
                      {contactMethods.map((method) => (
                        <FormField
                          key={method.id}
                          control={form.control}
                          name="preferredContactMethods"
                          render={({ field }) => {
                            return (
                              <FormItem
                                key={method.id}
                                className="flex flex-row items-start space-x-3 space-y-0"
                              >
                                <FormControl>
                                  <Checkbox
                                    checked={field.value?.includes(method.id)}
                                    onCheckedChange={(checked) => {
                                      return checked
                                        ? field.onChange([...(field.value || []), method.id])
                                        : field.onChange(
                                          field.value?.filter(
                                            (value) => value !== method.id
                                          )
                                        )
                                    }}
                                    data-testid={`checkbox-contact-${method.id}`}
                                  />
                                </FormControl>
                                <FormLabel className="font-normal">
                                  {method.label}
                                </FormLabel>
                              </FormItem>
                            )
                          }}
                        />
                      ))}
                    </div>
                  </FormItem>
                )}
              />
            </div>

            {/* SMS Notification Preferences */}
            <div className="space-y-4">
              <h3 className="text-lg font-medium">SMS Notification Preferences</h3>
              <div className="space-y-3">
                <FormField
                  control={form.control}
                  name="smsConsent"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-center justify-between rounded-lg border-2 border-primary p-3 shadow-sm bg-primary/5">
                      <div className="space-y-0.5">
                        <FormLabel className="text-base font-medium">
                          SMS Consent
                        </FormLabel>
                        <FormDescription>
                          Allow Tactical Advantage to send SMS messages to your phone. You agreed to this when registering. Reply STOP to opt out.
                        </FormDescription>
                      </div>
                      <FormControl>
                        <Switch
                          checked={field.value}
                          onCheckedChange={field.onChange}
                          data-testid="switch-sms-consent"
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="enableSmsNotifications"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm">
                      <div className="space-y-0.5">
                        <FormLabel className="text-base font-medium">
                          Enable SMS Notifications
                        </FormLabel>
                        <FormDescription>
                          Master toggle for all SMS notifications
                        </FormDescription>
                      </div>
                      <FormControl>
                        <Switch
                          checked={field.value}
                          onCheckedChange={field.onChange}
                          disabled={!form.watch("smsConsent")}
                          data-testid="switch-sms-notifications"
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="enableSmsReminders"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm">
                      <div className="space-y-0.5">
                        <FormLabel className="text-base font-medium">
                          SMS Course & License Reminders
                        </FormLabel>
                        <FormDescription>
                          Receive SMS reminders for upcoming courses and license renewals
                        </FormDescription>
                      </div>
                      <FormControl>
                        <Switch
                          checked={field.value}
                          onCheckedChange={field.onChange}
                          disabled={!form.watch("smsConsent") || !form.watch("enableSmsNotifications")}
                          data-testid="switch-sms-reminders"
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="enableSmsPaymentNotices"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm">
                      <div className="space-y-0.5">
                        <FormLabel className="text-base font-medium">
                          SMS Payment Notifications
                        </FormLabel>
                        <FormDescription>
                          Receive SMS notifications for payment confirmations and failures
                        </FormDescription>
                      </div>
                      <FormControl>
                        <Switch
                          checked={field.value}
                          onCheckedChange={field.onChange}
                          disabled={!form.watch("smsConsent") || !form.watch("enableSmsNotifications")}
                          data-testid="switch-sms-payment-notices"
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="enableSmsAnnouncements"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm">
                      <div className="space-y-0.5">
                        <FormLabel className="text-base font-medium">
                          SMS Announcements
                        </FormLabel>
                        <FormDescription>
                          Receive SMS notifications for general announcements and updates
                        </FormDescription>
                      </div>
                      <FormControl>
                        <Switch
                          checked={field.value}
                          onCheckedChange={field.onChange}
                          disabled={!form.watch("smsConsent") || !form.watch("enableSmsNotifications")}
                          data-testid="switch-sms-announcements"
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />
              </div>
            </div>

            {/* Form Actions */}
            <div className="flex justify-end space-x-3 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={onClose}
                data-testid="button-cancel-edit"
              >
                <X className="mr-2 h-4 w-4" />
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={updateProfileMutation.isPending}
                data-testid="button-save-profile"
              >
                <Save className="mr-2 h-4 w-4" />
                {updateProfileMutation.isPending ? 'Saving...' : 'Save Changes'}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

// StudentTransferRequestModal component
function StudentTransferRequestModal({ enrollment, isOpen, onClose }: {
  enrollment: EnrollmentWithDetails;
  isOpen: boolean;
  onClose: () => void;
}) {
  const { toast } = useToast();
  const [selectedScheduleId, setSelectedScheduleId] = useState<string | null>(null);
  const [isOnHold, setIsOnHold] = useState(false);

  // Fetch future course schedules for the same course
  const { data: futureSchedules = [], isLoading: isLoadingSchedules } = useQuery<CourseSchedule[]>({
    queryKey: ['/api/course-schedules', enrollment.course.id, 'future'],
    queryFn: async () => {
      const response = await apiRequest('GET', `/api/course-schedules?courseId=${enrollment.course.id}&future=true`);
      return response;
    },
    enabled: isOpen && !!enrollment.course.id,
    retry: false,
  });

  // Mutation for requesting a transfer
  const requestTransferMutation = useMutation({
    mutationFn: async (payload: { scheduleId?: string | null; isOnHold: boolean }) => {
      return await apiRequest("POST", `/api/enrollments/${enrollment.id}/request-transfer`, payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/student/enrollments"] });
      toast({
        title: "Transfer Request Submitted",
        description: isOnHold
          ? "You have been unenrolled and placed on the hold list."
          : "Your request to transfer to a future course date has been submitted.",
      });
      onClose();
    },
    onError: (error: any) => {
      toast({
        title: "Request Failed",
        description: error.message || "Failed to submit transfer request. Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleSubmit = () => {
    if (isOnHold) {
      requestTransferMutation.mutate({ isOnHold: true });
    } else if (selectedScheduleId) {
      requestTransferMutation.mutate({ scheduleId: selectedScheduleId, isOnHold: false });
    } else {
      toast({
        title: "Invalid Selection",
        description: "Please select a future course date or choose to be placed on hold.",
        variant: "destructive",
      });
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Request Course Transfer</DialogTitle>
          <DialogDescription>
            Request to transfer your enrollment in "{enrollment.course.title}" to a future date or be placed on hold.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          <div className="p-4 bg-muted rounded-lg">
            <h4 className="font-semibold mb-2">{enrollment.course.title}</h4>
            <p className="text-sm text-muted-foreground">
              Current Date: {new Date(enrollment.schedule.startDate).toLocaleDateString()}
            </p>
          </div>

          <div className="space-y-4">
            <div className="flex items-center space-x-2">
              <Checkbox
                id="hold-list"
                checked={isOnHold}
                onCheckedChange={(checked) => {
                  setIsOnHold(checked as boolean);
                  if (checked) {
                    setSelectedScheduleId(null); // Clear schedule selection if on hold
                  }
                }}
              />
              <Label htmlFor="hold-list" className="font-normal">Place on Hold List</Label>
            </div>
            <p className="text-sm text-muted-foreground">
              Unenroll from this scheduled course and be placed on a hold list. You can request a transfer later if a new course is scheduled.
            </p>
          </div>

          {!isOnHold && (
            <div className="space-y-4">
              <Label htmlFor="future-schedule" className="font-semibold">Or, select a future course date:</Label>
              {isLoadingSchedules ? (
                <div className="text-center py-4">
                  <div className="animate-spin w-6 h-6 border-2 border-primary border-t-transparent rounded-full mx-auto mb-2" />
                  <p className="text-muted-foreground text-sm">Loading available dates...</p>
                </div>
              ) : futureSchedules.length > 0 ? (
                <select
                  id="future-schedule"
                  value={selectedScheduleId || ""}
                  onChange={(e) => {
                    setSelectedScheduleId(e.target.value);
                    setIsOnHold(false); // Ensure hold option is deselected
                  }}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                  disabled={futureSchedules.length === 0}
                >
                  <option value="">Select a future date</option>
                  {futureSchedules.map((schedule) => (
                    <option key={schedule.id} value={schedule.id}>
                      {new Date(schedule.startDate).toLocaleDateString()} - {schedule.startTime}
                    </option>
                  ))}
                </select>
              ) : (
                <p className="text-sm text-muted-foreground">No future dates available for this course at the moment.</p>
              )}
              <p className="text-sm text-muted-foreground">
                Transfer to a future scheduled session of the same course.
              </p>
            </div>
          )}

          <div className="flex justify-end space-x-3 pt-4 border-t">
            <Button variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={requestTransferMutation.isPending || (!isOnHold && !selectedScheduleId) || (isLoadingSchedules && futureSchedules.length === 0)}
            >
              {requestTransferMutation.isPending ? (
                <>
                  <div className="animate-spin w-4 h-4 border-2 border-transparent border-t-current rounded-full mr-2" />
                  Processing...
                </>
              ) : (
                'Submit Request'
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// Unenroll Confirmation Dialog Component
function UnenrollConfirmationDialog({ isOpen, onClose, enrollment }: {
  isOpen: boolean;
  onClose: () => void;
  enrollment: EnrollmentWithDetails;
}) {
  const { toast } = useToast();
  const [requestRefund, setRequestRefund] = useState(false);

  // Calculate days until class starts
  const classStartDate = new Date(enrollment.schedule.startDate);
  const today = new Date();
  const daysUntilClass = Math.ceil((classStartDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

  // Determine refund eligibility based on policy
  const getRefundEligibility = () => {
    if (daysUntilClass > 21) {
      return {
        eligible: true,
        type: 'full_refund',
        message: 'You are eligible for a full refund since you are canceling more than 21 days before the class start date.',
        detail: 'Any Stripe processing fees will be covered by us.'
      };
    } else if (daysUntilClass >= 14 && daysUntilClass <= 21) {
      return {
        eligible: false,
        type: 'future_credit_full',
        message: 'You are not eligible for a refund since you are canceling within 14-21 days of the class start date.',
        detail: 'However, you may apply 100% of your payment toward a future course within 12 months of the original class date.'
      };
    } else if (daysUntilClass < 14 && daysUntilClass >= 0) {
      return {
        eligible: false,
        type: 'future_credit_partial',
        message: 'You are not eligible for a full refund since you are canceling within 14 days of the class start date.',
        detail: 'You will forfeit your deposit, but any payment made beyond the deposit may be applied toward a future course within 12 months.'
      };
    } else {
      return {
        eligible: false,
        type: 'past_date',
        message: 'You cannot unenroll from a class that has already started or passed.',
        detail: 'Please contact us directly if you have questions about this enrollment.'
      };
    }
  };

  const refundEligibility = getRefundEligibility();

  const unenrollMutation = useMutation({
    mutationFn: () => apiRequest("POST", `/api/student/enrollments/${enrollment.id}/unenroll`, {
      requestRefund: requestRefund && refundEligibility.eligible
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/student/enrollments"] });

      if (requestRefund && refundEligibility.eligible) {
        toast({
          title: "Refund Request Submitted",
          description: `Your refund request for ${enrollment.course.title} has been submitted. You will receive your refund within 5-10 business days.`,
        });
      } else {
        toast({
          title: "Unenrolled Successfully",
          description: `You have been unenrolled from ${enrollment.course.title}.`,
        });
      }
      onClose();
    },
    onError: (error: any) => {
      toast({
        title: "Unenrollment Failed",
        description: error.message || "Failed to unenroll. Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleConfirmUnenroll = () => {
    unenrollMutation.mutate();
  };

  // Don't allow unenrollment if class has already passed
  if (refundEligibility.type === 'past_date') {
    return (
      <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Cannot Unenroll</DialogTitle>
            <DialogDescription>
              {refundEligibility.message}
            </DialogDescription>
          </DialogHeader>
          <div className="p-4 bg-muted rounded-lg">
            <p className="text-sm text-muted-foreground">{refundEligibility.detail}</p>
          </div>
          <div className="flex justify-end pt-4">
            <Button onClick={onClose} data-testid="button-close-dialog">
              Close
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {refundEligibility.eligible ? 'Unenroll and Request Refund' : 'Confirm Unenrollment'}
          </DialogTitle>
          <DialogDescription>
            You are requesting to unenroll from "{enrollment.course.title}" scheduled for {classStartDate.toLocaleDateString()}.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Refund Policy Information */}
          <Card className={refundEligibility.eligible ? 'border-success' : 'border-amber-500'}>
            <CardHeader>
              <CardTitle className="text-base flex items-center">
                <AlertCircle className={`mr-2 h-5 w-5 ${refundEligibility.eligible ? 'text-success' : 'text-amber-500'}`} />
                Refund Policy
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="p-3 bg-muted rounded-lg">
                <p className="text-sm font-medium mb-2">{refundEligibility.message}</p>
                <p className="text-sm text-muted-foreground">{refundEligibility.detail}</p>
              </div>

              <div className="text-xs text-muted-foreground space-y-1">
                <p className="font-semibold">Days until class: {daysUntilClass}</p>
                <p>• More than 21 days: Full refund eligible</p>
                <p>• 14-21 days: 100% credit toward future course</p>
                <p>• Less than 14 days: Deposit forfeited, remaining balance credited</p>
              </div>

              {refundEligibility.eligible && (
                <div className="pt-3 border-t">
                  <div className="flex items-start space-x-2">
                    <Checkbox
                      id="request-refund"
                      checked={requestRefund}
                      onCheckedChange={(checked) => setRequestRefund(checked as boolean)}
                      data-testid="checkbox-request-refund"
                    />
                    <Label htmlFor="request-refund" className="text-sm font-normal cursor-pointer">
                      I would like to request a full refund (refund will be processed to your original payment method within 5-10 business days)
                    </Label>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Course Details */}
          <div className="p-4 bg-muted rounded-lg">
            <h4 className="font-semibold mb-2">{enrollment.course.title}</h4>
            <div className="text-sm text-muted-foreground space-y-1">
              <div className="flex items-center">
                <Calendar className="mr-2 h-4 w-4" />
                {classStartDate.toLocaleDateString('en-US', {
                  weekday: 'long',
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric'
                })}
              </div>
              {enrollment.schedule.location && (
                <div className="flex items-center">
                  <span className="mr-2">📍</span>
                  {enrollment.schedule.location}
                </div>
              )}
            </div>
          </div>

          {!refundEligibility.eligible && (
            <div className="p-3 bg-amber-50 dark:bg-amber-900/10 border border-amber-200 dark:border-amber-800 rounded-lg">
              <p className="text-sm text-amber-900 dark:text-amber-100">
                <strong>Need to reschedule?</strong> Consider using the "Request Transfer" option instead to transfer your enrollment to a future date.
              </p>
            </div>
          )}
        </div>

        <div className="flex justify-end space-x-3 pt-4 border-t">
          <Button 
            variant="outline" 
            onClick={onClose}
            disabled={unenrollMutation.isPending}
            data-testid="button-cancel-unenroll"
          >
            Nevermind
          </Button>
          <Button
            variant={refundEligibility.eligible ? "default" : "destructive"}
            onClick={handleConfirmUnenroll}
            disabled={unenrollMutation.isPending}
            data-testid="button-confirm-unenroll"
          >
            {unenrollMutation.isPending ? 'Processing...' : refundEligibility.eligible ? 'I Understand' : 'I Understand'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// Pending Forms Modal Component
function PendingFormsModal({
  isOpen,
  onClose,
  enrollments,
  onOpenWaiver,
  onOpenForms,
  onPendingCountChange,
}: {
  isOpen: boolean;
  onClose: () => void;
  enrollments: EnrollmentWithDetails[];
  onOpenWaiver: (enrollment: EnrollmentWithDetails) => void;
  onOpenForms: (enrollment: EnrollmentWithDetails) => void;
  onPendingCountChange: (count: number) => void;
}) {
  const [enrollmentCounts, setEnrollmentCounts] = useState<Record<string, number>>({});

  // Aggregate counts whenever they change
  useEffect(() => {
    const totalCount = Object.values(enrollmentCounts).reduce((sum, count) => sum + count, 0);
    onPendingCountChange(totalCount);
  }, [enrollmentCounts, onPendingCountChange]);

  const handleEnrollmentCountChange = (enrollmentId: string, count: number) => {
    setEnrollmentCounts(prev => ({
      ...prev,
      [enrollmentId]: count
    }));
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Pending Forms & Waivers</DialogTitle>
          <DialogDescription>
            Complete the required forms and waivers for your enrolled courses
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 overflow-y-auto pr-2">
          <div className="space-y-6">
            {enrollments.map((enrollment) => (
              <PendingFormsEnrollmentCard
                key={enrollment.id}
                enrollment={enrollment}
                onOpenWaiver={onOpenWaiver}
                onOpenForms={onOpenForms}
                onCountChange={(count) => handleEnrollmentCountChange(enrollment.id, count)}
              />
            ))}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// Individual enrollment card in the pending forms modal
function PendingFormsEnrollmentCard({
  enrollment,
  onOpenWaiver,
  onOpenForms,
  onCountChange,
}: {
  enrollment: EnrollmentWithDetails;
  onOpenWaiver: (enrollment: EnrollmentWithDetails) => void;
  onOpenForms: (enrollment: EnrollmentWithDetails) => void;
  onCountChange: (count: number) => void;
}) {
  // Query form status - use string template to match existing invalidation pattern
  const { data: formStatus } = useQuery<FormStatusResponse>({
    queryKey: [`/api/enrollments/${enrollment.id}/form-completion`],
    enabled: !!enrollment.id,
    retry: false,
  });

  // Query waiver status
  const { data: waiverStatus } = useQuery({
    queryKey: [`/api/enrollments/${enrollment.id}/waiver-instances`],
    enabled: !!enrollment.id,
    retry: false,
  });

  const hasIncompleteForms = formStatus && !formStatus.isComplete;
  const hasPendingWaivers = waiverStatus && Array.isArray(waiverStatus) && waiverStatus.some((w: any) => w.status === 'pending');
  
  // Count actual number of incomplete forms and pending waivers with defensive defaults
  // If forms are incomplete but missingForms array is not yet available, default to 1 to show something is pending
  const incompleteFormsCount = hasIncompleteForms ? (formStatus?.missingForms?.length ?? 1) : 0;
  const pendingWaiversCount = Array.isArray(waiverStatus) ? waiverStatus.filter((w: any) => w.status === 'pending').length : 0;

  // Calculate and update parent count when data changes
  useEffect(() => {
    const pendingCount = incompleteFormsCount + pendingWaiversCount;
    onCountChange(pendingCount);
  }, [formStatus, waiverStatus, incompleteFormsCount, pendingWaiversCount, onCountChange]);

  // Don't render if nothing is pending
  if (!hasIncompleteForms && !hasPendingWaivers) return null;

  const pendingCount = incompleteFormsCount + pendingWaiversCount;

  return (
    <Card className="border-2">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div>
            <CardTitle className="text-lg">{enrollment.course.title}</CardTitle>
            <p className="text-sm text-muted-foreground mt-1">
              {new Date(enrollment.schedule.startDate).toLocaleDateString()}
            </p>
          </div>
          <Badge variant="outline" className="bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800">
            {pendingCount} Pending
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid md:grid-cols-2 gap-4">
          {/* Course Waiver */}
          {hasPendingWaivers && (
            <div 
              className="border-2 rounded-lg p-4 transition-all border-destructive hover:border-destructive/80 bg-destructive/5 cursor-pointer hover:shadow-md"
              onClick={() => onOpenWaiver(enrollment)}
              data-testid={`waiver-item-${enrollment.id}`}
            >
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center space-x-2">
                  <div className="relative text-destructive">
                    <FileSignature className="h-6 w-6" />
                  </div>
                  <div>
                    <h4 className="font-semibold text-sm">Course Waiver</h4>
                  </div>
                </div>
              </div>
              <p className="text-xs text-muted-foreground">
                Click to sign required waiver
              </p>
            </div>
          )}
          
          {/* Course Questionnaire */}
          {hasIncompleteForms && (
            <div 
              className="border-2 rounded-lg p-4 transition-all border-destructive hover:border-destructive/80 bg-destructive/5 cursor-pointer hover:shadow-md"
              onClick={() => onOpenForms(enrollment)}
              data-testid={`form-item-${enrollment.id}`}
            >
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center space-x-2">
                  <div className="relative text-destructive">
                    <FileText className="h-6 w-6" />
                  </div>
                  <div>
                    <h4 className="font-semibold text-sm">Course Questionnaire</h4>
                  </div>
                </div>
              </div>
              <p className="text-xs text-muted-foreground">
                {formStatus && formStatus.missingForms 
                  ? `${formStatus.missingForms.length} form${formStatus.missingForms.length !== 1 ? 's' : ''} to complete`
                  : 'Click to complete questionnaire'}
              </p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

// Waiver Dialog Component
function WaiverDialog({ enrollment, onClose }: { enrollment: EnrollmentWithDetails; onClose: () => void }) {
  const { toast } = useToast();
  
  // Fetch waiver instances for this enrollment
  const { data: waiverInstances, isLoading: waiverLoading, error: waiverError } = useQuery<any[]>({
    queryKey: [`/api/enrollments/${enrollment.id}/waiver-instances`],
    enabled: !!enrollment.id,
    retry: false,
  });

  // Get the first pending waiver instance
  const pendingWaiver = waiverInstances?.find((w) => w.status === 'pending');

  // Fetch the waiver template content
  const { data: waiverTemplate, isLoading: templateLoading, error: templateError } = useQuery<any>({
    queryKey: [`/api/waiver-templates/${pendingWaiver?.templateId}`],
    enabled: !!pendingWaiver?.templateId,
    retry: false,
  });

  const handleComplete = () => {
    toast({
      title: 'Waiver Signed',
      description: 'Your waiver has been successfully submitted.',
    });
    queryClient.invalidateQueries({ queryKey: [`/api/enrollments/${enrollment.id}/waiver-instances`] });
    queryClient.invalidateQueries({ queryKey: ['/api/enrollments', enrollment.id, 'waiver-status'] });
    queryClient.invalidateQueries({ queryKey: ['/api/enrollments', enrollment.id, 'waiver-instances'] });
    queryClient.invalidateQueries({ queryKey: ['/api/student/enrollments'] });
    onClose();
  };

  // Merge field replacement
  const getMergedContent = (content: string) => {
    return content
      .replace(/\{\{courseName\}\}/g, enrollment.course.title)
      .replace(/\{\{courseDate\}\}/g, new Date(enrollment.schedule.startDate).toLocaleDateString())
      .replace(/\{\{studentName\}\}/g, `${enrollment.student?.firstName || ''} ${enrollment.student?.lastName || ''}`);
  };

  if (waiverLoading || templateLoading) {
    return (
      <Dialog open={true} onOpenChange={() => onClose()}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden">
          <DialogHeader>
            <DialogTitle>Complete Course Waiver</DialogTitle>
            <DialogDescription>
              Please review and sign the required waiver for {enrollment.course.title}
            </DialogDescription>
          </DialogHeader>
          <div className="flex items-center justify-center py-12">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
              <p className="text-muted-foreground">Loading waiver...</p>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  // Handle errors
  if (waiverError || templateError) {
    return (
      <Dialog open={true} onOpenChange={() => onClose()}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-hidden">
          <DialogHeader>
            <DialogTitle>Complete Course Waiver</DialogTitle>
            <DialogDescription>
              Waiver for {enrollment.course.title}
            </DialogDescription>
          </DialogHeader>
          <div className="text-center py-8">
            <AlertCircle className="h-12 w-12 text-destructive mx-auto mb-4" />
            <p className="text-muted-foreground mb-4">
              {templateError 
                ? "Unable to load waiver template. Please contact support." 
                : "Unable to load waiver information. Please try again."}
            </p>
            <Button onClick={onClose}>Close</Button>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  if (!pendingWaiver || !waiverTemplate) {
    return (
      <Dialog open={true} onOpenChange={() => onClose()}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-hidden">
          <DialogHeader>
            <DialogTitle>Complete Course Waiver</DialogTitle>
            <DialogDescription>
              Waiver for {enrollment.course.title}
            </DialogDescription>
          </DialogHeader>
          <div className="text-center py-8">
            <CheckCircle2 className="h-12 w-12 text-green-600 mx-auto mb-4" />
            <p className="text-muted-foreground">No pending waivers found for this course.</p>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  const mergedContent = getMergedContent(waiverTemplate.content);

  return (
    <Dialog open={true} onOpenChange={() => onClose()}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader className="flex-shrink-0">
          <DialogTitle>Complete Course Waiver</DialogTitle>
          <DialogDescription>
            Please review and sign the required waiver for {enrollment.course.title}
          </DialogDescription>
        </DialogHeader>
        <div className="flex-1 overflow-y-auto pr-2">
          <WaiverSigningInterface
            waiverContent={mergedContent}
            waiverTitle={waiverTemplate.name}
            enrollmentId={enrollment.id}
            instanceId={pendingWaiver.id}
            onComplete={handleComplete}
            onCancel={onClose}
          />
        </div>
      </DialogContent>
    </Dialog>
  );
}


export default function StudentPortal() {
  const { user, isLoading, isAuthenticated } = useAuth();
  const { toast } = useToast();
  const [isEditProfileOpen, setIsEditProfileOpen] = useState(false);
  const [isRemainingBalanceModalOpen, setIsRemainingBalanceModalOpen] = useState(false);
  const [selectedEnrollmentForForms, setSelectedEnrollmentForForms] = useState<EnrollmentWithDetails | null>(null);
  const [selectedEnrollmentForWaiver, setSelectedEnrollmentForWaiver] = useState<EnrollmentWithDetails | null>(null);
  const [selectedEnrollmentForTransfer, setSelectedEnrollmentForTransfer] = useState<EnrollmentWithDetails | null>(null);

  // State for the unenroll confirmation dialog
  const [showUnenrollDialog, setShowUnenrollDialog] = useState(false);
  const [selectedEnrollmentForUnenroll, setSelectedEnrollmentForUnenroll] = useState<EnrollmentWithDetails | null>(null);

  // State for the bookings modal
  const [showBookingsModal, setShowBookingsModal] = useState(false);

  // State for the feedback modal
  const [feedbackModal, setFeedbackModal] = useState<{ isOpen: boolean; enrollmentId: string }>({ 
    isOpen: false, 
    enrollmentId: "" 
  });

  // State for the pending forms modal
  const [isPendingFormsModalOpen, setIsPendingFormsModalOpen] = useState(false);

  const { data: enrollments = [], isLoading: enrollmentsLoading } = useQuery<EnrollmentWithDetails[]>({
    queryKey: ["/api/student/enrollments"],
    enabled: isAuthenticated,
    retry: false,
  });

  // Fetch student appointments
  const { data: appointments = [], isLoading: appointmentsLoading } = useQuery<any[]>({
    queryKey: ["/api/appointments/my-appointments"],
    enabled: isAuthenticated,
    retry: false,
  });

  // Add license expiration warning calculation
  const getLicenseWarning = () => {
    const typedUser = user as User;
    if (!typedUser?.concealedCarryLicenseExpiration) return null;

    const expirationDate = new Date(typedUser.concealedCarryLicenseExpiration);
    const today = new Date();
    const daysUntilExpiration = Math.ceil((expirationDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

    if (daysUntilExpiration <= 30) {
      return {
        level: 'critical',
        message: `License expires in ${daysUntilExpiration} days`,
        color: 'destructive'
      };
    } else if (daysUntilExpiration <= 90) {
      return {
        level: 'warning',
        message: `License expires in ${daysUntilExpiration} days`,
        color: 'warning'
      };
    }
    return null;
  };

  const licenseWarning = getLicenseWarning();

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      toast({
        title: "Unauthorized",
        description: "You need to be logged in to view this page. Redirecting...",
        variant: "destructive",
      });
      setTimeout(() => {
        window.location.href = "/login";
      }, 2000);
    }
  }, [isAuthenticated, isLoading, toast]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  if (!isAuthenticated || !user) {
    return null;
  }

  const confirmedEnrollments = enrollments.filter(e => e.status === 'confirmed');
  const completedEnrollments = enrollments.filter(e => e.status === 'completed');
  const upcomingClasses = confirmedEnrollments.filter(e => e.schedule?.startDate && new Date(e.schedule.startDate) > new Date());
  const completionRate = enrollments.length > 0
    ? Math.round((completedEnrollments.length / enrollments.length) * 100)
    : 0;

  // Calculate upcoming appointments (future appointments that are confirmed or pending)
  const upcomingAppointments = appointments.filter(apt => 
    new Date(apt.startTime) > new Date() && 
    (apt.status === 'confirmed' || apt.status === 'pending')
  );

  // Query to get payment balances for all enrollments
  const enrollmentIds = enrollments.map(e => e.id);
  const { data: paymentBalances = [] } = useQuery<Array<{ enrollmentId: string; hasRemainingBalance: boolean; remainingBalance: number }>>({
    queryKey: ['/api/student/payment-balances', enrollmentIds.join(',')],
    queryFn: async () => {
      if (enrollmentIds.length === 0) return [];
      const response = await fetch(`/api/student/payment-balances?enrollmentIds=${enrollmentIds.join(',')}`, {
        credentials: 'include'
      });
      if (!response.ok) throw new Error('Failed to fetch payment balances');
      return response.json();
    },
    enabled: enrollmentIds.length > 0,
    retry: false,
  });

  // Calculate total remaining balance
  const totalRemainingBalance = paymentBalances.reduce((sum, balance) => {
    return sum + (balance.hasRemainingBalance ? balance.remainingBalance : 0);
  }, 0);

  // Get enrollments with remaining balances
  const enrollmentsWithBalance = enrollments.filter(enrollment => {
    const balance = paymentBalances.find(b => b.enrollmentId === enrollment.id);
    return balance && balance.hasRemainingBalance;
  }).map(enrollment => {
    const balance = paymentBalances.find(b => b.enrollmentId === enrollment.id);
    return {
      ...enrollment,
      remainingBalance: balance?.remainingBalance || 0
    };
  });

  // We don't pre-fetch all form/waiver statuses to avoid N+1 queries
  // Instead, the count will be determined by individual cards in the course list
  // For the dashboard card, we show a simplified count
  const [pendingFormsCount, setPendingFormsCount] = useState(0);

  // Handler for initiating unenrollment
  const handleUnenrollClick = (enrollment: EnrollmentWithDetails) => {
    setSelectedEnrollmentForUnenroll(enrollment);
    setShowUnenrollDialog(true);
  };

  return (
    <Layout>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Portal Header */}
        <div className="bg-primary rounded-xl p-6 text-primary-foreground mb-8">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
            <div className="flex-1">
              <div className="flex items-center justify-between">
                <div>
                  <h1 className="text-2xl font-bold mb-1" data-testid="text-student-name">
                    Welcome, {(user as User)?.firstName} {(user as User)?.lastName}
                  </h1>
                  <p className="text-primary-foreground/80">Your training dashboard and course management</p>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  className="border-primary-foreground/20 text-slate-800 hover:bg-primary-foreground hover:text-primary ml-4"
                  onClick={() => setIsEditProfileOpen(true)}
                  data-testid="button-edit-profile"
                >
                  <Edit className="h-4 w-4 mr-2" />
                  Edit Profile
                </Button>
              </div>
            </div>
            <div className="flex items-center space-x-4 mt-4 sm:mt-0">
              {/* License Status */}
              {(user as User)?.concealedCarryLicenseExpiration && (
                <div className="flex items-center space-x-2">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                    licenseWarning?.level === 'critical' ? 'bg-destructive/10' :
                    licenseWarning?.level === 'warning' ? 'bg-yellow-500/10' :
                    'bg-success/10'
                  }`}>
                    <Shield className={`h-5 w-5 ${
                      licenseWarning?.level === 'critical' ? 'text-destructive' :
                      licenseWarning?.level === 'warning' ? 'text-yellow-500' :
                      'text-success'
                    }`} />
                  </div>
                  <div>
                    <div className="text-sm font-medium">CCW License</div>
                    <div className="text-xs text-primary-foreground/80">
                      {licenseWarning ? licenseWarning.message : 'Valid'}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Dashboard Stats */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-6 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Upcoming Appointments</CardTitle>
              <Calendar className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-primary" data-testid="text-upcoming-appointments">{upcomingAppointments.length}</div>
              <p className="text-sm text-muted-foreground">Scheduled bookings</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Upcoming Classes</CardTitle>
              <Calendar className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-accent" data-testid="text-upcoming-classes">{upcomingClasses.length}</div>
              <p className="text-sm text-muted-foreground">This month</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Completed</CardTitle>
              <Award className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-success" data-testid="text-completed-courses">{completedEnrollments.length}</div>
              <p className="text-sm text-muted-foreground">Certificates earned</p>
            </CardContent>
          </Card>

          <Card
            className="cursor-pointer hover:shadow-lg transition-shadow"
            onClick={() => setShowBookingsModal(true)}
            data-testid="card-bookings"
          >
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Remaining Balance</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className={`text-3xl font-bold mb-2 ${totalRemainingBalance > 0 ? 'text-amber-600' : 'text-success'}`} data-testid="text-remaining-balance">
                ${totalRemainingBalance.toFixed(2)}
              </div>
              <p className="text-sm text-muted-foreground">
                {totalRemainingBalance > 0 ? `${enrollmentsWithBalance.length} course${enrollmentsWithBalance.length !== 1 ? 's' : ''} pending` : 'All paid'}
              </p>
            </CardContent>
          </Card>

          <Card
            className="cursor-pointer hover:shadow-lg transition-shadow"
            onClick={() => setIsPendingFormsModalOpen(true)}
            data-testid="card-pending-forms"
          >
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Pending Forms</CardTitle>
              <FileText className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className={`text-3xl font-bold mb-2 ${pendingFormsCount > 0 ? 'text-amber-600' : 'text-success'}`} data-testid="text-pending-forms">
                {pendingFormsCount}
              </div>
              <p className="text-sm text-muted-foreground">
                {pendingFormsCount > 0 ? 'Forms to complete' : 'All complete'}
              </p>
            </CardContent>
          </Card>
        </div>

        {/* License Management Section */}
        {(user as User)?.concealedCarryLicenseExpiration && (
          <Card className="mb-8">
            <CardHeader>
              <CardTitle className="flex items-center">
                <Shield className="mr-2 h-5 w-5" />
                License Management
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div>
                    <h4 className="font-medium mb-2">Concealed Carry License Status</h4>
                    <div className="flex items-center space-x-2">
                      <div className={`w-3 h-3 rounded-full ${
                        licenseWarning?.level === 'critical' ? 'bg-destructive' :
                        licenseWarning?.level === 'warning' ? 'bg-yellow-500' :
                        'bg-success'
                      }`}></div>
                      <span className={`text-sm font-medium ${
                        licenseWarning?.level === 'critical' ? 'text-destructive' :
                        licenseWarning?.level === 'warning' ? 'text-yellow-500' :
                        'text-success'
                      }`}>
                        {licenseWarning ? licenseWarning.message : 'License Valid'}
                      </span>
                    </div>
                  </div>

                  <div className="space-y-2">
                    {(user as User).concealedCarryLicenseIssued && (
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Issued:</span>
                        <span>{new Date((user as User).concealedCarryLicenseIssued!).toLocaleDateString()}</span>
                      </div>
                    )}
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Expires:</span>
                      <span>{new Date((user as User).concealedCarryLicenseExpiration!).toLocaleDateString()}</span>
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <div>
                    <h4 className="font-medium mb-2">Renewal Reminders</h4>
                    <div className="space-y-2">
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">License Expiration:</span>
                        <div className="flex items-center space-x-2">
                          <span>{(user as User).enableLicenseExpirationReminder ? 'Enabled' : 'Disabled'}</span>
                          <Bell className={`h-4 w-4 ${(user as User).enableLicenseExpirationReminder ? 'text-primary' : 'text-muted-foreground'}`} />
                        </div>
                      </div>
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">Refresher Course:</span>
                        <div className="flex items-center space-x-2">
                          <span>{(user as User).enableRefresherReminder ? 'Enabled' : 'Disabled'}</span>
                          <Bell className={`h-4 w-4 ${(user as User).enableRefresherReminder ? 'text-primary' : 'text-muted-foreground'}`} />
                        </div>
                      </div>
                    </div>
                  </div>

                  {licenseWarning && (
                    <div className={`p-3 rounded-lg border ${
                      licenseWarning.level === 'critical' ? 'bg-destructive/5 border-destructive/20' :
                      'bg-yellow-50 border-yellow-200 dark:bg-yellow-900/10'
                    }`}>
                      <div className="flex items-start space-x-2">
                        <AlertTriangle className={`h-4 w-4 mt-0.5 ${
                          licenseWarning.level === 'critical' ? 'text-destructive' : 'text-yellow-500'
                        }`} />
                        <div className="text-sm">
                          <p className="font-medium">Action Required</p>
                          <p className="text-muted-foreground">
                            {licenseWarning.level === 'critical'
                              ? 'Your license is expiring soon. Please renew immediately.'
                              : 'Consider scheduling a renewal soon to avoid any issues.'
                            }
                          </p>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Live-Fire Range Sessions Section - Only for Online CCW students */}
        {enrollments.some(e =>
          e.course.title &&
          e.course.title.toLowerCase().includes('online') &&
          (e.course.title.toLowerCase().includes('concealed carry') || e.course.title.toLowerCase().includes('ccw'))
        ) && (
          <LiveFireRangeSessionsSection />
        )}

        <div className="grid lg:grid-cols-2 gap-8">
          {/* Upcoming Classes */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Calendar className="mr-2 h-5 w-5" />
                Upcoming Classes
              </CardTitle>
            </CardHeader>
            <CardContent>
              {enrollmentsLoading ? (
                <div className="space-y-4">
                  {[1, 2].map(i => (
                    <div key={i} className="animate-pulse p-4 bg-muted rounded-lg">
                      <div className="h-4 bg-muted-foreground/20 rounded w-2/3 mb-2" />
                      <div className="h-3 bg-muted-foreground/20 rounded w-1/2" />
                    </div>
                  ))}
                </div>
              ) : upcomingClasses.length > 0 ? (
                <div className="space-y-4">
                  {upcomingClasses.map(enrollment => (
                    <EnhancedEnrollmentCard
                      key={enrollment.id}
                      enrollment={enrollment}
                      onCompleteFormsClick={setSelectedEnrollmentForForms}
                      onCompleteWaiverClick={setSelectedEnrollmentForWaiver}
                      onRequestTransferClick={setSelectedEnrollmentForTransfer}
                      onUnenrollClick={handleUnenrollClick}
                    />
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <Calendar className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
                  <h3 className="text-lg font-medium text-muted-foreground mb-2">No upcoming classes</h3>
                  <p className="text-sm text-muted-foreground">Browse available courses to enroll in new classes</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Course History */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <BookOpen className="mr-2 h-5 w-5" />
                Course History
              </CardTitle>
            </CardHeader>
            <CardContent>
              {enrollmentsLoading ? (
                <div className="space-y-4">
                  {[1, 2].map(i => (
                    <div key={i} className="animate-pulse p-4 bg-muted rounded-lg">
                      <div className="h-4 bg-muted-foreground/20 rounded w-2/3 mb-2" />
                      <div className="h-3 bg-muted-foreground/20 rounded w-1/2" />
                    </div>
                  ))}
                </div>
              ) : enrollments.length > 0 ? (
                <div className="space-y-4">
                  {enrollments.slice(0, 5).map(enrollment => (
                    <div 
                      key={enrollment.id} 
                      className="p-4 bg-muted rounded-lg hover:bg-muted/80 cursor-pointer transition-colors"
                      onClick={() => setFeedbackModal({ isOpen: true, enrollmentId: enrollment.id })}
                      data-testid={`enrollment-history-${enrollment.id}`}
                    >
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <h4 className="font-semibold text-card-foreground" data-testid={`text-history-course-${enrollment.id}`}>
                            {enrollment.course.title}
                          </h4>
                          <FileText className="h-4 w-4 text-muted-foreground" />
                        </div>
                        <Badge className={getEnrollmentStatusClassName(enrollment.status)}>
                          {enrollment.status}
                        </Badge>
                      </div>
                      <div className="text-sm text-muted-foreground">
                        <div>Completed: {enrollment.schedule?.endDate ? new Date(enrollment.schedule.endDate).toLocaleDateString() : 'TBD'}</div>
                        <div>Instructor: Course instructor</div>
                      </div>
                      <div className="text-xs text-blue-600 mt-2">
                        Click to view instructor feedback & add your notes
                      </div>
                      {enrollment.status === 'completed' && (
                        <Button 
                          variant="outline" 
                          size="sm" 
                          className="mt-3" 
                          onClick={(e) => e.stopPropagation()}
                          data-testid={`button-download-certificate-${enrollment.id}`}
                        >
                          <Award className="mr-2 h-4 w-4" />
                          Download Certificate
                        </Button>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <BookOpen className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
                  <h3 className="text-lg font-medium text-muted-foreground mb-2">No course history</h3>
                  <p className="text-sm text-muted-foreground">Your completed courses will appear here</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* My Appointments */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Calendar className="mr-2 h-5 w-5" />
                My Appointments
              </CardTitle>
            </CardHeader>
            <CardContent>
              {appointmentsLoading ? (
                <div className="space-y-4">
                  {[1, 2].map(i => (
                    <div key={i} className="animate-pulse p-4 bg-muted rounded-lg">
                      <div className="h-4 bg-muted-foreground/20 rounded w-2/3 mb-2" />
                      <div className="h-3 bg-muted-foreground/20 rounded w-1/2" />
                    </div>
                  ))}
                </div>
              ) : appointments.length > 0 ? (
                <div className="space-y-4">
                  {appointments.map(appointment => (
                    <div 
                      key={appointment.id} 
                      className="p-4 bg-muted rounded-lg"
                      data-testid={`appointment-${appointment.id}`}
                    >
                      <div className="flex items-start justify-between mb-2">
                        <div>
                          <h4 className="font-semibold text-card-foreground" data-testid={`text-appointment-type-${appointment.id}`}>
                            {appointment.appointmentType.title}
                          </h4>
                          {appointment.appointmentType.description && (
                            <p className="text-sm text-muted-foreground mt-1">{appointment.appointmentType.description}</p>
                          )}
                        </div>
                        <Badge className={
                          appointment.status === 'confirmed' ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' :
                          appointment.status === 'pending' ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200' :
                          appointment.status === 'cancelled' ? 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200' :
                          'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200'
                        }>
                          {appointment.status}
                        </Badge>
                      </div>
                      <div className="text-sm text-muted-foreground space-y-1">
                        <div className="flex items-center gap-2">
                          <Calendar className="h-4 w-4" />
                          {new Date(appointment.startTime).toLocaleDateString('en-US', { 
                            weekday: 'short', 
                            month: 'short', 
                            day: 'numeric', 
                            year: 'numeric' 
                          })}
                        </div>
                        <div className="flex items-center gap-2">
                          <Clock className="h-4 w-4" />
                          {new Date(appointment.startTime).toLocaleTimeString('en-US', { 
                            hour: 'numeric', 
                            minute: '2-digit', 
                            hour12: true 
                          })} - {new Date(appointment.endTime).toLocaleTimeString('en-US', { 
                            hour: 'numeric', 
                            minute: '2-digit', 
                            hour12: true 
                          })}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <Calendar className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
                  <h3 className="text-lg font-medium text-muted-foreground mb-2">No appointments</h3>
                  <p className="text-sm text-muted-foreground">Your booked appointments will appear here</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Remaining Balance Modal */}
      <Dialog open={isRemainingBalanceModalOpen} onOpenChange={setIsRemainingBalanceModalOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Outstanding Payment Balances</DialogTitle>
            <DialogDescription>
              You have outstanding balances for the following courses. Please complete payment to maintain your enrollment.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 overflow-y-auto pr-2">
            <div className="bg-amber-50 dark:bg-amber-900/10 border border-amber-200 dark:border-amber-800 rounded-lg p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <AlertCircle className="h-5 w-5 text-amber-600" />
                  <span className="font-medium text-amber-900 dark:text-amber-100">Total Remaining Balance</span>
                </div>
                <span className="text-2xl font-bold text-amber-600" data-testid="text-modal-total-balance">
                  ${totalRemainingBalance.toFixed(2)}
                </span>
              </div>
            </div>

            <div className="space-y-3">
              <h3 className="font-semibold text-sm text-muted-foreground">Courses with Outstanding Balances</h3>
              {enrollmentsWithBalance.map((enrollment) => (
                <div
                  key={enrollment.id}
                  className="border rounded-lg p-4 hover:bg-muted/50 transition-colors"
                  data-testid={`balance-item-${enrollment.id}`}
                >
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <h4 className="font-semibold text-card-foreground">{enrollment.course.title}</h4>
                      <div className="text-sm text-muted-foreground mt-1">
                        <div className="flex items-center">
                          <Calendar className="mr-1 h-3 w-3" />
                          {new Date(enrollment.schedule.startDate).toLocaleDateString()}
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <button
                        onClick={() => {
                          window.location.href = `/checkout?enrollmentId=${enrollment.id}`;
                        }}
                        className="text-2xl font-bold text-amber-600 hover:text-amber-700 transition-colors cursor-pointer"
                        data-testid={`button-balance-amount-${enrollment.id}`}
                      >
                        ${enrollment.remainingBalance.toFixed(2)}
                      </button>
                      <div className="text-xs text-muted-foreground">remaining</div>
                    </div>
                  </div>
                  <Button
                    onClick={() => {
                      window.location.href = `/checkout?enrollmentId=${enrollment.id}`;
                    }}
                    className="w-full"
                    data-testid={`button-pay-balance-${enrollment.id}`}
                  >
                    <CreditCard className="mr-2 h-4 w-4" />
                    Pay Remaining Balance
                  </Button>
                </div>
              ))}
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Pending Forms Modal */}
      <PendingFormsModal
        isOpen={isPendingFormsModalOpen}
        onClose={() => setIsPendingFormsModalOpen(false)}
        enrollments={enrollments}
        onOpenWaiver={(enrollment) => {
          setSelectedEnrollmentForWaiver(enrollment);
          setIsPendingFormsModalOpen(false);
        }}
        onOpenForms={(enrollment) => {
          setSelectedEnrollmentForForms(enrollment);
          setIsPendingFormsModalOpen(false);
        }}
        onPendingCountChange={setPendingFormsCount}
      />

      {/* Edit Profile Dialog */}
      {user && (
        <EditProfileDialog
          isOpen={isEditProfileOpen}
          onClose={() => setIsEditProfileOpen(false)}
          user={user as User}
        />
      )}

      {/* Form Completion Dialog */}
      {selectedEnrollmentForForms && (
        <FormCompletionInterface
          enrollment={selectedEnrollmentForForms}
          onClose={() => setSelectedEnrollmentForForms(null)}
        />
      )}

      {/* Waiver Completion Dialog */}
      {selectedEnrollmentForWaiver && (
        <WaiverDialog enrollment={selectedEnrollmentForWaiver} onClose={() => setSelectedEnrollmentForWaiver(null)} />
      )}

      {/* Transfer Request Dialog */}
      {selectedEnrollmentForTransfer && (
        <StudentTransferRequestModal
          enrollment={selectedEnrollmentForTransfer}
          isOpen={!!selectedEnrollmentForTransfer}
          onClose={() => setSelectedEnrollmentForTransfer(null)}
        />
      )}

      {/* Unenroll Confirmation Dialog */}
      {selectedEnrollmentForUnenroll && (
        <UnenrollConfirmationDialog
          isOpen={showUnenrollDialog}
          onClose={() => {
            setShowUnenrollDialog(false);
            setSelectedEnrollmentForUnenroll(null);
          }}
          enrollment={selectedEnrollmentForUnenroll}
        />
      )}

      {/* Enrollment Feedback Modal */}
      <EnrollmentFeedbackModal
        isOpen={feedbackModal.isOpen}
        onClose={() => setFeedbackModal({ ...feedbackModal, isOpen: false })}
        enrollmentId={feedbackModal.enrollmentId}
        userRole="student"
        isInstructor={false}
      />
    </Layout>
  );
}