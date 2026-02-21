import { Layout } from "@/components/Layout";
import { SEO } from "@/components/SEO";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Link } from "wouter";
import { useState } from "react";
import {
  CheckCircle,
  XCircle,
  ChevronRight,
  ArrowLeft,
  Shield,
  Target,
} from "lucide-react";

interface QuizQuestion {
  id: number;
  question: string;
  options: string[];
  correctIndex: number;
  explanation: string;
}

const quizQuestions: QuizQuestion[] = [
  {
    id: 1,
    question: "Can you legally carry a concealed handgun into a gas station in New Mexico?",
    options: ["Yes", "No", "Only if they don't sell alcohol", "Only with written permission"],
    correctIndex: 0,
    explanation: "Yes. Gas stations are not prohibited locations under New Mexico concealed carry law, even if they sell alcohol, as long as alcohol is not their primary business.",
  },
  {
    id: 2,
    question: "Can you legally carry a concealed handgun into a restaurant that serves alcohol in New Mexico?",
    options: [
      "Never",
      "Yes, as long as they serve more food than alcohol",
      "Yes, but you cannot consume alcohol",
      "Only with the owner's permission",
    ],
    correctIndex: 2,
    explanation: "You may carry in restaurants that serve alcohol as long as you do not consume alcohol while carrying. However, establishments where alcohol sales are the primary business (bars) are prohibited.",
  },
  {
    id: 3,
    question: "What is the minimum age to obtain a New Mexico Concealed Carry License?",
    options: ["18 years old", "19 years old", "21 years old", "25 years old"],
    correctIndex: 2,
    explanation: "You must be at least 21 years old to apply for a New Mexico Concealed Carry License.",
  },
  {
    id: 4,
    question: "Which of the following is a prohibited location for concealed carry in NM?",
    options: [
      "Grocery stores",
      "Public parks",
      "Schools and school grounds",
      "Movie theaters",
    ],
    correctIndex: 2,
    explanation: "Schools and school grounds are prohibited locations for concealed carry in New Mexico. Other prohibited locations include courthouses, federal buildings, and establishments where alcohol is the primary business.",
  },
  {
    id: 5,
    question: "Can you carry a concealed handgun into a post office in New Mexico?",
    options: [
      "Yes, with your NM CCL",
      "No, it is a federal building",
      "Only in the parking lot",
      "Only if it's in your vehicle",
    ],
    correctIndex: 1,
    explanation: "No. Post offices are federal property, and carrying firearms into federal buildings is prohibited by federal law regardless of your state concealed carry license.",
  },
  {
    id: 6,
    question: "Does New Mexico require you to qualify with a specific caliber handgun?",
    options: [
      "Yes, .38 caliber or higher",
      "Yes, 9mm or higher",
      "No, any caliber is acceptable",
      "You qualify with the caliber(s) you want listed on your license",
    ],
    correctIndex: 3,
    explanation: "Your NM CCL will list the caliber(s) and type(s) of handgun you qualified with. You may carry any caliber equal to or smaller than your qualifying caliber.",
  },
  {
    id: 7,
    question: "How often must you renew your New Mexico Concealed Carry License?",
    options: ["Every year", "Every 2 years", "Every 4 years", "Every 5 years"],
    correctIndex: 2,
    explanation: "New Mexico CCLs must be renewed every 4 years. Additionally, a 2-year refresher course is required between renewals.",
  },
  {
    id: 8,
    question: "If an establishment posts a 'No Firearms' sign, is it legally binding in New Mexico?",
    options: [
      "Yes, you can be arrested for trespassing immediately",
      "No, but they can ask you to leave",
      "Only if the sign meets specific legal requirements",
      "Yes, it carries a $500 fine",
    ],
    correctIndex: 1,
    explanation: "In New Mexico, 'No Firearms' signs do not carry the force of law on their own. However, if you are asked to leave and refuse, you can be charged with trespassing. It is generally advisable to respect the wishes of private property owners.",
  },
];

type QuizState = "intro" | "question" | "result" | "leadCapture" | "complete";

