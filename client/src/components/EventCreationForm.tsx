import { useState } from "react";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { 
  CalendarIcon, 
  Clock, 
  MapPin, 
  Users, 
  Plus, 
  Trash2,
  Info,
  Repeat,
  Settings
} from "lucide-react";
import type { CourseWithSchedules, InsertCourseSchedule, EventCategory, RecurrencePattern } from "@shared/schema";

// Form validation schema
const eventSchema = z.object({
  courseId: z.string().min(1, "Please select a course"),
  startDate: z.string().min(1, "Start date is required"),
  endDate: z.string().min(1, "End date is required"),
  startTime: z.string().min(1, "Start time is required"),
  endTime: z.string().min(1, "End time is required"),
  location: z.string().optional(),
  maxSpots: z.number().min(1, "Must have at least 1 spot").max(100, "Cannot exceed 100 spots"),
  eventCategory: z.string().optional(),
  notes: z.string().optional(),
  
  // Multi-day event fields
  isMultiDay: z.boolean().default(false),
  eventSessions: z.array(z.object({
    sessionDate: z.string(),
    startTime: z.string(),
    endTime: z.string(),
    sessionTitle: z.string().optional(),
    sessionDescription: z.string().optional(),
    location: z.string().optional(),
    isRequired: z.boolean().default(true),
  })).optional(),
  
  // Recurring event fields
  isRecurring: z.boolean().default(false),
  recurrencePattern: z.enum(['daily', 'weekly', 'monthly', 'custom']).optional(),
  recurrenceInterval: z.number().min(1).max(52).optional(),
  recurrenceEndDate: z.string().optional(),
  daysOfWeek: z.array(z.number()).optional(),
  
  // Registration settings
  registrationDeadline: z.string().optional(),
  waitlistEnabled: z.boolean().default(true),
  autoConfirmRegistration: z.boolean().default(true),
});

type EventFormData = z.infer<typeof eventSchema>;

interface EventCreationFormProps {
  onClose: () => void;
  onEventCreated?: () => void;
}

