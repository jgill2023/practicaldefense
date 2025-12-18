import { useState } from "react";
import Layout from "@/components/Layout";
import { HeroSection, TitleCard, ComicPanel } from "@/components/RACTheme";
import raccHeaderImage from "@assets/ApacheRACC-Header_1766030105352.png";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useLocation } from "wouter";
import { useToast } from "@/hooks/use-toast";
import { useCart } from "@/components/shopping-cart";
import { useSEO, seoConfigs } from "@/hooks/use-seo";
import { BookingModal } from "@/components/BookingModal";
import { useQuery } from "@tanstack/react-query";
import type { AppointmentType } from "@shared/schema";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { CheckCircle, Phone, Globe, Mail, Calendar, Check, Minus, ShoppingCart, Clock, DollarSign } from "lucide-react";

const raccPackages = [
  {
    name: "Half Package",
    price: "$275",
    priceNum: 275,
    productId: "39894ae0-538a-47c9-80d5-02d50cf112bd",
    sessions: "5 Hours",
    people: "1",
    courseDiscount: null,
    freeAmmo: null,
    swagPacks: null,
    privateRangeCoach: true,
    fixedWeeklySlot: false,
    fixedBiWeeklySlot: false,
    flexibleScheduling: true,
    addOnHours: false,
    trainingType: "Intro",
    highlight: false,
  },
  {
    name: "Full Package",
    price: "$475",
    priceNum: 475,
    productId: "022fb18b-e016-496d-98f9-795c820dcdbd",
    sessions: "10 Hours",
    people: "1",
    courseDiscount: null,
    freeAmmo: null,
    swagPacks: null,
    privateRangeCoach: true,
    fixedWeeklySlot: false,
    fixedBiWeeklySlot: false,
    flexibleScheduling: true,
    addOnHours: false,
    trainingType: "Momentum",
    highlight: false,
  },
  {
    name: "Premium (Solo)",
    price: "$900",
    priceNum: 900,
    productId: "712196cf-1d5c-4e1a-8cdd-3b4e42371c45",
    sessions: "25 (Bi-Weekly)",
    people: "1",
    courseDiscount: null,
    freeAmmo: "100 Rds",
    swagPacks: null,
    privateRangeCoach: true,
    fixedWeeklySlot: false,
    fixedBiWeeklySlot: true,
    flexibleScheduling: false,
    addOnHours: false,
    trainingType: "Solo / Maint.",
    highlight: false,
  },
  {
    name: "Elite (Solo)",
    price: "$1,800",
    priceNum: 1800,
    productId: "b8b39a57-3746-4176-8625-b3c450d919f3",
    sessions: "50 (Weekly)",
    people: "1",
    courseDiscount: "20% Off",
    freeAmmo: "100 Rds",
    swagPacks: "1 Pack",
    privateRangeCoach: true,
    fixedWeeklySlot: true,
    fixedBiWeeklySlot: false,
    flexibleScheduling: false,
    addOnHours: true,
    trainingType: "Solo / Intensive",
    highlight: true,
  },
  {
    name: "Premium Family",
    price: "$2,250",
    priceNum: 2250,
    productId: "42025c9e-b128-4e3a-b5ef-565e872548bb",
    sessions: "25 (Bi-Weekly)",
    people: "2",
    courseDiscount: null,
    freeAmmo: "100 Rds",
    swagPacks: "2 Packs",
    privateRangeCoach: true,
    fixedWeeklySlot: false,
    fixedBiWeeklySlot: true,
    flexibleScheduling: false,
    addOnHours: false,
    trainingType: "Duo / Maint.",
    highlight: false,
  },
  {
    name: "Family Flex 75",
    price: "$3,200",
    priceNum: 3200,
    productId: "360f74aa-a138-438f-a811-d552d51edebb",
    sessions: "75 Hours",
    people: "2",
    courseDiscount: "25% Off",
    freeAmmo: "300 Rds",
    swagPacks: "2 Packs",
    privateRangeCoach: true,
    fixedWeeklySlot: false,
    fixedBiWeeklySlot: false,
    flexibleScheduling: true,
    addOnHours: false,
    trainingType: "Duo / Flexible",
    highlight: false,
  },
  {
    name: "Family Flex 100",
    price: "$3,800",
    priceNum: 3800,
    productId: "58c7534b-d395-4e04-a762-62f6ac6c6223",
    sessions: "100 Hours",
    people: "Up to 4",
    courseDiscount: "50% Off",
    freeAmmo: "400 Rds",
    swagPacks: "2 Packs",
    privateRangeCoach: true,
    fixedWeeklySlot: false,
    fixedBiWeeklySlot: false,
    flexibleScheduling: true,
    addOnHours: false,
    trainingType: "Volume / Family",
    highlight: true,
  },
  {
    name: "Elite Family",
    price: "$4,500",
    priceNum: 4500,
    productId: "cd6ca897-6294-407f-a5a9-5072658d1a61",
    sessions: "50 (Weekly)",
    people: "2",
    courseDiscount: "20% Off",
    freeAmmo: "200 Rds",
    swagPacks: "2 Packs",
    privateRangeCoach: true,
    fixedWeeklySlot: true,
    fixedBiWeeklySlot: false,
    flexibleScheduling: false,
    addOnHours: true,
    trainingType: "Duo / Legacy",
    highlight: false,
  },
];

