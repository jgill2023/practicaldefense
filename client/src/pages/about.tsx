import { Layout } from "@/components/Layout";
import { SEO } from "@/components/SEO";
import { Card, CardContent } from "@/components/ui/card";
import heroImage from "@assets/Instructors_1767335152648.jpg";
import jeremyImg from "@assets/20180422_235425000_iOS_1767336860712.jpg";
import { Award, Shield, Target, Users } from "lucide-react";
import { useState, useEffect } from "react";

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
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-16">
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

          {/* Instructors Section */}
          <div className="mb-8">
            <h2 className="text-2xl font-heading uppercase tracking-widest text-foreground mb-8">Our Instructors</h2>
          </div>

          {/* Jeremy Gill - Lead Instructor */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-12">
            
            {/* Left Column - Photo */}
            <div className="lg:col-span-1">
              <Card className="overflow-hidden">
                <CardContent className="p-0">
                  <img 
                    src={jeremyImg} 
                    alt="Jeremy Gill - Founder and Lead Instructor" 
                    className="w-full aspect-[3/4] object-cover"
                    loading="lazy"
                    data-testid="img-instructor-jeremy"
                  />
                </CardContent>
              </Card>
            </div>

            {/* Right Column - Bio & Credentials */}
            <div className="lg:col-span-2 space-y-6">
              <div>
                <h3 className="font-heading text-3xl uppercase tracking-widest text-foreground mb-1" data-testid="text-instructor-name-jeremy">
                  Jeremy Gill
                </h3>
                <p className="text-[#006d7a] font-semibold text-lg" data-testid="text-instructor-title-jeremy">
                  Founder and Lead Instructor
                </p>
              </div>

              <div>
                <h4 className="font-heading text-lg uppercase tracking-widest text-foreground mb-4 flex items-center gap-2">
                  <Award className="h-5 w-5 text-[#006d7a]" />
                  Certifications & Qualifications
                </h4>
                <ul className="space-y-3">
                  <li className="flex items-start gap-3">
                    <div className="w-1.5 h-1.5 rounded-full bg-[#006d7a] mt-2 flex-shrink-0" />
                    <span className="text-muted-foreground">NM DPS Certified Instructor #445</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <div className="w-1.5 h-1.5 rounded-full bg-[#006d7a] mt-2 flex-shrink-0" />
                    <span className="text-muted-foreground">NRA Certified Instructor</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <div className="w-1.5 h-1.5 rounded-full bg-[#006d7a] mt-2 flex-shrink-0" />
                    <span className="text-muted-foreground">Rangemaster Certified Instructor</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <div className="w-1.5 h-1.5 rounded-full bg-[#006d7a] mt-2 flex-shrink-0" />
                    <span className="text-muted-foreground">Dr. William Aprill's Unthinkable Attendee and Host</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <div className="w-1.5 h-1.5 rounded-full bg-[#006d7a] mt-2 flex-shrink-0" />
                    <span className="text-muted-foreground">Graduate of MAG-20</span>
                  </li>
                </ul>
              </div>
            </div>
          </div>

          {/* Additional Instructors Placeholder */}
          <div className="border-t border-border pt-12">
            <h3 className="font-heading text-xl uppercase tracking-widest text-foreground mb-6">Additional Team Members</h3>
            <Card className="border-dashed">
              <CardContent className="flex items-center justify-center py-12">
                <p className="text-muted-foreground text-center">
                  More instructor profiles coming soon.
                </p>
              </CardContent>
            </Card>
          </div>

        </div>
      </section>
    </Layout>
  );
}
