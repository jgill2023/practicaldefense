import { Layout } from "@/components/Layout";
import { ComicPanel, TitleCard } from "@/components/RACTheme";
import { Award, GraduationCap, Shield, Target, BookOpen, Medal, Quote } from "lucide-react";
import teamCollageImage from "@assets/image_1765700410773.png";
import timKellyImage from "@assets/Tim_Kelly_1765700546617.jpg";
import heroImage from "@assets/Tim_Kelly_1765700860362.jpg";

import TK01 from "@assets/TK01.jpg";

const accomplishments = [
  {
    year: "2005-2013",
    title: "OEF Combat Veteran, United States Marine Corps",
    icon: Shield,
  },
  {
    year: "2016",
    title: "Associate Degree in Mechanical Engineering",
    icon: GraduationCap,
  },
  {
    year: "2018",
    title: "GSSF Master Shooter",
    icon: Target,
  },
  {
    year: "2019-present",
    title: "NRA Training Counselor",
    icon: Award,
  },
  {
    year: "2019, 2020",
    title: "Top Shooter, Handgun Combatives Certified Instructor, 1/21 in the nation",
    icon: Medal,
  },
  {
    year: "2023",
    title: "Rangemaster Certified Professional Pistolcraft Instructor",
    icon: Target,
  },
  {
    year: "2025",
    title: "Bachelor's Degree in Entrepreneurship at American Military University",
    icon: GraduationCap,
  },
  {
    year: "2025",
    title: "Author of: Your World Is Not A Gun-Free Zone",
    icon: BookOpen,
  },
];

