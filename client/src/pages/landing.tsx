import { useState, useMemo, useEffect } from "react";
import { Link, useLocation } from "wouter";
import { format } from "date-fns";
import { Calendar as BigCalendar, momentLocalizer, View } from "react-big-calendar";
import moment from "moment";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useQuery } from "@tanstack/react-query";
import { Shield, Tag, Users, Star, GraduationCap, Clock, Calendar, User, DollarSign, CalendarClock, Target, Award, Crosshair, ChevronLeft, ChevronRight, ChevronDown, ChevronUp, Quote, List, CalendarDays, MapPin } from "lucide-react";
import "react-big-calendar/lib/css/react-big-calendar.css";

const calendarLocalizer = momentLocalizer(moment);
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
import onlineNmCcwImage from "@assets/laptop_1766646320823.jpg";
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

// Map course titles to their dedicated featured page URLs
const featuredPageMap: Record<string, string> = {
  "New Mexico Concealed Carry Course": "/nmccl",
  "Online NM Concealed Carry Course": "/online-nm-concealed-carry-course",
  "Defensive Handgun Course": "/defensive-handgun-course",
  "Defensive Handgun Clinics": "/defensive-handgun-clinics",
  "Onscreen Handgun Handling": "/onscreen-handgun-handling",
  "Responsibly Armed Citizen Criterion": "/racc-program",
};
const getCourseUrl = (course: { id: number | string; title: string }) =>
  featuredPageMap[course.title] || `/course/${course.id}`;

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
    author: "Marcus T.",
    rating: 5,
    quote: "Jeremy is a great instructor and anytime you need to ask him a question he is always available via text. To me this is an awesome trait and worth every penny.",
    size: "medium" as const,
  },
  {
    id: 2,
    author: "Rachel L.",
    rating: 5,
    quote: "I did the online course and it was well put together and made learning at your own pace great. Thanks Jeremy and I will definitely be referring more people.",
    size: "large" as const,
  },
  {
    id: 3,
    author: "Robert K.",
    rating: 5,
    quote: "Had great experience with Jeremy and his training class. I would highly recommend using Practical Defense Training, LLC to get your CCW in New Mexico. Lots of useful knowledge.",
    size: "small" as const,
  },
  {
    id: 4,
    author: "Jennifer D.",
    rating: 5,
    quote: "The online course was professional and comprehensive. Jeremy's responsiveness to questions during and after the course made all the difference. Highly recommend!",
    size: "medium" as const,
  },
  {
    id: 5,
    author: "Christopher M.",
    rating: 5,
    quote: "Best CCW training I've experienced. Jeremy knows how to teach practical, applicable skills. The course material is thorough and the support afterward is outstanding.",
    size: "large" as const,
  },
  {
    id: 6,
    author: "Amanda P.",
    rating: 5,
    quote: "Took the class as a complete beginner and felt welcomed and supported throughout. Jeremy makes learning firearm safety and tactics feel approachable and empowering.",
    size: "small" as const,
  },
  {
    id: 7,
    author: "David R.",
    rating: 5,
    quote: "Professional, knowledgeable, and genuinely cares about student success. Jeremy goes above and beyond to ensure you understand everything. Exceptional training.",
    size: "medium" as const,
  },
  {
    id: 8,
    author: "Lisa W.",
    rating: 5,
    quote: "The course was well-organized and easy to follow online. Jeremy's commitment to accessibility and student support is unmatched. Worth every penny.",
    size: "small" as const,
  },
  {
    id: 9,
    author: "Thomas B.",
    rating: 5,
    quote: "Practical Defense Training delivered exactly what they promised. Clear instruction, practical applications, and outstanding customer service. Highly satisfied.",
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

  const { data: categories = [] } = useQuery<any[]>({
    queryKey: ["/api/categories"],
  });

  // Get all upcoming schedules with their course info, sorted by category order then date
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

    // Build category sort order lookup
    const catSortMap = new Map<string, number>();
    categories.forEach((cat: any) => {
      catSortMap.set(cat.name, cat.sortOrder ?? 9999);
    });

    return schedulesWithCourse.sort((a, b) => {
      const aCatName = typeof a.course.category === 'string' ? a.course.category : (a.course.category as any)?.name || 'General';
      const bCatName = typeof b.course.category === 'string' ? b.course.category : (b.course.category as any)?.name || 'General';
      const aCatOrder = catSortMap.get(aCatName) ?? 9999;
      const bCatOrder = catSortMap.get(bCatName) ?? 9999;
      if (aCatOrder !== bCatOrder) return aCatOrder - bCatOrder;
      return new Date(a.schedule.startDate).getTime() - new Date(b.schedule.startDate).getTime();
    });
  }, [courses, categories]);

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
      // Parse date parts manually to avoid UTC timezone offset issues
      const datePart = dateStr.includes('T') ? dateStr.split('T')[0] : dateStr;
      const [year, month, day] = datePart.split('-').map(Number);
      const date = new Date(year, month - 1, day);
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
            onClick={() => setLocation(getCourseUrl(course))}
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

