import { db } from "./db";
import { courses, courseSchedules, users } from "@shared/schema";
import { eq, and, gte } from "drizzle-orm";

const SITE_NAME = "Apache Solutions";
const BASE_URL = "https://apachenc.com";
const DEFAULT_DESCRIPTION = "Professional firearms training courses, private instruction, and defensive skills education offered by Apache Solutions with online registration and scheduling.";
const DEFAULT_OG_IMAGE = `${BASE_URL}/public/og-image.jpg`;
const LOGO_URL = `${BASE_URL}/public/logo.png`;

export interface SEOConfig {
  title: string;
  description: string;
  canonicalUrl: string;
  ogImage: string;
  ogType: string;
  twitterCard: string;
  noIndex?: boolean;
  structuredData?: object[];
}

interface RouteConfig {
  title: string;
  description: string;
  ogType?: string;
  noIndex?: boolean;
}

const routeConfigs: Record<string, RouteConfig> = {
  "/": {
    title: "Apache Solutions | Professional Firearms Training",
    description: DEFAULT_DESCRIPTION,
  },
  "/racc-program": {
    title: "RACC Training Program | Apache Solutions",
    description: "The Responsibly Armed Citizen Criterion (RACC) program offers 8 comprehensive training packages for individuals, couples, and families. Professional firearms instruction in Yadkinville, NC.",
  },
  "/store": {
    title: "Training Store | Apache Solutions",
    description: "Shop firearms training packages, merchandise, and gear from Apache Solutions. Professional equipment for responsible gun owners.",
  },
  "/courses": {
    title: "Training Courses | Apache Solutions",
    description: "Browse our comprehensive firearms training courses. From beginner to advanced, find the right course for your skill level.",
  },
  "/login": {
    title: "Sign In | Apache Solutions",
    description: "Sign in to your Apache Solutions account to manage enrollments and track your training progress.",
    noIndex: true,
  },
  "/register": {
    title: "Create Account | Apache Solutions",
    description: "Create your Apache Solutions account to register for courses and access exclusive training materials.",
    noIndex: true,
  },
  "/dashboard": {
    title: "Dashboard | Apache Solutions",
    description: "Manage your training schedule, enrollments, and account settings.",
    noIndex: true,
  },
  "/admin": {
    title: "Admin Panel | Apache Solutions",
    description: "Administrative dashboard for Apache Solutions.",
    noIndex: true,
  },
  "/cart": {
    title: "Shopping Cart | Apache Solutions",
    description: "Review and checkout your selected training packages and merchandise.",
    noIndex: true,
  },
  "/checkout": {
    title: "Checkout | Apache Solutions",
    description: "Complete your purchase securely.",
    noIndex: true,
  },
  "/about": {
    title: "About Us | Apache Solutions",
    description: "Learn about Apache Solutions and our commitment to professional firearms training and safety education in North Carolina.",
  },
  "/contact": {
    title: "Contact Us | Apache Solutions",
    description: "Get in touch with Apache Solutions for questions about our firearms training programs, scheduling, or private instruction.",
  },
};

function getOrganizationSchema() {
  return {
    "@context": "https://schema.org",
    "@type": "Organization",
    "name": SITE_NAME,
    "url": BASE_URL,
    "logo": LOGO_URL,
    "description": DEFAULT_DESCRIPTION,
    "address": {
      "@type": "PostalAddress",
      "addressLocality": "Yadkinville",
      "addressRegion": "NC",
      "addressCountry": "US"
    },
    "sameAs": []
  };
}

function getLocalBusinessSchema() {
  return {
    "@context": "https://schema.org",
    "@type": "LocalBusiness",
    "name": SITE_NAME,
    "url": BASE_URL,
    "logo": LOGO_URL,
    "image": DEFAULT_OG_IMAGE,
    "description": DEFAULT_DESCRIPTION,
    "address": {
      "@type": "PostalAddress",
      "addressLocality": "Yadkinville",
      "addressRegion": "NC",
      "addressCountry": "US"
    },
    "priceRange": "$$"
  };
}

export function getSEOConfig(path: string): SEOConfig {
  const normalizedPath = path.split("?")[0].replace(/\/$/, "") || "/";
  
  const routeConfig = routeConfigs[normalizedPath] || {
    title: `${SITE_NAME} | Professional Firearms Training`,
    description: DEFAULT_DESCRIPTION,
  };

  const structuredData: object[] = [getOrganizationSchema()];
  
  if (normalizedPath === "/") {
    structuredData.push(getLocalBusinessSchema());
  }

  return {
    title: routeConfig.title,
    description: routeConfig.description,
    canonicalUrl: `${BASE_URL}${normalizedPath === "/" ? "" : normalizedPath}`,
    ogImage: DEFAULT_OG_IMAGE,
    ogType: routeConfig.ogType || "website",
    twitterCard: "summary_large_image",
    noIndex: routeConfig.noIndex,
    structuredData,
  };
}

