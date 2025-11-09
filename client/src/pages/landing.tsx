import { useState } from "react";
import { Link, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useQuery } from "@tanstack/react-query";
import { Shield, Tag, Users, Star, GraduationCap, Clock, Calendar, User, DollarSign, CalendarClock } from "lucide-react";
import { Layout } from "@/components/Layout";
import { CourseCard } from "@/components/CourseCard";
import { RegistrationModal } from "@/components/RegistrationModal";
import type { CourseWithSchedules, AppSettings } from "@shared/schema";

type AppointmentType = {
  id: string;
  instructorId: string;
  title: string;
  description: string | null;
  durationMinutes: number;
  price: number;
  requiresApproval: boolean;
  isActive: boolean;
};
import heroImage from "@assets/TacticalAdvantageHeader_1762624792996.jpg";
import ccwRangeImage from "@assets/CCW-Range_1757565346453.jpg";
import laptopImage from "@assets/laptop2_1757565355142.jpg";
import dhcImage from "@assets/DHC_1757565361710.jpg";
import deductivePistolcraftImage from "@assets/Deductive-Pistol-Craft_1762671845456.jpg";
import practiceForMasteryImage from "@assets/Performance-Shooting_1762673186670.jpg";
import performanceShootingImage from "@assets/Practical-Mastery-2025_1762674118627.jpg";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export default function Landing() {
  const [, setLocation] = useLocation();
  const [selectedCourse, setSelectedCourse] = useState<CourseWithSchedules | null>(null);
  const [showRegistrationModal, setShowRegistrationModal] = useState(false);
  const [courseFilter, setCourseFilter] = useState("all"); // Renamed from courseFilter to selectedCategory for clarity

  const { data: courses = [], isLoading } = useQuery<CourseWithSchedules[]>({
    queryKey: ["/api/courses"],
  });

  const { data: categories = [] } = useQuery<any[]>({
    queryKey: ["/api/categories"],
  });

  const { data: appSettings } = useQuery<AppSettings>({
    queryKey: ["/api/app-settings"],
  });

  // Hardcoded instructor ID for single-instructor platform
  const instructorId = "43575331";

  const { data: appointmentTypes = [], isLoading: appointmentsLoading } = useQuery<AppointmentType[]>({
    queryKey: ["/api/appointments/types", instructorId],
    queryFn: async () => {
      const response = await fetch(`/api/appointments/types/${instructorId}`);
      if (!response.ok) throw new Error('Failed to fetch appointment types');
      return response.json();
    },
    retry: false,
  });

  // Helper function to get category name, handling different formats
  const getCategoryName = (category: any): string => {
    if (!category) return 'General';
    if (typeof category === 'string') return category as string;
    if (typeof category === 'object' && 'name' in category && category.name) {
      return category.name as string;
    }
    return 'General';
  };

  // Filter categories to only show those marked for home page display
  const visibleCategories = categories.filter(cat => cat.showOnHomePage !== false);

  // Extract unique category names
  const availableCategories = [
    ...new Set(visibleCategories.map(category => getCategoryName(category.name))),
  ];

  // Sort courses first by date, then by category order
  const sortedAndFilteredCourses = (() => {
    // Create a map of category names to their sort order for quick lookup
    const categoryOrderMap = new Map();
    visibleCategories.forEach((category, index) => {
      categoryOrderMap.set(getCategoryName(category.name), category.sortOrder || (9999 + index));
    });

    // Helper function to get the earliest upcoming schedule date for a course
    const getEarliestDate = (course: CourseWithSchedules) => {
      if (!course.schedules || course.schedules.length === 0) {
        return new Date('9999-12-31'); // Courses without schedules go to the end
      }

      const now = new Date();
      const upcomingDates = course.schedules
        .filter(schedule => new Date(schedule.startDate) >= now)
        .map(schedule => new Date(schedule.startDate))
        .sort((a, b) => a.getTime() - b.getTime());

      // If no upcoming dates, use the most recent past date
      if (upcomingDates.length === 0) {
        const pastDates = course.schedules
          .map(schedule => new Date(schedule.startDate))
          .sort((a, b) => b.getTime() - a.getTime());
        return pastDates[0] || new Date('9999-12-31');
      }

      return upcomingDates[0];
    };

    // Different behavior based on filter selection
    let coursesToDisplay: CourseWithSchedules[];

    if (courseFilter === "all") {
      // For "All Courses", show unique courses (current behavior)
      // Also filter by showOnHomePage for both courses and their categories
      coursesToDisplay = courses.filter(course => {
        const categoryName = getCategoryName(course.category);
        const category = visibleCategories.find(cat => getCategoryName(cat.name) === categoryName);
        return course.showOnHomePage !== false &&
               category; // Only show if category is visible
      });
      coursesToDisplay.sort((a, b) => {
        const dateA = getEarliestDate(a);
        const dateB = getEarliestDate(b);

        // First sort by date
        const dateComparison = dateA.getTime() - dateB.getTime();
        if (dateComparison !== 0) {
          return dateComparison;
        }

        // Then by category order
        const orderA = categoryOrderMap.get(getCategoryName(a.category)) || 9999;
        const orderB = categoryOrderMap.get(getCategoryName(b.category)) || 9999;

        if (orderA !== orderB) {
          return orderA - orderB;
        }

        // Finally by course title
        return a.title.localeCompare(b.title);
      });

      // Filter out courses that have no upcoming schedules
      const now = new Date();
      coursesToDisplay = coursesToDisplay.filter(course => {
        return course.schedules.some(schedule => new Date(schedule.startDate) >= now);
      });

    } else {
      // For specific category filters, show individual schedules
      const now = new Date();
      const categorySchedules: CourseWithSchedules[] = [];

      // Filter courses by category and check visibility
      const categoryCourses = courses.filter(course => {
        const categoryName = getCategoryName(course.category);
        const category = visibleCategories.find(cat => getCategoryName(cat.name) === categoryName);
        return categoryName === courseFilter && 
               course.showOnHomePage !== false &&
               category &&
               course.schedules && 
               course.schedules.length > 0;
      });

      // For each course in the category, create individual entries for each upcoming schedule
      categoryCourses.forEach(course => {
        const upcomingSchedules = course.schedules.filter(schedule => 
          new Date(schedule.startDate) >= now
        );

        // Create a separate course entry for each upcoming schedule
        upcomingSchedules.forEach(schedule => {
          categorySchedules.push({
            ...course,
            id: `${course.id}-${schedule.id}`, // Create unique ID for React key
            schedules: [schedule], // Only include this specific schedule
          });
        });
      });

      // Sort by schedule date
      coursesToDisplay = categorySchedules.sort((a, b) => {
        const dateA = new Date(a.schedules[0]?.startDate || '9999-12-31');
        const dateB = new Date(b.schedules[0]?.startDate || '9999-12-31');
        return dateA.getTime() - dateB.getTime();
      });
    }

    // Apply the course limit from app settings
    const courseLimit = appSettings?.homeCoursesLimit || 20;
    return coursesToDisplay.slice(0, courseLimit);
  })();

  const handleRegisterCourse = (course: CourseWithSchedules) => {
    setSelectedCourse(course);
    setShowRegistrationModal(true);
  };

  const handleCloseModal = () => {
    setShowRegistrationModal(false);
    setSelectedCourse(null);
  };

  return (
    <Layout>
      {/* Hero Section */}
      <section className="relative h-screen flex items-center justify-center overflow-hidden">
        {/* Background Image */}
        <div className="absolute inset-0">
          <div 
            className="w-full h-full bg-cover bg-center"
            style={{
              backgroundImage: `url(${heroImage})`,
              backgroundSize: 'cover',
              backgroundPosition: 'center center',
              backgroundRepeat: 'no-repeat'
            }}
          ></div>
          {/* Dark overlay for better text readability */}
          <div className="absolute inset-0 bg-black/60"></div>
        </div>

        {/* Content */}
        <div className="relative z-20 text-center text-white px-4 sm:px-6 lg:px-8">
          <h1 className="uppercase mb-4 text-4xl sm:text-5xl md:text-6xl lg:text-7xl xl:text-8xl" style={{ fontFamily: 'Montserrat, sans-serif', fontWeight: 700, letterSpacing: '3px', lineHeight: '1.1em' }}>
            Tactical Advantage
          </h1>
          <p className="uppercase mb-12 text-xl sm:text-2xl md:text-3xl lg:text-4xl" style={{ fontFamily: 'Montserrat, sans-serif', fontWeight: 600, letterSpacing: '3px', lineHeight: '1.3em' }}>
            Different by Design
          </p>

          <div className="flex justify-center mb-16">
            <Button 
              size="lg" 
              className="bg-white text-black hover:bg-gray-200 px-4 sm:px-8 py-3 rounded border-2 border-white transition-colors text-sm sm:text-base md:text-lg lg:text-xl"
              style={{ fontFamily: 'Montserrat, sans-serif', fontWeight: 500 }}
              onClick={() => document.getElementById('courses')?.scrollIntoView({ behavior: 'smooth' })}
              data-testid="button-browse-courses"
            >
              LET'S TRAIN TOGETHER
            </Button>
          </div>
        </div>

        {/* Diagonal slope overlay - part of hero section */}
        <div className="absolute bottom-0 left-0 right-0 z-30" style={{ height: '15vh' }}>
          <div className="relative w-full h-full" style={{ clipPath: 'polygon(0 0, 100% 40%, 100% 100%, 0 100%)', backgroundColor: 'transparent' }}>
          </div>
        </div>
      </section>

      {/* Results-Driven Training Section - Separate white section */}
      <section className="bg-white py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl lg:text-4xl mb-6 uppercase" style={{ fontFamily: 'Montserrat, sans-serif', fontWeight: 600, color: '#000' }}>
            <span className="line-through">Traditional</span> Results-Driven Training
          </h2>
          <p className="text-lg max-w-4xl mx-auto" style={{ color: '#000' }}>
            We pride ourselves on results-driven training that is tailored to, and for, the individual student.
          </p>
        </div>
      </section>

      {/* Training Programs */}
      <section className="bg-muted py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Deductive Pistolcraft */}
          <div className="bg-card rounded-lg overflow-hidden shadow-lg mb-8" data-testid="feature-deductive-pistolcraft">
            <div className="grid md:grid-cols-2 gap-6 p-6">
              <div className="flex flex-col justify-center">
                <h3 className="font-semibold text-foreground mb-4" style={{ fontFamily: 'Montserrat, sans-serif', fontSize: '26px', letterSpacing: '0px', lineHeight: '1.5em' }}>
                  Deductive Pistolcraft
                </h3>
                <p className="text-muted-foreground mb-6" style={{ fontSize: '16px', lineHeight: '1.8em' }}>
                  We tailor the definition of proficiency to our clients' strengths and blind spots, forging a personalized path based on evidence, ability, and individual goals. Our program delves into fundamentals, emphasizing quantifiable metrics to validate theories. Grip, trigger control, sighting, practice, goal setting, and performance tracking are integral components, ensuring a comprehensive exploration of pistolcraft tailored to individual needs.
                </p>
                <Button 
                  className="bg-black text-white hover:bg-black/90 w-fit rounded-sm"
                  data-testid="button-learn-more-pistolcraft"
                  onClick={() => document.getElementById('courses')?.scrollIntoView({ behavior: 'smooth' })}
                >
                  LET'S TRAIN!
                </Button>
              </div>
              <div className="flex items-center">
                <img 
                  src={deductivePistolcraftImage}
                  alt="Deductive Pistolcraft Instructor"
                  className="w-full h-auto object-cover"
                />
              </div>
            </div>
          </div>

          {/* Practice for Mastery */}
          <div className="bg-card rounded-lg overflow-hidden shadow-lg" data-testid="feature-practice-mastery">
            <div className="grid md:grid-cols-2 gap-6 p-6">
              <div className="flex items-center">
                <img 
                  src={practiceForMasteryImage}
                  alt="Practice for Mastery Training"
                  className="w-full h-auto object-cover"
                />
              </div>
              <div className="flex flex-col justify-center">
                <h3 className="font-semibold text-foreground mb-4" style={{ fontFamily: 'Montserrat, sans-serif', fontSize: '26px', letterSpacing: '0px', lineHeight: '1.5em' }}>
                  Practice for Mastery
                </h3>
                <p className="text-muted-foreground mb-6" style={{ fontSize: '16px', lineHeight: '1.8em' }}>
                  "Practice for Mastery" is designed to assist our students in crafting a training plan geared towards achieving high-performance goals with a firearm. This program integrates both dry and live fire techniques, showcasing immediate improvements in performance. As participants advance through the curriculum, the emphasis transitions from immediate performance gains to sustained growth.
                </p>
                <Button 
                  className="bg-black text-white hover:bg-black/90 w-fit rounded-sm"
                  data-testid="button-learn-more-practice-mastery"
                  onClick={() => document.getElementById('courses')?.scrollIntoView({ behavior: 'smooth' })}
                >
                  LET'S TRAIN!
                </Button>
              </div>
            </div>
          </div>

          {/* Performance Shooting for the Concealed Carrier */}
          <div className="bg-card rounded-lg overflow-hidden shadow-lg mt-8" data-testid="feature-performance-shooting">
            <div className="grid md:grid-cols-2 gap-6 p-6">
              <div className="flex flex-col justify-center">
                <h3 className="font-semibold text-foreground mb-4" style={{ fontFamily: 'Montserrat, sans-serif', fontSize: '26px', letterSpacing: '0px', lineHeight: '1.5em' }}>
                  Performance Shooting for the Concealed Carrier
                </h3>
                <p className="text-muted-foreground mb-6" style={{ fontSize: '16px', lineHeight: '1.8em' }}>
                  Offering an in-depth exploration of performance concepts employed by highly-skilled practitioners, specifically competitive shooters. In Performance Shooting for the Concealed Carrier we delve into applying those metrics to benefit concealed carriers and defensive enthusiasts, unraveling the hows and whys behind integrating world-class shooting skills into defensive preparedness.
                </p>
                <Button 
                  className="bg-black text-white hover:bg-black/90 w-fit rounded-sm"
                  data-testid="button-learn-more-performance-shooting"
                  onClick={() => document.getElementById('courses')?.scrollIntoView({ behavior: 'smooth' })}
                >
                  LET'S TRAIN!
                </Button>
              </div>
              <div className="flex items-center">
                <img 
                  src={performanceShootingImage}
                  alt="Performance Shooting for the Concealed Carrier"
                  className="w-full h-auto object-cover"
                />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Schedule Your Training Section */}
      <section className="py-20 bg-muted/30" data-testid="section-schedule-training">
        <div className="max-w-7xl mx-auto px-3 sm:px-5 lg:px-6">
          <div className="text-center mb-12">
            <h2 className="text-3xl lg:text-4xl font-bold text-foreground mb-4">
              Schedule Your Training
            </h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Book one-on-one training sessions tailored to your specific needs and schedule.
            </p>
          </div>

          {appointmentsLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[1, 2, 3].map(i => (
                <Card key={i} className="animate-pulse">
                  <div className="h-64 bg-muted" />
                </Card>
              ))}
            </div>
          ) : appointmentTypes.length === 0 ? (
            <div className="text-center py-12">
              <CalendarClock className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
              <p className="text-muted-foreground">No appointment types available at this time.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {appointmentTypes.map((type) => (
                <Card 
                  key={type.id} 
                  className="hover:shadow-lg transition-shadow cursor-pointer"
                  onClick={() => setLocation(`/book-appointment/${instructorId}`)}
                  data-testid={`appointment-card-${type.id}`}
                >
                  <CardHeader>
                    <CardTitle className="flex items-center justify-between">
                      <span>{type.title}</span>
                      {type.requiresApproval && (
                        <Badge variant="outline" className="text-xs">Approval Required</Badge>
                      )}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {type.description && (
                      <p className="text-sm text-muted-foreground mb-4">{type.description}</p>
                    )}
                    <div className="space-y-2 mb-4">
                      <div className="flex items-center gap-2 text-sm">
                        <Clock className="h-4 w-4 text-muted-foreground" />
                        <span>{type.durationMinutes} minutes</span>
                      </div>
                      <div className="flex items-center gap-2 text-sm">
                        <DollarSign className="h-4 w-4 text-muted-foreground" />
                        <span className="font-semibold">${Number(type.price).toFixed(2)}</span>
                      </div>
                    </div>
                    <Button 
                      className="w-full bg-black text-white hover:bg-black/90"
                      data-testid={`button-book-${type.id}`}
                    >
                      Book Now
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* Additional Features Section */}
      <section className="py-20">
        <div className="max-w-7xl mx-auto px-3 sm:px-5 lg:px-6">
          {/* Student Portal Section */}
          <div className="bg-card rounded-lg overflow-hidden shadow-lg mt-8" data-testid="feature-student-portal">
            <div className="grid md:grid-cols-2 gap-6 p-6">
              <div className="flex items-center">
                <img 
                  src={laptopImage}
                  alt="Student Portal Dashboard"
                  className="w-full h-auto object-cover"
                />
              </div>
              <div className="flex flex-col justify-center">
                <h3 className="font-semibold text-foreground mb-4" style={{ fontFamily: 'Montserrat, sans-serif', fontSize: '26px', letterSpacing: '0px', lineHeight: '1.5em' }}>
                  Your Personal Training Hub
                </h3>
                <p className="text-muted-foreground mb-6" style={{ fontSize: '16px', lineHeight: '1.8em' }}>
                  Manage your training journey with our comprehensive student portal. Track your course progress, view upcoming classes, manage payments, and access your certificates all in one place. Stay connected with automated reminders for license renewals and refresher courses to ensure you're always current and ready.
                </p>
                <Button 
                  className="bg-black text-white hover:bg-black/90 w-fit rounded-sm"
                  data-testid="button-view-student-portal"
                  onClick={() => window.location.href = '/student-portal'}
                >
                  ACCESS YOUR PORTAL
                </Button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Course Listings */}
      <section id="courses" className="py-20">
        <div className="max-w-7xl mx-auto px-3 sm:px-5 lg:px-6">
          <div className="text-center mb-16">
            <h2 className="text-3xl lg:text-4xl font-bold text-foreground mb-6">
              Choose a Date and Time
            </h2>
            <p className="text-lg text-muted-foreground max-w-4xl mx-auto">
              Select from our upcoming courses that work best for your schedule.
            </p>
          </div>

          {/* Course Filter Tabs - Mobile Responsive */}
          <div className="flex flex-wrap justify-center gap-2 sm:gap-4 mb-8 sm:mb-12 px-2">
            <Button 
              variant={courseFilter === "all" ? "default" : "outline"}
              onClick={() => setCourseFilter("all")}
              data-testid="filter-all"
            >
              All Courses
            </Button>
            {availableCategories.map((category) => (
              <Button
                key={category}
                variant={courseFilter === category ? "default" : "outline"}
                onClick={() => setCourseFilter(category)}
                data-testid={`filter-${category.toLowerCase().replace(/\s+/g, '-')}`}
              >
                {category}
              </Button>
            ))}
          </div>

          {/* Course Grid - Mobile Responsive */}
          {isLoading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 lg:gap-8">
              {[1, 2, 3].map(i => (
                <Card key={i} className="animate-pulse">
                  <div className="h-48 bg-muted" />
                  <CardContent className="p-4 sm:p-6">
                    <div className="h-4 bg-muted rounded mb-2" />
                    <div className="h-4 bg-muted rounded w-3/4 mb-4" />
                    <div className="h-20 bg-muted rounded mb-4" />
                    <div className="h-10 bg-muted rounded" />
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 lg:gap-8">
              {sortedAndFilteredCourses.map(course => (
                <CourseCard 
                  key={course.id} 
                  course={course} 
                  onRegister={handleRegisterCourse}
                />
              ))}
            </div>
          )}
        </div>
      </section>

      {/* Registration Modal */}
      {showRegistrationModal && selectedCourse && (
        <RegistrationModal 
          course={selectedCourse}
          onClose={handleCloseModal}
        />
      )}
    </Layout>
  );
}