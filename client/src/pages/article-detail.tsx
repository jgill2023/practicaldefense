import { Layout } from "@/components/Layout";
import { SEO } from "@/components/SEO";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Link, useParams, useLocation } from "wouter";
import { Calendar, User, ArrowLeft, ChevronRight } from "lucide-react";
import { getArticleBySlug, articles, type Article } from "@/data/articles";
import { sanitizeHtml } from "@/lib/sanitize";

function RelatedArticles({ currentSlug, category }: { currentSlug: string; category: string }) {
  const related = articles
    .filter((a) => a.slug !== currentSlug)
    .sort((a, b) => {
      // Prioritize same category
      const aMatch = a.category === category ? 1 : 0;
      const bMatch = b.category === category ? 1 : 0;
      return bMatch - aMatch;
    })
    .slice(0, 3);

  if (related.length === 0) return null;

  return (
    <section className="border-t border-border pt-12 mt-12">
      <h2 className="font-heading text-2xl uppercase tracking-widest text-foreground mb-6">
        More Articles
      </h2>
      <div className="grid md:grid-cols-3 gap-6">
        {related.map((article) => (
          <Link key={article.slug} href={`/articles/${article.slug}`}>
            <Card className="h-full border-border hover:border-[#006d7a]/50 transition-all cursor-pointer group">
              <CardContent className="p-5">
                <Badge variant="outline" className="mb-2 text-xs border-[#006d7a]/30 text-[#006d7a]">
                  {article.category}
                </Badge>
                <h3 className="font-semibold text-foreground group-hover:text-[#006d7a] transition-colors mb-2 line-clamp-2">
                  {article.title}
                </h3>
                <p className="text-sm text-muted-foreground line-clamp-2">
                  {article.excerpt}
                </p>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
    </section>
  );
}

export default function ArticleDetail() {
  const params = useParams<{ slug: string }>();
  const [, setLocation] = useLocation();
  const article = params.slug ? getArticleBySlug(params.slug) : undefined;

  if (!article) {
    return (
      <Layout>
        <SEO title="Article Not Found | Practical Defense Training" />
        <div className="max-w-4xl mx-auto px-4 py-24 text-center">
          <h1 className="text-4xl font-bold text-foreground mb-4">Article Not Found</h1>
          <p className="text-muted-foreground mb-8">
            The article you're looking for doesn't exist or has been moved.
          </p>
          <Link href="/articles">
            <Button className="bg-[#006d7a] hover:bg-[#005a66] text-white">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Articles
            </Button>
          </Link>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <SEO
        title={`${article.title} | Practical Defense Training`}
        description={article.metaDescription}
      />

      {/* Hero */}
      <section className="relative bg-zinc-950 py-16 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto">
          <Link href="/articles">
            <Button variant="ghost" size="sm" className="text-zinc-400 hover:text-white mb-6 -ml-2">
              <ArrowLeft className="mr-2 h-4 w-4" />
              All Articles
            </Button>
          </Link>

          <Badge variant="outline" className="mb-4 border-[#006d7a]/30 text-[#006d7a]">
            {article.category}
          </Badge>

          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-white mb-4 leading-tight">
            {article.title}
          </h1>

          <div className="flex items-center gap-4 text-zinc-400 text-sm">
            <span className="flex items-center gap-1.5">
              <User className="h-4 w-4" />
              {article.author}
            </span>
            <span className="flex items-center gap-1.5">
              <Calendar className="h-4 w-4" />
              {article.date}
            </span>
          </div>
        </div>
      </section>

      {/* Featured Image */}
      {article.imageUrl && (
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 -mt-4">
          <img
            src={article.imageUrl}
            alt={article.title}
            className="w-full rounded-lg shadow-lg aspect-[2/1] object-cover"
          />
        </div>
      )}

      {/* Article Body */}
      <article className="py-12 px-4 sm:px-6 lg:px-8 bg-background">
        <div className="max-w-4xl mx-auto">
          <div
            className="prose prose-invert prose-lg max-w-none
              prose-headings:font-heading prose-headings:uppercase prose-headings:tracking-wider
              prose-h2:text-2xl prose-h2:mt-10 prose-h2:mb-4
              prose-p:text-muted-foreground prose-p:leading-relaxed
              prose-a:text-[#006d7a] prose-a:no-underline hover:prose-a:underline
              prose-strong:text-foreground
              prose-em:text-muted-foreground
              prose-li:text-muted-foreground
              prose-ul:text-muted-foreground
              prose-ol:text-muted-foreground"
            dangerouslySetInnerHTML={{ __html: sanitizeHtml(article.content || '') }}
          />

          {/* Tags */}
          {article.tags.length > 0 && (
            <div className="mt-10 pt-6 border-t border-border">
              <div className="flex flex-wrap gap-2">
                {article.tags.map((tag) => (
                  <Badge key={tag} variant="outline" className="text-xs border-border text-muted-foreground">
                    {tag.replace(/-/g, " ")}
                  </Badge>
                ))}
              </div>
            </div>
          )}

          {/* CTA */}
          <div className="mt-10 p-6 bg-zinc-950 rounded-lg text-center">
            <p className="text-zinc-400 mb-4">
              Ready to get your New Mexico Concealed Carry License?
            </p>
            <div className="flex flex-wrap justify-center gap-3">
              <Link href="/online-nm-concealed-carry-course">
                <Button className="bg-[#006d7a] hover:bg-[#005a66] text-white">
                  Online Course
                  <ChevronRight className="ml-2 h-4 w-4" />
                </Button>
              </Link>
              <Link href="/nmccl">
                <Button variant="outline" className="border-zinc-700 text-zinc-300 hover:bg-zinc-800">
                  In-Person Course
                </Button>
              </Link>
            </div>
          </div>

          {/* Related Articles */}
          <RelatedArticles currentSlug={article.slug} category={article.category} />
        </div>
      </article>
    </Layout>
  );
}
