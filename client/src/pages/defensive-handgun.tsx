import { CoursePageTemplate } from "@/components/CoursePageTemplate";
import dhcImage from "@assets/DHC_1766643777282.jpg";

export default function DefensiveHandgunCourse() {
  // TODO: Query API to check if there are scheduled classes for this course
  const hasScheduledClasses = true;

  return (
    <CoursePageTemplate
      title="Defensive Handgun Course"
      hasScheduledClasses={hasScheduledClasses}
      level="Intermediate"
      heroImage={dhcImage}
      overview="Our 1 and 2 Day Defensive Handgun Courses focus on the shooting fundamentals that you will likely need in a defensive shooting. Day 1 begins with a basic shooting skills assessment to provide a baseline for each student. From there, students will begin working on defensive shooting fundamentals. Students must be able to safely handle their handguns and should be proficient with their handguns. This course takes you beyond basic concealed carry and prepares you for real-world defensive scenarios."
      details={{
        price: "$155 / $250",
        time: "9:00 AM - 5:00 PM",
        classroomTime: "Minimal",
        rangeTime: "8-16 Hours",
        rounds: "150-250 Rounds",
        duration: "1 or 2 Days",
        location: "Albuquerque, NM"
      }}
      curriculum={[
        {
          title: "Skills Assessment",
          description: "Begin with a basic shooting skills assessment to establish a baseline and identify areas for improvement."
        },
        {
          title: "Presenting from Concealment",
          description: "Master the techniques for safely and efficiently drawing your handgun from a concealed carry position."
        },
        {
          title: "Accurate First Shot Placement",
          description: "Develop the ability to quickly acquire your sights and place your first shot accurately on target."
        },
        {
          title: "Rapid Follow-Up Shots",
          description: "Learn to control recoil and deliver accurate follow-up shots in rapid succession."
        },
        {
          title: "Shooting from Retention",
          description: "Practice close-quarters defensive shooting techniques when full extension isn't possible."
        },
        {
          title: "Threat Recognition & Engagement",
          description: "Develop situational awareness and the ability to quickly identify and engage threats."
        },
        {
          title: "Tactical Reloads",
          description: "Master emergency and tactical reload techniques to keep your handgun in the fight."
        },
        {
          title: "Day 2: Advanced Tactics (2-Day Course)",
          description: "Use of cover, movement, multiple threat engagement, unconventional shooting positions, and malfunction clearing."
        }
      ]}
      gearList={[
        { item: "Reliable semi-auto handgun or revolver", required: true },
        { item: "150-250 rounds of ammunition", required: true },
        { item: "Quality holster (OWB or concealment)", required: true },
        { item: "At least 2 magazines (semi-auto)", required: true },
        { item: "Magazine pouch or speed loaders", required: true },
        { item: "Eye protection", required: true },
        { item: "Ear protection (electronic recommended)", required: true },
        { item: "Sturdy belt for holster", required: true },
        { item: "Knee pads (2-day course)", required: false },
        { item: "Weather-appropriate attire", required: false },
        { item: "Water and snacks", required: false }
      ]}
      rentalInfo="This course requires students to be proficient with their own handgun. Rentals are not recommended for this course. If you don't own a suitable handgun, consider taking our Concealed Carry Course first."
      faqs={[
        {
          question: "What's the difference between the 1-Day and 2-Day course?",
          answer: "The 1-Day course covers fundamentals like drawing from concealment, accurate shot placement, shooting from retention, threat recognition, and reloads (150 rounds). The 2-Day course includes all Day 1 content plus use of cover, movement, multiple threat engagement, unconventional shooting positions, and malfunction clearing (250 rounds total)."
        },
        {
          question: "Do I need to have my CCL to take this course?",
          answer: "No, a concealed carry license is not required. However, students should be proficient with handgun handling and have a solid foundation in firearms safety."
        },
        {
          question: "What skill level is required?",
          answer: "Students should be able to safely handle their handguns and be proficient with basic operation. This is not a beginner course. If you're new to handguns, we recommend taking our Concealed Carry Course first."
        },
        {
          question: "Why do I need so much ammunition?",
          answer: "Defensive handgun skills require repetition to develop. The 150-250 round count ensures you get enough trigger time to build muscle memory and confidence in your abilities."
        },
        {
          question: "Can I use a revolver?",
          answer: "Yes, revolvers are welcome. Just bring enough speed loaders or speed strips and sufficient ammunition. Be aware that some drills may be modified for revolver shooters."
        },
        {
          question: "What type of holster should I use?",
          answer: "A quality belt-mounted holster (OWB or IWB) that covers the trigger guard. No shoulder holsters, cross-draw, or ankle holsters. The holster should retain the handgun during movement."
        }
      ]}
      ctaText="Register Now"
      ctaLink="/schedule-list"
      secondaryCta={{
        text: "New to Handguns? Start with CCW Course",
        link: "/nmccl"
      }}
    />
  );
}
