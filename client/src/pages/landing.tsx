import { useState, useMemo, useEffect } from "react";
import { Link, useLocation } from "wouter";
import { format } from "date-fns";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useQuery } from "@tanstack/react-query";
import { Shield, Tag, Users, Star, GraduationCap, Clock, Calendar, User, DollarSign, CalendarClock, Target, Award, Crosshair, ChevronLeft, ChevronRight, Quote } from "lucide-react";
import { Layout } from "@/components/Layout";
import { CourseCard } from "@/components/CourseCard";
import { RegistrationModal } from "@/components/RegistrationModal";
import { BookingModal } from "@/components/BookingModal";
import { ComicPanel, TitleCard } from "@/components/RACTheme";
import { SEO } from "@/components/SEO";
import type { CourseWithSchedules, AppSettings, AppointmentType } from "@shared/schema";
import heroImage from "@assets/IMG_2410_1766473695285.jpg";
import ccwRangeImage from "@assets/CCW-Range_1757565346453.jpg";
import laptopImage from "@assets/laptop2_1757565355142.jpg";
import dhcImage from "@assets/DHC_1757565361710.jpg";
import deductivePistolcraftImage from "@assets/Deductive-Pistol-Craft_1762671845456.jpg";
import practiceForMasteryImage from "@assets/Performance-Shooting_1762673186670.jpg";
import performanceShootingImage from "@assets/Practical-Mastery-2025_1762674118627.jpg";
import coachingBackgroundImage from "@assets/Main_1762715966076.jpg";
import oneOnOneTrainingBg from "@assets/header02_1765735082776.jpg";
import bookCoverImage from "@assets/book_1766120705865.jpg";
import onlineNmCcwImage from "@assets/laptop2_ornament_1766643690052.jpg";
import ccwRangeFeatureImage from "@assets/CCW-Range_1766643725051.jpg";
import dhcFeatureImage from "@assets/DHC_1766643777282.jpg";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

const testimonials = [
  {
    quote: "RACC transformed my understanding of concealed carry. The pressure-tested benchmarks gave me real confidence.",
    author: "Michael T.",
    rating: 5,
  },
  {
    quote: "Private sessions on my schedule made all the difference. I went from beginner to confident carrier in months.",
    author: "Sarah K.",
    rating: 5,
  },
  {
    quote: "The 4-phase system is brilliant. You don't just learn—you prove you can perform when it counts.",
    author: "James R.",
    rating: 5,
  },
];

// Google Business Profile Reviews for main testimonials section
const googleReviews = [
  {
    id: 1,
    author: "Dustin C.",
    rating: 5,
    quote: "I took the conceal carry class today. It exceeded my expectations by a long shot. The quality time Derrick took with each one of us in the class was phenomenal. This truly is a community of people that want to see you succeed. 10 out of 10!",
    size: "medium" as const,
  },
  {
    id: 2,
    author: "David Y.",
    rating: 5,
    quote: "There was no chest-pounding or knife-handing, and thankfully politics were checked at the door. The instruction and supervision is actually more than I have seen in most concealed handgun permit courses I have observed over the past 10 years.",
    size: "large" as const,
  },
  {
    id: 3,
    author: "Adam W.",
    rating: 5,
    quote: "When someone is so dedicated to growth – as this team evidently is, the results always ultimately prove it out. This excellent instructor level course is quickly going to become renowned as top flight.",
    size: "small" as const,
  },
  {
    id: 4,
    author: "Marissa B.",
    rating: 5,
    quote: "Derek is an exceptional firearms instructor who truly goes above and beyond. He is patient, encouraging, and always willing to tailor his instruction to meet individual needs. Under his guidance, I've developed a newfound confidence in my ability to protect myself.",
    size: "medium" as const,
  },
  {
    id: 5,
    author: "Pacwest Defense",
    rating: 5,
    quote: "Tim and Derek are great guys. Friendly, funny, and knowledgeable. The students were engaged and focused. At the end of the day, the students were thrilled with the content they learned. They were energized and excited!",
    size: "large" as const,
  },
  {
    id: 6,
    author: "Jennifer M.",
    rating: 5,
    quote: "Small class sizes with personalized attention. They provide firearms and equipment at no extra cost. Perfect for beginners!",
    size: "small" as const,
  },
  {
    id: 7,
    author: "Frank H.",
    rating: 5,
    quote: "The classroom portion was engaging, informative, and time managed well. Tim Kelly is an experienced instructor and marksman who really knows how to teach.",
    size: "medium" as const,
  },
  {
    id: 8,
    author: "Sarah K.",
    rating: 5,
    quote: "Excellent, professional firearm courses. The safety-first culture is rigorous throughout all courses. Welcoming to beginners with zero experience.",
    size: "small" as const,
  },
  {
    id: 9,
    author: "Michael T.",
    rating: 5,
    quote: "The private 1-on-1 sessions made all the difference. Flexible scheduling and personalized training plans for all skill levels. Highly recommend!",
    size: "large" as const,
  },
];

