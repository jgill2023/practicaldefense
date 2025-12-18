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
import { CalendarX2, Plus, Clock, RefreshCw, CalendarCheck } from "lucide-react";
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

export function ManageAvailabilityTab() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [showBlockDialog, setShowBlockDialog] = useState(false);
  const [blockReason, setBlockReason] = useState("");
  const [blockStartTime, setBlockStartTime] = useState("09:00");
  const [blockEndTime, setBlockEndTime] = useState("17:00");
  const [slotDuration, setSlotDuration] = useState("30");
  
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
    </div>
  );
}
