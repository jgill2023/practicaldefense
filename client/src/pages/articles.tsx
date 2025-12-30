import { Layout } from "@/components/Layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Calendar, User, ExternalLink } from "lucide-react";

interface BlogPost {
  id: number;
  title: string;
  author: string;
  date: string;
  excerpt: string;
  imageUrl: string;
  externalUrl: string;
  category: string;
}

const blogPosts: BlogPost[] = [
  {
    id: 1,
    title: "2-Year Refresher Change",
    author: "Jeremy Gill",
    date: "June 20, 2023",
    excerpt: "The New Mexico Department of Public Safety sent out an email notifying all instructors that they will no longer be offering the free online 2-year refresher, and that New Mexico Concealed Carry Instructors will have to offer that course again.",
    imageUrl: "https://www.abqconcealedcarry.com/wp-content/uploads/2023/06/not-cool-1-400x250.jpg",
    externalUrl: "https://www.abqconcealedcarry.com/2023/06/20/2-year-refresher-change/",
    category: "Concealed Carry"
  },
  {
    id: 5,
    title: "How To Get Your New Mexico Concealed Carry License",
    author: "Jeremy Gill",
    date: "December 1, 2021",
    excerpt: "In 3 Easy Steps. Getting your New Mexico Concealed Carry License (NM CCL or NMCCL) is a fairly straightforward process, and isn't as difficult as some would think. In fact, you can complete most of the required training online. We'll discuss that more a little further in this guide.",
    imageUrl: "https://www.abqconcealedcarry.com/wp-content/uploads/2021/12/9aeff2af-8c33-4cac-b7f4-63c809ea83b9-400x250.jpg",
    externalUrl: "https://www.abqconcealedcarry.com/2021/12/01/how-to-get-your-new-mexico-concealed-carry-license/",
    category: "How To"
  },
  {
    id: 6,
    title: "Lessons from an Armed Robbery",
    author: "Jeremy Gill",
    date: "September 6, 2016",
    excerpt: "Pretend for a moment that you're the guy in the blue jeans, button-down shirt, and cowboy hat. Caught completely off guard with his back to the door, and panicked. His life went from calm and peaceful to turmoil in a matter of seconds. What would you do?",
    imageUrl: "",
    externalUrl: "https://www.abqconcealedcarry.com/2016/09/06/lessons-armed-robbery/",
    category: "Concealed Carry"
  },
  {
    id: 7,
    title: "Law of Self Defense Seminar Review",
    author: "Jeremy Gill",
    date: "September 28, 2015",
    excerpt: "Before I get into it, I wanted to say Thank You to Rick Davis of Deliberate Defense for hosting Andrew Branca, as well as Andrew Branca for making the trip to Albuquerque to share, not only his knowledge, but also his expertise, on the Law of Self Defense.",
    imageUrl: "",
    externalUrl: "https://www.abqconcealedcarry.com/2015/09/28/law-of-self-defense-seminar-review/",
    category: "Training"
  },
  {
    id: 8,
    title: "Carrying a Gun Doesn't Make You Safe",
    author: "Jeremy Gill",
    date: "July 9, 2015",
    excerpt: "Carrying a gun doesn't make you safe, no more than wearing a seat belt prevents an auto accident. It's your Plan B. Plan A is to NOT get into an auto accident (violent confrontation). It is when we gain this false sense of security that we allow ourselves to become complacent. Complacency is dangerous.",
    imageUrl: "",
    externalUrl: "https://www.abqconcealedcarry.com/2015/07/09/carrying-a-gun-doesnt-make-you-safe/",
    category: "Philosophy"
  },
  {
    id: 9,
    title: "Active Duty Concealed Carry License (for NM)",
    author: "Jeremy Gill",
    date: "June 18, 2015",
    excerpt: "How to Get Your Active Duty Concealed Carry License. Some of you may have heard or read our recent posts concerning a couple changes made to the legislation around New Mexico Concealed Carry, specifically the changes that exempt members of the military from certain requirements.",
    imageUrl: "",
    externalUrl: "https://www.abqconcealedcarry.com/2015/06/18/active-duty-concealed-carry-license/",
    category: "How To"
  },
  {
    id: 10,
    title: "When Should You Carry Your Firearm?",
    author: "Jeremy Gill",
    date: "May 19, 2015",
    excerpt: "If you have a concealed carry license, and a concealed carry handgun, how often, or when should you carry it? This is a question that we get asked often, and the answer is always the same! We do not get to choose if and when we will become someone's intended victim.",
    imageUrl: "",
    externalUrl: "https://www.abqconcealedcarry.com/2015/05/19/when-should-you-carry-your-firearm/",
    category: "Concealed Carry"
  },
  {
    id: 11,
    title: "Online Concealed Carry Training, Can It Work?",
    author: "Jeremy Gill",
    date: "May 10, 2015",
    excerpt: "Now, before we get too far into this post, full disclosure, I will be slightly biased on this topic, as I have developed - and received approval from the State of New Mexico for - an online New Mexico Concealed Carry Course.",
    imageUrl: "",
    externalUrl: "https://www.abqconcealedcarry.com/2015/05/10/online-concealed-carry-training-can-it-work/",
    category: "Concealed Carry"
  },
  {
    id: 12,
    title: "Why We Retrain Concealed Carry Licensees For Free",
    author: "Jeremy Gill",
    date: "May 7, 2015",
    excerpt: "\"If you would not pay for your mother, brother, sister, son, daughter, or anyone that you cared about to take the course that you took, you did not receive adequate training and we would love to have you take our concealed carry course, for FREE.\"",
    imageUrl: "",
    externalUrl: "https://www.abqconcealedcarry.com/2015/05/07/free-retrain/",
    category: "Training"
  },
  {
    id: 13,
    title: "5 Questions To Ask Your Potential Concealed Carry Instructor",
    author: "Jeremy Gill",
    date: "May 6, 2015",
    excerpt: "You've narrowed your choice of concealed carry instructors and their courses down to a handful or so. Now it's time to reach out to those instructors and ask them a few questions. We've put together the 5 must ask questions that you should ask any concealed carry instructor.",
    imageUrl: "",
    externalUrl: "https://www.abqconcealedcarry.com/2015/05/06/5-questions-to-ask-your-potential-concealed-carry-instructor/",
    category: "How To"
  },
  {
    id: 14,
    title: "How To Choose a Concealed Carry Course and Instructor That is Right For You",
    author: "Jeremy Gill",
    date: "May 5, 2015",
    excerpt: "You've been wanting and waiting to get your New Mexico Concealed Carry License for quite some time, and now you've begun trying to find an appropriate concealed carry course and instructor. We've been there and probably had the same questions that you're having now.",
    imageUrl: "",
    externalUrl: "https://www.abqconcealedcarry.com/2015/05/05/how-to-choose-a-concealed-carry-course-and-instructor-that-is-right-for-you/",
    category: "How To"
  },
  {
    id: 15,
    title: "6 Steps To Get Your New Mexico Concealed Carry License",
    author: "Jeremy Gill",
    date: "May 5, 2015",
    excerpt: "While getting your New Mexico Concealed Carry License is not an all-to-difficult thing to do, there are several steps involved and a few of those steps can become confusing at times. Below is a step-by-step guide to obtaining your New Mexico Concealed Carry License!",
    imageUrl: "",
    externalUrl: "https://www.abqconcealedcarry.com/2015/05/05/6-steps-to-get-your-new-mexico-concealed-carry-license/",
    category: "How To"
  }
];

