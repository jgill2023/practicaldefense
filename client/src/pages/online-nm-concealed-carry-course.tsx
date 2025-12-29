import { CoursePageTemplate } from "@/components/CoursePageTemplate";
import laptopImage from "@assets/laptop_1767030825536.jpg";

export default function OnlineCCWClass() {
  return (
    <CoursePageTemplate
      title="Online NM Concealed Carry Course"
      isOnlineCourse={true}
      onlineCoursePrice={165}
      level="Beginner"
      heroImage={laptopImage}
      overview="Complete 8 hours of training online, at your own pace and place, then finish with a 7-hour live-fire range day! Gone are the days of having to wait for a New Mexico Concealed Carry Course that fits within your schedule, or having to request a weekend off. Our ONLINE New Mexico Concealed Carry Course has been fully vetted and approved by the New Mexico Department of Public Safety. Concealed Carry training around YOUR schedule, not the other way around."
      details={{
        price: "$165",
        time: "Self-Paced Online + Range Day",
        classroomTime: "8 Hours Online",
        rangeTime: "7 Hours In-Person",
        rounds: "25 Rounds",
        duration: "Flexible Schedule",
        location: "Online + Albuquerque, NM"
      }}
      curriculum={[
        {
          title: "Online Registration & Access",
          description: "Enroll and immediately receive your unique enrollment key and detailed instructions on how to start. Begin whenever and wherever you'd like."
        },
        {
          title: "NM CCL Laws & Requirements",
          description: "Learn the requirements to obtain a New Mexico Concealed Carry License, how to apply, and where you can and cannot carry a firearm."
        },
        {
          title: "Firearms Safety & Selection",
          description: "Understand how to select a defensive handgun that makes sense for you, and how to safely secure your firearm(s) while maintaining rapid access."
        },
        {
          title: "Defensive Shooting Fundamentals",
          description: "Learn why bullseye style marksmanship is not practical in a life-threatening self-defense encounter and what techniques actually work."
        },
        {
          title: "Self-Defense Mindset & Legal Considerations",
          description: "Understand the use of deadly force, what makes it justified, and the psychological and physiological reactions to high stress situations."
        },
        {
          title: "Live-Fire Range Qualification",
          description: "Complete a 7-hour in-person range day with hands-on training and live-fire qualification. Scheduled at a time that works for YOU."
        }
      ]}
      gearList={[
        { item: "Computer, tablet, or smartphone", required: true },
        { item: "Internet connection", required: true },
        { item: "Handgun (for range day)", required: true },
        { item: "25 rounds of ammunition", required: true },
        { item: "Eye protection", required: true },
        { item: "Ear protection", required: true },
        { item: "Holster (for range day)", required: false },
        { item: "Weather-appropriate attire", required: false }
      ]}
      rentalInfo="Don't have a handgun for the range day? We offer handgun rentals for $25, which includes use of the firearm, ammunition, eye and ear protection. Let us know when scheduling your range day."
      faqs={[
        {
          question: "Does the online course meet NM DPS requirements?",
          answer: "Yes, absolutely. Our online course is designed specifically for New Mexico and has been vetted and approved by the New Mexico Department of Public Safety. Many students have already completed our online course and have their NM CCL."
        },
        {
          question: "When does the course begin?",
          answer: "You can begin the online portion whenever you feel like it, as soon as you enroll. Once enrolled, you'll receive your unique enrollment key and detailed instructions on how to start."
        },
        {
          question: "Is the entire course online?",
          answer: "No, while the majority of the course is online, you will still need to complete a 7-hour live-fire range day to demonstrate your handgun competency and understanding of the material."
        },
        {
          question: "What if I prefer a traditional in-person course?",
          answer: "If you enroll in our online course and later decide you prefer a traditional course, we will roll your registration and payment over to one of our regularly scheduled in-person concealed carry courses."
        },
        {
          question: "What if I have questions during the online course?",
          answer: "Give us a call or shoot us a text at (505) 944-5247. We are more than happy to answer any questions that you might have while taking the course."
        },
        {
          question: "I've never shot a gun before. Should I take the online course?",
          answer: "Yes! Whether or not you have shot a handgun before, you will receive the same level of quality, hands-on training during the range day. Many first-time shooters benefit from the individualized training they receive after completing the online portion."
        }
      ]}
      ctaText="Register Now"
      ctaLink="/schedule-list"
      secondaryCta={{
        text: "Prefer In-Person? View 2-Day Course",
        link: "/nmccl"
      }}
    />
  );
}
