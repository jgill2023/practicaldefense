import { Request, Response, NextFunction } from "express";

/**
 * 301 redirect map from old abqconcealedcarry.com WordPress URLs
 * to new Practical Defense Training routes.
 * Preserves SEO equity during site migration.
 */
const STATIC_REDIRECTS: Record<string, string> = {
  // Pages with changed URLs
  "/about-us": "/about",
  "/contact-us": "/contact",
  "/gift-certificates": "/gift-cards",
  "/gift-certificates-2": "/gift-cards",
  "/articles-and-thoughts": "/articles",
  "/blog": "/articles",
  "/shop": "/store",
  "/shop-2": "/store",
  "/our-shop": "/store",
  "/monthly-calendar": "/schedule-calendar",
  "/calendar-view": "/schedule-calendar",
  "/list-view": "/schedule-list",
  "/upcoming-courses": "/schedule-list",
  "/training-courses": "/courses",
  "/testimonials": "/testimonials",
  "/what-our-students-are-saying": "/testimonials",
  "/my-account": "/settings",
  "/my-account-2": "/settings",
  "/user-account": "/settings",
  "/user-account-new": "/settings",
  "/terms-and-conditions": "/terms-of-service",
  "/apparel": "/merch",
  "/home-2": "/",
  "/privacy-policy-2": "/privacy-policy",
  "/privacy-policy-3": "/privacy-policy",

  // Category archive redirects
  "/category/concealed-carry": "/articles",
  "/category/new-mexico-concealed-carry": "/articles",
  "/category/albuquerque-concealed-carry": "/articles",
  "/category/how-to": "/articles",
  "/category/uncategorized": "/articles",
};

/**
 * Blog post slug mapping: old WordPress slug → new article slug
 */
const BLOG_SLUG_MAP: Record<string, string> = {
  "how-to-get-your-new-mexico-concealed-carry-license": "how-to-get-your-new-mexico-concealed-carry-license",
  "2-year-refresher-change": "2-year-refresher-change",
  "lessons-armed-robbery": "lessons-from-an-armed-robbery",
  "law-of-self-defense-seminar-review": "law-of-self-defense-seminar-review",
  "carrying-a-gun-doesnt-make-you-safe": "carrying-a-gun-doesnt-make-you-safe",
  "active-duty-concealed-carry-license": "active-duty-concealed-carry-license",
  "when-should-you-carry-your-firearm": "when-should-you-carry-your-firearm",
  "deferred-payment-wtf": "deferred-payment-options",
  "online-concealed-carry-training-can-it-work": "online-concealed-carry-training-can-it-work",
  "partnering-with-our-community": "partnering-with-our-community",
  "free-retrain": "free-retrain",
  "5-questions-to-ask-your-potential-concealed-carry-instructor": "5-questions-to-ask-your-concealed-carry-instructor",
  "6-steps-to-get-your-new-mexico-concealed-carry-license": "6-steps-to-get-your-new-mexico-concealed-carry-license",
  "how-to-choose-a-concealed-carry-course-and-instructor-that-is-right-for-you": "how-to-choose-a-concealed-carry-course",
};

function normalizePathForRedirect(path: string): string {
  return path.replace(/\/+$/, "") || "/";
}

export function createRedirectMiddleware() {
  return (req: Request, res: Response, next: NextFunction) => {
    const normalizedPath = normalizePathForRedirect(req.path);

    // Check static redirects
    const staticTarget = STATIC_REDIRECTS[normalizedPath];
    if (staticTarget) {
      return res.redirect(301, staticTarget);
    }

    // Check WordPress blog post URLs: /YYYY/MM/DD/slug/
    const blogMatch = normalizedPath.match(/^\/\d{4}\/\d{2}\/\d{2}\/(.+?)$/);
    if (blogMatch) {
      const oldSlug = blogMatch[1];
      const newSlug = BLOG_SLUG_MAP[oldSlug];
      if (newSlug) {
        return res.redirect(301, `/articles/${newSlug}`);
      }
      // Unknown blog post — redirect to articles index
      return res.redirect(301, "/articles");
    }

    // Check tag archive redirects: /tag/anything/
    if (normalizedPath.startsWith("/tag/")) {
      return res.redirect(301, "/articles");
    }

    // Check product category redirects: /product-category/anything/
    if (normalizedPath.startsWith("/product-category/")) {
      return res.redirect(301, "/store");
    }

    // Check old product URLs: /product/anything/
    if (normalizedPath.startsWith("/product/")) {
      return res.redirect(301, "/store");
    }

    // Check old event URLs: /event/anything/
    if (normalizedPath.startsWith("/event/")) {
      return res.redirect(301, "/schedule-list");
    }

    next();
  };
}
