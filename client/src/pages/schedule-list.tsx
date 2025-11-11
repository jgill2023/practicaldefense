import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Layout } from "@/components/Layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar, Clock, MapPin, Users, DollarSign, Filter, Search } from "lucide-react";
import { Link } from "wouter";
import type { CourseWithSchedules, AppointmentType } from "@shared/schema";
import { formatDateSafe } from "@/lib/dateUtils";
import { BookingModal } from "@/components/BookingModal";

export default function ScheduleList() {
  const [searchTerm, setSearchTerm] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [priceFilter, setPriceFilter] = useState("all");
  const [sortBy, setSortBy] = useState("date");
  const [showBookingModal, setShowBookingModal] = useState(false);
  const [selectedAppointmentType, setSelectedAppointmentType] = useState<AppointmentType | null>(null);
  const instructorId = "43575331";

  // Helper function to safely get category name
  const getCategoryName = (category: any): string => {
    if (!category) return 'General';
    // If it's a string (old format), return it
    if (typeof category === 'string') return category || 'General';
    // If it's an object (new format), return the name
    if (typeof category === 'object' && 'name' in category) {
      return (category as any).name as string;
    }
    return 'General';
  };

  // Fetch courses with schedules
  const { data: courses = [], isLoading } = useQuery<CourseWithSchedules[]>({
    queryKey: ["/api/courses"],
  });

  // Fetch categories for filtering
  const { data: categories = [] } = useQuery<any[]>({
    queryKey: ["/api/categories"],
  });

  // Fetch appointment types for booking
  const { data: appointmentTypes = [] } = useQuery<AppointmentType[]>({
    queryKey: ["/api/appointments/types", instructorId],
  });

  // Filter and process courses to show only upcoming schedules
  const filteredSchedules = useMemo(() => {
    const now = new Date();
    const allSchedules: any[] = [];

    courses.forEach(course => {
      if (course.schedules && course.schedules.length > 0) {
        course.schedules.forEach(schedule => {
          const scheduleDate = new Date(schedule.startDate);
          if (scheduleDate >= now) {
            allSchedules.push({
              ...schedule,
              course: course,
              courseId: course.id,
              courseTitle: course.title,
              courseBrief: course.briefDescription,
              coursePrice: parseFloat(course.price),
              courseCategory: course.category,
              courseDuration: course.duration,
              courseMaxStudents: course.maxStudents,
            });
          }
        });
      }
    });

    // Apply filters
    let filtered = allSchedules;

    // Search filter
    if (searchTerm) {
      filtered = filtered.filter(schedule =>
        schedule.courseTitle.toLowerCase().includes(searchTerm.toLowerCase()) ||
        schedule.courseBrief?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        schedule.location?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Category filter
    if (categoryFilter !== "all") {
      filtered = filtered.filter(schedule => getCategoryName(schedule.courseCategory) === categoryFilter);
    }

    // Price filter
    if (priceFilter !== "all") {
      if (priceFilter === "under-100") {
        filtered = filtered.filter(schedule => schedule.coursePrice < 100);
      } else if (priceFilter === "100-300") {
        filtered = filtered.filter(schedule => schedule.coursePrice >= 100 && schedule.coursePrice <= 300);
      } else if (priceFilter === "over-300") {
        filtered = filtered.filter(schedule => schedule.coursePrice > 300);
      }
    }

    // Sort
    filtered.sort((a, b) => {
      if (sortBy === "date") {
        return new Date(a.startDate).getTime() - new Date(b.startDate).getTime();
      } else if (sortBy === "price") {
        return a.coursePrice - b.coursePrice;
      } else if (sortBy === "title") {
        return a.courseTitle.localeCompare(b.courseTitle);
      } else if (sortBy === "availability") {
        return b.availableSpots - a.availableSpots;
      }
      return 0;
    });

    return filtered;
  }, [courses, searchTerm, categoryFilter, priceFilter, sortBy]);

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
            <h1 className="text-3xl font-bold text-foreground" data-testid="heading-schedule-list">
              Course Schedule - List View
            </h1>
            <p className="text-muted-foreground mt-2">
              All upcoming courses and training sessions
            </p>
          </div>
          
          <Link href="/schedule-calendar">
            <Button variant="outline" data-testid="button-switch-calendar">
              <Calendar className="h-4 w-4 mr-2" />
              Calendar View
            </Button>
          </Link>
        </div>

        {/* Filters */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Filter className="h-5 w-5" />
              <span>Filters & Search</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Search</label>
                <div className="relative">
                  <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search courses, locations..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                    data-testid="input-search"
                  />
                </div>
              </div>
              
              <div className="space-y-2">
                <label className="text-sm font-medium">Category</label>
                <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                  <SelectTrigger data-testid="select-category">
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
                  <SelectTrigger data-testid="select-price">
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
              
              <div className="space-y-2">
                <label className="text-sm font-medium">Sort By</label>
                <Select value={sortBy} onValueChange={setSortBy}>
                  <SelectTrigger data-testid="select-sort">
                    <SelectValue placeholder="Sort by Date" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="date">Date</SelectItem>
                    <SelectItem value="title">Course Name</SelectItem>
                    <SelectItem value="price">Price</SelectItem>
                    <SelectItem value="availability">Availability</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Results Summary */}
        <div className="mb-6">
          <p className="text-sm text-muted-foreground" data-testid="text-results-count">
            {filteredSchedules.length} upcoming {filteredSchedules.length === 1 ? 'session' : 'sessions'} found
          </p>
        </div>

        {/* Schedule List */}
        <div className="space-y-4">
          {filteredSchedules.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <Calendar className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <h3 className="text-lg font-medium mb-2">No upcoming sessions found</h3>
                <p className="text-muted-foreground">
                  {searchTerm || categoryFilter !== "all" || priceFilter !== "all"
                    ? "Try adjusting your filters to see more results."
                    : "There are currently no upcoming course sessions scheduled."}
                </p>
              </CardContent>
            </Card>
          ) : (
            filteredSchedules.map((schedule) => (
              <Card key={schedule.id} className="hover:shadow-lg transition-shadow">
                <CardContent className="p-6">
                  <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between space-y-4 lg:space-y-0">
                    <div className="flex-1">
                      <div className="flex items-start justify-between mb-3">
                        <div>
                          <h3 className="text-xl font-semibold text-foreground" data-testid={`text-course-title-${schedule.courseId}`}>
                            {schedule.courseTitle}
                          </h3>
                          {schedule.courseBrief && (
                            <p className="text-muted-foreground mt-1 line-clamp-2">
                              {schedule.courseBrief}
                            </p>
                          )}
                        </div>
                        <Badge variant="secondary" className="ml-4">
                          {getCategoryName(schedule.courseCategory)}
                        </Badge>
                      </div>
                      
                      <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-4 text-sm">
                        <div className="flex items-center space-x-2">
                          <Calendar className="h-4 w-4 text-muted-foreground" />
                          <span data-testid={`text-date-${schedule.id}`}>
                            {formatDateSafe(schedule.startDate)}
                          </span>
                        </div>
                        
                        <div className="flex items-center space-x-2">
                          <Clock className="h-4 w-4 text-muted-foreground" />
                          <span data-testid={`text-time-${schedule.id}`}>
                            {schedule.startTime} - {schedule.endTime}
                          </span>
                        </div>
                        
                        {schedule.location && (
                          <div className="flex items-center space-x-2">
                            <MapPin className="h-4 w-4 text-muted-foreground" />
                            <span data-testid={`text-location-${schedule.id}`}>
                              {schedule.location}
                            </span>
                          </div>
                        )}
                        
                        <div className="flex items-center space-x-2">
                          <Users className="h-4 w-4 text-muted-foreground" />
                          <span data-testid={`text-spots-${schedule.id}`}>
                            {schedule.availableSpots}/{schedule.maxSpots} spots
                          </span>
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex items-center space-x-4">
                      <div className="text-right">
                        <div className="flex items-center text-2xl font-bold text-foreground">
                          <DollarSign className="h-5 w-5" />
                          {schedule.coursePrice.toFixed(2)}
                        </div>
                        <p className="text-sm text-muted-foreground">
                          {schedule.courseDuration}
                        </p>
                      </div>
                      
                      <Link href={`/course-registration/${schedule.courseId}`}>
                        <Button 
                          className="whitespace-nowrap"
                          disabled={schedule.availableSpots === 0}
                          data-testid={`button-register-${schedule.courseId}`}
                        >
                          {schedule.availableSpots === 0 ? "Full" : "Register"}
                        </Button>
                      </Link>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
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
      </div>

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
    </Layout>
  );
}