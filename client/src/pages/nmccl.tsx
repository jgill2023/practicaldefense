import { CoursePageTemplate } from "@/components/CoursePageTemplate";
import ccwRangeImage from "@assets/DSC_0032_1767029878856.jpg";

export default function NMConcealedCarryCourse() {
  // TODO: Query API to check if there are scheduled classes for this course
  const hasScheduledClasses = false;

  return (
    <CoursePageTemplate
      title="New Mexico Concealed Carry Course"
      hasScheduledClasses={hasScheduledClasses}
      level="Beginner"
      heroImage={ccwRangeImage}
      overview="Our New Mexico Concealed Carry Course is one of the most comprehensive and fun concealed carry courses in the state. Practical Defense Training, LLC offers straightforward firearms training, with a focus and emphasis on New Mexico concealed carry training. One of the few courses which preaches and teaches practical over 'tacti-cool'; bringing reliable and effective firearms training to the responsibly armed citizen. Students will gain the knowledge and skills necessary to legally and responsibly carry a concealed handgun in the State of New Mexico and those States with whom New Mexico shares reciprocity with."
      details={{
        price: "$165",
        time: "9:00 AM - 5:00 PM",
        classroomTime: "12 Hours",
        rangeTime: "3 Hours",
        rounds: "25 Rounds",
        duration: "2 Days (Sat-Sun)",
        location: "Albuquerque, NM"
      }}
      curriculum={[
        {
          title: "Firearms Safety & Fundamentals",
          description: "Learn the fundamental rules of firearms safety and proper handgun handling techniques that will keep you and others safe."
        },
        {
          title: "New Mexico CCL Laws & Regulations",
          description: "Comprehensive coverage of New Mexico concealed carry laws, where you can and cannot carry, and reciprocity with other states."
        },
        {
          title: "Defensive Shooting Fundamentals",
          description: "Using S.I.R.T. training pistols, work on basic handgun and defensive shooting fundamentals in a safe classroom environment."
        },
        {
          title: "Drawing from Concealment",
          description: "Learn proper techniques for presenting a handgun from concealment safely and efficiently."
        },
        {
          title: "Use of Deadly Force",
          description: "Understand when deadly force is justified, legal considerations, and the psychological and physiological reactions to high-stress situations."
        },
        {
          title: "Live-Fire Range Qualification",
          description: "Complete the required 3-hour live-fire range qualification demonstrating your handgun competency with 25 rounds."
        }
      ]}
      gearList={[
        { item: "Handgun (semi-auto or revolver)", required: true },
        { item: "25 rounds of ammunition", required: true },
        { item: "Eye protection", required: true },
        { item: "Ear protection", required: true },
        { item: "Holster (concealment type preferred)", required: false },
        { item: "Magazine pouch or speed loader", required: false },
        { item: "Comfortable clothing", required: false },
        { item: "Weather-appropriate attire", required: false }
      ]}
      rentalInfo="Don't have a handgun? We offer handgun rentals for $25, which includes use of the firearm, ammunition, eye and ear protection. Contact us to arrange a rental."
      faqs={[
        {
          question: "Do I need to own a handgun to take this course?",
          answer: "No, we offer handgun rentals for $25 which includes the firearm, ammunition, and safety equipment. Many students who are new to firearms take the course first and then make an informed decision about which handgun to purchase."
        },
        {
          question: "What are the prerequisites for this course?",
          answer: "You must be at least 21 years old (or 19 for military), be a legal U.S. resident, not be prohibited from possessing firearms, and not have any disqualifying criminal history or court orders."
        },
        {
          question: "How long is the New Mexico CCL valid?",
          answer: "The New Mexico Concealed Carry License is valid for 4 years for initial applicants. Renewal courses are required before expiration."
        },
        {
          question: "What states honor the New Mexico CCL?",
          answer: "New Mexico has reciprocity agreements with many states. The list changes periodically, and we cover current reciprocity information during the course."
        },
        {
          question: "What happens after I complete the course?",
          answer: "You will receive your certificate of completion and detailed instructions on how to apply for your New Mexico CCL through the NM Department of Public Safety."
        },
        {
          question: "Can I bring my own ammunition?",
          answer: "Yes, you can bring your own ammunition. You will need 25 rounds of factory-loaded ammunition (no reloads) in the caliber of your handgun."
        }
      ]}
      ctaText="Register Now"
      ctaLink="/schedule-list"
      secondaryCta={{
        text: "Prefer Online? Take Online Course",
        link: "/online-nm-concealed-carry-course"
      }}
    />
  );
}
