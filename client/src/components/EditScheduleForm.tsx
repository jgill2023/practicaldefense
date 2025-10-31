import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { z } from "zod";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { isUnauthorizedError } from "@/lib/authUtils";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CalendarIcon, Clock, MapPin, Users, Calendar as CalendarLucide } from "lucide-react";
import type { CourseSchedule } from "@shared/schema";

const scheduleFormSchema = z.object({
  startDate: z.string().min(1, "Start date is required"),
  endDate: z.string().min(1, "End date is required"),
  startTime: z.string().min(1, "Start time is required"),
  endTime: z.string().min(1, "End time is required"),
  location: z.string().optional(),
  maxSpots: z.number().min(1, "Max spots must be at least 1"),
  availableSpots: z.number().min(0, "Available spots cannot be negative"),
  registrationDeadline: z.string().optional(),
  waitlistEnabled: z.boolean(),
  autoConfirmRegistration: z.boolean(),
  // Backend Details fields
  rangeName: z.string().optional(),
  classroomName: z.string().optional(),
  arrivalTime: z.string().optional(),
  departureTime: z.string().optional(),
  dayOfWeek: z.string().optional(),
  googleMapsLink: z.string().optional(),
  rangeLocationImageUrl: z.string().optional(),
});

type ScheduleFormData = z.infer<typeof scheduleFormSchema>;

interface EditScheduleFormProps {
  schedule: CourseSchedule & { course?: any };
  isOpen: boolean;
  onClose: () => void;
  onScheduleUpdated?: () => void;
}

// Generate time options in 15-minute increments from 6:00 AM to 8:00 PM
const generateTimeOptions = () => {
  const times = [];
  for (let hour = 6; hour <= 20; hour++) {
    for (let minute = 0; minute < 60; minute += 15) {
      const timeStr = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
      const displayTime = new Date(`2000-01-01T${timeStr}`).toLocaleTimeString([], { 
        hour: 'numeric', 
        minute: '2-digit',
        hour12: true 
      });
      times.push({ value: timeStr, label: displayTime });
    }
  }
  return times;
};

