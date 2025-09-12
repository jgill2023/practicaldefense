import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { Layout } from "@/components/Layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { 
  Plus, 
  Edit, 
  Trash2, 
  Eye, 
  GripVertical, 
  FileText, 
  Users, 
  Settings, 
  ChevronDown,
  ChevronRight
} from "lucide-react";
import type { 
  CourseInformationFormWithFields, 
  CourseInformationFormField, 
  FormFieldType,
  CourseWithSchedules
} from "@shared/schema";

export default function CourseFormsManagement() {
  const { user } = useAuth();
  const { toast } = useToast();
  
  const [selectedCourse, setSelectedCourse] = useState<string>("");
  const [showCreateFormDialog, setShowCreateFormDialog] = useState(false);
  const [editingForm, setEditingForm] = useState<CourseInformationFormWithFields | null>(null);
  const [showFieldEditor, setShowFieldEditor] = useState(false);
  const [editingField, setEditingField] = useState<CourseInformationFormField | null>(null);
  const [expandedForms, setExpandedForms] = useState<Set<string>>(new Set());

  // Fetch instructor's courses
  const { data: courses = [] } = useQuery<CourseWithSchedules[]>({
    queryKey: ["/api/instructor/courses"],
  });

  // Fetch forms for selected course
  const { data: forms = [], isLoading } = useQuery<CourseInformationFormWithFields[]>({
    queryKey: ["/api/course-forms", selectedCourse],
    queryFn: async () => {
      if (!selectedCourse) return [];
      const response = await apiRequest("GET", `/api/course-forms/${selectedCourse}`);
      return response.json();
    },
    enabled: !!selectedCourse,
  });

  // Form creation/update
  const formMutation = useMutation({
    mutationFn: async (data: { courseId: string; title: string; description?: string; isRequired: boolean }) => {
      const url = editingForm ? `/api/course-forms/${editingForm.id}` : "/api/course-forms";
      const method = editingForm ? "PATCH" : "POST";
      const response = await apiRequest(method, url, data);
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: editingForm ? "Form Updated" : "Form Created",
        description: `Information form has been ${editingForm ? "updated" : "created"} successfully.`,
      });
      queryClient.invalidateQueries({ queryKey: ["/api/course-forms"] });
      setShowCreateFormDialog(false);
      setEditingForm(null);
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Form field creation/update
  const fieldMutation = useMutation({
    mutationFn: async (data: {
      formId: string;
      fieldType: FormFieldType;
      label: string;
      placeholder?: string;
      isRequired: boolean;
      options?: any;
    }) => {
      const url = editingField ? `/api/course-form-fields/${editingField.id}` : "/api/course-form-fields";
      const method = editingField ? "PATCH" : "POST";
      const response = await apiRequest(method, url, data);
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: editingField ? "Field Updated" : "Field Added",
        description: `Form field has been ${editingField ? "updated" : "added"} successfully.`,
      });
      queryClient.invalidateQueries({ queryKey: ["/api/course-forms"] });
      setShowFieldEditor(false);
      setEditingField(null);
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Delete form
  const deleteFormMutation = useMutation({
    mutationFn: async (formId: string) => {
      await apiRequest("DELETE", `/api/course-forms/${formId}`);
    },
    onSuccess: () => {
      toast({
        title: "Form Deleted",
        description: "Information form has been deleted successfully.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/course-forms"] });
    },
  });

  // Delete field
  const deleteFieldMutation = useMutation({
    mutationFn: async (fieldId: string) => {
      await apiRequest("DELETE", `/api/course-form-fields/${fieldId}`);
    },
    onSuccess: () => {
      toast({
        title: "Field Deleted",
        description: "Form field has been deleted successfully.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/course-forms"] });
    },
  });

  const toggleFormExpansion = (formId: string) => {
    const newExpanded = new Set(expandedForms);
    if (newExpanded.has(formId)) {
      newExpanded.delete(formId);
    } else {
      newExpanded.add(formId);
    }
    setExpandedForms(newExpanded);
  };

  const handleCreateForm = (data: { title: string; description?: string; isRequired: boolean }) => {
    if (!selectedCourse) return;
    formMutation.mutate({
      courseId: selectedCourse,
      ...data
    });
  };

  const handleCreateField = (data: {
    fieldType: FormFieldType;
    label: string;
    placeholder?: string;
    isRequired: boolean;
    options?: any;
  }, formId: string) => {
    fieldMutation.mutate({
      formId,
      ...data
    });
  };

  const fieldTypes: Array<{ value: FormFieldType; label: string }> = [
    { value: 'text', label: 'Text' },
    { value: 'email', label: 'Email' },
    { value: 'phone', label: 'Phone' },
    { value: 'textarea', label: 'Long Text' },
    { value: 'select', label: 'Dropdown' },
    { value: 'checkbox', label: 'Checkbox' },
    { value: 'date', label: 'Date' },
    { value: 'number', label: 'Number' },
  ];

  return (
    <Layout>
      <div className="max-w-6xl mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-foreground mb-4">Course Information Forms</h1>
          <p className="text-muted-foreground">
            Manage post-registration forms that students complete after enrolling in courses.
          </p>
        </div>

        <Tabs defaultValue="manage" className="w-full">
          <TabsList className="mb-6">
            <TabsTrigger value="manage" className="flex items-center gap-2">
              <Settings className="h-4 w-4" />
              Manage Forms
            </TabsTrigger>
            <TabsTrigger value="responses" className="flex items-center gap-2">
              <Users className="h-4 w-4" />
              View Responses
            </TabsTrigger>
          </TabsList>

          <TabsContent value="manage">
            {/* Course Selection */}
            <Card className="mb-6">
              <CardHeader>
                <CardTitle>Select Course</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-4">
                  <div className="flex-1">
                    <Select value={selectedCourse} onValueChange={setSelectedCourse}>
                      <SelectTrigger data-testid="select-course">
                        <SelectValue placeholder="Choose a course to manage forms" />
                      </SelectTrigger>
                      <SelectContent>
                        {courses.map((course) => (
                          <SelectItem key={course.id} value={course.id}>
                            {course.title}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  
                  {selectedCourse && (
                    <Dialog open={showCreateFormDialog} onOpenChange={setShowCreateFormDialog}>
                      <DialogTrigger asChild>
                        <Button data-testid="button-create-form">
                          <Plus className="h-4 w-4 mr-2" />
                          Create Form
                        </Button>
                      </DialogTrigger>
                      <DialogContent>
                        <DialogHeader>
                          <DialogTitle>Create Information Form</DialogTitle>
                          <DialogDescription>
                            Create a form that students will complete after registering for the course.
                          </DialogDescription>
                        </DialogHeader>
                        <CreateFormDialog 
                          onSubmit={handleCreateForm}
                          onCancel={() => setShowCreateFormDialog(false)}
                        />
                      </DialogContent>
                    </Dialog>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Forms List */}
            {selectedCourse && (
              <div className="space-y-4">
                {isLoading ? (
                  <Card>
                    <CardContent className="py-8">
                      <div className="text-center">
                        <div className="animate-spin w-6 h-6 border-2 border-primary border-t-transparent rounded-full mx-auto mb-2" />
                        <p className="text-muted-foreground">Loading forms...</p>
                      </div>
                    </CardContent>
                  </Card>
                ) : forms.length === 0 ? (
                  <Card>
                    <CardContent className="py-12">
                      <div className="text-center">
                        <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                        <h3 className="text-lg font-medium text-foreground mb-2">No Forms Yet</h3>
                        <p className="text-muted-foreground mb-6">
                          Create your first information form to collect data from students after registration.
                        </p>
                      </div>
                    </CardContent>
                  </Card>
                ) : (
                  forms.map((form) => (
                    <Card key={form.id} className="border border-border">
                      <CardHeader className="pb-4">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => toggleFormExpansion(form.id)}
                              className="p-1 h-6 w-6"
                            >
                              {expandedForms.has(form.id) ? 
                                <ChevronDown className="h-4 w-4" /> : 
                                <ChevronRight className="h-4 w-4" />
                              }
                            </Button>
                            <div>
                              <h3 className="font-semibold" data-testid={`text-form-title-${form.id}`}>
                                {form.title}
                              </h3>
                              {form.description && (
                                <p className="text-sm text-muted-foreground">{form.description}</p>
                              )}
                            </div>
                          </div>
                          
                          <div className="flex items-center gap-2">
                            {form.isRequired && (
                              <Badge variant="secondary">Required</Badge>
                            )}
                            <Badge variant="outline">
                              {form.fields.length} field{form.fields.length !== 1 ? 's' : ''}
                            </Badge>
                            
                            <div className="flex items-center gap-1">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => {
                                  setEditingForm(form);
                                  setShowCreateFormDialog(true);
                                }}
                                data-testid={`button-edit-form-${form.id}`}
                              >
                                <Edit className="h-4 w-4" />
                              </Button>
                              
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => deleteFormMutation.mutate(form.id)}
                                className="text-destructive hover:text-destructive"
                                data-testid={`button-delete-form-${form.id}`}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </div>
                        </div>
                      </CardHeader>

                      {expandedForms.has(form.id) && (
                        <CardContent className="pt-0">
                          <div className="border-t pt-4">
                            <div className="flex items-center justify-between mb-4">
                              <h4 className="font-medium">Form Fields</h4>
                              <Dialog open={showFieldEditor} onOpenChange={setShowFieldEditor}>
                                <DialogTrigger asChild>
                                  <Button 
                                    size="sm" 
                                    onClick={() => setEditingField(null)}
                                    data-testid={`button-add-field-${form.id}`}
                                  >
                                    <Plus className="h-4 w-4 mr-2" />
                                    Add Field
                                  </Button>
                                </DialogTrigger>
                                <DialogContent className="max-w-2xl">
                                  <DialogHeader>
                                    <DialogTitle>
                                      {editingField ? "Edit Field" : "Add Form Field"}
                                    </DialogTitle>
                                  </DialogHeader>
                                  <FieldEditor
                                    field={editingField}
                                    onSubmit={(data) => handleCreateField(data, form.id)}
                                    onCancel={() => {
                                      setShowFieldEditor(false);
                                      setEditingField(null);
                                    }}
                                  />
                                </DialogContent>
                              </Dialog>
                            </div>

                            {form.fields.length === 0 ? (
                              <div className="text-center py-6 border border-dashed rounded-lg">
                                <p className="text-muted-foreground">No fields yet. Add your first field to get started.</p>
                              </div>
                            ) : (
                              <div className="space-y-2">
                                {form.fields.map((field, index) => (
                                  <div
                                    key={field.id}
                                    className="flex items-center justify-between p-3 border rounded-lg bg-muted/10"
                                  >
                                    <div className="flex items-center gap-3">
                                      <GripVertical className="h-4 w-4 text-muted-foreground" />
                                      <div>
                                        <div className="flex items-center gap-2">
                                          <span className="font-medium" data-testid={`text-field-label-${field.id}`}>
                                            {field.label}
                                          </span>
                                          {field.isRequired && (
                                            <Badge variant="outline" className="text-xs">Required</Badge>
                                          )}
                                        </div>
                                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                          <Badge variant="secondary" className="text-xs">
                                            {fieldTypes.find(t => t.value === field.fieldType)?.label || field.fieldType}
                                          </Badge>
                                          {field.placeholder && (
                                            <span>• Placeholder: "{field.placeholder}"</span>
                                          )}
                                        </div>
                                      </div>
                                    </div>
                                    
                                    <div className="flex items-center gap-1">
                                      <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => {
                                          setEditingField(field);
                                          setShowFieldEditor(true);
                                        }}
                                        data-testid={`button-edit-field-${field.id}`}
                                      >
                                        <Edit className="h-4 w-4" />
                                      </Button>
                                      
                                      <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => deleteFieldMutation.mutate(field.id)}
                                        className="text-destructive hover:text-destructive"
                                        data-testid={`button-delete-field-${field.id}`}
                                      >
                                        <Trash2 className="h-4 w-4" />
                                      </Button>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        </CardContent>
                      )}
                    </Card>
                  ))
                )}
              </div>
            )}
          </TabsContent>

          <TabsContent value="responses">
            <Card>
              <CardContent className="py-12">
                <div className="text-center">
                  <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-foreground mb-2">Student Responses</h3>
                  <p className="text-muted-foreground">
                    Response management functionality will be available here.
                  </p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </Layout>
  );
}

// Create Form Dialog Component
function CreateFormDialog({ 
  onSubmit, 
  onCancel 
}: { 
  onSubmit: (data: { title: string; description?: string; isRequired: boolean }) => void;
  onCancel: () => void;
}) {
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    isRequired: false
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit({
      title: formData.title,
      description: formData.description || undefined,
      isRequired: formData.isRequired
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <Label htmlFor="title">Form Title *</Label>
        <Input
          id="title"
          value={formData.title}
          onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
          placeholder="e.g., Pre-Course Safety Information"
          required
          data-testid="input-form-title"
        />
      </div>
      
      <div>
        <Label htmlFor="description">Description</Label>
        <Textarea
          id="description"
          value={formData.description}
          onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
          placeholder="Optional description of what this form is for"
          data-testid="textarea-form-description"
        />
      </div>
      
      <div className="flex items-center space-x-2">
        <Checkbox
          id="isRequired"
          checked={formData.isRequired}
          onCheckedChange={(checked) => setFormData(prev => ({ ...prev, isRequired: checked === true }))}
          data-testid="checkbox-form-required"
        />
        <Label htmlFor="isRequired">Required form (students must complete before course)</Label>
      </div>
      
      <div className="flex justify-end gap-2 pt-4">
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" disabled={!formData.title}>
          Create Form
        </Button>
      </div>
    </form>
  );
}

// Field Editor Component
function FieldEditor({ 
  field, 
  onSubmit, 
  onCancel 
}: {
  field?: CourseInformationFormField | null;
  onSubmit: (data: {
    fieldType: FormFieldType;
    label: string;
    placeholder?: string;
    isRequired: boolean;
    options?: any;
  }) => void;
  onCancel: () => void;
}) {
  const [fieldData, setFieldData] = useState({
    fieldType: (field?.fieldType as FormFieldType) || 'text',
    label: field?.label || '',
    placeholder: field?.placeholder || '',
    isRequired: field?.isRequired || false,
    options: field?.options ? JSON.stringify(field.options, null, 2) : ''
  });

  const fieldTypes: Array<{ value: FormFieldType; label: string }> = [
    { value: 'text', label: 'Text' },
    { value: 'email', label: 'Email' },
    { value: 'phone', label: 'Phone' },
    { value: 'textarea', label: 'Long Text' },
    { value: 'select', label: 'Dropdown' },
    { value: 'checkbox', label: 'Checkbox' },
    { value: 'date', label: 'Date' },
    { value: 'number', label: 'Number' },
  ];

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    let parsedOptions = undefined;
    if (fieldData.options.trim()) {
      try {
        parsedOptions = JSON.parse(fieldData.options);
      } catch (e) {
        // Handle invalid JSON
        return;
      }
    }
    
    onSubmit({
      fieldType: fieldData.fieldType,
      label: fieldData.label,
      placeholder: fieldData.placeholder || undefined,
      isRequired: fieldData.isRequired,
      options: parsedOptions
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label htmlFor="fieldType">Field Type *</Label>
          <Select 
            value={fieldData.fieldType} 
            onValueChange={(value: FormFieldType) => 
              setFieldData(prev => ({ ...prev, fieldType: value }))
            }
          >
            <SelectTrigger data-testid="select-field-type">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {fieldTypes.map((type) => (
                <SelectItem key={type.value} value={type.value}>
                  {type.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        
        <div className="flex items-center space-x-2 pt-8">
          <Checkbox
            id="fieldRequired"
            checked={fieldData.isRequired}
            onCheckedChange={(checked) => 
              setFieldData(prev => ({ ...prev, isRequired: checked === true }))
            }
            data-testid="checkbox-field-required"
          />
          <Label htmlFor="fieldRequired">Required field</Label>
        </div>
      </div>
      
      <div>
        <Label htmlFor="label">Field Label *</Label>
        <Input
          id="label"
          value={fieldData.label}
          onChange={(e) => setFieldData(prev => ({ ...prev, label: e.target.value }))}
          placeholder="e.g., Emergency Contact Name"
          required
          data-testid="input-field-label"
        />
      </div>
      
      <div>
        <Label htmlFor="placeholder">Placeholder Text</Label>
        <Input
          id="placeholder"
          value={fieldData.placeholder}
          onChange={(e) => setFieldData(prev => ({ ...prev, placeholder: e.target.value }))}
          placeholder="Hint text for the field"
          data-testid="input-field-placeholder"
        />
      </div>
      
      {fieldData.fieldType === 'select' && (
        <div>
          <Label htmlFor="options">Options (JSON format)</Label>
          <Textarea
            id="options"
            value={fieldData.options}
            onChange={(e) => setFieldData(prev => ({ ...prev, options: e.target.value }))}
            placeholder='["Option 1", "Option 2", "Option 3"]'
            className="font-mono text-sm"
            data-testid="textarea-field-options"
          />
          <p className="text-xs text-muted-foreground mt-1">
            For dropdown fields, provide options as a JSON array
          </p>
        </div>
      )}
      
      <div className="flex justify-end gap-2 pt-4">
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" disabled={!fieldData.label}>
          {field ? "Update Field" : "Add Field"}
        </Button>
      </div>
    </form>
  );
}