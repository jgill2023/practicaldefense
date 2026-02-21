import { Request, Response, NextFunction } from "express";
import fs from "fs";
import path from "path";
import { getDynamicSEOConfig, generateMetaTags, type SEOConfig } from "./seo";

const PUBLIC_ROUTES = [
  "/",
  "/racc-program",
  "/store",
  "/courses",
  "/about",
  "/contact",
  "/schedule-list",
  "/schedule-calendar",
  "/a-girl-and-a-gun",
  "/about-chris",
  "/articles",
  "/gift-cards",
  "/privacy-policy",
  "/terms-of-service",
  "/refund-policy",
  "/storefront",
  "/nmccl",
  "/online-nm-concealed-carry-course",
  "/defensive-handgun-course",
  "/defensive-handgun-clinics",
  "/onscreen-handgun-handling",
  "/testimonials",
  "/media",
  "/ccw-quiz",
];

const DYNAMIC_ROUTE_PATTERNS = [
  /^\/courses?\/\d+$/,
  /^\/instructors?\/\d+$/,
  /^\/articles\/[\w-]+$/,
];

function isPublicRoute(path: string): boolean {
  const normalizedPath = path.split("?")[0].replace(/\/$/, "") || "/";
  
  if (PUBLIC_ROUTES.includes(normalizedPath)) {
    return true;
  }
  
  for (const pattern of DYNAMIC_ROUTE_PATTERNS) {
    if (pattern.test(normalizedPath)) {
      return true;
    }
  }
  
  return false;
}

async function getHtmlTemplate(): Promise<string> {
  const templatePath = path.resolve(
    import.meta.dirname,
    "..",
    "client",
    "index.html"
  );
  return fs.promises.readFile(templatePath, "utf-8");
}

async function getProductionHtmlTemplate(): Promise<string> {
  // In production, read from the built dist folder
  const distPath = path.resolve(import.meta.dirname, "public", "index.html");
  if (fs.existsSync(distPath)) {
    return fs.promises.readFile(distPath, "utf-8");
  }
  // Fallback to client index.html if dist not available
  return getHtmlTemplate();
}

function injectMetaTags(html: string, config: SEOConfig): string {
  const metaTags = generateMetaTags(config);
  
  const titleRegex = /<title>[^<]*<\/title>/;
  const descriptionRegex = /<meta\s+name="description"[^>]*>/;
  const robotsRegex = /<meta\s+name="robots"[^>]*>/;
  const canonicalRegex = /<link\s+rel="canonical"[^>]*>/;
  const ogTypeRegex = /<meta\s+property="og:type"[^>]*>/;
  const ogSiteNameRegex = /<meta\s+property="og:site_name"[^>]*>/;
  const ogTitleRegex = /<meta\s+property="og:title"[^>]*>/;
  const ogDescriptionRegex = /<meta\s+property="og:description"[^>]*>/;
  const ogImageRegex = /<meta\s+property="og:image"[^>]*>/;
  const ogUrlRegex = /<meta\s+property="og:url"[^>]*>/;
  const twitterCardRegex = /<meta\s+name="twitter:card"[^>]*>/;
  const twitterTitleRegex = /<meta\s+name="twitter:title"[^>]*>/;
  const twitterDescriptionRegex = /<meta\s+name="twitter:description"[^>]*>/;
  const twitterImageRegex = /<meta\s+name="twitter:image"[^>]*>/;
  
  const escapeHtml = (text: string): string => {
    return text
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  };

  let result = html;
  
  result = result.replace(titleRegex, `<title>${escapeHtml(config.title)}</title>`);
  result = result.replace(descriptionRegex, `<meta name="description" content="${escapeHtml(config.description)}" />`);
  result = result.replace(robotsRegex, `<meta name="robots" content="${config.noIndex ? 'noindex, nofollow' : 'index, follow'}" />`);
  result = result.replace(canonicalRegex, `<link rel="canonical" href="${escapeHtml(config.canonicalUrl)}" />`);
  
  result = result.replace(ogTypeRegex, `<meta property="og:type" content="${escapeHtml(config.ogType)}" />`);
  result = result.replace(ogTitleRegex, `<meta property="og:title" content="${escapeHtml(config.title)}" />`);
  result = result.replace(ogDescriptionRegex, `<meta property="og:description" content="${escapeHtml(config.description)}" />`);
  result = result.replace(ogImageRegex, `<meta property="og:image" content="${escapeHtml(config.ogImage)}" />`);
  result = result.replace(ogUrlRegex, `<meta property="og:url" content="${escapeHtml(config.canonicalUrl)}" />`);
  
  result = result.replace(twitterTitleRegex, `<meta name="twitter:title" content="${escapeHtml(config.title)}" />`);
  result = result.replace(twitterDescriptionRegex, `<meta name="twitter:description" content="${escapeHtml(config.description)}" />`);
  result = result.replace(twitterImageRegex, `<meta name="twitter:image" content="${escapeHtml(config.ogImage)}" />`);

  const existingJsonLdRegex = /<script type="application\/ld\+json">[\s\S]*?<\/script>\s*(<script type="application\/ld\+json">[\s\S]*?<\/script>)?/g;
  
  if (config.structuredData && config.structuredData.length > 0) {
    const jsonLdScripts = config.structuredData
      .map(schema => `<script type="application/ld+json">${JSON.stringify(schema)}</script>`)
      .join("\n    ");
    
    result = result.replace(existingJsonLdRegex, jsonLdScripts);
  }

  return result;
}

export function createSeoMiddleware() {
  return async (req: Request, res: Response, next: NextFunction) => {
    // In development, skip SEO middleware to let Vite handle HMR and transformations
    // SEO injection only matters for production where crawlers access the site
    if (process.env.NODE_ENV === "development") {
      return next();
    }
    
    const requestPath = req.path;
    
    if (requestPath.startsWith("/api") || 
        requestPath.startsWith("/@") || 
        requestPath.startsWith("/node_modules") ||
        requestPath.startsWith("/src") ||
        requestPath.includes(".")) {
      return next();
    }
    
    if (!isPublicRoute(requestPath)) {
      return next();
    }
    
    try {
      const seoConfig = await getDynamicSEOConfig(requestPath);
      const template = await getProductionHtmlTemplate();
      const html = injectMetaTags(template, seoConfig);
      
      res.set("Content-Type", "text/html");
      res.send(html);
    } catch (error) {
      console.error("SEO middleware error:", error);
      next();
    }
  };
}

export async function servePublicRouteWithSeo(req: Request, res: Response): Promise<void> {
  try {
    const seoConfig = await getDynamicSEOConfig(req.path);
    const template = await getHtmlTemplate();
    const html = injectMetaTags(template, seoConfig);
    
    res.set("Content-Type", "text/html");
    res.send(html);
  } catch (error) {
    console.error("Error serving public route with SEO:", error);
    res.status(500).send("Server error");
  }
}
