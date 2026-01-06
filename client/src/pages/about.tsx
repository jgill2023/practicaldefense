import { Layout } from "@/components/Layout";
import { SEO } from "@/components/SEO";
import { Card, CardContent } from "@/components/ui/card";
import heroImage from "@assets/Instructors_1767335152648.jpg";
import jeremyImg from "@assets/20180422_235425000_iOS_1767336860712.jpg";
import { Award, Shield, Target, Users } from "lucide-react";
import { useState, useEffect, useRef, useCallback } from "react";

interface InstructorData {
  id: string;
  name: string;
  title: string;
  image: string;
  credentials: string[];
  bio?: string;
}

const instructors: InstructorData[] = [
  {
    id: "jeremy-gill",
    name: "Jeremy Gill",
    title: "Founder and Lead Instructor",
    image: jeremyImg,
    credentials: [
      "NM DPS Certified Instructor #445",
      "NRA Certified Instructor",
      "Rangemaster Certified Instructor",
      "Dr. William Aprill's Unthinkable Attendee and Host",
      "Graduate of MAG-20"
    ],
    bio: "Jeremy founded Practical Defense Training with a mission to provide professional, results-driven firearms training that empowers responsible citizens."
  },
  {
    id: "jeremy-gill-2",
    name: "Jeremy Gill",
    title: "Founder and Lead Instructor",
    image: jeremyImg,
    credentials: [
      "NM DPS Certified Instructor #445",
      "NRA Certified Instructor",
      "Rangemaster Certified Instructor",
      "Dr. William Aprill's Unthinkable Attendee and Host",
      "Graduate of MAG-20"
    ],
    bio: "Jeremy founded Practical Defense Training with a mission to provide professional, results-driven firearms training that empowers responsible citizens."
  }
];

