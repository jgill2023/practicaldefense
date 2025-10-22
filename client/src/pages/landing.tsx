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
import heroImage from "@assets/MainHeader2AndyOVERLAY_1757359693558.jpg";
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

  // Extract unique category names, excluding "Printful Products"
  const availableCategories = [
    ...new Set(categories.map(category => getCategoryName(category.name))),
  ].filter(name => name !== "Printful Products");

  // Sort courses first by date, then by category order
  const sortedAndFilteredCourses = (() => {
    // Create a map of category names to their sort order for quick lookup
    const categoryOrderMap = new Map();
    categories.forEach((category, index) => {
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
      // For "All Courses", show unique courses (current behavior), excluding Printful Products
      coursesToDisplay = courses.filter(course => getCategoryName(course.category) !== "Printful Products");
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

      // Filter courses by category, excluding Printful Products
      const categoryCourses = courses.filter(course => {
        const categoryName = getCategoryName(course.category);
        return categoryName === courseFilter && 
               categoryName !== "Printful Products" &&
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
          <div className="absolute inset-0 bg-black/40"></div>
        </div>

        {/* Content */}
        <div className="relative z-20 text-center text-white px-4 sm:px-6 lg:px-8">
          <h1 className="font-medium mb-4 tracking-tight" style={{ fontSize: '40px' }}>
            Practical Defense Training
          </h1>
          <p className="font-light mb-12 tracking-wide" style={{ fontSize: '25px' }}>
            You Don't Have To Be Defenseless.
          </p>

          <div className="flex justify-center mb-16">
            <Button 
              size="lg" 
              className="bg-accent text-accent-foreground hover:bg-accent/90 px-8 py-3 text-lg"
              onClick={() => document.getElementById('courses')?.scrollIntoView({ behavior: 'smooth' })}
              data-testid="button-browse-courses"
            >
              <Calendar className="mr-2 h-5 w-5" />
              View Upcoming Courses
            </Button>
          </div>
        </div>

        {/* Bottom Banner */}
        <div className="absolute bottom-0 left-0 right-0 bg-accent/90 text-white py-4 z-20">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
            <p className="text-lg lg:text-xl font-medium">
              It's <span className="italic font-bold">your</span> life. It's <span className="italic font-bold">your</span> safety and protection. It's <span className="italic font-bold">YOUR</span> responsibility.
            </p>
          </div>
        </div>
      </section>

      {/* Course Feature Blurbs */}
      <section className="bg-muted py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">

            {/* Concealed Carry */}
            <div className="text-center" data-testid="feature-concealed-carry">
              <h3 className="text-lg font-semibold text-foreground mb-4 uppercase tracking-wide">
                CONCEALED CARRY
              </h3>
              <div className="mb-4">
                <img 
                  src={ccwRangeImage} 
                  alt="Concealed Carry Training"
                  className="w-full object-cover"
                  style={{ aspectRatio: '500/331' }}
                />
              </div>
              <p className="text-sm text-muted-foreground mb-4 px-4">
                We offer one of the most comprehensive and fun concealed carry courses in the state.
              </p>
              <Button 
                className="bg-black text-white hover:bg-gray-800 px-8 py-2 rounded-none font-medium tracking-wide"
                data-testid="button-learn-more-ccw"
              >
                LEARN MORE
              </Button>
            </div>

            {/* Online NM CCW Course */}
            <div className="text-center" data-testid="feature-online-course">
              <h3 className="text-lg font-semibold text-foreground mb-4 uppercase tracking-wide">
                ONLINE NM CCW COURSE
              </h3>
              <div className="mb-4">
                <img 
                  src={laptopImage} 
                  alt="Online Course"
                  className="w-full object-cover"
                  style={{ aspectRatio: '500/331' }}
                />
              </div>
              <p className="text-sm text-muted-foreground mb-4 px-4">
                Complete the majority of classroom instruction online, at your own pace!
              </p>
              <Button 
                className="bg-black text-white hover:bg-gray-800 px-8 py-2 rounded-none font-medium tracking-wide"
                data-testid="button-enroll-now"
              >
                ENROLL NOW
              </Button>
            </div>

            {/* Defensive Handgun */}
            <div className="text-center" data-testid="feature-defensive-handgun">
              <h3 className="text-lg font-semibold text-foreground mb-4 uppercase tracking-wide">
                DEFENSIVE HANDGUN
              </h3>
              <div className="mb-4">
                <img 
                  src={dhcImage} 
                  alt="Defensive Handgun Training"
                  className="w-full object-cover"
                  style={{ aspectRatio: '500/331' }}
                />
              </div>
              <p className="text-sm text-muted-foreground mb-4 px-4">
                We offer 3 hour defensive handgun clinics, as well as 1 and 2 day defensive handgun courses.
              </p>
              <Button 
                className="bg-black text-white hover:bg-gray-800 px-8 py-2 rounded-none font-medium tracking-wide"
                data-testid="button-learn-more-defensive"
              >
                LEARN MORE
              </Button>
            </div>

          </div>
        </div>
      </section>

      {/* Course Listings */}
      <section id="courses" className="py-20">
        <div className="max-w-7xl mx-auto px-3 sm:px-5 lg:px-6">
          <div className="text-center mb-16">
            <h2 className="text-3xl lg:text-4xl font-bold text-foreground mb-6">
              Straightforward Firearms Training
            </h2>
            <div className="max-w-6xl mx-auto space-y-3">
              <p className="text-base text-muted-foreground font-light">
                Practical Defense Training, LLC offers straightforward firearms training, with a focus and emphasis on New Mexico concealed carry training. One of the few courses which preaches and teaches practical over "tacti-cool"; bringing reliable and effective firearms training to the responsibly armed citizen. Students will gain the knowledge and skills necessary to legally and responsibly carry a concealed handgun in the State of New Mexico and those States with whom New Mexico shares reciprocity with.
              </p>
              <p className="text-base text-muted-foreground font-light">
                We believe your firearms training should be <span className="font-semibold">SAFE</span>, <span className="font-semibold">FUN</span>, and <span className="font-semibold">PRACTICAL</span>.
              </p>
              <p className="text-base text-muted-foreground font-light">
                Your safety and protection begins with <span className="italic font-semibold">you</span>. It's <span className="italic font-semibold">your</span> life. It's <span className="italic font-semibold">your</span> safety and protection. It's <span className="italic font-semibold">your</span> responsibility.
              </p>
            </div>
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