import { useState, useMemo, useEffect } from "react";
import { Link, useLocation } from "wouter";
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
import type { CourseWithSchedules, AppSettings, AppointmentType } from "@shared/schema";
import heroImage from "@assets/Header01_1765564232545.jpg";
import ccwRangeImage from "@assets/CCW-Range_1757565346453.jpg";
import laptopImage from "@assets/laptop2_1757565355142.jpg";
import dhcImage from "@assets/DHC_1757565361710.jpg";
import deductivePistolcraftImage from "@assets/Deductive-Pistol-Craft_1762671845456.jpg";
import practiceForMasteryImage from "@assets/Performance-Shooting_1762673186670.jpg";
import performanceShootingImage from "@assets/Practical-Mastery-2025_1762674118627.jpg";
import coachingBackgroundImage from "@assets/Main_1762715966076.jpg";
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

// Facebook Reviews for main testimonials section
const facebookReviews = [
  {
    author: "Dustin C.",
    rating: 5,
    quote: "I took the conceal carry class today. It exceeded my expectations by a long shot. The quality time Derrick took with each one of us in the class was phenomenal. This truly is a community of people that want to see you succeed. When I left I felt apart of something larger than myself. This is a place everyone young and old should attend for any of their firearm and survival classes. 10 out of 10! You won't be disappointed.",
    isLong: false,
  },
  {
    author: "Pacwest Defense",
    rating: 5,
    quote: "This is coming a little late, but I wanted to take a moment to share some feedback after hosting Tim and Derek of Apache Solutions recently. I work as the Chief RSO for Tri-County Gun Club in Sherwood, OR. We have a large, private event each year for our members. I invited the guys to teach a couple of classes and host a booth at the event while they were here.\n\nTim and Derek had a one-day course for Defensive Pistol on Friday, followed by the member event on Saturday, and then another one-day class, Full Spectrum Pistol Metrics on Sunday.\n\nLet me just say that Tim and Derek are great guys. They are friendly, funny, and knowledgeable. I was unable to participate or RSO for their class, due to prepping for our large event the following morning. I did, however, go and check on them a handful of times throughout the day on Friday. No one was doing cartwheels with a gun in their hand, and I was comfortable with their ability to run the line and maintain safety protocol. The students were engaged and focused each time I walked into the bay. At the end of the day, I was present for the tear down and wrap-up. The students were thrilled with the content they learned. They were energized and excited. One of them indicated that they were so impressed with the class that he had decided to attend the second class on Sunday. This was not his original plan and was going to rearrange his schedule to make it happen.\n\nAt the member event on Saturday, we had roughly 1,100 people in attendance. Tim and Derek were well received. The club had purchased a seat for the Sunday class and raffled it off at the event. When I called the winner of the raffle Saturday evening, the guy whooped, cheered and laughed. He was SO EXCITED to attend the class the next morning.\n\nSunday came, and I peeked in on the class a few times. Each time I peeked in, I would watch for 5-10 minutes. I was present to help with tear down and wrap up. At the end of class, the students were glowing. All were quite happy with the content they had learned. They were excited about having actual metrics for their shooting abilities and the standards they were working towards. There were some experienced and well-seasons students in this class, who I personally know. They were impressed with the way Tim was able to convey the content in a way that they had not heard before. All of the students thanked me for bringing them to Tri-County and expressed interest in learning from them again in the future.\n\nTim and Derek were pleasant, and easy to host. They offer a unique perspective that is beneficial to beginners and experienced shooters alike. I look forward to hosting them again, and would encourage anyone to consider learning from and/or hosting these guys.",
    isLong: true,
  },
  {
    author: "Marissa B.",
    rating: 5,
    quote: "Derek is an exceptional firearms instructor who truly goes above and beyond for his students. I have had the pleasure of training with him at Apache Solutions, and I cannot speak highly enough of his expertise and dedication.\n\nDerek's passion for teaching self-defense skills is evident in every lesson he conducts. He is patient, encouraging, and always willing to tailor his instruction to meet the individual needs of each student. Under his guidance, I have not only gained invaluable knowledge about firearms, but I have also developed a newfound confidence in my ability to protect myself.\n\nI have taken private lessons with Derek, and I can honestly say that the one-on-one attention and personalized instruction he provides have been instrumental in my growth as a shooter. He has a keen eye for identifying areas of improvement and offers constructive feedback in a way that is both motivating and empowering.\n\nOverall, Derek is a true professional who is dedicated to helping his students reach their full potential. I am grateful for the opportunity to train with him and would highly recommend him to anyone looking to enhance their firearm skills or learn self-defense techniques. Thank you, Derek, for everything you do!",
    isLong: true,
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

function FacebookTestimonialSlider() {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedReview, setSelectedReview] = useState<typeof facebookReviews[0] | null>(null);

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % facebookReviews.length);
    }, 7000);
    return () => clearInterval(timer);
  }, []);

  const goToPrev = () => {
    setCurrentIndex((prev) => (prev - 1 + facebookReviews.length) % facebookReviews.length);
  };

  const goToNext = () => {
    setCurrentIndex((prev) => (prev + 1) % facebookReviews.length);
  };

  const truncateText = (text: string, maxLength: number = 200) => {
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength).trim() + "...";
  };

  const current = facebookReviews[currentIndex];

  return (
    <>
      <div className="max-w-3xl mx-auto" data-testid="facebook-testimonial-slider">
        <ComicPanel shadow="lg" className="hover-lift">
          <div className="text-center">
            <Quote className="w-12 h-12 text-[hsl(209,90%,38%)] opacity-30 mx-auto mb-4 rotate-180" />
            <p className="text-lg text-muted-foreground italic leading-relaxed mb-4 min-h-[120px]">
              "{truncateText(current.quote)}"
              {current.quote.length > 200 && (
                <button
                  onClick={() => setSelectedReview(current)}
                  className="text-[hsl(209,90%,38%)] hover:text-[#FD66C5] ml-1 font-medium transition-colors"
                  data-testid="button-read-more"
                >
                  Read More
                </button>
              )}
            </p>
            <div className="flex items-center justify-center gap-2 mb-4">
              <div className="flex">
                {[...Array(5)].map((_, i) => (
                  <Star
                    key={i}
                    className={`w-5 h-5 ${i < current.rating ? "text-[hsl(44,89%,61%)] fill-[hsl(44,89%,61%)]" : "text-gray-300"}`}
                  />
                ))}
              </div>
            </div>
            <span className="text-base font-medium text-foreground">— {current.author}</span>
          </div>
          
          <div className="flex items-center justify-between mt-6 pt-4 border-t border-border">
            <div className="flex gap-2 mx-auto">
              {facebookReviews.map((_, idx) => (
                <button
                  key={idx}
                  onClick={() => setCurrentIndex(idx)}
                  className={`w-3 h-3 rounded-full transition-all ${
                    idx === currentIndex 
                      ? "bg-[hsl(209,90%,38%)] w-6" 
                      : "bg-gray-300 hover:bg-gray-400"
                  }`}
                  data-testid={`facebook-testimonial-dot-${idx}`}
                  aria-label={`Go to review ${idx + 1}`}
                />
              ))}
            </div>
          </div>
          <div className="flex justify-center gap-2 mt-4">
            <button
              onClick={goToPrev}
              className="p-2 rounded-full hover:bg-muted transition-colors border border-border"
              data-testid="facebook-testimonial-prev"
              aria-label="Previous review"
            >
              <ChevronLeft className="w-5 h-5 text-muted-foreground" />
            </button>
            <button
              onClick={goToNext}
              className="p-2 rounded-full hover:bg-muted transition-colors border border-border"
              data-testid="facebook-testimonial-next"
              aria-label="Next review"
            >
              <ChevronRight className="w-5 h-5 text-muted-foreground" />
            </button>
          </div>
        </ComicPanel>
      </div>

      <Dialog open={!!selectedReview} onOpenChange={(open) => !open && setSelectedReview(null)}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <div className="flex">
                {[...Array(5)].map((_, i) => (
                  <Star
                    key={i}
                    className={`w-4 h-4 ${i < (selectedReview?.rating || 0) ? "text-[hsl(44,89%,61%)] fill-[hsl(44,89%,61%)]" : "text-gray-300"}`}
                  />
                ))}
              </div>
              <span className="ml-2">— {selectedReview?.author}</span>
            </DialogTitle>
          </DialogHeader>
          <div className="mt-4">
            <Quote className="w-8 h-8 text-[hsl(209,90%,38%)] opacity-30 mb-2 rotate-180" />
            <p className="text-muted-foreground leading-relaxed whitespace-pre-line">
              {selectedReview?.quote}
            </p>
          </div>
        </DialogContent>
      </Dialog>
    </>
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
    <Layout>
      {/* Hero Section */}
      <section className="relative h-screen flex items-center justify-center overflow-hidden grain-texture">
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
          {/* RAC Gradient overlay */}
          <div className="absolute inset-0 bg-gradient-to-br from-[hsl(204,27%,16%,0.85)] via-[hsl(209,90%,38%,0.6)] to-[hsl(190,65%,47%,0.5)]"></div>
        </div>

        {/* Content */}
        <div className="relative z-20 text-center text-white px-4 sm:px-6 lg:px-8">
          <div className="animate-slide-up">
            <h1 style={{ fontFamily: 'League Gothic, sans-serif' }} className="uppercase mb-6 text-5xl sm:text-6xl md:text-7xl lg:text-8xl tracking-wider">APACHE SOLUTIONS</h1>
            <p className="text-xl md:text-2xl text-white/90 max-w-2xl mx-auto mb-8 font-light">Educating the Responsibily Armed Citizen</p>
          </div>

          <div className="flex justify-center gap-4 animate-fade-in" style={{ animationDelay: '0.3s' }}>
            <Button
              size="lg"
              className="hover:bg-[#FD66C5] text-white font-heading uppercase tracking-wide px-8 py-6 text-lg shadow-lg bg-[#5170FF] border-2 border-black"
              onClick={() => {
                const coursesSection = document.getElementById('courses');
                if (coursesSection) {
                  const yOffset = -80;
                  const y = coursesSection.getBoundingClientRect().top + window.pageYOffset + yOffset;
                  window.scrollTo({ top: y, behavior: 'smooth' });
                }
              }}
              data-testid="button-browse-courses"
            >
              <Target className="w-5 h-5 mr-2" />
              FIND A CLASS
            </Button>
            <Button
              size="lg"
              variant="outline"
              className="border-2 border-black hover:bg-white hover:text-[hsl(204,27%,16%)] font-heading uppercase tracking-wide px-8 py-6 text-lg text-[#5170FF]"
              onClick={() => {
                const appointmentsSection = document.getElementById('appointments');
                if (appointmentsSection) {
                  appointmentsSection.scrollIntoView({ behavior: 'smooth' });
                }
              }}
              data-testid="button-book-training"
            >
              BOOK TRAINING
            </Button>
          </div>
        </div>

      </section>
      {/* Results-Driven Training Section */}
      <section id="results-driven-training" className="bg-white py-20">
        <div className="w-[80%] mx-auto px-4 text-center">
          {/* RACC Feature Section with Testimonials */}
          <div className="flex flex-col lg:flex-row gap-8 mt-12 text-left pr-4 pb-4" style={{ alignItems: 'stretch' }}>
            {/* RACC Program Card - 60% width */}
            <div className="lg:w-[60%]">
              <ComicPanel shadow="lg" className="h-full hover-lift" data-testid="racc-program-card">
              <div className="flex flex-col h-full">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-12 h-12 rounded-full bg-gradient-to-br from-[hsl(209,90%,38%)] to-[hsl(190,65%,47%)] flex items-center justify-center">
                    <Award className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <h3 className="font-heading text-xl lg:text-2xl uppercase tracking-wide">Responsibly Armed Citizen Criterion</h3>
                    <p className="text-muted-foreground text-[16px]">4-Phase Belt-Style Progression System</p>
                  </div>
                </div>
                
                <p className="text-muted-foreground mb-4 leading-relaxed">
                  Your personal hot spot for concealed carry performance. Private 1-on-1 sessions with flexible scheduling, 
                  pressure-tested with objective benchmarks. Advance at your own pace through four clear phases—from safety 
                  fundamentals to refined control and real-world competency.
                </p>

                <div className="grid grid-cols-2 gap-3 mb-4">
                  <div className="flex items-center gap-2 text-sm">
                    <Clock className="w-4 h-4 text-[hsl(209,90%,38%)]" />
                    <span>1-2 hour sessions</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <DollarSign className="w-4 h-4 text-[hsl(190,65%,47%)]" />
                    <span>$60/hr or $100/2hrs</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <User className="w-4 h-4 text-[hsl(209,90%,38%)]" />
                    <span>Private 1-on-1</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <Calendar className="w-4 h-4 text-[hsl(190,65%,47%)]" />
                    <span>Flexible scheduling</span>
                  </div>
                </div>

                {/* Testimonial Slider */}
                <div className="mt-auto pt-4 border-t border-border">
                  <TestimonialSlider />
                </div>
              </div>
              </ComicPanel>
            </div>

            {/* Right Side - 2 Stacked Training Cards (40% width) */}
            <div className="lg:w-[40%] flex flex-col gap-6 self-stretch">
              {/* Card 1: NC Concealed Carry */}
              <ComicPanel shadow="sm" className="flex-1 h-full hover-lift" data-testid="nc-concealed-carry-card">
                <div className="flex items-start gap-4">
                  <div className="w-14 h-14 flex-shrink-0 rounded-lg bg-[hsl(209,90%,38%)] flex items-center justify-center">
                    <Target className="w-7 h-7 text-white" />
                  </div>
                  <div>
                    <h3 className="font-heading uppercase tracking-wide mb-2 text-[20px]">NC Concealed Carry</h3>
                    <p className="text-muted-foreground text-[16px]">
                      Comprehensive NC Concealed Carry permit class covering safety fundamentals, legal considerations, 
                      and practical shooting qualification. Take control of your personal safety.
                    </p>
                  </div>
                </div>
              </ComicPanel>

              {/* Card 2: Dry-Fire Practice */}
              <ComicPanel shadow="sm" className="flex-1 h-full hover-lift" data-testid="dry-fire-practice-card">
                <div className="flex items-start gap-4">
                  <div className="w-14 h-14 flex-shrink-0 rounded-lg bg-[hsl(190,65%,47%)] flex items-center justify-center">
                    <Crosshair className="w-7 h-7 text-white" />
                  </div>
                  <div>
                    <h3 className="font-heading uppercase tracking-wide mb-2 text-[20px]">Dry-Fire Practice</h3>
                    <p className="text-muted-foreground text-[16px]">
                      Build real skill from the comfort of the classroom. Learn effective dry-fire practice techniques, 
                      proper safety protocols, and how to structure your sessions for maximum improvement.
                    </p>
                  </div>
                </div>
              </ComicPanel>
            </div>
          </div>
        </div>
      </section>

      {/* Customer Testimonials */}
      <section className="bg-white py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <TitleCard as="h2" variant="accent" className="text-3xl lg:text-4xl">
              What Our Students Say
            </TitleCard>
          </div>
          <FacebookTestimonialSlider />
        </div>
      </section>

      {/* Training Programs */}
      <section id="courses" className="bg-muted py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <TitleCard as="h2" variant="accent" className="text-3xl lg:text-4xl">
              Training Programs
            </TitleCard>
          </div>
          
          {/* Deductive Pistolcraft */}
          <ComicPanel 
            id="deductive-pistolcraft" 
            className="mb-8 scroll-mt-[850px] md:scroll-mt-28 hover-lift" 
            shadow="lg"
            data-testid="feature-deductive-pistolcraft"
          >
            <div className="grid md:grid-cols-2 gap-6">
              <div className="flex flex-col justify-center">
                <h3 className="font-heading text-2xl lg:text-3xl uppercase tracking-wide text-foreground mb-4">
                  Deductive Pistolcraft
                </h3>
                <p className="text-muted-foreground mb-6 leading-relaxed">
                  We tailor the definition of proficiency to our clients' strengths and blind spots, forging a personalized path based on evidence, ability, and individual goals. Our program delves into fundamentals, emphasizing quantifiable metrics to validate theories. Grip, trigger control, sighting, practice, goal setting, and performance tracking are integral components, ensuring a comprehensive exploration of pistolcraft tailored to individual needs.
                </p>
                <Button
                  className="bg-[hsl(209,90%,38%)] text-white hover:bg-[hsl(209,90%,30%)] w-fit font-heading uppercase tracking-wide"
                  data-testid="button-learn-more-pistolcraft"
                  onClick={() => document.getElementById('course-listings')?.scrollIntoView({ behavior: 'smooth' })}
                >
                  LET'S TRAIN!
                </Button>
              </div>
              <div className="flex items-center">
                <img
                  src={deductivePistolcraftImage}
                  alt="Deductive Pistolcraft Instructor"
                  className="w-full h-auto object-cover rounded-lg shadow-comic-sm"
                />
              </div>
            </div>
          </ComicPanel>

          {/* Practice for Mastery */}
          <ComicPanel className="mb-8 hover-lift" shadow="lg" data-testid="feature-practice-mastery">
            <div className="grid md:grid-cols-2 gap-6">
              <div className="flex items-center md:order-1 order-2">
                <img
                  src={practiceForMasteryImage}
                  alt="Practice for Mastery Training"
                  className="w-full h-auto object-cover rounded-lg shadow-comic-sm"
                />
              </div>
              <div className="flex flex-col justify-center md:order-2 order-1">
                <h3 className="font-heading text-2xl lg:text-3xl uppercase tracking-wide text-foreground mb-4">
                  Practice for Mastery
                </h3>
                <p className="text-muted-foreground mb-6 leading-relaxed">
                  "Practice for Mastery" is designed to assist our students in crafting a training plan geared towards achieving high-performance goals with a firearm. This program integrates both dry and live fire techniques, showcasing immediate improvements in performance. As participants advance through the curriculum, the emphasis transitions from immediate performance gains to sustained growth.
                </p>
                <Button
                  className="bg-[hsl(190,65%,47%)] text-white hover:bg-[hsl(190,65%,40%)] w-fit font-heading uppercase tracking-wide"
                  data-testid="button-learn-more-practice-mastery"
                  onClick={() => document.getElementById('course-listings')?.scrollIntoView({ behavior: 'smooth' })}
                >
                  LET'S TRAIN!
                </Button>
              </div>
            </div>
          </ComicPanel>

          {/* Performance Shooting for the Concealed Carrier */}
          <ComicPanel className="hover-lift" shadow="lg" data-testid="feature-performance-shooting">
            <div className="grid md:grid-cols-2 gap-6">
              <div className="flex flex-col justify-center">
                <h3 className="font-heading text-2xl lg:text-3xl uppercase tracking-wide text-foreground mb-4">
                  Performance Shooting for the Concealed Carrier
                </h3>
                <p className="text-muted-foreground mb-6 leading-relaxed">
                  Offering an in-depth exploration of performance concepts employed by highly-skilled practitioners, specifically competitive shooters. In Performance Shooting for the Concealed Carrier we delve into applying those metrics to benefit concealed carriers and defensive enthusiasts, unraveling the hows and whys behind integrating world-class shooting skills into defensive preparedness.
                </p>
                <Button
                  className="bg-[hsl(204,27%,16%)] text-white hover:bg-[hsl(204,27%,20%)] w-fit font-heading uppercase tracking-wide"
                  data-testid="button-learn-more-performance-shooting"
                  onClick={() => document.getElementById('course-listings')?.scrollIntoView({ behavior: 'smooth' })}
                >
                  LET'S TRAIN!
                </Button>
              </div>
              <div className="flex items-center">
                <img
                  src={performanceShootingImage}
                  alt="Performance Shooting for the Concealed Carrier"
                  className="w-full h-auto object-cover rounded-lg shadow-comic-sm"
                />
              </div>
            </div>
          </ComicPanel>
        </div>
      </section>
      {/* Schedule Your Training Section */}
      <section id="appointments" className="py-20 bg-[hsl(204,27%,16%)]" data-testid="section-schedule-training">
        <div className="max-w-5xl mx-auto px-3 sm:px-5 lg:px-6">
          <div className="text-center mb-12">
            <TitleCard as="h2" variant="light" className="text-3xl lg:text-4xl">
              One-on-One Training
            </TitleCard>
            <p className="text-lg text-white/80 max-w-2xl mx-auto mt-4">
              Book one-on-one training sessions tailored to your specific needs and schedule.
            </p>
          </div>

          {appointmentsLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[1, 2, 3].map(i => (
                <ComicPanel key={i} shadow="md" className="animate-pulse">
                  <div className="h-48 bg-muted/20 rounded-lg mb-4" />
                  <div className="h-4 bg-muted/20 rounded w-3/4 mb-2" />
                  <div className="h-4 bg-muted/20 rounded w-1/2 mb-4" />
                  <div className="h-10 bg-muted/20 rounded" />
                </ComicPanel>
              ))}
            </div>
          ) : appointmentTypes.length === 0 ? (
            <ComicPanel shadow="md" className="text-center py-12">
              <CalendarClock className="mx-auto h-12 w-12 text-[hsl(190,65%,47%)] mb-4" />
              <p className="text-muted-foreground">No appointment types available at this time.</p>
            </ComicPanel>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {appointmentTypes.map((type) => (
                <ComicPanel
                  key={type.id}
                  className="hover-lift cursor-pointer"
                  shadow="md"
                  data-testid={`appointment-card-${type.id}`}
                  onClick={() => {
                    console.log('Appointment card clicked!', type.title);
                    setSelectedAppointmentType(type);
                    setShowBookingModal(true);
                  }}
                >
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="font-heading text-xl uppercase tracking-wide">{type.title}</h3>
                      {type.requiresApproval && (
                        <Badge className="bg-[hsl(44,89%,61%)] text-[hsl(204,27%,16%)] text-xs">Approval Required</Badge>
                      )}
                    </div>
                    {type.description && (
                      <p className="text-sm text-muted-foreground mb-4">{type.description}</p>
                    )}
                    <div className="space-y-2 mb-4">
                      <div className="flex items-center gap-2 text-sm">
                        <Clock className="h-4 w-4 text-[hsl(209,90%,38%)]" />
                        <span>
                          {type.isVariableDuration 
                            ? `${type.minimumDurationHours} hour${type.minimumDurationHours !== 1 ? 's' : ''} minimum`
                            : `${type.durationMinutes} minutes`
                          }
                        </span>
                      </div>
                      <div className="flex items-center gap-2 text-sm">
                        <DollarSign className="h-4 w-4 text-[hsl(190,65%,47%)]" />
                        <span className="font-semibold text-[hsl(209,90%,38%)]">
                          {type.isVariableDuration 
                            ? `$${Number(type.pricePerHour).toFixed(2)}/hour`
                            : `$${Number(type.price).toFixed(2)}`
                          }
                        </span>
                      </div>
                    </div>
                    <Button
                      size="lg"
                      className="w-full min-h-[44px] bg-[hsl(209,90%,38%)] hover:bg-[hsl(209,90%,30%)] text-white font-heading uppercase tracking-wide"
                      onClick={(e) => {
                        e.stopPropagation();
                        console.log('Book Now button clicked!', type.title);
                        setSelectedAppointmentType(type);
                        setShowBookingModal(true);
                      }}
                      data-testid={`button-book-${type.id}`}
                    >
                      BOOK NOW
                    </Button>
                  </div>
                </ComicPanel>
              ))}
            </div>
          )}
        </div>
      </section>
      {/* Course Listings */}
      <section id="course-listings" className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-3 sm:px-5 lg:px-6">
          <div className="text-center mb-16">
            <TitleCard as="h2" variant="default" className="text-3xl lg:text-4xl">
              Upcoming Courses
            </TitleCard>
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
                <ComicPanel key={i} shadow="md" className="animate-pulse overflow-hidden">
                  <div className="h-48 bg-muted/30" />
                  <div className="p-4 sm:p-6">
                    <div className="h-4 bg-muted/30 rounded mb-2" />
                    <div className="h-4 bg-muted/30 rounded w-3/4 mb-4" />
                    <div className="h-20 bg-muted/30 rounded mb-4" />
                    <div className="h-10 bg-muted/30 rounded" />
                  </div>
                </ComicPanel>
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