import { useState, useMemo, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Layout } from "@/components/Layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Calendar, momentLocalizer } from 'react-big-calendar';
import moment from 'moment';
import { 
  Calendar as CalendarIcon, 
  List, 
  Plus, 
  Users, 
  Clock,
  MapPin,
  Edit,
  Trash2,
  Copy,
  MoreHorizontal,
  Settings,
  Save
} from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { isUnauthorizedError } from "@/lib/authUtils";
import type { CourseWithSchedules, CourseScheduleWithSessions, User, AppSettings, InsertAppSettings } from "@shared/schema";
import { insertAppSettingsSchema } from "@shared/schema";
import 'react-big-calendar/lib/css/react-big-calendar.css';
import { EventCreationForm } from "@/components/EventCreationForm";
import { CourseCreationForm } from "@/components/CourseCreationForm";

const localizer = momentLocalizer(moment);

export default function CourseManagement() {
  const { user, isAuthenticated } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedView, setSelectedView] = useState<'calendar' | 'list'>('calendar');
  const [showCreateEventModal, setShowCreateEventModal] = useState(false);
  const [showCreateCourseModal, setShowCreateCourseModal] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<CourseScheduleWithSessions | null>(null);

  // Fetch instructor's courses with detailed schedules
  const { data: courses = [], isLoading: coursesLoading } = useQuery<CourseWithSchedules[]>({
    queryKey: ["/api/instructor/courses-detailed"],
    enabled: isAuthenticated && (user as User)?.role === 'instructor',
    retry: false,
  });

  // Fetch app settings
  const { data: appSettings } = useQuery<AppSettings>({
    queryKey: ["/api/app-settings"],
    enabled: isAuthenticated && (user as User)?.role === 'instructor',
    retry: false,
  });

  // Form for app settings
  const settingsForm = useForm<InsertAppSettings>({
    resolver: zodResolver(insertAppSettingsSchema),
    defaultValues: {
      homeCoursesLimit: appSettings?.homeCoursesLimit ?? 20,
    },
  });

  // Update form when settings load
  useEffect(() => {
    if (appSettings) {
      settingsForm.reset({
        homeCoursesLimit: appSettings.homeCoursesLimit,
      });
    }
  }, [appSettings, settingsForm]);

  // App settings update mutation
  const updateSettingsMutation = useMutation({
    mutationFn: async (data: InsertAppSettings) => {
      const response = await apiRequest("PATCH", "/api/app-settings", data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/app-settings"] });
      toast({
        title: "Settings Updated",
        description: "Home page course limit has been updated successfully.",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to update settings. Please try again.",
        variant: "destructive",
      });
    },
  });

  // Transform course schedules into calendar events
  const calendarEvents = useMemo(() => {
    return courses.flatMap(course => 
      course.schedules.map(schedule => {
        // Parse dates properly - handle both string and Date formats
        const startDateStr = schedule.startDate instanceof Date 
          ? schedule.startDate.toISOString().split('T')[0]
          : schedule.startDate?.split('T')[0]?.split(' ')[0]; // Handle "2025-09-27 00:00:00" or "2025-09-27T00:00:00Z"
        
        const endDateStr = schedule.endDate instanceof Date
          ? schedule.endDate.toISOString().split('T')[0]
          : schedule.endDate?.split('T')[0]?.split(' ')[0];
        
        return {
          id: schedule.id,
          title: `${course.title}`,
          start: new Date(`${startDateStr}T${schedule.startTime}:00`), // Format: "2025-09-27T08:30:00"
          end: new Date(`${endDateStr}T${schedule.endTime}:00`),       // Format: "2025-09-28T16:30:00"
          resource: {
            course,
            schedule,
            enrollmentCount: schedule.enrollments?.length || 0,
            waitlistCount: schedule.waitlistEntries?.length || 0,
          }
        };
      })
    );
  }, [courses]);

  // Handle event selection in calendar
  const handleSelectEvent = (event: any) => {
    setSelectedEvent(event.resource.schedule);
  };

  // Custom event style function
  const eventStyleGetter = (event: any) => {
    const { schedule } = event.resource;
    let backgroundColor = '#1f2937'; // navy default
    
    if (schedule.availableSpots === 0) {
      backgroundColor = '#dc2626'; // red for full classes
    } else if (schedule.availableSpots <= 3) {
      backgroundColor = '#f59e0b'; // amber for nearly full
    } else {
      backgroundColor = '#059669'; // green for available
    }

    return {
      style: {
        backgroundColor,
        borderRadius: '4px',
        opacity: 0.8,
        color: 'white',
        border: '0px',
        display: 'block'
      }
    };
  };

  if (!isAuthenticated || (user as User)?.role !== 'instructor') {
    return (
      <Layout>
        <div className="min-h-screen flex items-center justify-center">
          <div className="text-center">
            <h1 className="text-2xl font-bold mb-4">Access Denied</h1>
            <p className="text-muted-foreground">You need instructor access to view this page.</p>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Course Management</h1>
            <p className="text-muted-foreground mt-1">
              Manage your training courses, schedules, and enrollments
            </p>
          </div>
          <div className="flex items-center space-x-4 mt-4 sm:mt-0">
            <Dialog open={showCreateCourseModal} onOpenChange={setShowCreateCourseModal}>
              <DialogTrigger asChild>
                <Button className="bg-primary text-primary-foreground hover:bg-primary/90" data-testid="button-create-course">
                  <Plus className="mr-2 h-4 w-4" />
                  Create Course
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
                <CourseCreationForm 
                  isOpen={showCreateCourseModal}
                  onClose={() => setShowCreateCourseModal(false)}
                  onCourseCreated={() => {
                    queryClient.invalidateQueries({ queryKey: ["/api/instructor/courses"] });
                    queryClient.invalidateQueries({ queryKey: ["/api/instructor/courses-detailed"] });
                    setShowCreateCourseModal(false);
                  }}
                />
              </DialogContent>
            </Dialog>
            <Dialog open={showCreateEventModal} onOpenChange={setShowCreateEventModal}>
              <DialogTrigger asChild>
                <Button className="bg-accent text-accent-foreground hover:bg-accent/90" data-testid="button-create-event">
                  <Plus className="mr-2 h-4 w-4" />
                  Create Event
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>Create New Training Event</DialogTitle>
                </DialogHeader>
                <EventCreationForm 
                  onClose={() => setShowCreateEventModal(false)}
                  onEventCreated={() => {
                    // Refresh courses data
                    queryClient.invalidateQueries({ queryKey: ["/api/instructor/courses-detailed"] });
                  }}
                />
              </DialogContent>
            </Dialog>
          </div>
        </div>

        {/* Settings Tile */}
        <Card className="mb-6">
          <CardHeader className="pb-4">
            <CardTitle className="flex items-center space-x-2 text-lg">
              <Settings className="h-5 w-5" />
              <span>Home Page Settings</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form 
              onSubmit={settingsForm.handleSubmit((data) => {
                updateSettingsMutation.mutate(data);
              })}
              className="flex items-center space-x-4"
            >
              <div className="flex items-center space-x-2">
                <Label htmlFor="homeCoursesLimit" className="text-sm font-medium">
                  Courses to display on home page:
                </Label>
                <Input
                  id="homeCoursesLimit"
                  type="number"
                  min="1"
                  max="50"
                  className="w-20"
                  {...settingsForm.register("homeCoursesLimit", { valueAsNumber: true })}
                  data-testid="input-home-courses-limit"
                />
                <Button 
                  type="submit" 
                  size="sm" 
                  disabled={updateSettingsMutation.isPending}
                  data-testid="button-save-home-courses-limit"
                >
                  <Save className="mr-1 h-3 w-3" />
                  {updateSettingsMutation.isPending ? "Saving..." : "Save"}
                </Button>
              </div>
              {settingsForm.formState.errors.homeCoursesLimit && (
                <p className="text-sm text-destructive" data-testid="status-home-courses-limit">
                  {settingsForm.formState.errors.homeCoursesLimit.message}
                </p>
              )}
            </form>
          </CardContent>
        </Card>

        {/* View Toggle */}
        <Tabs value={selectedView} onValueChange={(value) => setSelectedView(value as 'calendar' | 'list')} className="mb-6">
          <TabsList className="grid w-fit grid-cols-2">
            <TabsTrigger value="calendar" className="flex items-center space-x-2" data-testid="tab-calendar">
              <CalendarIcon className="h-4 w-4" />
              <span>Calendar</span>
            </TabsTrigger>
            <TabsTrigger value="list" className="flex items-center space-x-2" data-testid="tab-list">
              <List className="h-4 w-4" />
              <span>List View</span>
            </TabsTrigger>
          </TabsList>

          {/* Calendar View */}
          <TabsContent value="calendar" className="mt-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span>Training Calendar</span>
                  <div className="flex items-center space-x-4 text-sm">
                    <div className="flex items-center space-x-2">
                      <div className="w-3 h-3 bg-success rounded"></div>
                      <span className="text-muted-foreground">Available</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <div className="w-3 h-3 bg-amber-500 rounded"></div>
                      <span className="text-muted-foreground">Nearly Full</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <div className="w-3 h-3 bg-destructive rounded"></div>
                      <span className="text-muted-foreground">Full</span>
                    </div>
                  </div>
                </CardTitle>
              </CardHeader>
              <CardContent>
                {coursesLoading ? (
                  <div className="h-96 flex items-center justify-center">
                    <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
                  </div>
                ) : (
                  <div className="h-96">
                    <Calendar
                      localizer={localizer}
                      events={calendarEvents}
                      startAccessor="start"
                      endAccessor="end"
                      onSelectEvent={handleSelectEvent}
                      eventPropGetter={eventStyleGetter}
                      views={['month', 'week', 'day']}
                      defaultView="month"
                      popup
                      className="bg-background"
                      data-testid="calendar-view"
                    />
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* List View */}
          <TabsContent value="list" className="mt-6">
            <Card>
              <CardHeader>
                <CardTitle>Upcoming Events</CardTitle>
              </CardHeader>
              <CardContent>
                {coursesLoading ? (
                  <div className="space-y-4">
                    {[1, 2, 3].map(i => (
                      <div key={i} className="animate-pulse p-4 bg-muted rounded-lg">
                        <div className="h-4 bg-muted-foreground/20 rounded w-1/3 mb-2" />
                        <div className="h-3 bg-muted-foreground/20 rounded w-1/2" />
                      </div>
                    ))}
                  </div>
                ) : calendarEvents.length > 0 ? (
                  <div className="space-y-4" data-testid="events-list">
                    {calendarEvents
                      .filter(event => event.start >= new Date())
                      .sort((a, b) => a.start.getTime() - b.start.getTime())
                      .map(event => (
                        <div key={event.id} className="p-4 bg-muted rounded-lg hover:bg-muted/80 transition-colors">
                          <div className="flex items-center justify-between">
                            <div className="flex-1">
                              <div className="flex items-center space-x-3 mb-2">
                                <h3 className="font-medium text-lg" data-testid={`event-title-${event.id}`}>
                                  {event.title}
                                </h3>
                                <Badge 
                                  variant={event.resource.schedule.availableSpots > 0 ? "default" : "destructive"}
                                  data-testid={`event-status-${event.id}`}
                                >
                                  {event.resource.schedule.availableSpots > 0 
                                    ? `${event.resource.schedule.availableSpots} spots left` 
                                    : 'Full'
                                  }
                                </Badge>
                              </div>
                              <div className="flex items-center space-x-6 text-sm text-muted-foreground">
                                <div className="flex items-center space-x-1">
                                  <CalendarIcon className="h-4 w-4" />
                                  <span>{moment(event.start).format('MMM DD, YYYY')}</span>
                                </div>
                                <div className="flex items-center space-x-1">
                                  <Clock className="h-4 w-4" />
                                  <span>{moment(event.start).format('h:mm A')} - {moment(event.end).format('h:mm A')}</span>
                                </div>
                                <div className="flex items-center space-x-1">
                                  <Users className="h-4 w-4" />
                                  <span>{event.resource.enrollmentCount} enrolled</span>
                                </div>
                                {event.resource.schedule.location && (
                                  <div className="flex items-center space-x-1">
                                    <MapPin className="h-4 w-4" />
                                    <span>{event.resource.schedule.location}</span>
                                  </div>
                                )}
                              </div>
                            </div>
                            <div className="flex items-center space-x-2">
                              <Button variant="outline" size="sm" data-testid={`button-edit-${event.id}`}>
                                <Edit className="h-4 w-4" />
                              </Button>
                              <Button variant="outline" size="sm" data-testid={`button-copy-${event.id}`}>
                                <Copy className="h-4 w-4" />
                              </Button>
                              <Button variant="outline" size="sm" data-testid={`button-more-${event.id}`}>
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </div>
                          </div>
                        </div>
                      ))}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <CalendarIcon className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
                    <h3 className="text-lg font-medium text-muted-foreground mb-2">No events scheduled</h3>
                    <p className="text-sm text-muted-foreground mb-4">
                      Create your first training event to get started
                    </p>
                    <Button onClick={() => setShowCreateEventModal(true)} data-testid="button-create-first-event">
                      <Plus className="mr-2 h-4 w-4" />
                      Create Your First Event
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Event Details Modal */}
        {selectedEvent && (
          <Dialog open={!!selectedEvent} onOpenChange={() => setSelectedEvent(null)}>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>Event Details</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <h3 className="font-medium mb-2">Event Information</h3>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-muted-foreground">Start Date:</span>
                      <div>{moment(selectedEvent.startDate).format('MMM DD, YYYY')}</div>
                    </div>
                    <div>
                      <span className="text-muted-foreground">End Date:</span>
                      <div>{moment(selectedEvent.endDate).format('MMM DD, YYYY')}</div>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Time:</span>
                      <div>{selectedEvent.startTime} - {selectedEvent.endTime}</div>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Available Spots:</span>
                      <div>{selectedEvent.availableSpots} / {selectedEvent.maxSpots}</div>
                    </div>
                  </div>
                </div>
                <div className="flex justify-end space-x-2">
                  <Button variant="outline" onClick={() => setSelectedEvent(null)}>
                    Close
                  </Button>
                  <Button>
                    Manage Event
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        )}
      </div>
    </Layout>
  );
}