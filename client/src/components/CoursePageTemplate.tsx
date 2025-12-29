import { Layout } from "@/components/Layout";
import { SEO } from "@/components/SEO";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  ArrowLeft, 
  Clock, 
  MapPin, 
  DollarSign,
  Target,
  BookOpen,
  CheckCircle,
  AlertTriangle,
  ChevronDown
} from "lucide-react";
import { Link } from "wouter";
import { useState } from "react";

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
  secondaryCta?: {
    text: string;
    link: string;
  };
}

function FAQAccordion({ question, answer }: FAQItem) {
  const [isOpen, setIsOpen] = useState(false);
  
  return (
    <div className="border-b border-zinc-700">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full py-4 flex items-center justify-between text-left"
        data-testid={`faq-toggle-${question.slice(0, 20).replace(/\s/g, '-')}`}
      >
        <span className="text-white font-medium pr-4">{question}</span>
        <ChevronDown className={`h-5 w-5 text-zinc-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>
      {isOpen && (
        <div className="pb-4 text-zinc-400 leading-relaxed">
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
  secondaryCta
}: CoursePageTemplateProps) {
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
      <section className="relative h-[50vh] min-h-[400px] flex items-end overflow-hidden">
        <div 
          className="absolute inset-0 bg-cover bg-center grayscale"
          style={{ backgroundImage: `url(${heroImage})` }}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-zinc-950 via-zinc-950/70 to-transparent" />
        
        <div className="relative z-10 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-12">
          <Link href="/schedule-list">
            <Button 
              variant="ghost" 
              className="mb-6 text-zinc-300 hover:text-white hover:bg-zinc-800/50"
              data-testid="button-back-catalog"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Training Catalog
            </Button>
          </Link>
          
          <div className="flex items-center gap-4 mb-4">
            <Badge className={`${levelColors[level]} text-white px-3 py-1`}>
              {level}
            </Badge>
          </div>
          
          <h1 className="font-heading text-4xl md:text-5xl lg:text-6xl uppercase tracking-wide text-white font-bold italic">
            {title}
          </h1>
        </div>
      </section>

      {/* Main Content */}
      <section className="bg-zinc-950 py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            
            {/* Left Column - Main Content (2/3) */}
            <div className="lg:col-span-2 space-y-8">
              
              {/* Overview */}
              <div>
                <h2 className="text-2xl font-heading uppercase tracking-wide text-white mb-4">Overview</h2>
                <p className="text-zinc-300 leading-relaxed text-lg">{overview}</p>
                
                {/* Quick Reference Grid */}
                <div className="grid grid-cols-2 gap-4 mt-6">
                  <div className="flex items-center gap-3 bg-zinc-900 rounded-lg p-4">
                    <Clock className="h-6 w-6 text-amber-500" />
                    <div>
                      <p className="text-sm text-zinc-500">Duration</p>
                      <p className="text-white font-medium">{details.duration}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 bg-zinc-900 rounded-lg p-4">
                    <MapPin className="h-6 w-6 text-amber-500" />
                    <div>
                      <p className="text-sm text-zinc-500">Location</p>
                      <p className="text-white font-medium">{details.location || "Albuquerque, NM"}</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Curriculum Timeline */}
              <div>
                <h2 className="text-2xl font-heading uppercase tracking-wide text-white mb-6">Training Curriculum</h2>
                <div className="relative">
                  {curriculum.map((item, index) => (
                    <div key={index} className="flex gap-4 pb-8 last:pb-0">
                      {/* Timeline line and circle */}
                      <div className="flex flex-col items-center">
                        <div className="flex items-center justify-center w-10 h-10 rounded-full bg-amber-600 text-white font-bold text-sm">
                          {index + 1}
                        </div>
                        {index < curriculum.length - 1 && (
                          <div className="w-0.5 flex-1 bg-zinc-700 mt-2" />
                        )}
                      </div>
                      {/* Content */}
                      <div className="flex-1 pb-4">
                        <h3 className="text-lg font-semibold text-white mb-2">{item.title}</h3>
                        <p className="text-zinc-400">{item.description}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Gear Checklist */}
              <div className="bg-zinc-900 rounded-xl p-6">
                <h2 className="text-2xl font-heading uppercase tracking-wide text-white mb-6">What to Bring</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {gearList.map((gear, index) => (
                    <div key={index} className="flex items-center gap-3">
                      <CheckCircle className={`h-5 w-5 ${gear.required ? 'text-amber-500' : 'text-zinc-500'}`} />
                      <span className={gear.required ? 'text-white' : 'text-zinc-400'}>
                        {gear.item}
                        {gear.required && <span className="text-amber-500 ml-1">*</span>}
                      </span>
                    </div>
                  ))}
                </div>
                
                {rentalInfo && (
                  <div className="mt-6 p-4 bg-zinc-800 rounded-lg border border-zinc-700 flex items-start gap-3">
                    <AlertTriangle className="h-5 w-5 text-amber-500 flex-shrink-0 mt-0.5" />
                    <p className="text-zinc-300 text-sm">{rentalInfo}</p>
                  </div>
                )}
              </div>

              {/* FAQ Accordion */}
              <div>
                <h2 className="text-2xl font-heading uppercase tracking-wide text-white mb-6">Frequently Asked Questions</h2>
                <div className="bg-zinc-900 rounded-xl p-6">
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
                <div className="bg-zinc-900 rounded-xl p-6 border border-zinc-800">
                  <div className="text-center mb-6">
                    <div className="flex items-center justify-center gap-2 mb-2">
                      <DollarSign className="h-6 w-6 text-amber-500" />
                      <span className="text-4xl font-bold text-white">{details.price}</span>
                    </div>
                    <p className="text-zinc-400 text-sm">per student</p>
                  </div>
                  
                  <div className="space-y-3 mb-6 text-sm">
                    <div className="flex justify-between py-2 border-b border-zinc-800">
                      <span className="text-zinc-400">Course Time</span>
                      <span className="text-white">{details.time}</span>
                    </div>
                    {details.classroomTime && (
                      <div className="flex justify-between py-2 border-b border-zinc-800">
                        <span className="text-zinc-400">Classroom</span>
                        <span className="text-white">{details.classroomTime}</span>
                      </div>
                    )}
                    {details.rangeTime && (
                      <div className="flex justify-between py-2 border-b border-zinc-800">
                        <span className="text-zinc-400">Range Time</span>
                        <span className="text-white">{details.rangeTime}</span>
                      </div>
                    )}
                    {details.rounds && (
                      <div className="flex justify-between py-2 border-b border-zinc-800">
                        <span className="text-zinc-400">Rounds Required</span>
                        <span className="text-white">{details.rounds}</span>
                      </div>
                    )}
                  </div>

                  <Link href={ctaLink}>
                    <Button 
                      className="w-full bg-amber-600 hover:bg-amber-700 text-white font-heading uppercase tracking-wide py-6 text-lg"
                      data-testid="button-register-cta"
                    >
                      {ctaText}
                    </Button>
                  </Link>
                  
                  {secondaryCta && (
                    <Link href={secondaryCta.link}>
                      <Button 
                        variant="outline"
                        className="w-full mt-3 border-zinc-700 text-zinc-300 hover:bg-zinc-800"
                        data-testid="button-secondary-cta"
                      >
                        {secondaryCta.text}
                      </Button>
                    </Link>
                  )}
                </div>

                {/* Location Card */}
                <div className="bg-zinc-900 rounded-xl p-6 border border-zinc-800">
                  <h3 className="font-heading uppercase tracking-wide text-white mb-4">Training Location</h3>
                  <div className="aspect-video bg-zinc-800 rounded-lg mb-4 flex items-center justify-center">
                    <MapPin className="h-12 w-12 text-zinc-600" />
                  </div>
                  <p className="text-zinc-400 text-sm mb-4">
                    {details.location || "Albuquerque, NM area. Exact location provided upon registration."}
                  </p>
                  <Button 
                    variant="outline" 
                    className="w-full border-zinc-700 text-zinc-300 hover:bg-zinc-800"
                    onClick={() => window.open('https://maps.google.com/?q=Albuquerque+NM', '_blank')}
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
    </Layout>
  );
}
