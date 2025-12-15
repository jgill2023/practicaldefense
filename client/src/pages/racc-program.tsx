import { Layout } from "@/components/Layout";
import { ComicPanel, TitleCard, HeroSection, FeatureCard } from "@/components/RACTheme";
import { Award, Target, Clock, Users, Shield, BookOpen, TrendingUp, Calendar, CheckCircle, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useLocation } from "wouter";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Badge } from "@/components/ui/badge";

export default function RACCProgram() {
  const [, setLocation] = useLocation();

  return (
    <Layout>
      <HeroSection
        title="Responsibly Armed Citizen Criterion"
        subtitle="Your personal development path to concealed carry excellence"
        overlay={true}
      >
        <Button
          size="lg"
          className="bg-white text-[hsl(209,90%,38%)] hover:bg-white/90 font-heading uppercase tracking-wide"
          onClick={() => setLocation('/schedule-list')}
        >
          View Schedule & Register
        </Button>
      </HeroSection>
      {/* Program Overview */}
      <section className="py-16 bg-background">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <TitleCard as="h2" className="text-4xl mb-4">
              4-Phase Belt-Style Progression System
            </TitleCard>
            <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
              Private 1-on-1 sessions with flexible scheduling. Develop your concealed carry skills
              through a structured, personalized curriculum designed for real-world application.
            </p>
          </div>

          {/* Program Highlights */}
          <div className="grid md:grid-cols-3 gap-6 mb-16">
            <FeatureCard
              icon={<Users className="w-6 h-6" />}
              title="Private Training"
              description="One-on-one instruction tailored to your skill level and goals"
            />
            <FeatureCard
              icon={<Clock className="w-6 h-6" />}
              title="Flexible Scheduling"
              description="Book sessions at times that work for your schedule"
            />
            <FeatureCard
              icon={<Award className="w-6 h-6" />}
              title="Belt Progression"
              description="Advance through four phases with clear milestones and achievements"
            />
          </div>

          {/* Belt Phases */}
          <div className="space-y-8">
            <TitleCard as="h2" className="text-3xl text-center mb-8">
              Progression Phases
            </TitleCard>

            {/* White Belt */}
            <ComicPanel shadow="lg" className="hover-lift">
              <div className="flex items-start gap-4">
                <div className="flex-shrink-0 w-16 h-16 rounded-full bg-gray-100 border-4 border-gray-300 flex items-center justify-center">
                  <span className="font-heading text-2xl text-gray-600">1</span>
                </div>
                <div className="flex-1">
                  <h3 className="font-heading text-2xl uppercase tracking-wide text-foreground mb-3">
                    White Belt - Fundamentals
                  </h3>
                  <p className="text-muted-foreground mb-4">
                    Master the essential foundations of safe and effective concealed carry.
                    Focus on safety protocols, basic marksmanship, and understanding your equipment.
                  </p>
                  <div className="grid sm:grid-cols-2 gap-3">
                    <div className="flex items-start gap-2">
                      <CheckCircle className="w-5 h-5 text-[hsl(209,90%,38%)] flex-shrink-0 mt-0.5" />
                      <span className="text-sm">Firearm safety & handling</span>
                    </div>
                    <div className="flex items-start gap-2">
                      <CheckCircle className="w-5 h-5 text-[hsl(209,90%,38%)] flex-shrink-0 mt-0.5" />
                      <span className="text-sm">Grip & stance fundamentals</span>
                    </div>
                    <div className="flex items-start gap-2">
                      <CheckCircle className="w-5 h-5 text-[hsl(209,90%,38%)] flex-shrink-0 mt-0.5" />
                      <span className="text-sm">Trigger control & sight alignment</span>
                    </div>
                    <div className="flex items-start gap-2">
                      <CheckCircle className="w-5 h-5 text-[hsl(209,90%,38%)] flex-shrink-0 mt-0.5" />
                      <span className="text-sm">Basic draw & presentation</span>
                    </div>
                  </div>
                </div>
              </div>
            </ComicPanel>

            {/* Yellow Belt */}
            <ComicPanel shadow="lg" className="hover-lift">
              <div className="flex items-start gap-4">
                <div className="flex-shrink-0 w-16 h-16 rounded-full bg-yellow-100 border-4 border-yellow-400 flex items-center justify-center">
                  <span className="font-heading text-2xl text-yellow-600">2</span>
                </div>
                <div className="flex-1">
                  <h3 className="font-heading text-2xl uppercase tracking-wide text-foreground mb-3">
                    Yellow Belt - Skill Development
                  </h3>
                  <p className="text-muted-foreground mb-4">
                    Build speed and accuracy while maintaining safety. Develop muscle memory
                    and consistency in your shooting fundamentals.
                  </p>
                  <div className="grid sm:grid-cols-2 gap-3">
                    <div className="flex items-start gap-2">
                      <CheckCircle className="w-5 h-5 text-[hsl(209,90%,38%)] flex-shrink-0 mt-0.5" />
                      <span className="text-sm">Speed development drills</span>
                    </div>
                    <div className="flex items-start gap-2">
                      <CheckCircle className="w-5 h-5 text-[hsl(209,90%,38%)] flex-shrink-0 mt-0.5" />
                      <span className="text-sm">Multiple target engagement</span>
                    </div>
                    <div className="flex items-start gap-2">
                      <CheckCircle className="w-5 h-5 text-[hsl(209,90%,38%)] flex-shrink-0 mt-0.5" />
                      <span className="text-sm">Reloading techniques</span>
                    </div>
                    <div className="flex items-start gap-2">
                      <CheckCircle className="w-5 h-5 text-[hsl(209,90%,38%)] flex-shrink-0 mt-0.5" />
                      <span className="text-sm">Malfunction clearance</span>
                    </div>
                  </div>
                </div>
              </div>
            </ComicPanel>

            {/* Orange Belt */}
            <ComicPanel shadow="lg" className="hover-lift">
              <div className="flex items-start gap-4">
                <div className="flex-shrink-0 w-16 h-16 rounded-full bg-orange-100 border-4 border-orange-400 flex items-center justify-center">
                  <span className="font-heading text-2xl text-orange-600">3</span>
                </div>
                <div className="flex-1">
                  <h3 className="font-heading text-2xl uppercase tracking-wide text-foreground mb-3">
                    Orange Belt - Advanced Techniques
                  </h3>
                  <p className="text-muted-foreground mb-4">
                    Incorporate movement, shooting from cover, and scenario-based training.
                    Apply your skills in realistic defensive situations.
                  </p>
                  <div className="grid sm:grid-cols-2 gap-3">
                    <div className="flex items-start gap-2">
                      <CheckCircle className="w-5 h-5 text-[hsl(209,90%,38%)] flex-shrink-0 mt-0.5" />
                      <span className="text-sm">Shooting while moving</span>
                    </div>
                    <div className="flex items-start gap-2">
                      <CheckCircle className="w-5 h-5 text-[hsl(209,90%,38%)] flex-shrink-0 mt-0.5" />
                      <span className="text-sm">Use of cover & concealment</span>
                    </div>
                    <div className="flex items-start gap-2">
                      <CheckCircle className="w-5 h-5 text-[hsl(209,90%,38%)] flex-shrink-0 mt-0.5" />
                      <span className="text-sm">Low-light shooting</span>
                    </div>
                    <div className="flex items-start gap-2">
                      <CheckCircle className="w-5 h-5 text-[hsl(209,90%,38%)] flex-shrink-0 mt-0.5" />
                      <span className="text-sm">Scenario-based training</span>
                    </div>
                  </div>
                </div>
              </div>
            </ComicPanel>

            {/* Green Belt */}
            <ComicPanel shadow="lg" className="hover-lift">
              <div className="flex items-start gap-4">
                <div className="flex-shrink-0 w-16 h-16 rounded-full bg-green-100 border-4 border-green-500 flex items-center justify-center">
                  <span className="font-heading text-2xl text-green-600">4</span>
                </div>
                <div className="flex-1">
                  <h3 className="font-heading text-2xl uppercase tracking-wide text-foreground mb-3">
                    Green Belt - Mastery & Maintenance
                  </h3>
                  <p className="text-muted-foreground mb-4">
                    Achieve consistent performance under stress. Maintain and refine your skills
                    through advanced drills and continued practice.
                  </p>
                  <div className="grid sm:grid-cols-2 gap-3">
                    <div className="flex items-start gap-2">
                      <CheckCircle className="w-5 h-5 text-[hsl(209,90%,38%)] flex-shrink-0 mt-0.5" />
                      <span className="text-sm">Performance under stress</span>
                    </div>
                    <div className="flex items-start gap-2">
                      <CheckCircle className="w-5 h-5 text-[hsl(209,90%,38%)] flex-shrink-0 mt-0.5" />
                      <span className="text-sm">Advanced decision-making</span>
                    </div>
                    <div className="flex items-start gap-2">
                      <CheckCircle className="w-5 h-5 text-[hsl(209,90%,38%)] flex-shrink-0 mt-0.5" />
                      <span className="text-sm">Skill maintenance protocols</span>
                    </div>
                    <div className="flex items-start gap-2">
                      <CheckCircle className="w-5 h-5 text-[hsl(209,90%,38%)] flex-shrink-0 mt-0.5" />
                      <span className="text-sm">Instructor mentorship options</span>
                    </div>
                  </div>
                </div>
              </div>
            </ComicPanel>
          </div>

          {/* Program Benefits */}
          <div className="mt-16">
            <TitleCard as="h2" className="text-3xl text-center mb-8">
              Why Choose RACC?
            </TitleCard>
            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
              <Card>
                <CardHeader>
                  <Target className="w-12 h-12 text-[hsl(209,90%,38%)] mb-2" />
                  <CardTitle>Personalized Approach</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground text-sm">
                    Training tailored to your specific needs, experience level, and goals
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <TrendingUp className="w-12 h-12 text-[hsl(209,90%,38%)] mb-2" />
                  <CardTitle>Clear Progression</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground text-sm">
                    Know exactly where you are and what's next in your training journey
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <Shield className="w-12 h-12 text-[hsl(209,90%,38%)] mb-2" />
                  <CardTitle>Real-World Focus</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground text-sm">
                    Training scenarios designed for actual defensive situations
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <Calendar className="w-12 h-12 text-[hsl(209,90%,38%)] mb-2" />
                  <CardTitle>Flexible Scheduling</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground text-sm">
                    Book sessions at your convenience with easy online scheduling
                  </p>
                </CardContent>
              </Card>
            </div>
          </div>

          {/* CTA Section */}
          <div className="mt-16">
            <ComicPanel shadow="lg" variant="accent" className="text-center">
              <div className="py-8">
                <h3 className="font-heading text-3xl uppercase tracking-wide text-white mb-4">
                  Ready to Start Your Journey?
                </h3>
                <p className="text-white/90 text-lg mb-6 max-w-2xl mx-auto">
                  Begin your progression through the Responsibly Armed Citizen Criterion program today.
                  Schedule your first private session and take the first step toward concealed carry mastery.
                </p>
                <div className="flex flex-col sm:flex-row gap-4 justify-center">
                  <Button
                    size="lg"
                    className="bg-white text-[hsl(209,90%,38%)] hover:bg-white/90 font-heading uppercase tracking-wide"
                    onClick={() => setLocation('/schedule-list')}
                  >
                    <Calendar className="w-5 h-5 mr-2" />
                    View Schedule
                  </Button>
                  <Button
                    size="lg"
                    variant="outline"
                    className="bg-transparent border-white text-white hover:bg-white/10 font-heading uppercase tracking-wide"
                    onClick={() => setLocation('/contact')}
                  >
                    Contact Us
                  </Button>
                </div>
              </div>
            </ComicPanel>
          </div>
        </div>
      </section>
      {/* FAQ Section */}
      <section className="py-16 bg-gray-50">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <TitleCard as="h2" variant="accent" className="text-3xl lg:text-4xl mb-4">
              Frequently Asked Questions
            </TitleCard>
            <p className="text-muted-foreground">
              Quick answers to get you started
            </p>
          </div>

          <Accordion type="single" collapsible className="space-y-4">
            <AccordionItem value="faq-1" className="bg-white rounded-lg shadow-sm border-0 overflow-hidden">
              <AccordionTrigger className="px-6 py-4 hover:no-underline hover:bg-gray-50">
                <span className="font-heading text-lg uppercase tracking-wide text-left">
                  What is RACC?
                </span>
              </AccordionTrigger>
              <AccordionContent className="px-6 pb-4">
                <p className="text-muted-foreground leading-relaxed pt-[12px] pb-[12px]">
                  The Responsibly Armed Citizen Criterion is Apache Solutions' 4-phase, belt-style progression system for civilian concealed carry—starting with safety & marksmanship and advancing to refined control & real-world competency. Every skill is pressure-tested with live-fire benchmarks, a written exam, and competency checks.
                </p>
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="faq-2" className="bg-white rounded-lg shadow-sm border-0 overflow-hidden">
              <AccordionTrigger className="px-6 py-4 hover:no-underline hover:bg-gray-50">
                <span className="font-heading text-lg uppercase tracking-wide text-left">
                  How long does it take to complete?
                </span>
              </AccordionTrigger>
              <AccordionContent className="px-6 pb-4">
                <p className="text-muted-foreground leading-relaxed">
                  No set timeline—you advance when you're ready. The full RACC program typically takes 12–24 months, depending on your schedule and goals. It is not designed to be something that someone can just walk in and complete. The real benefit is in the process. So, come into this with a process focus, and the results will come.
                </p>
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="faq-3" className="bg-white rounded-lg shadow-sm border-0 overflow-hidden">
              <AccordionTrigger className="px-6 py-4 hover:no-underline hover:bg-gray-50">
                <span className="font-heading text-lg uppercase tracking-wide text-left">
                  Do I need prior experience?
                </span>
              </AccordionTrigger>
              <AccordionContent className="px-6 pb-4">
                <p className="text-muted-foreground leading-relaxed">
                  No. You don't even need any gear! Sometimes, we prefer it that way. RACC starts at zero. Whether you've never held a gun or you're a seasoned carrier, your trainer meets you exactly where you are.
                </p>
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="faq-4" className="bg-white rounded-lg shadow-sm border-0 overflow-hidden">
              <AccordionTrigger className="px-6 py-4 hover:no-underline hover:bg-gray-50">
                <span className="font-heading text-lg uppercase tracking-wide text-left">
                  What do I need for the first session?
                </span>
              </AccordionTrigger>
              <AccordionContent className="px-6 pb-4">
                <p className="text-muted-foreground leading-relaxed">
                  A valid ID, a legal guardian must be present (if under 18), and a positive attitude!
                </p>
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="faq-5" className="bg-white rounded-lg shadow-sm border-0 overflow-hidden">
              <AccordionTrigger className="px-6 py-4 hover:no-underline hover:bg-gray-50">
                <span className="font-heading text-lg uppercase tracking-wide text-left">
                  How much does it cost?
                </span>
              </AccordionTrigger>
              <AccordionContent className="px-6 pb-4">
                <p className="text-muted-foreground leading-relaxed">
                  Private sessions are $60/hour or $100/2-hours for the first 10 sessions. Rate drops to $50/$90 after your first 10 sessions. Pay per session—or take advantage of our end-of-the-year deals for a significant discount.
                </p>
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="faq-6" className="bg-white rounded-lg shadow-sm border-0 overflow-hidden">
              <AccordionTrigger className="px-6 py-4 hover:no-underline hover:bg-gray-50">
                <span className="font-heading text-lg uppercase tracking-wide text-left">
                  Can I use my own gun and holster?
                </span>
              </AccordionTrigger>
              <AccordionContent className="px-6 pb-4">
                <p className="text-muted-foreground leading-relaxed">
                  Yes—bring what you carry. We'll assess fit, safety, and function. If you don't have gear yet, please do not rush out and buy things; we'll guide you through the process.
                </p>
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="faq-7" className="bg-white rounded-lg shadow-sm border-0 overflow-hidden">
              <AccordionTrigger className="px-6 py-4 hover:no-underline hover:bg-gray-50">
                <span className="font-heading text-lg uppercase tracking-wide text-left">
                  Is this just for concealed carry permits?
                </span>
              </AccordionTrigger>
              <AccordionContent className="px-6 pb-4">
                <p className="text-muted-foreground leading-relaxed">
                  No. This is not a "concealed carry permit" class. RACC goes beyond permit classes. It builds lifelong proficiency, not just a certificate. (Permit training can be added if needed.)
                </p>
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="faq-8" className="bg-white rounded-lg shadow-sm border-0 overflow-hidden">
              <AccordionTrigger className="px-6 py-4 hover:no-underline hover:bg-gray-50">
                <span className="font-heading text-lg uppercase tracking-wide text-left">
                  What if I miss a week or two?
                </span>
              </AccordionTrigger>
              <AccordionContent className="px-6 pb-4">
                <p className="text-muted-foreground leading-relaxed">
                  No problem! Sessions are 100% flexible—book when it works for you. Progress is tracked per phase, not calendar. We do ask students to retest on the previous phase if they have been absent for longer than 90 days.
                </p>
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="faq-9" className="bg-white rounded-lg shadow-sm border-0 overflow-hidden">
              <AccordionTrigger className="px-6 py-4 hover:no-underline hover:bg-gray-50">
                <span className="font-heading text-lg uppercase tracking-wide text-left">
                  Will I shoot on day one?
                </span>
              </AccordionTrigger>
              <AccordionContent className="px-6 pb-4">
                <p className="text-muted-foreground leading-relaxed">
                  Only if you're ready. Phase 1 begins with safety, handling, and dry practice—live fire training comes after both you and your trainer feel that you are ready.
                </p>
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="faq-10" className="bg-white rounded-lg shadow-sm border-0 overflow-hidden">
              <AccordionTrigger className="px-6 py-4 hover:no-underline hover:bg-gray-50">
                <span className="font-heading text-lg uppercase tracking-wide text-left">
                  How do I know I'm improving?
                </span>
              </AccordionTrigger>
              <AccordionContent className="px-6 pb-4">
                <p className="text-muted-foreground leading-relaxed mb-3">
                  Every phase ends with objective benchmarks:
                </p>
                <ul className="space-y-2 text-muted-foreground ml-4">
                  <li className="flex items-start gap-2">
                    <Check className="w-5 h-5 text-[hsl(209,90%,38%)] flex-shrink-0 mt-0.5" />
                    <span>Apache B-8 scores</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <Check className="w-5 h-5 text-[hsl(209,90%,38%)] flex-shrink-0 mt-0.5" />
                    <span>Timed drills</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <Check className="w-5 h-5 text-[hsl(209,90%,38%)] flex-shrink-0 mt-0.5" />
                    <span>Skill demos (reloads, malfunctions, one-hand shooting)</span>
                  </li>
                </ul>
                <p className="text-muted-foreground mt-3">
                  You'll see data-driven proof of progress.
                </p>
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        </div>
      </section>
    </Layout>
  );
}