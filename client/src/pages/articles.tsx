import { Layout } from "@/components/Layout";
import { SEO } from "@/components/SEO";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Calendar, User, ChevronRight } from "lucide-react";
import { Link, useSearch } from "wouter";
import { useState } from "react";
import { articles, getArticleCategories } from "@/data/articles";

// Slug mapping for articles that existed in the old hardcoded list
const slugMap: Record<string, string> = {
  "2-Year Refresher Change": "2-year-refresher-change",
  "How To Get Your New Mexico Concealed Carry License": "how-to-get-your-new-mexico-concealed-carry-license",
  "Lessons from an Armed Robbery": "lessons-from-an-armed-robbery",
  "Law of Self Defense Seminar Review": "law-of-self-defense-seminar-review",
  "Carrying a Gun Doesn't Make You Safe": "carrying-a-gun-doesnt-make-you-safe",
  "Active Duty Concealed Carry License (for NM)": "active-duty-concealed-carry-license",
  "When Should You Carry Your Firearm?": "when-should-you-carry-your-firearm",
  "Online Concealed Carry Training, Can It Work?": "online-concealed-carry-training-can-it-work",
  "Why We Retrain Concealed Carry Licensees For Free": "free-retrain",
  "5 Questions To Ask Your Potential Concealed Carry Instructor": "5-questions-to-ask-your-concealed-carry-instructor",
  "How To Choose a Concealed Carry Course and Instructor That is Right For You": "how-to-choose-a-concealed-carry-course",
  "6 Steps To Get Your New Mexico Concealed Carry License": "6-steps-to-get-your-new-mexico-concealed-carry-license",
  "Deferred Payment, WTF?!": "deferred-payment-options",
  "Partnering With Our Community": "partnering-with-our-community",
};

const categories = ["All", ...getArticleCategories()];

// Sort articles by date (newest first)
const sortedArticles = [...articles].sort((a, b) => {
  return new Date(b.date).getTime() - new Date(a.date).getTime();
});

export default function Articles() {
  const searchString = useSearch();
  const params = new URLSearchParams(searchString);
  const categoryParam = params.get("category");

  const [activeCategory, setActiveCategory] = useState(
    categoryParam
      ? categories.find((c) => c.toLowerCase().replace(/\s+/g, "-") === categoryParam) || "All"
      : "All"
  );

  const filteredArticles =
    activeCategory === "All"
      ? sortedArticles
      : sortedArticles.filter((a) => a.category === activeCategory);

  return (
    <Layout>
      <SEO
        title="Articles & Thoughts | Practical Defense Training"
        description="Insights, reviews, and training philosophy from the Practical Defense Training team with a focus on NM Concealed Carry and Personal Defense."
      />

      <div className="relative bg-zinc-900 text-white py-20 border-b border-zinc-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h1 className="text-4xl md:text-5xl font-bold font-display uppercase tracking-widest mb-4">
            Articles & Thoughts
          </h1>
          <p className="text-xl text-zinc-300 max-w-2xl">
            Insights, reviews, and training philosophy from the Practical Defense Training team
            with a focus on NM Concealed Carry and Personal Defense.
          </p>
        </div>
      </div>

      {/* Category Filter */}
      <div className="bg-background border-b border-border py-4 px-4 sm:px-6 lg:px-8">
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
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
          {filteredArticles.map((article) => (
            <Link key={article.slug} href={`/articles/${article.slug}`}>
              <Card className="overflow-hidden hover:shadow-lg hover:border-[#006d7a]/50 transition-all duration-300 flex flex-col h-full cursor-pointer group">
                {article.imageUrl ? (
                  <div className="aspect-video overflow-hidden">
                    <img
                      src={article.imageUrl}
                      alt={article.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                  </div>
                ) : (
                  <div className="aspect-video bg-gradient-to-br from-[#004149] to-[#006d7a] flex items-center justify-center">
                    <span className="text-white text-6xl font-display uppercase tracking-widest">PDT</span>
                  </div>
                )}
                <CardHeader className="pb-2">
                  <div className="flex items-center gap-2 mb-2">
                    <Badge
                      variant="secondary"
                      className="bg-[#006d7a]/10 text-[#006d7a] hover:bg-[#006d7a]/20"
                    >
                      {article.category}
                    </Badge>
                  </div>
                  <CardTitle className="text-xl font-heading line-clamp-2 group-hover:text-[#006d7a] transition-colors">
                    {article.title}
                  </CardTitle>
                </CardHeader>
                <CardContent className="flex-1 flex flex-col">
                  <div className="flex items-center gap-4 text-sm text-muted-foreground mb-4">
                    <div className="flex items-center gap-1">
                      <User className="h-4 w-4" />
                      <span>{article.author}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Calendar className="h-4 w-4" />
                      <span>{article.date}</span>
                    </div>
                  </div>
                  <p className="text-muted-foreground line-clamp-4 mb-4 flex-1">
                    {article.excerpt}
                  </p>
                  <span className="text-[#006d7a] text-sm font-medium flex items-center gap-1 group-hover:gap-2 transition-all">
                    Read Article
                    <ChevronRight className="h-4 w-4" />
                  </span>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>

        {filteredArticles.length === 0 && (
          <div className="text-center py-16">
            <p className="text-muted-foreground text-lg">
              No articles in this category yet.
            </p>
          </div>
        )}
      </div>
    </Layout>
  );
}
