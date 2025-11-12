
import { Layout } from "@/components/Layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Target, Clock, Award, CheckCircle2, AlertCircle } from "lucide-react";

export default function TheCrucible() {
  return (
    <Layout>
      <div className="bg-black min-h-screen">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          {/* Header */}
          <div className="text-center mb-12">
            <h1 className="text-4xl font-bold text-white mb-4">The Crucible</h1>
            <p className="text-gray-300 font-normal text-[18px] mb-4">
              You believe you have mastered your craft? You believe you can apply skill under pressure? Do you believe you are prepared for what's next?  We shall see.
            </p>
            <p className="text-gray-300 font-normal text-[18px] mb-4">
              The Crucible is not a test of brute speed or sheer force. It is a crucible—a severe test of character and skill in shooting. This challenge is designed to push you to the limits of your cognitive ability, forcing you to apply significant throttle control, precision, and emotional discipline in a short but complex course of fire. This is a mental challenge first, and a shooting challenge second.
            </p>
            <p className="text-gray-300 font-normal text-[18px]">
              Are you prepared to face The Crucible?
            </p>
          </div>

          {/* The Challenge */}
          <Card className="mb-8 bg-zinc-900 border-zinc-700">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-white">
                <AlertCircle className="h-5 w-5" />
                The Challenge
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-gray-300">Competitors will engage a series of precision targets under strict time constraints, with varying cognitive loading introduced at each stage. The course of fire will test your ability to transition between speed and precision, memory, and your capacity to remain calm and focused when the pressure mounts.</p>
              <Separator className="bg-zinc-700" />
              <div>
                <h3 className="font-semibold mb-2 text-white">Gear Required:</h3>
                <ul className="list-disc list-inside space-y-1 text-gray-300">
                  <li>Service-grade pistol</li>
                  <li>IWB holster (shot from concealment)</li>
                  <li>Minimum 2 magazines, 10 rounds</li>
                  <li>Eye and ear protection</li>
                </ul>
              </div>
              <Separator className="bg-zinc-700" />
              <div>
                <h3 className="font-semibold mb-2 text-white">Course Layout:</h3>
                <p className="text-gray-300">
                  Two targets 1 yard apart. Shooter starts 5 yards in front of the LEFT target. 
                  Place a 3×5 card inside the RIGHT target's alpha zone (or use a 1" head alpha on the LEFT for Seanalair).
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Classifications */}
          <Card className="mb-8 bg-zinc-900 border-zinc-700">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-white">
                <Award className="h-5 w-5" />
                Classifications
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-gray-300">We have tiered this challenge into three distinct classifications. Each represents a higher level of mastery and a greater test of emotional, mental, and physical control. You MUST declare your chosen classification upon request of testing. You may only compete in one classification per testing session.</p>
              <div className="grid md:grid-cols-3 gap-4">
                <div className="p-4 border border-zinc-700 rounded-lg bg-zinc-800">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="font-bold text-white">Laoch</h3>
                    <Badge>PAR 7.0s</Badge>
                  </div>
                  <p className="text-sm text-gray-300">Standard classification</p>
                </div>
                <div className="p-4 border border-zinc-700 rounded-lg bg-zinc-800">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="font-bold text-white">Gallowglass</h3>
                    <Badge className="bg-[#bdbdbd]">PAR 6.0s</Badge>
                  </div>
                  <p className="text-sm text-gray-300">Advanced classification</p>
                </div>
                <div className="p-4 border border-zinc-700 rounded-lg bg-zinc-800">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="font-bold text-white">Seanalair</h3>
                    <Badge variant="destructive">PAR 6.0s</Badge>
                  </div>
                  <p className="text-sm text-gray-300">1" head alpha on left</p>
                </div>
              </div>
            <div className="space-y-6">
              {/* Laoch */}
              <div className="border-l-4 border-primary pl-4">
                <h3 className="font-bold text-lg mb-2 text-white">Laoch (Warrior)</h3>
                <p className="text-sm text-gray-400 italic mb-3">(Pronounced: LAY-ok)</p>
                <div className="space-y-2 text-sm">
                  <p className="text-gray-300">
                    <strong>Description:</strong> This classification is for the determined competitor who has a solid foundation in marksmanship and weapon handling. The Laoch has the skill, but not yet the mastery. This tier focuses on fundamental precision under moderate pressure and introduces the core concepts of cognitive load.
                  </p>
                  <p className="text-gray-300">
                    <strong>Difficulty:</strong> Moderate. Requires solid fundamentals and a calm demeanor.
                  </p>
                  <p className="text-gray-300">
                    <strong>Prizing:</strong> A custom Crucible decal and certificate of declaration for classification.
                  </p>
                </div>
              </div>

              {/* Gallowglass */}
              <div className="border-l-4 border-[#bdbdbd] pl-4">
                <h3 className="font-bold text-lg mb-2 text-white">Gallowglass (Mercenary)</h3>
                <p className="text-sm text-gray-400 italic mb-3">(Pronounced: GAH-loh-glass)</p>
                <div className="space-y-2 text-sm">
                  <p className="text-gray-300">
                    <strong>Description:</strong> The Gallowglass is the seasoned warrior, the professional. You are not only skilled but adaptable. This tier significantly increases the time pressure for the scenario, requiring advanced throttle control and the ability to rapidly process and react to new information.
                  </p>
                  <p className="text-gray-300">
                    <strong>Difficulty:</strong> High. Requires excellent precision, a high degree of emotional control, and the ability to think under significant time pressure.
                  </p>
                  <p className="text-gray-300">
                    <strong>Prizing:</strong> A custom crucible decal, certificate of declaration for classification, a premium fitted an embroidered Black Hat. Your name immortalized on this site as recognition of your achievement.
                  </p>
                </div>
              </div>

              {/* Seanalair */}
              <div className="border-l-4 border-destructive pl-4">
                <h3 className="font-bold text-lg mb-2 text-white">Seanalair (Old Warrior / Elder)</h3>
                <p className="text-sm text-gray-400 italic mb-3">(Pronounced: SHAN-uh-lair)</p>
                <div className="space-y-2 text-sm">
                  <p className="text-gray-300">
                    <strong>Description:</strong> This is the classification of the master. The Seanalair has seen it all, and possesses the mental fortitude and emotional control to perform flawlessly under extreme stress. This tier is not about speed; it is about perfect execution despite maximum cognitive load and pressure. The challenges presented here will test your development, your discipline, and your ability to apply skills without a second thought.
                  </p>
                  <p className="text-gray-300">
                    <strong>Difficulty:</strong> Extreme. Success in this tier is a testament to true mastery.
                  </p>
                  <p className="text-gray-300">
                    <strong>Prizing:</strong> A custom crucible decal, certificate of declaration for classification, a premium fitted an embroidered White Hat. Your name immortalized on this site as recognition of your achievement.
                  </p>
                </div>
              </div>
            </div>
            <div className="bg-zinc-800 border border-zinc-700 p-4 rounded-lg">
              <p className="text-sm font-medium text-white">Scoring: Any round outside the designated aim area = failure. Two attempts allowed. Declare intended classification before the run.</p>
            </div>
          </CardContent>
        </Card>

          {/* Step-by-Step Procedure */}
          <Card className="mb-8 bg-zinc-900 border-zinc-700">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-white">
                <CheckCircle2 className="h-5 w-5" />
                Quick Step-by-Step Run Procedure
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-3">
                <div className="flex gap-3">
                  <div className="flex-shrink-0 w-8 h-8 bg-primary text-primary-foreground rounded-full flex items-center justify-center font-bold">1</div>
                  <div className="flex-1">
                    <h4 className="font-semibold mb-1 text-white">Setup</h4>
                    <ul className="list-disc list-inside text-sm text-gray-300 space-y-1">
                    <li>Place two Tactical Advantage targets 1 yard apart. Shooter's starting position is 5 yards in n front of the left target.</li>
                    <li>Insert 3×5 card in right target alpha zone (or set 1" head alpha on left for Seanalair).</li>
                    <li>Holster concealed (IWB), mags loaded, eye/ear protection on.</li>
                  </ul>
                </div>
              </div>

                <div className="flex gap-3">
                  <div className="flex-shrink-0 w-8 h-8 bg-primary text-primary-foreground rounded-full flex items-center justify-center font-bold">2</div>
                  <div className="flex-1">
                    <h4 className="font-semibold mb-1 text-white">Declaration</h4>
                    <p className="text-sm text-gray-300">Before starting, the shooter must declare their performance. Laoch, Gallowglass, Seanalair. We do NOT believe in luck at Tactical Advantage. Calling your performance is a must to be considered for classification. Competitors are afforded 2 attempts.  For HAT tiers BOTH runs must be successful.</p>
                  </div>
                </div>

                <div className="flex gap-3">
                  <div className="flex-shrink-0 w-8 h-8 bg-primary text-primary-foreground rounded-full flex items-center justify-center font-bold">3</div>
                  <div className="flex-1">
                    <h4 className="font-semibold mb-1 text-white">Ready</h4>
                    <p className="text-sm text-gray-300">The shooter begins at the five-yard line in front of the left target, with the handgun holstered and ready.</p>
                  </div>
                </div>

                <div className="flex gap-3">
                  <div className="flex-shrink-0 w-8 h-8 bg-primary text-primary-foreground rounded-full flex items-center justify-center font-bold">4</div>
                  <div className="flex-1">
                    <h4 className="font-semibold mb-1 text-white">Start Signal</h4>
                    <p className="text-sm text-gray-300">Upon the start signal (e.g., a timer beep), the shooter will begin the course of fire.</p>
                  </div>
                </div>

                <div className="flex gap-3">
                  <div className="flex-shrink-0 w-8 h-8 bg-primary text-primary-foreground rounded-full flex items-center justify-center font-bold">5</div>
                  <div className="flex-1">
                    <h4 className="font-semibold mb-1 text-white">Left Target (Shots 1–5)</h4>
                    <ul className="list-disc list-inside text-sm text-gray-300 space-y-1">
                      <li>Shot 1: draw and fire one shot into left-target head alpha (1" head alpha for Seanalair if attempting).</li>
                      <li>Shots 2–5: Transition to the body alpha of the left target and fire four shots.</li>
                    </ul>
                  </div>
                </div>

                <div className="flex gap-3">
                  <div className="flex-shrink-0 w-8 h-8 bg-primary text-primary-foreground rounded-full flex items-center justify-center font-bold">6</div>
                  <div className="flex-1">
                    <h4 className="font-semibold mb-1 text-white">Reload</h4>
                    <p className="text-sm text-gray-300">While transitioning your focus and body position to the right target, perform a reload. This reload does not need to be from slidelock.</p>
                  </div>
                </div>

                <div className="flex gap-3">
                  <div className="flex-shrink-0 w-8 h-8 bg-primary text-primary-foreground rounded-full flex items-center justify-center font-bold">7</div>
                  <div className="flex-1">
                    <h4 className="font-semibold mb-1 text-white">Right Target (Shots 6–10)</h4>
                    <p className="text-sm text-gray-300">Shots 6-10: Fire five shots into the 3x5 card placed within the alpha zone of the right target.</p>
                  </div>
                </div>

                <div className="flex gap-3">
                  <div className="flex-shrink-0 w-8 h-8 bg-primary text-primary-foreground rounded-full flex items-center justify-center font-bold">8</div>
                  <div className="flex-1">
                    <h4 className="font-semibold mb-1 text-white">Scoring & Classification</h4>
                    <p className="text-sm text-gray-300">This is a no fail drill. Any round that misses its designated target area (the head alpha, body alpha, or the 3x5 card) results in a failure.

                    Each competitor is granted two attempts. To be classified above LAOCH, both runs must be successful and without any misses.

                    The declaration is the key. You must accurately assess your own ability AND execute the drill flawlessly. Your performance should be foreseeable and repeatable, demonstrating true ownership of your skills. The ability to "call your shot" is the ultimate measure of proficiency in this drill.</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Suggested Time Splits */}
          <Card className="mb-8 bg-zinc-900 border-zinc-700">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-white">
                <Clock className="h-5 w-5" />
                Suggested Time Splits (Training Rhythm)
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div>
                <h3 className="font-bold mb-3 flex items-center gap-2 text-white">
                  Laoch — 7.0s total
                </h3>
                <ul className="list-disc list-inside text-sm text-gray-300 space-y-1">
                  <li>Draw + head shot: 1.0s</li>
                  <li>Left body 4 shots: 2.5s (≈0.625s/shot)</li>
                  <li>Reload + move: 1.0s</li>
                  <li>Right 5 shots: 2.5s (≈0.5s/shot)</li>
                </ul>
              </div>

              <div>
                <h3 className="font-bold mb-3 flex items-center gap-2 text-white">
                  Gallowglass — 6.0s total
                </h3>
                <ul className="list-disc list-inside text-sm text-gray-300 space-y-1">
                  <li>Draw + head shot: 0.9s</li>
                  <li>Left body 4 shots: 2.0s (0.5s/shot)</li>
                  <li>Reload + move: 0.6s</li>
                  <li>Right 5 shots: 2.5s (0.5s/shot)</li>
                </ul>
              </div>

              <div>
                <h3 className="font-bold mb-3 flex items-center gap-2 text-white">
                  Seanalair — 6.0s total (1" head alpha)
                </h3>
                <ul className="list-disc list-inside text-sm text-gray-300 space-y-1">
                <li>Draw + 1" head shot: 1.0s</li>
                <li>Left body 4 shots: 1.8s (≈0.45s/shot)</li>
                <li>Reload + move: 0.6s</li>
                <li>Right 5 shots: 2.6s</li>
              </ul>
            </div>
          </CardContent>
        </Card>

          {/* 6-Week Training Progression */}
          <Card className="mb-8 bg-zinc-900 border-zinc-700">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-white">
                <Target className="h-5 w-5" />
                6-Week Training Progression
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <h3 className="font-bold mb-2 text-white">Weeks 1–2 (Fundamentals)</h3>
                <ul className="list-disc list-inside text-sm text-gray-300 space-y-1">
                  <li>Dry draws to first-shot address, 10–15 reps.</li>
                  <li>Static double-taps and 4-round strings at 5 yds (focus recoil control).</li>
                  <li>Slow, deliberate magazine changes.</li>
                </ul>
              </div>

              <div>
                <h3 className="font-bold mb-2 text-white">Weeks 3–4 (Timing & Transitions)</h3>
                <ul className="list-disc list-inside text-sm text-gray-300 space-y-1">
                  <li>Timed drills: draw + head shot + 4 body at 5 yds with a 3–4s window.</li>
                  <li>Practice reloads while moving eyes to the next target.</li>
                  <li>Right-target practice: 3×5 card, 5 rounds at descending cadences.</li>
                </ul>
              </div>

              <div>
                <h3 className="font-bold mb-2 text-white">Week 5 (Integration)</h3>
                <ul className="list-disc list-inside text-sm text-gray-300 space-y-1">
                  <li>Full sequence on timer at Laoch PAR (7s). Record runs and fix weakest link.</li>
                </ul>
              </div>

              <div>
                <h3 className="font-bold mb-2 text-white">Week 6 (Qualification)</h3>
                <ul className="list-disc list-inside text-sm text-gray-300 space-y-1">
                  <li>Full attempt sessions with declared classifications. For hat recognition both runs must be clean.</li>
                </ul>
              </div>
            </CardContent>
          </Card>

          {/* Safety & Range Notes */}
          <Card className="mb-8 bg-zinc-900 border-destructive">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-destructive">
                <AlertCircle className="h-5 w-5" />
                Safety & Range Notes
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="list-disc list-inside text-sm text-gray-300 space-y-2">
                <li>Always run with a qualified range officer or safety officer present.</li>
                <li>Maintain muzzle discipline and finger indexed until ready to fire.</li>
                <li>Mandatory eye and ear protection.</li>
                <li>Declare classification before each run; two attempts permitted; failed runs count.</li>
              </ul>
            </CardContent>
          </Card>

          {/* Range Checklist */}
          <Card className="bg-zinc-900 border-zinc-700">
            <CardHeader>
              <CardTitle className="text-white">Range Checklist</CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="grid md:grid-cols-2 gap-2 text-sm">
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="h-4 w-4 mt-0.5 text-primary flex-shrink-0" />
                  <span className="text-gray-300">Two targets placed 1 yd apart</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="h-4 w-4 mt-0.5 text-primary flex-shrink-0" />
                  <span className="text-gray-300">Shooter at 5 yards in front of left target</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="h-4 w-4 mt-0.5 text-primary flex-shrink-0" />
                  <span className="text-gray-300">3×5 card in right target alpha (or 1" left head alpha for Seanalair)</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="h-4 w-4 mt-0.5 text-primary flex-shrink-0" />
                  <span className="text-gray-300">Concealed IWB holster, ≥2 magazines, extra ammo</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="h-4 w-4 mt-0.5 text-primary flex-shrink-0" />
                  <span className="text-gray-300">Eye & ear protection, timer, RO present</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="h-4 w-4 mt-0.5 text-primary flex-shrink-0" />
                  <span className="text-gray-300">Verbal declaration of intended classification</span>
                </li>
              </ul>
            </CardContent>
          </Card>

          {/* Collaborator Appreciation */}
          <Card className="mt-8 bg-zinc-900 border-zinc-700">
            <CardHeader>
              <CardTitle className="text-white">Collaborator Appreciation</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <p className="text-gray-300 text-center mx-auto max-w-4xl">
                At Tactical Advantage, we pride ourselves on due diligence, testing, and peer review. There are many incredible instructors we have been fortunate to train, work and learn from. With that said, The Crucible, was developed over more than a year. During that time, significant input was gathered and implemented from some of the most prominent trainers, shooters and training conglomerates operating in the shooting realm today. Either BETA testing or providing valuable feedback. Those listed below have in no small way had dramatic impact on the development of The Crucible. I thank them for their wisdom and most of all their friendship.
              </p>
              <div className="grid md:grid-cols-3 gap-4 text-center pl-[125px] pr-[125px]">
                <ul className="space-y-2 text-gray-300">
                  <li>Memphis Beech</li>
                  <li>Gabe White</li>
                  <li>Derek Wright</li>
                  <li>Derek Watkins</li>
                  <li>Dan Brady</li>
                  <li>Guy Naimo</li>
                </ul>
                <ul className="space-y-2 text-gray-300">
                  <li>Hunter Freeland</li>
                  <li>Tim Herron</li>
                  <li>John Correia</li>
                  <li>Neil Weidner</li>
                  <li>Scotty Cronin</li>
                  <li>Jonathan Willis</li>
                </ul>
                <ul className="space-y-2 text-gray-300">
                  <li>Dr. Jimmy Turner</li>
                  <li>Jeff Whitaker</li>
                  <li>Jim Shanahan</li>
                  <li>Dan Kushner</li>
                  <li>Riley Bowman</li>
                  <li>Jesse Johnson</li>
                </ul>
              </div>
              <p className="text-gray-300 text-center font-semibold mt-4">
                Many many more!
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </Layout>
  );
}
