import { useState } from "react";
import { Layout } from "@/components/Layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Award, Target, TrendingUp, BookOpen, CalendarClock, Clock } from "lucide-react";
import aboutHeaderImage from "@assets/AboutHeader_1762855149831.jpg";
import aboutQuoteImage from "@assets/About2_1762856231913.jpg";
import { AppointmentsModal } from "@/components/AppointmentsModal";

export default function AboutChris() {
  const [isAppointmentsModalOpen, setIsAppointmentsModalOpen] = useState(false);
  
  const stats = [
    { value: "25,000+", label: "Hrs of Training Received", icon: BookOpen },
    { value: "500+", label: "Students Coached", icon: Target },
    { value: "68,000+", label: "Rounds Fired", icon: Award },
    { value: "25,000+", label: "Hrs of Continuing Education", icon: TrendingUp },
  ];

  return (
    <Layout>
      {/* Hero Section */}
      <section className="relative py-20" style={{
        backgroundImage: `url(${aboutHeaderImage})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundRepeat: 'no-repeat'
      }}>
        {/* Black overlay */}
        <div className="absolute inset-0" style={{ backgroundColor: 'rgba(0, 0, 0, 0.65)' }}></div>

        {/* Content */}
        <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center pl-[0px] pr-[0px] mt-[40px] mb-[40px] pt-[20px] pb-[20px]">
            <h1 className="lg:text-5xl text-white mb-6 font-semibold text-[42px]">ABOUT CHRIS</h1>
            <p className="text-white/90 max-w-3xl mx-auto mb-8 text-[22px]">
              Christopher, Co-Director of Active Self Protection, excels in firearms training, 
              corporate leadership, and curriculum development.
            </p>
          </div>
        </div>
      </section>
      {/* I'm Christopher Bean Section */}
      <section className="py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold text-center mb-12">I'M CHRISTOPHER BEAN</h2>
          
          <div className="grid md:grid-cols-2 gap-8 items-start">
            {/* Left Column - Text Content */}
            <div className="space-y-4 text-muted-foreground">
              <p>
                As Co-Director of the Active Self Protection Instructor Certification program, I am a 
                dedicated and proven firearms instructor committed to delivering quantifiable and repeatable 
                results. My strong drive to help others achieve exceptional performance in the firearms 
                training space is complemented by a diverse background in corporate leadership and adult education.
              </p>
              <p>
                I specialize in curriculum development with a deep understanding of the psychology of human 
                performance. As a sought-after mentor, I have guided many top-tier motivators and accomplished 
                professionals across various fields to reach their highest potential.
              </p>
            </div>

            {/* Right Column - 2x2 Stats Grid */}
            <div className="grid grid-cols-2 gap-4">
              {stats.slice(0, 4).map((stat, index) => {
                const borderColors = ['border-cyan-500', 'border-blue-500', 'border-blue-600', 'border-orange-500'];
                return (
                  <div key={index} className={`border-l-4 ${borderColors[index]} pl-4 py-4 bg-card rounded-r`}>
                    <div className="text-3xl font-bold text-foreground mb-1">
                      {stat.value}
                    </div>
                    <div className="text-sm text-muted-foreground">
                      {stat.label}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </section>
      {/* Quote Section */}
      <section className="relative min-h-[400px] lg:min-h-[500px] flex items-center" style={{
        backgroundImage: `url(${aboutQuoteImage})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundRepeat: 'no-repeat'
      }}>
        {/* Black overlay */}
        <div className="absolute inset-0" style={{ backgroundColor: 'rgba(0, 0, 0, 0.5)' }}></div>

        {/* Content Container */}
        <div className="relative z-10 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 bg-[#05000000]">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Left Column - Empty */}
            <div></div>
            
            {/* Right Column - Text Overlay Box */}
            <div className="flex items-center justify-center lg:justify-start ml-[0px] mr-[0px] pl-[0px] pr-[0px] pt-[100px] pb-[100px]">
              <div className="p-8 lg:p-12 max-w-2xl w-full pl-[0px] pr-[0px] pt-[0px] pb-[0px]">
                <blockquote className="text-2xl md:text-3xl lg:text-4xl xl:text-5xl font-medium text-[#ffffff] text-right" style={{ fontFamily: 'Montserrat, sans-serif' }}>
                  "I love coaching and teaching others in the art of firearms because it empowers them 
                  with skills and confidence for self-protection."
                </blockquote>
              </div>
            </div>
          </div>
        </div>
      </section>
      {/* Skills and Certifications Section */}
      <section className="py-16 bg-muted/30 pt-[80px] pb-[80px]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl lg:text-4xl font-bold text-center mb-12">
            Skills, Qualifications, and Certifications
          </h2>

          <div className="space-y-8">
            {/* Instructor-Level Certifications - Full Width */}
            <div className="border border-border p-6">
              <div className="mb-4">
                <h3 className="text-xl font-semibold text-center">
                  Instructor-Level Certifications & Training
                </h3>
              </div>
              <div>
                <div className="grid md:grid-cols-2 gap-x-8 gap-y-2 text-muted-foreground">
                  <div className="space-y-2">
                    <p>• Certified Instructor LI/LII – <em>Mental Management Systems</em></p>
                    <p>• Instructor Development Certified Instructor – <em>RangeMaster</em></p>
                    <p>• Defensive Shooting Fundamentals Certified Instructor – <em>USCCA</em></p>
                    <p>• Deliberate Coaching Certified Instructor – <em>The Complete Combatant</em></p>
                    <p>• Performance Instructor – <em>Modern Samurai Project</em></p>
                  </div>
                  <div className="space-y-2">
                    <p>• Authorized Coach Training Program – <em>Clackamas County Public Safety Training Center</em></p>
                    <p>• Suicide Prevention Certified Instructor – <em>QPR</em></p>
                    <p>• OC Spray Certified Instructor – <em>Agile Training & Consulting</em></p>
                    <p>• Applied Fundamentals Certified Instructor – <em>NLT</em></p>
                    <p>• ASPIC Certified Instructor – <em>Active Self Protection</em></p>
                  </div>
                </div>
              </div>
            </div>

            <div className="grid md:grid-cols-2 gap-8">
              {/* Awards */}
              <div className="border border-border p-6">
                <div className="mb-4">
                  <h3 className="text-xl font-semibold">
                    Awards
                  </h3>
                </div>
                <div>
                  <ul className="space-y-2 text-muted-foreground">
                    <li>• PSTC 102 – Top Gun</li>
                    <li>• PSTC 103 – Top Gun</li>
                    <li>• TriggerPrep Media – Vice Card Patch Holder #33</li>
                    <li>• Gabe White Training – Dark Pin (SHO)</li>
                    <li>• Sub-Second Club Patch Holder</li>
                    <li>• Jail-Break Challenge Patch Holder</li>
                  </ul>
                </div>
              </div>

              {/* Student-Level Certifications */}
              <div className="border border-border p-6">
                <div className="mb-4">
                  <h3 className="text-xl font-semibold">
                    Student-Level Certifications & Training
                  </h3>
                </div>
                <div>
                  <ul className="space-y-2 text-muted-foreground">
                    <li>• Glock Armorer</li>
                    <li>• NAEMT – First On The Scene (Plank Holder)</li>
                    <li>• Stop The Bleed</li>
                    <li>• HSI-CPR / First Aid</li>
                    <li>• ASHI Advanced Bleeding Control</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
      {/* One-on-One Training Section */}
      <section className="py-20 pt-[30px] pb-[30px] bg-[#f7f7f7]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-[40px] pb-[40px] pl-[24px] pr-[24px]">
          <div className="text-center mb-12">
            <h2 className="text-3xl lg:text-4xl text-foreground mb-4 font-semibold">LET'S TRAIN TOGETHER</h2>
          </div>

          <div className="grid md:grid-cols-2 gap-6 max-w-5xl mx-auto">
            {/* In-Person Coaching Card */}
            <Card className="relative">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <CardTitle className="text-2xl">1-Hour In-Person Coaching Session</CardTitle>
                  <span className="px-3 py-1 text-xs font-medium border border-foreground rounded-full whitespace-nowrap">
                    Approval Required
                  </span>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-muted-foreground">
                  One hour, in-person coaching session.
                </p>
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Clock className="h-5 w-5" />
                  <span>60 minutes</span>
                </div>
                <div className="text-2xl font-bold text-foreground">
                  $85.00
                </div>
                <Button
                  className="w-full bg-black text-white hover:bg-black/90 py-6 text-base rounded-none"
                  onClick={() => setIsAppointmentsModalOpen(true)}
                  data-testid="button-book-in-person"
                >
                  Book Now
                </Button>
              </CardContent>
            </Card>

            {/* Virtual Coaching Card */}
            <Card>
              <CardHeader>
                <CardTitle className="text-2xl">1-Hour Virtual Coaching Session</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-muted-foreground">
                  1-Hour Virtual Coaching Session
                </p>
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Clock className="h-5 w-5" />
                  <span>60 minutes</span>
                </div>
                <div className="text-2xl font-bold text-foreground">
                  $65.00
                </div>
                <Button
                  className="w-full bg-black text-white hover:bg-black/90 py-6 text-base rounded-none"
                  onClick={() => setIsAppointmentsModalOpen(true)}
                  data-testid="button-book-virtual"
                >
                  Book Now
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Appointments Modal */}
      <AppointmentsModal
        isOpen={isAppointmentsModalOpen}
        onClose={() => setIsAppointmentsModalOpen(false)}
        instructorId="43575331"
      />
    </Layout>
  );
}
