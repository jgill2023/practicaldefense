import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Bell,
  Mail,
  MessageSquare,
  Plus,
  Edit,
  Trash2,
  Clock,
  Calendar,
  CheckCircle,
  Copy
} from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import type { CourseWithSchedules, NotificationSchedule, NotificationTemplate } from "@shared/schema";
import ReactQuill from 'react-quill';
import 'react-quill/dist/quill.snow.css';

interface CourseNotificationsModalProps {
  isOpen: boolean;
  onClose: () => void;
  course: CourseWithSchedules;
}

const notificationFormSchema = z.object({
  templateId: z.string().uuid("Please select a template"),
  triggerEvent: z.string().min(1, "Please select a trigger event"),
  triggerTiming: z.enum(["before", "after"]).optional(),
  delayDays: z.number().min(0).optional(),
  delayHours: z.number().min(0).optional(),
  isActive: z.boolean(),
});

type NotificationFormData = z.infer<typeof notificationFormSchema>;

const templateFormSchema = z.object({
  name: z.string().min(1, "Template name is required"),
  type: z.enum(["email", "sms"]),
  subject: z.string().optional(),
  content: z.string().min(1, "Message content is required"),
  isActive: z.boolean(),
});

const scheduleFormSchema = z.object({
  templateId: z.string().uuid("Please select a template"),
  triggerEvent: z.string().min(1, "Please select a trigger event"),
  triggerTiming: z.enum(["immediate", "delayed"]),
  delayDays: z.number().min(0).optional(),
  delayHours: z.number().min(0).optional(),
  isActive: z.boolean(),
});

type TemplateFormData = z.infer<typeof templateFormSchema>;

