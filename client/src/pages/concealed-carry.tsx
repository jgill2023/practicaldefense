import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link, useLocation } from "wouter";
import { Layout } from "@/components/Layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { 
  Clock, 
  Calendar, 
  Users, 
  MapPin, 
  Target, 
  GraduationCap, 
  Shield, 
  CheckCircle,
  ArrowRight,
  DollarSign,
  BookOpen,
  Award
} from "lucide-react";
import type { CourseWithSchedules } from "@shared/schema";
import { RegistrationModal } from "@/components/RegistrationModal";

export default function ConcealedCarryPage() {
  const [, setLocation] = useLocation();
  const [selectedCourse, setSelectedCourse] = useState<CourseWithSchedules | null>(null);
  const [showRegistrationModal, setShowRegistrationModal] = useState(false);

  // Fetch concealed carry courses
  const { data: courses = [], isLoading } = useQuery<CourseWithSchedules[]>({
    queryKey: ["/api/courses"],
  });

  // Helper function to safely get category name
  const getCategoryName = (category: any): string => {
    if (!category) return '';
    // If it's a string (old format), return it
    if (typeof category === 'string') return category;
    // If it's an object (new format), return the name
    if (typeof category === 'object' && 'name' in category) {
      return (category as any).name as string;
    }
    return '';
  };

  // Filter for concealed carry courses
  const concealedCarryCourses = courses.filter(course => {
    const categoryName = getCategoryName(course.category);
    return (
      course.title.toLowerCase().includes('concealed') || 
      categoryName.toLowerCase().includes('concealed') ||
      course.title.toLowerCase().includes('ccw')
    );
  });

  // Find specific course types
  const initialCourse = concealedCarryCourses.find(course => 
    course.title.toLowerCase().includes('initial') ||
    (!course.title.toLowerCase().includes('renewal') && !course.title.toLowerCase().includes('refresher'))
  );
  const renewalCourse = concealedCarryCourses.find(course => 
    course.title.toLowerCase().includes('renewal')
  );
  const refresherCourse = concealedCarryCourses.find(course => 
    course.title.toLowerCase().includes('refresher')
  );

  // Create fallback courses if specific types don't exist
  const getOrCreateCourse = (existingCourse: CourseWithSchedules | undefined, type: 'initial' | 'renewal' | 'refresher') => {
    if (existingCourse) return existingCourse;
    
    // Use the first available concealed carry course as a fallback
    const fallbackCourse = concealedCarryCourses[0] || (courses.length > 0 ? courses[0] : null);
    return fallbackCourse;
  };

  const handleCourseSelect = (course: CourseWithSchedules) => {
    setSelectedCourse(course);
    setShowRegistrationModal(true);
  };

  const courseFeatures = [
    "Comprehensive 15-hour training program",
    "Hands-on instruction with S.I.R.T. training pistols",
    "Live fire range training and qualification", 
    "Defensive shooting fundamentals",
    "Concealment techniques and presentation",
    "Legal knowledge and responsibility",
    "New Mexico state certification"
  ];

  const courseSpecs = [
    { icon: DollarSign, label: "Course Fee", value: "$165" },
    { icon: BookOpen, label: "Classroom", value: "12 Hours" },
    { icon: Target, label: "Range Time", value: "3 Hours" },
    { icon: Users, label: "Required Rounds", value: "25 Rounds" }
  ];

  return (
    <Layout>
      <div className="min-h-screen bg-gradient-to-b from-background to-secondary/20">
        {/* Hero Section */}
        <section className="bg-primary text-primary-foreground py-16 md:py-24">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center">
              <div className="flex justify-center mb-6">
                <Badge variant="secondary" className="px-4 py-2 text-lg">
                  <Shield className="w-5 h-5 mr-2" />
                  New Mexico Concealed Carry Course
                </Badge>
              </div>
              
              <h1 className="text-2xl md:text-3xl font-medium mb-6" data-testid="text-hero-title">
                New Mexico Concealed Carry Course
              </h1>
              
              <div className="max-w-6xl mx-auto">
                <p className="text-base md:text-lg mb-8 leading-relaxed">
                  Tactical Advantage, LLC offers straightforward firearms training, with a focus and emphasis on New Mexico concealed carry training. One of the few courses which preaches and teaches <strong>practical over "tacti-cool"</strong>; bringing reliable and effective firearms training to the responsibly armed citizen.
                </p>
                
                <p className="text-sm md:text-base mb-8">
                  Students will gain the knowledge and skills necessary to legally and responsibly carry a concealed handgun in the State of New Mexico and those States with whom New Mexico shares reciprocity with.
                </p>
                
                <div className="bg-primary-foreground/10 rounded-lg p-6 mb-8">
                  <p className="text-base font-normal mb-2">
                    Your firearms training should be <strong>SAFE</strong>, <strong>FUN</strong>, and <strong>PRACTICAL</strong>.
                  </p>
                  <p className="text-sm">
                    Your safety and protection begins with <strong><em>you</em></strong>. It's <em>your</em> life. It's <em>your</em> safety and protection. It's <strong>your</strong> responsibility.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Course Specifications */}
        <section className="pt-16 pb-8 bg-background" id="course-details">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-12">
              <h2 className="text-xl md:text-2xl font-medium mb-4">Course Overview</h2>
              <p className="text-sm text-muted-foreground max-w-3xl mx-auto">
                Comprehensive training designed to prepare you for safe and legal concealed carry
              </p>
            </div>

            <div className="grid md:grid-cols-4 gap-6 mb-12">
              {courseSpecs.map((spec, index) => (
                <Card key={index} className="text-center">
                  <CardContent className="pt-6">
                    <spec.icon className="w-8 h-8 mx-auto mb-4 text-primary" />
                    <h3 className="font-medium mb-2">{spec.label}</h3>
                    <p className="text-xl font-semibold text-primary">{spec.value}</p>
                  </CardContent>
                </Card>
              ))}
            </div>

            {/* Course Description */}
            <Card className="mb-12">
              <CardHeader>
                <CardTitle className="flex items-center text-lg">
                  <GraduationCap className="w-4 h-4 mr-3" />
                  Course Description
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-sm leading-relaxed">
                  Our New Mexico Concealed Carry Course is one of the most comprehensive and fun concealed carry courses in the state. Our students receive hours of hands-on handgun training, both in the classroom and on the range.
                </p>
                <p className="text-sm leading-relaxed">
                  In the classroom you will use <strong>S.I.R.T. training pistols</strong> to work on your basic handgun and defensive shooting fundamentals, as well as presenting the handgun from concealment.
                </p>
                
                <Separator className="my-6" />
                
                <h4 className="text-base font-medium mb-4">What You'll Learn:</h4>
                <div className="grid md:grid-cols-2 gap-4">
                  {courseFeatures.map((feature, index) => (
                    <div key={index} className="flex items-start">
                      <CheckCircle className="w-5 h-5 text-green-500 mt-1 mr-3 flex-shrink-0" />
                      <span>{feature}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </section>

        {/* Course Types Section */}
        <section className="pt-8 pb-16 bg-secondary/30" id="course-types">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-12">
              <h2 className="text-xl md:text-2xl font-medium mb-4">Choose Your Course Type</h2>
              <p className="text-sm text-muted-foreground max-w-3xl mx-auto">
                Select the appropriate course based on your current certification status
              </p>
            </div>

            <div className="grid md:grid-cols-3 gap-8">
              {/* Initial Course */}
              <Card className="relative overflow-hidden border-2 hover:border-primary transition-colors">
                <div className="absolute top-0 left-0 right-0 bg-primary text-primary-foreground text-center py-2">
                  <Badge variant="secondary" className="bg-primary-foreground text-primary">
                    Most Popular
                  </Badge>
                </div>
                <CardHeader className="pt-12">
                  <CardTitle className="text-lg text-center">Initial 2-Day Course</CardTitle>
                  <div className="text-center">
                    <span className="text-2xl font-medium text-primary">$165</span>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-3">
                    <div className="flex items-center">
                      <Calendar className="w-4 h-4 mr-2 text-muted-foreground" />
                      <span>Saturday and Sunday</span>
                    </div>
                    <div className="flex items-center">
                      <Shield className="w-4 h-4 mr-2 text-muted-foreground" />
                      <span>NM DPS Approved</span>
                    </div>
                    <div className="flex items-center">
                      <Users className="w-4 h-4 mr-2 text-muted-foreground" />
                      <span>25 Rounds Required</span>
                    </div>
                  </div>
                  
                  <Separator />
                  
                  <div className="space-y-2">
                    <h4 className="font-semibold">Perfect for:</h4>
                    <ul className="text-sm space-y-1 text-muted-foreground">
                      <li>• First-time concealed carry applicants</li>
                      <li>• New Mexico residents seeking CCW license</li>
                      <li>• Complete beginners to firearm training</li>
                    </ul>
                  </div>
                  
                  <Button 
                    className="w-full mt-6" 
                    size="lg"
                    onClick={() => {
                      const course = getOrCreateCourse(initialCourse, 'initial');
                      if (course) handleCourseSelect(course);
                    }}
                    disabled={!getOrCreateCourse(initialCourse, 'initial')}
                    data-testid="button-register-initial"
                  >
                    Register for Initial Course
                  </Button>
                </CardContent>
              </Card>

              {/* 4-Year Renewal */}
              <Card className="border-2 hover:border-primary transition-colors">
                <CardHeader>
                  <CardTitle className="text-lg text-center">4-Year Renewal</CardTitle>
                  <div className="text-center">
                    <span className="text-2xl font-medium text-primary">$86</span>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-3">
                    <div className="flex items-center">
                      <Calendar className="w-4 h-4 mr-2 text-muted-foreground" />
                      <span>Half Day</span>
                    </div>
                    <div className="flex items-center">
                      <Clock className="w-4 h-4 mr-2 text-muted-foreground" />
                      <span>4 Hours</span>
                    </div>
                    <div className="flex items-center">
                      <Award className="w-4 h-4 mr-2 text-muted-foreground" />
                      <span>Renewal Certification</span>
                    </div>
                  </div>
                  
                  <Separator />
                  
                  <div className="space-y-2">
                    <h4 className="font-semibold">Perfect for:</h4>
                    <ul className="text-sm space-y-1 text-muted-foreground">
                      <li>• Current CCW license holders</li>
                      <li>• 4-year renewal requirement</li>
                      <li>• Experienced concealed carriers</li>
                    </ul>
                  </div>
                  
                  <Button 
                    variant="outline" 
                    className="w-full mt-6" 
                    size="lg"
                    onClick={() => {
                      const course = getOrCreateCourse(renewalCourse, 'renewal');
                      if (course) handleCourseSelect(course);
                    }}
                    disabled={!getOrCreateCourse(renewalCourse, 'renewal')}
                    data-testid="button-register-renewal"
                  >
                    Register for Renewal
                  </Button>
                </CardContent>
              </Card>

              {/* 2-Year Refresher */}
              <Card className="border-2 hover:border-primary transition-colors">
                <CardHeader>
                  <CardTitle className="text-lg text-center">2-Year Refresher</CardTitle>
                  <div className="text-center">
                    <span className="text-2xl font-medium text-primary">$56</span>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-3">
                    <div className="flex items-center">
                      <Clock className="w-4 h-4 mr-2 text-muted-foreground" />
                      <span>2 Hours</span>
                    </div>
                    <div className="flex items-center">
                      <Award className="w-4 h-4 mr-2 text-muted-foreground" />
                      <span>Skills Refresher</span>
                    </div>
                  </div>
                  
                  <Separator />
                  
                  <div className="space-y-2">
                    <h4 className="font-semibold">Perfect for:</h4>
                    <ul className="text-sm space-y-1 text-muted-foreground">
                      <li>• 2-year refresher requirement</li>
                      <li>• Skills update and review</li>
                      <li>• Maintaining proficiency</li>
                    </ul>
                  </div>
                  
                  <Button 
                    variant="outline" 
                    className="w-full mt-6" 
                    size="lg"
                    onClick={() => {
                      const course = getOrCreateCourse(refresherCourse, 'refresher');
                      if (course) handleCourseSelect(course);
                    }}
                    disabled={!getOrCreateCourse(refresherCourse, 'refresher')}
                    data-testid="button-register-refresher"
                  >
                    Register for Refresher
                  </Button>
                </CardContent>
              </Card>
            </div>

          </div>
        </section>

        {/* Call to Action */}
        <section className="bg-primary text-primary-foreground py-16">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
            <h2 className="text-xl md:text-2xl font-medium mb-6">
              Ready to Start Your Concealed Carry Journey?
            </h2>
            <p className="text-base mb-8 leading-relaxed">
              Join hundreds of New Mexico residents who have received their concealed carry training through Tactical Advantage. Professional instruction, practical skills, and the confidence you need.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button 
                size="lg" 
                className="bg-accent text-accent-foreground hover:bg-accent/90 text-lg px-8 py-4"
                onClick={() => document.getElementById('course-types')?.scrollIntoView({ behavior: 'smooth' })}
                data-testid="button-cta-register"
              >
                Choose Your Course
                <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
              <Link href="/contact">
                <Button 
                  variant="outline" 
                  size="lg" 
                  className="border-primary-foreground text-primary-foreground hover:bg-primary-foreground hover:text-primary text-lg px-8 py-4"
                  data-testid="button-cta-contact"
                >
                  Have Questions?
                </Button>
              </Link>
            </div>
            
            <div className="mt-12 pt-8 border-t border-primary-foreground/20">
              <p className="text-sm opacity-90">
                Questions? Call <strong>(505) 944-5247</strong> or email{" "}
                <a href="mailto:chris@tacticaladv.com" className="underline">
                  chris@tacticaladv.com
                </a>
              </p>
            </div>
          </div>
        </section>
      </div>

      {/* Registration Modal */}
      {selectedCourse && (
        <RegistrationModal
          course={selectedCourse}
          isOpen={showRegistrationModal}
          onClose={() => {
            setShowRegistrationModal(false);
            setSelectedCourse(null);
          }}
        />
      )}
    </Layout>
  );
}