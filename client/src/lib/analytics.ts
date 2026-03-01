// Cookie consent types and GA4 analytics utility
// GA4 is only loaded dynamically after the user opts in via the cookie banner.

export interface CookieConsent {
  essential: boolean;
  analytics: boolean;
  marketing: boolean;
  timestamp: string;
}

const CONSENT_KEY = 'cookie_consent';

// ── Consent persistence ───────────────────────────────────────────────

export function getConsent(): CookieConsent | null {
  try {
    const raw = localStorage.getItem(CONSENT_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function saveConsent(consent: CookieConsent): void {
  localStorage.setItem(CONSENT_KEY, JSON.stringify(consent));

  // If analytics was just accepted, initialise GA immediately
  if (consent.analytics) {
    initGA();
  }
}

export function hasConsent(): boolean {
  return getConsent() !== null;
}

// ── Google Analytics 4 ────────────────────────────────────────────────

declare global {
  interface Window {
    dataLayer: any[];
    gtag: (...args: any[]) => void;
  }
}

let gaInitialised = false;

export function initGA(): void {
  const id = import.meta.env.VITE_GA_MEASUREMENT_ID as string | undefined;
  if (!id || gaInitialised) return;

  const consent = getConsent();
  if (!consent?.analytics) return;

  // Inject the gtag.js script
  const script = document.createElement('script');
  script.src = `https://www.googletagmanager.com/gtag/js?id=${id}`;
  script.async = true;
  document.head.appendChild(script);

  window.dataLayer = window.dataLayer || [];
  window.gtag = function () {
    window.dataLayer.push(arguments);
  };
  window.gtag('js', new Date());
  window.gtag('config', id, { send_page_view: false });

  gaInitialised = true;
}

export function trackPageView(path: string): void {
  if (!gaInitialised || !window.gtag) return;
  const id = import.meta.env.VITE_GA_MEASUREMENT_ID as string | undefined;
  if (!id) return;
  window.gtag('event', 'page_view', {
    page_path: path,
    page_location: window.location.href,
  });
}
