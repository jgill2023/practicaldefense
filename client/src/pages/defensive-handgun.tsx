import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Layout } from "@/components/Layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { 
  Clock, 
  Calendar, 
  Users, 
  Target, 
  GraduationCap, 
  Shield, 
  CheckCircle,
  ArrowRight,
  DollarSign,
  BookOpen,
  Crosshair,
  Bell
} from "lucide-react";
import type { CourseWithSchedules } from "@shared/schema";
import { RegistrationModal } from "@/components/RegistrationModal";
import { CourseNotificationModal } from "@/components/CourseNotificationModal";

export default function DefensiveHandgunPage() {
  const [selectedCourse, setSelectedCourse] = useState<CourseWithSchedules | null>(null);
  const [showRegistrationModal, setShowRegistrationModal] = useState(false);
  const [showNotificationModal, setShowNotificationModal] = useState(false);

  // Fetch defensive handgun courses
  const { data: courses = [], isLoading } = useQuery<CourseWithSchedules[]>({
    queryKey: ["/api/courses"],
  });

  // Helper function to safely get category name
  const getCategoryName = (category: any): string => {
    if (!category) return '';
    if (typeof category === 'string') return category;
    if (typeof category === 'object' && 'name' in category) {
      return (category as any).name as string;
    }
    return '';
  };

  // Filter for defensive handgun courses
  const defensiveHandgunCourses = courses.filter(course => {
    const categoryName = getCategoryName(course.category);
    return (
      course.title.toLowerCase().includes('defensive') || 
      course.title.toLowerCase().includes('handgun') ||
      categoryName.toLowerCase().includes('defensive') ||
      categoryName.toLowerCase().includes('handgun')
    );
  });

  // Check if there are any 2-day defensive handgun courses with available schedules
  const twoDayCoursesWithSchedules = defensiveHandgunCourses.filter(course => 
    (course.title.toLowerCase().includes('2-day') || 
     course.title.toLowerCase().includes('two day')) &&
    course.schedules && 
    course.schedules.length > 0 &&
    course.schedules.some(schedule => 
      schedule.availableSpots > 0 && 
      new Date(schedule.startDate) > new Date()
    )
  );

  const hasTwoDayCoursesAvailable = twoDayCoursesWithSchedules.length > 0;

  const handleCourseSelect = (course: CourseWithSchedules) => {
    setSelectedCourse(course);
    setShowRegistrationModal(true);
  };

  const handleNotificationRequest = () => {
    setShowNotificationModal(true);
  };

  // Course specifications for 1-day course
  const oneDaySpecs = [
    { icon: DollarSign, label: "Course Fee", value: "$155" },
    { icon: Clock, label: "Time", value: "9:00 AM - 5:00 PM" },
    { icon: Target, label: "Range Time", value: "8 Hours" },
    { icon: Users, label: "Required Rounds", value: "150 Rounds" }
  ];

  // Course specifications for 2-day course
  const twoDaySpecs = [
    { icon: DollarSign, label: "Course Fee", value: "$250" },
    { icon: Clock, label: "Time", value: "9:00 AM - 5:00 PM" },
    { icon: Target, label: "Range Time", value: "16 Hours" },
    { icon: Users, label: "Required Rounds", value: "250 Rounds" }
  ];

  // 1-Day course features
  const oneDayFeatures = [
    "Presenting the handgun from concealment",
    "Accurate first shot placement",
    "Accurate and rapid follow-up shot placement",
    "Shooting from retention",
    "Threat recognition",
    "Reloads"
  ];

  // 2-Day course features (includes 1-day plus additional)
  const twoDayFeatures = [
    "All 1-Day course material",
    "Use of cover",
    "Movement",
    "Multiple threat recognition and engagement",
    "Shooting with a flash sight picture vs aimed fire",
    "Shooting from unconventional shooting stances and positions",
    "Malfunction clearing"
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
                  <Crosshair className="w-5 h-5 mr-2" />
                  Defensive Handgun Training
                </Badge>
              </div>
              
              <h1 className="text-2xl md:text-3xl font-medium mb-6" data-testid="text-hero-title">
                1 or 2 Day Defensive Handgun Course
              </h1>
              
              <div className="max-w-6xl mx-auto">
                <p className="text-base md:text-lg mb-8 leading-relaxed">
                  Our 1 and 2 Day Defensive Handgun Courses focus on the shooting fundamentals that you will likely need in a defensive shooting. Day 1 begins with a basic shooting skills assessment to provide a baseline for each student. From there, students will begin working on defensive shooting fundamentals.
                </p>
                
                <p className="text-sm md:text-base mb-8">
                  Students must be able to safely handle their handguns and should be proficient with their handguns.
                </p>
                
                <div className="bg-primary-foreground/10 rounded-lg p-6 mb-8">
                  <p className="text-base font-normal mb-2">
                    Your firearms training should be <strong>SAFE</strong>, <strong>FUN</strong>, and <strong>PRACTICAL</strong>.
                  </p>
                  <p className="text-sm">
                    Master the defensive shooting fundamentals that matter most in <strong>real-world scenarios</strong>.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Course Options Section */}
        <section className="pt-16 pb-8 bg-background" id="course-options">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-12">
              <h2 className="text-xl md:text-2xl font-medium mb-4">Choose Your Course Length</h2>
              <p className="text-sm text-muted-foreground max-w-3xl mx-auto">
                Select between our comprehensive 1-day or intensive 2-day defensive handgun training program
              </p>
            </div>

            <div className="grid lg:grid-cols-2 gap-8 mb-12">
              {/* 1-Day Course */}
              <Card className="relative">
                <CardHeader>
                  <CardTitle className="flex items-center text-lg">
                    <Target className="w-5 h-5 mr-3" />
                    1-Day Defensive Handgun Course
                  </CardTitle>
                  <CardDescription>
                    Essential defensive shooting fundamentals in one intensive day
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  {/* 1-Day Specs */}
                  <div className="grid grid-cols-2 gap-4">
                    {oneDaySpecs.map((spec, index) => (
                      <div key={index} className="text-center p-3 bg-secondary/30 rounded-lg">
                        <spec.icon className="w-5 h-5 mx-auto mb-2 text-primary" />
                        <h4 className="text-xs font-medium mb-1">{spec.label}</h4>
                        <p className="text-sm font-semibold text-primary">{spec.value}</p>
                      </div>
                    ))}
                  </div>

                  <Separator />

                  <div>
                    <h4 className="text-base font-medium mb-4">Course Curriculum:</h4>
                    <div className="space-y-2">
                      {oneDayFeatures.map((feature, index) => (
                        <div key={index} className="flex items-start">
                          <CheckCircle className="w-4 h-4 text-green-500 mt-1 mr-3 flex-shrink-0" />
                          <span className="text-sm">{feature}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="pt-4">
                    <Button 
                      onClick={() => {
                        // Try to find a 1-day defensive handgun course or use the first available
                        const course = defensiveHandgunCourses.find(c => 
                          c.title.toLowerCase().includes('1-day') || 
                          c.title.toLowerCase().includes('one day')
                        ) || defensiveHandgunCourses[0] || courses[0];
                        if (course) handleCourseSelect(course);
                      }}
                      className="w-full"
                      data-testid="button-register-1day"
                    >
                      Register for 1-Day Course
                      <ArrowRight className="w-4 h-4 ml-2" />
                    </Button>
                  </div>
                </CardContent>
              </Card>

              {/* 2-Day Course */}
              <Card className="relative border-primary">
                <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                  <Badge variant="default" className="px-3 py-1">
                    Most Popular
                  </Badge>
                </div>
                <CardHeader>
                  <CardTitle className="flex items-center text-lg">
                    <Target className="w-5 h-5 mr-3" />
                    2-Day Defensive Handgun Course
                  </CardTitle>
                  <CardDescription>
                    Comprehensive training with advanced defensive techniques
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  {/* 2-Day Specs */}
                  <div className="grid grid-cols-2 gap-4">
                    {twoDaySpecs.map((spec, index) => (
                      <div key={index} className="text-center p-3 bg-secondary/30 rounded-lg">
                        <spec.icon className="w-5 h-5 mx-auto mb-2 text-primary" />
                        <h4 className="text-xs font-medium mb-1">{spec.label}</h4>
                        <p className="text-sm font-semibold text-primary">{spec.value}</p>
                      </div>
                    ))}
                  </div>

                  <Separator />

                  <div>
                    <h4 className="text-base font-medium mb-4">Course Curriculum:</h4>
                    <div className="space-y-2">
                      {twoDayFeatures.map((feature, index) => (
                        <div key={index} className="flex items-start">
                          <CheckCircle className="w-4 h-4 text-green-500 mt-1 mr-3 flex-shrink-0" />
                          <span className="text-sm">{feature}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="pt-4">
                    {hasTwoDayCoursesAvailable ? (
                      <Button 
                        onClick={() => {
                          // Find the first available 2-day defensive handgun course
                          const course = twoDayCoursesWithSchedules[0];
                          if (course) handleCourseSelect(course);
                        }}
                        className="w-full"
                        data-testid="button-register-2day"
                      >
                        Register for 2-Day Course
                        <ArrowRight className="w-4 h-4 ml-2" />
                      </Button>
                    ) : (
                      <Button 
                        onClick={handleNotificationRequest}
                        variant="outline"
                        className="w-full"
                        data-testid="button-notify-2day"
                      >
                        <Bell className="w-4 h-4 mr-2" />
                        Notify Me About Upcoming Courses
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </section>

        {/* Course Description */}
        <section className="pt-8 pb-16 bg-secondary/30" id="course-details">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center text-lg">
                  <GraduationCap className="w-5 h-5 mr-3" />
                  Course Prerequisites & Information
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-sm leading-relaxed">
                  <strong>Prerequisites:</strong> Students must be able to safely handle their handguns and should be proficient with their handguns. Day 1 begins with a basic shooting skills assessment to provide a baseline for each student.
                </p>
                
                <p className="text-sm leading-relaxed">
                  <strong>Registration Process:</strong> After completing the short registration form you will be redirected to the class questionnaire. Please complete the class questionnaire at your earliest convenience.
                </p>

                <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg p-4 mt-6">
                  <p className="text-sm text-amber-800 dark:text-amber-200">
                    <strong>Note:</strong> Check back soon for our Defensive Handgun Course Schedule. Course dates will be posted as they become available.
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        </section>

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

        {/* Course Notification Modal */}
        <CourseNotificationModal
          isOpen={showNotificationModal}
          onClose={() => setShowNotificationModal(false)}
          courseType="2-day defensive handgun"
          courseCategory="defensive handgun"
        />
      </div>
    </Layout>
  );
}