// Sort articles by date (newest first)
const sortedPosts = [...blogPosts].sort((a, b) => {
  const dateA = new Date(a.date);
  const dateB = new Date(b.date);
  return dateB.getTime() - dateA.getTime();
});

export default function Articles() {
  return (
    <Layout>
      <div className="relative bg-zinc-900 text-white py-20 border-b border-zinc-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h1 className="text-4xl md:text-5xl font-bold font-display uppercase tracking-widest mb-4" data-testid="text-articles-title">Articles & Thoughts</h1>
          <p className="text-xl text-zinc-300 max-w-2xl" data-testid="text-articles-subtitle">
            Insights, reviews, and training philosophy from the Practical Defense Training team with a focus on NM Concealed Carry and Personal Defense.
          </p>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
          {sortedPosts.map((post) => (
            <Card key={post.id} className="overflow-hidden hover:shadow-lg transition-shadow duration-300 flex flex-col" data-testid={`card-article-${post.id}`}>
              {post.imageUrl && (
                <div className="aspect-video overflow-hidden">
                  <img 
                    src={post.imageUrl} 
                    alt={post.title}
                    className="w-full h-full object-cover hover:scale-105 transition-transform duration-300"
                    data-testid={`img-article-${post.id}`}
                  />
                </div>
              )}
              {!post.imageUrl && (
                <div className="aspect-video bg-gradient-to-br from-[#004149] to-[#006d7a] flex items-center justify-center">
                  <span className="text-white text-6xl font-display uppercase tracking-widest">PDT</span>
                </div>
              )}
              <CardHeader className="pb-2">
                <div className="flex items-center gap-2 mb-2">
                  <Badge variant="secondary" className="bg-[#006d7a]/10 text-[#006d7a] hover:bg-[#006d7a]/20" data-testid={`badge-category-${post.id}`}>
                    {post.category}
                  </Badge>
                </div>
                <CardTitle className="text-xl font-heading line-clamp-2" data-testid={`text-article-title-${post.id}`}>
                  {post.title}
                </CardTitle>
              </CardHeader>
              <CardContent className="flex-1 flex flex-col">
                <div className="flex items-center gap-4 text-sm text-muted-foreground mb-4">
                  <div className="flex items-center gap-1">
                    <User className="h-4 w-4" />
                    <span data-testid={`text-author-${post.id}`}>{post.author}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Calendar className="h-4 w-4" />
                    <span data-testid={`text-date-${post.id}`}>{post.date}</span>
                  </div>
                </div>
                <p className="text-muted-foreground line-clamp-4 mb-4 flex-1" data-testid={`text-excerpt-${post.id}`}>
                  {post.excerpt}
                </p>
                <Button 
                  asChild 
                  variant="outline" 
                  className="w-full group"
                  data-testid={`button-read-article-${post.id}`}
                >
                  <a href={post.externalUrl} target="_blank" rel="noopener noreferrer">
                    Read Full Article
                    <ExternalLink className="h-4 w-4 ml-2 group-hover:translate-x-1 transition-transform" />
                  </a>
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="mt-16 text-center">
          <p className="text-muted-foreground mb-4">
            Want to read more from our team?
          </p>
          <Button asChild variant="default" className="bg-[#5170FF] hover:bg-[#5170FF]/90" data-testid="button-visit-blog">
            <a href="https://abqconcealedcarry.com/the-tribe/" target="_blank" rel="noopener noreferrer">
              Visit Our Full Blog
              <ExternalLink className="h-4 w-4 ml-2" />
            </a>
          </Button>
        </div>
      </div>
    </Layout>
  );
}
