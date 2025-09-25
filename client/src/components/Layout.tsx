import { useState } from "react";
import { Link, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/hooks/useAuth";
import { useCommunicationCounts } from "@/hooks/useCommunicationCounts";
import {
  NavigationMenu,
  NavigationMenuContent,
  NavigationMenuItem,
  NavigationMenuLink,
  NavigationMenuList,
  NavigationMenuTrigger,
} from "@/components/ui/navigation-menu";
import { Shield, Tag, Users, Star, Menu, X, Calendar, List, ChevronDown, ChevronRight } from "lucide-react";

export function Layout({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, user } = useAuth();
  const [, setLocation] = useLocation();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isMobileScheduleOpen, setIsMobileScheduleOpen] = useState(false);
  const { counts } = useCommunicationCounts();



  const handleLogout = () => {
    window.location.href = '/api/logout';
  };

  return (
    <div className="min-h-screen bg-background font-noto-sans">
      {/* Secondary Menu Bar for Logged In Users - Desktop Only */}
      {isAuthenticated && (
        <div className="hidden md:block bg-muted/50 border-b">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center justify-center h-10">
              <nav className="flex items-center space-x-6">
                <Link href="/instructor-dashboard" className="text-sm font-medium text-foreground hover:text-primary transition-colors" data-testid="link-secondary-dashboard">
                  Dashboard
                </Link>
                <Link href="/students" className="text-sm font-medium text-foreground hover:text-primary transition-colors" data-testid="link-secondary-students">
                  Students
                </Link>
                <Link href="/communications" className="text-sm font-medium text-foreground hover:text-primary transition-colors relative" data-testid="link-secondary-communication">
                  Communication
                  {counts.unread > 0 && (
                    <Badge 
                      variant="destructive" 
                      className="absolute -top-2 -right-2 h-4 w-4 flex items-center justify-center text-xs p-0 min-w-[16px]"
                    >
                      {counts.unread > 99 ? '99+' : counts.unread}
                    </Badge>
                  )}
                </Link>
                <Link href="/reports" className="text-sm font-medium text-foreground hover:text-primary transition-colors" data-testid="link-secondary-reports">
                  Reports
                </Link>
                <Link href="/student-portal" className="text-sm font-medium text-foreground hover:text-primary transition-colors" data-testid="link-secondary-student-dashboard">
                  Student Dashboard
                </Link>
                <Link href="/product-management" className="text-sm font-medium text-foreground hover:text-primary transition-colors" data-testid="link-secondary-products">
                  Products
                </Link>
                <Button 
                  variant="outline" 
                  size="sm"
                  className="text-xs"
                  onClick={handleLogout}
                  data-testid="button-logout-secondary"
                >
                  Logout
                </Button>
              </nav>
            </div>
          </div>
        </div>
      )}

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
              <nav className="hidden md:flex items-center space-x-8">
                <NavigationMenu>
                  <NavigationMenuList>
                    <NavigationMenuItem>
                      <NavigationMenuTrigger className="text-primary-foreground hover:text-accent bg-transparent border-none data-[state=open]:bg-accent/20">
                        Schedule
                      </NavigationMenuTrigger>
                      <NavigationMenuContent>
                        <div className="w-48 p-2">
                          <Link href="/schedule-list">
                            <NavigationMenuLink className="flex items-center space-x-2 w-full px-3 py-2 rounded hover:bg-accent hover:text-accent-foreground transition-colors" data-testid="link-schedule-list">
                              <List className="h-4 w-4" />
                              <span>List View</span>
                            </NavigationMenuLink>
                          </Link>
                          <Link href="/schedule-calendar">
                            <NavigationMenuLink className="flex items-center space-x-2 w-full px-3 py-2 rounded hover:bg-accent hover:text-accent-foreground transition-colors" data-testid="link-schedule-calendar">
                              <Calendar className="h-4 w-4" />
                              <span>Calendar View</span>
                            </NavigationMenuLink>
                          </Link>
                        </div>
                      </NavigationMenuContent>
                    </NavigationMenuItem>
                  </NavigationMenuList>
                </NavigationMenu>
                <Link href="/#courses" className="text-primary-foreground hover:text-accent transition-colors" data-testid="link-courses">
                  Courses
                </Link>
                <a href="#about-us" className="text-primary-foreground hover:text-accent transition-colors">About Us</a>
                <a href="#resources" className="text-primary-foreground hover:text-accent transition-colors">Resources</a>
                <Link href="/store" className="text-primary-foreground hover:text-accent transition-colors" data-testid="link-store">Our Store</Link>
                <a href="#contact-us" className="text-primary-foreground hover:text-accent transition-colors">Contact Us</a>
              </nav>

              {/* Desktop auth buttons */}
              <div className="hidden md:flex items-center space-x-4">
                {!isAuthenticated && (
                  <Button 
                    className="bg-accent text-accent-foreground hover:bg-accent/90"
                    onClick={() => window.location.href = '/api/login'}
                    data-testid="button-login"
                  >
                    Login
                  </Button>
                )}
              </div>

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
                {/* Mobile Schedule with submenu */}
                <div>
                  <button 
                    onClick={() => setIsMobileScheduleOpen(!isMobileScheduleOpen)}
                    className="flex items-center justify-between w-full text-left text-primary-foreground hover:text-accent transition-colors py-2"
                    data-testid="button-mobile-schedule"
                  >
                    <span>Schedule</span>
                    {isMobileScheduleOpen ? (
                      <ChevronDown className="h-4 w-4" />
                    ) : (
                      <ChevronRight className="h-4 w-4" />
                    )}
                  </button>
                  {isMobileScheduleOpen && (
                    <div className="pl-4 py-2 space-y-2 border-l-2 border-primary-foreground/20">
                      <Link 
                        href="/schedule-list" 
                        className="flex items-center space-x-2 text-primary-foreground/80 hover:text-accent transition-colors py-1"
                        data-testid="link-schedule-list-mobile"
                        onClick={() => setIsMobileMenuOpen(false)}
                      >
                        <List className="h-4 w-4" />
                        <span>List View</span>
                      </Link>
                      <Link 
                        href="/schedule-calendar" 
                        className="flex items-center space-x-2 text-primary-foreground/80 hover:text-accent transition-colors py-1"
                        data-testid="link-schedule-calendar-mobile"
                        onClick={() => setIsMobileMenuOpen(false)}
                      >
                        <Calendar className="h-4 w-4" />
                        <span>Calendar View</span>
                      </Link>
                    </div>
                  )}
                </div>
                <Link href="/#courses" className="text-primary-foreground hover:text-accent transition-colors py-2" data-testid="link-courses-mobile">
                  Courses
                </Link>
                <a href="#about-us" className="text-primary-foreground hover:text-accent transition-colors py-2">About Us</a>
                <a href="#resources" className="text-primary-foreground hover:text-accent transition-colors py-2">Resources</a>
                <Link href="/store" className="text-primary-foreground hover:text-accent transition-colors py-2" data-testid="link-store-mobile">Our Store</Link>
                <a href="#contact-us" className="text-primary-foreground hover:text-accent transition-colors py-2">Contact Us</a>
                
                {/* Mobile auth buttons */}
                <div className="border-t border-primary-foreground/20 mt-2 pt-2 space-y-2">
                  {!isAuthenticated ? (
                    <Button 
                      className="w-full bg-accent text-accent-foreground hover:bg-accent/90"
                      onClick={() => window.location.href = '/api/login'}
                      data-testid="button-login-mobile"
                    >
                      Login
                    </Button>
                  ) : (
                    <div className="space-y-2">
                      {(user as any)?.role === 'instructor' ? (
                        <>
                          <Link href="/instructor-dashboard" className="block">
                            <Button variant="outline" className="w-full border-primary-foreground text-slate-800 hover:bg-primary-foreground hover:text-primary" data-testid="link-instructor-dashboard-mobile">
                              Dashboard
                            </Button>
                          </Link>
                          <Link href="/students" className="block">
                            <Button variant="outline" className="w-full border-primary-foreground text-slate-800 hover:bg-primary-foreground hover:text-primary" data-testid="link-students-mobile">
                              Students
                            </Button>
                          </Link>
                          <Link href="/communications" className="block">
                            <Button variant="outline" className="w-full border-primary-foreground text-slate-800 hover:bg-primary-foreground hover:text-primary relative" data-testid="link-communications-mobile">
                              Communications
                              {counts.unread > 0 && (
                                <Badge 
                                  variant="destructive" 
                                  className="absolute -top-2 -right-2 h-5 w-5 flex items-center justify-center text-xs p-0 min-w-[20px]"
                                >
                                  {counts.unread > 99 ? '99+' : counts.unread}
                                </Badge>
                              )}
                            </Button>
                          </Link>
                          <Link href="/student-portal" className="block">
                            <Button variant="outline" className="w-full border-primary-foreground text-slate-800 hover:bg-primary-foreground hover:text-primary" data-testid="link-student-dashboard-mobile">
                              Student Dashboard
                            </Button>
                          </Link>
                          <Link href="/product-management" className="block">
                            <Button variant="outline" className="w-full border-primary-foreground text-slate-800 hover:bg-primary-foreground hover:text-primary" data-testid="link-products-mobile">
                              Products
                            </Button>
                          </Link>
                        </>
                      ) : (
                        <Link href="/student-portal" className="block">
                          <Button variant="outline" className="w-full border-primary-foreground text-slate-800 hover:bg-primary-foreground hover:text-primary" data-testid="link-student-portal-mobile">
                            My Portal
                          </Button>
                        </Link>
                      )}
                      <Button 
                        variant="outline" 
                        className="w-full border-primary-foreground text-slate-800 hover:bg-primary-foreground hover:text-primary"
                        onClick={handleLogout}
                        data-testid="button-logout-mobile"
                      >
                        Logout
                      </Button>
                    </div>
                  )}
                </div>
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