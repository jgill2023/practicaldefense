import { Layout } from "@/components/Layout";
import { SEO } from "@/components/SEO";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Link } from "wouter";
import {
  Shield,
  Target,
  Monitor,
  GraduationCap,
  Clock,
  DollarSign,
  ChevronRight,
  Crosshair,
  Users,
} from "lucide-react";

const courseCategories = [
  {
    title: "Concealed Carry",
    description: "Get your New Mexico Concealed Carry License with our NM DPS-approved training courses.",
    courses: [
      {
        title: "New Mexico Concealed Carry Course",
        description: "2-day in-person course with classroom instruction and live-fire range qualification. The complete NM CCL training experience.",
        price: "$165",
        duration: "2 Days (Weekend)",
        level: "Beginner",
        link: "/nmccl",
        icon: Shield,
      },
      {
        title: "Online NM Concealed Carry Course",
        description: "Complete 8 hours of classroom material online at your own pace, then attend a 7-hour live-fire range session. NM DPS approved.",
        price: "$165",
        duration: "Self-Paced + Range Day",
        level: "Beginner",
        link: "/online-nm-concealed-carry-course",
        icon: Monitor,
      },
    ],
  },
  {
    title: "Defensive Training",
    description: "Advanced courses for those who want to go beyond basic concealed carry and develop real defensive skills.",
    courses: [
      {
        title: "Defensive Handgun Course",
        description: "Intensive 1 or 2-day course focusing on defensive shooting fundamentals: drawing from concealment, threat recognition, tactical reloads, and more.",
        price: "$155 / $250",
        duration: "1 or 2 Days",
        level: "Intermediate",
        link: "/defensive-handgun-course",
        icon: Target,
      },
      {
        title: "Defensive Handgun Clinics",
        description: "Focused 2-4 hour sessions targeting specific defensive shooting skills. Small class sizes of 2-5 students per instructor.",
        price: "$56 - $65",
        duration: "2-4 Hours",
        level: "Intermediate",
        link: "/defensive-handgun-clinics",
        icon: Crosshair,
      },
    ],
  },
  {
    title: "Specialty Training",
    description: "Specialized programs tailored to unique training needs and goals.",
    courses: [
      {
        title: "RACC Program",
        description: "The Responsibly Armed Citizen Criterion — an 8-phase structured training program with pressure-tested benchmarks for individuals, couples, and families.",
        price: "Varies",
        duration: "Multi-Phase",
        level: "All Levels",
        link: "/racc-program",
        icon: GraduationCap,
      },
      {
        title: "Onscreen Handgun Handling",
        description: "Firearms training for actors and film professionals. Learn safe, authentic weapons handling for on-screen performances.",
        price: "$85",
        duration: "4 Hours",
        level: "Beginner",
        link: "/onscreen-handgun-handling",
        icon: Monitor,
      },
      {
        title: "Private Training Sessions",
        description: "One-on-one instruction tailored to your specific goals and skill level. Flexible scheduling on your timeline.",
        price: "Contact Us",
        duration: "Flexible",
        level: "All Levels",
        link: "/contact",
        icon: Users,
      },
    ],
  },
];

function getLevelColor(level: string) {
  switch (level) {
    case "Beginner":
      return "bg-green-500/10 text-green-400 border-green-500/20";
    case "Intermediate":
      return "bg-yellow-500/10 text-yellow-400 border-yellow-500/20";
    case "Advanced":
      return "bg-red-500/10 text-red-400 border-red-500/20";
    default:
      return "bg-[#006d7a]/10 text-[#006d7a] border-[#006d7a]/20";
  }
}

export default function CoursesOverview() {
  return (
    <Layout>
      <SEO
        title="Training Courses | Practical Defense Training"
        description="Browse our comprehensive firearms training courses. From NM concealed carry to advanced defensive handgun, find the right course for your skill level."
      />

      {/* Hero */}
      <section className="relative bg-zinc-950 py-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto text-center">
          <h1 className="font-heading text-5xl sm:text-6xl uppercase tracking-widest text-white mb-6">
            Training Courses
          </h1>
          <p className="text-xl text-zinc-400 max-w-3xl mx-auto leading-relaxed">
            Safe. Fun. Practical. From getting your New Mexico Concealed Carry License to advanced
            defensive shooting, we have the right training for your goals.
          </p>
          <div className="mt-8 flex flex-wrap justify-center gap-4">
            <Link href="/schedule-list">
              <Button size="lg" className="bg-[#006d7a] hover:bg-[#005a66] text-white">
                View Schedule
                <ChevronRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>
            <Link href="/contact">
              <Button size="lg" variant="outline" className="border-zinc-700 text-zinc-300 hover:bg-zinc-800">
                Contact Us
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Course Categories */}
      <section className="py-16 px-4 sm:px-6 lg:px-8 bg-background">
        <div className="max-w-7xl mx-auto space-y-16">
          {courseCategories.map((category) => (
            <div key={category.title}>
              <div className="mb-8">
                <h2 className="font-heading text-3xl uppercase tracking-widest text-foreground mb-2">
                  {category.title}
                </h2>
                <p className="text-muted-foreground text-lg">{category.description}</p>
              </div>

              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                {category.courses.map((course) => {
                  const Icon = course.icon;
                  return (
                    <Link key={course.title} href={course.link}>
                      <Card className="h-full border-border hover:border-[#006d7a]/50 transition-all duration-300 hover:shadow-lg hover:shadow-[#006d7a]/5 cursor-pointer group">
                        <CardContent className="p-6 flex flex-col h-full">
                          <div className="flex items-start justify-between mb-4">
                            <div className="p-2 rounded-lg bg-[#006d7a]/10">
                              <Icon className="h-6 w-6 text-[#006d7a]" />
                            </div>
                            <Badge variant="outline" className={getLevelColor(course.level)}>
                              {course.level}
                            </Badge>
                          </div>

                          <h3 className="text-lg font-semibold text-foreground mb-2 group-hover:text-[#006d7a] transition-colors">
                            {course.title}
                          </h3>

                          <p className="text-muted-foreground text-sm leading-relaxed flex-grow mb-4">
                            {course.description}
                          </p>

                          <div className="flex items-center gap-4 text-sm text-muted-foreground border-t border-border pt-4">
                            <span className="flex items-center gap-1">
                              <DollarSign className="h-3.5 w-3.5" />
                              {course.price}
                            </span>
                            <span className="flex items-center gap-1">
                              <Clock className="h-3.5 w-3.5" />
                              {course.duration}
                            </span>
                          </div>
                        </CardContent>
                      </Card>
                    </Link>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="bg-zinc-950 py-16 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="font-heading text-3xl uppercase tracking-widest text-white mb-4">
            Not Sure Where to Start?
          </h2>
          <p className="text-zinc-400 text-lg mb-8">
            If you're new to firearms or just getting your concealed carry license, our NM Concealed Carry Course
            is the perfect starting point. Already have your CCL? Level up with our Defensive Handgun training.
          </p>
          <div className="flex flex-wrap justify-center gap-4">
            <Link href="/ccw-quiz">
              <Button size="lg" className="bg-[#006d7a] hover:bg-[#005a66] text-white">
                Take the CCW Quiz
              </Button>
            </Link>
            <Link href="/contact">
              <Button size="lg" variant="outline" className="border-zinc-700 text-zinc-300 hover:bg-zinc-800">
                Ask Us a Question
              </Button>
            </Link>
          </div>
        </div>
      </section>
    </Layout>
  );
}
