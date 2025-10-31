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
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
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
  Settings,
  Image as ImageIcon,
  Upload
} from "lucide-react";
import type { CourseWithSchedules, InsertCourseSchedule, EventCategory, RecurrencePattern, Category } from "@shared/schema";
import { ObjectUploader } from "@/components/ObjectUploader";


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

  // Backend Details fields
  rangeName: z.string().optional(),
  classroomName: z.string().optional(),
  arrivalTime: z.string().optional(),
  departureTime: z.string().optional(),
  dayOfWeek: z.string().optional(),
  googleMapsLink: z.string().optional(),
  rangeLocationImageUrl: z.string().optional(),

  // Registration settings
  registrationDeadline: z.string().optional(),
  waitlistEnabled: z.boolean().default(true),
  autoConfirmRegistration: z.boolean().default(true),
});

type EventFormData = z.infer<typeof eventSchema>;

interface EventCreationFormProps {
  isOpen?: boolean;
  onClose: () => void;
  onEventCreated?: () => void;
  preSelectedCourseId?: string;
}

export function EventCreationForm({ isOpen = false, onClose, onEventCreated, preSelectedCourseId }: EventCreationFormProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [currentTab, setCurrentTab] = useState("basic");
  const [uploadingImage, setUploadingImage] = useState(false);

  // Fetch available courses
  const { data: courses = [] } = useQuery<CourseWithSchedules[]>({
    queryKey: ["/api/instructor/courses"],
  });

  // Fetch categories from API
  const { data: categories = [] } = useQuery<Category[]>({
    queryKey: ['/api/categories'],
  });

  const form = useForm<EventFormData>({
    resolver: zodResolver(eventSchema),
    defaultValues: {
      courseId: preSelectedCourseId || "",
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
      return await apiRequest("POST", "/api/instructor/events", data);
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
    console.log('Form submission attempted - current tab:', currentTab);
    console.log('Form data:', data);
    console.log('Form errors:', form.formState.errors);

    // Only submit if we're on the final tab and have all required data
    if (currentTab !== "settings") {
      console.log('Preventing submission - not on settings tab');
      toast({
        title: "Complete the form",
        description: "Please complete all tabs before creating the event.",
        variant: "destructive",
      });
      return;
    }

    // Validate required fields
    if (!data.courseId || !data.startDate || !data.endDate) {
      console.log('Missing required fields:', { 
        courseId: data.courseId, 
        startDate: data.startDate, 
        endDate: data.endDate 
      });
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

  // Use dynamic categories from API instead of hardcoded ones
  const activeCategories = categories.filter(category => category.isActive);
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
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-2">
            <CalendarIcon className="h-5 w-5" />
            <span>Create New Training Event</span>
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={(e) => {
          e.preventDefault();
          console.log('Form native submit prevented - current tab:', currentTab);

          // Only allow submission on settings tab
          if (currentTab === "settings") {
            console.log('Proceeding with form submission');
            form.handleSubmit(onSubmit)(e);
          } else {
            console.log('Blocking submission - not on settings tab');
          }
        }} className="space-y-6" onKeyDown={(e) => {
          // Prevent form submission when pressing Enter
          if (e.key === 'Enter') {
            e.preventDefault();
          }
        }}>
      <Tabs value={currentTab} onValueChange={setCurrentTab} className="w-full">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="basic">Basic Info</TabsTrigger>
          <TabsTrigger value="schedule">Schedule</TabsTrigger>
          <TabsTrigger value="sessions" disabled={!isMultiDay}>Sessions</TabsTrigger>
          <TabsTrigger value="backend">Backend Details</TabsTrigger>
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
                <Select 
                  value={form.watch("courseId") || ""}
                  onValueChange={(value) => form.setValue("courseId", value)}
                >
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
                <Select 
                  value={form.watch("eventCategory") || ""}
                  onValueChange={(value) => form.setValue("eventCategory", value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select category" />
                  </SelectTrigger>
                  <SelectContent>
                    {activeCategories.map((category) => (
                      <SelectItem key={category.id} value={category.name}>
                        <div className="flex items-center gap-2">
                          <div 
                            className="w-3 h-3 rounded-full" 
                            style={{ backgroundColor: category.color || '#3b82f6' }}
                          />
                          {category.name}
                        </div>
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

        {/* Backend Details Tab */}
        <TabsContent value="backend" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <MapPin className="h-5 w-5" />
                <span>Backend Details</span>
              </CardTitle>
              <p className="text-sm text-muted-foreground">
                These details will be automatically populated into course email and SMS notifications
              </p>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="rangeName">Range</Label>
                  <Input
                    id="rangeName"
                    placeholder="e.g., Range A"
                    {...form.register("rangeName")}
                    data-testid="input-range-name"
                  />
                </div>

                <div>
                  <Label htmlFor="classroomName">Classroom</Label>
                  <Input
                    id="classroomName"
                    placeholder="e.g., Classroom 101"
                    {...form.register("classroomName")}
                    data-testid="input-classroom-name"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="arrivalTime">Arrival Time</Label>
                  <Input
                    id="arrivalTime"
                    type="time"
                    {...form.register("arrivalTime")}
                    data-testid="input-arrival-time"
                  />
                </div>

                <div>
                  <Label htmlFor="departureTime">Departure Time</Label>
                  <Input
                    id="departureTime"
                    type="time"
                    {...form.register("departureTime")}
                    data-testid="input-departure-time"
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="dayOfWeek">Day</Label>
                <Select 
                  value={form.watch("dayOfWeek") || ""}
                  onValueChange={(value) => form.setValue("dayOfWeek", value)}
                >
                  <SelectTrigger data-testid="select-day-of-week">
                    <SelectValue placeholder="Select day" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Monday">Monday</SelectItem>
                    <SelectItem value="Tuesday">Tuesday</SelectItem>
                    <SelectItem value="Wednesday">Wednesday</SelectItem>
                    <SelectItem value="Thursday">Thursday</SelectItem>
                    <SelectItem value="Friday">Friday</SelectItem>
                    <SelectItem value="Saturday">Saturday</SelectItem>
                    <SelectItem value="Sunday">Sunday</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="googleMapsLink">Google Maps Location Link</Label>
                <Input
                  id="googleMapsLink"
                  type="url"
                  placeholder="https://maps.google.com/..."
                  {...form.register("googleMapsLink")}
                  data-testid="input-google-maps-link"
                />
              </div>

              <div>
                <Label htmlFor="rangeLocationImageUrl">Range Location Image</Label>
                <div className="mt-2">
                  {form.watch("rangeLocationImageUrl") ? (
                    <div className="space-y-2">
                      <div className="relative w-full h-48 rounded-lg overflow-hidden border bg-gray-50">
                        <img
                          src={form.watch("rangeLocationImageUrl") || ""}
                          alt="Range location"
                          className="w-full h-full object-cover"
                          onError={(e) => {
                            console.error("Image failed to load:", form.watch("rangeLocationImageUrl"));
                            e.currentTarget.src = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='100' height='100'%3E%3Crect width='100' height='100' fill='%23ddd'/%3E%3Ctext x='50%25' y='50%25' dominant-baseline='middle' text-anchor='middle' fill='%23999'%3EImage Error%3C/text%3E%3C/svg%3E";
                          }}
                          onLoad={() => {
                            console.log("Image loaded successfully:", form.watch("rangeLocationImageUrl"));
                          }}
                        />
                      </div>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          console.log("Removing image");
                          form.setValue("rangeLocationImageUrl", "");
                        }}
                        data-testid="button-remove-image"
                      >
                        <Trash2 className="h-4 w-4 mr-2" />
                        Remove Image
                      </Button>
                    </div>
                  ) : (
                    <div>
                      <Input
                        id="rangeLocationImage"
                        type="file"
                        accept="image/*"
                        disabled={uploadingImage}
                        onChange={async (e) => {
                          const file = e.target.files?.[0];
                          if (!file) return;

                          // Validate file size (max 5MB)
                          if (file.size > 5 * 1024 * 1024) {
                            toast({
                              title: "File too large",
                              description: "Please select an image smaller than 5MB",
                              variant: "destructive",
                            });
                            return;
                          }

                          setUploadingImage(true);
                          const formData = new FormData();
                          formData.append("file", file);
                          formData.append("directory", "public/range-images");

                          try {
                            const response = await fetch("/api/upload", {
                              method: "POST",
                              body: formData,
                              credentials: "include",
                            });

                            if (!response.ok) {
                              const errorText = await response.text();
                              console.error("Upload failed with status:", response.status, errorText);
                              throw new Error("Upload failed");
                            }

                            const data = await response.json();
                            console.log("Upload response:", JSON.stringify(data, null, 2));
                            console.log("URL from response:", data.url);
                            
                            // Convert the bucket path to an /objects/ path
                            let imagePath = data.url;
                            if (imagePath.startsWith('/replit-objstore-')) {
                              // Extract everything after the bucket name
                              const parts = imagePath.split('/');
                              // Remove the bucket name (first two parts: '' and 'replit-objstore-...')
                              const objectPath = parts.slice(2).join('/');
                              imagePath = `/objects/${objectPath}`;
                            }
                            
                            if (imagePath) {
                              console.log("Setting rangeLocationImageUrl to:", imagePath);
                              form.setValue("rangeLocationImageUrl", imagePath);
                              
                              // Verify it was set
                              const currentValue = form.watch("rangeLocationImageUrl");
                              console.log("Form value after setting:", currentValue);
                              
                              toast({
                                title: "Image uploaded",
                                description: "Range location image has been uploaded successfully",
                              });
                            } else {
                              console.error("No URL in response, full response:", data);
                              throw new Error("No URL in response");
                            }
                          } catch (error) {
                            console.error("Upload error:", error);
                            toast({
                              title: "Upload failed",
                              description: "Failed to upload image. Please try again.",
                              variant: "destructive",
                            });
                          } finally {
                            setUploadingImage(false);
                            // Reset the file input
                            e.target.value = "";
                          }
                        }}
                        data-testid="input-range-image"
                      />
                      <p className="text-xs text-muted-foreground mt-1">
                        {uploadingImage ? "Uploading..." : "Upload an image of the range location (max 5MB)"}
                      </p>
                    </div>
                  )}
                </div>
              </div>
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
                const tabs = ["basic", "schedule", "sessions", "backend", "settings"];
                const currentIndex = tabs.indexOf(currentTab);
                if (currentIndex > 0) {
                  let prevTab = tabs[currentIndex - 1];
                  // Skip sessions tab if not multi-day
                  if (prevTab === "sessions" && !isMultiDay) {
                    prevTab = "schedule";
                  }
                  setCurrentTab(prevTab);
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
                const tabs = ["basic", "schedule", "sessions", "backend", "settings"];
                const currentIndex = tabs.indexOf(currentTab);
                if (currentIndex < tabs.length - 1) {
                  let nextTab = tabs[currentIndex + 1];
                  // Skip sessions tab if not multi-day
                  if (nextTab === "sessions" && !isMultiDay) {
                    nextTab = "backend";
                  }
                  setCurrentTab(nextTab);
                }
              }}
            >
              Next
            </Button>
          ) : (
            <Button 
              type="button"
              disabled={createEventMutation.isPending}
              onClick={(e) => {
                console.log('Create Event button clicked - current tab:', currentTab);
                // Manually trigger form submission since we've disabled the form's default behavior
                form.handleSubmit(onSubmit)(e);
              }}
              data-testid="button-submit-event"
            >
              {createEventMutation.isPending ? "Creating..." : "Create Event"}
            </Button>
          )}
        </div>
      </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}