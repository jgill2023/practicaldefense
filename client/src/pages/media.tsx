import { Layout } from "@/components/Layout";
import { SEO } from "@/components/SEO";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Link } from "wouter";
import { Play, ChevronRight } from "lucide-react";
import { useState } from "react";

interface Video {
  id: string;
  title: string;
  description: string;
  thumbnailUrl: string;
  videoUrl: string;
  category: string;
}

// Placeholder videos — replace with actual YouTube/Vimeo embed IDs
const videos: Video[] = [
  {
    id: "1",
    title: "Why Online Concealed Carry Training Works",
    description: "Learn how our hybrid online + range day format gives you flexibility without sacrificing quality training.",
    thumbnailUrl: "",
    videoUrl: "",
    category: "Course Info",
  },
  {
    id: "2",
    title: "What to Expect on Range Day",
    description: "A walkthrough of what your live-fire qualification session looks like from start to finish.",
    thumbnailUrl: "",
    videoUrl: "",
    category: "Course Info",
  },
  {
    id: "3",
    title: "Defensive Handgun Training Preview",
    description: "See what a day of defensive handgun training looks like with Practical Defense Training.",
    thumbnailUrl: "",
    videoUrl: "",
    category: "Training",
  },
];

const categories = ["All", ...Array.from(new Set(videos.map((v) => v.category)))];

export default function MediaPage() {
  const [activeCategory, setActiveCategory] = useState("All");

  const filteredVideos =
    activeCategory === "All"
      ? videos
      : videos.filter((v) => v.category === activeCategory);

  return (
    <Layout>
      <SEO
        title="Videos & Media | Practical Defense Training"
        description="Watch training videos, course previews, and media appearances from Practical Defense Training."
      />

      {/* Hero */}
      <section className="relative bg-zinc-950 py-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto text-center">
          <h1 className="font-heading text-5xl sm:text-6xl uppercase tracking-widest text-white mb-6">
            Videos & Media
          </h1>
          <p className="text-xl text-zinc-400 max-w-3xl mx-auto leading-relaxed">
            Watch training previews, course walkthroughs, and educational content
            from Practical Defense Training.
          </p>
        </div>
      </section>

      {/* Category Filter */}
      <section className="py-8 px-4 sm:px-6 lg:px-8 bg-background border-b border-border">
        <div className="max-w-7xl mx-auto flex flex-wrap gap-2">
          {categories.map((category) => (
            <Button
              key={category}
              variant={activeCategory === category ? "default" : "outline"}
              size="sm"
              onClick={() => setActiveCategory(category)}
              className={
                activeCategory === category
                  ? "bg-[#006d7a] hover:bg-[#005a66] text-white"
                  : "border-border text-muted-foreground hover:text-foreground"
              }
            >
              {category}
            </Button>
          ))}
        </div>
      </section>

      {/* Video Grid */}
      <section className="py-16 px-4 sm:px-6 lg:px-8 bg-background">
        <div className="max-w-7xl mx-auto">
          {filteredVideos.length > 0 ? (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredVideos.map((video) => (
                <Card
                  key={video.id}
                  className="border-border hover:border-[#006d7a]/50 transition-all duration-300 group overflow-hidden"
                >
                  {/* Video Thumbnail / Placeholder */}
                  <div className="relative aspect-video bg-zinc-900 flex items-center justify-center">
                    {video.thumbnailUrl ? (
                      <img
                        src={video.thumbnailUrl}
                        alt={video.title}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="flex flex-col items-center gap-2 text-zinc-600">
                        <Play className="w-12 h-12" />
                        <span className="text-xs">Video Coming Soon</span>
                      </div>
                    )}
                    {video.videoUrl && (
                      <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer">
                        <div className="w-16 h-16 rounded-full bg-[#006d7a] flex items-center justify-center">
                          <Play className="w-8 h-8 text-white fill-white ml-1" />
                        </div>
                      </div>
                    )}
                  </div>
                  <CardContent className="p-5">
                    <p className="text-xs text-[#006d7a] font-medium uppercase tracking-wider mb-1">
                      {video.category}
                    </p>
                    <h3 className="text-foreground font-semibold mb-2">
                      {video.title}
                    </h3>
                    <p className="text-sm text-muted-foreground leading-relaxed">
                      {video.description}
                    </p>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <div className="text-center py-16">
              <p className="text-muted-foreground text-lg">
                No videos in this category yet. Check back soon!
              </p>
            </div>
          )}

          {/* Coming Soon Notice */}
          <div className="mt-12 text-center">
            <p className="text-muted-foreground">
              More videos are being added regularly. Follow us on social media for the latest content.
            </p>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="bg-zinc-950 py-16 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="font-heading text-3xl uppercase tracking-widest text-white mb-4">
            Ready to Train?
          </h2>
          <p className="text-zinc-400 text-lg mb-8">
            Videos are great, but nothing beats hands-on training. Browse our courses
            and sign up for your next class.
          </p>
          <div className="flex flex-wrap justify-center gap-4">
            <Link href="/courses">
              <Button size="lg" className="bg-[#006d7a] hover:bg-[#005a66] text-white">
                View Courses
                <ChevronRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>
            <Link href="/articles">
              <Button size="lg" variant="outline" className="border-zinc-700 text-zinc-300 hover:bg-zinc-800">
                Read Articles
              </Button>
            </Link>
          </div>
        </div>
      </section>
    </Layout>
  );
}
