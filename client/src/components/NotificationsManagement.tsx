import { useState, useMemo } from "react";
import { useToast } from "@/hooks/use-toast";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormDescription } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { 
  Bell, 
  Plus, 
  Edit, 
  Trash2, 
  Send, 
  Calendar,
  Clock,
  Mail,
  MessageSquare,
  Eye,
  CheckCircle,
  XCircle,
  AlertCircle
} from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import type { 
  NotificationTemplate, 
  NotificationSchedule, 
  NotificationLog
} from "@shared/schema";
import { 
  insertNotificationTemplateSchema, 
  insertNotificationScheduleSchema 
} from "@shared/schema";
import { z } from "zod";

// Template form schema
const templateFormSchema = insertNotificationTemplateSchema.extend({
  content: z.string().min(1, "Template content is required"),
});

type TemplateForm = z.infer<typeof templateFormSchema>;

// Schedule form schema
const scheduleFormSchema = insertNotificationScheduleSchema.extend({
  templateId: z.string().uuid("Valid template is required"),
});

type ScheduleForm = z.infer<typeof scheduleFormSchema>;

// One-time notification form schema
const oneTimeNotificationSchema = z.object({
  templateId: z.string().uuid("Valid template is required"),
  recipientType: z.enum(["individual", "course", "all_students"]),
  recipientId: z.string().optional(),
  courseId: z.string().uuid().optional(),
  customSubject: z.string().optional(),
  customBody: z.string().optional(),
});

type OneTimeNotificationForm = z.infer<typeof oneTimeNotificationSchema>;