export default function RACCProgram() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const { addToCart, isAddingToCart } = useCart();
  const [showBookingModal, setShowBookingModal] = useState(false);
  const [showTypeSelection, setShowTypeSelection] = useState(false);
  const [selectedAppointmentType, setSelectedAppointmentType] = useState<AppointmentType | null>(null);
  
  useSEO(seoConfigs.raccProgram);

  const { data: appointmentTypes = [] } = useQuery<AppointmentType[]>({
    queryKey: ["/api/appointments/types"],
  });

  const instructorId = appointmentTypes[0]?.instructorId || "";

  const handleBookPrivateTraining = () => {
    if (appointmentTypes.length === 1) {
      setSelectedAppointmentType(appointmentTypes[0]);
      setShowBookingModal(true);
    } else if (appointmentTypes.length > 1) {
      setShowTypeSelection(true);
    } else {
      toast({
        title: "No appointment types available",
        description: "Please check back later for available training sessions.",
        variant: "destructive",
      });
    }
  };

  const handleSelectType = (type: AppointmentType) => {
    setSelectedAppointmentType(type);
    setShowTypeSelection(false);
    setShowBookingModal(true);
  };

  const handleEnrollNow = (pkg: typeof raccPackages[0]) => {
    addToCart({
      productId: pkg.productId,
      quantity: 1,
      priceAtTime: pkg.priceNum,
    });
    toast({
      title: "Added to cart",
      description: `${pkg.name} has been added to your cart`,
    });
  };

  return (
    <Layout>
      <HeroSection
        title="Responsibly Armed Citizen Criterion"
        subtitle="Your personal development path to concealed carry excellence"
        backgroundImage={raccHeaderImage}
        overlay={true}
      >
        <Button
          size="lg"
          className="bg-white text-[hsl(209,90%,38%)] hover:bg-white/90 font-heading uppercase tracking-wide"
          onClick={handleBookPrivateTraining}
          data-testid="button-hero-book-appointment"
        >Book Your First RACC Session!</Button>
      </HeroSection>
      {/* Introduction Section */}
      <section className="py-16 bg-background pt-[24px] pb-[24px]">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="prose prose-lg max-w-none">
            <p className="text-base leading-relaxed text-foreground mb-6">
              Every year, Apache Solutions LLC delivers over 1,000 hours of private, one-on-one firearms training to students from all walks of life—beginners, seasoned carriers, parents, professionals, and first-time gun owners. Apache has become a true "Talent Hot Spot" (as described in The Talent Code by Daniel Coyle)—a rare environment where deep practice, expert coaching, and ignition combine to produce extraordinary skill. With over 1,000 hours of private 1-on-1 sessions taught annually, our Responsibly Armed Citizen Criterion (RACC) mirrors the small, intense training hubs Coyle studied—like the Spartanburg tennis academy or Brazilian soccer fields—that churn out disproportionate numbers of masters.
            </p>

            <p className="text-base leading-relaxed text-foreground mb-8">
              Elite performers such as Tiger Woods, Serena Williams, and even Leonardo da Vinci prove the model: private, focused repetition under a dedicated coach accelerates mastery up to 90% faster than group settings. This is our Responsibly Armed Citizen Criterion (RACC)—your personal hot spot for concealed carry performance, where every session is carefully planned, personalized, and designed to build real proficiency through the same proven formula.
            </p>
          </div>
        </div>
      </section>
      {/* How RACC Works */}
      <section className="py-16 bg-gray-50">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <TitleCard as="h2" className="text-3xl mb-8">
            How RACC Works
          </TitleCard>

          <p className="text-base leading-relaxed text-foreground mb-8 pt-[12px] pb-[12px]">
            You book flexible 1–2 hour private sessions any day of the week—mornings before work, evenings after kids' practice, or weekends—whatever fits your life. A dedicated professional trainer works exclusively with you, starting with a goal-setting conversation: "What do you want to achieve—safe home defense, confident carry, or stress-free range days?" From there, RACC unfolds in four clear phases:
          </p>

          <div className="space-y-8 mb-8">
            {/* Phase 1 */}
            <ComicPanel shadow="lg">
              <div className="mb-4">
                <h3 className="font-heading text-xl uppercase tracking-wide text-foreground mb-3">
                  Phase 1: Safety, Gear, Etiquette, Procedures, Marksmanship Master
                </h3>
              </div>
              <p className="text-foreground leading-relaxed">
                Master the 4 universal safety rules, range commands, gear fit, and precision shooting. You'll pass the Apache Level 1 B-8 live-fire test, demonstrate safe loading/unloading, field maintenance, tourniquet application, and holster familiarization (transport & carry)—all pressure-tested under real range conditions.
              </p>
            </ComicPanel>

            {/* Phase 2 */}
            <ComicPanel shadow="lg">
              <div className="mb-4">
                <h3 className="font-heading text-xl uppercase tracking-wide text-foreground mb-3">
                  Phase 2: Refined Marksmanship Performance and General Manipulations
                </h3>
              </div>
              <p className="text-foreground leading-relaxed">
                Build speed and control with the Apache Level 2 B-8, malfunction clearing, holster draw from concealment, our 2nd Level of Control, recoil management, and reactive reloads—proven under timed scrutiny.
              </p>
            </ComicPanel>

            {/* Phase 3 */}
            <ComicPanel shadow="lg">
              <div className="mb-4">
                <h3 className="font-heading text-xl uppercase tracking-wide text-foreground mb-3">
                  Phase 3: Control, Efficiency, and Complex Manipulations
                </h3>
              </div>
              <p className="text-foreground leading-relaxed">
                Master precision under pressure with Apache Pistol Metrics, proactive/retention reloads, and our 2nd Level of Control—every rep verified.
              </p>
            </ComicPanel>

            {/* Phase 4 */}
            <ComicPanel shadow="lg">
              <div className="mb-4">
                <h3 className="font-heading text-xl uppercase tracking-wide text-foreground mb-3">
                  Phase 4: Refined Control and Competency
                </h3>
              </div>
              <p className="text-foreground leading-relaxed">
                Earn final mastery with our Rite of passage, FBI Handgun Qualification, complex malfunctions, and single/support-hand shooting—your full readiness confirmed.
              </p>
            </ComicPanel>
          </div>

          <p className="text-base leading-relaxed text-foreground">
            Each phase ends with objective benchmarks—(one written exam in phase one), live-fire scores, and skill demonstrations—just like earning a new belt in martial arts. You only advance when you're truly ready, never rushed or left behind.
          </p>
        </div>
      </section>
      {/* RACC Package Comparison Chart */}
      <section className="py-16 bg-background" data-testid="racc-packages-section">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <TitleCard as="h2" className="text-3xl mb-4">
              RACC Package Comparison
            </TitleCard>
            <p className="text-muted-foreground max-w-2xl mx-auto mt-4">
              Choose the training package that best fits your goals and schedule
            </p>
          </div>

          <div className="overflow-x-auto rounded-lg border border-border shadow-professional">
            <table className="w-full min-w-[1000px]" data-testid="racc-comparison-table">
              <thead>
                <tr className="bg-[hsl(204,27%,16%)] text-white">
                  <th className="sticky left-0 z-10 bg-[hsl(204,27%,16%)] px-4 py-4 text-left font-heading uppercase tracking-wide text-sm border-r border-white/20">
                    Feature
                  </th>
                  {raccPackages.map((pkg) => (
                    <th
                      key={pkg.name}
                      className={`px-3 py-4 text-center font-heading uppercase tracking-wide text-sm min-w-[120px] ${
                        pkg.highlight ? "bg-gradient-to-b from-[hsl(209,90%,38%)] to-[hsl(190,65%,47%)]" : ""
                      }`}
                    >
                      <div className="flex flex-col items-center gap-1">
                        <span className="text-xs opacity-80">
                          {pkg.highlight && "Popular"}
                        </span>
                        <span>{pkg.name}</span>
                      </div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                <tr className="bg-[hsl(209,90%,38%)]/5">
                  <td className="sticky left-0 z-10 bg-muted px-4 py-3 font-semibold text-foreground border-r border-border">
                    Price
                  </td>
                  {raccPackages.map((pkg) => (
                    <td
                      key={pkg.name}
                      className={`px-3 py-3 text-center font-heading text-lg ${
                        pkg.highlight ? "bg-[hsl(209,90%,38%)]/10 text-[hsl(209,90%,38%)] font-bold" : "text-foreground"
                      }`}
                    >
                      {pkg.price}
                    </td>
                  ))}
                </tr>

                <tr className="bg-card border-t-2">
                  <td className="sticky left-0 z-10 bg-card px-4 py-3 border-r border-border"></td>
                  {raccPackages.map((pkg) => (
                    <td
                      key={`${pkg.name}-enroll-top`}
                      className={`px-3 py-3 text-center ${
                        pkg.highlight ? "bg-[hsl(209,90%,38%)]/5" : ""
                      }`}
                    >
                      <Button
                        onClick={() => handleEnrollNow(pkg)}
                        disabled={isAddingToCart}
                        className="w-full bg-[hsl(209,90%,38%)] hover:bg-[#FD66C5] text-white font-semibold text-xs"
                        data-testid={`button-enroll-${pkg.name.replace(/\s+/g, '-').toLowerCase()}-top`}
                      >
                        Enroll Now
                      </Button>
                    </td>
                  ))}
                </tr>

                <tr className="bg-card">
                  <td className="sticky left-0 z-10 bg-card px-4 py-3 font-medium text-foreground border-r border-border">
                    Number of Sessions
                  </td>
                  {raccPackages.map((pkg) => (
                    <td
                      key={pkg.name}
                      className={`px-3 py-3 text-center text-sm ${
                        pkg.highlight ? "bg-[hsl(209,90%,38%)]/5" : ""
                      }`}
                    >
                      {pkg.sessions}
                    </td>
                  ))}
                </tr>

                <tr className="bg-muted/50">
                  <td className="sticky left-0 z-10 bg-muted/50 px-4 py-3 font-medium text-foreground border-r border-border">
                    People Included
                  </td>
                  {raccPackages.map((pkg) => (
                    <td
                      key={pkg.name}
                      className={`px-3 py-3 text-center text-sm ${
                        pkg.highlight ? "bg-[hsl(209,90%,38%)]/5" : ""
                      }`}
                    >
                      {pkg.people}
                    </td>
                  ))}
                </tr>

                <tr className="bg-card">
                  <td className="sticky left-0 z-10 bg-card px-4 py-3 font-medium text-foreground border-r border-border">
                    Course Discount
                  </td>
                  {raccPackages.map((pkg) => (
                    <td
                      key={pkg.name}
                      className={`px-3 py-3 text-center text-sm ${
                        pkg.highlight ? "bg-[hsl(209,90%,38%)]/5" : ""
                      }`}
                    >
                      {pkg.courseDiscount ? (
                        <span className="text-[hsl(142,76%,36%)] font-semibold">{pkg.courseDiscount}</span>
                      ) : (
                        <Minus className="w-4 h-4 text-muted-foreground mx-auto" />
                      )}
                    </td>
                  ))}
                </tr>

                <tr className="bg-muted/50">
                  <td className="sticky left-0 z-10 bg-muted/50 px-4 py-3 font-medium text-foreground border-r border-border">
                    Free Ammo
                  </td>
                  {raccPackages.map((pkg) => (
                    <td
                      key={pkg.name}
                      className={`px-3 py-3 text-center text-sm ${
                        pkg.highlight ? "bg-[hsl(209,90%,38%)]/5" : ""
                      }`}
                    >
                      {pkg.freeAmmo ? (
                        <span className="text-[hsl(44,89%,45%)] font-semibold">{pkg.freeAmmo}</span>
                      ) : (
                        <Minus className="w-4 h-4 text-muted-foreground mx-auto" />
                      )}
                    </td>
                  ))}
                </tr>

                <tr className="bg-card">
                  <td className="sticky left-0 z-10 bg-card px-4 py-3 font-medium text-foreground border-r border-border">
                    Swag Packs
                  </td>
                  {raccPackages.map((pkg) => (
                    <td
                      key={pkg.name}
                      className={`px-3 py-3 text-center text-sm ${
                        pkg.highlight ? "bg-[hsl(209,90%,38%)]/5" : ""
                      }`}
                    >
                      {pkg.swagPacks ? (
                        <span className="font-medium">{pkg.swagPacks}</span>
                      ) : (
                        <Minus className="w-4 h-4 text-muted-foreground mx-auto" />
                      )}
                    </td>
                  ))}
                </tr>

                <tr className="bg-muted/50">
                  <td className="sticky left-0 z-10 bg-muted/50 px-4 py-3 font-medium text-foreground border-r border-border">
                    Private Range & Coach
                  </td>
                  {raccPackages.map((pkg) => (
                    <td
                      key={pkg.name}
                      className={`px-3 py-3 text-center ${
                        pkg.highlight ? "bg-[hsl(209,90%,38%)]/5" : ""
                      }`}
                    >
                      {pkg.privateRangeCoach ? (
                        <Check className="w-5 h-5 text-[hsl(209,90%,38%)] mx-auto" />
                      ) : (
                        <Minus className="w-4 h-4 text-muted-foreground mx-auto" />
                      )}
                    </td>
                  ))}
                </tr>

                <tr className="bg-card">
                  <td className="sticky left-0 z-10 bg-card px-4 py-3 font-medium text-foreground border-r border-border">
                    Fixed Weekly Slot
                  </td>
                  {raccPackages.map((pkg) => (
                    <td
                      key={pkg.name}
                      className={`px-3 py-3 text-center ${
                        pkg.highlight ? "bg-[hsl(209,90%,38%)]/5" : ""
                      }`}
                    >
                      {pkg.fixedWeeklySlot ? (
                        <Check className="w-5 h-5 text-[hsl(209,90%,38%)] mx-auto" />
                      ) : (
                        <Minus className="w-4 h-4 text-muted-foreground mx-auto" />
                      )}
                    </td>
                  ))}
                </tr>

                <tr className="bg-muted/50">
                  <td className="sticky left-0 z-10 bg-muted/50 px-4 py-3 font-medium text-foreground border-r border-border">
                    Fixed Bi-Weekly Slot
                  </td>
                  {raccPackages.map((pkg) => (
                    <td
                      key={pkg.name}
                      className={`px-3 py-3 text-center ${
                        pkg.highlight ? "bg-[hsl(209,90%,38%)]/5" : ""
                      }`}
                    >
                      {pkg.fixedBiWeeklySlot ? (
                        <Check className="w-5 h-5 text-[hsl(209,90%,38%)] mx-auto" />
                      ) : (
                        <Minus className="w-4 h-4 text-muted-foreground mx-auto" />
                      )}
                    </td>
                  ))}
                </tr>

                <tr className="bg-card">
                  <td className="sticky left-0 z-10 bg-card px-4 py-3 font-medium text-foreground border-r border-border">
                    Flexible Scheduling
                  </td>
                  {raccPackages.map((pkg) => (
                    <td
                      key={pkg.name}
                      className={`px-3 py-3 text-center ${
                        pkg.highlight ? "bg-[hsl(209,90%,38%)]/5" : ""
                      }`}
                    >
                      {pkg.flexibleScheduling ? (
                        <Check className="w-5 h-5 text-[hsl(209,90%,38%)] mx-auto" />
                      ) : (
                        <Minus className="w-4 h-4 text-muted-foreground mx-auto" />
                      )}
                    </td>
                  ))}
                </tr>

                <tr className="bg-muted/50">
                  <td className="sticky left-0 z-10 bg-muted/50 px-4 py-3 font-medium text-foreground border-r border-border">
                    $40 Add-On Hours
                  </td>
                  {raccPackages.map((pkg) => (
                    <td
                      key={pkg.name}
                      className={`px-3 py-3 text-center ${
                        pkg.highlight ? "bg-[hsl(209,90%,38%)]/5" : ""
                      }`}
                    >
                      {pkg.addOnHours ? (
                        <Check className="w-5 h-5 text-[hsl(209,90%,38%)] mx-auto" />
                      ) : (
                        <Minus className="w-4 h-4 text-muted-foreground mx-auto" />
                      )}
                    </td>
                  ))}
                </tr>

                <tr className="bg-[hsl(204,27%,16%)] text-white">
                  <td className="sticky left-0 z-10 bg-[hsl(204,27%,16%)] px-4 py-3 font-heading uppercase tracking-wide text-sm border-r border-white/20">
                    Training Type
                  </td>
                  {raccPackages.map((pkg) => (
                    <td
                      key={pkg.name}
                      className={`px-3 py-3 text-center text-sm font-medium ${
                        pkg.highlight ? "bg-gradient-to-b from-[hsl(209,90%,38%)] to-[hsl(190,65%,47%)]" : ""
                      }`}
                    >
                      {pkg.trainingType}
                    </td>
                  ))}
                </tr>

                <tr className="bg-card border-t-2">
                  <td className="sticky left-0 z-10 bg-card px-4 py-3 border-r border-border"></td>
                  {raccPackages.map((pkg) => (
                    <td
                      key={`${pkg.name}-enroll-bottom`}
                      className={`px-3 py-3 text-center ${
                        pkg.highlight ? "bg-[hsl(209,90%,38%)]/5" : ""
                      }`}
                    >
                      <Button
                        onClick={() => handleEnrollNow(pkg)}
                        disabled={isAddingToCart}
                        className="w-full bg-[hsl(209,90%,38%)] hover:bg-[#FD66C5] text-white font-semibold text-xs"
                        data-testid={`button-enroll-${pkg.name.replace(/\s+/g, '-').toLowerCase()}-bottom`}
                      >
                        Enroll Now
                      </Button>
                    </td>
                  ))}
                </tr>
              </tbody>
            </table>
          </div>

          <p className="text-center text-sm text-muted-foreground mt-6">
            Scroll horizontally to view all packages on smaller screens
          </p>
        </div>
      </section>
      {/* Why RACC Stands Alone */}
      <section className="py-16 bg-background">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <TitleCard as="h2" className="text-3xl mb-8">
            Why RACC Stands Alone
          </TitleCard>

          <div className="space-y-4 pt-[24px] pb-[24px]">
            <div className="flex gap-4">
              <CheckCircle className="w-6 h-6 text-[hsl(209,90%,38%)] flex-shrink-0 mt-1" />
              <div>
                <h3 className="font-heading font-semibold text-foreground mb-1">
                  Private, not crowded classes
                </h3>
                <p className="text-foreground">
                  No waiting behind 20 people. Every minute is yours.
                </p>
              </div>
            </div>

            <div className="flex gap-4">
              <CheckCircle className="w-6 h-6 text-[hsl(209,90%,38%)] flex-shrink-0 mt-1" />
              <div>
                <h3 className="font-heading font-semibold text-foreground mb-1">
                  Schedule on your terms
                </h3>
                <p className="text-foreground">
                  No rigid 8-hour weekends. Train 1–2 hours at a time, as often as you want.
                </p>
              </div>
            </div>

            <div className="flex gap-4">
              <CheckCircle className="w-6 h-6 text-[hsl(209,90%,38%)] flex-shrink-0 mt-1" />
              <div>
                <h3 className="font-heading font-semibold text-foreground mb-1">
                  Pressure-tested, not just practiced
                </h3>
                <p className="text-foreground">
                  We don't just teach; we verify you can perform when it counts.
                </p>
              </div>
            </div>

            <div className="flex gap-4">
              <CheckCircle className="w-6 h-6 text-[hsl(209,90%,38%)] flex-shrink-0 mt-1" />
              <div>
                <h3 className="font-heading font-semibold text-foreground mb-1">
                  Redundancy beats complacency
                </h3>
                <p className="text-foreground">
                  Every safety habit is drilled until it's automatic.
                </p>
              </div>
            </div>

            <div className="flex gap-4">
              <CheckCircle className="w-6 h-6 text-[hsl(209,90%,38%)] flex-shrink-0 mt-1" />
              <div>
                <h3 className="font-heading font-semibold text-foreground mb-1">
                  No one-size-fits-all
                </h3>
                <p className="text-foreground">
                  Your goals, your pace, your success.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>
      {/* FAQ Section */}
      <section className="py-16 bg-gray-50">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <TitleCard as="h2" className="text-3xl mb-4">
              RACC FAQs – Quick Answers to Get You Started
            </TitleCard>
          </div>

          <Accordion type="single" collapsible className="space-y-4">
            <AccordionItem value="faq-1" className="bg-white rounded-lg shadow-sm border-0 overflow-hidden">
              <AccordionTrigger className="px-6 py-4 hover:no-underline hover:bg-gray-50">
                <span className="font-heading text-lg uppercase tracking-wide text-left">
                  What is RACC?
                </span>
              </AccordionTrigger>
              <AccordionContent className="px-6 pb-4">
                <p className="text-foreground leading-relaxed">
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
                <p className="text-foreground leading-relaxed">
                  No set timeline—you advance when you're ready. We can say that the full RACC program typically takes 12–24 months, depending on your schedule and goals. It is not designed to be something that someone can just walk in and complete. The real benefit is in the process. So, come into this with a process focus, and the results will come.
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
                <p className="text-foreground leading-relaxed">
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
                <p className="text-foreground leading-relaxed">
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
                <p className="text-foreground leading-relaxed">
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
                <p className="text-foreground leading-relaxed">
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
                <p className="text-foreground leading-relaxed">
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
                <p className="text-foreground leading-relaxed">
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
                <p className="text-foreground leading-relaxed">
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
                <div className="text-foreground">
                  <p className="leading-relaxed mb-3">
                    Every phase ends with objective benchmarks:
                  </p>
                  <ul className="space-y-2 ml-4">
                    <li className="flex items-start gap-2">
                      <CheckCircle className="w-5 h-5 text-[hsl(209,90%,38%)] flex-shrink-0 mt-0.5" />
                      <span>Apache B-8 scores</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle className="w-5 h-5 text-[hsl(209,90%,38%)] flex-shrink-0 mt-0.5" />
                      <span>Timed drills</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle className="w-5 h-5 text-[hsl(209,90%,38%)] flex-shrink-0 mt-0.5" />
                      <span>Skill demos (reloads, malfunctions, one-hand shooting)</span>
                    </li>
                  </ul>
                  <p className="leading-relaxed mt-3">
                    You'll see data-driven proof of progress.
                  </p>
                </div>
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        </div>
      </section>
      {/* Ready to Start CTA */}
      <section className="py-16 bg-background">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <ComicPanel shadow="lg" variant="accent" className="text-center">
            <div className="py-8 pt-[8px] pb-[8px]">
              <h3 className="font-heading text-3xl uppercase tracking-wide text-white mb-4">
                Ready to Start?
              </h3>
              <p className="text-white/90 text-lg max-w-2xl mx-auto mt-[8px] mb-[8px]">
                Book your first private RACC session today.
              </p>

              <p className="text-white font-semibold mb-4 text-lg">
                Train Smarter. Live Safer.
              </p>

              <div className="mt-8 pt-8 border-t border-white/20">
                <p className="text-white font-semibold mb-4">
                  Apache Solutions LLC
                </p>
                <p className="text-white/80 text-sm">
                  Private Firearms Training | Yadkinville, NC
                </p>
              </div>

              <div className="mt-8">
                <Button
                  size="lg"
                  className="bg-white text-[hsl(209,90%,38%)] hover:bg-white/90 font-heading uppercase tracking-wide"
                  onClick={handleBookPrivateTraining}
                  data-testid="button-cta-book-appointment"
                >
                  <Calendar className="w-5 h-5 mr-2" />
                  Book Your First RACC Session!
                </Button>
              </div>
            </div>
          </ComicPanel>
        </div>
      </section>
      <Dialog open={showTypeSelection} onOpenChange={setShowTypeSelection}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Select Training Type</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            {appointmentTypes.map((type) => (
              <Card
                key={type.id}
                className="cursor-pointer hover:border-primary transition-colors"
                onClick={() => handleSelectType(type)}
                data-testid={`card-appointment-type-${type.id}`}
              >
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-semibold text-lg">{type.title}</h3>
                      {type.description && (
                        <p className="text-sm text-muted-foreground mt-1">{type.description}</p>
                      )}
                      <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Clock className="h-4 w-4" />
                          {type.durationMinutes} min
                        </span>
                        <span className="flex items-center gap-1">
                          <DollarSign className="h-4 w-4" />
                          ${Number(type.price).toFixed(2)}
                        </span>
                      </div>
                    </div>
                    <Button variant="outline" size="sm">
                      Select
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </DialogContent>
      </Dialog>
      <BookingModal
        appointmentType={selectedAppointmentType}
        instructorId={selectedAppointmentType?.instructorId || instructorId}
        open={showBookingModal}
        onClose={() => {
          setShowBookingModal(false);
          setSelectedAppointmentType(null);
        }}
      />
    </Layout>
  );
}
