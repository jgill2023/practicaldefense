import { useState, useMemo, useCallback } from "react";
import { useQuery } from "@tanstack/react-query";
import { Calendar, momentLocalizer, View, Views } from "react-big-calendar";
import moment from "moment";
import { useAuth } from "@/hooks/useAuth";
import { useLocation, Link } from "wouter";
import { Layout } from "@/components/Layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Loader2, ChevronLeft, ChevronRight, Calendar as CalendarIcon, RefreshCw, Settings, ArrowLeft } from "lucide-react";
import { hasInstructorPrivileges } from "@/lib/authUtils";
import type { User } from "@shared/schema";

import "react-big-calendar/lib/css/react-big-calendar.css";

const localizer = momentLocalizer(moment);

interface GoogleEvent {
  id: string;
  title: string;
  description?: string;
  start: string;
  end: string;
  location?: string;
  isAllDay: boolean;
  source: 'google';
}

interface AppointmentEvent {
  id: string;
  title: string;
  description?: string;
  start: string;
  end: string;
  studentName: string;
  studentEmail: string;
  status: string;
  appointmentTypeName?: string;
  source: 'appointment';
}

interface ManualBlock {
  start: string;
  end: string;
  source: 'manual_block';
}

interface CalendarEventData {
  googleEvents: GoogleEvent[];
  appointments: AppointmentEvent[];
  manualBlocks: ManualBlock[];
  googleConnected: boolean;
}

interface CalendarEvent {
  id: string;
  title: string;
  start: Date;
  end: Date;
  allDay?: boolean;
  resource: {
    type: 'google' | 'appointment' | 'manual_block';
    description?: string;
    location?: string;
    studentName?: string;
    studentEmail?: string;
    status?: string;
    appointmentTypeName?: string;
  };
}