function TestimonialSlider() {
  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % testimonials.length);
    }, 5000);
    return () => clearInterval(timer);
  }, []);

  const goToPrev = () => {
    setCurrentIndex((prev) => (prev - 1 + testimonials.length) % testimonials.length);
  };

  const goToNext = () => {
    setCurrentIndex((prev) => (prev + 1) % testimonials.length);
  };

  const current = testimonials[currentIndex];

  return (
    <div className="relative" data-testid="testimonial-slider">
      <div className="flex items-start gap-3">
        <Quote className="w-8 h-8 text-[hsl(209,90%,38%)] opacity-30 flex-shrink-0 rotate-180" />
        <div className="flex-1 min-h-[80px]">
          <p className="text-sm text-muted-foreground italic leading-relaxed mb-2">
            "{current.quote}"
          </p>
          <div className="flex items-center gap-2">
            <div className="flex">
              {[...Array(5)].map((_, i) => (
                <Star
                  key={i}
                  className={`w-3 h-3 ${i < current.rating ? "text-[hsl(44,89%,61%)] fill-[hsl(44,89%,61%)]" : "text-gray-300"}`}
                />
              ))}
            </div>
            <span className="text-xs font-medium text-foreground">— {current.author}</span>
          </div>
        </div>
      </div>
      
      <div className="flex items-center justify-between mt-3">
        <div className="flex gap-1.5">
          {testimonials.map((_, idx) => (
            <button
              key={idx}
              onClick={() => setCurrentIndex(idx)}
              className={`w-2 h-2 rounded-full transition-all ${
                idx === currentIndex 
                  ? "bg-[hsl(209,90%,38%)] w-4" 
                  : "bg-gray-300 hover:bg-gray-400"
              }`}
              data-testid={`testimonial-dot-${idx}`}
              aria-label={`Go to testimonial ${idx + 1}`}
            />
          ))}
        </div>
        <div className="flex gap-1">
          <button
            onClick={goToPrev}
            className="p-1 rounded hover:bg-muted transition-colors"
            data-testid="testimonial-prev"
            aria-label="Previous testimonial"
          >
            <ChevronLeft className="w-4 h-4 text-muted-foreground" />
          </button>
          <button
            onClick={goToNext}
            className="p-1 rounded hover:bg-muted transition-colors"
            data-testid="testimonial-next"
            aria-label="Next testimonial"
          >
            <ChevronRight className="w-4 h-4 text-muted-foreground" />
          </button>
        </div>
      </div>
    </div>
  );
}

