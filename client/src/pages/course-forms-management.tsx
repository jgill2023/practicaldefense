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
import ReactQuill from "react-quill";
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
  ChevronRight,
  ArrowLeft,
  Clipboard
} from "lucide-react";
import type { 
  CourseInformationFormWithFields, 
  CourseInformationFormField, 
  FormFieldType,
  CourseWithSchedules,
  WaiverTemplate,
  WaiverTemplateWithDetails,
  InsertWaiverTemplate
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
  
  // Waiver management state
  const [showCreateWaiverDialog, setShowCreateWaiverDialog] = useState(false);
  const [editingWaiver, setEditingWaiver] = useState<WaiverTemplateWithDetails | null>(null);
  const [expandedWaivers, setExpandedWaivers] = useState<Set<string>>(new Set());

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

  // Fetch waiver templates
  const { data: waiverTemplates = [], isLoading: waiverTemplatesLoading } = useQuery<WaiverTemplateWithDetails[]>({
    queryKey: ["/api/admin/waiver-templates"],
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

  // Waiver template creation/update
  const waiverTemplateMutation = useMutation({
    mutationFn: async (data: InsertWaiverTemplate) => {
      const url = editingWaiver ? `/api/admin/waiver-templates/${editingWaiver.id}` : "/api/admin/waiver-templates";
      const method = editingWaiver ? "PATCH" : "POST";
      const response = await apiRequest(method, url, data);
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: editingWaiver ? "Waiver Template Updated" : "Waiver Template Created",
        description: `Waiver template has been ${editingWaiver ? "updated" : "created"} successfully.`,
      });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/waiver-templates"] });
      queryClient.refetchQueries({ queryKey: ["/api/admin/waiver-templates"] });
      setShowCreateWaiverDialog(false);
      setEditingWaiver(null);
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Delete waiver template
  const deleteWaiverTemplateMutation = useMutation({
    mutationFn: async (templateId: string) => {
      await apiRequest("DELETE", `/api/admin/waiver-templates/${templateId}`);
    },
    onSuccess: () => {
      toast({
        title: "Waiver Template Deleted",
        description: "Waiver template has been deleted successfully.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/waiver-templates"] });
      queryClient.refetchQueries({ queryKey: ["/api/admin/waiver-templates"] });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Assign waiver to course
  const assignWaiverMutation = useMutation({
    mutationFn: async (data: { templateId: string; courseIds: string[] }) => {
      const response = await apiRequest("POST", `/api/admin/waiver-templates/${data.templateId}/assign`, {
        courseIds: data.courseIds
      });
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Waiver Assigned",
        description: "Waiver template has been assigned to selected courses successfully.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/waiver-templates"] });
      queryClient.refetchQueries({ queryKey: ["/api/admin/waiver-templates"] });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
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

  const toggleWaiverExpansion = (waiverId: string) => {
    const newExpanded = new Set(expandedWaivers);
    if (newExpanded.has(waiverId)) {
      newExpanded.delete(waiverId);
    } else {
      newExpanded.add(waiverId);
    }
    setExpandedWaivers(newExpanded);
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

  const handleCreateWaiver = (data: { name: string; content: string; isActive: boolean; courseIds: string[] }) => {
    if (!(user as any)?.id) {
      toast({
        title: "Error",
        description: "User authentication required to create waiver templates.",
        variant: "destructive",
      });
      return;
    }
    
    // Transform data to match schema requirements
    const waiverData = {
      name: data.name,
      content: data.content,
      isActive: data.isActive,
      scope: 'course' as const, // Required field with valid value
      courseIds: data.courseIds, // Array of course IDs
      categoryIds: [], // Empty array for category scope (not used for course scope)
      validityDays: 365, // Default validity period
      requiresGuardian: false, // Default value
      forceReSign: false, // Default value  
      availableFields: ['studentName', 'courseName', 'date', 'instructorName', 'location'], // Default merge fields
      createdBy: (user as any).id // Required audit field
    };
    waiverTemplateMutation.mutate(waiverData);
  };

  const handleAssignWaiver = (templateId: string, courseIds: string[]) => {
    assignWaiverMutation.mutate({ templateId, courseIds });
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
          <div className="flex items-center gap-4 mb-4">
            <Button 
              variant="outline" 
              onClick={() => window.location.href = '/instructor-dashboard'}
              className="flex items-center gap-2"
              data-testid="button-back-to-dashboard"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to Dashboard
            </Button>
          </div>
          <h1 className="text-3xl font-bold text-foreground mb-4">Course Information Forms</h1>
          <p className="text-muted-foreground">
            Manage post-registration forms and waivers that students complete after enrolling in courses.
          </p>
        </div>

        <Tabs defaultValue="manage" className="w-full">
          <TabsList className="mb-6">
            <TabsTrigger value="manage" className="flex items-center gap-2">
              <Settings className="h-4 w-4" />
              Manage Forms
            </TabsTrigger>
            <TabsTrigger value="waivers" className="flex items-center gap-2">
              <Clipboard className="h-4 w-4" />
              Manage Waivers
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

          <TabsContent value="waivers">
            {/* Waiver Templates Management */}
            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle>Waiver Templates</CardTitle>
                      <p className="text-sm text-muted-foreground mt-1">
                        Create and manage digital waiver templates that can be assigned to courses.
                      </p>
                    </div>
                    <Dialog open={showCreateWaiverDialog} onOpenChange={setShowCreateWaiverDialog}>
                      <DialogTrigger asChild>
                        <Button data-testid="button-create-waiver">
                          <Plus className="h-4 w-4 mr-2" />
                          Create Waiver Template
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
                        <DialogHeader>
                          <DialogTitle>
                            {editingWaiver ? "Edit Waiver Template" : "Create Waiver Template"}
                          </DialogTitle>
                          <DialogDescription>
                            Create a digital waiver template that students will sign when enrolling in courses.
                          </DialogDescription>
                        </DialogHeader>
                        <CreateWaiverDialog 
                          waiver={editingWaiver}
                          courses={courses}
                          onSubmit={handleCreateWaiver}
                          onCancel={() => {
                            setShowCreateWaiverDialog(false);
                            setEditingWaiver(null);
                          }}
                        />
                      </DialogContent>
                    </Dialog>
                  </div>
                </CardHeader>
              </Card>

              {/* Waiver Templates List */}
              <div className="space-y-4">
                {waiverTemplatesLoading ? (
                  <Card>
                    <CardContent className="py-8">
                      <div className="text-center">
                        <div className="animate-spin w-6 h-6 border-2 border-primary border-t-transparent rounded-full mx-auto mb-2" />
                        <p className="text-muted-foreground">Loading waiver templates...</p>
                      </div>
                    </CardContent>
                  </Card>
                ) : waiverTemplates.length === 0 ? (
                  <Card>
                    <CardContent className="py-12">
                      <div className="text-center">
                        <Clipboard className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                        <h3 className="text-lg font-medium text-foreground mb-2">No Waiver Templates Yet</h3>
                        <p className="text-muted-foreground mb-6">
                          Create your first waiver template to start collecting digital signatures from students.
                        </p>
                      </div>
                    </CardContent>
                  </Card>
                ) : (
                  waiverTemplates.map((waiver) => (
                    <Card key={waiver.id} className="border border-border">
                      <CardHeader className="pb-4">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => toggleWaiverExpansion(waiver.id)}
                              className="p-1 h-6 w-6"
                            >
                              {expandedWaivers.has(waiver.id) ? 
                                <ChevronDown className="h-4 w-4" /> : 
                                <ChevronRight className="h-4 w-4" />
                              }
                            </Button>
                            <div>
                              <h3 className="font-semibold" data-testid={`text-waiver-name-${waiver.id}`}>
                                {waiver.name}
                              </h3>
                              <p className="text-sm text-muted-foreground">
                                Version {waiver.version} • Created by {waiver.creator.firstName} {waiver.creator.lastName}
                              </p>
                            </div>
                          </div>
                          
                          <div className="flex items-center gap-2">
                            {waiver.isActive ? (
                              <Badge variant="default">Active</Badge>
                            ) : (
                              <Badge variant="secondary">Inactive</Badge>
                            )}
                            <Badge variant="outline">
                              {waiver.instanceCount} instance{waiver.instanceCount !== 1 ? 's' : ''}
                            </Badge>
                            <Badge variant="outline">
                              {waiver.courseIds?.length || 0} course{(waiver.courseIds?.length || 0) !== 1 ? 's' : ''}
                            </Badge>
                            
                            <div className="flex items-center gap-1">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => {
                                  setEditingWaiver(waiver);
                                  setShowCreateWaiverDialog(true);
                                }}
                                data-testid={`button-edit-waiver-${waiver.id}`}
                              >
                                <Edit className="h-4 w-4" />
                              </Button>
                              
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => deleteWaiverTemplateMutation.mutate(waiver.id)}
                                className="text-destructive hover:text-destructive"
                                data-testid={`button-delete-waiver-${waiver.id}`}
                                disabled={waiver.instanceCount > 0}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </div>
                        </div>
                      </CardHeader>

                      {expandedWaivers.has(waiver.id) && (
                        <CardContent className="pt-0">
                          <div className="border-t pt-4 space-y-6">
                            {/* Waiver Content Preview */}
                            <div>
                              <h4 className="font-medium mb-3">Waiver Content</h4>
                              <div 
                                className="prose prose-sm max-w-none border rounded-lg p-4 bg-muted/20"
                                dangerouslySetInnerHTML={{ __html: waiver.content }}
                                data-testid={`waiver-content-preview-${waiver.id}`}
                              />
                            </div>

                            {/* Assigned Courses */}
                            <div>
                              <h4 className="font-medium mb-3">Assigned Courses</h4>
                              {(waiver.courseIds?.length || 0) === 0 ? (
                                <div className="text-center py-4 border border-dashed rounded-lg">
                                  <p className="text-muted-foreground">
                                    No courses assigned. Use the course assignment feature to assign this waiver to courses.
                                  </p>
                                </div>
                              ) : (
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                                  {(waiver.courseIds || []).map((courseId) => {
                                    const course = courses.find(c => c.id === courseId);
                                    return course ? (
                                      <div 
                                        key={courseId}
                                        className="p-3 border rounded-lg bg-background"
                                      >
                                        <div className="font-medium text-sm">{course.title}</div>
                                        <div className="text-xs text-muted-foreground">
                                          {course.schedules.length} schedule{course.schedules.length !== 1 ? 's' : ''}
                                        </div>
                                      </div>
                                    ) : null;
                                  })}
                                </div>
                              )}
                              
                              <div className="mt-4">
                                <AssignWaiverDialog
                                  waiver={waiver}
                                  courses={courses}
                                  onAssign={handleAssignWaiver}
                                />
                              </div>
                            </div>
                          </div>
                        </CardContent>
                      )}
                    </Card>
                  ))
                )}
              </div>
            </div>
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

// Create Waiver Dialog Component
function CreateWaiverDialog({ 
  waiver,
  courses,
  onSubmit, 
  onCancel 
}: { 
  waiver?: WaiverTemplateWithDetails | null;
  courses: CourseWithSchedules[];
  onSubmit: (data: { name: string; content: string; isActive: boolean; courseIds: string[] }) => void;
  onCancel: () => void;
}) {
  const [waiverData, setWaiverData] = useState({
    name: waiver?.name || '',
    content: waiver?.content || `<h2>LIABILITY WAIVER AND RELEASE AGREEMENT</h2>
<p>I, the undersigned participant, acknowledge that I am voluntarily participating in firearms training activities offered by ProTrain Academy.</p>
<h3>Acknowledgment of Risk</h3>
<p>I understand and acknowledge that:</p>
<ul>
<li>Firearms training involves inherent risks and dangers</li>
<li>Serious injury or death may occur from participation</li>
<li>I assume all risks associated with participation</li>
</ul>
<h3>Release and Waiver</h3>
<p>In consideration for being permitted to participate, I hereby:</p>
<ul>
<li>Release, waive, and discharge ProTrain Academy from all claims</li>
<li>Agree to indemnify and hold harmless the training facility</li>
<li>Acknowledge this agreement is binding on my heirs and assigns</li>
</ul>
<p><strong>By signing below, I acknowledge that I have read, understood, and agree to be bound by this waiver.</strong></p>`,
    isActive: waiver?.isActive ?? true,
    courseIds: waiver?.courseIds || []
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit({
      name: waiverData.name,
      content: waiverData.content,
      isActive: waiverData.isActive,
      courseIds: waiverData.courseIds
    });
  };

  const handleCourseToggle = (courseId: string, checked: boolean) => {
    setWaiverData(prev => ({
      ...prev,
      courseIds: checked 
        ? [...prev.courseIds, courseId]
        : prev.courseIds.filter(id => id !== courseId)
    }));
  };

  return (
    <form onSubmit={handleSubmit} noValidate className="space-y-6">
      <div>
        <Label htmlFor="waiver-name">Waiver Template Name *</Label>
        <Input
          id="waiver-name"
          value={waiverData.name}
          onChange={(e) => setWaiverData(prev => ({ ...prev, name: e.target.value }))}
          placeholder="e.g., General Firearms Training Waiver"
          required
          data-testid="input-waiver-name"
        />
      </div>
      
      <div>
        <Label htmlFor="waiver-content">Waiver Content *</Label>
        <div className="mt-2">
          <ReactQuill
            value={waiverData.content}
            onChange={(content) => setWaiverData(prev => ({ ...prev, content }))}
            theme="snow"
            placeholder="Enter the waiver content with legal terms and conditions..."
            style={{ height: '300px', marginBottom: '50px' }}
            modules={{
              toolbar: [
                [{ 'header': [1, 2, 3, false] }],
                ['bold', 'italic', 'underline'],
                [{ 'list': 'ordered'}, { 'list': 'bullet' }],
                ['clean']
              ]
            }}
          />
        </div>
      </div>
      
      <div className="flex items-center space-x-2">
        <Checkbox
          id="waiver-active"
          checked={waiverData.isActive}
          onCheckedChange={(checked) => setWaiverData(prev => ({ ...prev, isActive: checked === true }))}
          data-testid="checkbox-waiver-active"
        />
        <Label htmlFor="waiver-active">Active template (available for assignment to courses)</Label>
      </div>

      <div>
        <Label>Assign to Courses</Label>
        <p className="text-sm text-muted-foreground mb-3">
          Select which courses should require this waiver. Students enrolling in selected courses will need to sign this waiver.
        </p>
        {courses.length === 0 ? (
          <div className="text-center py-4 border border-dashed rounded-lg">
            <p className="text-muted-foreground">No courses available</p>
          </div>
        ) : (
          <div className="space-y-2 max-h-40 overflow-y-auto border rounded-lg p-3">
            {courses.map((course) => (
              <div key={course.id} className="flex items-center space-x-2">
                <Checkbox
                  id={`course-${course.id}`}
                  checked={waiverData.courseIds.includes(course.id)}
                  onCheckedChange={(checked) => handleCourseToggle(course.id, checked === true)}
                  data-testid={`checkbox-course-${course.id}`}
                />
                <Label htmlFor={`course-${course.id}`} className="text-sm">
                  {course.title}
                </Label>
              </div>
            ))}
          </div>
        )}
      </div>
      
      <div className="flex justify-end gap-2 pt-4">
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" disabled={!waiverData.name || !waiverData.content}>
          {waiver ? "Update Waiver" : "Create Waiver"}
        </Button>
      </div>
    </form>
  );
}

// Assign Waiver Dialog Component
function AssignWaiverDialog({ 
  waiver,
  courses,
  onAssign
}: { 
  waiver: WaiverTemplateWithDetails;
  courses: CourseWithSchedules[];
  onAssign: (templateId: string, courseIds: string[]) => void;
}) {
  const [showDialog, setShowDialog] = useState(false);
  const [selectedCourses, setSelectedCourses] = useState<string[]>(waiver.courseIds || []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onAssign(waiver.id, selectedCourses);
    setShowDialog(false);
  };

  const handleCourseToggle = (courseId: string, checked: boolean) => {
    setSelectedCourses(prev => 
      checked 
        ? [...prev, courseId]
        : prev.filter(id => id !== courseId)
    );
  };

  return (
    <Dialog open={showDialog} onOpenChange={setShowDialog}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" data-testid={`button-assign-waiver-${waiver.id}`}>
          <Settings className="h-4 w-4 mr-2" />
          Manage Course Assignment
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Assign to Courses</DialogTitle>
          <DialogDescription>
            Select which courses should require the "{waiver.name}" waiver.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          {courses.length === 0 ? (
            <div className="text-center py-6 border border-dashed rounded-lg">
              <p className="text-muted-foreground">No courses available</p>
            </div>
          ) : (
            <div className="space-y-3 max-h-60 overflow-y-auto">
              {courses.map((course) => (
                <div key={course.id} className="flex items-start space-x-3">
                  <Checkbox
                    id={`assign-course-${course.id}`}
                    checked={selectedCourses.includes(course.id)}
                    onCheckedChange={(checked) => handleCourseToggle(course.id, checked === true)}
                    data-testid={`checkbox-assign-course-${course.id}`}
                    className="mt-1"
                  />
                  <div className="flex-1">
                    <Label htmlFor={`assign-course-${course.id}`} className="text-sm font-medium">
                      {course.title}
                    </Label>
                    <p className="text-xs text-muted-foreground">
                      {course.schedules.length} schedule{course.schedules.length !== 1 ? 's' : ''}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
          
          <div className="flex justify-end gap-2 pt-4">
            <Button type="button" variant="outline" onClick={() => setShowDialog(false)}>
              Cancel
            </Button>
            <Button type="submit">
              Update Assignment
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}