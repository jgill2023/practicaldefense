import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { 
  Calendar, 
  Clock, 
  Target, 
  BookOpen, 
  Award, 
  Shield, 
  CheckCircle, 
  Users,
  Smartphone,
  Globe,
  Star,
  Quote
} from "lucide-react";
import { useState } from "react";
import { RegistrationModal } from "@/components/RegistrationModal";
import { useQuery } from "@tanstack/react-query";

interface CourseSpec {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
}

interface CourseFeature {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  description: string;
}

interface Testimonial {
  name: string;
  text: string;
}

interface FAQ {
  question: string;
  answer: string;
}

const courseSpecs: CourseSpec[] = [
  { icon: Shield, label: "NM DPS Approved", value: "Fully Vetted" },
  { icon: Clock, label: "Your Schedule", value: "24/7 Access" },
  { icon: Smartphone, label: "Mobile Friendly", value: "Any Device" },
  { icon: Globe, label: "Online + Range", value: "8 + 7 Hours" }
];

const courseFeatures: CourseFeature[] = [
  {
    icon: BookOpen,
    title: "NM CCL Requirements",
    description: "Learn requirements to obtain a New Mexico Concealed Carry License and how to apply"
  },
  {
    icon: Target,
    title: "Where You Can Carry",
    description: "Know where you can and cannot carry a firearm, including restaurant restrictions"
  },
  {
    icon: Shield,
    title: "Defensive Handgun Selection",
    description: "How to select a defensive handgun and personal defense ammunition you can bet your life on"
  },
  {
    icon: Users,
    title: "Safe Storage & Access",
    description: "How to safely secure firearms while maintaining rapid access, considering children safety"
  },
  {
    icon: Target,
    title: "Defensive Shooting",
    description: "Defensive shooting fundamentals and why bullseye marksmanship isn't practical for self-defense"
  },
  {
    icon: Shield,
    title: "Threat Avoidance",
    description: "Lifesaving techniques and mindset shifts to reduce likelihood of becoming a victim"
  },
  {
    icon: CheckCircle,
    title: "Concealed Carry Methods",
    description: "Practical how-to carry concealed and avoid common mistakes most carriers make"
  },
  {
    icon: Award,
    title: "Stress Response",
    description: "Psychological and physiological reactions to high stress and body's response to attacks"
  },
  {
    icon: BookOpen,
    title: "Use of Deadly Force",
    description: "What makes deadly force justified and jury instructions in self-defense shootings"
  }
];

const testimonials: Testimonial[] = [
  {
    name: "Sherry F.",
    text: "The online course used a wide variety of teaching methods to hold my interest. I appreciated the fact that I could 'go back' and review or refresh my memory. I never found myself bored as can happen in a classroom setting."
  },
  {
    name: "Kenneth M.",
    text: "I have already recommended your online course to several friends and coworkers who have varied schedules, and would benefit from the flexibility of being able to take your valuable course online."
  },
  {
    name: "Alejandro T.",
    text: "This online CCW course was great. It taught me a lot and it was great value for my bucks. It was very informative and helpful. It was a huge bonus knowing that I could work at my own pace."
  },
  {
    name: "Oscar B.",
    text: "The online course was great because I could work at my own pace and not feel rushed to try to comprehend all of the information over a weekend workshop."
  },
  {
    name: "Evan S.",
    text: "This was a great online course that allowed me to go through the information at my own pace and convenience. Jeremy does a great job in the videos and lectures."
  },
  {
    name: "Sandra A.",
    text: "The online CCL course was very simple. I was able to review information as needed and watch the videos again if I missed something. You can let information sink in."
  }
];

const faqs: FAQ[] = [
  {
    question: "Does your ONLINE concealed carry course meet the training requirements for a NM CCL?",
    answer: "Yes, absolutely. Our online course is designed specifically for New Mexico and has been vetted and approved by the New Mexico Department of Public Safety. Many students have already completed our course and received their NM CCL."
  },
  {
    question: "When does the course begin?",
    answer: "You can begin the online portion whenever you feel like it, as soon as you enroll. Once you enroll, you'll be emailed your unique enrollment key and detailed instructions on how to start."
  },
  {
    question: "What happens if I enroll online but later want a traditional course?",
    answer: "We'll simply roll your registration and payment over to one of our regularly scheduled, traditional concealed carry courses. We also invite all students to join any of our courses after obtaining their NM CCL for free."
  },
  {
    question: "Is the entire course online?",
    answer: "No, while the majority is online, you'll still meet with an instructor to demonstrate handgun competency. Think of it this way: the classroom information is online, but you'll still receive hands-on handgun training in person."
  },
  {
    question: "What if I have questions during the online course?",
    answer: "Give us a call or text at (505) 944-5247. We're more than happy to chat and answer any questions you might have while taking the course."
  },
  {
    question: "I've never shot a gun before, should I take the online course?",
    answer: "Whether or not you've shot before, you'll receive the same quality, hands-on training. The online course introduces handgun knowledge, then reinforces it during the live-fire range day. First-time shooters often benefit most from our individualized training."
  }
];

