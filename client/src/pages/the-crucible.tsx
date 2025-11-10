
import { Layout } from "@/components/Layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Target, Clock, Award, CheckCircle2, AlertCircle } from "lucide-react";

export default function TheCrucible() {
  return (
    <Layout>
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-foreground mb-4">The Crucible</h1>
          <p className="text-muted-foreground font-normal text-[18px]">Welcome Competitor
          <br /><br />
          You believe you have mastered your craft? You believe you can apply skill under pressure? Do you believe you are prepared for what's next?  We shall see.

          The Crucible is not a test of brute speed or sheer force. It is a crucible—a severe test of character and skill in shooting. This challenge is designed to push you to the limits of your cognitive ability, forcing you to apply significant throttle control, precision, and emotional discipline in a short but complex course of fire. This is a mental challenge first, and a shooting challenge second.

          Are you prepared to face The Crucible?</p>
        </div>

        {/* The Challenge */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5" />
              The Challenge
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-muted-foreground">Competitors will engage a series of precision targets under strict time constraints, with varying cognitive loading introduced at each stage. The course of fire will test your ability to transition between speed and precision, memory, and your capacity to remain calm and focused when the pressure mounts.</p>
            <Separator />
            <div>
              <h3 className="font-semibold mb-2">Gear Required:</h3>
              <ul className="list-disc list-inside space-y-1 text-muted-foreground">
                <li>Service-grade pistol</li>
                <li>IWB holster (shot from concealment)</li>
                <li>Minimum 2 magazines</li>
                <li>Eye and ear protection</li>
              </ul>
            </div>
            <Separator />
            <div>
              <h3 className="font-semibold mb-2">Course Layout:</h3>
              <p className="text-muted-foreground">
                Two targets 1 yard apart. Shooter starts 5 yards in front of the LEFT target. 
                Place a 3×5 card inside the RIGHT target's alpha zone (or use a 1" head alpha on the LEFT for Seanalair).
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Classifications */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Award className="h-5 w-5" />
              Classifications
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-muted-foreground">We have tiered this challenge into three distinct classifications. Each represents a higher level of mastery and a greater test of emotional, mental, and physical control. You MUST declare your chosen classification upon request of testing. You may only compete in one classification per testing session.</p>
            <div className="grid md:grid-cols-3 gap-4">
              <div className="p-4 border rounded-lg">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="font-bold">Laoch</h3>
                  <Badge>PAR 7.0s</Badge>
                </div>
                <p className="text-sm text-muted-foreground">Standard classification</p>
              </div>
              <div className="p-4 border rounded-lg">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="font-bold">Gallowglass</h3>
                  <Badge variant="secondary">PAR 6.0s</Badge>
                </div>
                <p className="text-sm text-muted-foreground">Advanced classification</p>
              </div>
              <div className="p-4 border rounded-lg">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="font-bold">Seanalair</h3>
                  <Badge variant="destructive">PAR 6.0s</Badge>
                </div>
                <p className="text-sm text-muted-foreground">1" head alpha on left</p>
              </div>
            </div>
            <div className="bg-muted p-4 rounded-lg">
              <p className="text-sm font-medium">Scoring: Any round outside the designated aim area = failure. Two attempts allowed. Declare intended classification before the run.</p>
            </div>
          </CardContent>
        </Card>

        {/* Step-by-Step Procedure */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5" />
              Quick Step-by-Step Run Procedure
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-3">
              <div className="flex gap-3">
                <div className="flex-shrink-0 w-8 h-8 bg-primary text-primary-foreground rounded-full flex items-center justify-center font-bold">1</div>
                <div className="flex-1">
                  <h4 className="font-semibold mb-1">Setup</h4>
                  <ul className="list-disc list-inside text-sm text-muted-foreground space-y-1">
                    <li>Place targets 1 yard apart. Mark shooter position 5 yards from left target.</li>
                    <li>Insert 3×5 card in right target alpha zone (or set 1" head alpha on left for Seanalair).</li>
                    <li>Holster concealed (IWB), mags loaded, eye/ear protection on.</li>
                  </ul>
                </div>
              </div>

              <div className="flex gap-3">
                <div className="flex-shrink-0 w-8 h-8 bg-primary text-primary-foreground rounded-full flex items-center justify-center font-bold">2</div>
                <div className="flex-1">
                  <h4 className="font-semibold mb-1">Declaration</h4>
                  <p className="text-sm text-muted-foreground">Verbally declare which classification you are attempting.</p>
                </div>
              </div>

              <div className="flex gap-3">
                <div className="flex-shrink-0 w-8 h-8 bg-primary text-primary-foreground rounded-full flex items-center justify-center font-bold">3</div>
                <div className="flex-1">
                  <h4 className="font-semibold mb-1">Ready</h4>
                  <p className="text-sm text-muted-foreground">Start at the 5-yard line, handgun holstered.</p>
                </div>
              </div>

              <div className="flex gap-3">
                <div className="flex-shrink-0 w-8 h-8 bg-primary text-primary-foreground rounded-full flex items-center justify-center font-bold">4</div>
                <div className="flex-1">
                  <h4 className="font-semibold mb-1">Start Signal</h4>
                  <p className="text-sm text-muted-foreground">On the beep, draw and begin.</p>
                </div>
              </div>

              <div className="flex gap-3">
                <div className="flex-shrink-0 w-8 h-8 bg-primary text-primary-foreground rounded-full flex items-center justify-center font-bold">5</div>
                <div className="flex-1">
                  <h4 className="font-semibold mb-1">Left Target (Shots 1–5)</h4>
                  <ul className="list-disc list-inside text-sm text-muted-foreground space-y-1">
                    <li>Shot 1: draw and fire one shot into left-target head alpha (1" head alpha for Seanalair if attempting).</li>
                    <li>Shots 2–5: four body shots on left target.</li>
                  </ul>
                </div>
              </div>

              <div className="flex gap-3">
                <div className="flex-shrink-0 w-8 h-8 bg-primary text-primary-foreground rounded-full flex items-center justify-center font-bold">6</div>
                <div className="flex-1">
                  <h4 className="font-semibold mb-1">Reload</h4>
                  <p className="text-sm text-muted-foreground">While moving to the right target, perform a magazine change safely.</p>
                </div>
              </div>

              <div className="flex gap-3">
                <div className="flex-shrink-0 w-8 h-8 bg-primary text-primary-foreground rounded-full flex items-center justify-center font-bold">7</div>
                <div className="flex-1">
                  <h4 className="font-semibold mb-1">Right Target (Shots 6–10)</h4>
                  <p className="text-sm text-muted-foreground">Engage the 3×5 card in the right target alpha with five shots.</p>
                </div>
              </div>

              <div className="flex gap-3">
                <div className="flex-shrink-0 w-8 h-8 bg-primary text-primary-foreground rounded-full flex items-center justify-center font-bold">8</div>
                <div className="flex-1">
                  <h4 className="font-semibold mb-1">Finish & Scoring</h4>
                  <p className="text-sm text-muted-foreground">Any round outside designated areas = failure for that run. Two attempts total. Both runs must be clean for hat recognition.</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Suggested Time Splits */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5" />
              Suggested Time Splits (Training Rhythm)
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div>
              <h3 className="font-bold mb-3 flex items-center gap-2">
                Laoch — 7.0s total
              </h3>
              <ul className="list-disc list-inside text-sm text-muted-foreground space-y-1">
                <li>Draw + head shot: 1.0s</li>
                <li>Left body 4 shots: 2.5s (≈0.625s/shot)</li>
                <li>Reload + move: 1.0s</li>
                <li>Right 5 shots: 2.5s (≈0.5s/shot)</li>
              </ul>
            </div>

            <div>
              <h3 className="font-bold mb-3 flex items-center gap-2">
                Gallowglass — 6.0s total
              </h3>
              <ul className="list-disc list-inside text-sm text-muted-foreground space-y-1">
                <li>Draw + head shot: 0.9s</li>
                <li>Left body 4 shots: 2.0s (0.5s/shot)</li>
                <li>Reload + move: 0.6s</li>
                <li>Right 5 shots: 2.5s (0.5s/shot)</li>
              </ul>
            </div>

            <div>
              <h3 className="font-bold mb-3 flex items-center gap-2">
                Seanalair — 6.0s total (1" head alpha)
              </h3>
              <ul className="list-disc list-inside text-sm text-muted-foreground space-y-1">
                <li>Draw + 1" head shot: 1.0s</li>
                <li>Left body 4 shots: 1.8s (≈0.45s/shot)</li>
                <li>Reload + move: 0.6s</li>
                <li>Right 5 shots: 2.6s</li>
              </ul>
            </div>
          </CardContent>
        </Card>

        {/* 6-Week Training Progression */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Target className="h-5 w-5" />
              6-Week Training Progression
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <h3 className="font-bold mb-2">Weeks 1–2 (Fundamentals)</h3>
              <ul className="list-disc list-inside text-sm text-muted-foreground space-y-1">
                <li>Dry draws to first-shot address, 10–15 reps.</li>
                <li>Static double-taps and 4-round strings at 5 yds (focus recoil control).</li>
                <li>Slow, deliberate magazine changes.</li>
              </ul>
            </div>

            <div>
              <h3 className="font-bold mb-2">Weeks 3–4 (Timing & Transitions)</h3>
              <ul className="list-disc list-inside text-sm text-muted-foreground space-y-1">
                <li>Timed drills: draw + head shot + 4 body at 5 yds with a 3–4s window.</li>
                <li>Practice reloads while moving eyes to the next target.</li>
                <li>Right-target practice: 3×5 card, 5 rounds at descending cadences.</li>
              </ul>
            </div>

            <div>
              <h3 className="font-bold mb-2">Week 5 (Integration)</h3>
              <ul className="list-disc list-inside text-sm text-muted-foreground space-y-1">
                <li>Full sequence on timer at Laoch PAR (7s). Record runs and fix weakest link.</li>
              </ul>
            </div>

            <div>
              <h3 className="font-bold mb-2">Week 6 (Qualification)</h3>
              <ul className="list-disc list-inside text-sm text-muted-foreground space-y-1">
                <li>Full attempt sessions with declared classifications. For hat recognition both runs must be clean.</li>
              </ul>
            </div>
          </CardContent>
        </Card>

        {/* Safety & Range Notes */}
        <Card className="mb-8 border-destructive">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-destructive">
              <AlertCircle className="h-5 w-5" />
              Safety & Range Notes
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="list-disc list-inside text-sm space-y-2">
              <li>Always run with a qualified range officer or safety officer present.</li>
              <li>Maintain muzzle discipline and finger indexed until ready to fire.</li>
              <li>Mandatory eye and ear protection.</li>
              <li>Declare classification before each run; two attempts permitted; failed runs count.</li>
            </ul>
          </CardContent>
        </Card>

        {/* Range Checklist */}
        <Card>
          <CardHeader>
            <CardTitle>Range Checklist</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="grid md:grid-cols-2 gap-2 text-sm">
              <li className="flex items-start gap-2">
                <CheckCircle2 className="h-4 w-4 mt-0.5 text-primary flex-shrink-0" />
                <span>Two targets placed 1 yd apart</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle2 className="h-4 w-4 mt-0.5 text-primary flex-shrink-0" />
                <span>Shooter at 5 yards in front of left target</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle2 className="h-4 w-4 mt-0.5 text-primary flex-shrink-0" />
                <span>3×5 card in right target alpha (or 1" left head alpha for Seanalair)</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle2 className="h-4 w-4 mt-0.5 text-primary flex-shrink-0" />
                <span>Concealed IWB holster, ≥2 magazines, extra ammo</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle2 className="h-4 w-4 mt-0.5 text-primary flex-shrink-0" />
                <span>Eye & ear protection, timer, RO present</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle2 className="h-4 w-4 mt-0.5 text-primary flex-shrink-0" />
                <span>Verbal declaration of intended classification</span>
              </li>
            </ul>
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}
