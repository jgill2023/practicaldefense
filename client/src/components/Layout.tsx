import { useState } from "react";
import { Link, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/hooks/useAuth";
import { Shield, Tag, Users, Star, Menu, X } from "lucide-react";

export function Layout({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, user } = useAuth();
  const [, setLocation] = useLocation();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);



  const handleLogout = () => {
    window.location.href = '/api/logout';
  };

  return (
    <div className="min-h-screen bg-background font-noto-sans">
      {/* Header Navigation */}
      <header className="bg-primary shadow-lg sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            {/* Company name aligned to the left */}
            <div className="flex-shrink-0">
              <Link href="/">
                <h1 className="text-xl font-normal text-primary-foreground cursor-pointer" data-testid="link-home">
                  Practical Defense Training
                </h1>
              </Link>
            </div>

            {/* Navigation and login aligned to the right */}
            <div className="flex items-center space-x-8">
              <nav className="hidden md:flex space-x-8">
                <a href="#schedule" className="text-primary-foreground hover:text-accent transition-colors">Schedule</a>
                <Link href="/#courses" className="text-primary-foreground hover:text-accent transition-colors" data-testid="link-courses">
                  Courses
                </Link>
                <a href="#about-us" className="text-primary-foreground hover:text-accent transition-colors">About Us</a>
                <a href="#resources" className="text-primary-foreground hover:text-accent transition-colors">Resources</a>
                <a href="#our-store" className="text-primary-foreground hover:text-accent transition-colors">Our Store</a>
                <a href="#contact-us" className="text-primary-foreground hover:text-accent transition-colors">Contact Us</a>
              </nav>

              <div className="flex items-center space-x-4">

              {!isAuthenticated ? (
                <Button 
                  className="bg-accent text-accent-foreground hover:bg-accent/90"
                  onClick={() => window.location.href = '/api/login'}
                  data-testid="button-login"
                >
                  Login
                </Button>
              ) : (
                <div className="flex items-center space-x-4">
                  {user?.role === 'instructor' ? (
                    <Link href="/instructor-dashboard">
                      <Button variant="outline" className="border-primary-foreground text-slate-800 hover:bg-primary-foreground hover:text-primary" data-testid="link-instructor-dashboard">
                        Dashboard
                      </Button>
                    </Link>
                  ) : (
                    <Link href="/student-portal">
                      <Button variant="outline" className="border-primary-foreground text-slate-800 hover:bg-primary-foreground hover:text-primary" data-testid="link-student-portal">
                        My Portal
                      </Button>
                    </Link>
                  )}
                  <Button 
                    variant="outline" 
                    className="border-primary-foreground text-slate-800 hover:bg-primary-foreground hover:text-primary"
                    onClick={handleLogout}
                    data-testid="button-logout"
                  >
                    Logout
                  </Button>
                </div>
              )}

              {/* Mobile menu button */}
              <button 
                className="md:hidden text-primary-foreground"
                onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                data-testid="button-mobile-menu"
              >
                {isMobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
              </button>
              </div>
            </div>
          </div>

          {/* Mobile menu */}
          {isMobileMenuOpen && (
            <div className="md:hidden border-t border-primary-foreground/20 py-4">
              <nav className="flex flex-col space-y-2">
                <a href="#schedule" className="text-primary-foreground hover:text-accent transition-colors py-2">Schedule</a>
                <a href="#courses" className="text-primary-foreground hover:text-accent transition-colors py-2">Courses</a>
                <a href="#about-us" className="text-primary-foreground hover:text-accent transition-colors py-2">About Us</a>
                <a href="#resources" className="text-primary-foreground hover:text-accent transition-colors py-2">Resources</a>
                <a href="#our-store" className="text-primary-foreground hover:text-accent transition-colors py-2">Our Store</a>
                <a href="#contact-us" className="text-primary-foreground hover:text-accent transition-colors py-2">Contact Us</a>
              </nav>
            </div>
          )}
        </div>
      </header>

      {/* Main Content */}
      <main>{children}</main>

      {/* Footer */}
      <footer className="bg-primary text-primary-foreground py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-4 gap-8">
            <div className="space-y-4">
              <h3 className="text-xl font-bold">Practical Defense Training</h3>
              <p className="text-primary-foreground/80">
                Professional firearms instruction by certified instructors. Serving the local community with safe, comprehensive training programs.
              </p>
            </div>

            <div className="space-y-4">
              <h4 className="font-semibold">Courses</h4>
              <div className="space-y-2 text-primary-foreground/80">
                <a href="#" className="block hover:text-accent transition-colors">Basic Safety Training</a>
                <a href="#" className="block hover:text-accent transition-colors">Concealed Carry Permit</a>
                <a href="#" className="block hover:text-accent transition-colors">Advanced Tactical</a>
                <a href="#" className="block hover:text-accent transition-colors">Instructor Certification</a>
              </div>
            </div>

            <div className="space-y-4">
              <h4 className="font-semibold">Support</h4>
              <div className="space-y-2 text-primary-foreground/80">
                <a href="#" className="block hover:text-accent transition-colors">Help Center</a>
                <a href="#" className="block hover:text-accent transition-colors">Contact Support</a>
                <a href="#" className="block hover:text-accent transition-colors">Privacy Policy</a>
                <a href="#" className="block hover:text-accent transition-colors">Terms of Service</a>
              </div>
            </div>

            <div className="space-y-4">
              <h4 className="font-semibold">Contact</h4>
              <div className="space-y-2 text-primary-foreground/80">
                <div className="flex items-center space-x-2">
                  <span>📞</span>
                  <span>(555) 123-4567</span>
                </div>
                <div className="flex items-center space-x-2">
                  <span>✉️</span>
                  <span>info@elitetacticaltraining.com</span>
                </div>
                <div className="flex items-center space-x-2">
                  <span>📍</span>
                  <span>Local Range Facility - Call for Location</span>
                </div>
              </div>
            </div>
          </div>

          <div className="border-t border-primary-foreground/20 mt-8 pt-8 text-center text-primary-foreground/80">
            <p>&copy; 2024 Practical Defense Training. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}