export default function InstructorCalendar() {
  const { user, isLoading: authLoading, isAuthenticated } = useAuth();
  const [, setLocation] = useLocation();
  const [currentView, setCurrentView] = useState<View>(Views.WEEK);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null);

  const startDate = useMemo(() => {
    const start = new Date(currentDate);
    if (currentView === Views.MONTH) {
      start.setDate(1);
      start.setDate(start.getDate() - start.getDay());
    } else if (currentView === Views.WEEK) {
      start.setDate(start.getDate() - start.getDay());
    } else {
      start.setHours(0, 0, 0, 0);
    }
    start.setMonth(start.getMonth() - 1);
    return start.toISOString();
  }, [currentDate, currentView]);

  const endDate = useMemo(() => {
    const end = new Date(currentDate);
    if (currentView === Views.MONTH) {
      end.setMonth(end.getMonth() + 1, 0);
      end.setDate(end.getDate() + (6 - end.getDay()));
    } else if (currentView === Views.WEEK) {
      end.setDate(end.getDate() + (6 - end.getDay()));
    }
    end.setMonth(end.getMonth() + 2);
    return end.toISOString();
  }, [currentDate, currentView]);

  const { data: calendarData, isLoading: eventsLoading, refetch } = useQuery<CalendarEventData>({
    queryKey: ["/api/availability/instructor/calendar-events", startDate, endDate],
    queryFn: async () => {
      const response = await fetch(
        `/api/availability/instructor/calendar-events?startDate=${encodeURIComponent(startDate)}&endDate=${encodeURIComponent(endDate)}`,
        { credentials: "include" }
      );
      if (!response.ok) throw new Error("Failed to fetch calendar events");
      return response.json();
    },
    enabled: isAuthenticated && hasInstructorPrivileges(user as User),
  });

  const calendarEvents = useMemo(() => {
    if (!calendarData) return [];

    const events: CalendarEvent[] = [];

    calendarData.googleEvents.forEach(event => {
      let start: Date;
      let end: Date;
      
      if (event.isAllDay) {
        start = moment(event.start).startOf('day').toDate();
        end = moment(event.end).startOf('day').toDate();
      } else {
        start = new Date(event.start);
        end = new Date(event.end);
      }
      
      events.push({
        id: `google-${event.id}`,
        title: event.title,
        start,
        end,
        allDay: event.isAllDay,
        resource: {
          type: 'google',
          description: event.description,
          location: event.location,
        },
      });
    });

    calendarData.appointments.forEach(apt => {
      events.push({
        id: `apt-${apt.id}`,
        title: `${apt.title} - ${apt.studentName}`,
        start: new Date(apt.start),
        end: new Date(apt.end),
        resource: {
          type: 'appointment',
          description: apt.description,
          studentName: apt.studentName,
          studentEmail: apt.studentEmail,
          status: apt.status,
          appointmentTypeName: apt.appointmentTypeName,
        },
      });
    });

    calendarData.manualBlocks.forEach((block, index) => {
      events.push({
        id: `block-${index}`,
        title: 'Blocked Time',
        start: new Date(block.start),
        end: new Date(block.end),
        resource: {
          type: 'manual_block',
        },
      });
    });

    return events;
  }, [calendarData]);

  const handleNavigate = useCallback((newDate: Date) => {
    setCurrentDate(newDate);
  }, []);

  const handleViewChange = useCallback((newView: View) => {
    setCurrentView(newView);
  }, []);

  const handleSelectEvent = useCallback((event: CalendarEvent) => {
    setSelectedEvent(event);
  }, []);

  const eventStyleGetter = useCallback((event: CalendarEvent) => {
    let backgroundColor = '#3174ad';
    let borderColor = '#265985';

    if (event.resource.type === 'google') {
      backgroundColor = '#4285F4';
      borderColor = '#1a73e8';
    } else if (event.resource.type === 'appointment') {
      const status = event.resource.status;
      if (status === 'confirmed') {
        backgroundColor = '#22c55e';
        borderColor = '#16a34a';
      } else if (status === 'pending') {
        backgroundColor = '#f59e0b';
        borderColor = '#d97706';
      } else if (status === 'cancelled') {
        backgroundColor = '#ef4444';
        borderColor = '#dc2626';
      } else {
        backgroundColor = '#8b5cf6';
        borderColor = '#7c3aed';
      }
    } else if (event.resource.type === 'manual_block') {
      backgroundColor = '#6b7280';
      borderColor = '#4b5563';
    }

    return {
      style: {
        backgroundColor,
        borderColor,
        borderRadius: '4px',
        opacity: 1,
        color: 'white',
        border: `1px solid ${borderColor}`,
      },
    };
  }, []);

  if (authLoading) {
    return (
      <Layout theme="light">
        <div className="flex items-center justify-center min-h-[60vh]">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </Layout>
    );
  }

  if (!isAuthenticated || !hasInstructorPrivileges(user as User)) {
    setLocation("/");
    return null;
  }

  const goToToday = () => setCurrentDate(new Date());
  const goBack = () => {
    const newDate = new Date(currentDate);
    if (currentView === Views.MONTH) {
      newDate.setMonth(newDate.getMonth() - 1);
    } else if (currentView === Views.WEEK) {
      newDate.setDate(newDate.getDate() - 7);
    } else {
      newDate.setDate(newDate.getDate() - 1);
    }
    setCurrentDate(newDate);
  };
  const goForward = () => {
    const newDate = new Date(currentDate);
    if (currentView === Views.MONTH) {
      newDate.setMonth(newDate.getMonth() + 1);
    } else if (currentView === Views.WEEK) {
      newDate.setDate(newDate.getDate() + 7);
    } else {
      newDate.setDate(newDate.getDate() + 1);
    }
    setCurrentDate(newDate);
  };

  return (
    <Layout theme="light">
      <div className="container mx-auto py-6 px-4">
        <div className="flex flex-col gap-6">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div className="flex items-center gap-4">
              <Link href="/instructor">
                <Button variant="ghost" size="sm" data-testid="btn-back-dashboard">
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Dashboard
                </Button>
              </Link>
              <div>
                <h1 className="text-2xl font-bold" data-testid="text-page-title">Calendar</h1>
                <p className="text-muted-foreground text-sm">
                  View all your appointments and Google Calendar events
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {!calendarData?.googleConnected && (
                <Link href="/settings">
                  <Button variant="outline" size="sm" data-testid="btn-connect-google">
                    <Settings className="h-4 w-4 mr-2" />
                    Connect Google Calendar
                  </Button>
                </Link>
              )}
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => refetch()}
                disabled={eventsLoading}
                data-testid="btn-refresh"
              >
                <RefreshCw className={`h-4 w-4 mr-2 ${eventsLoading ? 'animate-spin' : ''}`} />
                Refresh
              </Button>
            </div>
          </div>

          <div className="flex flex-wrap gap-2 items-center">
            <Badge variant="secondary" className="bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200">
              <span className="w-2 h-2 rounded-full bg-blue-500 mr-2"></span>
              Google Calendar
            </Badge>
            <Badge variant="secondary" className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
              <span className="w-2 h-2 rounded-full bg-green-500 mr-2"></span>
              Confirmed
            </Badge>
            <Badge variant="secondary" className="bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200">
              <span className="w-2 h-2 rounded-full bg-amber-500 mr-2"></span>
              Pending
            </Badge>
            <Badge variant="secondary" className="bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200">
              <span className="w-2 h-2 rounded-full bg-purple-500 mr-2"></span>
              Completed
            </Badge>
            <Badge variant="secondary" className="bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200">
              <span className="w-2 h-2 rounded-full bg-gray-500 mr-2"></span>
              Blocked Time
            </Badge>
          </div>

          <Card className="overflow-hidden">
            <CardHeader className="pb-2">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div className="flex items-center gap-2">
                  <Button variant="outline" size="icon" onClick={goBack} data-testid="btn-prev">
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <Button variant="outline" onClick={goToToday} data-testid="btn-today">
                    Today
                  </Button>
                  <Button variant="outline" size="icon" onClick={goForward} data-testid="btn-next">
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                  <h2 className="text-lg font-semibold ml-2" data-testid="text-current-date">
                    {moment(currentDate).format(currentView === Views.MONTH ? 'MMMM YYYY' : 'MMMM D, YYYY')}
                  </h2>
                </div>
                <div className="flex gap-1">
                  <Button
                    variant={currentView === Views.MONTH ? "default" : "outline"}
                    size="sm"
                    onClick={() => setCurrentView(Views.MONTH)}
                    data-testid="btn-view-month"
                  >
                    Month
                  </Button>
                  <Button
                    variant={currentView === Views.WEEK ? "default" : "outline"}
                    size="sm"
                    onClick={() => setCurrentView(Views.WEEK)}
                    data-testid="btn-view-week"
                  >
                    Week
                  </Button>
                  <Button
                    variant={currentView === Views.DAY ? "default" : "outline"}
                    size="sm"
                    onClick={() => setCurrentView(Views.DAY)}
                    data-testid="btn-view-day"
                  >
                    Day
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-0 sm:p-4">
              {eventsLoading ? (
                <div className="flex items-center justify-center h-[600px]">
                  <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                </div>
              ) : (
                <div className="h-[600px] sm:h-[700px]" data-testid="calendar-container">
                  <Calendar
                    localizer={localizer}
                    events={calendarEvents}
                    startAccessor="start"
                    endAccessor="end"
                    view={currentView}
                    onView={handleViewChange}
                    date={currentDate}
                    onNavigate={handleNavigate}
                    onSelectEvent={handleSelectEvent}
                    eventPropGetter={eventStyleGetter}
                    toolbar={false}
                    popup
                    selectable
                    style={{ height: '100%' }}
                  />
                </div>
              )}
            </CardContent>
          </Card>

          {!calendarData?.googleConnected && (
            <Card className="bg-blue-50 dark:bg-blue-950 border-blue-200 dark:border-blue-800">
              <CardContent className="py-4">
                <div className="flex items-center gap-4">
                  <CalendarIcon className="h-8 w-8 text-blue-500" />
                  <div className="flex-1">
                    <h3 className="font-semibold text-blue-900 dark:text-blue-100">Connect Google Calendar</h3>
                    <p className="text-sm text-blue-700 dark:text-blue-300">
                      Link your Google Calendar to see all your events in one place and automatically block off busy times.
                    </p>
                  </div>
                  <Link href="/settings">
                    <Button variant="default" data-testid="btn-connect-google-cta">
                      Connect Now
                    </Button>
                  </Link>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      <Dialog open={!!selectedEvent} onOpenChange={() => setSelectedEvent(null)}>
        <DialogContent className="max-w-md" aria-describedby="event-details-description">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2" data-testid="text-event-title">
              {selectedEvent?.resource.type === 'google' && (
                <Badge className="bg-blue-500">Google</Badge>
              )}
              {selectedEvent?.resource.type === 'appointment' && (
                <Badge className={
                  selectedEvent.resource.status === 'confirmed' ? 'bg-green-500' :
                  selectedEvent.resource.status === 'pending' ? 'bg-amber-500' :
                  selectedEvent.resource.status === 'cancelled' ? 'bg-red-500' :
                  'bg-purple-500'
                }>
                  {selectedEvent.resource.status || 'Appointment'}
                </Badge>
              )}
              {selectedEvent?.resource.type === 'manual_block' && (
                <Badge variant="secondary">Blocked</Badge>
              )}
              {selectedEvent?.title}
            </DialogTitle>
            <DialogDescription id="event-details-description" className="sr-only">
              Event details and information
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <p className="text-sm text-muted-foreground">Time</p>
              <p className="font-medium" data-testid="text-event-time">
                {selectedEvent && moment(selectedEvent.start).format('dddd, MMMM D, YYYY')}
                <br />
                {selectedEvent && !selectedEvent.allDay && (
                  <>
                    {moment(selectedEvent.start).format('h:mm A')} - {moment(selectedEvent.end).format('h:mm A')}
                  </>
                )}
                {selectedEvent?.allDay && 'All day'}
              </p>
            </div>

            {selectedEvent?.resource.type === 'appointment' && (
              <>
                <div>
                  <p className="text-sm text-muted-foreground">Student</p>
                  <p className="font-medium" data-testid="text-student-name">{selectedEvent.resource.studentName}</p>
                  <p className="text-sm text-muted-foreground" data-testid="text-student-email">{selectedEvent.resource.studentEmail}</p>
                </div>
                {selectedEvent.resource.appointmentTypeName && (
                  <div>
                    <p className="text-sm text-muted-foreground">Appointment Type</p>
                    <p className="font-medium" data-testid="text-appointment-type">{selectedEvent.resource.appointmentTypeName}</p>
                  </div>
                )}
              </>
            )}

            {selectedEvent?.resource.location && (
              <div>
                <p className="text-sm text-muted-foreground">Location</p>
                <p className="font-medium" data-testid="text-event-location">{selectedEvent.resource.location}</p>
              </div>
            )}

            {selectedEvent?.resource.description && (
              <div>
                <p className="text-sm text-muted-foreground">Description</p>
                <p className="text-sm" data-testid="text-event-description">{selectedEvent.resource.description}</p>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </Layout>
  );
}
