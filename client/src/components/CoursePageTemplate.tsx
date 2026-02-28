import { Layout } from "@/components/Layout";
import { SEO } from "@/components/SEO";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { NotifyMeDialog } from "@/components/NotifyMeDialog";
import { OnlineCourseEnrollDialog } from "@/components/OnlineCourseEnrollDialog";
import { RegistrationModal } from "@/components/RegistrationModal";
import {
  Clock,
  MapPin,
  CheckCircle,
  AlertTriangle,
  ChevronDown
} from "lucide-react";
import { Link } from "wouter";
import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import type { CourseWithSchedules } from "@shared/schema";

interface CourseDetails {
  price: string;
  time: string;
  classroomTime?: string;
  rangeTime?: string;
  rounds?: string;
  duration: string;
  location?: string;
}

interface CurriculumItem {
  title: string;
  description: string;
}

interface GearItem {
  item: string;
  required: boolean;
}

interface FAQItem {
  question: string;
  answer: string;
}

interface CoursePageTemplateProps {
  title: string;
  level: "Beginner" | "Intermediate" | "Advanced";
  heroImage: string;
  overview: string;
  details: CourseDetails;
  curriculum: CurriculumItem[];
  gearList: GearItem[];
  rentalInfo?: string;
  faqs: FAQItem[];
  ctaText?: string;
  ctaLink?: string;
  hasScheduledClasses?: boolean;
  heroImagePosition?: string;
  isOnlineCourse?: boolean;
  onlineCoursePrice?: number;
  secondaryCta?: {
    text: string;
    link: string;
  };
}

