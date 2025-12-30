import { Layout } from "@/components/Layout";
import { SEO } from "@/components/SEO";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Clock, MapPin, Monitor, Target, Shield, Award, ArrowRight } from "lucide-react";
import { Link } from "wouter";
import { useQuery } from "@tanstack/react-query";
import type { CourseWithSchedules } from "@shared/schema";

interface FeaturedCourse {
  title: string;
  level: "Beginner" | "Intermediate" | "Advanced";
  description: string;
  duration: string;
  price: string;
  features: string[];
  href: string;
  icon: typeof Shield;
  isOnline?: boolean;
}

const featuredCourses: FeaturedCourse[] = [
  {
    title: "NM Concealed Carry Course",
    level: "Beginner",
    description: "Our flagship in-person course covering all New Mexico CCL requirements including classroom instruction and live-fire qualification.",
    duration: "8+ Hours",
    price: "$165",
    features: [
      "State-approved curriculum",
      "Live-fire qualification",
      "Certificate of completion",
      "Lifetime free retraining"
    ],
    href: "/nmccl",
    icon: Shield
  },
  {
    title: "Online NM Concealed Carry Course",
    level: "Beginner",
    description: "Complete the classroom portion online at your own pace, then join us for a 2-hour live-fire qualification session.",
    duration: "Self-paced + 2hr Range",
    price: "$165",
    features: [
      "Learn at your own pace",
      "Mobile-friendly content",
      "In-person qualification",
      "Certificate of completion"
    ],
    href: "/online-nm-concealed-carry-course",
    icon: Monitor,
    isOnline: true
  },
  {
    title: "Defensive Handgun Course",
    level: "Intermediate",
    description: "Take your skills beyond the basics with advanced defensive shooting techniques, tactical movement, and real-world scenario training.",
    duration: "4+ Hours",
    price: "$175",
    features: [
      "Advanced shooting drills",
      "Tactical movement",
      "Scenario-based training",
      "Skill assessment"
    ],
    href: "/defensive-handgun-course",
    icon: Target
  }
];

const levelColors = {
  Beginner: "bg-green-600",
  Intermediate: "bg-amber-600",
  Advanced: "bg-red-600"
};

export default function Courses() {
  const { data: coursesData } = useQuery<CourseWithSchedules[]>({
    queryKey: ['/api/courses'],
  });

  const activeCourses = coursesData?.filter((c: CourseWithSchedules) => c.isActive && !c.deletedAt) || [];

  return (
    <Layout>
      <SEO 
        title="Training Courses | Practical Defense Training"
        description="Browse our comprehensive firearms training courses including NM Concealed Carry, Online CCW, and Defensive Handgun courses. Professional instruction for all skill levels."
      />
      
      <div className="relative bg-zinc-900 text-white py-20 border-b border-zinc-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h1 className="text-4xl md:text-5xl font-bold font-display uppercase tracking-widest mb-4" data-testid="text-courses-title">
            Training Courses
          </h1>
          <p className="text-xl text-zinc-300 max-w-3xl" data-testid="text-courses-subtitle">
            From first-time shooters to experienced carriers, we offer professional firearms training tailored to your skill level and goals.
          </p>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="mb-12">
          <h2 className="text-2xl font-display uppercase tracking-widest text-foreground mb-2" data-testid="text-featured-heading">
            Featured Courses
          </h2>
          <p className="text-muted-foreground">Our most popular training programs</p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8 mb-16">
          {featuredCourses.map((course) => {
            const Icon = course.icon;
            return (
              <Card 
                key={course.href} 
                className="overflow-hidden hover:shadow-xl transition-all duration-300 flex flex-col border-2 hover:border-[#006d7a]/50"
                data-testid={`card-course-${course.href.slice(1)}`}
              >
                <div className="bg-gradient-to-br from-[#004149] to-[#006d7a] p-6 text-white">
                  <div className="flex items-start justify-between mb-4">
                    <Icon className="h-10 w-10" />
                    <Badge className={`${levelColors[course.level]} text-white`}>
                      {course.level}
                    </Badge>
                  </div>
                  <CardTitle className="text-xl font-display uppercase tracking-wider mb-2">
                    {course.title}
                  </CardTitle>
                  {course.isOnline && (
                    <Badge variant="outline" className="border-white/50 text-white text-xs">
                      Online Available
                    </Badge>
                  )}
                </div>
                <CardContent className="flex-1 flex flex-col p-6">
                  <p className="text-muted-foreground mb-4 flex-1">
                    {course.description}
                  </p>
                  
                  <div className="flex items-center gap-4 text-sm text-muted-foreground mb-4">
                    <div className="flex items-center gap-1">
                      <Clock className="h-4 w-4" />
                      <span>{course.duration}</span>
                    </div>
                    <div className="font-semibold text-foreground">
                      {course.price}
                    </div>
                  </div>

                  <ul className="space-y-2 mb-6">
                    {course.features.map((feature, idx) => (
                      <li key={idx} className="flex items-center gap-2 text-sm">
                        <Award className="h-4 w-4 text-[#006d7a]" />
                        <span>{feature}</span>
                      </li>
                    ))}
                  </ul>

                  <Button asChild className="w-full bg-[#006d7a] hover:bg-[#005a66] group">
                    <Link href={course.href}>
                      Learn More
                      <ArrowRight className="h-4 w-4 ml-2 group-hover:translate-x-1 transition-transform" />
                    </Link>
                  </Button>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {activeCourses.length > 0 && (
          <>
            <div className="mb-12">
              <h2 className="text-2xl font-display uppercase tracking-widest text-foreground mb-2" data-testid="text-additional-heading">
                Additional Training
              </h2>
              <p className="text-muted-foreground">Specialized courses and clinics</p>
            </div>

            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {activeCourses.map((course) => (
                <Card 
                  key={course.id} 
                  className="overflow-hidden hover:shadow-lg transition-shadow duration-300"
                  data-testid={`card-additional-course-${course.id}`}
                >
                  <CardHeader className="pb-2">
                    <CardTitle className="text-lg font-display uppercase tracking-wider">
                      {course.title}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {course.description && (
                      <p className="text-muted-foreground text-sm mb-4 line-clamp-3">
                        {course.description}
                      </p>
                    )}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Clock className="h-4 w-4" />
                        <span>{course.duration}</span>
                      </div>
                      {course.price && (
                        <span className="font-semibold text-foreground">
                          ${course.price}
                        </span>
                      )}
                    </div>
                    <Button asChild variant="outline" className="w-full mt-4">
                      <Link href={`/course/${course.id}`}>
                        View Details
                      </Link>
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          </>
        )}

        <div className="mt-16 bg-zinc-100 dark:bg-zinc-800 rounded-lg p-8 text-center">
          <h3 className="text-xl font-display uppercase tracking-widest mb-4" data-testid="text-cta-heading">
            Ready to Start Training?
          </h3>
          <p className="text-muted-foreground mb-6 max-w-2xl mx-auto">
            Check our schedule for upcoming classes or contact us to discuss private instruction options.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button asChild size="lg" className="bg-[#006d7a] hover:bg-[#005a66]">
              <Link href="/schedule-list" data-testid="button-view-schedule">
                View Upcoming Classes
              </Link>
            </Button>
            <Button asChild variant="outline" size="lg">
              <Link href="/contact" data-testid="button-contact-us">
                Contact Us
              </Link>
            </Button>
          </div>
        </div>
      </div>
    </Layout>
  );
}
