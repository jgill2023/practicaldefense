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
      <div className="relative h-[50vh] min-h-[400px] w-full overflow-hidden">
        <img 
          src={heroImage} 
          alt="Tim Kelly instructing at Apache Solutions" 
          className="w-full h-full object-cover object-top"
          data-testid="img-about-hero"
        />
        <div className="absolute inset-0 bg-gradient-to-br from-[hsl(204,27%,16%,0.85)] via-[hsl(209,90%,38%,0.6)] to-[hsl(190,65%,47%,0.5)]" />
        <div className="absolute bottom-0 left-0 right-0 p-8 text-white">
          <div className="max-w-5xl mx-auto">
            <h1 className="font-heading text-4xl lg:text-5xl uppercase tracking-wide mb-2">About Us</h1>
            <p className="text-white/80 text-lg">Meet the team behind Apache Solutions Firearms Training.</p>
          </div>
        </div>
      </div>
      <div className="min-h-screen bg-gray-50 py-12">
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
