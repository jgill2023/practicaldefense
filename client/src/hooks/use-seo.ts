import { useEffect } from "react";

interface SEOConfig {
  title?: string;
  description?: string;
  ogImage?: string;
  noIndex?: boolean;
}

const SITE_NAME = "Apache Solutions";
const BASE_URL = "https://apachenc.com";
const DEFAULT_DESCRIPTION = "Professional firearms training courses, private instruction, and defensive skills education offered by Apache Solutions with online registration and scheduling.";
const DEFAULT_OG_IMAGE = `${BASE_URL}/public/og-image.jpg`;

export function useSEO(config: SEOConfig) {
  useEffect(() => {
    const fullTitle = config.title 
      ? `${config.title} | ${SITE_NAME}`
      : `${SITE_NAME} | Professional Firearms Training`;
    
    document.title = fullTitle;

    const updateMetaTag = (selector: string, content: string, isProperty = false) => {
      const attr = isProperty ? 'property' : 'name';
      let meta = document.querySelector(`meta[${attr}="${selector}"]`) as HTMLMetaElement;
      if (meta) {
        meta.content = content;
      }
    };

    if (config.description) {
      updateMetaTag('description', config.description);
      updateMetaTag('og:description', config.description, true);
      updateMetaTag('twitter:description', config.description);
    }

    updateMetaTag('og:title', fullTitle, true);
    updateMetaTag('twitter:title', fullTitle);

    if (config.ogImage) {
      const imageUrl = config.ogImage.startsWith('http') 
        ? config.ogImage 
        : `${BASE_URL}${config.ogImage}`;
      updateMetaTag('og:image', imageUrl, true);
      updateMetaTag('twitter:image', imageUrl);
    }

    const canonical = document.querySelector('link[rel="canonical"]') as HTMLLinkElement;
    if (canonical) {
      canonical.href = `${BASE_URL}${window.location.pathname}`;
    }

    updateMetaTag('og:url', `${BASE_URL}${window.location.pathname}`, true);

    const robotsMeta = document.querySelector('meta[name="robots"]') as HTMLMetaElement;
    if (robotsMeta) {
      robotsMeta.content = config.noIndex ? 'noindex, nofollow' : 'index, follow';
    }
  }, [config.title, config.description, config.ogImage, config.noIndex]);
}

export const seoConfigs = {
  home: {
    title: "",
    description: DEFAULT_DESCRIPTION,
  },
  raccProgram: {
    title: "RACC Training Program",
    description: "The Responsibly Armed Citizen Criterion (RACC) program offers 8 comprehensive training packages for individuals, couples, and families. Professional firearms instruction in Yadkinville, NC.",
  },
  store: {
    title: "Training Store",
    description: "Shop firearms training packages, merchandise, and gear from Apache Solutions. Professional equipment for responsible gun owners.",
  },
  courses: {
    title: "Training Courses",
    description: "Browse our comprehensive firearms training courses. From beginner to advanced, find the right course for your skill level.",
  },
  login: {
    title: "Sign In",
    description: "Sign in to your Apache Solutions account to manage enrollments and track your training progress.",
    noIndex: true,
  },
  register: {
    title: "Create Account",
    description: "Create your Apache Solutions account to register for courses and access exclusive training materials.",
    noIndex: true,
  },
  dashboard: {
    title: "Dashboard",
    description: "Manage your training schedule, enrollments, and account settings.",
    noIndex: true,
  },
  cart: {
    title: "Shopping Cart",
    description: "Review and checkout your selected training packages and merchandise.",
    noIndex: true,
  },
  checkout: {
    title: "Checkout",
    description: "Complete your purchase securely.",
    noIndex: true,
  },
  about: {
    title: "About Us",
    description: "Learn about Apache Solutions and our commitment to professional firearms training and safety education in North Carolina.",
  },
  contact: {
    title: "Contact Us",
    description: "Get in touch with Apache Solutions for questions about our firearms training programs, scheduling, or private instruction.",
  },
};
