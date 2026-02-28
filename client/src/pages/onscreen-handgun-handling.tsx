import { CoursePageTemplate } from "@/components/CoursePageTemplate";
import dhcImage from "@assets/DHC_1767044138467.jpg";

export default function OnscreenHandgunHandling() {
  const hasScheduledClasses = true;

  return (
    <CoursePageTemplate
      title="Onscreen Handgun Handling"
      hasScheduledClasses={hasScheduledClasses}
      level="Beginner"
      heroImage={dhcImage}
      overview="Whether your character needs to be perceived as being an expert weapons handler, or someone who clumsily carries a firearm, our training will prepare you to act out that role more accurately and safely. This workshop is designed specifically for actors, actresses, and film professionals who need to handle firearms on screen. We teach you the real fundamentals so you can portray any level of expertise — or lack thereof — with authenticity and safety."
      details={{
        price: "$85",
        time: "TBD",
        classroomTime: "2 Hours",
        rangeTime: "2 Hours",
        rounds: "100 Rounds",
        duration: "4 Hours",
        location: "New Mexico"
      }}
      curriculum={[
        {
          title: "Firearms Safety for Film",
          description: "Essential safety protocols for handling firearms on set. Learn the rules that keep everyone safe during production."
        },
        {
          title: "Grip & Stance Fundamentals",
          description: "Master proper and improper grips and stances. Understand what expert handling looks like vs. a novice character."
        },
        {
          title: "Sight Alignment & Trigger Control",
          description: "Learn how to aim and fire realistically. Understand the mechanics so you can portray them accurately — or convincingly fake inexperience."
        },
        {
          title: "Weapon Presentation & Draw",
          description: "Practice drawing and presenting a handgun from various carry positions. Learn the movements that read well on camera."
        },
        {
          title: "Carry Positions & Holstering",
          description: "Explore different carry positions and how to safely holster and unholster for different character types and scenes."
        },
        {
          title: "Malfunction Clearing & Reloads",
          description: "Learn to perform and act out malfunctions and reloads. Useful for action sequences and dramatic tension."
        },
        {
          title: "One-Handed Shooting",
          description: "Techniques for shooting with either hand — a common requirement for dynamic action scenes."
        },
        {
          title: "Movement While Armed",
          description: "Learn how to move naturally and safely while carrying a firearm. Covers walking, running, and tactical movement for on-screen authenticity."
        },
        {
          title: "Character Adaptation",
          description: "Adapt your handling techniques to match your character's background — from trained law enforcement to a frightened civilian to a seasoned criminal."
        }
      ]}
      gearList={[
        { item: "Comfortable clothing suitable for range work", required: true },
        { item: "Eye protection", required: true },
        { item: "Ear protection", required: true },
        { item: "Closed-toe shoes", required: true },
        { item: "Notebook for notes", required: false },
        { item: "Water and snacks", required: false }
      ]}
      rentalInfo="All firearms and ammunition are provided for this workshop. No prior firearms experience is required — that's the whole point. We start from zero and build up."
      faqs={[
        {
          question: "Do I need any firearms experience?",
          answer: "No. This course is designed for people with zero firearms experience. We teach you everything from scratch, including safety, operation, and handling techniques that translate to on-screen performance."
        },
        {
          question: "Is this course only for professional actors?",
          answer: "While designed for film and television professionals, the course is open to anyone involved in productions that feature firearms — including directors, prop masters, and production assistants who want to understand safe firearms handling on set."
        },
        {
          question: "Do I need to bring my own firearm?",
          answer: "No. All firearms and ammunition are provided. You just need to show up in comfortable clothing with eye and ear protection."
        },
        {
          question: "Can this training be customized for a specific production?",
          answer: "Absolutely. We can tailor the training to match specific roles, scenes, or production requirements. Contact us to discuss your project's needs and we'll design a session for your cast and crew."
        },
        {
          question: "Is there live fire involved?",
          answer: "Yes. The second half of the workshop includes 2 hours of range time with live ammunition (100 rounds provided). This gives you the real experience of firing a handgun, including recoil and noise, so your on-screen performance is authentic."
        },
        {
          question: "How is this different from a standard firearms course?",
          answer: "Standard courses teach you to shoot effectively. This course teaches you to look like you can shoot — or can't shoot — depending on what the scene requires. The focus is on authentic portrayal and on-set safety, not personal defense."
        }
      ]}
      ctaText="Contact Us to Schedule"
      ctaLink="/contact"
      secondaryCta={{
        text: "View All Courses",
        link: "/courses"
      }}
    />
  );
}

