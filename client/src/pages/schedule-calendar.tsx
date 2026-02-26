import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Calendar, momentLocalizer, View } from "react-big-calendar";
import moment from "moment";
import { Layout } from "@/components/Layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { List, Filter, Search, MapPin, Users, DollarSign, Clock, X } from "lucide-react";
import { Link } from "wouter";
import type { CourseWithSchedules, AppointmentType } from "@shared/schema";
import { formatDateSafe } from "@/lib/dateUtils";
import { BookingModal } from "@/components/BookingModal";

import "react-big-calendar/lib/css/react-big-calendar.css";

const localizer = momentLocalizer(moment);

interface CalendarEvent {
  id: string;
  title: string;
  start: Date;
  end: Date;
  resource: {
    scheduleId: string;
    courseId: string;
    courseTitle: string;
    courseBrief: string;
    coursePrice: number;
    courseCategory: any;
    courseDuration: string;
    location: string;
    startTime: string;
    endTime: string;
    availableSpots: number;
    maxSpots: number;
  };
}

export default function ScheduleCalendar() {
  const [currentView, setCurrentView] = useState<View>("month");
  const [currentDate, setCurrentDate] = useState(new Date());
  const [searchTerm, setSearchTerm] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [priceFilter, setPriceFilter] = useState("all");
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null);
  const [showBookingModal, setShowBookingModal] = useState(false);
  const [selectedAppointmentType, setSelectedAppointmentType] = useState<AppointmentType | null>(null);

  // Helper function to safely get category name
  const getCategoryName = (category: any): string => {
    if (!category) return 'General';
    if (typeof category === 'string') return category || 'General';
    if (typeof category === 'object' && 'name' in category) {
      return (category as any).name as string;
    }
    return 'General';
  };

  // Helper function to safely get category color
  const getCategoryColor = (category: any): string => {
    if (!category) return '#3b82f6';
    if (typeof category === 'object' && 'color' in category) {
      return (category as any).color || '#3b82f6';
    }
    return '#3b82f6';
  };

  // Fetch courses with schedules
  const { data: courses = [], isLoading } = useQuery<CourseWithSchedules[]>({
    queryKey: ["/api/courses"],
  });

  // Fetch categories for filtering
  const { data: categories = [] } = useQuery<any[]>({
    queryKey: ["/api/categories"],
  });

  // Fetch appointment types for booking (using new endpoint without instructor ID)
  const { data: appointmentTypes = [] } = useQuery<AppointmentType[]>({
    queryKey: ["/api/appointments/types"],
  });

  // Extract instructor ID from first appointment type (for single-instructor platform)
  const instructorId = appointmentTypes[0]?.instructorId || "";

  // Convert courses to calendar events
  const calendarEvents = useMemo(() => {
    const now = new Date();
    const events: CalendarEvent[] = [];

    courses.forEach(course => {
      if (course.schedules && course.schedules.length > 0) {
        course.schedules.forEach(schedule => {
          const scheduleDate = new Date(schedule.startDate);
          if (scheduleDate >= now) {
            // Apply filters
            let includeEvent = true;

            // Search filter
            if (searchTerm) {
              const searchLower = searchTerm.toLowerCase();
              includeEvent = includeEvent && !!(
                course.title.toLowerCase().includes(searchLower) ||
                (course.briefDescription && course.briefDescription.toLowerCase().includes(searchLower)) ||
                (schedule.location && schedule.location.toLowerCase().includes(searchLower))
              );
            }

            // Category filter
            if (categoryFilter !== "all") {
              includeEvent = includeEvent && getCategoryName(course.category) === categoryFilter;
            }

            // Price filter
            if (priceFilter !== "all") {
              const price = parseFloat(course.price);
              if (priceFilter === "under-100") {
                includeEvent = includeEvent && price < 100;
              } else if (priceFilter === "100-300") {
                includeEvent = includeEvent && price >= 100 && price <= 300;
              } else if (priceFilter === "over-300") {
                includeEvent = includeEvent && price > 300;
              }
            }

            if (includeEvent) {
              // Helper function to create local date without timezone offset issues
              const createLocalDate = (dateInput: string | Date) => {
                const date = typeof dateInput === 'string' ? new Date(dateInput) : dateInput;
                // Adjust for timezone offset to ensure local date interpretation
                return new Date(date.getTime() + date.getTimezoneOffset() * 60000);
              };

              // Create start and end dates for the calendar event
              const startDate = createLocalDate(schedule.startDate);
              const endDate = schedule.endDate ? createLocalDate(schedule.endDate) : createLocalDate(schedule.startDate);
              
              // If it's a single day event, set the end to be later the same day
              if (startDate.toDateString() === endDate.toDateString()) {
                const [startHour, startMinute] = schedule.startTime.split(':').map(Number);
                const [endHour, endMinute] = schedule.endTime.split(':').map(Number);
                
                startDate.setHours(startHour, startMinute, 0, 0);
                endDate.setHours(endHour, endMinute, 0, 0);
              }

              events.push({
                id: schedule.id,
                title: course.title,
                start: startDate,
                end: endDate,
                resource: {
                  scheduleId: schedule.id,
                  courseId: course.id,
                  courseTitle: course.title,
                  courseBrief: course.briefDescription || "",
                  coursePrice: parseFloat(course.price),
                  courseCategory: course.category,
                  courseDuration: course.duration,
                  location: schedule.location || "",
                  startTime: schedule.startTime,
                  endTime: schedule.endTime,
                  availableSpots: schedule.availableSpots,
                  maxSpots: schedule.maxSpots,
                },
              });
            }
          }
        });
      }
    });

    return events;
  }, [courses, searchTerm, categoryFilter, priceFilter]);

  const handleSelectEvent = (event: CalendarEvent) => {
    setSelectedEvent(event);
  };

  const handleCloseModal = () => {
    setSelectedEvent(null);
  };

  // Custom event style function
  const eventStyleGetter = (event: CalendarEvent) => {
    const categoryColor = getCategoryColor(event.resource.courseCategory);
    return {
      style: {
        backgroundColor: categoryColor,
        borderRadius: '4px',
        opacity: 0.9,
        color: 'white',
        border: '0px',
        display: 'block',
        fontSize: '12px',
      }
    };
  };

  if (isLoading) {
    return (
      <Layout>
        <div className="container mx-auto px-4 py-8">
          <div className="flex items-center justify-center min-h-96">
            <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="max-w-7xl mx-auto px-3 sm:px-5 lg:px-6 py-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-foreground" data-testid="heading-schedule-calendar">
              Course Schedule - Calendar View
            </h1>
            <p className="text-muted-foreground mt-2">
              Visual calendar of all upcoming courses and training sessions
            </p>
          </div>
          
          <Link href="/schedule-list">
            <Button variant="outline" data-testid="button-switch-list">
              <List className="h-4 w-4 mr-2" />
              List View
            </Button>
          </Link>
        </div>

        {/* Filters */}
        <Card className="mb-6 bg-zinc-800/50 border-zinc-700">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2 text-white">
              <Filter className="h-5 w-5" />
              <span>Filters & Search</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-3">
              <div className="space-y-2">
                <label className="text-sm font-medium">Search</label>
                <div className="relative">
                  <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search courses, locations..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                    data-testid="input-search-calendar"
                  />
                </div>
              </div>
              
              <div className="space-y-2">
                <label className="text-sm font-medium">Category</label>
                <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                  <SelectTrigger data-testid="select-category-calendar">
                    <SelectValue placeholder="All Categories" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Categories</SelectItem>
                    {categories.map((category) => (
                      <SelectItem key={category.id} value={category.name}>
                        {category.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div className="space-y-2">
                <label className="text-sm font-medium">Price Range</label>
                <Select value={priceFilter} onValueChange={setPriceFilter}>
                  <SelectTrigger data-testid="select-price-calendar">
                    <SelectValue placeholder="All Prices" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Prices</SelectItem>
                    <SelectItem value="under-100">Under $100</SelectItem>
                    <SelectItem value="100-300">$100 - $300</SelectItem>
                    <SelectItem value="over-300">Over $300</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Results Summary */}
        <div className="mb-6">
          <p className="text-sm text-muted-foreground" data-testid="text-events-count">
            {calendarEvents.length} upcoming {calendarEvents.length === 1 ? 'session' : 'sessions'} found
          </p>
        </div>

        {/* Calendar */}
        <div className="bg-zinc-800/50 rounded-xl p-4 border border-zinc-700">
          <style>{`
            .rbc-calendar { background: transparent; }
            .rbc-toolbar { margin-bottom: 1rem; }
            .rbc-toolbar button { color: #fff; background: #3f3f46; border: 1px solid #52525b; }
            .rbc-toolbar button:hover { background: #52525b; }
            .rbc-toolbar button.rbc-active { background: #bf0000; border-color: #bf0000; }
            .rbc-header { background: #27272a; color: #a1a1aa; padding: 8px; border-bottom: 1px solid #3f3f46; }
            .rbc-month-view, .rbc-time-view { background: #18181b; border: 1px solid #3f3f46; border-radius: 8px; overflow: hidden; }
            .rbc-day-bg { background: #18181b; }
            .rbc-day-bg + .rbc-day-bg { border-left: 1px solid #3f3f46; }
            .rbc-month-row + .rbc-month-row { border-top: 1px solid #3f3f46; }
            .rbc-off-range-bg { background: #0f0f10; }
            .rbc-today { background: #1c1c22 !important; }
            .rbc-date-cell { color: #e4e4e7; padding: 4px 8px; }
            .rbc-date-cell.rbc-off-range { color: #52525b; }
            .rbc-event { cursor: pointer; }
            .rbc-event:focus { outline: 2px solid #bf0000; }
            .rbc-show-more { color: #bf0000; font-weight: 500; }
            .rbc-toolbar-label { color: #fff; font-weight: 600; font-size: 1.1rem; }
            .rbc-time-content { border-top: 1px solid #3f3f46; }
            .rbc-time-header-content { border-left: 1px solid #3f3f46; }
            .rbc-timeslot-group { border-bottom: 1px solid #3f3f46; }
            .rbc-time-slot { color: #a1a1aa; }
            .rbc-current-time-indicator { background-color: #bf0000; }
            .rbc-agenda-view table { color: #e4e4e7; }
            .rbc-agenda-view table thead th { border-bottom: 1px solid #3f3f46; color: #a1a1aa; }
            .rbc-agenda-view table tbody tr { border-bottom: 1px solid #3f3f46; }
            .rbc-agenda-date-cell, .rbc-agenda-time-cell { color: #a1a1aa; }
            .rbc-month-row { min-height: 150px; }
            .rbc-row-segment { max-height: none; }
          `}</style>
          <div style={{ height: '800px' }}>
            <Calendar
              localizer={localizer}
              events={calendarEvents}
              startAccessor="start"
              endAccessor="end"
              style={{ height: '100%' }}
              onSelectEvent={handleSelectEvent}
              view={currentView}
              onView={setCurrentView}
              date={currentDate}
              onNavigate={setCurrentDate}
              eventPropGetter={eventStyleGetter}
              popup={true}
              showMultiDayTimes={true}
              step={60}
              showAllEvents={true}
              data-testid="calendar-view"
            />
          </div>
        </div>

        {/* One-on-One Training Section */}
        <section className="mt-20 py-20 bg-muted/30 rounded-lg">
          <div className="text-center mb-12">
            <h2 className="text-3xl lg:text-4xl font-bold text-foreground mb-4">Book a One-on-One Coaching Session</h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Schedule personalized training sessions tailored to your specific needs and goals.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-5xl mx-auto">
            {appointmentTypes.map((appointmentType) => (
              <Card key={appointmentType.id} className="hover:shadow-lg transition-shadow">
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    <span>{appointmentType.title}</span>
                    {appointmentType.requiresApproval && (
                      <Badge variant="outline" className="text-xs">Approval Required</Badge>
                    )}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground mb-4">{appointmentType.description}</p>
                  <div className="space-y-2 mb-4">
                    <div className="flex items-center text-sm">
                      <Clock className="h-4 w-4 mr-2 text-muted-foreground" />
                      <span>{appointmentType.durationMinutes} minutes</span>
                    </div>
                    <div className="flex items-center text-sm">
                      <DollarSign className="h-4 w-4 mr-2 text-muted-foreground" />
                      <span className="font-semibold">${Number(appointmentType.price).toFixed(2)}</span>
                    </div>
                  </div>
                  <Button
                    className="w-full"
                    onClick={() => {
                      setSelectedAppointmentType(appointmentType);
                      setShowBookingModal(true);
                    }}
                  >
                    Book Now
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>

        {/* Event Details Modal */}
        <Dialog open={!!selectedEvent} onOpenChange={() => setSelectedEvent(null)}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <div className="flex items-center justify-between">
                <DialogTitle data-testid="modal-course-title">
                  {selectedEvent?.resource.courseTitle}
                </DialogTitle>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={handleCloseModal}
                  data-testid="button-close-modal"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </DialogHeader>
            
            {selectedEvent && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <Badge variant="secondary">
                    {getCategoryName(selectedEvent.resource.courseCategory)}
                  </Badge>
                  <div className="flex items-center text-lg font-bold">
                    <DollarSign className="h-4 w-4" />
                    {selectedEvent.resource.coursePrice.toFixed(2)}
                  </div>
                </div>
                
                {selectedEvent.resource.courseBrief && (
                  <p className="text-sm text-muted-foreground">
                    {selectedEvent.resource.courseBrief}
                  </p>
                )}
                
                <div className="space-y-3 text-sm">
                  <div className="flex items-center space-x-2">
                    <Clock className="h-4 w-4 text-muted-foreground" />
                    <span>
                      {formatDateSafe(selectedEvent.start.toISOString())} • {selectedEvent.resource.startTime} - {selectedEvent.resource.endTime}
                    </span>
                  </div>
                  
                  {selectedEvent.resource.location && (
                    <div className="flex items-center space-x-2">
                      <MapPin className="h-4 w-4 text-muted-foreground" />
                      <span>{selectedEvent.resource.location}</span>
                    </div>
                  )}
                  
                  <div className="flex items-center space-x-2">
                    <Users className="h-4 w-4 text-muted-foreground" />
                    <span>
                      {selectedEvent.resource.availableSpots}/{selectedEvent.resource.maxSpots} spots available
                    </span>
                  </div>
                </div>
                
                <div className="pt-4 border-t">
                  <Link href={`/course-registration/${selectedEvent.resource.courseTitle}/${selectedEvent.resource.scheduleId}`}>
                    <Button 
                      className="w-full"
                      disabled={selectedEvent.resource.availableSpots === 0}
                      data-testid="button-register-modal"
                    >
                      {selectedEvent.resource.availableSpots === 0 ? "Course Full" : "Register for Course"}
                    </Button>
                  </Link>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>

        {/* Booking Modal */}
        <BookingModal
          appointmentType={selectedAppointmentType}
          instructorId={instructorId}
          open={showBookingModal}
          onClose={() => {
            setShowBookingModal(false);
            setSelectedAppointmentType(null);
          }}
        />
      </div>
    </Layout>
  );
}