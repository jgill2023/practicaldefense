import { useState } from "react";
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
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
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
  notes: z.string().optional(),
});

type ScheduleFormData = z.infer<typeof scheduleFormSchema>;

interface EditScheduleFormProps {
  schedule: CourseSchedule & { course?: any };
  isOpen: boolean;
  onClose: () => void;
  onScheduleUpdated?: () => void;
}

export function EditScheduleForm({ schedule, isOpen, onClose, onScheduleUpdated }: EditScheduleFormProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const form = useForm<ScheduleFormData>({
    resolver: zodResolver(scheduleFormSchema),
    defaultValues: {
      startDate: schedule?.startDate || '',
      endDate: schedule?.endDate || '',
      startTime: schedule?.startTime || '',
      endTime: schedule?.endTime || '',
      location: schedule?.location || '',
      maxSpots: schedule?.maxSpots || 20,
      availableSpots: schedule?.availableSpots || 20,
      registrationDeadline: schedule?.registrationDeadline || '',
      waitlistEnabled: schedule?.waitlistEnabled ?? true,
      autoConfirmRegistration: schedule?.autoConfirmRegistration ?? true,
      notes: schedule?.notes || '',
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
        notes: data.notes || null,
        startDate: data.startDate, // Send as string, server will convert
        endDate: data.endDate, // Send as string, server will convert
        registrationDeadline: data.registrationDeadline || null, // Send as string or null
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
                      <FormControl>
                        <Input type="time" {...field} data-testid="input-start-time" />
                      </FormControl>
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
                      <FormControl>
                        <Input type="time" {...field} data-testid="input-end-time" />
                      </FormControl>
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

            {/* Notes Section */}
            <div className="space-y-4">
              <FormField
                control={form.control}
                name="notes"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Session Notes</FormLabel>
                    <FormControl>
                      <Textarea 
                        placeholder="Add any specific notes for this training session..."
                        className="min-h-[80px]"
                        {...field}
                        data-testid="textarea-notes"
                      />
                    </FormControl>
                    <FormDescription>
                      Any special instructions or notes for this specific session
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
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