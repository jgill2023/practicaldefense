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
import type { CourseWithSchedules } from "@shared/schema";
import heroImage from "@assets/MainHeader2AndyOVERLAY_1757359693558.jpg";

export default function Landing() {
  const [, setLocation] = useLocation();
  const [selectedCourse, setSelectedCourse] = useState<CourseWithSchedules | null>(null);
  const [showRegistrationModal, setShowRegistrationModal] = useState(false);
  const [courseFilter, setCourseFilter] = useState("all");

  const { data: courses = [], isLoading } = useQuery<CourseWithSchedules[]>({
    queryKey: ["/api/courses"],
  });

  const filteredCourses = courses.filter(course => {
    if (courseFilter === "all") return true;
    
    // Map filter values to actual database categories
    const categoryMappings: Record<string, string[]> = {
      "basic": ["In-Person Session"],
      "advanced": ["Defensive Handgun"],
      "concealed": ["Concealed Carry"]
    };
    
    const allowedCategories = categoryMappings[courseFilter] || [];
    return allowedCategories.includes(course.category);
  });

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

      {/* Trust Indicators */}
      <section className="bg-muted py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 items-center">
            <div className="text-center" data-testid="trust-ssl">
              <div className="bg-success/10 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-3">
                <Shield className="text-success h-8 w-8" />
              </div>
              <p className="text-sm font-medium text-muted-foreground">SSL Encrypted</p>
            </div>
            <div className="text-center" data-testid="trust-certified">
              <div className="bg-success/10 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-3">
                <Tag className="text-success h-8 w-8" />
              </div>
              <p className="text-sm font-medium text-muted-foreground">NRA Certified</p>
            </div>
            <div className="text-center" data-testid="trust-students">
              <div className="bg-success/10 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-3">
                <Users className="text-success h-8 w-8" />
              </div>
              <p className="text-sm font-medium text-muted-foreground">500+ Trained Students</p>
            </div>
            <div className="text-center" data-testid="trust-rating">
              <div className="bg-success/10 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-3">
                <Star className="text-success h-8 w-8" />
              </div>
              <p className="text-sm font-medium text-muted-foreground">Local Expert</p>
            </div>
          </div>
        </div>
      </section>

      {/* Course Listings */}
      <section id="courses" className="py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl lg:text-4xl font-bold text-foreground mb-4">
              Training Programs Offered
            </h2>
            <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
              Personalized instruction tailored to your experience level. Whether you're a first-time shooter or looking to enhance your skills, we provide safe, professional training in a supportive environment.
            </p>
          </div>
          
          {/* Course Filter Tabs */}
          <div className="flex flex-wrap justify-center gap-4 mb-12">
            <Button 
              variant={courseFilter === "all" ? "default" : "outline"}
              onClick={() => setCourseFilter("all")}
              data-testid="filter-all"
            >
              All Courses
            </Button>
            <Button 
              variant={courseFilter === "basic" ? "default" : "outline"}
              onClick={() => setCourseFilter("basic")}
              data-testid="filter-basic"
            >
              Basic Training
            </Button>
            <Button 
              variant={courseFilter === "advanced" ? "default" : "outline"}
              onClick={() => setCourseFilter("advanced")}
              data-testid="filter-advanced"
            >
              Advanced
            </Button>
            <Button 
              variant={courseFilter === "concealed" ? "default" : "outline"}
              onClick={() => setCourseFilter("concealed")}
              data-testid="filter-concealed"
            >
              Concealed Carry
            </Button>
          </div>
          
          {/* Course Grid */}
          {isLoading ? (
            <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-8">
              {[1, 2, 3].map(i => (
                <Card key={i} className="animate-pulse">
                  <div className="h-48 bg-muted" />
                  <CardContent className="p-6">
                    <div className="h-4 bg-muted rounded mb-2" />
                    <div className="h-4 bg-muted rounded w-3/4 mb-4" />
                    <div className="h-20 bg-muted rounded mb-4" />
                    <div className="h-10 bg-muted rounded" />
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-8">
              {filteredCourses.map(course => (
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
