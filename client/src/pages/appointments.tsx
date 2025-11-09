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
import { Plus, Edit, Trash2, Clock, DollarSign, CheckCircle, XCircle, CalendarClock, Bell } from "lucide-react";
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

  const { data: notificationTemplates = [], isLoading: notificationTemplatesLoading } = useQuery<any[]>({
    queryKey: ["/api/appointments/instructor/notification-templates"],
    enabled: isAuthenticated && (user as User)?.role === 'instructor',
    retry: false,
  });

  const { data: reminderSchedules = [], isLoading: reminderSchedulesLoading } = useQuery<any[]>({
    queryKey: ["/api/appointments/instructor/reminder-schedules"],
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
      <div className="container mx-auto px-12 md:px-16 lg:px-24 py-8">
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
            <TabsTrigger value="notifications" data-testid="tab-notification-templates">
              <Bell className="mr-2 h-4 w-4" />
              Notifications
            </TabsTrigger>
            <TabsTrigger value="reminders" data-testid="tab-reminder-schedules">
              <Bell className="mr-2 h-4 w-4" />
              Reminders
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
                              <span>${typeof type.price === 'string' ? parseFloat(type.price).toFixed(2) : (typeof type.price === 'number' ? type.price.toFixed(2) : '0.00')}</span>
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
                              setTypeForm({
                                title: `${type.title} (Copy)`,
                                description: type.description || '',
                                durationMinutes: type.durationMinutes,
                                price: type.price,
                                requiresApproval: type.requiresApproval,
                                isActive: type.isActive,
                              });
                              setEditingType(null);
                              setShowTypeDialog(true);
                            }}
                            data-testid={`button-duplicate-type-${type.id}`}
                            title="Duplicate"
                          >
                            <Plus className="h-4 w-4" />
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
                <CardTitle className="flex items-center gap-2">
                  <Clock className="h-5 w-5" />
                  Weekly hours
                </CardTitle>
                <CardDescription>
                  Set when you are typically available for meetings
                </CardDescription>
              </CardHeader>
              <CardContent>
                {templatesLoading ? (
                  <div className="text-center py-8 text-muted-foreground">Loading...</div>
                ) : (
                  <div className="space-y-3">
                    {DAYS_OF_WEEK.map((day) => {
                      const dayTemplates = weeklyTemplates.filter(t => t.dayOfWeek === day.value && t.isActive);
                      
                      return (
                        <div key={day.value} className="flex items-start gap-3">
                          {/* Day Circle */}
                          <div className="flex-shrink-0 w-10 h-10 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-semibold text-sm">
                            {day.label.charAt(0)}
                          </div>

                          {/* Time Slots or Unavailable */}
                          <div className="flex-1 space-y-2">
                            {dayTemplates.length === 0 ? (
                              <div className="flex items-center gap-2">
                                <span className="text-muted-foreground">Unavailable</span>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-8 w-8 p-0 rounded-full"
                                  onClick={() => {
                                    setTemplateForm({
                                      dayOfWeek: day.value,
                                      startTime: '09:00',
                                      endTime: '17:00',
                                      requiresApproval: false,
                                      isActive: true,
                                    });
                                    setEditingTemplate(null);
                                    setShowTemplateDialog(true);
                                  }}
                                  data-testid={`button-add-${day.label.toLowerCase()}`}
                                >
                                  <Plus className="h-4 w-4" />
                                </Button>
                              </div>
                            ) : (
                              dayTemplates.map((template) => (
                                <div
                                  key={template.id}
                                  className="flex items-center gap-2"
                                  data-testid={`template-row-${template.id}`}
                                >
                                  {/* Start Time */}
                                  <Input
                                    type="time"
                                    value={template.startTime}
                                    className="w-32"
                                    readOnly
                                    onClick={() => openTemplateDialog(template)}
                                  />
                                  
                                  <span className="text-muted-foreground">—</span>
                                  
                                  {/* End Time */}
                                  <Input
                                    type="time"
                                    value={template.endTime}
                                    className="w-32"
                                    readOnly
                                    onClick={() => openTemplateDialog(template)}
                                  />

                                  {/* Action Buttons */}
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="h-8 w-8 p-0"
                                    onClick={() => {
                                      if (confirm('Delete this time slot?')) {
                                        deleteTemplateMutation.mutate(template.id);
                                      }
                                    }}
                                    data-testid={`button-delete-template-${template.id}`}
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                  
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="h-8 w-8 p-0"
                                    onClick={() => {
                                      setTemplateForm({
                                        dayOfWeek: day.value,
                                        startTime: template.startTime,
                                        endTime: template.endTime,
                                        requiresApproval: template.requiresApproval,
                                        isActive: template.isActive,
                                      });
                                      setEditingTemplate(null);
                                      setShowTemplateDialog(true);
                                    }}
                                    data-testid={`button-copy-template-${template.id}`}
                                    title="Add another time slot"
                                  >
                                    <Plus className="h-4 w-4" />
                                  </Button>
                                </div>
                              ))
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="notifications">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Notification Templates</CardTitle>
                    <CardDescription>
                      Create email and SMS templates for appointment notifications
                    </CardDescription>
                  </div>
                  <Button onClick={() => {/* TODO: Open notification template dialog */}} data-testid="button-create-notification-template">
                    <Plus className="mr-2 h-4 w-4" />
                    Add Template
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {notificationTemplatesLoading ? (
                  <div className="text-center py-8 text-muted-foreground">Loading...</div>
                ) : notificationTemplates.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    No notification templates created yet. Click "Add Template" to create email and SMS templates for appointment notifications.
                  </div>
                ) : (
                  <div className="space-y-4">
                    {notificationTemplates.map((template) => (
                      <div
                        key={template.id}
                        className="border rounded-lg p-4 flex items-start justify-between"
                        data-testid={`card-notification-template-${template.id}`}
                      >
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <h3 className="font-semibold text-lg">{template.eventType}</h3>
                            {template.isActive ? (
                              <Badge variant="default">Active</Badge>
                            ) : (
                              <Badge variant="secondary">Inactive</Badge>
                            )}
                            <Badge variant="outline">
                              {template.channelType === 'email' ? 'Email' : 'SMS'}
                            </Badge>
                            <Badge variant="outline">
                              {template.recipientType}
                            </Badge>
                          </div>
                          {template.subject && (
                            <p className="text-sm text-muted-foreground mb-2">
                              <strong>Subject:</strong> {template.subject}
                            </p>
                          )}
                          <p className="text-sm text-muted-foreground line-clamp-2">
                            {template.body}
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {/* TODO: Edit template */}}
                            data-testid={`button-edit-notification-template-${template.id}`}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {/* TODO: Delete template */}}
                            data-testid={`button-delete-notification-template-${template.id}`}
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

          <TabsContent value="reminders">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Reminder Schedules</CardTitle>
                    <CardDescription>
                      Set up automatic reminders to be sent before appointments
                    </CardDescription>
                  </div>
                  <Button onClick={() => {/* TODO: Open reminder schedule dialog */}} data-testid="button-create-reminder-schedule">
                    <Plus className="mr-2 h-4 w-4" />
                    Add Reminder
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {reminderSchedulesLoading ? (
                  <div className="text-center py-8 text-muted-foreground">Loading...</div>
                ) : reminderSchedules.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    No reminder schedules created yet. Click "Add Reminder" to set up automatic reminders before appointments.
                  </div>
                ) : (
                  <div className="space-y-4">
                    {reminderSchedules.map((schedule) => (
                      <div
                        key={schedule.id}
                        className="border rounded-lg p-4 flex items-start justify-between"
                        data-testid={`card-reminder-schedule-${schedule.id}`}
                      >
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <h3 className="font-semibold text-lg">{schedule.reminderName}</h3>
                            {schedule.isActive ? (
                              <Badge variant="default">Active</Badge>
                            ) : (
                              <Badge variant="secondary">Inactive</Badge>
                            )}
                          </div>
                          <div className="text-sm text-muted-foreground space-y-1">
                            <p>
                              <strong>Send:</strong> {Math.floor(schedule.minutesBefore / 60)} hours and {schedule.minutesBefore % 60} minutes before appointment
                            </p>
                            <div className="flex items-center gap-2">
                              {schedule.sendEmail && (
                                <Badge variant="outline" className="text-xs">
                                  <CheckCircle className="h-3 w-3 mr-1" />
                                  Email
                                </Badge>
                              )}
                              {schedule.sendSms && (
                                <Badge variant="outline" className="text-xs">
                                  <CheckCircle className="h-3 w-3 mr-1" />
                                  SMS
                                </Badge>
                              )}
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {/* TODO: Edit schedule */}}
                            data-testid={`button-edit-reminder-schedule-${schedule.id}`}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {/* TODO: Delete schedule */}}
                            data-testid={`button-delete-reminder-schedule-${schedule.id}`}
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
