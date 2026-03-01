import { useState, useEffect } from 'react';
import { Link } from 'wouter';
import { getConsent, saveConsent, type CookieConsent as Consent } from '@/lib/analytics';

export function CookieConsentBanner() {
  const [visible, setVisible] = useState(false);
  const [showPreferences, setShowPreferences] = useState(false);
  const [analytics, setAnalytics] = useState(true);
  const [marketing, setMarketing] = useState(false);

  useEffect(() => {
    // Show banner only if no consent has been recorded yet
    if (!getConsent()) {
      setVisible(true);
    }
  }, []);

  if (!visible) return null;

  const accept = (consent: Consent) => {
    saveConsent(consent);
    setVisible(false);
  };

  const acceptAll = () =>
    accept({ essential: true, analytics: true, marketing: true, timestamp: new Date().toISOString() });

  const savePreferences = () =>
    accept({ essential: true, analytics, marketing, timestamp: new Date().toISOString() });

  return (
    <div className="fixed bottom-0 inset-x-0 z-[9999] p-4 sm:p-6 pointer-events-none">
      <div className="max-w-2xl mx-auto pointer-events-auto rounded-xl border border-zinc-700 bg-zinc-900/95 backdrop-blur-sm shadow-2xl">
        {/* ── Main banner ──────────────────────────── */}
        <div className="p-5">
          <p className="text-sm text-zinc-300 leading-relaxed">
            We use cookies to keep you logged in and to understand how our site is used so we can
            improve it.{' '}
            <Link href="/privacy-policy" className="underline text-[#00a4b8] hover:text-[#00c4db]">
              Privacy&nbsp;Policy
            </Link>
          </p>

          <div className="flex flex-wrap items-center gap-3 mt-4">
            <button
              onClick={acceptAll}
              className="px-5 py-2 rounded-lg bg-[#006d7a] hover:bg-[#004149] text-white text-sm font-semibold tracking-wide uppercase transition-colors"
            >
              Accept All
            </button>
            <button
              onClick={() => setShowPreferences(!showPreferences)}
              className="px-4 py-2 rounded-lg border border-zinc-600 hover:border-zinc-400 text-zinc-300 hover:text-white text-sm transition-colors"
            >
              {showPreferences ? 'Hide Preferences' : 'Manage Preferences'}
            </button>
          </div>
        </div>

        {/* ── Expanded preferences ─────────────────── */}
        {showPreferences && (
          <div className="border-t border-zinc-700 p-5 space-y-4">
            {/* Essential — always on */}
            <label className="flex items-center justify-between">
              <div>
                <span className="text-sm font-medium text-zinc-200">Essential</span>
                <p className="text-xs text-zinc-500">Login sessions and site functionality. Always active.</p>
              </div>
              <span className="relative inline-flex h-6 w-11 shrink-0 items-center rounded-full bg-[#006d7a] cursor-not-allowed opacity-70">
                <span className="inline-block h-4 w-4 translate-x-6 rounded-full bg-white transition" />
              </span>
            </label>

            {/* Analytics */}
            <label className="flex items-center justify-between cursor-pointer">
              <div>
                <span className="text-sm font-medium text-zinc-200">Analytics</span>
                <p className="text-xs text-zinc-500">Google Analytics to help us improve the site.</p>
              </div>
              <button
                type="button"
                role="switch"
                aria-checked={analytics}
                onClick={() => setAnalytics(!analytics)}
                className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors ${
                  analytics ? 'bg-[#006d7a]' : 'bg-zinc-600'
                }`}
              >
                <span
                  className={`inline-block h-4 w-4 rounded-full bg-white transition-transform ${
                    analytics ? 'translate-x-6' : 'translate-x-1'
                  }`}
                />
              </button>
            </label>

            {/* Marketing */}
            <label className="flex items-center justify-between cursor-pointer">
              <div>
                <span className="text-sm font-medium text-zinc-200">Marketing</span>
                <p className="text-xs text-zinc-500">Advertising and retargeting cookies.</p>
              </div>
              <button
                type="button"
                role="switch"
                aria-checked={marketing}
                onClick={() => setMarketing(!marketing)}
                className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors ${
                  marketing ? 'bg-[#006d7a]' : 'bg-zinc-600'
                }`}
              >
                <span
                  className={`inline-block h-4 w-4 rounded-full bg-white transition-transform ${
                    marketing ? 'translate-x-6' : 'translate-x-1'
                  }`}
                />
              </button>
            </label>

            <button
              onClick={savePreferences}
              className="w-full px-5 py-2 rounded-lg bg-[#006d7a] hover:bg-[#004149] text-white text-sm font-semibold tracking-wide uppercase transition-colors"
            >
              Save Preferences
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
