import React, { useEffect, useState } from "react";
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
import { Form, FormControl, FormField, FormItem, FormLabel, FormDescription } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { AlertCircle, CreditCard, CheckCircle2, AlertTriangle, Shield, Bell, Edit, Save, X, DollarSign, FileSignature } from "lucide-react";
import { Calendar, Clock, FileText, Download, BookOpen, Award } from "lucide-react";
import type { EnrollmentWithDetails, User } from "@shared/schema";

// Types for the query responses
type PaymentBalanceResponse = {
  hasRemainingBalance: boolean;
  remainingBalance: number;
};

type FormStatusResponse = {
  isComplete: boolean;
  missingForms: number;
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
  preferredContactMethods: z.array(z.string()).optional(),
  enableSmsNotifications: z.boolean().optional(),
  enableSmsReminders: z.boolean().optional(),
  enableSmsPaymentNotices: z.boolean().optional(),
  enableSmsAnnouncements: z.boolean().optional(),
});

type EditProfileForm = z.infer<typeof editProfileSchema>;

// Form completion interface component
function FormCompletionInterface({ enrollment }: { enrollment: EnrollmentWithDetails }) {
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

  // Autopopulate fields on mount
  useEffect(() => {
    if (courseForms && courseForms.length > 0 && typedUser) {
      // Create field mapping inline to avoid hook ordering issues
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
  }, [courseForms, typedUser]);

  if (isLoading) {
    return (
      <div className="text-center py-8">
        <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full mx-auto mb-4" />
        <p className="text-muted-foreground">Loading forms...</p>
      </div>
    );
  }

  if (!courseForms || courseForms.length === 0) {
    return (
      <div className="space-y-4">
        <div className="p-4 bg-muted rounded-lg">
          <h4 className="font-semibold mb-2">{enrollment.course.title}</h4>
          <p className="text-sm text-muted-foreground">
            {new Date(enrollment.schedule.startDate).toLocaleDateString()}
          </p>
        </div>
        <div className="text-center py-8">
          <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <p className="text-muted-foreground">
            No forms are currently required for this course.
          </p>
        </div>
      </div>
    );
  }

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

  const submitFormMutation = useMutation({
    mutationFn: async (data: { enrollmentId: string; formResponses: Record<string, any> }) => {
      return await apiRequest('POST', '/api/enrollment-form-submissions', data);
    },
    onSuccess: () => {
      toast({
        title: "Forms Submitted",
        description: "Your course information forms have been submitted successfully.",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/enrollments', enrollment.id, 'form-completion'] });
    },
    onError: (error: any) => {
      toast({
        title: "Submission Failed",
        description: error.message || "Failed to submit forms. Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleSubmit = () => {
    // Validate required fields
    const allForms = courseForms || [];
    let hasErrors = false;
    
    for (const form of allForms) {
      for (const field of form.fields || []) {
        if (field.isRequired && !formData[field.id]) {
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
      submitFormMutation.mutate({
        enrollmentId: enrollment.id,
        formResponses: formData
      });
    }
  };

  return (
    <div className="space-y-6">
      <div className="p-4 bg-muted rounded-lg">
        <h4 className="font-semibold mb-2">{enrollment.course.title}</h4>
        <p className="text-sm text-muted-foreground">
          {new Date(enrollment.schedule.startDate).toLocaleDateString()}
        </p>
      </div>

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
          {submitFormMutation.isPending ? 'Submitting...' : 'Submit All Forms'}
        </Button>
      </div>
    </div>
  );
}

// Enhanced enrollment card component with payment and form status
function EnhancedEnrollmentCard({ 
  enrollment, 
  onCompleteFormsClick,
  onCompleteWaiverClick 
}: { 
  enrollment: EnrollmentWithDetails;
  onCompleteFormsClick: (enrollment: EnrollmentWithDetails) => void;
  onCompleteWaiverClick: (enrollment: EnrollmentWithDetails) => void;
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
        <Badge variant="outline">
          {enrollment.status === 'confirmed' ? 'Confirmed' : enrollment.status}
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
                {formStatus?.missingForms || 0} pending
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
      <div className="flex flex-wrap gap-2">
        {paymentBalance?.hasRemainingBalance && (
          <Button variant="outline" size="sm" data-testid={`button-make-payment-${enrollment.id}`}>
            <CreditCard className="mr-2 h-4 w-4" />
            Make Payment
          </Button>
        )}
        
        {!formStatus?.isComplete && (
          <Button 
            variant="outline" 
            size="sm" 
            onClick={() => onCompleteFormsClick(enrollment)}
            data-testid={`button-complete-forms-${enrollment.id}`}
          >
            <FileText className="mr-2 h-4 w-4" />
            Complete Forms
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
      preferredContactMethods: user.preferredContactMethods || [],
      enableSmsNotifications: user.enableSmsNotifications ?? true,
      enableSmsReminders: user.enableSmsReminders ?? true,
      enableSmsPaymentNotices: user.enableSmsPaymentNotices ?? false,
      enableSmsAnnouncements: user.enableSmsAnnouncements ?? false,
    },
  });

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
                      <Input {...field} data-testid="input-phone" />
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
                          disabled={!form.watch("enableSmsNotifications")}
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
                          disabled={!form.watch("enableSmsNotifications")}
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
                          disabled={!form.watch("enableSmsNotifications")}
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

export default function StudentPortal() {
  const { user, isLoading, isAuthenticated } = useAuth();
  const { toast } = useToast();
  const [isEditProfileOpen, setIsEditProfileOpen] = useState(false);
  const [isRemainingBalanceModalOpen, setIsRemainingBalanceModalOpen] = useState(false);
  const [selectedEnrollmentForForms, setSelectedEnrollmentForForms] = useState<EnrollmentWithDetails | null>(null);
  const [selectedEnrollmentForWaiver, setSelectedEnrollmentForWaiver] = useState<EnrollmentWithDetails | null>(null);

  const { data: enrollments = [], isLoading: enrollmentsLoading } = useQuery<EnrollmentWithDetails[]>({
    queryKey: ["/api/student/enrollments"],
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
        window.location.href = "/api/login";
      }, 2000);
      return;
    }
  }, [isAuthenticated, isLoading, toast]);

  if (isLoading || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  const confirmedEnrollments = enrollments.filter(e => e.status === 'confirmed');
  const completedEnrollments = enrollments.filter(e => e.status === 'completed');
  const upcomingClasses = confirmedEnrollments.filter(e => e.schedule?.startDate && new Date(e.schedule.startDate) > new Date());
  const completionRate = enrollments.length > 0 
    ? Math.round((completedEnrollments.length / enrollments.length) * 100)
    : 0;

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
              {/* Profile Status */}
              <div className="flex items-center space-x-2">
                <div className="bg-success/10 w-10 h-10 rounded-full flex items-center justify-center">
                  <FileText className="h-5 w-5 text-success" />
                </div>
                <div>
                  <div className="text-sm font-medium">Profile Complete</div>
                  <div className="text-xs text-primary-foreground/80">All waivers submitted</div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Dashboard Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Courses</CardTitle>
              <BookOpen className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-primary" data-testid="text-total-courses">{enrollments.length}</div>
              <p className="text-sm text-muted-foreground">Enrolled courses</p>
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
            onClick={() => totalRemainingBalance > 0 && setIsRemainingBalanceModalOpen(true)}
            data-testid="card-remaining-balance"
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
                        licenseWarning?.level === 'warning' ? 'text-yellow-600' :
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
                    <div key={enrollment.id} className="p-4 bg-muted rounded-lg">
                      <div className="flex items-start justify-between mb-2">
                        <h4 className="font-semibold text-card-foreground" data-testid={`text-history-course-${enrollment.id}`}>
                          {enrollment.course.title}
                        </h4>
                        <Badge 
                          variant={
                            enrollment.status === 'completed' ? 'default' :
                            enrollment.status === 'confirmed' ? 'secondary' : 
                            'outline'
                          }
                        >
                          {enrollment.status}
                        </Badge>
                      </div>
                      <div className="text-sm text-muted-foreground">
                        <div>Completed: {enrollment.schedule?.endDate ? new Date(enrollment.schedule.endDate).toLocaleDateString() : 'TBD'}</div>
                        <div>Instructor: Course instructor</div>
                      </div>
                      {enrollment.status === 'completed' && (
                        <Button variant="outline" size="sm" className="mt-3" data-testid={`button-download-certificate-${enrollment.id}`}>
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
        </div>
      </div>

      {/* Remaining Balance Modal */}
      <Dialog open={isRemainingBalanceModalOpen} onOpenChange={setIsRemainingBalanceModalOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh] flex flex-col">
          <DialogHeader>
            <DialogTitle>Outstanding Balance</DialogTitle>
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

      {/* Edit Profile Dialog */}
      {user && (
        <EditProfileDialog 
          isOpen={isEditProfileOpen} 
          onClose={() => setIsEditProfileOpen(false)} 
          user={user as User} 
        />
      )}

      {/* Form Completion Dialog */}
      <Dialog open={!!selectedEnrollmentForForms} onOpenChange={(open) => !open && setSelectedEnrollmentForForms(null)}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Complete Course Information Forms</DialogTitle>
            <DialogDescription>
              Please complete the required information forms for {selectedEnrollmentForForms?.course.title}
            </DialogDescription>
          </DialogHeader>
          {selectedEnrollmentForForms && (
            <FormCompletionInterface enrollment={selectedEnrollmentForForms} />
          )}
        </DialogContent>
      </Dialog>

      {/* Waiver Completion Dialog */}
      <Dialog open={!!selectedEnrollmentForWaiver} onOpenChange={(open) => !open && setSelectedEnrollmentForWaiver(null)}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Complete Course Waiver</DialogTitle>
            <DialogDescription>
              Please review and sign the required waiver for {selectedEnrollmentForWaiver?.course.title}
            </DialogDescription>
          </DialogHeader>
          {selectedEnrollmentForWaiver && (
            <div className="space-y-4">
              <div className="p-4 bg-muted rounded-lg">
                <h4 className="font-semibold mb-2">{selectedEnrollmentForWaiver.course.title}</h4>
                <p className="text-sm text-muted-foreground">
                  {new Date(selectedEnrollmentForWaiver.schedule.startDate).toLocaleDateString()}
                </p>
              </div>
              <div className="text-center py-8">
                <FileSignature className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">
                  Waiver signing interface coming soon. You will be able to review and electronically sign required waivers here.
                </p>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </Layout>
  );
}
