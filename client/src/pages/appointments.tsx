import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Layout } from "@/components/Layout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { isUnauthorizedError } from "@/lib/authUtils";
import { Plus, Edit, Trash2, Clock, DollarSign, CheckCircle, XCircle, CalendarClock } from "lucide-react";
import type { User } from "@shared/schema";

type AppointmentType = {
  id: string;
  instructorId: string;
  title: string;
  description: string | null;
  durationMinutes: number;
  price: number;
  requiresApproval: boolean;
  isActive: boolean;
};

type WeeklyTemplate = {
  id: string;
  instructorId: string;
  dayOfWeek: number;
  startTime: string;
  endTime: string;
  requiresApproval: boolean;
  isActive: boolean;
};

const DAYS_OF_WEEK = [
  { value: 0, label: 'Sunday' },
  { value: 1, label: 'Monday' },
  { value: 2, label: 'Tuesday' },
  { value: 3, label: 'Wednesday' },
  { value: 4, label: 'Thursday' },
  { value: 5, label: 'Friday' },
  { value: 6, label: 'Saturday' },
];

export default function AppointmentsPage() {
  const { user, isLoading: authLoading, isAuthenticated } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [showTypeDialog, setShowTypeDialog] = useState(false);
  const [showTemplateDialog, setShowTemplateDialog] = useState(false);
  const [editingType, setEditingType] = useState<AppointmentType | null>(null);
  const [editingTemplate, setEditingTemplate] = useState<WeeklyTemplate | null>(null);

  const [typeForm, setTypeForm] = useState({
    title: '',
    description: '',
    durationMinutes: 30,
    price: 0,
    requiresApproval: false,
    isActive: true,
  });

  const [templateForm, setTemplateForm] = useState({
    dayOfWeek: 1,
    startTime: '09:00',
    endTime: '17:00',
    requiresApproval: false,
    isActive: true,
  });

  const { data: appointmentTypes = [], isLoading: typesLoading } = useQuery<AppointmentType[]>({
    queryKey: ["/api/appointments/instructor/appointment-types"],
    enabled: isAuthenticated && (user as User)?.role === 'instructor',
    retry: false,
  });

  const { data: weeklyTemplates = [], isLoading: templatesLoading } = useQuery<WeeklyTemplate[]>({
    queryKey: ["/api/appointments/instructor/weekly-templates"],
    enabled: isAuthenticated && (user as User)?.role === 'instructor',
    retry: false,
  });

  const createTypeMutation = useMutation({
    mutationFn: async (data: typeof typeForm) => {
      await apiRequest("POST", "/api/appointments/instructor/appointment-types", data);
    },
    onSuccess: () => {
      toast({ title: "Appointment Type Created", description: "Type created successfully." });
      queryClient.invalidateQueries({ queryKey: ["/api/appointments/instructor/appointment-types"] });
      setShowTypeDialog(false);
      resetTypeForm();
    },
    onError: handleMutationError,
  });

  const updateTypeMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: typeof typeForm }) => {
      await apiRequest("PATCH", `/api/appointments/instructor/appointment-types/${id}`, data);
    },
    onSuccess: () => {
      toast({ title: "Appointment Type Updated", description: "Type updated successfully." });
      queryClient.invalidateQueries({ queryKey: ["/api/appointments/instructor/appointment-types"] });
      setShowTypeDialog(false);
      setEditingType(null);
      resetTypeForm();
    },
    onError: handleMutationError,
  });

  const deleteTypeMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest("DELETE", `/api/appointments/instructor/appointment-types/${id}`);
    },
    onSuccess: () => {
      toast({ title: "Appointment Type Deleted", description: "Type deleted successfully." });
      queryClient.invalidateQueries({ queryKey: ["/api/appointments/instructor/appointment-types"] });
    },
    onError: handleMutationError,
  });

  const createTemplateMutation = useMutation({
    mutationFn: async (data: typeof templateForm) => {
      await apiRequest("POST", "/api/appointments/instructor/weekly-templates", data);
    },
    onSuccess: () => {
      toast({ title: "Weekly Schedule Created", description: "Schedule created successfully." });
      queryClient.invalidateQueries({ queryKey: ["/api/appointments/instructor/weekly-templates"] });
      setShowTemplateDialog(false);
      resetTemplateForm();
    },
    onError: handleMutationError,
  });

  const updateTemplateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: typeof templateForm }) => {
      await apiRequest("PATCH", `/api/appointments/instructor/weekly-templates/${id}`, data);
    },
    onSuccess: () => {
      toast({ title: "Weekly Schedule Updated", description: "Schedule updated successfully." });
      queryClient.invalidateQueries({ queryKey: ["/api/appointments/instructor/weekly-templates"] });
      setShowTemplateDialog(false);
      setEditingTemplate(null);
      resetTemplateForm();
    },
    onError: handleMutationError,
  });

  const deleteTemplateMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest("DELETE", `/api/appointments/instructor/weekly-templates/${id}`);
    },
    onSuccess: () => {
      toast({ title: "Weekly Schedule Deleted", description: "Schedule deleted successfully." });
      queryClient.invalidateQueries({ queryKey: ["/api/appointments/instructor/weekly-templates"] });
    },
    onError: handleMutationError,
  });

  function handleMutationError(error: any) {
    if (isUnauthorizedError(error)) {
      toast({
        title: "Unauthorized",
        description: "Session expired. Redirecting to login...",
        variant: "destructive",
      });
      setTimeout(() => window.location.href = "/api/login", 500);
      return;
    }
    toast({
      title: "Error",
      description: error?.message || "An error occurred. Please try again.",
      variant: "destructive",
    });
  }

  function resetTypeForm() {
    setTypeForm({
      title: '',
      description: '',
      durationMinutes: 30,
      price: 0,
      requiresApproval: false,
      isActive: true,
    });
  }

  function resetTemplateForm() {
    setTemplateForm({
      dayOfWeek: 1,
      startTime: '09:00',
      endTime: '17:00',
      requiresApproval: false,
      isActive: true,
    });
  }

  function openTypeDialog(type?: AppointmentType) {
    if (type) {
      setEditingType(type);
      setTypeForm({
        title: type.title,
        description: type.description || '',
        durationMinutes: type.durationMinutes,
        price: type.price,
        requiresApproval: type.requiresApproval,
        isActive: type.isActive,
      });
    } else {
      setEditingType(null);
      resetTypeForm();
    }
    setShowTypeDialog(true);
  }

  function openTemplateDialog(template?: WeeklyTemplate) {
    if (template) {
      setEditingTemplate(template);
      setTemplateForm({
        dayOfWeek: template.dayOfWeek,
        startTime: template.startTime,
        endTime: template.endTime,
        requiresApproval: template.requiresApproval,
        isActive: template.isActive,
      });
    } else {
      setEditingTemplate(null);
      resetTemplateForm();
    }
    setShowTemplateDialog(true);
  }

  function handleTypeSave() {
    if (editingType) {
      updateTypeMutation.mutate({ id: editingType.id, data: typeForm });
    } else {
      createTypeMutation.mutate(typeForm);
    }
  }

  function handleTemplateSave() {
    if (editingTemplate) {
      updateTemplateMutation.mutate({ id: editingTemplate.id, data: templateForm });
    } else {
      createTemplateMutation.mutate(templateForm);
    }
  }

  if (authLoading || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  if ((user as User)?.role !== 'instructor') {
    return (
      <Layout>
        <div className="container mx-auto px-4 py-8">
          <Card>
            <CardContent className="pt-6">
              <p className="text-center text-muted-foreground">
                You must be an instructor to access appointment settings.
              </p>
            </CardContent>
          </Card>
        </div>
      </Layout>
    );
  }

  const groupedTemplates = DAYS_OF_WEEK.map(day => ({
    ...day,
    templates: weeklyTemplates.filter(t => t.dayOfWeek === day.value),
  }));

  return (
    <Layout>
      <div className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2" data-testid="text-page-title">
            Appointment Management
          </h1>
          <p className="text-muted-foreground">
            Configure appointment types, availability schedules, and booking settings
          </p>
        </div>

        <Tabs defaultValue="types" className="space-y-6">
          <TabsList>
            <TabsTrigger value="types" data-testid="tab-appointment-types">
              <CalendarClock className="mr-2 h-4 w-4" />
              Appointment Types
            </TabsTrigger>
            <TabsTrigger value="availability" data-testid="tab-weekly-availability">
              <Clock className="mr-2 h-4 w-4" />
              Weekly Availability
            </TabsTrigger>
          </TabsList>

          <TabsContent value="types">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Appointment Types</CardTitle>
                    <CardDescription>
                      Define the types of appointments students can book with you
                    </CardDescription>
                  </div>
                  <Button onClick={() => openTypeDialog()} data-testid="button-create-type">
                    <Plus className="mr-2 h-4 w-4" />
                    Add Type
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {typesLoading ? (
                  <div className="text-center py-8 text-muted-foreground">Loading...</div>
                ) : appointmentTypes.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    No appointment types created yet. Click "Add Type" to get started.
                  </div>
                ) : (
                  <div className="space-y-4">
                    {appointmentTypes.map((type) => (
                      <div
                        key={type.id}
                        className="border rounded-lg p-4 flex items-start justify-between"
                        data-testid={`card-type-${type.id}`}
                      >
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <h3 className="font-semibold text-lg">{type.title}</h3>
                            {type.isActive ? (
                              <Badge variant="default">Active</Badge>
                            ) : (
                              <Badge variant="secondary">Inactive</Badge>
                            )}
                            {type.requiresApproval && (
                              <Badge variant="outline">Requires Approval</Badge>
                            )}
                          </div>
                          {type.description && (
                            <p className="text-sm text-muted-foreground mb-2">{type.description}</p>
                          )}
                          <div className="flex items-center gap-4 text-sm">
                            <div className="flex items-center gap-1">
                              <Clock className="h-4 w-4 text-muted-foreground" />
                              <span>{type.durationMinutes} min</span>
                            </div>
                            <div className="flex items-center gap-1">
                              <DollarSign className="h-4 w-4 text-muted-foreground" />
                              <span>${type.price.toFixed(2)}</span>
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => openTypeDialog(type)}
                            data-testid={`button-edit-type-${type.id}`}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              if (confirm('Delete this appointment type? This cannot be undone.')) {
                                deleteTypeMutation.mutate(type.id);
                              }
                            }}
                            data-testid={`button-delete-type-${type.id}`}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="availability">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Weekly Availability</CardTitle>
                    <CardDescription>
                      Set your recurring weekly schedule for appointments
                    </CardDescription>
                  </div>
                  <Button onClick={() => openTemplateDialog()} data-testid="button-create-template">
                    <Plus className="mr-2 h-4 w-4" />
                    Add Schedule
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {templatesLoading ? (
                  <div className="text-center py-8 text-muted-foreground">Loading...</div>
                ) : weeklyTemplates.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    No weekly schedule set. Click "Add Schedule" to define your availability.
                  </div>
                ) : (
                  <div className="space-y-4">
                    {groupedTemplates.map((day) => (
                      day.templates.length > 0 && (
                        <div key={day.value} className="border rounded-lg p-4">
                          <h3 className="font-semibold mb-3">{day.label}</h3>
                          <div className="space-y-2">
                            {day.templates.map((template) => (
                              <div
                                key={template.id}
                                className="flex items-center justify-between bg-muted/50 rounded p-3"
                                data-testid={`card-template-${template.id}`}
                              >
                                <div className="flex items-center gap-4">
                                  <div className="flex items-center gap-2">
                                    <Clock className="h-4 w-4 text-muted-foreground" />
                                    <span className="font-medium">
                                      {template.startTime} - {template.endTime}
                                    </span>
                                  </div>
                                  {!template.isActive && (
                                    <Badge variant="secondary">Inactive</Badge>
                                  )}
                                  {template.requiresApproval && (
                                    <Badge variant="outline">Requires Approval</Badge>
                                  )}
                                </div>
                                <div className="flex items-center gap-2">
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => openTemplateDialog(template)}
                                    data-testid={`button-edit-template-${template.id}`}
                                  >
                                    <Edit className="h-4 w-4" />
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => {
                                      if (confirm('Delete this schedule? This cannot be undone.')) {
                                        deleteTemplateMutation.mutate(template.id);
                                      }
                                    }}
                                    data-testid={`button-delete-template-${template.id}`}
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        <Dialog open={showTypeDialog} onOpenChange={setShowTypeDialog}>
          <DialogContent data-testid="dialog-type-form">
            <DialogHeader>
              <DialogTitle>
                {editingType ? 'Edit Appointment Type' : 'Create Appointment Type'}
              </DialogTitle>
              <DialogDescription>
                Configure the details for this appointment type
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div>
                <Label htmlFor="title">Name*</Label>
                <Input
                  id="title"
                  value={typeForm.title}
                  onChange={(e) => setTypeForm({ ...typeForm, title: e.target.value })}
                  placeholder="e.g., 1-on-1 Coaching"
                  data-testid="input-type-title"
                />
              </div>
              <div>
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={typeForm.description}
                  onChange={(e) => setTypeForm({ ...typeForm, description: e.target.value })}
                  placeholder="Describe what this appointment includes"
                  data-testid="input-type-description"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="duration">Duration (minutes)*</Label>
                  <Input
                    id="duration"
                    type="number"
                    min="15"
                    step="15"
                    value={typeForm.durationMinutes}
                    onChange={(e) => setTypeForm({ ...typeForm, durationMinutes: parseInt(e.target.value) || 30 })}
                    data-testid="input-type-duration"
                  />
                </div>
                <div>
                  <Label htmlFor="price">Price ($)*</Label>
                  <Input
                    id="price"
                    type="number"
                    min="0"
                    step="0.01"
                    value={typeForm.price}
                    onChange={(e) => setTypeForm({ ...typeForm, price: parseFloat(e.target.value) || 0 })}
                    data-testid="input-type-price"
                  />
                </div>
              </div>
              <div className="flex items-center justify-between">
                <Label htmlFor="requires-approval">Require approval before confirming</Label>
                <Switch
                  id="requires-approval"
                  checked={typeForm.requiresApproval}
                  onCheckedChange={(checked) => setTypeForm({ ...typeForm, requiresApproval: checked })}
                  data-testid="switch-type-requires-approval"
                />
              </div>
              <div className="flex items-center justify-between">
                <Label htmlFor="is-active">Active (available for booking)</Label>
                <Switch
                  id="is-active"
                  checked={typeForm.isActive}
                  onCheckedChange={(checked) => setTypeForm({ ...typeForm, isActive: checked })}
                  data-testid="switch-type-is-active"
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowTypeDialog(false)}>
                Cancel
              </Button>
              <Button onClick={handleTypeSave} data-testid="button-save-type">
                {editingType ? 'Update' : 'Create'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <Dialog open={showTemplateDialog} onOpenChange={setShowTemplateDialog}>
          <DialogContent data-testid="dialog-template-form">
            <DialogHeader>
              <DialogTitle>
                {editingTemplate ? 'Edit Weekly Schedule' : 'Create Weekly Schedule'}
              </DialogTitle>
              <DialogDescription>
                Set your recurring availability for a specific day
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div>
                <Label htmlFor="day">Day of Week*</Label>
                <select
                  id="day"
                  className="w-full border border-input rounded-md px-3 py-2"
                  value={templateForm.dayOfWeek}
                  onChange={(e) => setTemplateForm({ ...templateForm, dayOfWeek: parseInt(e.target.value) })}
                  data-testid="select-template-day"
                >
                  {DAYS_OF_WEEK.map((day) => (
                    <option key={day.value} value={day.value}>
                      {day.label}
                    </option>
                  ))}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="start-time">Start Time*</Label>
                  <Input
                    id="start-time"
                    type="time"
                    value={templateForm.startTime}
                    onChange={(e) => setTemplateForm({ ...templateForm, startTime: e.target.value })}
                    data-testid="input-template-start-time"
                  />
                </div>
                <div>
                  <Label htmlFor="end-time">End Time*</Label>
                  <Input
                    id="end-time"
                    type="time"
                    value={templateForm.endTime}
                    onChange={(e) => setTemplateForm({ ...templateForm, endTime: e.target.value })}
                    data-testid="input-template-end-time"
                  />
                </div>
              </div>
              <div className="flex items-center justify-between">
                <Label htmlFor="template-requires-approval">Require approval for this time slot</Label>
                <Switch
                  id="template-requires-approval"
                  checked={templateForm.requiresApproval}
                  onCheckedChange={(checked) => setTemplateForm({ ...templateForm, requiresApproval: checked })}
                  data-testid="switch-template-requires-approval"
                />
              </div>
              <div className="flex items-center justify-between">
                <Label htmlFor="template-is-active">Active (available for booking)</Label>
                <Switch
                  id="template-is-active"
                  checked={templateForm.isActive}
                  onCheckedChange={(checked) => setTemplateForm({ ...templateForm, isActive: checked })}
                  data-testid="switch-template-is-active"
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowTemplateDialog(false)}>
                Cancel
              </Button>
              <Button onClick={handleTemplateSave} data-testid="button-save-template">
                {editingTemplate ? 'Update' : 'Create'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </Layout>
  );
}
