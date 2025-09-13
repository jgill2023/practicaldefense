import { useState } from "react";
import { Link, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useQuery } from "@tanstack/react-query";
import { Layout } from "@/components/Layout";
import { CourseCard } from "@/components/CourseCard";
import { RegistrationModal } from "@/components/RegistrationModal";
import type { CourseWithSchedules, AppSettings } from "@shared/schema";
import heroImage from "@assets/MainHeader2AndyOVERLAY_1757359693558.jpg";

export default function Home() {
  const [, setLocation] = useLocation();
  const [selectedCourse, setSelectedCourse] = useState<CourseWithSchedules | null>(null);
  const [showRegistrationModal, setShowRegistrationModal] = useState(false);
  const [courseFilter, setCourseFilter] = useState("all");

  const { data: courses = [], isLoading } = useQuery<CourseWithSchedules[]>({
    queryKey: ["/api/courses"],
  });

  const { data: categories = [] } = useQuery<{id: string, name: string, sortOrder?: number}[]>({
    queryKey: ["/api/categories"],
  });

  const { data: appSettings } = useQuery<AppSettings>({
    queryKey: ["/api/app-settings"],
  });

  // Sort courses first by date, then by category order
  const sortedAndFilteredCourses = (() => {
    // Create a map of category names to their sort order for quick lookup
    const categoryOrderMap = new Map();
    categories.forEach((category, index) => {
      categoryOrderMap.set(category.name, category.sortOrder || (9999 + index));
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
      coursesToDisplay = [...courses].sort((a, b) => {
        const dateA = getEarliestDate(a);
        const dateB = getEarliestDate(b);
        
        // First sort by date
        if (dateA.getTime() !== dateB.getTime()) {
          return dateA.getTime() - dateB.getTime();
        }
        
        // Then by category sort order
        const orderA = categoryOrderMap.get(a.category?.name) || 9999;
        const orderB = categoryOrderMap.get(b.category?.name) || 9999;
        return orderA - orderB;
      });
    } else {
      // For specific category, show all schedules for that category
      const categorySchedules: CourseWithSchedules[] = [];
      
      courses.forEach(course => {
        if (course.category?.name === courseFilter && course.schedules) {
          course.schedules.forEach(schedule => {
            categorySchedules.push({
              ...course,
              schedules: [schedule]
            });
          });
        }
      });
      
      coursesToDisplay = categorySchedules.sort((a, b) => {
        const dateA = new Date(a.schedules![0].startDate);
        const dateB = new Date(b.schedules![0].startDate);
        return dateA.getTime() - dateB.getTime();
      });
    }

    // Apply course limit from app settings if showing all courses
    if (courseFilter === "all" && appSettings?.homeCoursesLimit) {
      coursesToDisplay = coursesToDisplay.slice(0, appSettings.homeCoursesLimit);
    }

    return coursesToDisplay;
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
      <section className="relative bg-gradient-to-r from-primary to-primary/80 text-primary-foreground overflow-hidden">
        <div className="absolute inset-0">
          <img 
            src={heroImage} 
            alt="Professional firearms training" 
            className="w-full h-full object-cover mix-blend-overlay"
          />
        </div>
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 sm:py-20 lg:py-24">
          <div className="max-w-3xl">
            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold mb-4 sm:mb-6">
              Professional Firearms Training You Can Trust
            </h1>
            <p className="text-lg sm:text-xl mb-6 sm:mb-8 text-primary-foreground/90">
              Practical Defense Training, LLC offers straightforward firearms training with emphasis on New Mexico concealed carry training.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
              <Button size="lg" variant="secondary" className="text-base" data-testid="button-browse-courses">
                Browse Our Courses
              </Button>
              <Button size="lg" variant="outline" className="text-base border-primary-foreground/30 text-primary-foreground hover:bg-primary-foreground hover:text-primary" data-testid="button-learn-more">
                Learn More
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Course Listing Section */}
      <section className="py-12 sm:py-16 lg:py-20 bg-background">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-8 sm:mb-12">
            <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-foreground mb-4">
              Straightforward Firearms Training
            </h2>
            <div className="max-w-6xl mx-auto space-y-3">
              <p className="text-base text-muted-foreground font-light">
                Practical Defense Training, LLC offers straightforward firearms training, with a focus and emphasis on New Mexico concealed carry training. One of the few courses which preaches and teaches practical over "tacti-cool"; bringing reliable and effective firearms training to the responsibly armed citizen.
              </p>
              <p className="text-base text-muted-foreground font-light">
                We believe your firearms training should be <span className="font-semibold">SAFE</span>, <span className="font-semibold">FUN</span>, and <span className="font-semibold">PRACTICAL</span>.
              </p>
            </div>
          </div>
          
          {/* Course Filter Tabs */}
          <div className="flex flex-wrap justify-center gap-2 sm:gap-4 mb-8 sm:mb-12 px-2">
            <Button 
              variant={courseFilter === "all" ? "default" : "outline"}
              onClick={() => setCourseFilter("all")}
              data-testid="filter-all"
            >
              All Courses
            </Button>
            {categories.map((category) => (
              <Button
                key={category.id}
                variant={courseFilter === category.name ? "default" : "outline"}
                onClick={() => setCourseFilter(category.name)}
                data-testid={`filter-${category.name.toLowerCase().replace(/\s+/g, '-')}`}
              >
                {category.name}
              </Button>
            ))}
          </div>
          
          {/* Course Grid */}
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