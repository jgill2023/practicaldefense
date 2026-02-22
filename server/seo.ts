import { db } from "./db";
import { courses, courseSchedules, users } from "@shared/schema";
import { eq, and, gte } from "drizzle-orm";

const SITE_NAME = "Practical Defense Training";
const BASE_URL = "https://abqconcealedcarry.com";
const DEFAULT_DESCRIPTION = "Professional firearms training courses, private instruction, and defensive skills education offered by Practical Defense Training with online registration and scheduling.";
const DEFAULT_OG_IMAGE = `${BASE_URL}/public/og-image.jpg`;
const LOGO_URL = `${BASE_URL}/public/logo.png`;

export type SEOConfig = {
  title: string;
  description: string;
  canonicalUrl: string;
  ogImage: string;
  ogType: string;
  twitterCard: string;
  noIndex?: boolean;
  structuredData?: object[];
};

interface RouteConfig {
  title: string;
  description: string;
  ogType?: string;
  noIndex?: boolean;
}

const routeConfigs: Record<string, RouteConfig> = {
  "/": {
    title: "Practical Defense Training | Professional Firearms Training",
    description: DEFAULT_DESCRIPTION,
  },
  "/racc-program": {
    title: "RACC Training Program | Practical Defense Training",
    description: "The Responsibly Armed Citizen Criterion (RACC) program offers 8 comprehensive training packages for individuals, couples, and families. Professional firearms instruction in Albuquerque, NM.",
  },
  "/store": {
    title: "Training Store | Practical Defense Training",
    description: "Shop firearms training packages, merchandise, and gear from Practical Defense Training. Professional equipment for responsible gun owners.",
  },
  "/courses": {
    title: "Training Courses | Practical Defense Training",
    description: "Browse our comprehensive firearms training courses. From beginner to advanced, find the right course for your skill level.",
  },
  "/login": {
    title: "Sign In | Practical Defense Training",
    description: "Sign in to your Practical Defense Training account to manage enrollments and track your training progress.",
    noIndex: true,
  },
  "/register": {
    title: "Create Account | Practical Defense Training",
    description: "Create your Practical Defense Training account to register for courses and access exclusive training materials.",
    noIndex: true,
  },
  "/dashboard": {
    title: "Dashboard | Practical Defense Training",
    description: "Manage your training schedule, enrollments, and account settings.",
    noIndex: true,
  },
  "/admin": {
    title: "Admin Panel | Practical Defense Training",
    description: "Administrative dashboard for Practical Defense Training.",
    noIndex: true,
  },
  "/cart": {
    title: "Shopping Cart | Practical Defense Training",
    description: "Review and checkout your selected training packages and merchandise.",
    noIndex: true,
  },
  "/checkout": {
    title: "Checkout | Practical Defense Training",
    description: "Complete your purchase securely.",
    noIndex: true,
  },
  "/about": {
    title: "About Us | Practical Defense Training",
    description: "Learn about Practical Defense Training and our commitment to professional firearms training and safety education in New Mexico.",
  },
  "/contact": {
    title: "Contact Us | Practical Defense Training",
    description: "Get in touch with Practical Defense Training for questions about our firearms training programs, scheduling, or private instruction.",
  },
  "/nmccl": {
    title: "New Mexico Concealed Carry Course | Practical Defense Training",
    description: "NM DPS-approved concealed carry license course. 2-day weekend format with 12 hours classroom and 3 hours live-fire range training. $165 in Albuquerque, NM.",
  },
  "/online-nm-concealed-carry-course": {
    title: "Online NM Concealed Carry Course | Practical Defense Training",
    description: "Complete your New Mexico concealed carry training online. NM DPS-approved 15-hour hybrid course: 8 hours online at your own pace plus 7-hour live-fire range session.",
  },
  "/defensive-handgun-course": {
    title: "Defensive Handgun Course | Practical Defense Training",
    description: "Advanced defensive handgun training in Albuquerque, NM. 1-day ($155) or 2-day ($250) courses covering drawing from concealment, threat assessment, and tactical shooting.",
  },
  "/defensive-handgun-clinics": {
    title: "Defensive Handgun Clinics | Practical Defense Training",
    description: "Focused 2-4 hour defensive shooting clinics. $56-$65 per session with 2-5 students per instructor. Concealment draw, tactical movement, force-on-force, and more.",
  },
  "/onscreen-handgun-handling": {
    title: "Onscreen Handgun Handling for Actors | Practical Defense Training",
    description: "Firearms training for actors and film professionals. Learn safe, authentic weapons handling for on-screen performances. 4-hour workshop with classroom and range time.",
  },
  "/testimonials": {
    title: "Student Testimonials | Practical Defense Training",
    description: "Read what our students say about their concealed carry and firearms training experience with Practical Defense Training in Albuquerque, NM.",
  },
  "/media": {
    title: "Videos & Media | Practical Defense Training",
    description: "Watch training videos, course previews, and media appearances from Practical Defense Training. Firearms education and defensive shooting content.",
  },
  "/ccw-quiz": {
    title: "CCW Knowledge Quiz | Practical Defense Training",
    description: "Test your New Mexico concealed carry knowledge with our free quiz. Learn about NM CCL laws, carry locations, and licensing requirements.",
  },
  "/schedule-list": {
    title: "Course Schedule | Practical Defense Training",
    description: "View upcoming firearms training courses and register online. Concealed carry, defensive handgun, and private instruction in Albuquerque, NM.",
  },
  "/schedule-calendar": {
    title: "Training Calendar | Practical Defense Training",
    description: "Browse our training calendar for upcoming concealed carry courses, defensive handgun clinics, and range sessions across New Mexico.",
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
      "addressLocality": "Albuquerque",
      "addressRegion": "NM",
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
      "addressLocality": "Albuquerque",
      "addressRegion": "NM",
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
        baseConfig.title = `${c.title} | Practical Defense Training`;
        baseConfig.description = c.description?.slice(0, 160) || `Learn more about ${c.title} at Practical Defense Training.`;
        baseConfig.canonicalUrl = `${BASE_URL}/course/${courseId}`;
        
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
        baseConfig.title = `${name} - Firearms Instructor | Practical Defense Training`;
        baseConfig.description = `Meet ${name}, a professional firearms instructor at Practical Defense Training.`;
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
    { loc: "/schedule-list", priority: "0.9", changefreq: "daily" },
    { loc: "/schedule-calendar", priority: "0.8", changefreq: "daily" },
    { loc: "/courses", priority: "0.9", changefreq: "weekly" },
    { loc: "/nmccl", priority: "0.9", changefreq: "monthly" },
    { loc: "/online-nm-concealed-carry-course", priority: "0.9", changefreq: "monthly" },
    { loc: "/defensive-handgun-course", priority: "0.8", changefreq: "monthly" },
    { loc: "/defensive-handgun-clinics", priority: "0.8", changefreq: "monthly" },
    { loc: "/onscreen-handgun-handling", priority: "0.7", changefreq: "monthly" },
    { loc: "/racc-program", priority: "0.9", changefreq: "weekly" },
    { loc: "/store", priority: "0.8", changefreq: "weekly" },
    { loc: "/gift-cards", priority: "0.7", changefreq: "monthly" },
    { loc: "/about", priority: "0.7", changefreq: "monthly" },
    { loc: "/contact", priority: "0.7", changefreq: "monthly" },
    { loc: "/articles", priority: "0.6", changefreq: "weekly" },
    { loc: "/testimonials", priority: "0.6", changefreq: "monthly" },
    { loc: "/media", priority: "0.5", changefreq: "monthly" },
    { loc: "/ccw-quiz", priority: "0.7", changefreq: "monthly" },
    { loc: "/a-girl-and-a-gun", priority: "0.5", changefreq: "monthly" },
    { loc: "/privacy-policy", priority: "0.3", changefreq: "yearly" },
    { loc: "/terms-of-service", priority: "0.3", changefreq: "yearly" },
    { loc: "/refund-policy", priority: "0.3", changefreq: "yearly" },
  ];

  let dynamicPages: { loc: string; priority: string; changefreq: string }[] = [];

  try {
    // Add published courses
    const activeCourses = await db.select({ id: courses.id })
      .from(courses)
      .where(eq(courses.isPublished, true));

    dynamicPages = activeCourses.map(c => ({
      loc: `/course/${c.id}`,
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

# Disallow admin and private routes
Disallow: /instructor-dashboard
Disallow: /instructor-calendar
Disallow: /instructor
Disallow: /course-management
Disallow: /course-forms-management
Disallow: /product-management
Disallow: /admin/users
Disallow: /admin/credits
Disallow: /promo-codes
Disallow: /communications
Disallow: /reports
Disallow: /settings
Disallow: /gift-card-management
Disallow: /appointments
Disallow: /student-portal
Disallow: /students
Disallow: /pending-approval
Disallow: /checkout
Disallow: /cart
Disallow: /api
Disallow: /login
Disallow: /signup
Disallow: /register
Disallow: /verify-email
Disallow: /reset-password
Disallow: /course-registration

# Allow important pages
Allow: /
Allow: /course/
Allow: /courses
Allow: /nmccl
Allow: /online-nm-concealed-carry-course
Allow: /defensive-handgun-course
Allow: /defensive-handgun-clinics
Allow: /onscreen-handgun-handling
Allow: /store
Allow: /about
Allow: /contact
Allow: /book-appointment/
Allow: /schedule-list
Allow: /schedule-calendar
Allow: /articles
Allow: /testimonials
Allow: /media
Allow: /ccw-quiz
Allow: /gift-cards
Allow: /racc-program
Allow: /a-girl-and-a-gun
Allow: /privacy-policy
Allow: /terms-of-service
Allow: /refund-policy

# Sitemap location
Sitemap: ${BASE_URL}/sitemap.xml
`;
}