function InstructorCard({ instructor }: { instructor: InstructorData }) {
  return (
    <div 
      className="flex-shrink-0 w-[600px] md:w-[700px] lg:w-[800px] h-[500px]"
      data-testid={`instructor-card-${instructor.id}`}
    >
      <Card className="h-full overflow-hidden bg-card border-border">
        <CardContent className="p-0 h-full">
          <div className="flex h-full">
            <div className="w-[200px] md:w-[250px] lg:w-[300px] flex-shrink-0 overflow-hidden">
              <img 
                src={instructor.image} 
                alt={`${instructor.name} - ${instructor.title}`}
                className="w-full h-full object-cover"
                loading="lazy"
                data-testid={`img-instructor-${instructor.id}`}
              />
            </div>
            <div className="flex-1 p-6 space-y-4 overflow-y-auto">
              <div>
                <h3 
                  className="font-heading text-2xl uppercase tracking-widest text-foreground"
                  data-testid={`text-instructor-name-${instructor.id}`}
                >
                  {instructor.name}
                </h3>
                <p 
                  className="text-[#006d7a] font-semibold"
                  data-testid={`text-instructor-title-${instructor.id}`}
                >
                  {instructor.title}
                </p>
              </div>
              
              {instructor.bio && (
                <p className="text-muted-foreground text-sm leading-relaxed">
                  {instructor.bio}
                </p>
              )}
              
              <div>
                <h4 className="font-heading text-sm uppercase tracking-widest text-foreground mb-3 flex items-center gap-2">
                  <Award className="h-4 w-4 text-[#006d7a]" />
                  Certifications
                </h4>
                <ul className="space-y-2">
                  {instructor.credentials.map((credential, idx) => (
                    <li key={idx} className="flex items-start gap-2">
                      <div className="w-1.5 h-1.5 rounded-full bg-[#006d7a] mt-2 flex-shrink-0" />
                      <span className="text-muted-foreground text-sm">{credential}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function HorizontalScrollSection() {
  const sectionRef = useRef<HTMLElement>(null);
  const stickyRef = useRef<HTMLDivElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);
  const [isMobile, setIsMobile] = useState(false);

  const numCards = instructors.length;
  const sectionHeight = numCards * 100;

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  const handleScroll = useCallback(() => {
    if (!sectionRef.current || !trackRef.current || isMobile) return;

    const section = sectionRef.current;
    const track = trackRef.current;
    
    const sectionTop = section.offsetTop;
    const sectionHeight = section.offsetHeight;
    const viewportHeight = window.innerHeight;
    
    const scrollY = window.scrollY;
    const scrollStart = sectionTop;
    const scrollEnd = sectionTop + sectionHeight - viewportHeight;
    const scrollRange = scrollEnd - scrollStart;

    const trackWidth = track.scrollWidth;
    // Calculate maxTranslate ensuring the last card is fully visible and centered if possible
    // The target is to scroll until the end of the track is at the right edge of the viewport
    const maxTranslate = Math.max(0, trackWidth - window.innerWidth + 64);

    if (scrollRange <= 0 || maxTranslate <= 0) {
      track.style.transform = 'translateX(0px)';
      return;
    }

    if (scrollY <= scrollStart) {
      track.style.transform = 'translateX(0px)';
      return;
    }
    
    if (scrollY >= scrollEnd) {
      track.style.transform = `translateX(${-maxTranslate}px)`;
      return;
    }

    // Map vertical scroll progress (0 to 1) to horizontal translation
    const scrollProgress = (scrollY - scrollStart) / scrollRange;
    const translateX = -scrollProgress * maxTranslate;

    track.style.transform = `translateX(${translateX}px)`;
  }, [isMobile]);

  useEffect(() => {
    if (isMobile) return;

    let rafId: number;
    
    const onScroll = () => {
      rafId = requestAnimationFrame(handleScroll);
    };

    window.addEventListener('scroll', onScroll, { passive: true });
    handleScroll();

    return () => {
      window.removeEventListener('scroll', onScroll);
      if (rafId) cancelAnimationFrame(rafId);
    };
  }, [handleScroll, isMobile]);

  if (isMobile) {
    return (
      <section className="py-12 bg-background">
        <div className="px-4">
          <h2 className="text-2xl font-heading uppercase tracking-widest text-foreground mb-8">
            Our Instructors
          </h2>
        </div>
        <div className="overflow-x-auto scrollbar-hide">
          <div className="flex gap-6 px-4 pb-4" style={{ width: 'max-content' }}>
            {instructors.map((instructor) => (
              <InstructorCard key={instructor.id} instructor={instructor} />
            ))}
          </div>
        </div>
      </section>
    );
  }

  return (
    <section 
      ref={sectionRef}
      className="relative overflow-hidden"
      style={{ height: `${sectionHeight}vh` }}
      data-testid="instructor-horizontal-scroll-section"
    >
      <div 
        ref={stickyRef}
        className="sticky top-0 h-screen flex flex-col justify-center overflow-hidden"
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mb-8">
          <h2 className="text-2xl font-heading uppercase tracking-widest text-foreground">
            Our Instructors
          </h2>
          <p className="text-muted-foreground mt-2">
            Scroll to explore our team of certified professionals.
          </p>
        </div>
        
        <div 
          ref={trackRef}
          className="flex gap-8 px-8 will-change-transform"
          style={{ transform: 'translateX(0px)' }}
        >
          {instructors.map((instructor) => (
            <InstructorCard key={instructor.id} instructor={instructor} />
          ))}
        </div>
      </div>
    </section>
  );
}

export default function About() {
  const [grayscaleAmount, setGrayscaleAmount] = useState(0);
  
  useEffect(() => {
    const handleScroll = () => {
      const scrollProgress = Math.min(window.scrollY / 400, 1);
      setGrayscaleAmount(scrollProgress * 100);
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <Layout>
      <SEO 
        title="About Us"
        description="Meet the Practical Defense Training team. Combat veterans and certified instructors dedicated to professional firearms training and defensive skills education."
      />
      
      {/* Hero Section */}
      <section className="relative h-[65vh] min-h-[500px] flex items-end overflow-hidden">
        <div 
          className="absolute inset-0 bg-cover bg-center"
          style={{ 
            backgroundImage: `url(${heroImage})`,
            filter: `grayscale(${grayscaleAmount}%)`
          }}
          data-testid="img-about-hero"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-background via-background/70 to-transparent" />
        
        <div className="relative z-10 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-12">
          <h1 className="font-heading text-4xl md:text-5xl lg:text-6xl uppercase tracking-widest text-white font-bold">
            About Us
          </h1>
          <p className="text-white/80 text-lg mt-4 max-w-2xl">
            Meet the team behind Practical Defense Training.
          </p>
        </div>
      </section>

      {/* Main Content */}
      <section className="bg-background py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          
          {/* Mission Statement */}
          <div className="mb-12">
            <h2 className="text-2xl font-heading uppercase tracking-widest text-foreground mb-4">Our Mission</h2>
            <p className="text-muted-foreground text-[16px] max-w-4xl">
              At Practical Defense Training, we are committed to providing professional, results-driven firearms training 
              that empowers responsible citizens with the knowledge and skills necessary to protect themselves and their families. 
              We believe in practical over "tacti-cool" — focusing on what works in real-world defensive situations.
            </p>
          </div>

          {/* Values Grid */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
            <div className="flex items-center gap-3 bg-card rounded-lg p-4">
              <Shield className="h-6 w-6 text-[#006d7a]" />
              <div>
                <p className="text-foreground font-medium">Safety First</p>
                <p className="text-sm text-muted-foreground">Always our priority</p>
              </div>
            </div>
            <div className="flex items-center gap-3 bg-card rounded-lg p-4">
              <Target className="h-6 w-6 text-[#006d7a]" />
              <div>
                <p className="text-foreground font-medium">Results Driven</p>
                <p className="text-sm text-muted-foreground">Practical skills</p>
              </div>
            </div>
            <div className="flex items-center gap-3 bg-card rounded-lg p-4">
              <Award className="h-6 w-6 text-[#006d7a]" />
              <div>
                <p className="text-foreground font-medium">Certified</p>
                <p className="text-sm text-muted-foreground">Expert instructors</p>
              </div>
            </div>
            <div className="flex items-center gap-3 bg-card rounded-lg p-4">
              <Users className="h-6 w-6 text-[#006d7a]" />
              <div>
                <p className="text-foreground font-medium">Community</p>
                <p className="text-sm text-muted-foreground">Building competence</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Horizontal Scrolling Instructor Section */}
      <HorizontalScrollSection />

      {/* Footer spacing */}
      <section className="bg-background py-12" />
    </Layout>
  );
}