export function EditScheduleForm({ schedule, isOpen, onClose, onScheduleUpdated }: EditScheduleFormProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const timeOptions = generateTimeOptions();

  const form = useForm<ScheduleFormData>({
    resolver: zodResolver(scheduleFormSchema),
    defaultValues: {
      startDate: schedule?.startDate ? 
        (typeof schedule.startDate === 'string' 
          ? (schedule.startDate.includes('T') ? schedule.startDate.split('T')[0] : schedule.startDate)
          : schedule.startDate.toISOString().split('T')[0]) : '',
      endDate: schedule?.endDate ? 
        (typeof schedule.endDate === 'string' 
          ? (schedule.endDate.includes('T') ? schedule.endDate.split('T')[0] : schedule.endDate)
          : schedule.endDate.toISOString().split('T')[0]) : '',
      startTime: schedule?.startTime || '',
      endTime: schedule?.endTime || '',
      location: schedule?.location || '',
      maxSpots: schedule?.maxSpots || 20,
      availableSpots: schedule?.availableSpots || 20,
      registrationDeadline: schedule?.registrationDeadline ? 
        (typeof schedule.registrationDeadline === 'string' 
          ? (schedule.registrationDeadline.includes('T') ? schedule.registrationDeadline.split('T')[0] : schedule.registrationDeadline)
          : schedule.registrationDeadline.toISOString().split('T')[0]) : '',
      waitlistEnabled: schedule?.waitlistEnabled ?? true,
      autoConfirmRegistration: schedule?.autoConfirmRegistration ?? true,
      // Backend Details
      rangeName: schedule?.rangeName || '',
      classroomName: schedule?.classroomName || '',
      arrivalTime: schedule?.arrivalTime || '',
      departureTime: schedule?.departureTime || '',
      dayOfWeek: schedule?.dayOfWeek || '',
      googleMapsLink: schedule?.googleMapsLink || '',
      rangeLocationImageUrl: schedule?.rangeLocationImageUrl || '',
    },
  });

  const updateScheduleMutation = useMutation({
    mutationFn: async (data: ScheduleFormData) => {
      // Send the raw form data to the server, let the server handle date conversion
      const updateData = {
        startTime: data.startTime,
        endTime: data.endTime,
        location: data.location || null,
        maxSpots: data.maxSpots,
        availableSpots: data.availableSpots,
        waitlistEnabled: data.waitlistEnabled,
        autoConfirmRegistration: data.autoConfirmRegistration,
        startDate: data.startDate, // Send as string, server will convert
        endDate: data.endDate, // Send as string, server will convert
        registrationDeadline: data.registrationDeadline || null, // Send as string or null
        // Backend Details
        rangeName: data.rangeName || null,
        classroomName: data.classroomName || null,
        arrivalTime: data.arrivalTime || null,
        departureTime: data.departureTime || null,
        dayOfWeek: data.dayOfWeek || null,
        googleMapsLink: data.googleMapsLink || null,
        rangeLocationImageUrl: data.rangeLocationImageUrl || null,
      };
      
      await apiRequest("PATCH", `/api/instructor/schedules/${schedule.id}`, updateData);
    },
    onSuccess: () => {
      toast({
        title: "Schedule Updated",
        description: "Training schedule has been updated successfully.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/instructor/courses"] });
      onScheduleUpdated?.();
      onClose();
    },
    onError: (error) => {
      if (isUnauthorizedError(error)) {
        toast({
          title: "Unauthorized",
          description: "You are logged out. Logging in again...",
          variant: "destructive",
        });
        setTimeout(() => {
          window.location.href = "/api/login";
        }, 500);
        return;
      }
      toast({
        title: "Update Failed",
        description: "Failed to update schedule. Please try again.",
        variant: "destructive",
      });
    },
  });

  // Watch start date and automatically set end date
  const startDate = form.watch("startDate");
  
  useEffect(() => {
    if (startDate) {
      form.setValue("endDate", startDate);
    }
  }, [startDate, form]);

  const onSubmit = (data: ScheduleFormData) => {
    updateScheduleMutation.mutate(data);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CalendarLucide className="w-5 h-5" />
            Edit Training Schedule: {schedule?.course?.title || 'Event'}
          </DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            {/* Date and Time Section */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold flex items-center gap-2">
                <CalendarIcon className="w-5 h-5" />
                Date & Time
              </h3>
              
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="startDate"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Start Date *</FormLabel>
                      <FormControl>
                        <Input type="date" {...field} data-testid="input-start-date" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="endDate"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>End Date *</FormLabel>
                      <FormControl>
                        <Input type="date" {...field} data-testid="input-end-date" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="startTime"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Start Time *</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger data-testid="select-start-time">
                            <SelectValue placeholder="Select start time" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {timeOptions.map((time) => (
                            <SelectItem key={time.value} value={time.value}>
                              {time.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="endTime"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>End Time *</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger data-testid="select-end-time">
                            <SelectValue placeholder="Select end time" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {timeOptions.map((time) => (
                            <SelectItem key={time.value} value={time.value}>
                              {time.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>

            {/* Location Section */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold flex items-center gap-2">
                <MapPin className="w-5 h-5" />
                Location
              </h3>
              
              <FormField
                control={form.control}
                name="location"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Training Location</FormLabel>
                    <FormControl>
                      <Input 
                        placeholder="Enter training location" 
                        {...field} 
                        data-testid="input-location"
                      />
                    </FormControl>
                    <FormDescription>
                      Specify where this training session will take place
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Capacity Section */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold flex items-center gap-2">
                <Users className="w-5 h-5" />
                Capacity
              </h3>
              
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="maxSpots"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Max Students *</FormLabel>
                      <FormControl>
                        <Input 
                          type="number" 
                          min="1" 
                          {...field}
                          onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                          data-testid="input-max-spots"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="availableSpots"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Available Spots *</FormLabel>
                      <FormControl>
                        <Input 
                          type="number" 
                          min="0" 
                          {...field}
                          onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                          data-testid="input-available-spots"
                        />
                      </FormControl>
                      <FormDescription>
                        Current available spots for enrollment
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>

            {/* Backend Details Section */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold flex items-center gap-2">
                <MapPin className="w-5 h-5" />
                Backend Details
              </h3>
              <FormDescription>
                These details will be automatically populated into course email and SMS notifications
              </FormDescription>

              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="rangeName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Range</FormLabel>
                      <FormControl>
                        <Input 
                          placeholder="e.g., Range A" 
                          {...field}
                          value={field.value || ''}
                          data-testid="input-range-name"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="classroomName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Classroom</FormLabel>
                      <FormControl>
                        <Input 
                          placeholder="e.g., Classroom 101" 
                          {...field}
                          value={field.value || ''}
                          data-testid="input-classroom-name"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="arrivalTime"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Arrival Time</FormLabel>
                      <FormControl>
                        <Input 
                          type="time" 
                          {...field}
                          value={field.value || ''}
                          data-testid="input-arrival-time"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="departureTime"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Departure Time</FormLabel>
                      <FormControl>
                        <Input 
                          type="time" 
                          {...field}
                          value={field.value || ''}
                          data-testid="input-departure-time"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="dayOfWeek"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Day</FormLabel>
                    <Select 
                      value={field.value || ''}
                      onValueChange={field.onChange}
                    >
                      <FormControl>
                        <SelectTrigger data-testid="select-day-of-week">
                          <SelectValue placeholder="Select day" />
                        </SelectTrigger>
                      </FormControl>
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
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="googleMapsLink"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Google Maps Location Link</FormLabel>
                    <FormControl>
                      <Input 
                        type="url"
                        placeholder="https://maps.google.com/..." 
                        {...field}
                        value={field.value || ''}
                        data-testid="input-google-maps-link"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="rangeLocationImageUrl"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Range Location Image</FormLabel>
                    <FormControl>
                      <div className="mt-2">
                        {field.value ? (
                          <div className="space-y-2">
                            <div className="relative w-full h-48 rounded-lg overflow-hidden border bg-gray-50">
                              <img
                                src={field.value}
                                alt="Range location"
                                className="w-full h-full object-cover"
                              />
                            </div>
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={() => field.onChange('')}
                            >
                              Remove Image
                            </Button>
                          </div>
                        ) : (
                          <div>
                            <Input
                              type="file"
                              accept="image/*"
                              onChange={async (e) => {
                                const file = e.target.files?.[0];
                                if (!file) return;

                                if (file.size > 5 * 1024 * 1024) {
                                  return;
                                }

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
                                    throw new Error("Upload failed");
                                  }

                                  const data = await response.json();
                                  if (data.url) {
                                    field.onChange(data.url);
                                  }
                                } catch (error) {
                                  console.error("Upload error:", error);
                                }
                              }}
                            />
                            <p className="text-xs text-muted-foreground mt-1">
                              Upload an image of the range location (max 5MB)
                            </p>
                          </div>
                        )}
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Registration Settings */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold flex items-center gap-2">
                <Clock className="w-5 h-5" />
                Registration Settings
              </h3>
              
              <FormField
                control={form.control}
                name="registrationDeadline"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Registration Deadline</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} data-testid="input-registration-deadline" />
                    </FormControl>
                    <FormDescription>
                      Last date for student registration (optional)
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="waitlistEnabled"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm">
                      <div className="space-y-0.5">
                        <FormLabel>Enable Waitlist</FormLabel>
                        <FormDescription>
                          Allow students to join waitlist when full
                        </FormDescription>
                      </div>
                      <FormControl>
                        <Switch 
                          checked={field.value} 
                          onCheckedChange={field.onChange}
                          data-testid="switch-waitlist-enabled"
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="autoConfirmRegistration"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm">
                      <div className="space-y-0.5">
                        <FormLabel>Auto-confirm</FormLabel>
                        <FormDescription>
                          Automatically confirm new registrations
                        </FormDescription>
                      </div>
                      <FormControl>
                        <Switch 
                          checked={field.value} 
                          onCheckedChange={field.onChange}
                          data-testid="switch-auto-confirm"
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />
              </div>
            </div>


            {/* Action Buttons */}
            <div className="flex justify-end gap-3 pt-4 border-t">
              <Button 
                type="button" 
                variant="outline" 
                onClick={onClose}
                data-testid="button-cancel-edit"
              >
                Cancel
              </Button>
              <Button 
                type="submit" 
                disabled={updateScheduleMutation.isPending}
                data-testid="button-save-schedule"
              >
                {updateScheduleMutation.isPending ? "Updating..." : "Update Schedule"}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}