export default function CCWQuiz() {
  const [state, setState] = useState<QuizState>("intro");
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);
  const [showExplanation, setShowExplanation] = useState(false);
  const [score, setScore] = useState(0);
  const [answers, setAnswers] = useState<(number | null)[]>(
    new Array(quizQuestions.length).fill(null)
  );

  // Lead capture state
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [hasCCL, setHasCCL] = useState<string>("");

  const totalQuestions = quizQuestions.length;
  const progress = state === "intro" ? 0 : ((currentQuestion + 1) / totalQuestions) * 100;

  const handleAnswer = () => {
    if (selectedAnswer === null) return;

    const newAnswers = [...answers];
    newAnswers[currentQuestion] = selectedAnswer;
    setAnswers(newAnswers);

    if (selectedAnswer === quizQuestions[currentQuestion].correctIndex) {
      setScore(score + 1);
    }

    setShowExplanation(true);
  };

  const handleNext = () => {
    if (currentQuestion < totalQuestions - 1) {
      setCurrentQuestion(currentQuestion + 1);
      setSelectedAnswer(null);
      setShowExplanation(false);
    } else {
      setState("result");
    }
  };

  const getScoreMessage = () => {
    const pct = (score / totalQuestions) * 100;
    if (pct >= 90) return "Excellent! You have a strong understanding of NM concealed carry law.";
    if (pct >= 70) return "Good knowledge! A refresher course could help fill in the gaps.";
    if (pct >= 50) return "You have a basic understanding, but there's room to learn more.";
    return "Concealed carry laws can be complex. Our course covers everything you need to know.";
  };

  const handleLeadSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // In a real implementation, this would POST to an API endpoint
    setState("complete");
  };

  return (
    <Layout>
      <SEO
        title="CCW Knowledge Quiz | Practical Defense Training"
        description="Test your New Mexico concealed carry knowledge with our free quiz. Learn about NM CCL laws, carry locations, and licensing requirements."
      />

      <div className="min-h-[80vh] bg-background">
        {/* Hero (intro only) */}
        {state === "intro" && (
          <>
            <section className="relative bg-zinc-950 py-20 px-4 sm:px-6 lg:px-8">
              <div className="max-w-3xl mx-auto text-center">
                <div className="inline-flex items-center gap-2 bg-[#006d7a]/10 rounded-full px-4 py-2 mb-6">
                  <Shield className="h-5 w-5 text-[#006d7a]" />
                  <span className="text-[#006d7a] text-sm font-medium">Free Knowledge Assessment</span>
                </div>
                <h1 className="font-heading text-5xl sm:text-6xl uppercase tracking-widest text-white mb-6">
                  NM CCW Knowledge Quiz
                </h1>
                <p className="text-xl text-zinc-400 max-w-2xl mx-auto leading-relaxed mb-8">
                  Think you know New Mexico concealed carry law? Test your knowledge with our
                  {" "}{totalQuestions}-question quiz covering carry locations, licensing requirements,
                  and legal considerations.
                </p>
                <Button
                  size="lg"
                  onClick={() => setState("question")}
                  className="bg-[#006d7a] hover:bg-[#005a66] text-white text-lg px-8"
                >
                  Start Quiz
                  <ChevronRight className="ml-2 h-5 w-5" />
                </Button>
              </div>
            </section>

            {/* Info Cards */}
            <section className="py-12 px-4 sm:px-6 lg:px-8">
              <div className="max-w-3xl mx-auto grid md:grid-cols-3 gap-6">
                <Card className="border-border text-center">
                  <CardContent className="p-6">
                    <Target className="h-8 w-8 text-[#006d7a] mx-auto mb-3" />
                    <h3 className="font-semibold text-foreground mb-1">{totalQuestions} Questions</h3>
                    <p className="text-sm text-muted-foreground">NM-specific CCW law</p>
                  </CardContent>
                </Card>
                <Card className="border-border text-center">
                  <CardContent className="p-6">
                    <Shield className="h-8 w-8 text-[#006d7a] mx-auto mb-3" />
                    <h3 className="font-semibold text-foreground mb-1">Instant Results</h3>
                    <p className="text-sm text-muted-foreground">See explanations for each answer</p>
                  </CardContent>
                </Card>
                <Card className="border-border text-center">
                  <CardContent className="p-6">
                    <CheckCircle className="h-8 w-8 text-[#006d7a] mx-auto mb-3" />
                    <h3 className="font-semibold text-foreground mb-1">Free</h3>
                    <p className="text-sm text-muted-foreground">No account required</p>
                  </CardContent>
                </Card>
              </div>
            </section>
          </>
        )}

        {/* Question State */}
        {state === "question" && (
          <section className="py-12 px-4 sm:px-6 lg:px-8">
            <div className="max-w-2xl mx-auto">
              {/* Progress */}
              <div className="mb-8">
                <div className="flex justify-between text-sm text-muted-foreground mb-2">
                  <span>Question {currentQuestion + 1} of {totalQuestions}</span>
                  <span>{Math.round(progress)}%</span>
                </div>
                <Progress value={progress} className="h-2" />
              </div>

              {/* Question Card */}
              <Card className="border-border">
                <CardContent className="p-8">
                  <h2 className="text-xl font-semibold text-foreground mb-6">
                    {quizQuestions[currentQuestion].question}
                  </h2>

                  <RadioGroup
                    value={selectedAnswer !== null ? String(selectedAnswer) : undefined}
                    onValueChange={(val) => {
                      if (!showExplanation) {
                        setSelectedAnswer(parseInt(val));
                      }
                    }}
                    className="space-y-3"
                  >
                    {quizQuestions[currentQuestion].options.map((option, index) => {
                      let optionClass = "border-border hover:border-[#006d7a]/50";
                      if (showExplanation) {
                        if (index === quizQuestions[currentQuestion].correctIndex) {
                          optionClass = "border-green-500 bg-green-500/5";
                        } else if (index === selectedAnswer && index !== quizQuestions[currentQuestion].correctIndex) {
                          optionClass = "border-red-500 bg-red-500/5";
                        }
                      } else if (selectedAnswer === index) {
                        optionClass = "border-[#006d7a] bg-[#006d7a]/5";
                      }

                      return (
                        <label
                          key={index}
                          className={`flex items-center gap-3 p-4 rounded-lg border cursor-pointer transition-all ${optionClass}`}
                        >
                          <RadioGroupItem value={String(index)} disabled={showExplanation} />
                          <span className="text-foreground">{option}</span>
                          {showExplanation && index === quizQuestions[currentQuestion].correctIndex && (
                            <CheckCircle className="h-5 w-5 text-green-500 ml-auto" />
                          )}
                          {showExplanation && index === selectedAnswer && index !== quizQuestions[currentQuestion].correctIndex && (
                            <XCircle className="h-5 w-5 text-red-500 ml-auto" />
                          )}
                        </label>
                      );
                    })}
                  </RadioGroup>

                  {/* Explanation */}
                  {showExplanation && (
                    <div className="mt-6 p-4 rounded-lg bg-zinc-950 border border-border">
                      <p className="text-sm text-muted-foreground leading-relaxed">
                        <span className="font-semibold text-foreground">Explanation: </span>
                        {quizQuestions[currentQuestion].explanation}
                      </p>
                    </div>
                  )}

                  {/* Actions */}
                  <div className="mt-6 flex justify-between">
                    {currentQuestion > 0 && !showExplanation && (
                      <Button
                        variant="ghost"
                        onClick={() => {
                          setCurrentQuestion(currentQuestion - 1);
                          setSelectedAnswer(answers[currentQuestion - 1]);
                          setShowExplanation(false);
                        }}
                      >
                        <ArrowLeft className="mr-2 h-4 w-4" />
                        Previous
                      </Button>
                    )}
                    <div className="ml-auto">
                      {!showExplanation ? (
                        <Button
                          onClick={handleAnswer}
                          disabled={selectedAnswer === null}
                          className="bg-[#006d7a] hover:bg-[#005a66] text-white"
                        >
                          Submit Answer
                        </Button>
                      ) : (
                        <Button
                          onClick={handleNext}
                          className="bg-[#006d7a] hover:bg-[#005a66] text-white"
                        >
                          {currentQuestion < totalQuestions - 1 ? "Next Question" : "See Results"}
                          <ChevronRight className="ml-2 h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </section>
        )}

        {/* Results State */}
        {state === "result" && (
          <section className="py-12 px-4 sm:px-6 lg:px-8">
            <div className="max-w-2xl mx-auto text-center">
              <div className="mb-8">
                <div className="inline-flex items-center justify-center w-24 h-24 rounded-full bg-[#006d7a]/10 mb-4">
                  <span className="text-3xl font-bold text-[#006d7a]">
                    {score}/{totalQuestions}
                  </span>
                </div>
                <h2 className="text-3xl font-bold text-foreground mb-2">Quiz Complete!</h2>
                <p className="text-lg text-muted-foreground">
                  You scored {score} out of {totalQuestions} ({Math.round((score / totalQuestions) * 100)}%)
                </p>
                <p className="text-muted-foreground mt-2">{getScoreMessage()}</p>
              </div>

              <Card className="border-border mb-8">
                <CardContent className="p-6">
                  <h3 className="font-semibold text-foreground mb-4">
                    Want to learn more about NM concealed carry?
                  </h3>
                  <p className="text-sm text-muted-foreground mb-4">
                    Enter your info below and we'll send you helpful resources. If you have your CCL,
                    we can also send you renewal reminders so you never miss a deadline.
                  </p>
                  <Button
                    onClick={() => setState("leadCapture")}
                    className="bg-[#006d7a] hover:bg-[#005a66] text-white"
                  >
                    Get Resources & Reminders
                    <ChevronRight className="ml-2 h-4 w-4" />
                  </Button>
                </CardContent>
              </Card>

              <div className="flex flex-wrap justify-center gap-4">
                <Link href="/online-nm-concealed-carry-course">
                  <Button className="bg-[#006d7a] hover:bg-[#005a66] text-white">
                    Explore Our Online Course
                  </Button>
                </Link>
                <Link href="/courses">
                  <Button variant="outline" className="border-border">
                    View All Courses
                  </Button>
                </Link>
              </div>
            </div>
          </section>
        )}

        {/* Lead Capture State */}
        {state === "leadCapture" && (
          <section className="py-12 px-4 sm:px-6 lg:px-8">
            <div className="max-w-md mx-auto">
              <Card className="border-border">
                <CardContent className="p-8">
                  <h2 className="text-xl font-semibold text-foreground mb-2 text-center">
                    Get Resources & Renewal Reminders
                  </h2>
                  <p className="text-sm text-muted-foreground mb-6 text-center">
                    We'll send you helpful NM concealed carry info and never spam you.
                  </p>

                  <form onSubmit={handleLeadSubmit} className="space-y-4">
                    <div>
                      <Label htmlFor="name">Name</Label>
                      <Input
                        id="name"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        required
                        placeholder="Your name"
                      />
                    </div>
                    <div>
                      <Label htmlFor="email">Email</Label>
                      <Input
                        id="email"
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        required
                        placeholder="your@email.com"
                      />
                    </div>
                    <div>
                      <Label htmlFor="phone">Phone (optional)</Label>
                      <Input
                        id="phone"
                        type="tel"
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        placeholder="(505) 555-0123"
                      />
                    </div>

                    <div>
                      <Label className="mb-2 block">Do you currently have a NM CCL?</Label>
                      <RadioGroup value={hasCCL} onValueChange={setHasCCL}>
                        <label className="flex items-center gap-2 p-3 rounded-lg border border-border cursor-pointer hover:border-[#006d7a]/50">
                          <RadioGroupItem value="yes" />
                          <span className="text-sm text-foreground">Yes, I have my CCL</span>
                        </label>
                        <label className="flex items-center gap-2 p-3 rounded-lg border border-border cursor-pointer hover:border-[#006d7a]/50 mt-2">
                          <RadioGroupItem value="no" />
                          <span className="text-sm text-foreground">No, not yet</span>
                        </label>
                      </RadioGroup>
                    </div>

                    <Button
                      type="submit"
                      className="w-full bg-[#006d7a] hover:bg-[#005a66] text-white"
                    >
                      Submit
                    </Button>

                    <Button
                      type="button"
                      variant="ghost"
                      className="w-full text-muted-foreground"
                      onClick={() => setState("complete")}
                    >
                      Skip this step
                    </Button>
                  </form>
                </CardContent>
              </Card>
            </div>
          </section>
        )}

        {/* Complete State */}
        {state === "complete" && (
          <section className="py-20 px-4 sm:px-6 lg:px-8">
            <div className="max-w-2xl mx-auto text-center">
              <CheckCircle className="h-16 w-16 text-green-500 mx-auto mb-4" />
              <h2 className="text-3xl font-bold text-foreground mb-4">
                {name ? `Thanks, ${name}!` : "Thanks!"}
              </h2>
              <p className="text-lg text-muted-foreground mb-8">
                {email
                  ? "We'll send you helpful resources and renewal reminders. Check your email!"
                  : "Here are some next steps to continue your concealed carry journey."}
              </p>

              <div className="grid sm:grid-cols-2 gap-4 max-w-lg mx-auto">
                <Link href="/online-nm-concealed-carry-course">
                  <Card className="border-border hover:border-[#006d7a]/50 transition-all cursor-pointer group h-full">
                    <CardContent className="p-6 text-center">
                      <Shield className="h-8 w-8 text-[#006d7a] mx-auto mb-2" />
                      <h3 className="font-semibold text-foreground group-hover:text-[#006d7a] transition-colors">
                        Online CCW Course
                      </h3>
                      <p className="text-xs text-muted-foreground mt-1">Start at your own pace</p>
                    </CardContent>
                  </Card>
                </Link>
                <Link href="/schedule-list">
                  <Card className="border-border hover:border-[#006d7a]/50 transition-all cursor-pointer group h-full">
                    <CardContent className="p-6 text-center">
                      <Target className="h-8 w-8 text-[#006d7a] mx-auto mb-2" />
                      <h3 className="font-semibold text-foreground group-hover:text-[#006d7a] transition-colors">
                        View Schedule
                      </h3>
                      <p className="text-xs text-muted-foreground mt-1">Find your next class</p>
                    </CardContent>
                  </Card>
                </Link>
              </div>
            </div>
          </section>
        )}
      </div>
    </Layout>
  );
}
