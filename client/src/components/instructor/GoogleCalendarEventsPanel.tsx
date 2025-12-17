import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Loader2, Calendar, ExternalLink, ChevronLeft, ChevronRight, RefreshCw } from "lucide-react";
import { format, startOfWeek, endOfWeek, addWeeks, isValid, parseISO } from "date-fns";

interface GoogleCalendarEvent {
  id: string;
  title: string;
  startTime: string;
  endTime: string;
  source: 'google';
  calendarId?: string;
  description?: string;
  location?: string;
}

interface InternalBooking {
  id: string;
  title: string;
  startTime: string;
  endTime: string;
  source: 'internal';
  studentName?: string;
  appointmentType?: string;
}

interface CalendarEventsResponse {
  googleEvents: GoogleCalendarEvent[];
  internalBookings: InternalBooking[];
}

export function GoogleCalendarEventsPanel() {
  const [weekOffset, setWeekOffset] = useState(0);
  
  const currentWeekStart = startOfWeek(addWeeks(new Date(), weekOffset), { weekStartsOn: 0 });
  const currentWeekEnd = endOfWeek(currentWeekStart, { weekStartsOn: 0 });
  
  const { data, isLoading, refetch, isRefetching } = useQuery<CalendarEventsResponse>({
    queryKey: ["/api/instructor-google-calendar/events", currentWeekStart.toISOString(), currentWeekEnd.toISOString()],
    queryFn: async () => {
      const params = new URLSearchParams({
        startDate: currentWeekStart.toISOString(),
        endDate: currentWeekEnd.toISOString(),
      });
      const response = await fetch(`/api/instructor-google-calendar/events?${params}`);
      if (!response.ok) {
        throw new Error('Failed to fetch calendar events');
      }
      return response.json();
    },
  });

  const safeParseDate = (dateStr: string | undefined | null): Date | null => {
    if (!dateStr) return null;
    try {
      const date = typeof dateStr === 'string' ? parseISO(dateStr) : new Date(dateStr);
      return isValid(date) ? date : null;
    } catch {
      return null;
    }
  };

  const allEvents = [
    ...(data?.googleEvents || []).map(e => ({ ...e, type: 'google' as const })),
    ...(data?.internalBookings || []).map(e => ({ ...e, type: 'internal' as const })),
  ]
    .filter(e => safeParseDate(e.startTime) !== null)
    .sort((a, b) => {
      const dateA = safeParseDate(a.startTime);
      const dateB = safeParseDate(b.startTime);
      if (!dateA || !dateB) return 0;
      return dateA.getTime() - dateB.getTime();
    });

  const formatEventTime = (startTime: string, endTime: string) => {
    const start = safeParseDate(startTime);
    const end = safeParseDate(endTime);
    if (!start || !end) return 'Time not available';
    try {
      return `${format(start, 'EEE, MMM d')} · ${format(start, 'h:mm a')} - ${format(end, 'h:mm a')}`;
    } catch {
      return 'Time not available';
    }
  };

  return (
    <Card data-testid="card-google-calendar-events">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Calendar className="h-5 w-5 text-primary" />
            <div>
              <CardTitle className="text-lg">Calendar Events</CardTitle>
              <CardDescription className="text-sm">
                Your upcoming appointments and Google Calendar events
              </CardDescription>
            </div>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => refetch()}
            disabled={isRefetching}
            data-testid="button-refresh-calendar-events"
          >
            <RefreshCw className={`h-4 w-4 ${isRefetching ? 'animate-spin' : ''}`} />
          </Button>
        </div>
        
        <div className="flex items-center justify-between mt-3">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setWeekOffset(o => o - 1)}
            data-testid="button-prev-week"
          >
            <ChevronLeft className="h-4 w-4 mr-1" />
            Previous
          </Button>
          <span className="text-sm font-medium">
            {format(currentWeekStart, 'MMM d')} - {format(currentWeekEnd, 'MMM d, yyyy')}
          </span>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setWeekOffset(o => o + 1)}
            data-testid="button-next-week"
          >
            Next
            <ChevronRight className="h-4 w-4 ml-1" />
          </Button>
        </div>
      </CardHeader>
      
      <CardContent>
        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : allEvents.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <Calendar className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p>No events scheduled for this week</p>
          </div>
        ) : (
          <div className="space-y-3">
            {allEvents.map((event) => (
              <div
                key={event.id}
                className="flex items-start gap-3 p-3 rounded-lg border bg-card hover:bg-accent/50 transition-colors"
                data-testid={`calendar-event-${event.id}`}
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-medium text-sm truncate">{event.title}</span>
                    {event.type === 'google' ? (
                      <Badge variant="secondary" className="text-xs shrink-0">
                        <ExternalLink className="h-3 w-3 mr-1" />
                        Google Calendar
                      </Badge>
                    ) : (
                      <Badge variant="default" className="text-xs shrink-0">
                        Website Booking
                      </Badge>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {formatEventTime(event.startTime, event.endTime)}
                  </p>
                  {event.type === 'internal' && (event as InternalBooking).studentName && (
                    <p className="text-xs text-muted-foreground mt-1">
                      Student: {(event as InternalBooking).studentName}
                    </p>
                  )}
                  {event.type === 'google' && (event as GoogleCalendarEvent).location && (
                    <p className="text-xs text-muted-foreground mt-1">
                      📍 {(event as GoogleCalendarEvent).location}
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