function FAQAccordion({ question, answer }: FAQItem) {
  const [isOpen, setIsOpen] = useState(false);
  
  return (
    <div className="border-b border-border">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full py-4 flex items-center justify-between text-left hover:text-[#006d7a] transition-colors"
        data-testid={`faq-toggle-${question.slice(0, 20).replace(/\s/g, '-')}`}
      >
        <span className="text-foreground font-medium pr-4">{question}</span>
        <ChevronDown className={`h-5 w-5 text-[#006d7a] transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>
      {isOpen && (
        <div className="pb-4 text-muted-foreground leading-relaxed">
          {answer}
        </div>
      )}
    </div>
  );
}

export function CoursePageTemplate({
  title,
  level,
  heroImage,
  overview,
  details,
  curriculum,
  gearList,
  rentalInfo,
  faqs,
  ctaText = "Register Now",
  ctaLink = "/schedule-list",
  hasScheduledClasses = true,
  heroImagePosition = "center",
  isOnlineCourse = false,
  onlineCoursePrice = 165,
  secondaryCta
}: CoursePageTemplateProps) {
  const [isNotifyDialogOpen, setIsNotifyDialogOpen] = useState(false);
  const [isEnrollDialogOpen, setIsEnrollDialogOpen] = useState(false);
  const [isRegisterModalOpen, setIsRegisterModalOpen] = useState(false);
  const [grayscaleAmount, setGrayscaleAmount] = useState(0);

  // Fetch the matching course from the API for the registration modal
  const { data: coursesData } = useQuery<CourseWithSchedules[]>({
    queryKey: ['/api/courses'],
  });
  const matchingCourse = coursesData?.find(c => c.title === title && c.isActive && !c.deletedAt);
  
  useEffect(() => {
    const handleScroll = () => {
      // Calculate grayscale based on scroll position
      // Full color at top, gradually increase grayscale as you scroll
      const scrollProgress = Math.min(window.scrollY / 400, 1); // Max out after 400px scroll
      setGrayscaleAmount(scrollProgress * 100);
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);
  
  const levelColors = {
    Beginner: "bg-green-600",
    Intermediate: "bg-amber-600",
    Advanced: "bg-red-600"
  };

  return (
    <Layout>
      <SEO 
        title={title}
        description={overview.substring(0, 160)}
      />
      {/* Hero Section */}
      <section className="relative h-[65vh] min-h-[500px] flex items-end overflow-hidden">
        <div 
          className="absolute inset-0 bg-cover"
          style={{ 
            backgroundImage: `url(${heroImage})`, 
            backgroundPosition: heroImagePosition,
            filter: `grayscale(${grayscaleAmount}%)`
          }}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-background via-background/70 to-transparent" />
        
        <div className="relative z-10 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-12">
          <div className="flex items-center gap-4 mb-4">
            <Badge className="inline-flex items-center rounded-full border text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 border-transparent hover:bg-primary/80 text-white px-3 py-1 bg-[#006d7a]">
              {level}
            </Badge>
          </div>
          
          <h1 className="font-heading text-4xl md:text-5xl lg:text-6xl uppercase tracking-widest text-white font-bold">
            {title}
          </h1>
        </div>
      </section>
      {/* Main Content */}
      <section className="bg-background py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            
            {/* Left Column - Main Content (2/3) */}
            <div className="lg:col-span-2 space-y-8">
              
              {/* Overview */}
              <div>
                <h2 className="text-2xl font-heading uppercase tracking-widest text-foreground mb-4">Overview</h2>
                <p className="text-muted-foreground text-[16px]">{overview}</p>
                
                {/* Quick Reference Grid */}
                <div className="grid grid-cols-2 gap-4 mt-6">
                  <div className="flex items-center gap-3 bg-card rounded-lg p-4">
                    <Clock className="h-6 w-6 text-[#006d7a]" />
                    <div>
                      <p className="text-sm text-muted-foreground">Duration</p>
                      <p className="text-foreground font-medium">{details.duration}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 bg-card rounded-lg p-4">
                    <MapPin className="h-6 w-6 text-[#006d7a]" />
                    <div>
                      <p className="text-sm text-muted-foreground">Location</p>
                      <p className="text-foreground font-medium">{details.location || "Albuquerque, NM"}</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Curriculum Timeline */}
              <div>
                <h2 className="text-2xl font-heading uppercase tracking-widest text-foreground mb-6">Training Curriculum</h2>
                <div className="relative">
                  {curriculum.map((item, index) => (
                    <div key={index} className="flex gap-4 pb-8 last:pb-0">
                      {/* Timeline line and circle */}
                      <div className="flex flex-col items-center">
                        <div className="flex items-center justify-center w-10 h-10 rounded-full bg-[#006d7a] text-white font-bold text-sm">
                          {index + 1}
                        </div>
                        {index < curriculum.length - 1 && (
                          <div className="w-0.5 flex-1 bg-border mt-2" />
                        )}
                      </div>
                      {/* Content */}
                      <div className="flex-1 pb-4">
                        <h3 className="text-lg font-semibold text-foreground mb-2">{item.title}</h3>
                        <p className="text-muted-foreground">{item.description}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Gear Checklist */}
              <div className="bg-card rounded-xl p-6">
                <h2 className="text-2xl font-heading uppercase tracking-widest text-foreground mb-6">What to Bring</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {gearList.map((gear, index) => (
                    <div key={index} className="flex items-center gap-3">
                      <CheckCircle className={`h-5 w-5 ${gear.required ? 'text-[#006d7a]' : 'text-muted-foreground'}`} />
                      <span className={gear.required ? 'text-foreground' : 'text-muted-foreground'}>
                        {gear.item}
                        {gear.required && <span className="text-[#006d7a] ml-1">*</span>}
                      </span>
                    </div>
                  ))}
                </div>
                
                {rentalInfo && (
                  <div className="mt-6 p-4 bg-muted rounded-lg border border-border flex items-start gap-3">
                    <AlertTriangle className="h-5 w-5 text-[#006d7a] flex-shrink-0 mt-0.5" />
                    <p className="text-muted-foreground text-sm">{rentalInfo}</p>
                  </div>
                )}
              </div>

              {/* FAQ Accordion */}
              <div>
                <h2 className="text-2xl font-heading uppercase tracking-widest text-foreground mb-6">Frequently Asked Questions</h2>
                <div className="bg-card rounded-xl p-6">
                  {faqs.map((faq, index) => (
                    <FAQAccordion key={index} {...faq} />
                  ))}
                </div>
              </div>
            </div>

            {/* Right Column - Sticky Sidebar (1/3) */}
            <div className="lg:col-span-1">
              <div className="sticky top-24 space-y-6">
                
                {/* Registration Card */}
                <div className="bg-card rounded-xl p-6 border border-border">
                  <div className="text-center mb-6">
                    <div className="mb-2">
                      <span className="text-4xl font-bold text-foreground">{details.price}</span>
                    </div>
                    <p className="text-muted-foreground text-sm">per student</p>
                  </div>
                  
                  <div className="space-y-3 mb-6 text-sm">
                    <div className="flex justify-between py-2 border-b border-border">
                      <span className="text-muted-foreground">Course Time</span>
                      <span className="text-foreground">{details.time}</span>
                    </div>
                    {details.classroomTime && (
                      <div className="flex justify-between py-2 border-b border-border">
                        <span className="text-muted-foreground">Classroom</span>
                        <span className="text-foreground">{details.classroomTime}</span>
                      </div>
                    )}
                    {details.rangeTime && (
                      <div className="flex justify-between py-2 border-b border-border">
                        <span className="text-muted-foreground">Range Time</span>
                        <span className="text-foreground">{details.rangeTime}</span>
                      </div>
                    )}
                    {details.rounds && (
                      <div className="flex justify-between py-2 border-b border-border">
                        <span className="text-muted-foreground">Rounds Required</span>
                        <span className="text-foreground">{details.rounds}</span>
                      </div>
                    )}
                  </div>

                  {isOnlineCourse ? (
                    <Button 
                      onClick={() => setIsEnrollDialogOpen(true)}
                      className="w-full bg-[#006d7a] hover:bg-[#004149] text-white font-heading uppercase tracking-wide py-6 text-lg"
                      data-testid="button-enroll-cta"
                    >
                      Enroll Now
                    </Button>
                  ) : hasScheduledClasses && matchingCourse ? (
                    <Button
                      onClick={() => setIsRegisterModalOpen(true)}
                      className="w-full bg-[#006d7a] hover:bg-[#004149] text-white font-heading uppercase tracking-wide py-6 text-lg"
                      data-testid="button-register-cta"
                    >
                      {ctaText}
                    </Button>
                  ) : hasScheduledClasses ? (
                    <Link href={ctaLink}>
                      <Button
                        className="w-full bg-[#006d7a] hover:bg-[#004149] text-white font-heading uppercase tracking-wide py-6 text-lg"
                        data-testid="button-register-cta"
                      >
                        {ctaText}
                      </Button>
                    </Link>
                  ) : (
                    <Button 
                      onClick={() => setIsNotifyDialogOpen(true)}
                      className="w-full bg-[#006d7a] hover:bg-[#004149] text-white font-heading uppercase tracking-wide py-6 text-lg"
                      data-testid="button-notify-me-cta"
                    >
                      Notify Me
                    </Button>
                  )}
                  
                  {secondaryCta && (
                    <Link href={secondaryCta.link}>
                      <Button 
                        variant="outline"
                        className="w-full mt-3 border-border text-foreground hover:bg-muted text-[14px]"
                        data-testid="button-secondary-cta"
                      >
                        {secondaryCta.text}
                      </Button>
                    </Link>
                  )}
                </div>

                {/* Location Card */}
                <div className="bg-card rounded-xl p-6 border border-border">
                  <h3 className="font-heading uppercase tracking-widest text-foreground mb-4">Training Location</h3>
                  <div className="aspect-video bg-muted rounded-lg mb-4 overflow-hidden">
                    <iframe
                      width="100%"
                      height="100%"
                      style={{ border: 0 }}
                      loading="lazy"
                      allowFullScreen=""
                      referrerPolicy="no-referrer-when-downgrade"
                      src="https://maps.google.com/maps?q=35.13851322487321,-106.83882039002162&z=17&output=embed"
                    ></iframe>
                  </div>
                  <p className="text-muted-foreground text-sm mb-4">
                    {details.location || "Albuquerque, NM area. Exact location provided upon registration."}
                  </p>
                  <Button 
                    variant="outline" 
                    className="w-full border-border text-foreground hover:bg-muted"
                    onClick={() => window.open(`https://maps.google.com/?q=35.13851322487321,-106.83882039002162`, '_blank')}
                    data-testid="button-open-maps"
                  >
                    <MapPin className="h-4 w-4 mr-2" />
                    Open in Maps
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
      
      {isRegisterModalOpen && matchingCourse && (
        <RegistrationModal
          course={matchingCourse}
          onClose={() => setIsRegisterModalOpen(false)}
        />
      )}

      <NotifyMeDialog
        isOpen={isNotifyDialogOpen}
        onOpenChange={setIsNotifyDialogOpen}
        courseName={title}
      />
      
      {isOnlineCourse && (
        <OnlineCourseEnrollDialog
          isOpen={isEnrollDialogOpen}
          onOpenChange={setIsEnrollDialogOpen}
          courseName={title}
          coursePrice={onlineCoursePrice}
        />
      )}
    </Layout>
  );
}
