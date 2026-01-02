import { Layout } from "@/components/Layout";
import { SEO } from "@/components/SEO";
import heroImage from "@assets/Instructors_1767335152648.jpg";
import jeremyImg from "@assets/20180422_235425000_iOS_1767336860712.jpg";
import { Award } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

export default function About() {
  return (
    <Layout>
      <SEO 
        title="About Us"
        description="Meet the Practical Defense Training team. Combat veterans and certified instructors dedicated to professional firearms training and defensive skills education."
      />
      <div className="relative h-[75vh] min-h-[500px] w-full overflow-hidden">
        <img 
          src={heroImage} 
          alt="Practical Defense Training Instructor Team" 
          className="w-full h-full object-cover object-center"
          data-testid="img-about-hero"
        />
        <div className="absolute inset-0 bg-black/50" />
        <div className="absolute bottom-0 left-0 right-0 p-8 text-white pt-[64px] pb-[64px] pl-[16px] pr-[16px]">
          <div className="max-w-5xl mx-auto">
            <h1 className="font-heading text-4xl lg:text-5xl uppercase tracking-wide mb-2">About Us</h1>
            <p className="text-white/80 text-lg">Meet the team behind Practical Defense Training.</p>
          </div>
        </div>
      </div>

      <div className="min-h-screen bg-gray-50 py-12 pt-[84px] pb-[84px]">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          
          <Card className="mb-8 overflow-hidden border-2 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]" data-testid="instructor-card-jeremy-gill">
            <CardContent className="p-8">
              <div className="space-y-8">
                <div className="flex flex-col md:flex-row gap-8">
                  <div className="md:w-1/3">
                    <img 
                      src={jeremyImg} 
                      alt="Jeremy Gill - Founder and Lead Instructor" 
                      className="w-full aspect-square object-cover rounded-xl"
                      loading="lazy"
                      data-testid="img-instructor-jeremy"
                    />
                    <div className="mt-4 text-center">
                      <h2 className="font-heading text-2xl uppercase tracking-wide" data-testid="text-instructor-name-jeremy">Jeremy Gill</h2>
                      <p className="text-[hsl(209,90%,38%)] font-medium" data-testid="text-instructor-title-jeremy">Founder and Lead Instructor</p>
                    </div>
                  </div>

                  <div className="md:w-2/3">
                    <div className="border-t border-gray-200 pt-8 md:border-t-0 md:pt-0">
                      <h3 className="font-heading text-xl uppercase tracking-wide mb-6 flex items-center gap-2">
                        <Award className="w-5 h-5 text-[hsl(209,90%,38%)]" />
                        Certifications & Qualifications
                      </h3>
                      <ul className="space-y-3 pl-[28px] pr-[28px]">
                        <li className="flex items-start gap-3">
                          <div className="w-1.5 h-1.5 rounded-full bg-[hsl(209,90%,38%)] mt-2 flex-shrink-0" />
                          <span className="text-foreground font-medium">NM DPS Certified Instructor #445</span>
                        </li>
                        <li className="flex items-start gap-3">
                          <div className="w-1.5 h-1.5 rounded-full bg-[hsl(209,90%,38%)] mt-2 flex-shrink-0" />
                          <span className="text-foreground font-medium">NRA Certified Instructor</span>
                        </li>
                        <li className="flex items-start gap-3">
                          <div className="w-1.5 h-1.5 rounded-full bg-[hsl(209,90%,38%)] mt-2 flex-shrink-0" />
                          <span className="text-foreground font-medium">Rangemaster Certified Instructor</span>
                        </li>
                        <li className="flex items-start gap-3">
                          <div className="w-1.5 h-1.5 rounded-full bg-[hsl(209,90%,38%)] mt-2 flex-shrink-0" />
                          <span className="text-foreground font-medium">Dr. William Aprill's Unthinkable Attendee and Host</span>
                        </li>
                        <li className="flex items-start gap-3">
                          <div className="w-1.5 h-1.5 rounded-full bg-[hsl(209,90%,38%)] mt-2 flex-shrink-0" />
                          <span className="text-foreground font-medium">Graduate of MAG-20</span>
                        </li>
                      </ul>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="mt-12 mb-8">
            <h2 className="font-heading text-3xl uppercase tracking-wide mb-2">Our Team of Instructors</h2>
            <p className="text-muted-foreground text-lg">Dedicated professionals committed to building a competent armed society.</p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 pb-8">
            <Card className="flex items-center justify-center p-12 min-h-[200px] border-2 border-black border-dashed">
              <CardContent>
                <div className="text-center text-muted-foreground">
                  <p>More instructor profiles coming soon.</p>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </Layout>
  );
}
