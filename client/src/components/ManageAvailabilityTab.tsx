import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Calendar } from "@/components/ui/calendar";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { CalendarX2, Plus, Clock, RefreshCw, CalendarCheck, CalendarDays, Trash2 } from "lucide-react";
import { format, addDays, parseISO } from "date-fns";

interface FreeSlot {
  startTime: string;
  endTime: string;
  durationMinutes: number;
}

interface ManualBlock {
  startTime: string;
  endTime: string;
  source: string;
}

interface WeeklyHour {
  id: string;
  dayOfWeek: number;
  startTime: string;
  endTime: string;
  isActive: boolean;
}

const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

export function ManageAvailabilityTab() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [showBlockDialog, setShowBlockDialog] = useState(false);
  const [showWeeklyHourDialog, setShowWeeklyHourDialog] = useState(false);
  const [blockReason, setBlockReason] = useState("");
  const [blockStartTime, setBlockStartTime] = useState("09:00");
  const [blockEndTime, setBlockEndTime] = useState("17:00");
  const [slotDuration, setSlotDuration] = useState("30");
  const [newWeeklyDay, setNewWeeklyDay] = useState("1");
  const [newWeeklyStart, setNewWeeklyStart] = useState("09:00");
  const [newWeeklyEnd, setNewWeeklyEnd] = useState("17:00");
  
  const instructorId = user?.id || "";

  const dateString = format(selectedDate, "yyyy-MM-dd");

  const { data: availability, isLoading: availabilityLoading, refetch: refetchAvailability } = useQuery<{
    date: string;
    instructorId: string;
    slotDurationMinutes: number;
    slots: FreeSlot[];
  }>({
    queryKey: ["/api/availability", dateString, instructorId, slotDuration],
    queryFn: async () => {
      const response = await fetch(
        `/api/availability/${dateString}?instructorId=${instructorId}&slotDuration=${slotDuration}`,
        { credentials: "include" }
      );
      if (!response.ok) {
        throw new Error("Failed to fetch availability");
      }
      return response.json();
    },
    enabled: !!instructorId,
  });

  const { data: blocks = { blocks: [] }, isLoading: blocksLoading } = useQuery<{ blocks: ManualBlock[] }>({
    queryKey: ["/api/availability/instructor/blocks", instructorId],
    queryFn: async () => {
      const startDate = format(new Date(), "yyyy-MM-dd");
      const endDate = format(addDays(new Date(), 30), "yyyy-MM-dd");
      const response = await fetch(
        `/api/availability/instructor/blocks?startDate=${startDate}&endDate=${endDate}`,
        { credentials: "include" }
      );
      if (!response.ok) {
        throw new Error("Failed to fetch blocks");
      }
      return response.json();
    },
    enabled: !!instructorId,
  });

  const { data: weeklyHoursData = { weeklyHours: [] }, isLoading: weeklyHoursLoading } = useQuery<{ weeklyHours: WeeklyHour[] }>({
    queryKey: ["/api/availability/instructor/weekly-hours", instructorId],
    queryFn: async () => {
      const response = await fetch("/api/availability/instructor/weekly-hours", { credentials: "include" });
      if (!response.ok) {
        throw new Error("Failed to fetch weekly hours");
      }
      return response.json();
    },
    enabled: !!instructorId,
  });

  const createWeeklyHourMutation = useMutation({
    mutationFn: async (data: { dayOfWeek: number; startTime: string; endTime: string }) => {
      return apiRequest("POST", "/api/availability/instructor/weekly-hours", data);
    },
    onSuccess: () => {
      toast({
        title: "Weekly Hours Added",
        description: "Your standard working hours have been updated.",
      });
      setShowWeeklyHourDialog(false);
      queryClient.invalidateQueries({ queryKey: ["/api/availability/instructor/weekly-hours"] });
      queryClient.invalidateQueries({ queryKey: ["/api/availability"] });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to add weekly hours",
        variant: "destructive",
      });
    },
  });

  const deleteWeeklyHourMutation = useMutation({
    mutationFn: async (id: string) => {
      return apiRequest("DELETE", `/api/availability/instructor/weekly-hours/${id}`);
    },
    onSuccess: () => {
      toast({
        title: "Removed",
        description: "Weekly hours entry has been removed.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/availability/instructor/weekly-hours"] });
      queryClient.invalidateQueries({ queryKey: ["/api/availability"] });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to remove weekly hours",
        variant: "destructive",
      });
    },
  });

  const toggleWeeklyHourMutation = useMutation({
    mutationFn: async ({ id, isActive }: { id: string; isActive: boolean }) => {
      return apiRequest("PUT", `/api/availability/instructor/weekly-hours/${id}`, { isActive });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/availability/instructor/weekly-hours"] });
      queryClient.invalidateQueries({ queryKey: ["/api/availability"] });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update weekly hours",
        variant: "destructive",
      });
    },
  });

  const createBlockMutation = useMutation({
    mutationFn: async (data: { startTime: string; endTime: string; reason?: string }) => {
      return apiRequest("POST", "/api/availability/manual-block", data);
    },
    onSuccess: () => {
      toast({
        title: "Block Created",
        description: "Manual availability block has been created.",
      });
      setShowBlockDialog(false);
      setBlockReason("");
      queryClient.invalidateQueries({ queryKey: ["/api/availability"] });
      queryClient.invalidateQueries({ queryKey: ["/api/availability/instructor/blocks"] });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create block",
        variant: "destructive",
      });
    },
  });

  const handleCreateBlock = () => {
    const startDateTime = new Date(selectedDate);
    const [startHour, startMin] = blockStartTime.split(":").map(Number);
    startDateTime.setHours(startHour, startMin, 0, 0);

    const endDateTime = new Date(selectedDate);
    const [endHour, endMin] = blockEndTime.split(":").map(Number);
    endDateTime.setHours(endHour, endMin, 0, 0);

    createBlockMutation.mutate({
      startTime: startDateTime.toISOString(),
      endTime: endDateTime.toISOString(),
      reason: blockReason || undefined,
    });
  };

  const handleCreateWeeklyHour = () => {
    createWeeklyHourMutation.mutate({
      dayOfWeek: parseInt(newWeeklyDay),
      startTime: newWeeklyStart,
      endTime: newWeeklyEnd,
    });
  };

  const formatWeeklyTime = (timeStr: string) => {
    try {
      const [hours, minutes] = timeStr.split(':').map(Number);
      const date = new Date();
      date.setHours(hours, minutes);
      return format(date, "h:mm a");
    } catch {
      return timeStr;
    }
  };

  const formatTime = (isoString: string) => {
    try {
      return format(parseISO(isoString), "h:mm a");
    } catch {
      return isoString;
    }
  };

  const timeOptions = [];
  for (let h = 6; h <= 22; h++) {
    for (let m = 0; m < 60; m += 30) {
      const hour = h.toString().padStart(2, "0");
      const minute = m.toString().padStart(2, "0");
      timeOptions.push(`${hour}:${minute}`);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold" data-testid="heading-manage-availability">Manage Availability</h2>
          <p className="text-muted-foreground">
            View your unified availability and create manual blocks for time off
          </p>
        </div>
        <Button onClick={() => setShowBlockDialog(true)} data-testid="button-add-block">
          <Plus className="mr-2 h-4 w-4" />
          Add Block
        </Button>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CalendarCheck className="h-5 w-5" />
              Select Date
            </CardTitle>
            <CardDescription>Choose a date to view available slots</CardDescription>
          </CardHeader>
          <CardContent>
            <Calendar
              mode="single"
              selected={selectedDate}
              onSelect={(date) => date && setSelectedDate(date)}
              disabled={(date) => date < new Date(new Date().setHours(0, 0, 0, 0))}
              className="rounded-md border"
              data-testid="calendar-availability"
            />
            <div className="mt-4 space-y-2">
              <Label>Slot Duration</Label>
              <Select value={slotDuration} onValueChange={setSlotDuration}>
                <SelectTrigger data-testid="select-slot-duration">
                  <SelectValue placeholder="Select duration" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="30">30 minutes</SelectItem>
                  <SelectItem value="60">60 minutes</SelectItem>
                  <SelectItem value="90">90 minutes</SelectItem>
                  <SelectItem value="120">120 minutes</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span className="flex items-center gap-2">
                <Clock className="h-5 w-5" />
                Available Slots - {format(selectedDate, "MMMM d, yyyy")}
              </span>
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={() => refetchAvailability()}
                data-testid="button-refresh-slots"
              >
                <RefreshCw className="h-4 w-4" />
              </Button>
            </CardTitle>
            <CardDescription>
              Free time slots after merging Google Calendar and manual blocks
            </CardDescription>
          </CardHeader>
          <CardContent>
            {availabilityLoading ? (
              <div className="text-center py-8 text-muted-foreground">Loading availability...</div>
            ) : availability?.slots && availability.slots.length > 0 ? (
              <div className="grid gap-2 max-h-80 overflow-y-auto">
                {availability.slots.map((slot, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between p-3 rounded-md bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800"
                    data-testid={`slot-${index}`}
                  >
                    <div className="flex items-center gap-2">
                      <Clock className="h-4 w-4 text-green-600" />
                      <span className="font-medium">
                        {formatTime(slot.startTime)} - {formatTime(slot.endTime)}
                      </span>
                    </div>
                    <Badge variant="secondary" className="bg-green-100 dark:bg-green-800">
                      {slot.durationMinutes} min
                    </Badge>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground" data-testid="text-no-slots">
                No available slots for this date
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span className="flex items-center gap-2">
              <CalendarDays className="h-5 w-5" />
              Standard Weekly Hours
            </span>
            <Button size="sm" onClick={() => setShowWeeklyHourDialog(true)} data-testid="button-add-weekly-hour">
              <Plus className="h-4 w-4 mr-1" />
              Add Hours
            </Button>
          </CardTitle>
          <CardDescription>
            Define your regular working hours. Appointments can only be booked within these times.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {weeklyHoursLoading ? (
            <div className="text-center py-4 text-muted-foreground">Loading weekly hours...</div>
          ) : weeklyHoursData.weeklyHours.length > 0 ? (
            <div className="space-y-2">
              {weeklyHoursData.weeklyHours
                .sort((a, b) => a.dayOfWeek - b.dayOfWeek)
                .map((hour) => (
                <div
                  key={hour.id}
                  className={`flex items-center justify-between p-3 rounded-md border ${
                    hour.isActive 
                      ? 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800' 
                      : 'bg-gray-50 dark:bg-gray-800/20 border-gray-200 dark:border-gray-700 opacity-60'
                  }`}
                  data-testid={`weekly-hour-${hour.id}`}
                >
                  <div className="flex items-center gap-3">
                    <Switch
                      checked={hour.isActive}
                      onCheckedChange={(checked) => toggleWeeklyHourMutation.mutate({ id: hour.id, isActive: checked })}
                      data-testid={`switch-weekly-hour-${hour.id}`}
                    />
                    <div>
                      <span className="font-medium">{DAY_NAMES[hour.dayOfWeek]}</span>
                      <span className="text-muted-foreground ml-2">
                        {formatWeeklyTime(hour.startTime)} - {formatWeeklyTime(hour.endTime)}
                      </span>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => deleteWeeklyHourMutation.mutate(hour.id)}
                    disabled={deleteWeeklyHourMutation.isPending}
                    data-testid={`button-delete-weekly-hour-${hour.id}`}
                  >
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground" data-testid="text-no-weekly-hours">
              <CalendarDays className="h-12 w-12 mx-auto mb-3 opacity-50" />
              <p className="font-medium">No weekly hours configured</p>
              <p className="text-sm mt-1">Add your standard working hours to enable appointment booking.</p>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CalendarX2 className="h-5 w-5" />
            Upcoming Manual Blocks
          </CardTitle>
          <CardDescription>Your scheduled time-off blocks</CardDescription>
        </CardHeader>
        <CardContent>
          {blocksLoading ? (
            <div className="text-center py-4 text-muted-foreground">Loading blocks...</div>
          ) : blocks.blocks && blocks.blocks.length > 0 ? (
            <div className="space-y-2">
              {blocks.blocks.map((block, index) => (
                <div
                  key={index}
                  className="flex items-center justify-between p-3 rounded-md bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800"
                  data-testid={`block-${index}`}
                >
                  <div className="flex items-center gap-2">
                    <CalendarX2 className="h-4 w-4 text-red-600" />
                    <span>
                      {format(parseISO(block.startTime), "MMM d, yyyy h:mm a")} - {formatTime(block.endTime)}
                    </span>
                  </div>
                  <Badge variant="secondary" className="bg-red-100 dark:bg-red-800">
                    Blocked
                  </Badge>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-4 text-muted-foreground" data-testid="text-no-blocks">
              No upcoming blocks
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={showBlockDialog} onOpenChange={setShowBlockDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create Manual Block</DialogTitle>
            <DialogDescription>
              Block off time on {format(selectedDate, "MMMM d, yyyy")}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Start Time</Label>
                <Select value={blockStartTime} onValueChange={setBlockStartTime}>
                  <SelectTrigger data-testid="select-block-start-time">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {timeOptions.map((time) => (
                      <SelectItem key={time} value={time}>
                        {format(new Date(`2000-01-01T${time}`), "h:mm a")}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>End Time</Label>
                <Select value={blockEndTime} onValueChange={setBlockEndTime}>
                  <SelectTrigger data-testid="select-block-end-time">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {timeOptions.map((time) => (
                      <SelectItem key={time} value={time}>
                        {format(new Date(`2000-01-01T${time}`), "h:mm a")}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label>Reason (optional)</Label>
              <Textarea
                value={blockReason}
                onChange={(e) => setBlockReason(e.target.value)}
                placeholder="e.g., Personal time, Meeting, Vacation..."
                data-testid="input-block-reason"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowBlockDialog(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleCreateBlock}
              disabled={createBlockMutation.isPending}
              data-testid="button-confirm-block"
            >
              {createBlockMutation.isPending ? "Creating..." : "Create Block"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showWeeklyHourDialog} onOpenChange={setShowWeeklyHourDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Weekly Hours</DialogTitle>
            <DialogDescription>
              Define standard working hours for a day of the week
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Day of Week</Label>
              <Select value={newWeeklyDay} onValueChange={setNewWeeklyDay}>
                <SelectTrigger data-testid="select-weekly-day">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {DAY_NAMES.map((day, index) => (
                    <SelectItem key={index} value={index.toString()}>
                      {day}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Start Time</Label>
                <Select value={newWeeklyStart} onValueChange={setNewWeeklyStart}>
                  <SelectTrigger data-testid="select-weekly-start-time">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {timeOptions.map((time) => (
                      <SelectItem key={time} value={time}>
                        {format(new Date(`2000-01-01T${time}`), "h:mm a")}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>End Time</Label>
                <Select value={newWeeklyEnd} onValueChange={setNewWeeklyEnd}>
                  <SelectTrigger data-testid="select-weekly-end-time">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {timeOptions.map((time) => (
                      <SelectItem key={time} value={time}>
                        {format(new Date(`2000-01-01T${time}`), "h:mm a")}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowWeeklyHourDialog(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleCreateWeeklyHour}
              disabled={createWeeklyHourMutation.isPending}
              data-testid="button-confirm-weekly-hour"
            >
              {createWeeklyHourMutation.isPending ? "Adding..." : "Add Hours"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
