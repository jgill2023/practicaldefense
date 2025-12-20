import { useEffect } from 'react';
import { useLocation } from 'wouter';

interface SEOProps {
  title?: string;
  description?: string;
  image?: string;
  type?: 'website' | 'article' | 'product';
  noindex?: boolean;
  jsonLd?: Record<string, any>;
}

const DEFAULT_TITLE = 'Apache Solutions | Professional Firearms Training';
const DEFAULT_DESCRIPTION = 'Professional firearms training courses, private instruction, and defensive skills education offered by Apache Solutions with online registration and scheduling.';
const DEFAULT_IMAGE = 'https://apachenc.com/og-image.jpg';
const SITE_NAME = 'Apache Solutions';
const BASE_URL = 'https://apachenc.com';

function updateMetaTag(property: string, content: string, isProperty = false) {
  const attr = isProperty ? 'property' : 'name';
  let element = document.querySelector(`meta[${attr}="${property}"]`);
  
  if (!element) {
    element = document.createElement('meta');
    element.setAttribute(attr, property);
    document.head.appendChild(element);
  }
  
  element.setAttribute('content', content);
}

function updateLinkTag(rel: string, href: string) {
  let element = document.querySelector(`link[rel="${rel}"]`) as HTMLLinkElement;
  
  if (!element) {
    element = document.createElement('link');
    element.setAttribute('rel', rel);
    document.head.appendChild(element);
  }
  
  element.setAttribute('href', href);
}

function updateJsonLd(data: Record<string, any> | null) {
  const existingScript = document.querySelector('script[data-seo-jsonld]');
  if (existingScript) {
    existingScript.remove();
  }
  
  if (data) {
    const script = document.createElement('script');
    script.type = 'application/ld+json';
    script.setAttribute('data-seo-jsonld', 'true');
    script.textContent = JSON.stringify(data);
    document.head.appendChild(script);
  }
}

export function SEO({
  title,
  description,
  image,
  type = 'website',
  noindex = false,
  jsonLd,
}: SEOProps) {
  const [location] = useLocation();
  
  const fullTitle = title ? `${title} | ${SITE_NAME}` : DEFAULT_TITLE;
  const fullDescription = description || DEFAULT_DESCRIPTION;
  const fullImage = image || DEFAULT_IMAGE;
  const canonicalUrl = `${BASE_URL}${location}`;
  
  useEffect(() => {
    document.title = fullTitle;
    
    updateMetaTag('description', fullDescription);
    updateMetaTag('robots', noindex ? 'noindex, nofollow' : 'index, follow');
    
    updateLinkTag('canonical', canonicalUrl);
    
    updateMetaTag('og:type', type, true);
    updateMetaTag('og:site_name', SITE_NAME, true);
    updateMetaTag('og:title', fullTitle, true);
    updateMetaTag('og:description', fullDescription, true);
    updateMetaTag('og:image', fullImage, true);
    updateMetaTag('og:url', canonicalUrl, true);
    
    updateMetaTag('twitter:card', 'summary_large_image', false);
    updateMetaTag('twitter:title', fullTitle, false);
    updateMetaTag('twitter:description', fullDescription, false);
    updateMetaTag('twitter:image', fullImage, false);
    
    if (jsonLd) {
      updateJsonLd(jsonLd);
    }
    
    return () => {
      updateJsonLd(null);
    };
  }, [fullTitle, fullDescription, fullImage, canonicalUrl, type, noindex, jsonLd]);
  
  return null;
}

export function generateCourseJsonLd(course: {
  id: string;
  title: string;
  description?: string;
  price?: number;
  imageUrl?: string;
  category?: string;
}) {
  return {
    '@context': 'https://schema.org',
    '@type': 'Course',
    name: course.title,
    description: course.description || `${course.title} - Professional firearms training course`,
    provider: {
      '@type': 'Organization',
      name: 'Apache Solutions',
      url: BASE_URL,
    },
    url: `${BASE_URL}/course/${course.id}`,
    image: course.imageUrl || DEFAULT_IMAGE,
    ...(course.price && {
      offers: {
        '@type': 'Offer',
        price: course.price,
        priceCurrency: 'USD',
        availability: 'https://schema.org/InStock',
      },
    }),
    ...(course.category && {
      courseCategory: course.category,
    }),
  };
}

export function generateEventJsonLd(event: {
  id: string;
  title: string;
  description?: string;
  startDate: string;
  endDate?: string;
  location?: string;
  price?: number;
  imageUrl?: string;
}) {
  return {
    '@context': 'https://schema.org',
    '@type': 'Event',
    name: event.title,
    description: event.description || `${event.title} - Firearms training event`,
    startDate: event.startDate,
    endDate: event.endDate || event.startDate,
    eventStatus: 'https://schema.org/EventScheduled',
    eventAttendanceMode: 'https://schema.org/OfflineEventAttendanceMode',
    location: {
      '@type': 'Place',
      name: event.location || 'Apache Solutions Training Facility',
      address: {
        '@type': 'PostalAddress',
        addressLocality: 'Yadkinville',
        addressRegion: 'NC',
        addressCountry: 'US',
      },
    },
    organizer: {
      '@type': 'Organization',
      name: 'Apache Solutions',
      url: BASE_URL,
    },
    image: event.imageUrl || DEFAULT_IMAGE,
    ...(event.price && {
      offers: {
        '@type': 'Offer',
        price: event.price,
        priceCurrency: 'USD',
        availability: 'https://schema.org/InStock',
        url: `${BASE_URL}/course/${event.id}`,
      },
    }),
  };
}

export function generateAppointmentJsonLd(appointment: {
  title: string;
  description?: string;
  duration?: string;
  price?: number;
}) {
  return {
    '@context': 'https://schema.org',
    '@type': 'Service',
    name: appointment.title,
    description: appointment.description || `${appointment.title} - Private training session`,
    provider: {
      '@type': 'Organization',
      name: 'Apache Solutions',
      url: BASE_URL,
    },
    ...(appointment.price && {
      offers: {
        '@type': 'Offer',
        price: appointment.price,
        priceCurrency: 'USD',
      },
    }),
  };
}

export default SEO;