function UpcomingCoursesList({ onRegister }: { onRegister: (course: CourseWithSchedules) => void }) {
  const [, setLocation] = useLocation();
  const [currentPage, setCurrentPage] = useState(0);
  const coursesPerPage = 3;
  
  const { data: courses = [], isLoading } = useQuery<CourseWithSchedules[]>({
    queryKey: ["/api/courses"],
  });

  // Get all upcoming schedules with their course info, sorted by date
  const upcomingSchedules = useMemo(() => {
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const schedulesWithCourse: { schedule: any; course: CourseWithSchedules }[] = [];
    
    courses.forEach(course => {
      if (!course.isActive || course.status !== 'published' || course.deletedAt) return;
      
      course.schedules?.forEach(schedule => {
        if (schedule.deletedAt || schedule.notes?.includes('CANCELLED:')) return;
        
        const startDate = new Date(schedule.startDate);
        // Include today's events and future events
        if (startDate < todayStart) return;
        
        // Calculate available spots
        const enrollmentCount = schedule.enrollments?.filter((e: any) => 
          e.status === 'confirmed' || e.status === 'pending'
        ).length || 0;
        const availableSpots = Math.max(0, schedule.maxSpots - enrollmentCount);
        
        if (availableSpots > 0) {
          schedulesWithCourse.push({ schedule, course });
        }
      });
    });
    
    return schedulesWithCourse.sort((a, b) => 
      new Date(a.schedule.startDate).getTime() - new Date(b.schedule.startDate).getTime()
    );
  }, [courses]);

  const totalPages = Math.ceil(upcomingSchedules.length / coursesPerPage);
  
  // Clamp currentPage when data changes to prevent empty list
  useEffect(() => {
    if (upcomingSchedules.length > 0 && currentPage >= totalPages) {
      setCurrentPage(Math.max(0, totalPages - 1));
    }
  }, [upcomingSchedules.length, totalPages, currentPage]);
  
  const currentSchedules = upcomingSchedules.slice(
    currentPage * coursesPerPage,
    (currentPage + 1) * coursesPerPage
  );

  const goToPrev = () => {
    setCurrentPage(prev => Math.max(0, prev - 1));
  };

  const goToNext = () => {
    setCurrentPage(prev => Math.min(totalPages - 1, prev + 1));
  };

  const formatDate = (dateStr: string) => {
    try {
      const date = new Date(dateStr);
      if (isNaN(date.getTime())) {
        return "Date TBD";
      }
      return format(date, "MMM d, yyyy");
    } catch {
      return "Date TBD";
    }
  };

  const formatTime = (startTime: string, endTime: string) => {
    const formatTimeStr = (t: string) => {
      const [hours, minutes] = t.split(':');
      const h = parseInt(hours);
      const ampm = h >= 12 ? 'pm' : 'am';
      const hour = h % 12 || 12;
      return `${hour}:${minutes} ${ampm}`;
    };
    return `${formatTimeStr(startTime)} - ${formatTimeStr(endTime)}`;
  };

  const formatPrice = (price: string | number) => {
    const numPrice = typeof price === 'string' ? parseFloat(price) : price;
    if (numPrice === 0) return 'Contact for pricing';
    return `$${numPrice.toFixed(2)}`;
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map(i => (
          <div key={i} className="bg-zinc-900 rounded-sm p-6 shadow-md animate-pulse border border-zinc-800">
            <div className="flex gap-6">
              <div className="w-32 h-24 bg-gray-200 rounded-lg"></div>
              <div className="flex-1 space-y-3">
                <div className="h-6 bg-gray-200 rounded w-1/3"></div>
                <div className="h-4 bg-gray-200 rounded w-1/2"></div>
                <div className="h-4 bg-gray-200 rounded w-2/3"></div>
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (upcomingSchedules.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        <Calendar className="w-12 h-12 mx-auto mb-4 opacity-50" />
        <p>No upcoming courses scheduled. Check back soon!</p>
      </div>
    );
  }

  return (
    <div data-testid="upcoming-courses-list">
      <div className="divide-y divide-gray-200 border-t border-b border-gray-200">
        {currentSchedules.map(({ schedule, course }) => (
          <div 
            key={schedule.id}
            className="py-6 hover:bg-zinc-800 transition-colors duration-200 cursor-pointer"
            data-testid={`upcoming-course-${schedule.id}`}
            onClick={() => setLocation(`/course/${course.id}`)}
          >
            <div className="flex flex-col md:flex-row gap-6">
              {/* Course Image */}
              <div className="w-full md:w-40 h-32 flex-shrink-0 rounded-lg overflow-hidden">
                {course.imageUrl ? (
                  <img 
                    src={course.imageUrl} 
                    alt={course.title}
                    className="w-full h-full object-cover"
                    loading="lazy"
                  />
                ) : (
                  <div className="w-full h-full bg-gradient-to-br from-[hsl(209,90%,38%)] to-[hsl(190,65%,47%)] flex items-center justify-center">
                    <Target className="w-10 h-10 text-white opacity-50" />
                  </div>
                )}
              </div>
              
              {/* Course Details */}
              <div className="flex-1">
                <h3 className="font-heading text-xl uppercase tracking-wide text-foreground mb-2">
                  {course.title}
                </h3>
                
                <div className="flex flex-wrap gap-4 text-sm text-muted-foreground mb-2">
                  <div className="flex items-center gap-1">
                    <Calendar className="w-4 h-4" />
                    <span>{formatDate(schedule.startDate)}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Clock className="w-4 h-4" />
                    <span>{formatTime(schedule.startTime, schedule.endTime)}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <DollarSign className="w-4 h-4" />
                    <span className="font-medium text-foreground">{formatPrice(course.price)}</span>
                  </div>
                  {schedule.location && (
                    <div className="flex items-center gap-1">
                      <span>{schedule.location}</span>
                    </div>
                  )}
                </div>
                
                {course.briefDescription && (
                  <p className="text-sm text-muted-foreground line-clamp-2 mb-3">
                    {course.briefDescription}
                  </p>
                )}
                
                <div className="flex items-center gap-3">
                  <Button 
                    size="sm"
                    className="bg-[hsl(209,90%,38%)] text-white hover:bg-[#FD66C5] font-heading uppercase tracking-wide"
                    onClick={(e) => {
                      e.stopPropagation();
                      // If course is in "Hosted Courses" category or has a destination URL, redirect externally
                      const isHostedCourse = course.category === "Hosted Courses";
                      if (isHostedCourse || course.destinationUrl) {
                        if (course.destinationUrl) {
                          window.open(course.destinationUrl, '_blank', 'noopener,noreferrer');
                        }
                        return;
                      }
                      onRegister(course);
                    }}
                    data-testid={`button-book-${schedule.id}`}
                  >
                    Register
                  </Button>
                  <Badge variant="secondary" className="text-xs">
                    {(() => {
                      const enrollmentCount = schedule.enrollments?.filter((e: any) => 
                        e.status === 'confirmed' || e.status === 'pending'
                      ).length || 0;
                      const spots = Math.max(0, schedule.maxSpots - enrollmentCount);
                      return `${spots} spots left`;
                    })()}
                  </Badge>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
      
      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-4 mt-8">
          <button
            onClick={goToPrev}
            disabled={currentPage === 0}
            className={`p-3 rounded-full transition-colors border border-gray-200 ${
              currentPage === 0 
                ? 'opacity-50 cursor-not-allowed' 
                : 'hover:bg-gray-100'
            }`}
            data-testid="upcoming-courses-prev"
            aria-label="Previous page"
          >
            <ChevronLeft className="w-5 h-5 text-muted-foreground" />
          </button>
          
          <div className="flex gap-2">
            {Array.from({ length: totalPages }).map((_, idx) => (
              <button
                key={idx}
                onClick={() => setCurrentPage(idx)}
                className={`w-3 h-3 rounded-full transition-all ${
                  idx === currentPage 
                    ? "bg-[hsl(209,90%,38%)] w-8" 
                    : "bg-gray-300 hover:bg-gray-400"
                }`}
                data-testid={`upcoming-courses-dot-${idx}`}
                aria-label={`Go to page ${idx + 1}`}
              />
            ))}
          </div>
          
          <button
            onClick={goToNext}
            disabled={currentPage === totalPages - 1}
            className={`p-3 rounded-full transition-colors border border-gray-200 ${
              currentPage === totalPages - 1 
                ? 'opacity-50 cursor-not-allowed' 
                : 'hover:bg-gray-100'
            }`}
            data-testid="upcoming-courses-next"
            aria-label="Next page"
          >
            <ChevronRight className="w-5 h-5 text-muted-foreground" />
          </button>
        </div>
      )}
      
      <div className="text-center mt-4">
        <p className="text-sm text-muted-foreground">
          Showing {currentPage * coursesPerPage + 1}-{Math.min((currentPage + 1) * coursesPerPage, upcomingSchedules.length)} of {upcomingSchedules.length} upcoming courses
        </p>
      </div>
    </div>
  );
}

function MosaicTestimonialSlider() {
  const [currentPattern, setCurrentPattern] = useState(0);
  const [isAnimating, setIsAnimating] = useState(false);
  const timeoutRef = { current: null as NodeJS.Timeout | null };
  
  const patterns = [
    [0, 1, 2],
    [3, 4, 5],
    [6, 7, 8],
  ];
  
  const totalPatterns = patterns.length;

  useEffect(() => {
    const timer = setInterval(() => {
      setIsAnimating(true);
      timeoutRef.current = setTimeout(() => {
        setCurrentPattern((prev) => (prev + 1) % totalPatterns);
        setIsAnimating(false);
      }, 500);
    }, 8000);
    return () => {
      clearInterval(timer);
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, [totalPatterns]);

  const goToPrev = () => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    setIsAnimating(true);
    timeoutRef.current = setTimeout(() => {
      setCurrentPattern((prev) => (prev - 1 + totalPatterns) % totalPatterns);
      setIsAnimating(false);
    }, 300);
  };

  const goToNext = () => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    setIsAnimating(true);
    timeoutRef.current = setTimeout(() => {
      setCurrentPattern((prev) => (prev + 1) % totalPatterns);
      setIsAnimating(false);
    }, 300);
  };

  const currentReviews = patterns[currentPattern].map(idx => googleReviews[idx]);

  const TestimonialCard = ({ review, className = "" }: { review: typeof googleReviews[0], className?: string }) => (
    <div 
      className={`bg-zinc-900 rounded-sm shadow-lg p-6 hover:shadow-xl transition-all duration-300 hover:-translate-y-1 border border-zinc-800 min-h-[280px] flex flex-col ${className}`}
      data-testid={`testimonial-card-${review.id}`}
    >
      <Quote className="w-8 h-8 text-[hsl(209,90%,38%)] opacity-20 mb-3 rotate-180" />
      <p className="text-muted-foreground italic leading-relaxed mb-4 text-sm flex-1">
        "{review.quote}"
      </p>
      <div className="flex items-center justify-between mt-auto">
        <div className="flex">
          {[...Array(5)].map((_, i) => (
            <Star
              key={i}
              className={`w-4 h-4 ${i < review.rating ? "text-[hsl(44,89%,61%)] fill-[hsl(44,89%,61%)]" : "text-gray-300"}`}
            />
          ))}
        </div>
        <span className="text-sm font-medium text-foreground">— {review.author}</span>
      </div>
    </div>
  );

  const renderCards = () => (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
      {currentReviews.map((review) => (
        <TestimonialCard key={review.id} review={review} className="h-full" />
      ))}
    </div>
  );

  return (
    <div data-testid="mosaic-testimonial-slider">
      <div className={`transition-all duration-500 ${isAnimating ? 'opacity-0 translate-x-8' : 'opacity-100 translate-x-0'}`}>
        {renderCards()}
      </div>
      
      <div className="flex items-center justify-center gap-4 mt-8">
        <button
          onClick={goToPrev}
          className="p-3 rounded-full hover:bg-gray-100 transition-colors border border-gray-200"
          data-testid="mosaic-testimonial-prev"
          aria-label="Previous reviews"
        >
          <ChevronLeft className="w-5 h-5 text-muted-foreground" />
        </button>
        
        <div className="flex gap-2">
          {patterns.map((_, idx) => (
            <button
              key={idx}
              onClick={() => {
                setIsAnimating(true);
                setTimeout(() => {
                  setCurrentPattern(idx);
                  setIsAnimating(false);
                }, 300);
              }}
              className={`w-3 h-3 rounded-full transition-all ${
                idx === currentPattern 
                  ? "bg-[hsl(209,90%,38%)] w-8" 
                  : "bg-gray-300 hover:bg-gray-400"
              }`}
              data-testid={`mosaic-testimonial-dot-${idx}`}
              aria-label={`Go to review set ${idx + 1}`}
            />
          ))}
        </div>
        
        <button
          onClick={goToNext}
          className="p-3 rounded-full hover:bg-gray-100 transition-colors border border-gray-200"
          data-testid="mosaic-testimonial-next"
          aria-label="Next reviews"
        >
          <ChevronRight className="w-5 h-5 text-muted-foreground" />
        </button>
      </div>
      
      <div className="text-center mt-4">
        <p className="text-sm text-muted-foreground">
          5.0 ★ rating from 80+ Google reviews
        </p>
      </div>
    </div>
  );
}

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

  // Fetch all active appointment types (for single-instructor platform)
  const { data: appointmentTypes = [], isLoading: appointmentsLoading } = useQuery<AppointmentType[]>({
    queryKey: ["/api/appointments/types"],
  });

  // Extract instructor ID from first appointment type (for single-instructor platform)
  const instructorId = appointmentTypes[0]?.instructorId || "";

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
      const hasUpcomingSchedules = course.schedules && course.schedules.some(schedule => {
        // Skip deleted or cancelled schedules
        if (schedule.deletedAt || schedule.notes?.includes('CANCELLED:')) {
          return false;
        }
        
        // Skip past schedules
        if (new Date(schedule.startDate) <= now) {
          return false;
        }
        
        // Calculate actual available spots: maxSpots - enrollmentCount
        // Count both confirmed and pending enrollments (but not cancelled)
        const enrollmentCount = schedule.enrollments?.filter((e: any) => 
          e.status === 'confirmed' || e.status === 'pending'
        ).length || 0;
        const actualAvailableSpots = Math.max(0, schedule.maxSpots - enrollmentCount);
        
        return actualAvailableSpots > 0;
      });

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

    // Sort by sortOrder (ascending), then by creation date (newest first) for courses without sortOrder
    const result = filtered
      .sort((a, b) => {
        // If both have sortOrder, sort by sortOrder ascending
        if (a.sortOrder != null && b.sortOrder != null) {
          return a.sortOrder - b.sortOrder;
        }
        // If only a has sortOrder, it comes first
        if (a.sortOrder != null) return -1;
        // If only b has sortOrder, it comes first
        if (b.sortOrder != null) return 1;
        // If neither has sortOrder, sort by creation date (newest first)
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      })
      .slice(0, limit);

    console.log(`Final filtered courses: ${result.length}`);
    return result;
  }, [courses, courseFilter, appSettings]);

  const handleRegisterCourse = (course: CourseWithSchedules) => {
    console.log('handleRegisterCourse called!', course.title);
    setSelectedCourse(course);
    setShowRegistrationModal(true);
  };

  const handleCloseModal = () => {
    setShowRegistrationModal(false);
    setSelectedCourse(null);
  };

  return (
    <Layout isLandingPage>
      <SEO 
        title="Professional Firearms Training"
        description="Master concealed carry, defensive shooting, and tactical skills with personalized instruction from certified professionals. Group classes and private sessions available."
      />
      {/* Hero Section - Full viewport height container for navigation positioning */}
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
          {/* Semi-transparent black overlay */}
          <div className="absolute inset-0 bg-black/60"></div>
        </div>

        {/* Content - Split layout: Title left (55%), Subtitle + buttons right (45%) */}
        <div className="relative z-20 text-white px-4 sm:px-6 lg:px-0 w-full max-w-7xl mx-auto h-full flex items-center">
          <div className="grid grid-cols-1 gap-8 lg:gap-16 w-full items-center lg:[grid-template-columns:55%_45%]">
            {/* Left side - Title split over 3 rows */}
            <div className="animate-fade-in">
              <h1 className="font-display uppercase tracking-tight leading-[0.8] pl-[0px] pr-[0px] pt-[0px] pb-[0px] mt-[0px] mb-[0px]">
                <span className="block text-6xl md:text-8xl lg:text-9xl xl:text-[10rem] text-white text-left font-extralight pt-[20px] pb-[20px]">PRACTICAL</span>
                <span className="block text-6xl md:text-8xl lg:text-9xl xl:text-[10rem] text-left text-[#ffffff] md:-mt-8 lg:-mt-10 md:ml-32 lg:ml-40 pt-[0px] pb-[0px] mt-[-50px] mb-[-50px] ml-[70px] mr-[70px] font-thin">DEFENSE</span>
                <span className="block text-6xl md:text-8xl lg:text-9xl xl:text-[10rem] text-[#ffffff] md:-mt-8 lg:-mt-10 md:ml-16 lg:ml-20 ml-[20px] mr-[20px] pt-[20px] pb-[20px] mt-[-10px] mb-[-10px] font-thin">TRAINING</span>
              </h1>
            </div>
            
            {/* Right side - Subtitle and buttons */}
            <div className="flex flex-col items-start lg:items-start justify-center animate-fade-in sm:pl-6 lg:pl-0 lg:pr-8 pl-[0px] pr-[0px] ml-[-100px] mr-[-100px]" style={{ animationDelay: '0.15s' }}>
              <p className="text-xl md:text-2xl lg:text-3xl font-body tracking-wide mb-8 text-zinc-200 font-normal">
                You Don't Have to be Defenseless
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center animate-fade-in" style={{ animationDelay: '0.3s' }}>
                <Button
                  size="lg"
                  className="hover:bg-[#006d7a] text-white font-display uppercase tracking-widest px-8 py-6 text-lg shadow-lg bg-[#004149] border border-zinc-700 rounded-sm"
                  onClick={() => setLocation('/schedule-list')}
                  data-testid="button-browse-courses"
                >
                  Upcoming Courses
                </Button>
                <Button
                  size="lg"
                  className="hover:bg-gray-100 text-black font-display uppercase tracking-widest px-8 py-6 text-lg bg-white rounded-sm"
                  onClick={() => setLocation('/online-ccw-class')}
                  data-testid="button-online-ccw"
                >
                  Online CCW Course
                </Button>
              </div>
            </div>
          </div>
        </div>
      </section>
      {/* Featured Courses Section */}
      <section className="py-16 bg-[#222429]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pl-[0px] pr-[0px] pt-[32px] pb-[32px]">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Left Column - Online NM CCW Course (Main Featured) */}
            <Link href="/online-ccw-class" className="block group">
              <div 
                className="relative rounded-[4px] overflow-hidden cursor-pointer aspect-[5/4] group-hover:shadow-[0_8px_30px_rgba(180,180,180,0.15)] transition-shadow duration-300"
                data-testid="featured-course-online-ccw"
              >
                <img 
                  src={onlineNmCcwImage}
                  alt="Online New Mexico CCW Course"
                  className="absolute inset-0 w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                  loading="lazy"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent" />
                <div className="absolute bottom-0 left-0 right-0 p-6 lg:p-8">
                  <span className="text-white/70 text-sm mb-3 block">Online</span>
                  <h3 className="font-heading text-2xl lg:text-3xl uppercase tracking-wide text-white mb-3">
                    Online NM CCW Course
                  </h3>
                  <p className="text-white/80 text-sm lg:text-base mb-4 max-w-md">
                    Complete your New Mexico Concealed Carry certification from anywhere. Comprehensive online training with flexible scheduling.
                  </p>
                  <div className="flex items-center justify-between">
                    <Button 
                      size="lg"
                      className="hover:bg-amber-600 font-heading uppercase tracking-wide bg-[#004149] text-[#ffffff] pl-[16px] pr-[16px]"
                      data-testid="button-featured-online-ccw"
                    >Enroll today</Button>
                  </div>
                </div>
              </div>
            </Link>

            {/* Right Column - Stacked Courses */}
            <div className="flex flex-col gap-6 aspect-[5/4]">
              {/* Top Right - Concealed Carry Course */}
              <Link href="/schedule-list" className="block group flex-1">
                <div 
                  className="relative h-full w-full rounded-[4px] overflow-hidden cursor-pointer bg-zinc-900 group-hover:shadow-[0_8px_30px_rgba(180,180,180,0.15)] transition-shadow duration-300"
                  data-testid="featured-course-ccw"
                >
                  <img 
                    src={ccwRangeFeatureImage}
                    alt="Concealed Carry Course"
                    className="absolute inset-0 w-full h-full object-cover object-[center_30%] transition-transform duration-500 group-hover:scale-105"
                    loading="lazy"
                  />
                  <div className="absolute inset-0 bg-gradient-to-r from-black/80 via-black/50 to-transparent" />
                  <div className="absolute inset-0 p-5 lg:p-6 flex flex-col justify-between">
                    <span className="font-bold text-lg text-right text-[#ffffff]">$165</span>
                    <div>
                      <h3 className="font-heading text-xl lg:text-2xl uppercase tracking-wide text-white mb-2">
                        Concealed Carry Course
                      </h3>
                      <p className="text-white/70 text-sm mb-3 max-w-sm">
                        Hands-on training with expert instructors. Learn safety, fundamentals, and earn your permit.
                      </p>
                      <div className="flex items-center gap-2 text-white/60 text-sm">
                        <Clock className="h-4 w-4" />
                        <span>8 Hours</span>
                      </div>
                    </div>
                  </div>
                </div>
              </Link>

              {/* Bottom Right - Defensive Handgun */}
              <Link href="/schedule-list" className="block group flex-1">
                <div 
                  className="relative h-full w-full rounded-[4px] overflow-hidden cursor-pointer bg-zinc-900 group-hover:shadow-[0_8px_30px_rgba(180,180,180,0.15)] transition-shadow duration-300"
                  data-testid="featured-course-dhc"
                >
                  <img 
                    src={dhcFeatureImage}
                    alt="Defensive Handgun Course"
                    className="absolute inset-0 w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                    loading="lazy"
                  />
                  <div className="absolute inset-0 bg-gradient-to-r from-black/80 via-black/50 to-transparent" />
                  <div className="absolute inset-0 p-5 lg:p-6 flex flex-col justify-between">
                    <span className="font-bold text-lg text-right text-[#ffffff]">$225</span>
                    <div>
                      <h3 className="font-heading text-xl lg:text-2xl uppercase tracking-wide text-white mb-2">
                        Defensive Handgun
                      </h3>
                      <p className="text-white/70 text-sm mb-3 max-w-sm">
                        Advanced tactics including barricade shooting, movement, and real-world scenarios.
                      </p>
                      <div className="flex items-center gap-2 text-white/60 text-sm">
                        <Clock className="h-4 w-4" />
                        <span>8 Hours</span>
                      </div>
                    </div>
                  </div>
                </div>
              </Link>
            </div>
          </div>
        </div>
      </section>
      {/* Customer Testimonials */}
      <section className="bg-zinc-900 py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <TitleCard as="h2" variant="accent" className="text-3xl lg:text-4xl">
              What Our Students Say
            </TitleCard>
          </div>
          <MosaicTestimonialSlider />
        </div>
      </section>
      {/* Registration Modal */}
      {selectedCourse && (
        <RegistrationModal
          course={selectedCourse}
          onClose={handleCloseModal}
          isWaitlist={
            selectedCourse.schedules
              .filter(schedule => 
                !schedule.deletedAt && 
                new Date(schedule.startDate) > new Date() &&
                !schedule.notes?.includes('CANCELLED:')
              )
              .every(schedule => {
                // Calculate actual available spots
                const enrollmentCount = schedule.enrollments?.filter((e: any) => 
                  e.status === 'confirmed' || e.status === 'pending'
                ).length || 0;
                const maxSpots = Number(schedule.maxSpots) || 0;
                const actualAvailableSpots = Math.max(0, maxSpots - enrollmentCount);
                return actualAvailableSpots === 0;
              })
          }
        />
      )}
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