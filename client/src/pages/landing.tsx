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
    return course.category.toLowerCase() === courseFilter;
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
      <section className="bg-gradient-to-br from-primary to-primary/80 text-primary-foreground py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div className="space-y-8">
              <div className="space-y-4">
                <h1 className="text-4xl lg:text-5xl font-bold leading-tight">
                  Elite Tactical Training Academy
                </h1>
                <p className="text-xl text-primary-foreground/80 leading-relaxed">
                  Professional firearms instruction by certified experts. From basic safety to advanced tactical training - building confidence through comprehensive education in a safe, controlled environment.
                </p>
              </div>
              
              <div className="flex flex-col sm:flex-row gap-4">
                <Button 
                  size="lg" 
                  className="bg-accent text-accent-foreground hover:bg-accent/90"
                  onClick={() => document.getElementById('courses')?.scrollIntoView({ behavior: 'smooth' })}
                  data-testid="button-browse-courses"
                >
                  <GraduationCap className="mr-2 h-5 w-5" />
                  View Training Courses
                </Button>
                <Button 
                  size="lg" 
                  variant="outline" 
                  className="border-primary-foreground text-primary-foreground hover:bg-primary-foreground hover:text-primary"
                  onClick={() => window.location.href = '/api/login'}
                  data-testid="button-login"
                >
                  Login
                </Button>
              </div>
              
              <div className="flex items-center space-x-6 pt-4">
                <div className="flex items-center space-x-2">
                  <Tag className="h-5 w-5 text-accent" />
                  <span className="text-sm">NRA Certified Instructor</span>
                </div>
                <div className="flex items-center space-x-2">
                  <Shield className="h-5 w-5 text-accent" />
                  <span className="text-sm">15+ Years Experience</span>
                </div>
                <div className="flex items-center space-x-2">
                  <Users className="h-5 w-5 text-accent" />
                  <span className="text-sm">Small Class Sizes</span>
                </div>
              </div>
            </div>
            
            <div className="lg:pl-8">
              <img 
                src="https://images.unsplash.com/photo-1578662996442-48f60103fc96?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&h=600" 
                alt="Professional firearms training facility with instructor and students" 
                className="rounded-xl shadow-2xl w-full h-auto"
              />
            </div>
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