export async function getDynamicSEOConfig(path: string): Promise<SEOConfig> {
  const baseConfig = getSEOConfig(path);
  const normalizedPath = path.split("?")[0];

  // Handle dynamic course pages
  const courseMatch = normalizedPath.match(/^\/courses?\/(\d+)$/);
  if (courseMatch) {
    const courseId = parseInt(courseMatch[1]);
    try {
      const course = await db.select().from(courses).where(eq(courses.id, courseId)).limit(1);
      if (course.length > 0) {
        const c = course[0];
        baseConfig.title = `${c.title} | Apache Solutions`;
        baseConfig.description = c.description?.slice(0, 160) || `Learn more about ${c.title} at Apache Solutions.`;
        baseConfig.canonicalUrl = `${BASE_URL}/courses/${courseId}`;
        
        if (c.imageUrl) {
          baseConfig.ogImage = c.imageUrl.startsWith("http") ? c.imageUrl : `${BASE_URL}${c.imageUrl}`;
        }

        baseConfig.structuredData = [
          getOrganizationSchema(),
          {
            "@context": "https://schema.org",
            "@type": "Course",
            "name": c.title,
            "description": c.description,
            "provider": {
              "@type": "Organization",
              "name": SITE_NAME,
              "url": BASE_URL
            }
          }
        ];
      }
    } catch (error) {
      console.error("Error fetching course for SEO:", error);
    }
  }

  // Handle instructor pages
  const instructorMatch = normalizedPath.match(/^\/instructors?\/(\d+)$/);
  if (instructorMatch) {
    const instructorId = parseInt(instructorMatch[1]);
    try {
      const instructor = await db.select().from(users).where(
        and(eq(users.id, instructorId), eq(users.role, "instructor"))
      ).limit(1);
      
      if (instructor.length > 0) {
        const i = instructor[0];
        const name = `${i.firstName || ""} ${i.lastName || ""}`.trim() || "Instructor";
        baseConfig.title = `${name} - Firearms Instructor | Apache Solutions`;
        baseConfig.description = `Meet ${name}, a professional firearms instructor at Apache Solutions.`;
        baseConfig.canonicalUrl = `${BASE_URL}/instructors/${instructorId}`;

        if (i.profileImageUrl) {
          baseConfig.ogImage = i.profileImageUrl.startsWith("http") 
            ? i.profileImageUrl 
            : `${BASE_URL}${i.profileImageUrl}`;
        }

        baseConfig.structuredData = [
          getOrganizationSchema(),
          {
            "@context": "https://schema.org",
            "@type": "Person",
            "name": name,
            "jobTitle": "Firearms Instructor",
            "worksFor": {
              "@type": "Organization",
              "name": SITE_NAME,
              "url": BASE_URL
            }
          }
        ];
      }
    } catch (error) {
      console.error("Error fetching instructor for SEO:", error);
    }
  }

  return baseConfig;
}

export function generateMetaTags(config: SEOConfig): string {
  const tags: string[] = [];

  // Basic meta tags
  tags.push(`<title>${escapeHtml(config.title)}</title>`);
  tags.push(`<meta name="description" content="${escapeHtml(config.description)}" />`);
  tags.push(`<link rel="canonical" href="${escapeHtml(config.canonicalUrl)}" />`);
  
  if (config.noIndex) {
    tags.push(`<meta name="robots" content="noindex, nofollow" />`);
  } else {
    tags.push(`<meta name="robots" content="index, follow" />`);
  }

  // Open Graph tags
  tags.push(`<meta property="og:type" content="${escapeHtml(config.ogType)}" />`);
  tags.push(`<meta property="og:site_name" content="${escapeHtml(SITE_NAME)}" />`);
  tags.push(`<meta property="og:title" content="${escapeHtml(config.title)}" />`);
  tags.push(`<meta property="og:description" content="${escapeHtml(config.description)}" />`);
  tags.push(`<meta property="og:image" content="${escapeHtml(config.ogImage)}" />`);
  tags.push(`<meta property="og:url" content="${escapeHtml(config.canonicalUrl)}" />`);

  // Twitter/X tags
  tags.push(`<meta name="twitter:card" content="${escapeHtml(config.twitterCard)}" />`);
  tags.push(`<meta name="twitter:title" content="${escapeHtml(config.title)}" />`);
  tags.push(`<meta name="twitter:description" content="${escapeHtml(config.description)}" />`);
  tags.push(`<meta name="twitter:image" content="${escapeHtml(config.ogImage)}" />`);

  // Structured data
  if (config.structuredData && config.structuredData.length > 0) {
    for (const schema of config.structuredData) {
      tags.push(`<script type="application/ld+json">${JSON.stringify(schema)}</script>`);
    }
  }

  return tags.join("\n    ");
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

export async function generateSitemap(): Promise<string> {
  const staticPages = [
    { loc: "/", priority: "1.0", changefreq: "weekly" },
    { loc: "/racc-program", priority: "0.9", changefreq: "weekly" },
    { loc: "/store", priority: "0.8", changefreq: "weekly" },
    { loc: "/courses", priority: "0.8", changefreq: "weekly" },
    { loc: "/about", priority: "0.7", changefreq: "monthly" },
    { loc: "/contact", priority: "0.7", changefreq: "monthly" },
  ];

  let dynamicPages: { loc: string; priority: string; changefreq: string }[] = [];

  try {
    // Add published courses
    const activeCourses = await db.select({ id: courses.id })
      .from(courses)
      .where(eq(courses.isPublished, true));

    dynamicPages = activeCourses.map(c => ({
      loc: `/courses/${c.id}`,
      priority: "0.7",
      changefreq: "weekly"
    }));
  } catch (error) {
    console.error("Error generating dynamic sitemap entries:", error);
  }

  const allPages = [...staticPages, ...dynamicPages];
  const today = new Date().toISOString().split("T")[0];

  const urlEntries = allPages.map(page => `
  <url>
    <loc>${BASE_URL}${page.loc}</loc>
    <lastmod>${today}</lastmod>
    <changefreq>${page.changefreq}</changefreq>
    <priority>${page.priority}</priority>
  </url>`).join("");

  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urlEntries}
</urlset>`;
}

export function generateRobotsTxt(): string {
  return `User-agent: *
Allow: /

# Disallow admin and private paths
Disallow: /dashboard
Disallow: /admin
Disallow: /login
Disallow: /register
Disallow: /api
Disallow: /cart
Disallow: /checkout

# Sitemap
Sitemap: ${BASE_URL}/sitemap.xml
`;
}