function TestimonialCard({ review }: { review: typeof googleReviews[0] }) {
  return (
    <div 
      className="bg-zinc-900/50 backdrop-blur-sm rounded-2xl p-6 border border-zinc-800 mb-4"
      data-testid={`testimonial-card-${review.id}`}
    >
      <div className="flex items-center gap-3 mb-4">
        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-zinc-700 to-zinc-800 
                        flex items-center justify-center text-white font-semibold text-sm
                        border border-zinc-600">
          {review.author.charAt(0)}
        </div>
        <div>
          <h4 className="font-semibold text-white text-base leading-tight">
            {review.author}
          </h4>
          <div className="flex items-center gap-1 mt-0.5">
            {[...Array(5)].map((_, i) => (
              <Star
                key={i}
                className={`w-3 h-3 ${
                  i < review.rating 
                    ? "text-amber-400 fill-amber-400" 
                    : "text-zinc-600"
                }`}
              />
            ))}
          </div>
        </div>
      </div>
      <p className="text-zinc-300 text-sm leading-relaxed">
        "{review.quote}"
      </p>
    </div>
  );
}

function ScrollingColumn({ reviews, direction, speed = 30 }: { 
  reviews: typeof googleReviews; 
  direction: 'up' | 'down';
  speed?: number;
}) {
  const duplicatedReviews = [...reviews, ...reviews, ...reviews];
  const animationDuration = reviews.length * speed;
  
  return (
    <div className="relative h-[500px] overflow-hidden group">
      <div className="absolute inset-x-0 top-0 h-20 bg-gradient-to-b from-zinc-900 to-transparent z-10 pointer-events-none" />
      <div className="absolute inset-x-0 bottom-0 h-20 bg-gradient-to-t from-zinc-900 to-transparent z-10 pointer-events-none" />
      
      <div 
        className={`flex flex-col group-hover:[animation-play-state:paused] ${
          direction === 'up' 
            ? 'animate-scroll-up' 
            : 'animate-scroll-down'
        }`}
        style={{ 
          animationDuration: `${animationDuration}s`,
          animationTimingFunction: 'linear',
          animationIterationCount: 'infinite',
        }}
      >
        {duplicatedReviews.map((review, index) => (
          <TestimonialCard key={`${review.id}-${index}`} review={review} />
        ))}
      </div>
    </div>
  );
}

function TestimonialGrid() {
  const column1 = googleReviews.filter((_, i) => i % 3 === 0);
  const column2 = googleReviews.filter((_, i) => i % 3 === 1);
  const column3 = googleReviews.filter((_, i) => i % 3 === 2);

  return (
    <div data-testid="testimonial-grid" className="relative">
      <div className="hidden lg:grid lg:grid-cols-3 gap-6">
        <ScrollingColumn reviews={column1} direction="up" speed={25} />
        <ScrollingColumn reviews={column2} direction="down" speed={28} />
        <ScrollingColumn reviews={column3} direction="up" speed={26} />
      </div>
      
      <div className="lg:hidden">
        <ScrollingColumn reviews={googleReviews} direction="up" speed={20} />
      </div>
      
      <div className="text-center mt-8">
        <p className="text-sm text-zinc-500">
          5.0 ★ rating from 80+ Google reviews
        </p>
      </div>
    </div>
  );
}

