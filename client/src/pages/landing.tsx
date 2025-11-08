import { useState } from "react";
import { Link, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useQuery } from "@tanstack/react-query";
import { Shield, Tag, Users, Star, GraduationCap, Clock, Calendar, User } from "lucide-react";
import { Layout } from "@/components/Layout";
import { CourseCard } from "@/components/CourseCard";
import { RegistrationModal } from "@/components/RegistrationModal";
import type { CourseWithSchedules, AppSettings } from "@shared/schema";
import heroImage from "@assets/TacticalAdvantageHeader_1762624792996.jpg";
import ccwRangeImage from "@assets/CCW-Range_1757565346453.jpg";
import laptopImage from "@assets/laptop2_1757565355142.jpg";
import dhcImage from "@assets/DHC_1757565361710.jpg";
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
          <h1 className="uppercase mb-4" style={{ fontSize: '33px', fontFamily: 'Montserrat, sans-serif', fontWeight: 700, letterSpacing: '3px', lineHeight: '1.3em' }}>
            Tactical Advantage
          </h1>
          <p className="uppercase font-light mb-12 tracking-wide" style={{ fontSize: '25px', fontFamily: 'Montserrat, sans-serif', fontWeight: 500 }}>
            Different by Design
          </p>

          <div className="flex justify-center mb-16">
            <Button 
              size="lg" 
              className="bg-white text-black hover:bg-gray-200 px-8 py-3 rounded border-2 border-white transition-colors"
              style={{ fontSize: '20px', fontFamily: 'Montserrat, sans-serif', fontWeight: 500 }}
              onClick={() => document.getElementById('courses')?.scrollIntoView({ behavior: 'smooth' })}
              data-testid="button-browse-courses"
            >
              LET'S TRAIN TOGETHER
            </Button>
          </div>
        </div>

      {/* Results-Driven Training Section - Overlaid on hero */}
        <div className="absolute bottom-0 left-0 right-0 z-30 pointer-events-none" style={{ height: '18vh' }}>
          <div className="relative bg-white h-full" style={{ clipPath: 'polygon(0 0, 100% 8%, 100% 100%, 0 100%)' }}>
            <div className="py-4 px-4 sm:px-6 lg:px-8 text-center pointer-events-auto">
              <div className="max-w-7xl mx-auto pt-1">
                <h2 className="text-2xl lg:text-3xl mb-3 uppercase" style={{ fontFamily: 'Montserrat, sans-serif', fontWeight: 600, color: '#000' }}>
                  <span className="line-through">Traditional</span> Results-Driven Training
                </h2>
                <p className="text-base max-w-4xl mx-auto" style={{ color: '#666' }}>
                  We pride ourselves on results-driven training that is tailored to, and for, the individual student.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Training Programs */}
      <section className="bg-muted py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">

            {/* Deductive Pistolcraft */}
            <div className="bg-card rounded-lg overflow-hidden shadow-lg" data-testid="feature-deductive-pistolcraft">
              <div className="mb-4">
                <img 
                  src={ccwRangeImage} 
                  alt="Deductive Pistolcraft"
                  className="w-full object-cover h-64"
                />
              </div>
              <div className="p-6">
                <h3 className="text-2xl font-bold text-foreground mb-4">
                  Deductive Pistolcraft
                </h3>
                <p className="text-base text-muted-foreground mb-6">
                  We tailor the definition of proficiency to our clients' strengths and blind spots, forging a personalized path based on evidence, ability, and individual goals. Our program delves into fundamentals, emphasizing quantifiable metrics to validate theories.
                </p>
                <Button 
                  className="bg-accent text-accent-foreground hover:bg-accent/90 w-full"
                  data-testid="button-learn-more-pistolcraft"
                  onClick={() => document.getElementById('courses')?.scrollIntoView({ behavior: 'smooth' })}
                >
                  Let's Train!
                </Button>
              </div>
            </div>

            {/* Practice for Mastery */}
            <div className="bg-card rounded-lg overflow-hidden shadow-lg" data-testid="feature-practice-mastery">
              <div className="mb-4">
                <img 
                  src={laptopImage} 
                  alt="Practice for Mastery"
                  className="w-full object-cover h-64"
                />
              </div>
              <div className="p-6">
                <h3 className="text-2xl font-bold text-foreground mb-4">
                  Practice for Mastery
                </h3>
                <p className="text-base text-muted-foreground mb-6">
                  Designed to assist our students in crafting a training plan geared towards achieving high-performance goals with a firearm. This program integrates both dry and live fire techniques, showcasing immediate improvements in performance.
                </p>
                <Button 
                  className="bg-accent text-accent-foreground hover:bg-accent/90 w-full"
                  data-testid="button-learn-more-practice"
                  onClick={() => document.getElementById('courses')?.scrollIntoView({ behavior: 'smooth' })}
                >
                  Let's Train!
                </Button>
              </div>
            </div>

            {/* Performance Shooting */}
            <div className="bg-card rounded-lg overflow-hidden shadow-lg" data-testid="feature-performance-shooting">
              <div className="mb-4">
                <img 
                  src={dhcImage} 
                  alt="Performance Shooting for the Concealed Carrier"
                  className="w-full object-cover h-64"
                />
              </div>
              <div className="p-6">
                <h3 className="text-2xl font-bold text-foreground mb-4">
                  Performance Shooting for the Concealed Carrier
                </h3>
                <p className="text-base text-muted-foreground mb-6">
                  Offering an in-depth exploration of performance concepts employed by highly-skilled practitioners, specifically competitive shooters. We delve into applying those metrics to benefit concealed carriers and defensive enthusiasts.
                </p>
                <Button 
                  className="bg-accent text-accent-foreground hover:bg-accent/90 w-full"
                  data-testid="button-learn-more-performance"
                  onClick={() => document.getElementById('courses')?.scrollIntoView({ behavior: 'smooth' })}
                >
                  Let's Train!
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