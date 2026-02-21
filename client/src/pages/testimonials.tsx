import { Layout } from "@/components/Layout";
import { SEO } from "@/components/SEO";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Link } from "wouter";
import { Star, Quote, ChevronRight } from "lucide-react";

interface Testimonial {
  id: number;
  author: string;
  rating: number;
  quote: string;
  courseType?: string;
}

const allTestimonials: Testimonial[] = [
  {
    id: 1,
    author: "Marcus T.",
    rating: 5,
    quote: "Jeremy is a great instructor and anytime you need to ask him a question he is always available via text. To me this is an awesome trait and worth every penny.",
    courseType: "Concealed Carry",
  },
  {
    id: 2,
    author: "Rachel L.",
    rating: 5,
    quote: "I did the online course and it was well put together and made learning at your own pace great. Thanks Jeremy and I will definitely be referring more people.",
    courseType: "Online CCW",
  },
  {
    id: 3,
    author: "Robert K.",
    rating: 5,
    quote: "Had great experience with Jeremy and his training class. I would highly recommend using Practical Defense Training, LLC to get your CCW in New Mexico. Lots of useful knowledge.",
    courseType: "Concealed Carry",
  },
  {
    id: 4,
    author: "Jennifer D.",
    rating: 5,
    quote: "The online course was professional and comprehensive. Jeremy's responsiveness to questions during and after the course made all the difference. Highly recommend!",
    courseType: "Online CCW",
  },
  {
    id: 5,
    author: "Christopher M.",
    rating: 5,
    quote: "Best CCW training I've experienced. Jeremy knows how to teach practical, applicable skills. The course material is thorough and the support afterward is outstanding.",
    courseType: "Concealed Carry",
  },
  {
    id: 6,
    author: "Amanda P.",
    rating: 5,
    quote: "Took the class as a complete beginner and felt welcomed and supported throughout. Jeremy makes learning firearm safety and tactics feel approachable and empowering.",
    courseType: "Concealed Carry",
  },
  {
    id: 7,
    author: "David R.",
    rating: 5,
    quote: "Professional, knowledgeable, and genuinely cares about student success. Jeremy goes above and beyond to ensure you understand everything. Exceptional training.",
    courseType: "Concealed Carry",
  },
  {
    id: 8,
    author: "Lisa W.",
    rating: 5,
    quote: "The course was well-organized and easy to follow online. Jeremy's commitment to accessibility and student support is unmatched. Worth every penny.",
    courseType: "Online CCW",
  },
  {
    id: 9,
    author: "Thomas B.",
    rating: 5,
    quote: "Practical Defense Training delivered exactly what they promised. Clear instruction, practical applications, and outstanding customer service. Highly satisfied.",
    courseType: "Concealed Carry",
  },
  {
    id: 10,
    author: "Michael T.",
    rating: 5,
    quote: "RACC transformed my understanding of concealed carry. The pressure-tested benchmarks gave me real confidence.",
    courseType: "RACC Program",
  },
  {
    id: 11,
    author: "Sarah K.",
    rating: 5,
    quote: "Private sessions on my schedule made all the difference. I went from beginner to confident carrier in months.",
    courseType: "Private Training",
  },
  {
    id: 12,
    author: "James R.",
    rating: 5,
    quote: "The 4-phase system is brilliant. You don't just learn—you prove you can perform when it counts.",
    courseType: "RACC Program",
  },
];

function StarRating({ rating }: { rating: number }) {
  return (
    <div className="flex gap-0.5">
      {[...Array(5)].map((_, i) => (
        <Star
          key={i}
          className={`w-4 h-4 ${i < rating ? "text-yellow-500 fill-yellow-500" : "text-zinc-600"}`}
        />
      ))}
    </div>
  );
}

export default function TestimonialsPage() {
  return (
    <Layout>
      <SEO
        title="Student Testimonials | Practical Defense Training"
        description="Read what our students say about their concealed carry and firearms training experience with Practical Defense Training in Albuquerque, NM."
      />

      {/* Hero */}
      <section className="relative bg-zinc-950 py-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto text-center">
          <h1 className="font-heading text-5xl sm:text-6xl uppercase tracking-widest text-white mb-6">
            What Our Students Are Saying
          </h1>
          <p className="text-xl text-zinc-400 max-w-3xl mx-auto leading-relaxed">
            Don't take our word for it — hear from the students who've trained with us.
            These are real reviews from real people who chose Practical Defense Training.
          </p>
          <div className="mt-6 flex items-center justify-center gap-2">
            <StarRating rating={5} />
            <span className="text-zinc-400 text-sm ml-2">
              5.0 average from {allTestimonials.length}+ reviews
            </span>
          </div>
        </div>
      </section>

      {/* Testimonials Grid */}
      <section className="py-16 px-4 sm:px-6 lg:px-8 bg-background">
        <div className="max-w-7xl mx-auto">
          <div className="columns-1 md:columns-2 lg:columns-3 gap-6 space-y-6">
            {allTestimonials.map((testimonial) => (
              <Card
                key={testimonial.id}
                className="break-inside-avoid border-border"
              >
                <CardContent className="p-6">
                  <Quote className="w-8 h-8 text-[#006d7a] opacity-30 mb-3 rotate-180" />
                  <p className="text-foreground leading-relaxed mb-4 italic">
                    "{testimonial.quote}"
                  </p>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-semibold text-foreground text-sm">
                        {testimonial.author}
                      </p>
                      {testimonial.courseType && (
                        <p className="text-xs text-muted-foreground">
                          {testimonial.courseType}
                        </p>
                      )}
                    </div>
                    <StarRating rating={testimonial.rating} />
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="bg-zinc-950 py-16 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="font-heading text-3xl uppercase tracking-widest text-white mb-4">
            Ready to Join Them?
          </h2>
          <p className="text-zinc-400 text-lg mb-8">
            See what all the fuss is about. Browse our courses and find the training that fits your goals.
          </p>
          <div className="flex flex-wrap justify-center gap-4">
            <Link href="/courses">
              <Button size="lg" className="bg-[#006d7a] hover:bg-[#005a66] text-white">
                View Courses
                <ChevronRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>
            <Link href="/schedule-list">
              <Button size="lg" variant="outline" className="border-zinc-700 text-zinc-300 hover:bg-zinc-800">
                View Schedule
              </Button>
            </Link>
          </div>
        </div>
      </section>
    </Layout>
  );
}
