import { useState, useEffect } from "react";
import { Link } from "wouter";

const STORAGE_KEY = "age_verified";
const VERIFICATION_DURATION = 24 * 60 * 60 * 1000; // 24 hours in milliseconds

function isVerified(): boolean {
  if (typeof window === 'undefined') return false;
  const stored = localStorage.getItem(STORAGE_KEY);
  if (!stored) return false;
  
  try {
    const { timestamp } = JSON.parse(stored);
    const now = Date.now();
    return now - timestamp < VERIFICATION_DURATION;
  } catch {
    return false;
  }
}

function setVerified(): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify({ timestamp: Date.now() }));
}

function calculateAge(day: number, month: number, year: number): number {
  const today = new Date();
  const birthDate = new Date(year, month - 1, day);
  let age = today.getFullYear() - birthDate.getFullYear();
  const monthDiff = today.getMonth() - birthDate.getMonth();
  
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
    age--;
  }
  
  return age;
}

function getInitialVerificationStatus(): boolean {
  if (typeof window === 'undefined') return true;
  return isVerified();
}

export function AgeGate({ children }: { children: React.ReactNode }) {
  const [verified, setVerifiedState] = useState(getInitialVerificationStatus);
  const [isAnimating, setIsAnimating] = useState(false);
  const [day, setDay] = useState("");
  const [month, setMonth] = useState("");
  const [year, setYear] = useState("");
  const [error, setError] = useState("");
  const [isUnder21, setIsUnder21] = useState(false);

  useEffect(() => {
    if (!verified) {
      setTimeout(() => setIsAnimating(true), 50);
    }
  }, [verified]);

  const days = Array.from({ length: 31 }, (_, i) => i + 1);
  const months = [
    { value: 1, label: "January" },
    { value: 2, label: "February" },
    { value: 3, label: "March" },
    { value: 4, label: "April" },
    { value: 5, label: "May" },
    { value: 6, label: "June" },
    { value: 7, label: "July" },
    { value: 8, label: "August" },
    { value: 9, label: "September" },
    { value: 10, label: "October" },
    { value: 11, label: "November" },
    { value: 12, label: "December" },
  ];
  
  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: 100 }, (_, i) => currentYear - i);

  const handleSubmit = () => {
    setError("");

    if (!day || !month || !year) {
      setError("Please select your complete date of birth.");
      return;
    }

    const age = calculateAge(parseInt(day), parseInt(month), parseInt(year));

    if (age >= 21) {
      setVerified();
      setIsAnimating(false);
      setTimeout(() => setVerifiedState(true), 300);
    } else {
      setIsUnder21(true);
    }
  };

  const handleDateChange = (type: 'day' | 'month' | 'year', value: string) => {
    if (type === 'day') setDay(value);
    if (type === 'month') setMonth(value);
    if (type === 'year') setYear(value);
    setIsUnder21(false);
    setError("");
  };

  const isFormComplete = day && month && year;
  const isButtonDisabled = !isFormComplete || isUnder21;

  if (verified) {
    return <>{children}</>;
  }

  return (
    <>
      <div 
        className="fixed inset-0 z-[100]"
        style={{
          backdropFilter: "blur(20px)",
          WebkitBackdropFilter: "blur(20px)",
          backgroundColor: "rgba(0, 0, 0, 0.85)",
        }}
      />
      
      <div 
        className={`fixed inset-0 z-[101] flex items-center justify-center p-4 transition-opacity duration-300 ${
          isAnimating ? "opacity-100" : "opacity-0"
        }`}
        data-testid="age-gate-overlay"
      >
        <div 
          className={`w-full max-w-md bg-zinc-900 border border-zinc-700 rounded-xl shadow-2xl transform transition-all duration-300 ${
            isAnimating ? "scale-100 translate-y-0" : "scale-95 translate-y-4"
          }`}
          data-testid="age-gate-modal"
        >
          <div className="p-6 sm:p-8">
            <div className="text-center mb-6">
              <div className="w-16 h-16 mx-auto mb-4 bg-amber-600 rounded-full flex items-center justify-center">
                <svg 
                  xmlns="http://www.w3.org/2000/svg" 
                  className="h-8 w-8 text-white" 
                  fill="none" 
                  viewBox="0 0 24 24" 
                  stroke="currentColor"
                >
                  <path 
                    strokeLinecap="round" 
                    strokeLinejoin="round" 
                    strokeWidth={2} 
                    d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" 
                  />
                </svg>
              </div>
              <h2 className="text-2xl font-bold text-white mb-2" data-testid="age-gate-title">
                Age Verification Required
              </h2>
              <p className="text-zinc-400 text-sm">
                This website contains content related to firearms instruction. You must be 21 years or older to enter.
              </p>
            </div>

            <div className="space-y-4">
              <label className="block text-sm font-medium text-zinc-300 mb-3">
                Enter your date of birth
              </label>
              
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs text-zinc-500 mb-1">Month</label>
                  <select
                    value={month}
                    onChange={(e) => handleDateChange('month', e.target.value)}
                    className="w-full bg-zinc-800 border border-zinc-600 rounded-lg px-3 py-2.5 text-white text-sm focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent appearance-none cursor-pointer"
                    data-testid="select-month"
                  >
                    <option value="">Month</option>
                    {months.map((m) => (
                      <option key={m.value} value={m.value}>
                        {m.label}
                      </option>
                    ))}
                  </select>
                </div>
                
                <div>
                  <label className="block text-xs text-zinc-500 mb-1">Day</label>
                  <select
                    value={day}
                    onChange={(e) => handleDateChange('day', e.target.value)}
                    className="w-full bg-zinc-800 border border-zinc-600 rounded-lg px-3 py-2.5 text-white text-sm focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent appearance-none cursor-pointer"
                    data-testid="select-day"
                  >
                    <option value="">Day</option>
                    {days.map((d) => (
                      <option key={d} value={d}>
                        {d}
                      </option>
                    ))}
                  </select>
                </div>
                
                <div>
                  <label className="block text-xs text-zinc-500 mb-1">Year</label>
                  <select
                    value={year}
                    onChange={(e) => handleDateChange('year', e.target.value)}
                    className="w-full bg-zinc-800 border border-zinc-600 rounded-lg px-3 py-2.5 text-white text-sm focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent appearance-none cursor-pointer"
                    data-testid="select-year"
                  >
                    <option value="">Year</option>
                    {years.map((y) => (
                      <option key={y} value={y}>
                        {y}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {isUnder21 && (
                <div 
                  className="bg-red-900/50 border border-red-700 rounded-lg p-3 text-center"
                  data-testid="age-gate-under21-message"
                >
                  <p className="text-red-200 text-sm font-medium">
                    You must be 21 years of age or older to access this website.
                  </p>
                </div>
              )}

              {error && (
                <p className="text-red-400 text-sm text-center" data-testid="age-gate-error">
                  {error}
                </p>
              )}

              <button
                onClick={handleSubmit}
                disabled={isButtonDisabled}
                className={`w-full py-3 px-4 rounded-lg font-semibold text-white transition-all duration-200 ${
                  isButtonDisabled
                    ? "bg-zinc-700 cursor-not-allowed opacity-50"
                    : "bg-amber-600 hover:bg-amber-500 cursor-pointer"
                }`}
                data-testid="button-enter-site"
              >
                Enter Site
              </button>
            </div>

            <div className="mt-6 pt-4 border-t border-zinc-700">
              <p className="text-zinc-500 text-xs text-center leading-relaxed">
                By entering, you verify you are 21+ and agree to our{" "}
                <Link href="/terms-of-service" className="text-amber-500 hover:text-amber-400 underline">
                  Terms of Service
                </Link>
                .
              </p>
            </div>
          </div>
        </div>
      </div>
      
      <div className="opacity-0 pointer-events-none">
        {children}
      </div>
    </>
  );
}