interface CalendarEvent {
  id: string;
  title: string;
  start: Date;
  end: Date;
  resource: {
    scheduleId: string;
    courseId: string;
    courseTitle: string;
    coursePrice: number;
    location: string;
    startTime: string;
    endTime: string;
    availableSpots: number;
  };
}

function UpcomingCoursesSection({ onRegister }: { onRegister: (course: CourseWithSchedules) => void }) {
  const [, setLocation] = useLocation();
  const [viewMode, setViewMode] = useState<'calendar' | 'list'>('list');
  const [currentView, setCurrentView] = useState<View>("month");
  const [currentDate, setCurrentDate] = useState(new Date());

  const { data: courses = [], isLoading } = useQuery<CourseWithSchedules[]>({
    queryKey: ["/api/courses"],
  });

  const { data: categories = [] } = useQuery<any[]>({
    queryKey: ["/api/categories"],
  });

  const calendarEvents = useMemo(() => {
    const now = new Date();
    const events: CalendarEvent[] = [];

    courses.forEach(course => {
      if (!course.isActive || course.status !== 'published' || course.deletedAt) return;
      
      course.schedules?.forEach(schedule => {
        if (schedule.deletedAt || schedule.notes?.includes('CANCELLED:')) return;
        
        const scheduleDate = new Date(schedule.startDate);
        if (scheduleDate < now) return;

        const enrollmentCount = schedule.enrollments?.filter((e: any) => 
          e.status === 'confirmed' || e.status === 'pending'
        ).length || 0;
        const availableSpots = Math.max(0, schedule.maxSpots - enrollmentCount);
        
        if (availableSpots > 0) {
          const dateParts = schedule.startDate.split('T')[0].split('-');
          const [startHour, startMinute] = schedule.startTime.split(':').map(Number);
          const [endHour, endMinute] = schedule.endTime.split(':').map(Number);
          
          const startDate = new Date(
            parseInt(dateParts[0]), 
            parseInt(dateParts[1]) - 1, 
            parseInt(dateParts[2]),
            startHour,
            startMinute
          );
          
          const endDateStr = schedule.endDate || schedule.startDate;
          const endDateParts = endDateStr.split('T')[0].split('-');
          const endDate = new Date(
            parseInt(endDateParts[0]),
            parseInt(endDateParts[1]) - 1,
            parseInt(endDateParts[2]),
            endHour,
            endMinute
          );

          events.push({
            id: schedule.id,
            title: course.title,
            start: startDate,
            end: endDate,
            resource: {
              scheduleId: schedule.id,
              courseId: course.id,
              courseTitle: course.title,
              coursePrice: parseFloat(course.price),
              location: schedule.location || "",
              startTime: schedule.startTime,
              endTime: schedule.endTime,
              availableSpots,
            },
          });
        }
      });
    });

    return events;
  }, [courses]);

  const upcomingSchedules = useMemo(() => {
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const schedulesWithCourse: { schedule: any; course: CourseWithSchedules }[] = [];
    
    courses.forEach(course => {
      if (!course.isActive || course.status !== 'published' || course.deletedAt) return;
      
      course.schedules?.forEach(schedule => {
        if (schedule.deletedAt || schedule.notes?.includes('CANCELLED:')) return;
        
        const startDate = new Date(schedule.startDate);
        if (startDate < todayStart) return;
        
        const enrollmentCount = schedule.enrollments?.filter((e: any) => 
          e.status === 'confirmed' || e.status === 'pending'
        ).length || 0;
        const availableSpots = Math.max(0, schedule.maxSpots - enrollmentCount);
        
        if (availableSpots > 0) {
          schedulesWithCourse.push({ schedule, course });
        }
      });
    });
    
    // Build category sort order lookup from Category Management page order
    const catSortMap = new Map<string, number>();
    categories.forEach((cat: any) => {
      catSortMap.set(cat.name, cat.sortOrder ?? 9999);
    });

    return schedulesWithCourse.sort((a, b) => {
      // Primary sort: category sortOrder (matching Category Management page order)
      const aCatName = typeof a.course.category === 'string' ? a.course.category : (a.course.category as any)?.name || 'General';
      const bCatName = typeof b.course.category === 'string' ? b.course.category : (b.course.category as any)?.name || 'General';
      const aCatOrder = catSortMap.get(aCatName) ?? 9999;
      const bCatOrder = catSortMap.get(bCatName) ?? 9999;
      if (aCatOrder !== bCatOrder) return aCatOrder - bCatOrder;

      // Secondary sort: date
      return new Date(a.schedule.startDate).getTime() - new Date(b.schedule.startDate).getTime();
    });
  }, [courses, categories]);

  const eventStyleGetter = (event: CalendarEvent) => {
    return {
      style: {
        backgroundColor: '#004149',
        borderRadius: '4px',
        opacity: 0.9,
        color: 'white',
        border: '0px',
        display: 'block',
        fontSize: '12px',
      }
    };
  };

  const formatDate = (dateStr: string) => {
    try {
      // Parse date parts manually to avoid UTC timezone offset issues
      const datePart = dateStr.includes('T') ? dateStr.split('T')[0] : dateStr;
      const [year, month, day] = datePart.split('-').map(Number);
      const date = new Date(year, month - 1, day);
      if (isNaN(date.getTime())) return "Date TBD";
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
      <div className="flex items-center justify-center py-20">
        <div className="animate-spin w-8 h-8 border-4 border-[#004149] border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div data-testid="upcoming-courses-section">
      <div className="flex items-center justify-between mb-8 flex-wrap gap-4">
        <div className="flex bg-zinc-800 rounded-lg p-1" data-testid="view-toggle">
          <button
            onClick={() => setViewMode('calendar')}
            className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-all ${
              viewMode === 'calendar' 
                ? 'bg-[#004149] text-white' 
                : 'text-zinc-400 hover:text-white'
            }`}
            data-testid="toggle-calendar-view"
          >
            <CalendarDays className="w-4 h-4" />
            Calendar
          </button>
          <button
            onClick={() => setViewMode('list')}
            className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-all ${
              viewMode === 'list' 
                ? 'bg-[#004149] text-white' 
                : 'text-zinc-400 hover:text-white'
            }`}
            data-testid="toggle-list-view"
          >
            <List className="w-4 h-4" />
            List
          </button>
        </div>
        
      </div>

      {viewMode === 'calendar' ? (
        <div className="bg-zinc-800/50 rounded-xl p-4 border border-zinc-700">
          <style>{`
            .rbc-calendar { background: transparent; }
            .rbc-toolbar { margin-bottom: 1rem; }
            .rbc-toolbar button { color: #fff; background: #3f3f46; border: 1px solid #52525b; }
            .rbc-toolbar button:hover { background: #52525b; }
            .rbc-toolbar button.rbc-active { background: #004149; border-color: #004149; }
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
            .rbc-event:focus { outline: 2px solid #004149; }
            .rbc-show-more { color: #004149; font-weight: 500; }
            .rbc-toolbar-label { color: #fff; font-weight: 600; font-size: 1.1rem; }
          `}</style>
          <div style={{ height: '800px' }}>
            <BigCalendar
              localizer={calendarLocalizer}
              events={calendarEvents}
              startAccessor="start"
              endAccessor="end"
              style={{ height: '100%' }}
              onSelectEvent={(event) => setLocation(getCourseUrl({ id: event.resource.courseId, title: event.resource.courseTitle }))}
              view={currentView}
              onView={setCurrentView}
              date={currentDate}
              onNavigate={setCurrentDate}
              eventPropGetter={eventStyleGetter}
              popup={true}
              views={['month']}
              data-testid="embedded-calendar"
            />
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          <p className="text-zinc-400 text-sm mb-2">{upcomingSchedules.length} upcoming sessions found</p>
          {upcomingSchedules.length === 0 ? (
            <div className="text-center py-12 text-zinc-500">
              <Calendar className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p>No upcoming courses scheduled. Check back soon!</p>
            </div>
          ) : (
            upcomingSchedules.slice(0, 6).map(({ schedule, course }) => {
              const enrollmentCount = schedule.enrollments?.filter((e: any) =>
                e.status === 'confirmed' || e.status === 'pending'
              ).length || 0;
              const totalSpots = Number(schedule.maxSpots) || 0;
              const availableSpots = Math.max(0, totalSpots - enrollmentCount);
              const categoryName = typeof course.category === 'string'
                ? course.category
                : (course.category && typeof course.category === 'object' && 'name' in course.category)
                  ? (course.category as any).name
                  : 'General';
              const displayImageUrl = course.imageUrl && course.imageUrl.trim() !== ''
                ? course.imageUrl
                : (() => {
                    const title = (course.title || '').toLowerCase();
                    const cat = (categoryName || '').toLowerCase();
                    if (title.includes('concealed') || title.includes('ccw') || title.includes('ccl')) return ccwRangeFeatureImage;
                    if (title.includes('defensive') || title.includes('handgun')) return dhcFeatureImage;
                    if (title.includes('live-fire') || title.includes('range session')) return performanceShootingImage;
                    if (title.includes('refresher') || title.includes('renewal')) return ccwRangeImage;
                    if (title.includes('pistolcraft') || title.includes('deductive')) return deductivePistolcraftImage;
                    if (title.includes('mastery') || title.includes('performance')) return practiceForMasteryImage;
                    if (cat.includes('concealed') || cat.includes('ccw')) return ccwRangeFeatureImage;
                    if (cat.includes('defensive') || cat.includes('handgun')) return dhcFeatureImage;
                    if (cat.includes('live-fire') || cat.includes('range')) return performanceShootingImage;
                    if (cat.includes('refresher') || cat.includes('renewal')) return ccwRangeImage;
                    if (cat.includes('advanced')) return dhcFeatureImage;
                    return ccwRangeFeatureImage;
                  })();

              return (
                <div
                  key={schedule.id}
                  className="bg-zinc-800/50 rounded-lg border border-zinc-700 hover:border-zinc-500
                             transition-all duration-300 cursor-pointer overflow-hidden"
                  onClick={() => setLocation(getCourseUrl(course))}
                  data-testid={`list-course-${schedule.id}`}
                >
                  <div className="flex flex-col md:flex-row">
                    {/* Course Image */}
                    <div className="relative w-full md:w-64 h-40 md:h-auto flex-shrink-0 overflow-hidden">
                      <img
                        src={displayImageUrl}
                        alt={course.title}
                        className="w-full h-full object-cover"
                        loading="lazy"
                      />
                      {(() => {
                        const ct = (course as any).courseType;
                        const title = course.title.toLowerCase();
                        const label = ct === 'refresher' ? 'Refresher Course'
                          : ct === 'renewal' ? 'Renewal Course'
                          : title.includes('refresher') ? 'Refresher Course'
                          : title.includes('renewal') ? 'Renewal Course'
                          : null;
                        return label ? (
                          <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                            <span className="text-white font-heading text-sm sm:text-base uppercase tracking-widest drop-shadow-lg">
                              {label}
                            </span>
                          </div>
                        ) : null;
                      })()}
                    </div>

                    {/* Course Details */}
                    <div className="flex-1 p-5 flex flex-col justify-center">
                      <h3 className="font-heading text-xl uppercase tracking-wide text-white mb-1">
                        {course.title}
                      </h3>

                      <div className="flex items-center gap-2 text-zinc-400 text-sm mb-4">
                        <Calendar className="w-4 h-4" />
                        <span>{(() => {
                          const datePart = schedule.startDate.includes('T') ? schedule.startDate.split('T')[0] : schedule.startDate;
                          const [y, m, d] = datePart.split('-').map(Number);
                          return format(new Date(y, m - 1, d), "MM/dd/yyyy");
                        })()}</span>
                      </div>

                      <div className="flex flex-wrap gap-6 text-sm text-zinc-400">
                        <div className="flex items-center gap-2">
                          <Clock className="w-4 h-4" />
                          <span>{formatTime(schedule.startTime, schedule.endTime)}</span>
                        </div>
                        {schedule.location && (
                          <div className="flex items-center gap-2">
                            <MapPin className="w-4 h-4" />
                            <span>{schedule.location}</span>
                          </div>
                        )}
                        <div className="flex items-center gap-2">
                          <Users className="w-4 h-4" />
                          <span>{availableSpots}/{totalSpots} spots</span>
                        </div>
                      </div>
                    </div>

                    {/* Right Side: Badge, Price, Register */}
                    <div className="flex flex-row md:flex-col items-center md:items-end justify-between md:justify-center gap-3 p-5 md:pl-0 md:min-w-[200px]">
                      <Badge className="bg-[#004149] text-white text-xs font-normal px-3 py-1 whitespace-nowrap">
                        {categoryName}
                      </Badge>
                      <div className="text-right">
                        <div className="text-white text-2xl font-bold">{formatPrice(course.price)}</div>
                        {course.duration && (
                          <div className="text-zinc-400 text-sm">{course.duration}</div>
                        )}
                      </div>
                      <Button
                        size="sm"
                        className="bg-[#004149] text-white hover:bg-[#006d7a] font-heading uppercase tracking-wide px-6 rounded-sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          const isHostedCourse = course.category === "Hosted Courses";
                          if (isHostedCourse || course.destinationUrl) {
                            if (course.destinationUrl) {
                              window.open(course.destinationUrl, '_blank', 'noopener,noreferrer');
                            }
                            return;
                          }
                          onRegister(course);
                        }}
                        data-testid={`button-register-${schedule.id}`}
                      >
                        Register
                      </Button>
                    </div>
                  </div>
                </div>
              );
            })
          )}
          
          {upcomingSchedules.length > 6 && (
            <div className="text-center pt-4">
              <Link href="/schedule-list">
                <Button variant="outline" className="border-zinc-700 text-zinc-300 hover:bg-zinc-800">
                  View All {upcomingSchedules.length} Courses
                </Button>
              </Link>
            </div>
          )}
        </div>
      )}
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

    // Build a lookup from category name to its sortOrder from the Category Management page
    const categorySortMap = new Map<string, number>();
    categories.forEach((cat: any) => {
      categorySortMap.set(cat.name, cat.sortOrder ?? 9999);
    });

    // Sort by category sortOrder first, then by course sortOrder within each category
    const result = filtered
      .sort((a, b) => {
        // Primary sort: category sortOrder (matching Category Management page order)
        const aCatName = getCategoryName(a.category);
        const bCatName = getCategoryName(b.category);
        const aCatOrder = categorySortMap.get(aCatName) ?? 9999;
        const bCatOrder = categorySortMap.get(bCatName) ?? 9999;
        if (aCatOrder !== bCatOrder) return aCatOrder - bCatOrder;

        // Secondary sort: course sortOrder within each category
        if (a.sortOrder != null && b.sortOrder != null) {
          return a.sortOrder - b.sortOrder;
        }
        if (a.sortOrder != null) return -1;
        if (b.sortOrder != null) return 1;

        // Fallback: creation date (newest first)
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      })
      .slice(0, limit);

    console.log(`Final filtered courses: ${result.length}`);
    return result;
  }, [courses, courseFilter, appSettings, categories]);

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
        <div className="relative z-20 text-white px-4 sm:px-6 lg:px-0 w-full max-w-7xl mx-auto h-full flex items-center pt-20 md:pt-0">
          <div className="grid grid-cols-1 gap-8 lg:gap-16 w-full items-center lg:[grid-template-columns:55%_45%]">
            {/* Left side - Title split over 3 rows */}
            <div className="animate-fade-in px-4 sm:px-0">
              <h1 className="font-display uppercase tracking-tight leading-[0.8] pt-[20px] pb-[20px] mt-[0px] mb-[0px]">
                <span className="block text-5xl sm:text-6xl md:text-7xl lg:text-9xl xl:text-[10rem] text-white text-center lg:text-left font-extralight">PRACTICAL</span>
                <span className="block text-5xl sm:text-6xl md:text-7xl lg:text-9xl xl:text-[10rem] text-center lg:text-left text-[#ffffff] lg:-mt-10 lg:ml-40 mt-2 mb-2 lg:mt-0 lg:mb-0 font-thin">DEFENSE</span>
                <span className="block text-5xl sm:text-6xl md:text-7xl lg:text-9xl xl:text-[10rem] text-[#ffffff] text-center lg:text-left lg:-mt-10 lg:ml-20 pt-[20px] pb-[20px] mt-2 lg:mt-0 mb-[-10px] font-thin">TRAINING</span>
              </h1>
            </div>
            
            {/* Right side - Subtitle and buttons */}
            <div className="flex flex-col items-center lg:items-start justify-center animate-fade-in pl-4 sm:pl-6 lg:pl-0 lg:pr-8 pr-4" style={{ animationDelay: '0.15s' }}>
              <p className="text-lg md:text-2xl lg:text-3xl font-body tracking-wide mb-8 text-zinc-200 font-normal text-center lg:text-left">
                You Don't Have to be Defenseless
              </p>
              <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 w-full sm:w-auto sm:justify-start justify-center animate-fade-in" style={{ animationDelay: '0.3s' }}>
                <Button
                  size="lg"
                  className="hover:bg-[#006d7a] text-white font-display uppercase tracking-widest px-6 sm:px-8 py-5 sm:py-6 text-sm sm:text-lg shadow-lg bg-[#004149] border border-zinc-700 rounded-sm whitespace-nowrap"
                  onClick={() => setLocation('/schedule-list')}
                  data-testid="button-browse-courses"
                >
                  Upcoming Courses
                </Button>
                <Button
                  size="lg"
                  className="hover:bg-gray-100 text-black font-display uppercase tracking-widest px-6 sm:px-8 py-5 sm:py-6 text-sm sm:text-lg bg-white rounded-sm whitespace-nowrap"
                  onClick={() => setLocation('/online-nm-concealed-carry-course')}
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
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-[32px] pb-[32px]">
          {/* Featured Courses Header */}
          <div className="mb-12 text-left">
            <p className="text-lg lg:text-xl font-bold uppercase tracking-wide mb-4 text-[#004149]">
              Reliable. Effective. Practical.
            </p>
            <h2 className="font-heading text-4xl lg:text-5xl uppercase tracking-wide text-white">
              Common Sense <span className="text-gray-500">Firearms Training</span>
            </h2>
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Left Column - Online NM CCW Course (Main Featured) */}
            <Link href="/online-nm-concealed-carry-course" className="block group">
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
            <div className="flex flex-col gap-6 lg:aspect-[5/4]">
              {/* Top Right - Concealed Carry Course */}
              <Link href="/nmccl" className="block group flex-1">
                <div 
                  className="relative min-h-[220px] lg:h-full w-full rounded-[4px] overflow-hidden cursor-pointer bg-zinc-900 group-hover:shadow-[0_8px_30px_rgba(180,180,180,0.15)] transition-shadow duration-300"
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
                    <div className="text-right"><span className="inline-block bg-[#004149] text-white font-bold text-lg px-4 py-1 rounded-full">$165</span></div>
                    <div>
                      <h3 className="font-heading text-xl lg:text-2xl uppercase tracking-wide text-white mb-2">
                        Concealed Carry Course
                      </h3>
                      <p className="text-white/70 text-sm mb-3 max-w-sm">
                        Hands-on training with expert instructors. Learn safety, fundamentals, and earn your permit.
                      </p>
                      <div className="flex items-center gap-2 text-white/60 text-sm">
                        <Clock className="h-4 w-4" />
                        <span>15 Hours</span>
                      </div>
                    </div>
                  </div>
                </div>
              </Link>

              {/* Bottom Right - Defensive Handgun */}
              <Link href="/defensive-handgun-course" className="block group flex-1">
                <div 
                  className="relative min-h-[220px] lg:h-full w-full rounded-[4px] overflow-hidden cursor-pointer bg-zinc-900 group-hover:shadow-[0_8px_30px_rgba(180,180,180,0.15)] transition-shadow duration-300"
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
                    <div className="text-right"><span className="inline-block bg-[#004149] text-white font-bold text-lg px-4 py-1 rounded-full">$225</span></div>
                    <div>
                      <h3 className="font-heading text-xl lg:text-2xl uppercase tracking-wide text-white mb-2">
                        Defensive Handgun
                      </h3>
                      <p className="text-white/70 text-sm mb-3 max-w-sm">
                        Advanced tactics including barricade shooting, movement, and real-world scenarios.
                      </p>
                      <div className="flex items-center gap-2 text-white/60 text-sm">
                        <Clock className="h-4 w-4" />
                        <span>8 or 16 Hours</span>
                      </div>
                    </div>
                  </div>
                </div>
              </Link>
            </div>
          </div>
        </div>
      </section>
      {/* Philosophy Section */}
      <section className="bg-zinc-950 py-16 pt-[0px] pb-[0px] mt-[64px] mb-[0px]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="font-heading text-4xl lg:text-5xl uppercase tracking-wide text-white mb-8 font-thin">
            Straightforward Firearms Training
          </h2>
          
          <div className="space-y-6 text-zinc-300">
            <p className="text-base leading-relaxed">
              Practical Defense Training, LLC offers straightforward firearms training, with a focus and emphasis on New Mexico concealed carry training. 
              One of the few courses which preaches and teaches practical over "tacti-cool"; bringing reliable and effective firearms training to the 
              responsibly armed citizen. Students will gain the knowledge and skills necessary to legally and responsibly carry a concealed handgun in the 
              State of New Mexico and those States with whom New Mexico shares reciprocity with.
            </p>
            
            <div className="border-t border-b border-zinc-700 py-8 space-y-6 text-[14px] pt-[0px] pb-[0px]">
              <p className="text-[18px] pt-[4px] pb-[4px]">
                Your safety and protection begins with <span className="text-white font-semibold">you</span>. 
                It's <span className="text-white font-semibold">your life</span>. 
                It's <span className="text-white font-semibold">your safety</span> and protection. 
                It's <span className="text-white font-semibold">your</span> responsibility.
              </p>
            </div>
          </div>
          <div className="text-center mt-10">
            <Button
              size="lg"
              className="bg-[#004149] hover:bg-[#006d7a] text-white font-display uppercase tracking-widest px-8 py-6 text-sm sm:text-lg shadow-lg border border-zinc-700 rounded-sm"
              onClick={() => setLocation('/online-nm-concealed-carry-course')}
            >
              Enroll in our Online New Mexico CCW Course
            </Button>
          </div>
        </div>
      </section>
      {/* Upcoming Courses Section */}
      <section className="bg-zinc-950 pt-10 pb-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="mb-8 text-left">
            <TitleCard as="h2" variant="accent" className="text-3xl lg:text-4xl">
              Upcoming Courses
            </TitleCard>
            <p className="text-zinc-400 mt-2">
              Browse our schedule and secure your spot in an upcoming training session
            </p>
          </div>
          <UpcomingCoursesSection onRegister={handleRegisterCourse} />
        </div>
      </section>
      {/* Customer Testimonials */}
      <section className="bg-zinc-900 py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="mb-12 text-left">
            <TitleCard as="h2" variant="accent" className="text-3xl lg:text-4xl">
              What Our Students Say
            </TitleCard>
          </div>
          <TestimonialGrid />
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