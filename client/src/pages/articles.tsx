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
    title: "Real World Trauma: Jonathan Willis",
    author: "Zach Cox",
    date: "March 21, 2024",
    excerpt: "Being \"traumatized\" by Jonathan Willis is something I will never forget... Trauma care, emergency medicine, and even first aid, is something that I think everyone should at least have a basic understanding of. Whether you work in a dangerous industry or not, LIFE HAPPENS! Recently I had the honor of taking Jonathan Willis' \"Real World Trauma\" class and I wanted to share with you, my experience.",
    imageUrl: "https://apachenc.com/wp-content/uploads/2024/03/image_123650291-2-1024x768.jpg",
    externalUrl: "https://apachenc.com/real-world-trauma-jonathan-willis/",
    category: "Training"
  },
  {
    id: 2,
    title: "MAC1014: Another Turkish Shotgun... Or Is It?!",
    author: "Zach Cox",
    date: "January 5, 2024",
    excerpt: "In August 2023, Tim and I assisted Tom Givens with Rangemaster's Shotgun Instructor Course in Oklahoma. During the class, something caught our eye - a Turkish clone of the Benelli M4. My initial thoughts were skeptical, but boy was I wrong! It made it through with flying colors. At the end of it all, I RECOMMEND THIS SHOTGUN!",
    imageUrl: "https://apachenc.com/wp-content/uploads/2024/01/image.png",
    externalUrl: "https://apachenc.com/mac1014/",
    category: "Gear Review"
  },
  {
    id: 3,
    title: "Infinite Player: In The Training World, Be An Infinite Player",
    author: "Dan Brady",
    date: "December 2, 2022",
    excerpt: "It is said that a journey of a thousand miles begins with a single step. Author Simon Sinek's \"The Infinite Game\" expands on James Carse's theory of finite versus infinite games. Personal defensive instruction is most certainly an infinite game. It will continue no matter who leaves the industry or who joins it. Be the infinite player. Play the infinite game.",
    imageUrl: "",
    externalUrl: "https://apachenc.com/infinite-player/",
    category: "Philosophy"
  }
];

export default function Articles() {
  return (
    <Layout>
      <div className="relative bg-[#5170FF] text-white py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h1 className="text-4xl md:text-5xl font-bold font-heading mb-4" data-testid="text-articles-title">The Tribe</h1>
          <p className="text-xl text-white/90 max-w-2xl" data-testid="text-articles-subtitle">
            Insights, reviews, and training philosophy from the Apache Solutions team.
          </p>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
          {blogPosts.map((post) => (
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
                <div className="aspect-video bg-gradient-to-br from-[#5170FF] to-[#34B8FE] flex items-center justify-center">
                  <span className="text-white text-6xl font-heading">A</span>
                </div>
              )}
              <CardHeader className="pb-2">
                <div className="flex items-center gap-2 mb-2">
                  <Badge variant="secondary" className="bg-[#5170FF]/10 text-[#5170FF] hover:bg-[#5170FF]/20" data-testid={`badge-category-${post.id}`}>
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
            <a href="https://apachenc.com/the-tribe/" target="_blank" rel="noopener noreferrer">
              Visit Our Full Blog
              <ExternalLink className="h-4 w-4 ml-2" />
            </a>
          </Button>
        </div>
      </div>
    </Layout>
  );
}