export function NotificationsManagement() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<"templates" | "schedules" | "logs" | "send">("templates");
  const [selectedTemplate, setSelectedTemplate] = useState<NotificationTemplate | null>(null);
  const [selectedSchedule, setSelectedSchedule] = useState<NotificationSchedule | null>(null);
  const [isTemplateDialogOpen, setIsTemplateDialogOpen] = useState(false);
  const [isScheduleDialogOpen, setIsScheduleDialogOpen] = useState(false);
  const [isSendDialogOpen, setIsSendDialogOpen] = useState(false);

  // Fetch notification templates
  const { data: templates = [], isLoading: templatesLoading } = useQuery<NotificationTemplate[]>({
    queryKey: ['/api/admin/notification-templates'],
    retry: false,
  });

  // Fetch notification schedules
  const { data: schedules = [], isLoading: schedulesLoading } = useQuery<NotificationSchedule[]>({
    queryKey: ['/api/admin/notification-schedules'],
    retry: false,
  });

  // Fetch notification logs
  const { data: logs = [], isLoading: logsLoading } = useQuery<NotificationLog[]>({
    queryKey: ['/api/admin/notification-logs'],
    retry: false,
  });

  // Template form
  const templateForm = useForm<TemplateForm>({
    resolver: zodResolver(templateFormSchema),
    defaultValues: {
      name: '',
      type: 'email',
      category: 'course_specific',
      subject: '',
      content: '',
      isActive: true,
    },
  });

  // Schedule form
  const scheduleForm = useForm<ScheduleForm>({
    resolver: zodResolver(scheduleFormSchema),
    defaultValues: {
      templateId: '',
      triggerEvent: 'registration',
      triggerTiming: 'immediate',
      delayDays: 0,
      delayHours: 0,
      isActive: true,
    },
  });

  // One-time notification form
  const sendForm = useForm<OneTimeNotificationForm>({
    resolver: zodResolver(oneTimeNotificationSchema),
    defaultValues: {
      templateId: '',
      recipientType: 'individual',
    },
  });

  // Template mutations
  const createTemplateMutation = useMutation({
    mutationFn: (data: TemplateForm) => apiRequest('POST', '/api/admin/notification-templates', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/notification-templates'] });
      setIsTemplateDialogOpen(false);
      templateForm.reset();
      toast({
        title: "Template Created",
        description: "Notification template has been created successfully.",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to create template. Please try again.",
        variant: "destructive",
      });
    },
  });

  const updateTemplateMutation = useMutation({
    mutationFn: ({ id, ...data }: TemplateForm & { id: string }) => 
      apiRequest('PUT', `/api/admin/notification-templates/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/notification-templates'] });
      setIsTemplateDialogOpen(false);
      setSelectedTemplate(null);
      templateForm.reset();
      toast({
        title: "Template Updated",
        description: "Notification template has been updated successfully.",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to update template. Please try again.",
        variant: "destructive",
      });
    },
  });

  const deleteTemplateMutation = useMutation({
    mutationFn: (id: string) => apiRequest('DELETE', `/api/admin/notification-templates/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/notification-templates'] });
      toast({
        title: "Template Deleted",
        description: "Notification template has been deleted successfully.",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to delete template. Please try again.",
        variant: "destructive",
      });
    },
  });

  // Schedule mutations
  const createScheduleMutation = useMutation({
    mutationFn: (data: ScheduleForm) => apiRequest('POST', '/api/admin/notification-schedules', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/notification-schedules'] });
      setIsScheduleDialogOpen(false);
      scheduleForm.reset();
      toast({
        title: "Schedule Created",
        description: "Notification schedule has been created successfully.",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to create schedule. Please try again.",
        variant: "destructive",
      });
    },
  });

  const updateScheduleMutation = useMutation({
    mutationFn: ({ id, ...data }: ScheduleForm & { id: string }) => 
      apiRequest('PUT', `/api/admin/notification-schedules/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/notification-schedules'] });
      setIsScheduleDialogOpen(false);
      setSelectedSchedule(null);
      scheduleForm.reset();
      toast({
        title: "Schedule Updated",
        description: "Notification schedule has been updated successfully.",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to update schedule. Please try again.",
        variant: "destructive",
      });
    },
  });

  const deleteScheduleMutation = useMutation({
    mutationFn: (id: string) => apiRequest('DELETE', `/api/admin/notification-schedules/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/notification-schedules'] });
      toast({
        title: "Schedule Deleted",
        description: "Notification schedule has been deleted successfully.",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to delete schedule. Please try again.",
        variant: "destructive",
      });
    },
  });

  // Send one-time notification mutation
  const sendNotificationMutation = useMutation({
    mutationFn: (data: OneTimeNotificationForm) => apiRequest('POST', '/api/admin/send-notification', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/notification-logs'] });
      setIsSendDialogOpen(false);
      sendForm.reset();
      toast({
        title: "Notification Sent",
        description: "Notification has been sent successfully.",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to send notification. Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleEditTemplate = (template: NotificationTemplate) => {
    setSelectedTemplate(template);
    templateForm.reset({
      name: template.name,
      type: template.type,
      category: template.category,
      subject: template.subject || '',
      content: template.content,
      isActive: template.isActive,
      courseId: template.courseId || undefined,
      scheduleId: template.scheduleId || undefined,
      createdBy: template.createdBy,
    });
    setIsTemplateDialogOpen(true);
  };

  const handleEditSchedule = (schedule: NotificationSchedule) => {
    setSelectedSchedule(schedule);
    scheduleForm.reset({
      templateId: schedule.templateId,
      triggerEvent: schedule.triggerEvent,
      triggerTiming: schedule.triggerTiming,
      delayDays: schedule.delayDays || 0,
      delayHours: schedule.delayHours || 0,
      isActive: schedule.isActive,
      courseId: schedule.courseId || undefined,
      scheduleId: schedule.scheduleId || undefined,
    });
    setIsScheduleDialogOpen(true);
  };

  const handleSubmitTemplate = (data: TemplateForm) => {
    if (selectedTemplate) {
      updateTemplateMutation.mutate({ ...data, id: selectedTemplate.id });
    } else {
      createTemplateMutation.mutate(data);
    }
  };

  const handleSubmitSchedule = (data: ScheduleForm) => {
    if (selectedSchedule) {
      updateScheduleMutation.mutate({ ...data, id: selectedSchedule.id });
    } else {
      createScheduleMutation.mutate(data);
    }
  };

  const handleSendNotification = (data: OneTimeNotificationForm) => {
    sendNotificationMutation.mutate(data);
  };

  const formatDate = (date: string | Date | null) => {
    if (!date) return 'N/A';
    return new Date(date).toLocaleDateString();
  };

  const formatDateTime = (date: string | Date | null) => {
    if (!date) return 'N/A';
    return new Date(date).toLocaleString();
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Notifications Management</h2>
        <div className="flex gap-2">
          <Button
            onClick={() => {
              setSelectedTemplate(null);
              templateForm.reset();
              setIsTemplateDialogOpen(true);
            }}
            data-testid="button-create-template"
          >
            <Plus className="h-4 w-4 mr-2" />
            New Template
          </Button>
          <Button
            variant="outline"
            onClick={() => {
              setSelectedSchedule(null);
              scheduleForm.reset();
              setIsScheduleDialogOpen(true);
            }}
            data-testid="button-create-schedule"
          >
            <Calendar className="h-4 w-4 mr-2" />
            New Schedule
          </Button>
          <Button
            variant="outline"
            onClick={() => {
              sendForm.reset();
              setIsSendDialogOpen(true);
            }}
            data-testid="button-send-notification"
          >
            <Send className="h-4 w-4 mr-2" />
            Send Notification
          </Button>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as typeof activeTab)}>
        <TabsList className="grid w-fit grid-cols-4">
          <TabsTrigger value="templates" className="flex items-center gap-2" data-testid="tab-templates">
            <Mail className="h-4 w-4" />
            Templates ({templates.length})
          </TabsTrigger>
          <TabsTrigger value="schedules" className="flex items-center gap-2" data-testid="tab-schedules">
            <Clock className="h-4 w-4" />
            Schedules ({schedules.length})
          </TabsTrigger>
          <TabsTrigger value="logs" className="flex items-center gap-2" data-testid="tab-logs">
            <Eye className="h-4 w-4" />
            Logs ({logs.length})
          </TabsTrigger>
          <TabsTrigger value="send" className="flex items-center gap-2" data-testid="tab-send">
            <Send className="h-4 w-4" />
            Send
          </TabsTrigger>
        </TabsList>

        {/* Templates Tab */}
        <TabsContent value="templates" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Notification Templates</CardTitle>
            </CardHeader>
            <CardContent>
              {templatesLoading ? (
                <div className="text-center py-8">Loading templates...</div>
              ) : templates.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  No templates found. Create your first template to get started.
                </div>
              ) : (
                <div className="space-y-4">
                  {templates.map((template) => (
                    <div
                      key={template.id}
                      className="border rounded-lg p-4 hover:shadow-md transition-shadow"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <h3 className="font-semibold">{template.name}</h3>
                            <Badge variant={template.type === 'email' ? 'default' : 'secondary'}>
                              {template.type === 'email' ? <Mail className="h-3 w-3 mr-1" /> : <MessageSquare className="h-3 w-3 mr-1" />}
                              {template.type.toUpperCase()}
                            </Badge>
                            <Badge variant={template.isActive ? 'default' : 'secondary'}>
                              {template.isActive ? 'Active' : 'Inactive'}
                            </Badge>
                            <Badge variant={template.courseId ? 'secondary' : 'outline'}>
                              {template.courseId ? 'Course-specific' : 'Global'}
                            </Badge>
                          </div>
                          {template.subject && (
                            <p className="text-sm text-muted-foreground mb-1">
                              <strong>Subject:</strong> {template.subject}
                            </p>
                          )}
                          <p className="text-sm text-muted-foreground line-clamp-2">
                            {template.content}
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleEditTemplate(template)}
                            data-testid={`button-edit-template-${template.id}`}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() => deleteTemplateMutation.mutate(template.id)}
                            data-testid={`button-delete-template-${template.id}`}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Schedules Tab */}
        <TabsContent value="schedules" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Notification Schedules</CardTitle>
            </CardHeader>
            <CardContent>
              {schedulesLoading ? (
                <div className="text-center py-8">Loading schedules...</div>
              ) : schedules.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  No schedules found. Create your first schedule to automate notifications.
                </div>
              ) : (
                <div className="space-y-4">
                  {schedules.map((schedule) => (
                    <div
                      key={schedule.id}
                      className="border rounded-lg p-4 hover:shadow-md transition-shadow"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <h3 className="font-semibold">Schedule {schedule.id.substring(0, 8)}</h3>
                            <Badge variant={schedule.isActive ? 'default' : 'secondary'}>
                              {schedule.isActive ? 'Active' : 'Inactive'}
                            </Badge>
                            <Badge variant="outline">
                              {schedule.triggerEvent.replace(/_/g, ' ').toUpperCase()}
                            </Badge>
                          </div>
                          <p className="text-sm text-muted-foreground">
                            <strong>Trigger:</strong> {schedule.delayDays || 0} days, {schedule.delayHours || 0} hours {schedule.triggerTiming === 'immediate' ? 'immediately' : 'delayed'} on {schedule.triggerEvent.replace(/_/g, ' ')}
                          </p>
                          {schedule.courseId && (
                            <p className="text-sm text-muted-foreground">
                              <strong>Course ID:</strong> {schedule.courseId}
                            </p>
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleEditSchedule(schedule)}
                            data-testid={`button-edit-schedule-${schedule.id}`}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() => deleteScheduleMutation.mutate(schedule.id)}
                            data-testid={`button-delete-schedule-${schedule.id}`}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Logs Tab */}
        <TabsContent value="logs" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Notification Logs</CardTitle>
            </CardHeader>
            <CardContent>
              {logsLoading ? (
                <div className="text-center py-8">Loading logs...</div>
              ) : logs.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  No notification logs found.
                </div>
              ) : (
                <div className="space-y-4">
                  {logs.map((log) => (
                    <div
                      key={log.id}
                      className="border rounded-lg p-4 hover:shadow-md transition-shadow"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <h3 className="font-semibold">Log {log.id.substring(0, 8)}</h3>
                            <Badge variant={log.type === 'email' ? 'default' : 'secondary'}>
                              {log.type === 'email' ? <Mail className="h-3 w-3 mr-1" /> : <MessageSquare className="h-3 w-3 mr-1" />}
                              {log.type.toUpperCase()}
                            </Badge>
                            <Badge variant={
                              log.status === 'sent' ? 'default' : 
                              log.status === 'failed' ? 'destructive' : 
                              'secondary'
                            }>
                              {log.status === 'sent' && <CheckCircle className="h-3 w-3 mr-1" />}
                              {log.status === 'failed' && <XCircle className="h-3 w-3 mr-1" />}
                              {log.status === 'pending' && <AlertCircle className="h-3 w-3 mr-1" />}
                              {log.status.toUpperCase()}
                            </Badge>
                          </div>
                          <p className="text-sm text-muted-foreground mb-1">
                            <strong>To:</strong> {log.recipientId} ({log.recipientEmail})
                          </p>
                          <p className="text-sm text-muted-foreground mb-1">
                            <strong>Sent:</strong> {formatDateTime(log.sentAt)}
                          </p>
                          {log.errorMessage && (
                            <p className="text-sm text-red-600">
                              <strong>Error:</strong> {log.errorMessage}
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Send Tab */}
        <TabsContent value="send" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Send One-Time Notification</CardTitle>
            </CardHeader>
            <CardContent>
              <Form {...sendForm}>
                <form onSubmit={sendForm.handleSubmit(handleSendNotification)} className="space-y-6">
                  <FormField
                    control={sendForm.control}
                    name="templateId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Template</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger data-testid="select-template">
                              <SelectValue placeholder="Select a template" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {templates.map((template) => (
                              <SelectItem key={template.id} value={template.id}>
                                {template.name} ({template.type})
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormDescription>
                          Choose the notification template to send
                        </FormDescription>
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={sendForm.control}
                    name="recipientType"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Recipient Type</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger data-testid="select-recipient-type">
                              <SelectValue placeholder="Select recipient type" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="individual">Individual Student</SelectItem>
                            <SelectItem value="course">All Students in Course</SelectItem>
                            <SelectItem value="all_students">All Students</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormDescription>
                          Choose who will receive this notification
                        </FormDescription>
                      </FormItem>
                    )}
                  />

                  <div className="flex justify-end">
                    <Button
                      type="submit"
                      disabled={sendNotificationMutation.isPending}
                      data-testid="button-send-one-time-notification"
                    >
                      {sendNotificationMutation.isPending ? (
                        "Sending..."
                      ) : (
                        <>
                          <Send className="h-4 w-4 mr-2" />
                          Send Notification
                        </>
                      )}
                    </Button>
                  </div>
                </form>
              </Form>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Template Create/Edit Dialog */}
      <Dialog open={isTemplateDialogOpen} onOpenChange={setIsTemplateDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              {selectedTemplate ? 'Edit Template' : 'Create New Template'}
            </DialogTitle>
          </DialogHeader>
          <Form {...templateForm}>
            <form onSubmit={templateForm.handleSubmit(handleSubmitTemplate)} className="space-y-4">
              <FormField
                control={templateForm.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Template Name</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="Enter template name" data-testid="input-template-name" />
                    </FormControl>
                  </FormItem>
                )}
              />

              <FormField
                control={templateForm.control}
                name="type"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Type</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger data-testid="select-template-type">
                          <SelectValue placeholder="Select template type" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="email">Email</SelectItem>
                        <SelectItem value="sms">SMS</SelectItem>
                      </SelectContent>
                    </Select>
                  </FormItem>
                )}
              />

              {templateForm.watch("type") === "email" && (
                <FormField
                  control={templateForm.control}
                  name="subject"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Subject</FormLabel>
                      <FormControl>
                        <Input {...field} value={field.value || ''} placeholder="Enter email subject" data-testid="input-template-subject" />
                      </FormControl>
                    </FormItem>
                  )}
                />
              )}

              <FormField
                control={templateForm.control}
                name="content"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Message Body</FormLabel>
                    <FormControl>
                      <Textarea 
                        {...field} 
                        placeholder="Enter message content (you can use variables like {{firstName}}, {{courseName}}, etc.)"
                        className="min-h-[120px]"
                        data-testid="textarea-template-content"
                      />
                    </FormControl>
                    <FormDescription>
                      Use variables in double braces: {"{firstName}"}, {"{lastName}"}, {"{courseName}"}, {"{startDate}"}, etc.
                    </FormDescription>
                  </FormItem>
                )}
              />

              <div className="flex items-center space-x-4">
                <FormField
                  control={templateForm.control}
                  name="isActive"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-center space-x-2 space-y-0">
                      <FormControl>
                        <Switch
                          checked={field.value}
                          onCheckedChange={field.onChange}
                          data-testid="switch-template-active"
                        />
                      </FormControl>
                      <FormLabel>Active</FormLabel>
                    </FormItem>
                  )}
                />

                <FormField
                  control={templateForm.control}
                  name="isActive"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-center space-x-2 space-y-0">
                      <FormControl>
                        <Switch
                          checked={field.value}
                          onCheckedChange={field.onChange}
                          data-testid="switch-template-global"
                        />
                      </FormControl>
                      <FormLabel>Active Template</FormLabel>
                    </FormItem>
                  )}
                />
              </div>

              <div className="flex justify-end space-x-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsTemplateDialogOpen(false)}
                  data-testid="button-cancel-template"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={createTemplateMutation.isPending || updateTemplateMutation.isPending}
                  data-testid="button-save-template"
                >
                  {createTemplateMutation.isPending || updateTemplateMutation.isPending ? (
                    "Saving..."
                  ) : (
                    selectedTemplate ? "Update Template" : "Create Template"
                  )}
                </Button>
              </div>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Schedule Create/Edit Dialog */}
      <Dialog open={isScheduleDialogOpen} onOpenChange={setIsScheduleDialogOpen}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle>
              {selectedSchedule ? 'Edit Schedule' : 'Create New Schedule'}
            </DialogTitle>
          </DialogHeader>
          <Form {...scheduleForm}>
            <form onSubmit={scheduleForm.handleSubmit(handleSubmitSchedule)} className="space-y-4">
              <FormField
                control={scheduleForm.control}
                name="templateId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Template</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger data-testid="select-schedule-template">
                          <SelectValue placeholder="Select a template" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {templates.map((template) => (
                          <SelectItem key={template.id} value={template.id}>
                            {template.name} ({template.type})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </FormItem>
                )}
              />

              <FormField
                control={scheduleForm.control}
                name="triggerEvent"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Trigger Event</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger data-testid="select-trigger-event">
                          <SelectValue placeholder="Select trigger event" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="enrollment_created">Enrollment Created</SelectItem>
                        <SelectItem value="enrollment_confirmed">Enrollment Confirmed</SelectItem>
                        <SelectItem value="payment_completed">Payment Completed</SelectItem>
                        <SelectItem value="course_start">Course Start</SelectItem>
                        <SelectItem value="course_reminder">Course Reminder</SelectItem>
                        <SelectItem value="license_expiring">License Expiring</SelectItem>
                      </SelectContent>
                    </Select>
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={scheduleForm.control}
                  name="delayDays"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Delay (Days)</FormLabel>
                      <FormControl>
                        <Input 
                          type="number" 
                          {...field} 
                          value={field.value || 0}
                          onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                          data-testid="input-trigger-delay"
                        />
                      </FormControl>
                      <FormDescription>
                        0 = immediate, positive = after, negative = before
                      </FormDescription>
                    </FormItem>
                  )}
                />

                <FormField
                  control={scheduleForm.control}
                  name="delayHours"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Delay (Hours)</FormLabel>
                        <FormControl>
                          <Input 
                            type="number" 
                            {...field} 
                            value={field.value || 0}
                            onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                            data-testid="input-delay-hours"
                          />
                        </FormControl>
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={scheduleForm.control}
                name="isActive"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-center space-x-2 space-y-0">
                    <FormControl>
                      <Switch
                        checked={field.value}
                        onCheckedChange={field.onChange}
                        data-testid="switch-schedule-active"
                      />
                    </FormControl>
                    <FormLabel>Active</FormLabel>
                  </FormItem>
                )}
              />

              <div className="flex justify-end space-x-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsScheduleDialogOpen(false)}
                  data-testid="button-cancel-schedule"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={createScheduleMutation.isPending || updateScheduleMutation.isPending}
                  data-testid="button-save-schedule"
                >
                  {createScheduleMutation.isPending || updateScheduleMutation.isPending ? (
                    "Saving..."
                  ) : (
                    selectedSchedule ? "Update Schedule" : "Create Schedule"
                  )}
                </Button>
              </div>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
}