export function OnlineConcealedCarryPage() {
  const [selectedCourse, setSelectedCourse] = useState<any>(null);
  const [showModal, setShowModal] = useState(false);

  const { data: courses } = useQuery({
    queryKey: ['/api/courses']
  });

  const handleCourseSelect = (course: any) => {
    setSelectedCourse(course);
    setShowModal(true);
  };

  const getOnlineCourse = () => {
    if (!courses || courses.length === 0) return null;
    
    // Look for online concealed carry course
    const onlineCourse = courses.find((course: any) => 
      course.name && 
      course.name.toLowerCase().includes('online') && 
      course.name.toLowerCase().includes('concealed')
    );
    
    // Fallback to any concealed carry course
    if (!onlineCourse) {
      const concealedCourse = courses.find((course: any) => 
        course.name && 
        course.name.toLowerCase().includes('concealed')
      );
      if (concealedCourse) return concealedCourse;
    }
    
    // Final fallback to first available course
    const firstCourse = courses.find((course: any) => course.name);
    return onlineCourse || firstCourse;
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Hero Section */}
      <section className="bg-primary text-primary-foreground py-12">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <Badge variant="secondary" className="mb-4 bg-accent text-accent-foreground">
              New Mexico Concealed Carry Course
            </Badge>
            
            <h1 className="text-2xl md:text-3xl font-medium mb-6" data-testid="text-hero-title">
              Online New Mexico Concealed Carry Course
            </h1>
            
            <div className="max-w-6xl mx-auto">
              <p className="text-base md:text-lg mb-8 leading-relaxed">
                New Mexico Concealed Carry Training On <strong>YOUR</strong> Schedule
              </p>
              
              <p className="text-sm md:text-base mb-8">
                Complete 8 hours online at your pace and place, and the remaining 7 hours at the range!
              </p>
              
              <div className="bg-primary-foreground/10 rounded-lg p-6 mb-8">
                <p className="text-base font-normal mb-2">
                  Concealed Carry training around <strong>your schedule</strong>, not the other way around. Complete required classroom instruction in your "office", on the plane, at work, in your pjs, and/or on your couch.
                </p>
                <p className="text-sm">
                  Start whenever and wherever you'd like. <strong>Whether it's 2 AM on your smartphone</strong>, or 6 PM stuck late at the office, begin taking our New Mexico ONLINE Concealed Carry Course wherever you have internet access.
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
            <h2 className="text-xl md:text-2xl font-medium mb-4">Online Course Benefits</h2>
            <p className="text-sm text-muted-foreground max-w-3xl mx-auto">
              Flexible, comprehensive training designed for your busy lifestyle
            </p>
          </div>

          <div className="grid md:grid-cols-4 gap-6 mb-12">
            {courseSpecs.map((spec, index) => (
              <Card key={index} className="text-center">
                <CardContent className="pt-6">
                  <spec.icon className="w-8 h-8 mx-auto mb-4 text-primary" />
                  <h3 className="font-medium mb-2">{spec.label}</h3>
                  <p className="text-lg font-semibold text-primary">{spec.value}</p>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Course Description */}
          <Card className="mb-12">
            <CardHeader>
              <CardTitle className="flex items-center text-lg">
                <Globe className="w-4 h-4 mr-3" />
                Online Course Overview
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm leading-relaxed">
                New Mexico requires concealed carry applicants to complete an approved firearms training course that is no less than 15 hours long. While this allows ample instruction time, it doesn't provide much student convenience.
              </p>
              <p className="text-sm leading-relaxed">
                Our <strong>ONLINE New Mexico Concealed Carry Course</strong> has been fully vetted and approved by the New Mexico Department of Public Safety. Complete up to 8 of the 15 required hours online, at your pace and place. Once you complete the online portion, we'll arrange a 7-hour live-fire range day that works with <strong>your</strong> schedule.
              </p>
              
              <Separator className="my-6" />
              
              <div className="grid md:grid-cols-2 gap-6">
                <div className="text-center p-4 bg-secondary/30 rounded-lg">
                  <div className="text-3xl font-bold text-primary mb-2">53%</div>
                  <p className="text-sm">Complete the majority of instruction online</p>
                </div>
                <div className="text-center p-4 bg-secondary/30 rounded-lg">
                  <div className="text-3xl font-bold text-primary mb-2">100%</div>
                  <p className="text-sm">Completed at your pace, around your schedule</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* What You'll Learn Section */}
      <section className="pt-8 pb-16 bg-secondary/30" id="curriculum">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-xl md:text-2xl font-medium mb-4">What You'll Learn</h2>
            <p className="text-sm text-muted-foreground max-w-3xl mx-auto">
              Comprehensive curriculum covering all aspects of concealed carry
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-6 mb-12">
            {courseFeatures.map((feature, index) => (
              <Card key={index} className="h-full">
                <CardContent className="pt-6">
                  <feature.icon className="w-6 h-6 mb-4 text-primary" />
                  <h3 className="font-medium mb-2 text-base">{feature.title}</h3>
                  <p className="text-sm text-muted-foreground">{feature.description}</p>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Call to Action */}
          <div className="text-center bg-primary text-primary-foreground rounded-lg p-8">
            <h2 className="text-xl md:text-2xl font-medium mb-6">
              You've Waited Long Enough - Enroll Today
            </h2>
            <p className="text-base mb-8 leading-relaxed">
              We now offer easy payment options for our New Mexico Online Concealed Carry Course!
            </p>
            
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button 
                size="lg" 
                variant="secondary"
                onClick={() => {
                  const course = getOnlineCourse();
                  if (course) handleCourseSelect(course);
                }}
                disabled={!getOnlineCourse()}
                data-testid="button-enroll-full"
                className="bg-accent text-accent-foreground hover:bg-accent/90"
              >
                Enroll Today - Pay in Full
              </Button>
              <Button 
                size="lg" 
                variant="outline"
                onClick={() => {
                  const course = getOnlineCourse();
                  if (course) handleCourseSelect(course);
                }}
                disabled={!getOnlineCourse()}
                data-testid="button-enroll-payments"
                className="border-primary-foreground text-primary-foreground hover:bg-primary-foreground hover:text-primary"
              >
                Easy Payments Option
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Student Testimonials */}
      <section className="py-16 bg-background">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-xl md:text-2xl font-medium mb-4">What Our Students Are Saying</h2>
            <p className="text-sm text-muted-foreground max-w-3xl mx-auto">
              Don't just take it from us, let our customers do the talking!
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {testimonials.map((testimonial, index) => (
              <Card key={index} className="h-full">
                <CardContent className="pt-6">
                  <Quote className="w-6 h-6 text-primary mb-4" />
                  <p className="text-sm italic mb-4">"{testimonial.text}"</p>
                  <div className="flex items-center">
                    <div className="flex text-yellow-400">
                      {[...Array(5)].map((_, i) => (
                        <Star key={i} className="w-4 h-4 fill-current" />
                      ))}
                    </div>
                    <span className="ml-2 font-medium text-sm">{testimonial.name}</span>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section className="py-16 bg-secondary/30">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-xl md:text-2xl font-medium mb-4">Frequently Asked Questions</h2>
          </div>

          <div className="space-y-4">
            {faqs.map((faq, index) => (
              <Card key={index}>
                <CardContent className="pt-6">
                  <h3 className="font-medium mb-3 text-base">{faq.question}</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">{faq.answer}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="py-16 bg-primary text-primary-foreground">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-xl md:text-2xl font-medium mb-6">
            You've Waited Long Enough, You're Ready.
          </h2>
          <p className="text-base mb-8 leading-relaxed">
            If you have been wanting to get your New Mexico Concealed Carry License, stop waiting to follow-through with it and join the many other students who have received the required training on their schedule, not the other way around.
          </p>
          
          <Button 
            size="lg" 
            variant="secondary"
            onClick={() => {
              const course = getOnlineCourse();
              if (course) handleCourseSelect(course);
            }}
            disabled={!getOnlineCourse()}
            data-testid="button-get-started"
            className="bg-accent text-accent-foreground hover:bg-accent/90"
          >
            Let's Get Started
          </Button>
        </div>
      </section>

      {/* Registration Modal */}
      {selectedCourse && (
        <RegistrationModal
          isOpen={showModal}
          onClose={() => {
            setShowModal(false);
            setSelectedCourse(null);
          }}
          course={selectedCourse}
        />
      )}
    </div>
  );
}