export default function About() {
  return (
    <Layout>
      <div className="relative h-[75vh] min-h-[500px] w-full overflow-hidden">
        <img 
          src={heroImage} 
          alt="Tim Kelly instructing at Apache Solutions" 
          className="w-full h-full object-cover object-top"
          data-testid="img-about-hero"
        />
        <div className="absolute inset-0 bg-gradient-to-br from-[hsl(204,27%,16%,0.85)] via-[hsl(209,90%,38%,0.6)] to-[hsl(190,65%,47%,0.5)]" />
        <div className="absolute bottom-0 left-0 right-0 p-8 text-white pt-[64px] pb-[64px] pl-[16px] pr-[16px]">
          <div className="max-w-5xl mx-auto">
            <h1 className="font-heading text-4xl lg:text-5xl uppercase tracking-wide mb-2">About Us</h1>
            <p className="text-white/80 text-lg">Meet the team behind Apache Solutions Firearms Training.</p>
          </div>
        </div>
      </div>
      <div className="min-h-screen bg-gray-50 py-12 pt-[84px] pb-[84px]">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">

          <ComicPanel shadow="lg" className="mb-8" data-testid="about-tim-kelly">
            <div className="space-y-8">
              <div className="flex flex-col md:flex-row gap-8">
                <div className="md:w-1/3">
                  <img 
                    src={TK01} 
                    alt="Tim Kelly - Owner & Lead Instructor" 
                    className="w-full aspect-square object-cover rounded-xl"
                    data-testid="img-tim-kelly"
                  />
                  <div className="mt-4 text-center">
                    <h2 className="font-heading text-2xl uppercase tracking-wide">Tim Kelly</h2>
                    <p className="text-[hsl(209,90%,38%)] font-medium">Owner & Lead Instructor</p>
                  </div>
                </div>

                <div className="md:w-2/3">
                  <p className="text-foreground leading-relaxed text-lg mb-6">
                    Tim Kelly is the owner of Apache Solutions Firearms Training in Yadkinville, NC. Tim started Apache in 2017 with the intention of creating a stronger and more competent armed society. He recognized the need for safe and effective firearms training in his community and structured his business accordingly.
                  </p>
                  <p className="text-foreground leading-relaxed text-lg mb-6">
                    Apache specializes in individual private sessions and teaches over 1000 hours of private sessions throughout each year. A dedicated husband and father, Tim has a strong desire to lead and help others achieve their goals.
                  </p>
                </div>
              </div>

              <div className="border-t border-gray-200 pt-8">
                <h3 className="font-heading text-xl uppercase tracking-wide mb-6 flex items-center gap-2">
                  <Award className="w-5 h-5 text-[hsl(209,90%,38%)]" />
                  Major Accomplishments
                </h3>
                <ul className="space-y-3 pl-[28px] pr-[28px]">
                  {accomplishments.map((item, index) => (
                    <li key={index} className="flex items-start gap-3" data-testid={`accomplishment-${index}`}>
                      <item.icon className="w-5 h-5 text-[hsl(209,90%,38%)] flex-shrink-0 mt-0.5" />
                      <div>
                        <span className="text-foreground font-medium">{item.title}</span>
                        <span className="text-muted-foreground ml-2">({item.year})</span>
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </ComicPanel>

          <div className="mt-12 mb-8">
            <h2 className="font-heading text-3xl uppercase tracking-wide mb-2">Our Team of Instructors</h2>
            <p className="text-muted-foreground text-lg">Dedicated professionals committed to building a competent armed society.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Derek Watkins */}
            <ComicPanel shadow="md" data-testid="about-derek-watkins">
              <div className="space-y-4">
                <div>
                  <h3 className="font-heading text-xl uppercase tracking-wide text-[hsl(209,90%,38%)]">Derek Watkins</h3>
                  <p className="text-sm font-medium text-muted-foreground">Full-Time Instructor</p>
                </div>
                <p className="text-foreground leading-relaxed">
                  Derek joined Apache in 2021 and worked his way through the apprenticeship program, becoming a full-time instructor in 2023. Originally from Oak Island, NC, he's passionate about teaching and helping people achieve their goals through tailored instruction.
                </p>
                <div className="border-t border-gray-200 pt-4">
                  <p className="text-sm font-medium text-foreground mb-2">Major Accomplishments:</p>
                  <ul className="text-sm text-foreground space-y-1 list-disc list-inside">
                    <li>Rangemaster Professional Pistolcraft Instructor</li>
                    <li>Rangemaster Shotgun Instructor</li>
                    <li>Top 3 finisher in all Rangemaster Instructor classes</li>
                    <li>Active Response Training Close Quarters Instructor</li>
                    <li>Teaches 1000+ hours per year in private sessions</li>
                  </ul>
                </div>
              </div>
            </ComicPanel>

            {/* Derek Wright */}
            <ComicPanel shadow="md" data-testid="about-derek-wright">
              <div className="space-y-4">
                <div>
                  <h3 className="font-heading text-xl uppercase tracking-wide text-[hsl(209,90%,38%)]">Derek Wright</h3>
                  <p className="text-sm font-medium text-muted-foreground">Professional Pistolcraft Instructor</p>
                </div>
                <p className="text-foreground leading-relaxed">
                  A Rangemaster-certified Professional Pistolcraft Instructor and Apache Instructor Enrichment Program graduate, Derek focuses on empowering law-abiding citizens with the skills and mindset to safely carry and responsibly defend themselves.
                </p>
                <div className="border-t border-gray-200 pt-4">
                  <p className="text-sm font-medium text-foreground mb-2">Certifications:</p>
                  <ul className="text-sm text-foreground space-y-1 list-disc list-inside">
                    <li>Rangemaster Professional Pistolcraft Instructor</li>
                    <li>NRA Basics of Pistol & RSO</li>
                    <li>NC Department of Justice Concealed Carry Instructor</li>
                  </ul>
                </div>
              </div>
            </ComicPanel>

            {/* Dan Brady */}
            <ComicPanel shadow="md" data-testid="about-dan-brady">
              <div className="space-y-4">
                <div>
                  <h3 className="font-heading text-xl uppercase tracking-wide text-[hsl(209,90%,38%)]">Dan Brady</h3>
                  <p className="text-sm font-medium text-muted-foreground">Law Enforcement Firearms Instructor</p>
                </div>
                <p className="text-foreground leading-relaxed">
                  A career law enforcement officer with 25+ years of experience and 20+ years as an active firearms instructor, Dan approaches teaching with deep knowledge of Adult Learning Theory, Motor Learning Processes, and performance-based methods.
                </p>
                <div className="border-t border-gray-200 pt-4">
                  <p className="text-sm font-medium text-foreground mb-2">Expertise:</p>
                  <ul className="text-sm text-foreground space-y-1 list-disc list-inside">
                    <li>20+ years law enforcement firearms instruction</li>
                    <li>10+ years civilian firearms instruction</li>
                    <li>Subject matter expert in defensive white light use</li>
                  </ul>
                </div>
              </div>
            </ComicPanel>

            {/* David Church */}
            <ComicPanel shadow="md" data-testid="about-david-church">
              <div className="space-y-4">
                <div>
                  <h3 className="font-heading text-xl uppercase tracking-wide text-[hsl(209,90%,38%)]">David Church</h3>
                  <p className="text-sm font-medium text-muted-foreground">Apache Handgun Instructor</p>
                </div>
                <p className="text-foreground leading-relaxed">
                  An Apache handgun instructor since March 2020, David's goal is to help develop essential skills that may one day save lives. Beyond firearms, he's a self-employed entrepreneur, avid rock climber, and triathlon runner.
                </p>
                <div className="border-t border-gray-200 pt-4">
                  <p className="text-sm font-medium text-foreground mb-2">Certifications:</p>
                  <ul className="text-sm text-foreground space-y-1 list-disc list-inside">
                    <li>Rangemaster Professional Pistolcraft Instructor</li>
                    <li>Defense Training International Instructor</li>
                    <li>NRA Basic Pistol Instructor</li>
                  </ul>
                </div>
              </div>
            </ComicPanel>

            {/* Teresa Kelly */}
            <ComicPanel shadow="md" data-testid="about-teresa-kelly">
              <div className="space-y-4">
                <div>
                  <h3 className="font-heading text-xl uppercase tracking-wide text-[hsl(209,90%,38%)]">Teresa Kelly</h3>
                  <p className="text-sm font-medium text-muted-foreground">Co-Owner & Certified Instructor</p>
                </div>
                <p className="text-foreground leading-relaxed">
                  Co-owner of Apache Solutions LLC, Teresa has trained with renowned instructors including Tatiana Whitlock and Tom Givens. She's passionate about building community and empowering women through firearms training and education.
                </p>
                <div className="border-t border-gray-200 pt-4">
                  <p className="text-sm font-medium text-foreground mb-2">Certifications:</p>
                  <ul className="text-sm text-foreground space-y-1 list-disc list-inside">
                    <li>Rangemaster Certified Pistol Instructor</li>
                    <li>DTI-Certified Instructor</li>
                    <li>CPR, AED, and NRA RSO Certified</li>
                  </ul>
                </div>
              </div>
            </ComicPanel>

            {/* Wes Matthews */}
            <ComicPanel shadow="md" data-testid="about-wes-matthews">
              <div className="space-y-4">
                <div>
                  <h3 className="font-heading text-xl uppercase tracking-wide text-[hsl(209,90%,38%)]">Wes Matthews</h3>
                  <p className="text-sm font-medium text-muted-foreground">Rescue Services & Firearms Instructor</p>
                </div>
                <p className="text-foreground leading-relaxed">
                  Affiliated with the Yadkin County Rescue Squad, Wes provides specialized rescue services and supports emergency medical operations while sharing his firearms expertise through instruction.
                </p>
                <div className="border-t border-gray-200 pt-4">
                  <p className="text-sm font-medium text-foreground mb-2">Certifications:</p>
                  <ul className="text-sm text-foreground space-y-1 list-disc list-inside">
                    <li>Rangemaster Advanced Pistol Instructor</li>
                    <li>Rangemaster Shotgun Instructor</li>
                    <li>EMR (Emergency Medical Responder)</li>
                  </ul>
                </div>
              </div>
            </ComicPanel>

            {/* Patrice Nye */}
            <ComicPanel shadow="md" data-testid="about-patrice-nye">
              <div className="space-y-4">
                <div>
                  <h3 className="font-heading text-xl uppercase tracking-wide text-[hsl(209,90%,38%)]">Patrice Nye</h3>
                  <p className="text-sm font-medium text-muted-foreground">Apprentice Instructor</p>
                </div>
                <p className="text-foreground leading-relaxed">
                  Training with Apache for five years, Patrice progressed from never handling a weapon to pursuing the Assistant Instructor track. A Banking Compliance professional by day, she's passionate about educating a responsibly armed citizenry.
                </p>
                <div className="border-t border-gray-200 pt-4">
                  <p className="text-sm font-medium text-foreground mb-2">About Patrice:</p>
                  <p className="text-sm text-foreground">Writer, runner, foodie, traveler, and huntress committed to training and education.</p>
                </div>
              </div>
            </ComicPanel>

            {/* Zack Halstead */}
            <ComicPanel shadow="md" data-testid="about-zack-halstead">
              <div className="space-y-4">
                <div>
                  <h3 className="font-heading text-xl uppercase tracking-wide text-[hsl(209,90%,38%)]">Zack Halstead</h3>
                  <p className="text-sm font-medium text-muted-foreground">Marine Corps Veteran & Instructor</p>
                </div>
                <p className="text-foreground leading-relaxed">
                  A Marine Corps veteran turned Law Enforcement Officer, Zack brings discipline and precision to his instruction. Apache instructor since 2023, he's driven by integrity and commitment to creating a better armed society.
                </p>
                <div className="border-t border-gray-200 pt-4">
                  <p className="text-sm font-medium text-foreground mb-2">Certifications:</p>
                  <ul className="text-sm text-foreground space-y-1 list-disc list-inside">
                    <li>Rangemaster Advanced Certified Pistol Instructor</li>
                    <li>Marine Corps Veteran</li>
                    <li>Law Enforcement Officer</li>
                  </ul>
                </div>
              </div>
            </ComicPanel>
          </div>

          <ComicPanel shadow="lg" className="mt-8" data-testid="about-apache-letter">
            <div className="space-y-6">
              <div className="flex items-center gap-3 border-b border-gray-200 pb-4">
                <div className="w-12 h-12 rounded-full bg-gradient-to-br from-[hsl(209,90%,38%)] to-[hsl(190,65%,47%)] flex items-center justify-center">
                  <Quote className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h2 className="font-heading text-2xl uppercase tracking-wide">Why the Name Apache?</h2>
                  <p className="text-muted-foreground text-sm">An excerpt from Tim's journal — May 19, 2022</p>
                </div>
              </div>

              <div className="prose prose-lg max-w-none text-foreground leading-relaxed space-y-6">
                <p className="italic text-muted-foreground">
                  I get this question frequently and fail to elaborate it as well as I can on paper. So, why not just share an excerpt from my journal discussing how and why Apache got its name.
                </p>

                <div className="bg-[hsl(209,90%,38%)]/5 rounded-lg p-6 border border-[hsl(209,90%,38%)]/20">
                  <p className="mb-4">
                    The callsign for my last squad was Apache IV. I took great pride in this band of degenerates. We fought together, bled, laughed, and cried together. Shared experiences that I will NEVER experience again with another human being. We were a small family. I led my squad and strived to stand by the Golden rule. Treat others the way you wish to be treated.
                  </p>
                  <p className="mb-4">
                    I also never adopted the "I love me" mentality that many around me had done. Taking pride in yourself is one thing but, as a leader, I took greater pride in my Marines' accomplishments and guided them through their mistakes instead of forcing paperwork and senseless punishments that did nothing to benefit their growth as a man or a Marine. Instead of one man getting all the credit and advancing, I believed in helping my Marines succeed to the best of my abilities and advancing as a team.
                  </p>
                </div>

                <p className="font-medium text-lg">
                  That deployment to Afghanistan was one of the best/worst times of my life.
                </p>

                <p>
                  It was only made the best because of my squad of Marines. No matter how difficult it would get for me, their loyalty NEVER left. Even when we watched other Marines turn on each other. No matter if I made a mistake, or an accomplishment, THEY STOOD BY ME when no one else would. Even coming home to public figures and politicians turning their backs on us as a Battalion. Our own command disowning some of our own men who fought and bled with us without blinking an eye, much less admitting to their own faults. Apache IV never budged. We knew that if we stuck together, ALL of us would make it through.
                </p>

                <div className="bg-[hsl(204,27%,16%)] text-white rounded-lg p-6 my-6">
                  <p className="mb-4">
                    This is what needed to be re-created. A place for others to succeed and be a part of a real change. To go against the grain and to stand for something even though many doubt and stand against you. A different fight but, a fight still.
                  </p>
                  <p className="mb-4">
                    Our community had a hole in it. And a massive gap of misinformation and a new standard that needed to be made. Some would say that I am talking about Quality Firearms Instruction but, that is just the catalyst. This is about making a change and setting a standard for others to follow.
                  </p>
                  <p>
                    It is about helping others work through problems be it with carrying a handgun or dealing with their problem with school or work. Helping that afraid single-mother running from a crazed ex-husband who is stalking her and threatening her. Not just teaching her to use a gun but, empowering her with data driven, street-proven knowledge and skill that may help her save her own life.
                  </p>
                </div>

                <p>
                  Helping others realize that there may be no one coming to save you but, WE are here to make sure you can save yourself. We needed a team of competent, qualified, humble, and resilient leaders to stand by each other and make a difference. That is why I chose the name Apache.
                </p>

                <p>
                  Apache now has grown to nearly a dozen instructors with several coming up through our apprenticeship program. Together, we have taught over 4,000 students in the last 3 years, built a range, classroom, and pro-shop. I am proud to say, even if it is only in the small community of Yadkin County, NC., we are making a difference.
                </p>

                <div className="border-t border-gray-200 pt-6 mt-8">
                  <p className="font-heading text-lg uppercase tracking-wide text-[hsl(209,90%,38%)]">Tim Kelly</p>
                  <p className="text-muted-foreground">Owner / Chief Instructor at Apache Solutions LLC</p>
                </div>

                <div className="mt-8">
                  <img 
                    src={teamCollageImage} 
                    alt="Apache Solutions team throughout the years" 
                    className="w-full rounded-lg shadow-md"
                    data-testid="img-team-collage"
                  />
                </div>
              </div>
            </div>
          </ComicPanel>
        </div>
      </div>
    </Layout>
  );
}