export function EventCreationForm({ onClose, onEventCreated }: EventCreationFormProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [currentTab, setCurrentTab] = useState("basic");

  // Fetch available courses
  const { data: courses = [] } = useQuery<CourseWithSchedules[]>({
    queryKey: ["/api/instructor/courses"],
  });

  const form = useForm<EventFormData>({
    resolver: zodResolver(eventSchema),
    defaultValues: {
      isMultiDay: false,
      isRecurring: false,
      maxSpots: 20,
      waitlistEnabled: true,
      autoConfirmRegistration: true,
      eventSessions: [],
      daysOfWeek: [],
      recurrenceInterval: 1,
    },
  });

  const { fields: sessionFields, append: appendSession, remove: removeSession } = useFieldArray({
    control: form.control,
    name: "eventSessions",
  });

  // Create event mutation
  const createEventMutation = useMutation({
    mutationFn: async (data: EventFormData) => {
      const response = await apiRequest("POST", "/api/instructor/events", data);
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Event Created",
        description: "Your training event has been created successfully.",
      });
      // Invalidate multiple queries to refresh all event displays
      queryClient.invalidateQueries({ queryKey: ["/api/instructor/courses"] });
      queryClient.invalidateQueries({ queryKey: ["/api/instructor/courses-detailed"] });
      queryClient.invalidateQueries({ queryKey: ["/api/instructor/dashboard-stats"] });
      queryClient.invalidateQueries({ queryKey: ["/api/instructor/events"] });
      queryClient.invalidateQueries({ queryKey: ["/api/course-schedules"] });
      queryClient.invalidateQueries({ queryKey: ["/api/courses"] });
      onEventCreated?.();
      onClose();
    },
    onError: (error) => {
      toast({
        title: "Error Creating Event",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const isMultiDay = form.watch("isMultiDay");
  const isRecurring = form.watch("isRecurring");
  const recurrencePattern = form.watch("recurrencePattern");

  const onSubmit = (data: EventFormData) => {
    // Only submit if we're on the final tab and have all required data
    if (currentTab !== "settings") {
      toast({
        title: "Complete the form",
        description: "Please complete all tabs before creating the event.",
        variant: "destructive",
      });
      return;
    }
    
    // Validate required fields
    if (!data.courseId || !data.startDate || !data.endDate) {
      toast({
        title: "Missing Required Fields",
        description: "Please fill in course, start date, and end date.",
        variant: "destructive",
      });
      return;
    }
    
    // Process the form data
    const processedData = {
      ...data,
      availableSpots: data.maxSpots, // Initially all spots are available
    };
    
    // Convert daysOfWeek array to comma-separated string for the API
    const apiData = {
      ...processedData,
      daysOfWeek: data.daysOfWeek?.join(','),
    };
    
    createEventMutation.mutate(apiData as any);
  };

  const addSession = () => {
    const newSession = {
      sessionDate: '',
      startTime: '09:00',
      endTime: '17:00',
      sessionTitle: '',
      sessionDescription: '',
      location: '',
      isRequired: true,
    };
    appendSession(newSession);
  };

  const eventCategories: EventCategory[] = ['basic', 'advanced', 'concealed', 'specialty', 'refresher'];
  const recurrencePatterns: RecurrencePattern[] = ['daily', 'weekly', 'monthly', 'custom'];
  const daysOfWeek = [
    { value: 1, label: 'Monday' },
    { value: 2, label: 'Tuesday' },
    { value: 3, label: 'Wednesday' },
    { value: 4, label: 'Thursday' },
    { value: 5, label: 'Friday' },
    { value: 6, label: 'Saturday' },
    { value: 0, label: 'Sunday' },
  ];

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6" onKeyDown={(e) => {
      // Prevent form submission when pressing Enter unless on the submit button
      if (e.key === 'Enter' && e.target !== e.currentTarget) {
        e.preventDefault();
      }
    }}>
      <Tabs value={currentTab} onValueChange={setCurrentTab} className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="basic">Basic Info</TabsTrigger>
          <TabsTrigger value="schedule">Schedule</TabsTrigger>
          <TabsTrigger value="sessions" disabled={!isMultiDay}>Sessions</TabsTrigger>
          <TabsTrigger value="settings">Settings</TabsTrigger>
        </TabsList>

        {/* Basic Information Tab */}
        <TabsContent value="basic" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Info className="h-5 w-5" />
                <span>Event Information</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="courseId">Course *</Label>
                <Select onValueChange={(value) => form.setValue("courseId", value)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a course" />
                  </SelectTrigger>
                  <SelectContent>
                    {courses.map((course) => (
                      <SelectItem key={course.id} value={course.id}>
                        {course.title}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {form.formState.errors.courseId && (
                  <p className="text-sm text-destructive mt-1">{form.formState.errors.courseId.message}</p>
                )}
              </div>

              <div>
                <Label htmlFor="eventCategory">Event Category</Label>
                <Select onValueChange={(value) => form.setValue("eventCategory", value)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select category" />
                  </SelectTrigger>
                  <SelectContent>
                    {eventCategories.map((category) => (
                      <SelectItem key={category} value={category}>
                        {category.charAt(0).toUpperCase() + category.slice(1)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="maxSpots">Maximum Spots *</Label>
                  <Input
                    id="maxSpots"
                    type="number"
                    min="1"
                    max="100"
                    {...form.register("maxSpots", { valueAsNumber: true })}
                  />
                  {form.formState.errors.maxSpots && (
                    <p className="text-sm text-destructive mt-1">{form.formState.errors.maxSpots.message}</p>
                  )}
                </div>

                <div>
                  <Label htmlFor="location">Location</Label>
                  <Input
                    id="location"
                    placeholder="e.g., Shooting Range A"
                    {...form.register("location")}
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="notes">Additional Notes</Label>
                <Textarea
                  id="notes"
                  placeholder="Any special requirements or information..."
                  {...form.register("notes")}
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Schedule Tab */}
        <TabsContent value="schedule" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <CalendarIcon className="h-5 w-5" />
                <span>Event Schedule</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="startDate">Start Date *</Label>
                  <Input
                    id="startDate"
                    type="date"
                    {...form.register("startDate")}
                  />
                  {form.formState.errors.startDate && (
                    <p className="text-sm text-destructive mt-1">{form.formState.errors.startDate.message}</p>
                  )}
                </div>

                <div>
                  <Label htmlFor="endDate">End Date *</Label>
                  <Input
                    id="endDate"
                    type="date"
                    {...form.register("endDate")}
                  />
                  {form.formState.errors.endDate && (
                    <p className="text-sm text-destructive mt-1">{form.formState.errors.endDate.message}</p>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="startTime">Start Time *</Label>
                  <Input
                    id="startTime"
                    type="time"
                    {...form.register("startTime")}
                  />
                  {form.formState.errors.startTime && (
                    <p className="text-sm text-destructive mt-1">{form.formState.errors.startTime.message}</p>
                  )}
                </div>

                <div>
                  <Label htmlFor="endTime">End Time *</Label>
                  <Input
                    id="endTime"
                    type="time"
                    {...form.register("endTime")}
                  />
                  {form.formState.errors.endTime && (
                    <p className="text-sm text-destructive mt-1">{form.formState.errors.endTime.message}</p>
                  )}
                </div>
              </div>

              <Separator />

              {/* Multi-day Event Toggle */}
              <div className="flex items-center space-x-2">
                <Switch
                  id="isMultiDay"
                  checked={isMultiDay}
                  onCheckedChange={(checked) => form.setValue("isMultiDay", checked)}
                />
                <Label htmlFor="isMultiDay">Multi-day event with individual sessions</Label>
              </div>

              {/* Recurring Event Section */}
              <div className="space-y-4">
                <div className="flex items-center space-x-2">
                  <Switch
                    id="isRecurring"
                    checked={isRecurring}
                    onCheckedChange={(checked) => form.setValue("isRecurring", checked)}
                  />
                  <Label htmlFor="isRecurring">Recurring event</Label>
                </div>

                {isRecurring && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center space-x-2 text-lg">
                        <Repeat className="h-4 w-4" />
                        <span>Recurrence Settings</span>
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <Label htmlFor="recurrencePattern">Pattern</Label>
                          <Select onValueChange={(value) => form.setValue("recurrencePattern", value as RecurrencePattern)}>
                            <SelectTrigger>
                              <SelectValue placeholder="Select pattern" />
                            </SelectTrigger>
                            <SelectContent>
                              {recurrencePatterns.map((pattern) => (
                                <SelectItem key={pattern} value={pattern}>
                                  {pattern.charAt(0).toUpperCase() + pattern.slice(1)}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>

                        <div>
                          <Label htmlFor="recurrenceInterval">Every</Label>
                          <Input
                            id="recurrenceInterval"
                            type="number"
                            min="1"
                            max="52"
                            placeholder="1"
                            {...form.register("recurrenceInterval", { valueAsNumber: true })}
                          />
                        </div>
                      </div>

                      {recurrencePattern === 'weekly' && (
                        <div>
                          <Label>Days of the week</Label>
                          <div className="flex flex-wrap gap-2 mt-2">
                            {daysOfWeek.map((day) => (
                              <div key={day.value} className="flex items-center space-x-2">
                                <Checkbox
                                  id={`day-${day.value}`}
                                  checked={form.watch("daysOfWeek")?.includes(day.value)}
                                  onCheckedChange={(checked) => {
                                    const currentDays = form.watch("daysOfWeek") || [];
                                    if (checked) {
                                      form.setValue("daysOfWeek", [...currentDays, day.value]);
                                    } else {
                                      form.setValue("daysOfWeek", currentDays.filter(d => d !== day.value));
                                    }
                                  }}
                                />
                                <Label htmlFor={`day-${day.value}`} className="text-sm">
                                  {day.label}
                                </Label>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      <div>
                        <Label htmlFor="recurrenceEndDate">End Date</Label>
                        <Input
                          id="recurrenceEndDate"
                          type="date"
                          {...form.register("recurrenceEndDate")}
                        />
                      </div>
                    </CardContent>
                  </Card>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Sessions Tab (for multi-day events) */}
        <TabsContent value="sessions" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <Clock className="h-5 w-5" />
                  <span>Event Sessions</span>
                </div>
                <Button type="button" onClick={addSession} size="sm">
                  <Plus className="h-4 w-4 mr-1" />
                  Add Session
                </Button>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {sessionFields.length === 0 ? (
                <div className="text-center py-6 text-muted-foreground">
                  <Clock className="h-8 w-8 mx-auto mb-2" />
                  <p>No sessions added yet. Click "Add Session" to get started.</p>
                </div>
              ) : (
                sessionFields.map((session, index) => (
                  <Card key={session.id} className="p-4">
                    <div className="flex items-start justify-between mb-4">
                      <h4 className="font-medium">Session {index + 1}</h4>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => removeSession(index)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor={`eventSessions.${index}.sessionDate`}>Date</Label>
                        <Input
                          type="date"
                          {...form.register(`eventSessions.${index}.sessionDate`)}
                        />
                      </div>
                      
                      <div>
                        <Label htmlFor={`eventSessions.${index}.sessionTitle`}>Title</Label>
                        <Input
                          placeholder="Session title"
                          {...form.register(`eventSessions.${index}.sessionTitle`)}
                        />
                      </div>
                      
                      <div>
                        <Label htmlFor={`eventSessions.${index}.startTime`}>Start Time</Label>
                        <Input
                          type="time"
                          {...form.register(`eventSessions.${index}.startTime`)}
                        />
                      </div>
                      
                      <div>
                        <Label htmlFor={`eventSessions.${index}.endTime`}>End Time</Label>
                        <Input
                          type="time"
                          {...form.register(`eventSessions.${index}.endTime`)}
                        />
                      </div>
                      
                      <div className="col-span-2">
                        <Label htmlFor={`eventSessions.${index}.location`}>Location</Label>
                        <Input
                          placeholder="Session location"
                          {...form.register(`eventSessions.${index}.location`)}
                        />
                      </div>
                      
                      <div className="col-span-2">
                        <Label htmlFor={`eventSessions.${index}.sessionDescription`}>Description</Label>
                        <Textarea
                          placeholder="Session description"
                          {...form.register(`eventSessions.${index}.sessionDescription`)}
                        />
                      </div>
                      
                      <div className="col-span-2">
                        <div className="flex items-center space-x-2">
                          <Switch
                            id={`eventSessions.${index}.isRequired`}
                            checked={form.watch(`eventSessions.${index}.isRequired`)}
                            onCheckedChange={(checked) => form.setValue(`eventSessions.${index}.isRequired`, checked)}
                          />
                          <Label htmlFor={`eventSessions.${index}.isRequired`}>Required session</Label>
                        </div>
                      </div>
                    </div>
                  </Card>
                ))
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Settings Tab */}
        <TabsContent value="settings" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Settings className="h-5 w-5" />
                <span>Registration Settings</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="registrationDeadline">Registration Deadline</Label>
                <Input
                  id="registrationDeadline"
                  type="datetime-local"
                  {...form.register("registrationDeadline")}
                />
              </div>

              <div className="flex items-center space-x-2">
                <Switch
                  id="waitlistEnabled"
                  checked={form.watch("waitlistEnabled")}
                  onCheckedChange={(checked) => form.setValue("waitlistEnabled", checked)}
                />
                <Label htmlFor="waitlistEnabled">Enable waitlist when full</Label>
              </div>

              <div className="flex items-center space-x-2">
                <Switch
                  id="autoConfirmRegistration"
                  checked={form.watch("autoConfirmRegistration")}
                  onCheckedChange={(checked) => form.setValue("autoConfirmRegistration", checked)}
                />
                <Label htmlFor="autoConfirmRegistration">Auto-confirm registrations</Label>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Form Actions */}
      <div className="flex items-center justify-between pt-6">
        <Button type="button" variant="outline" onClick={onClose}>
          Cancel
        </Button>
        <div className="space-x-2">
          {currentTab !== "basic" && (
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                const tabs = ["basic", "schedule", "sessions", "settings"];
                const currentIndex = tabs.indexOf(currentTab);
                if (currentIndex > 0) {
                  setCurrentTab(tabs[currentIndex - 1]);
                }
              }}
            >
              Previous
            </Button>
          )}
          {currentTab !== "settings" ? (
            <Button
              type="button"
              onClick={() => {
                const tabs = ["basic", "schedule", "sessions", "settings"];
                const currentIndex = tabs.indexOf(currentTab);
                if (currentIndex < tabs.length - 1) {
                  let nextTab = tabs[currentIndex + 1];
                  // Skip sessions tab if not multi-day
                  if (nextTab === "sessions" && !isMultiDay) {
                    nextTab = "settings";
                  }
                  setCurrentTab(nextTab);
                }
              }}
            >
              Next
            </Button>
          ) : (
            <Button type="submit" disabled={createEventMutation.isPending}>
              {createEventMutation.isPending ? "Creating..." : "Create Event"}
            </Button>
          )}
        </div>
      </div>
    </form>
  );
}