export function CourseNotificationsModal({ isOpen, onClose, course }: CourseNotificationsModalProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<"schedules" | "templates">("schedules");
  const [isCreatingSchedule, setIsCreatingSchedule] = useState(false);
  const [isCreatingTemplate, setIsCreatingTemplate] = useState(false);
  const [editingSchedule, setEditingSchedule] = useState<NotificationSchedule | null>(null);
  const [editingTemplate, setEditingTemplate] = useState<NotificationTemplate | null>(null);

  // Fetch notification schedules for this course
  const { data: schedules = [] } = useQuery<NotificationSchedule[]>({
    queryKey: ["/api/admin/notification-schedules"],
    enabled: isOpen,
  });

  // Fetch notification templates
  const { data: templates = [] } = useQuery<NotificationTemplate[]>({
    queryKey: ["/api/admin/notification-templates"],
    enabled: isOpen,
  });

  // Filter schedules for this specific course
  const courseSchedules = schedules.filter(s => s.courseId === course.id);

  // Schedule form
  const scheduleForm = useForm<NotificationFormData>({
    resolver: zodResolver(notificationFormSchema),
    defaultValues: {
      triggerEvent: "course_start",
      triggerTiming: "before",
      delayDays: 0,
      delayHours: 0,
      isActive: true,
    },
  });

  // Watch trigger event to reset timing fields when changed
  const triggerEvent = scheduleForm.watch("triggerEvent");
  
  // Reset timing fields when switching away from course_start
  if (triggerEvent !== "course_start") {
    scheduleForm.setValue("delayDays", 0);
    scheduleForm.setValue("delayHours", 0);
    scheduleForm.setValue("triggerTiming", undefined);
  }

  // Template form
  const templateForm = useForm<TemplateFormData>({
    resolver: zodResolver(templateFormSchema),
    defaultValues: {
      name: "",
      type: "email",
      subject: "",
      content: "",
      isActive: true,
    },
  });

  // Create schedule mutation
  const createScheduleMutation = useMutation({
    mutationFn: async (data: NotificationFormData) => {
      return await apiRequest("POST", "/api/admin/notification-schedules", {
        ...data,
        courseId: course.id,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/notification-schedules"] });
      setIsCreatingSchedule(false);
      scheduleForm.reset();
      toast({
        title: "Schedule Created",
        description: "Notification schedule has been created successfully.",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to create notification schedule.",
        variant: "destructive",
      });
    },
  });

  // Update schedule mutation
  const updateScheduleMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: NotificationFormData }) => {
      return await apiRequest("PUT", `/api/admin/notification-schedules/${id}`, {
        ...data,
        courseId: course.id,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/notification-schedules"] });
      setEditingSchedule(null);
      setIsCreatingSchedule(false); // Close the form after successful update
      scheduleForm.reset();
      toast({
        title: "Schedule Updated",
        description: "Notification schedule has been updated successfully.",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to update notification schedule.",
        variant: "destructive",
      });
    },
  });

  // Delete schedule mutation
  const deleteScheduleMutation = useMutation({
    mutationFn: async (id: string) => {
      return await apiRequest("DELETE", `/api/admin/notification-schedules/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/notification-schedules"] });
      toast({
        title: "Schedule Deleted",
        description: "Notification schedule has been deleted.",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to delete notification schedule.",
        variant: "destructive",
      });
    },
  });

  // Create template mutation
  const createTemplateMutation = useMutation({
    mutationFn: async (data: TemplateFormData) => {
      return await apiRequest("POST", "/api/admin/notification-templates", {
        ...data,
        courseId: course.id,
        category: "course_specific",
        createdBy: course.instructorId,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/notification-templates"] });
      setIsCreatingTemplate(false);
      templateForm.reset();
      toast({
        title: "Template Created",
        description: "Notification template has been created successfully.",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to create notification template.",
        variant: "destructive",
      });
    },
  });

  // Update template mutation
  const updateTemplateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: TemplateFormData }) => {
      return await apiRequest("PUT", `/api/admin/notification-templates/${id}`, {
        ...data,
        courseId: course.id,
        category: "course_specific",
        updatedBy: course.instructorId,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/notification-templates"] });
      setEditingTemplate(null);
      setIsCreatingTemplate(false);
      templateForm.reset();
      toast({
        title: "Template Updated",
        description: "Notification template has been updated successfully.",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to update notification template.",
        variant: "destructive",
      });
    },
  });

  // Delete template mutation
  const deleteTemplateMutation = useMutation({
    mutationFn: async (id: string) => {
      return await apiRequest("DELETE", `/api/admin/notification-templates/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/notification-templates"] });
      toast({
        title: "Template Deleted",
        description: "Notification template has been deleted.",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to delete notification template.",
        variant: "destructive",
      });
    },
  });

  // Duplicate template mutation
  const duplicateTemplateMutation = useMutation({
    mutationFn: async (template: NotificationTemplate) => {
      // Create the new template data with all required fields
      const newTemplateData = {
        name: `${template.name} (Copy)`,
        type: template.type,
        category: template.category || "course_specific",
        subject: template.subject || "",
        content: template.content,
        courseId: course.id,
        scheduleId: template.scheduleId || null,
        isActive: false, // Start duplicates as inactive
        sortOrder: template.sortOrder || 0,
        replyToEmail: template.replyToEmail || null,
        variables: template.variables || [],
      };

      console.log("Duplicating template with data:", newTemplateData);
      const response = await apiRequest("POST", "/api/admin/notification-templates", newTemplateData);
      console.log("Duplication response:", response);
      return response;
    },
    onSuccess: (data) => {
      console.log("Duplication successful, invalidating cache");
      queryClient.invalidateQueries({ queryKey: ["/api/admin/notification-templates"] });
      toast({
        title: "Template Duplicated",
        description: "Template has been duplicated successfully.",
      });
    },
    onError: (error: any) => {
      console.error("Error duplicating template:", error);
      console.error("Error stack:", error?.stack);
      console.error("Error name:", error?.name);
      toast({
        title: "Error",
        description: error?.message || "Failed to duplicate template.",
        variant: "destructive",
      });
    },
  });

  const handleSubmitSchedule = (data: NotificationFormData) => {
    if (editingSchedule) {
      updateScheduleMutation.mutate({ id: editingSchedule.id, data });
    } else {
      createScheduleMutation.mutate(data);
    }
  };

  const handleSubmitTemplate = (data: TemplateFormData) => {
    console.log("Template form submitted with data:", data);
    console.log("Form errors:", templateForm.formState.errors);
    if (editingTemplate) {
      updateTemplateMutation.mutate({ id: editingTemplate.id, data });
    } else {
      createTemplateMutation.mutate(data);
    }
  };

  const handleEditTemplate = (template: NotificationTemplate) => {
    setEditingTemplate(template);
    templateForm.reset({
      name: template.name,
      type: template.type as "email" | "sms",
      subject: template.subject || undefined,
      content: template.content,
      isActive: template.isActive,
    });
    setIsCreatingTemplate(true);
  };

  const handleDuplicateTemplate = (template: NotificationTemplate) => {
    console.log("handleDuplicateTemplate called with template:", template.id, template.name);
    duplicateTemplateMutation.mutate(template);
  };

  const handleDeleteTemplate = (template: NotificationTemplate) => {
    const deleteConfirmation = prompt(
      `Are you sure you want to delete "${template.name}"? This action cannot be undone.\n\nType DELETE to confirm:`
    );

    if (deleteConfirmation === "DELETE") {
      deleteTemplateMutation.mutate(template.id);
    } else if (deleteConfirmation !== null) {
      toast({
        title: "Deletion Cancelled",
        description: "You must type DELETE exactly to confirm deletion.",
        variant: "destructive",
      });
    }
  };

  const handleEditSchedule = (schedule: NotificationSchedule) => {
    setEditingSchedule(schedule);
    scheduleForm.reset({
      templateId: schedule.templateId,
      triggerEvent: schedule.triggerEvent,
      triggerTiming: schedule.triggerTiming,
      delayDays: schedule.delayDays || 0,
      delayHours: schedule.delayHours || 0,
      isActive: schedule.isActive,
    });
    setIsCreatingSchedule(true);
  };

  const handleDeleteSchedule = (id: string) => {
    if (confirm("Are you sure you want to delete this notification schedule?")) {
      deleteScheduleMutation.mutate(id);
    }
  };

  // Function to insert tag into the content at cursor position
  const insertTag = (tag: string) => {
    const quillEditor = document.querySelector('.ql-editor') as HTMLElement;
    if (quillEditor) {
      const selection = window.getSelection();
      const range = selection?.getRangeAt(0);
      
      if (range) {
        const textNode = document.createTextNode(tag + ' ');
        range.insertNode(textNode);
        range.setStartAfter(textNode);
        range.setEndAfter(textNode);
        selection?.removeAllRanges();
        selection?.addRange(range);
        
        // Update the form value
        templateForm.setValue("content", quillEditor.innerHTML, { shouldValidate: true });
      }
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Bell className="h-5 w-5" />
            Course Notifications - {course.title}
          </DialogTitle>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as typeof activeTab)}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="schedules">
              <Calendar className="h-4 w-4 mr-2" />
              Schedules ({courseSchedules.length})
            </TabsTrigger>
            <TabsTrigger value="templates">
              <Mail className="h-4 w-4 mr-2" />
              Templates
            </TabsTrigger>
          </TabsList>

          {/* Notification Schedules Tab */}
          <TabsContent value="schedules" className="space-y-4">
            <div className="flex justify-between items-center">
              <p className="text-sm text-muted-foreground">
                Manage automatic notifications for this course
              </p>
              <Button
                size="sm"
                onClick={() => {
                  setEditingSchedule(null);
                  scheduleForm.reset();
                  setIsCreatingSchedule(true);
                }}
                data-testid="button-create-schedule"
              >
                <Plus className="h-4 w-4 mr-2" />
                New Schedule
              </Button>
            </div>

            {isCreatingSchedule && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">
                    {editingSchedule ? "Edit Schedule" : "Create Schedule"}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <form onSubmit={scheduleForm.handleSubmit(handleSubmitSchedule)} className="space-y-4">
                    <div>
                      <Label htmlFor="templateId">Template</Label>
                      <Select
                        value={scheduleForm.watch("templateId")}
                        onValueChange={(value) => scheduleForm.setValue("templateId", value)}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select a template" />
                        </SelectTrigger>
                        <SelectContent>
                          {templates.map((template) => (
                            <SelectItem key={template.id} value={template.id}>
                              <div className="flex items-center gap-2">
                                {template.type === "email" ? (
                                  <Mail className="h-4 w-4" />
                                ) : (
                                  <MessageSquare className="h-4 w-4" />
                                )}
                                {template.name}
                              </div>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      {scheduleForm.formState.errors.templateId && (
                        <p className="text-sm text-destructive mt-1">
                          {scheduleForm.formState.errors.templateId.message}
                        </p>
                      )}
                    </div>

                    <div>
                      <Label htmlFor="triggerEvent">Trigger Event</Label>
                      <Select
                        value={scheduleForm.watch("triggerEvent")}
                        onValueChange={(value) => scheduleForm.setValue("triggerEvent", value)}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select trigger event" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="course_start">Course Start</SelectItem>
                          <SelectItem value="enrollment_created">Enrollment Created</SelectItem>
                          <SelectItem value="enrollment_confirmed">Enrollment Confirmed</SelectItem>
                          <SelectItem value="payment_completed">Payment Completed</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-4">
                      {/* Only show timing selector for course_start trigger */}
                      {scheduleForm.watch("triggerEvent") === "course_start" && (
                        <div>
                          <Label>Send Notification</Label>
                          <Select
                            value={scheduleForm.watch("triggerTiming")}
                            onValueChange={(value: "before" | "after") => scheduleForm.setValue("triggerTiming", value)}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="When to send" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="before">Before course start</SelectItem>
                              <SelectItem value="after">After course start</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      )}

                      {/* Show delay inputs for all triggers */}
                      {scheduleForm.watch("triggerEvent") === "course_start" ? (
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <Label htmlFor="delayDays">Days</Label>
                            <Input
                              id="delayDays"
                              type="number"
                              min="0"
                              {...scheduleForm.register("delayDays", { valueAsNumber: true })}
                              placeholder="0"
                            />
                          </div>
                          <div>
                            <Label htmlFor="delayHours">Hours</Label>
                            <Input
                              id="delayHours"
                              type="number"
                              min="0"
                              {...scheduleForm.register("delayHours", { valueAsNumber: true })}
                              placeholder="0"
                            />
                          </div>
                        </div>
                      ) : (
                        <div className="rounded-md bg-muted p-3">
                          <p className="text-sm text-muted-foreground">
                            This notification will be sent <strong>immediately</strong> when {scheduleForm.watch("triggerEvent")?.replace(/_/g, " ")} occurs.
                          </p>
                        </div>
                      )}

                      {/* Show timing summary only for course_start */}
                      {scheduleForm.watch("triggerEvent") === "course_start" && 
                       (scheduleForm.watch("delayDays") > 0 || scheduleForm.watch("delayHours") > 0) && (
                        <p className="text-sm text-muted-foreground">
                          Will send {scheduleForm.watch("delayDays") || 0} days and {scheduleForm.watch("delayHours") || 0} hours{" "}
                          <strong>{scheduleForm.watch("triggerTiming") === "before" ? "before" : "after"}</strong> course start
                        </p>
                      )}
                    </div>

                    <div className="flex items-center space-x-2">
                      <Switch
                        id="isActive"
                        checked={scheduleForm.watch("isActive")}
                        onCheckedChange={(checked) => scheduleForm.setValue("isActive", checked)}
                      />
                      <Label htmlFor="isActive">Active</Label>
                    </div>

                    <div className="flex justify-end gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => {
                          setIsCreatingSchedule(false);
                          setEditingSchedule(null);
                          scheduleForm.reset();
                        }}
                      >
                        Cancel
                      </Button>
                      <Button
                        type="submit"
                        disabled={createScheduleMutation.isPending || updateScheduleMutation.isPending}
                      >
                        {editingSchedule ? "Update" : "Create"} Schedule
                      </Button>
                    </div>
                  </form>
                </CardContent>
              </Card>
            )}

            {courseSchedules.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Calendar className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>No notification schedules configured for this course.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {courseSchedules.map((schedule) => {
                  const template = templates.find(t => t.id === schedule.templateId);
                  return (
                    <Card key={schedule.id}>
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2">
                              <h4 className="font-medium">
                                {template?.name || "Unknown Template"}
                              </h4>
                              <Badge variant={schedule.isActive ? "default" : "secondary"}>
                                {schedule.isActive ? "Active" : "Inactive"}
                              </Badge>
                              <Badge variant="outline">
                                {template?.type === "email" ? (
                                  <Mail className="h-3 w-3 mr-1" />
                                ) : (
                                  <MessageSquare className="h-3 w-3 mr-1" />
                                )}
                                {template?.type}
                              </Badge>
                            </div>
                            <p className="text-sm text-muted-foreground">
                              Trigger: {schedule.triggerEvent.replace(/_/g, " ")}
                              {schedule.triggerEvent === "course_start" ? (
                                schedule.delayDays || schedule.delayHours ? (
                                  <> • Send {schedule.delayDays || 0}d {schedule.delayHours || 0}h {schedule.triggerTiming === "before" ? "before" : "after"}</>
                                ) : (
                                  <> • Send immediately</>
                                )
                              ) : (
                                <> • Send immediately upon trigger</>
                              )}
                            </p>
                          </div>
                          <div className="flex gap-2">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleEditSchedule(schedule)}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button
                              size="sm"
                              variant="destructive"
                              onClick={() => handleDeleteSchedule(schedule.id)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}
          </TabsContent>

          {/* Templates Tab */}
          <TabsContent value="templates" className="space-y-4">
            <div className="flex justify-between items-center">
              <p className="text-sm text-muted-foreground">
                Create custom notification templates for this course
              </p>
              <Button
                size="sm"
                onClick={() => {
                  templateForm.reset();
                  setIsCreatingTemplate(true);
                  setEditingTemplate(null); // Ensure we are in create mode
                }}
              >
                <Plus className="h-4 w-4 mr-2" />
                New Template
              </Button>
            </div>

            {isCreatingTemplate && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">
                    {editingTemplate ? "Edit Template" : "Create Template"}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <form onSubmit={templateForm.handleSubmit(handleSubmitTemplate)} className="space-y-4">
                    <div>
                      <Label htmlFor="name">Template Name</Label>
                      <Input
                        id="name"
                        {...templateForm.register("name")}
                        placeholder="e.g., Course Reminder Email"
                      />
                      {templateForm.formState.errors.name && (
                        <p className="text-sm text-destructive mt-1">
                          {templateForm.formState.errors.name.message}
                        </p>
                      )}
                    </div>

                    <div>
                      <Label htmlFor="type">Type</Label>
                      <Select
                        value={templateForm.watch("type")}
                        onValueChange={(value: "email" | "sms") => templateForm.setValue("type", value)}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="email">
                            <div className="flex items-center gap-2">
                              <Mail className="h-4 w-4" />
                              Email
                            </div>
                          </SelectItem>
                          <SelectItem value="sms">
                            <div className="flex items-center gap-2">
                              <MessageSquare className="h-4 w-4" />
                              SMS
                            </div>
                          </SelectItem>
                        </SelectContent>
                      </Select>
                      {templateForm.formState.errors.type && (
                        <p className="text-sm text-destructive mt-1">
                          {templateForm.formState.errors.type.message}
                        </p>
                      )}
                    </div>

                    {templateForm.watch("type") === "email" && (
                      <div>
                        <Label htmlFor="subject">Subject</Label>
                        <Input
                          id="subject"
                          {...templateForm.register("subject")}
                          placeholder="e.g., Reminder: {{courseName}} starts tomorrow"
                        />
                        {templateForm.formState.errors.subject && (
                          <p className="text-sm text-destructive mt-1">
                            {templateForm.formState.errors.subject.message}
                          </p>
                        )}
                      </div>
                    )}

                    <div>
                      <Label htmlFor="content">Message Content</Label>
                      <div className="flex flex-col gap-2">
                        <div className="space-y-1">
                          <div className="text-xs font-medium text-muted-foreground">Student Information</div>
                          <div className="flex flex-wrap gap-1">
                            <Button size="sm" type="button" variant="outline" className="h-7 text-xs px-2" onClick={() => insertTag("{{firstName}}")}>First Name</Button>
                            <Button size="sm" type="button" variant="outline" className="h-7 text-xs px-2" onClick={() => insertTag("{{lastName}}")}>Last Name</Button>
                          </div>
                        </div>
                        
                        <div className="space-y-1">
                          <div className="text-xs font-medium text-muted-foreground">Course Details</div>
                          <div className="flex flex-wrap gap-1">
                            <Button size="sm" type="button" variant="outline" className="h-7 text-xs px-2" onClick={() => insertTag("{{courseName}}")}>Course Name</Button>
                            <Button size="sm" type="button" variant="outline" className="h-7 text-xs px-2" onClick={() => insertTag("{{courseAbbreviation}}")}>Course Code</Button>
                            <Button size="sm" type="button" variant="outline" className="h-7 text-xs px-2" onClick={() => insertTag("{{courseDescription}}")}>Description</Button>
                            <Button size="sm" type="button" variant="outline" className="h-7 text-xs px-2" onClick={() => insertTag("{{coursePrice}}")}>Price</Button>
                            <Button size="sm" type="button" variant="outline" className="h-7 text-xs px-2" onClick={() => insertTag("{{courseDuration}}")}>Duration</Button>
                          </div>
                        </div>

                        <div className="space-y-1">
                          <div className="text-xs font-medium text-muted-foreground">Schedule Details</div>
                          <div className="flex flex-wrap gap-1">
                            <Button size="sm" type="button" variant="outline" className="h-7 text-xs px-2" onClick={() => insertTag("{{startDate}}")}>Start Date</Button>
                            <Button size="sm" type="button" variant="outline" className="h-7 text-xs px-2" onClick={() => insertTag("{{endDate}}")}>End Date</Button>
                            <Button size="sm" type="button" variant="outline" className="h-7 text-xs px-2" onClick={() => insertTag("{{startTime}}")}>Start Time</Button>
                            <Button size="sm" type="button" variant="outline" className="h-7 text-xs px-2" onClick={() => insertTag("{{endTime}}")}>End Time</Button>
                            <Button size="sm" type="button" variant="outline" className="h-7 text-xs px-2" onClick={() => insertTag("{{dayOfWeek}}")}>Day of Week</Button>
                            <Button size="sm" type="button" variant="outline" className="h-7 text-xs px-2" onClick={() => insertTag("{{location}}")}>Location</Button>
                          </div>
                        </div>

                        <div className="space-y-1">
                          <div className="text-xs font-medium text-muted-foreground">Backend Details</div>
                          <div className="flex flex-wrap gap-1">
                            <Button size="sm" type="button" variant="outline" className="h-7 text-xs px-2" onClick={() => insertTag("{{rangeName}}")}>Range Name</Button>
                            <Button size="sm" type="button" variant="outline" className="h-7 text-xs px-2" onClick={() => insertTag("{{classroomName}}")}>Classroom</Button>
                            <Button size="sm" type="button" variant="outline" className="h-7 text-xs px-2" onClick={() => insertTag("{{arrivalTime}}")}>Arrival Time</Button>
                            <Button size="sm" type="button" variant="outline" className="h-7 text-xs px-2" onClick={() => insertTag("{{departureTime}}")}>Departure Time</Button>
                            <Button size="sm" type="button" variant="outline" className="h-7 text-xs px-2" onClick={() => insertTag("{{googleMapsLink}}")}>Maps Link</Button>
                          </div>
                        </div>

                        <div className="space-y-1">
                          <div className="text-xs font-medium text-muted-foreground">Instructor Information</div>
                          <div className="flex flex-wrap gap-1">
                            <Button size="sm" type="button" variant="outline" className="h-7 text-xs px-2" onClick={() => insertTag("{{instructorName}}")}>Instructor Name</Button>
                            <Button size="sm" type="button" variant="outline" className="h-7 text-xs px-2" onClick={() => insertTag("{{instructorEmail}}")}>Instructor Email</Button>
                            <Button size="sm" type="button" variant="outline" className="h-7 text-xs px-2" onClick={() => insertTag("{{instructorPhone}}")}>Instructor Phone</Button>
                          </div>
                        </div>

                        <ReactQuill
                          theme="snow"
                          value={templateForm.watch("content") || ""}
                          onChange={(value) => {
                            templateForm.setValue("content", value, { shouldValidate: true });
                          }}
                          modules={{
                            toolbar: [
                              [{ 'header': [1, 2, false] }],
                              ['bold', 'italic', 'underline'],
                              ['link', 'image'],
                              [{ 'list': 'ordered'}, { 'list': 'bullet' }],
                              ['clean']
                            ]
                          }}
                          className="h-64" // Taller message area
                        />
                      </div>
                      {templateForm.formState.errors.content && (
                        <p className="text-sm text-destructive mt-1">
                          {templateForm.formState.errors.content.message}
                        </p>
                      )}
                    </div>

                    <div className="flex items-center space-x-2">
                      <Switch
                        id="templateActive"
                        checked={templateForm.watch("isActive")}
                        onCheckedChange={(checked) => templateForm.setValue("isActive", checked)}
                      />
                      <Label htmlFor="templateActive">Active</Label>
                    </div>

                    <div className="flex justify-end gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => {
                          setIsCreatingTemplate(false);
                          setEditingTemplate(null);
                          templateForm.reset();
                        }}
                      >
                        Cancel
                      </Button>
                      <Button
                        type="submit"
                        disabled={createTemplateMutation.isPending || updateTemplateMutation.isPending}
                      >
                        {editingTemplate ? "Update" : "Create"} Template
                      </Button>
                    </div>
                  </form>
                </CardContent>
              </Card>
            )}

            <div className="space-y-3">
              {templates
                .filter(t => t.courseId === course.id)
                .map((template) => (
                  <Card key={template.id}>
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <h4 className="font-medium">{template.name}</h4>
                            <Badge variant={template.isActive ? "default" : "secondary"}>
                              {template.isActive ? "Active" : "Inactive"}
                            </Badge>
                            <Badge variant="outline">
                              {template.type === "email" ? (
                                <Mail className="h-3 w-3 mr-1" />
                              ) : (
                                <MessageSquare className="h-3 w-3 mr-1" />
                              )}
                              {template.type}
                            </Badge>
                          </div>
                          {template.subject && (
                            <p className="text-sm text-muted-foreground mb-1">
                              Subject: {template.subject}
                            </p>
                          )}
                        </div>
                        <div className="flex gap-2 ml-4">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleEditTemplate(template)}
                            title="Edit template"
                            data-testid={`button-edit-template-${template.id}`}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleDuplicateTemplate(template)}
                            title="Duplicate template"
                            disabled={duplicateTemplateMutation.isPending}
                            data-testid={`button-duplicate-template-${template.id}`}
                          >
                            <Copy className="h-4 w-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() => handleDeleteTemplate(template)}
                            title="Delete template"
                            disabled={deleteTemplateMutation.isPending}
                            data-testid={`button-delete-template-${template.id}`}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
            </div>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}