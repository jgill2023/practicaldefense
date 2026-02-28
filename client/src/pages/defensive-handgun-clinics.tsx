import { CoursePageTemplate } from "@/components/CoursePageTemplate";
import dhcImage from "@assets/DHC_1767044138467.jpg";

export default function DefensiveHandgunClinics() {
  const hasScheduledClasses = true;

  return (
    <CoursePageTemplate
      title="Defensive Handgun Clinics"
      hasScheduledClasses={hasScheduledClasses}
      level="Intermediate"
      heroImage={dhcImage}
      overview="Defensive Handgun Clinics focus on one or two defensive shooting fundamental skills in a 2-4 hour block of instruction. These focused sessions allow you to sharpen specific skills without committing to a full-day course. With a maximum of 2-5 students per instructor, you get personalized attention and real-time coaching to accelerate your development. Each clinic targets the skills most likely to matter in a real defensive encounter."
      details={{
        price: "$56 - $65",
        time: "Varies by Clinic",
        rangeTime: "2-4 Hours",
        rounds: "100-250 Rounds",
        duration: "2-4 Hours",
        location: "Albuquerque, NM & Other NM Locations"
      }}
      curriculum={[
        {
          title: "Concealment Draw",
          description: "Master the techniques for safely and efficiently presenting your handgun from a concealed carry position under time pressure."
        },
        {
          title: "Tactical Movement",
          description: "Learn to move effectively while maintaining the ability to engage threats. Covers lateral movement, advancing, and retreating."
        },
        {
          title: "Use of Cover",
          description: "Practice identifying and using cover effectively in defensive scenarios, including shooting around barriers and minimizing exposure."
        },
        {
          title: "Unconventional Positions",
          description: "Shoot from positions you may find yourself in during a real encounter: kneeling, prone, seated, and one-handed."
        },
        {
          title: "Malfunction Clearing & Reloads",
          description: "Build the muscle memory to quickly clear common malfunctions and perform emergency and tactical reloads under stress."
        },
        {
          title: "Target Discrimination",
          description: "Develop the ability to quickly identify threats vs. non-threats in dynamic scenarios. Critical decision-making under pressure."
        },
        {
          title: "Multiple Threat Engagement",
          description: "Practice transitioning between multiple targets while maintaining accuracy and proper threat assessment."
        },
        {
          title: "Retention Shooting",
          description: "Close-quarters defensive techniques when full extension isn't possible. Shooting from compressed positions."
        },
        {
          title: "Force-on-Force Scenarios",
          description: "Apply your skills in realistic scenario-based training using safe training equipment. Test your decision-making and skills under simulated stress."
        }
      ]}
      gearList={[
        { item: "Reliable semi-auto handgun or revolver", required: true },
        { item: "100-250 rounds of ammunition (varies by clinic)", required: true },
        { item: "At least 2 magazines or speed loaders", required: true },
        { item: "Eye protection", required: true },
        { item: "Ear protection (electronic recommended)", required: true },
        { item: "Lunch, snacks, and hydrating beverages", required: true },
        { item: "Knee pads", required: false },
        { item: "Weather-appropriate attire", required: false }
      ]}
      rentalInfo="Clinics require students to bring their own handgun. If you don't own a suitable handgun, consider taking our Concealed Carry Course first where rentals are available."
      faqs={[
        {
          question: "How are clinics different from the full Defensive Handgun Course?",
          answer: "Clinics focus on one or two specific skills in a shorter 2-4 hour format, while the full Defensive Handgun Course is a comprehensive 1 or 2-day program covering all defensive fundamentals. Clinics are great for targeted skill development or refreshing specific techniques."
        },
        {
          question: "How many students per clinic?",
          answer: "Each clinic is limited to 2-5 students per instructor. This small class size ensures you get personalized attention and coaching throughout the session."
        },
        {
          question: "Can I attend multiple clinics?",
          answer: "Absolutely. Each clinic covers different skills, so attending multiple clinics lets you build a comprehensive defensive skillset at your own pace. Many students attend regularly to stay sharp."
        },
        {
          question: "What skill level is required?",
          answer: "Students should have a solid foundation in basic handgun operation and safety. If you're new to defensive shooting, we recommend the Concealment Draw and Malfunction Clearing clinics as starting points."
        },
        {
          question: "Where are clinics held?",
          answer: "We offer clinics at various locations across New Mexico, including Albuquerque, Socorro, Angel Fire, Chama, and Farmington. Check our schedule for upcoming clinic dates and locations."
        },
        {
          question: "What is force-on-force training?",
          answer: "Force-on-force uses safe training equipment (like SIRT pistols or simunitions) to create realistic scenarios where you practice decision-making and skill application against a live opponent. It's the closest thing to real-world defensive situations in a safe training environment."
        }
      ]}
      ctaText="View Schedule"
      ctaLink="/schedule-list"
      secondaryCta={{
        text: "Full Defensive Handgun Course",
        link: "/defensive-handgun-course"
      }}
    />
  );
}

