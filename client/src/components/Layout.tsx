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

  const handleLogin = (type: 'student' | 'instructor') => {
    // Store intended role for after login
    localStorage.setItem('intended_role', type);
    window.location.href = '/api/login';
  };

  const handleLogout = () => {
    window.location.href = '/api/logout';
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header Navigation */}
      <header className="bg-primary shadow-lg sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-4">
              <div className="flex-shrink-0">
                <Link href="/">
                  <h1 className="text-xl font-bold text-primary-foreground cursor-pointer" data-testid="link-home">
                    ProTrain Academy
                  </h1>
                </Link>
              </div>
              <nav className="hidden md:flex space-x-8">
                <Link href="/#courses">
                  <a className="text-primary-foreground hover:text-accent transition-colors" data-testid="link-courses">
                    Courses
                  </a>
                </Link>
                <a href="#about" className="text-primary-foreground hover:text-accent transition-colors">About</a>
                <a href="#contact" className="text-primary-foreground hover:text-accent transition-colors">Contact</a>
              </nav>
            </div>
            
            <div className="flex items-center space-x-4">
              <div className="hidden sm:flex items-center space-x-2 text-primary-foreground">
                <Shield className="h-4 w-4 text-success" />
                <span className="text-sm">NRA Certified</span>
              </div>
              
              {!isAuthenticated ? (
                <>
                  <Button 
                    className="bg-accent text-accent-foreground hover:bg-accent/90"
                    onClick={() => handleLogin('student')}
                    data-testid="button-student-login"
                  >
                    Student Portal
                  </Button>
                  <Button 
                    className="bg-secondary text-secondary-foreground hover:bg-secondary/90"
                    onClick={() => handleLogin('instructor')}
                    data-testid="button-instructor-login"
                  >
                    Instructor Login
                  </Button>
                </>
              ) : (
                <div className="flex items-center space-x-4">
                  {user?.role === 'instructor' ? (
                    <Link href="/instructor-dashboard">
                      <Button variant="outline" className="border-primary-foreground text-primary-foreground hover:bg-primary-foreground hover:text-primary" data-testid="link-instructor-dashboard">
                        Dashboard
                      </Button>
                    </Link>
                  ) : (
                    <Link href="/student-portal">
                      <Button variant="outline" className="border-primary-foreground text-primary-foreground hover:bg-primary-foreground hover:text-primary" data-testid="link-student-portal">
                        My Portal
                      </Button>
                    </Link>
                  )}
                  <Button 
                    variant="outline" 
                    className="border-primary-foreground text-primary-foreground hover:bg-primary-foreground hover:text-primary"
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

          {/* Mobile menu */}
          {isMobileMenuOpen && (
            <div className="md:hidden border-t border-primary-foreground/20 py-4">
              <nav className="flex flex-col space-y-2">
                <a href="#courses" className="text-primary-foreground hover:text-accent transition-colors py-2">Courses</a>
                <a href="#about" className="text-primary-foreground hover:text-accent transition-colors py-2">About</a>
                <a href="#contact" className="text-primary-foreground hover:text-accent transition-colors py-2">Contact</a>
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
              <h3 className="text-xl font-bold">ProTrain Academy</h3>
              <p className="text-primary-foreground/80">
                Professional firearms training platform for instructors and students.
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
                  <span>info@protrainacademy.com</span>
                </div>
                <div className="flex items-center space-x-2">
                  <span>📍</span>
                  <span>123 Training St, City, ST 12345</span>
                </div>
              </div>
            </div>
          </div>
          
          <div className="border-t border-primary-foreground/20 mt-8 pt-8 text-center text-primary-foreground/80">
            <p>&copy; 2024 ProTrain Academy. All rights reserved. NRA Certified Training Provider.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
