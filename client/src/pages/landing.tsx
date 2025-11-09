import { useState, useMemo } from "react";
import { Link, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useQuery } from "@tanstack/react-query";
import { Shield, Tag, Users, Star, GraduationCap, Clock, Calendar, User, DollarSign, CalendarClock } from "lucide-react";
import { Layout } from "@/components/Layout";
import { CourseCard } from "@/components/CourseCard";
import { RegistrationModal } from "@/components/RegistrationModal";
import { BookingModal } from "@/components/BookingModal";
import type { CourseWithSchedules, AppSettings, AppointmentType } from "@shared/schema";
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
  const [selectedAppointmentType, setSelectedAppointmentType] = useState<AppointmentType | null>(null);
  const [showBookingModal, setShowBookingModal] = useState(false);

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

  // Filter and sort courses based on home page settings and category filter
  const sortedAndFilteredCourses = useMemo(() => {
    console.log('Filtering courses:', { 
      totalCourses: courses?.length, 
      courseFilter, 
      appSettings 
    });

    if (!courses || courses.length === 0) {
      console.log('No courses available');
      return [];
    }

    // First filter out deleted courses and only show active, published courses with upcoming schedules
    let filtered = courses.filter(course => {
      // Exclude deleted courses
      if (course.deletedAt) {
        console.log(`Filtering out deleted course ${course.title}`);
        return false;
      }

      // Only show active courses
      if (!course.isActive) {
        console.log(`Filtering out inactive course ${course.title}: isActive=${course.isActive}`);
        return false;
      }

      // Only show published courses
      if (course.status !== 'published') {
        console.log(`Filtering out unpublished course ${course.title}: status=${course.status}`);
        return false;
      }

      // Must have at least one upcoming schedule
      const now = new Date();
      const hasUpcomingSchedules = course.schedules && course.schedules.some(schedule => 
        !schedule.deletedAt && 
        new Date(schedule.startDate) > now &&
        schedule.availableSpots > 0
      );

      if (!hasUpcomingSchedules) {
        console.log(`Filtering out course ${course.title}: no upcoming schedules`);
        return false;
      }

      return true;
    });

    console.log(`After basic filters: ${filtered.length} courses`);

    // Apply category filter
    if (courseFilter !== "all") {
      filtered = filtered.filter(course => {
        const categoryName = typeof course.category === 'string' 
          ? course.category 
          : course.category?.name || 'General';
        return categoryName === courseFilter;
      });
      console.log(`After category filter (${courseFilter}): ${filtered.length} courses`);
    }

    // Filter by home page visibility
    filtered = filtered.filter(course => {
      const show = course.showOnHomePage !== false;
      if (!show) {
        console.log(`Filtering out course ${course.title}: showOnHomePage=${course.showOnHomePage}`);
      }
      return show;
    });

    console.log(`After home page visibility filter: ${filtered.length} courses`);

    // Apply home page limit if set
    const limit = appSettings?.homeCoursesLimit || 20;

    // Sort by creation date (newest first) and apply limit
    const result = filtered
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, limit);

    console.log(`Final filtered courses: ${result.length}`);
    return result;
  }, [courses, courseFilter, appSettings]);

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
        <div className="max-w-5xl mx-auto px-3 sm:px-5 lg:px-6">
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
                  className="hover:shadow-lg transition-shadow"
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
                      onClick={() => {
                        setSelectedAppointmentType(type);
                        setShowBookingModal(true);
                      }}
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

      {/* Virtual Coaching and Mental Management Section */}
      <section className="relative w-full py-24" style={{
        backgroundImage: 'url(/coaching-bg.jpg)',
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundRepeat: 'no-repeat'
      }}>
        {/* Semi-transparent black overlay */}
        <div className="absolute inset-0 bg-black/60"></div>

        {/* Content */}
        <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-2 gap-12">
            {/* Left Column - Virtual Coaching */}
            <div className="text-white">
              <h2 className="text-3xl lg:text-4xl mb-6 uppercase" style={{ fontFamily: 'Montserrat, sans-serif', fontWeight: 600 }}>
                Virtual Coaching
              </h2>
              <p className="text-base lg:text-lg leading-relaxed">
                Enhancing your skills through virtual coaching is not only possible but highly effective. We specialize in helping you develop a personalized training plan, thoroughly examining and evaluating all aspects of your current abilities. Our clients consistently experience substantial benefits from virtual coaching, making it an exceptionally cost-effective means of receiving tailored one-on-one guidance.
              </p>
            </div>

            {/* Right Column - Mental Management Coaching */}
            <div className="text-white">
              <h2 className="text-3xl lg:text-4xl mb-6 uppercase" style={{ fontFamily: 'Montserrat, sans-serif', fontWeight: 600 }}>
                Mental Management Coaching
              </h2>
              <p className="text-base lg:text-lg leading-relaxed">
                Proudly, I am among an exclusive group of 23 coaches worldwide certified by the originator and pioneer of Mental Management, Lanny Bassham. As a certified Level II mental management coach, I've dedicated a significant amount of time and resources to becoming an exemplary guide in incorporating mental management concepts into the performer's toolkit.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Footer - Positioned absolutely at bottom */}
      <footer className="relative bg-black text-white py-8 mt-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <p className="text-center text-sm">
            &copy; {new Date().getFullYear()} Tactical Advantage. All rights reserved.
          </p>
        </div>
      </footer>
    </Layout>
  );
}