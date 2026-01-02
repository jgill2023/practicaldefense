import { Layout } from "@/components/Layout";
import { ComicPanel } from "@/components/RACTheme";
import { SEO } from "@/components/SEO";
import heroImage from "@assets/Instructors_1767335152648.jpg";
import jeremyImg from "@assets/20180422_235425000_iOS_1767336860712.jpg";

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
          <div className="mt-12 mb-8">
            <h2 className="font-heading text-3xl uppercase tracking-wide mb-2">Our Team of Instructors</h2>
            <p className="text-muted-foreground text-lg">Dedicated professionals committed to building a competent armed society.</p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 pb-8">
            <ComicPanel shadow="md" data-testid="instructor-card-jeremy-gill">
              <div className="space-y-4">
                <div className="aspect-[3/4] overflow-hidden rounded-lg">
                  <img 
                    src={jeremyImg} 
                    alt="Jeremy Gill - Founder and Lead Instructor" 
                    className="w-full h-full object-cover"
                    data-testid="img-instructor-jeremy"
                  />
                </div>
                <div>
                  <h3 className="font-heading text-xl uppercase tracking-wide text-[hsl(209,90%,38%)]" data-testid="text-instructor-name-jeremy">Jeremy Gill</h3>
                  <p className="text-sm font-medium text-muted-foreground" data-testid="text-instructor-title-jeremy">Founder and Lead Instructor</p>
                </div>
                <div className="border-t border-gray-200 pt-4">
                  <ul className="text-sm text-foreground space-y-1 list-disc list-inside">
                    <li>NM DPS Certified Instructor #445</li>
                    <li>NRA Certified Instructor</li>
                    <li>Rangemaster Certified Instructor</li>
                    <li>Dr. William Aprill's Unthinkable Attendee and Host</li>
                    <li>Graduate of MAG-20</li>
                  </ul>
                </div>
              </div>
            </ComicPanel>
          </div>
        </div>
      </div>
    </Layout>
  );
}
