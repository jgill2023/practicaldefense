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
import { Shield, Tag, Users, Star, Menu, X, Calendar, List, ChevronDown, ChevronRight, GraduationCap, User, Bell, MessageSquare, Globe, Crosshair, ShoppingCart } from "lucide-react";
import { ShoppingCartComponent } from "@/components/shopping-cart";

export function Layout({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, user } = useAuth();
  const [, setLocation] = useLocation();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isMobileScheduleOpen, setIsMobileScheduleOpen] = useState(false);
  const [isMobileCoursesOpen, setIsMobileCoursesOpen] = useState(false);
  const { counts } = useCommunicationCounts();



  const handleLogout = () => {
    window.location.href = '/api/logout';
  };

  return (
    <div className="min-h-screen bg-background font-noto-sans">
      {/* Navigation Container - Sticky at top */}
      <div className="sticky top-0 z-50">
        {/* Secondary Menu Bar for Logged In Users - Desktop Only */}
        {isAuthenticated && (
          <div className="hidden md:block bg-gray-100 dark:bg-gray-800 border-b">
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
        <header className="bg-primary shadow-lg">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            {/* Company logo aligned to the left */}
            <div className="flex-shrink-0">
              <Link href="/">
                <img 
                  src="/tactical-advantage-logo.png" 
                  alt="Tactical Advantage" 
                  className="h-12 cursor-pointer"
                  data-testid="link-home"
                  onError={(e) => {
                    e.currentTarget.style.display = 'none';
                    console.error('Logo failed to load from:', e.currentTarget.src);
                  }}
                />
              </Link>
            </div>

            {/* Navigation and login aligned to the right */}
            <div className="flex items-center space-x-8">
              <nav className="hidden md:flex items-center space-x-8">
                <Link href="/" className="text-base text-primary-foreground hover:text-[#A8ACB3] transition-colors" data-testid="link-home">Home</Link>
                <a href="#about-us" className="text-base text-primary-foreground hover:text-[#A8ACB3] transition-colors">About Chris</a>
                <NavigationMenu>
                  <NavigationMenuList>
                    <NavigationMenuItem>
                      <NavigationMenuTrigger className="text-base text-primary-foreground hover:text-[#A8ACB3] bg-transparent border-none data-[state=open]:bg-[#A8ACB3]/20">
                        Courses
                      </NavigationMenuTrigger>
                      <NavigationMenuContent>
                        <div className="w-56 p-2 bg-[#A8ACB3]">
                          <Link href="/#courses">
                            <NavigationMenuLink className="flex items-center space-x-2 w-full px-3 py-2 rounded text-black hover:text-[#292929] hover:bg-black/10 transition-colors" data-testid="link-courses">
                              <GraduationCap className="h-4 w-4" />
                              <span>All Courses</span>
                            </NavigationMenuLink>
                          </Link>
                          <Link href="/concealed-carry">
                            <NavigationMenuLink className="flex items-center space-x-2 w-full px-3 py-2 rounded text-black hover:text-[#292929] hover:bg-black/10 transition-colors" data-testid="link-concealed-carry">
                              <Shield className="h-4 w-4" />
                              <span>Concealed Carry</span>
                            </NavigationMenuLink>
                          </Link>
                          <Link href="/online-concealed-carry">
                            <NavigationMenuLink className="flex items-center space-x-2 w-full px-3 py-2 rounded text-black hover:text-[#292929] hover:bg-black/10 transition-colors" data-testid="link-online-concealed-carry">
                              <Globe className="h-4 w-4" />
                              <span>Online Concealed Carry</span>
                            </NavigationMenuLink>
                          </Link>
                          <Link href="/defensive-handgun">
                            <NavigationMenuLink className="flex items-center space-x-2 w-full px-3 py-2 rounded text-black hover:text-[#292929] hover:bg-black/10 transition-colors" data-testid="link-defensive-handgun">
                              <Crosshair className="h-4 w-4" />
                              <span>Defensive Handgun</span>
                            </NavigationMenuLink>
                          </Link>
                        </div>
                      </NavigationMenuContent>
                    </NavigationMenuItem>
                  </NavigationMenuList>
                </NavigationMenu>
                <NavigationMenu>
                  <NavigationMenuList>
                    <NavigationMenuItem>
                      <NavigationMenuTrigger className="text-base text-primary-foreground hover:text-[#A8ACB3] bg-transparent border-none data-[state=open]:bg-[#A8ACB3]/20">
                        Schedule It!
                      </NavigationMenuTrigger>
                      <NavigationMenuContent>
                        <div className="w-48 p-2 bg-[#A8ACB3]">
                          <Link href="/schedule-list">
                            <NavigationMenuLink className="flex items-center space-x-2 w-full px-3 py-2 rounded text-black hover:text-[#292929] hover:bg-black/10 transition-colors" data-testid="link-schedule-list">
                              <List className="h-4 w-4" />
                              <span>List View</span>
                            </NavigationMenuLink>
                          </Link>
                          <Link href="/schedule-calendar">
                            <NavigationMenuLink className="flex items-center space-x-2 w-full px-3 py-2 rounded text-black hover:text-[#292929] hover:bg-black/10 transition-colors" data-testid="link-schedule-calendar">
                              <Calendar className="h-4 w-4" />
                              <span>Calendar View</span>
                            </NavigationMenuLink>
                          </Link>
                        </div>
                      </NavigationMenuContent>
                    </NavigationMenuItem>
                  </NavigationMenuList>
                </NavigationMenu>
                <Link href="/online-concealed-carry" className="text-base text-primary-foreground hover:text-[#A8ACB3] transition-colors" data-testid="link-virtual-training">Virtual Training</Link>
                <Link href="/contact" className="text-base text-primary-foreground hover:text-[#A8ACB3] transition-colors" data-testid="link-contact">Contact Us</Link>
              </nav>

              {/* Desktop auth buttons and cart */}
              <div className="hidden md:flex items-center space-x-4">
                <ShoppingCartComponent />
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
                <Link href="/" className="text-primary-foreground hover:text-[#A8ACB3] transition-colors py-2" data-testid="link-home-mobile" onClick={() => setIsMobileMenuOpen(false)}>Home</Link>
                <a href="#about-us" className="text-primary-foreground hover:text-[#A8ACB3] transition-colors py-2">About Chris</a>
                {/* Mobile Courses with submenu */}
                <div>
                  <button 
                    onClick={() => setIsMobileCoursesOpen(!isMobileCoursesOpen)}
                    className="flex items-center justify-between w-full text-left text-primary-foreground hover:text-[#A8ACB3] transition-colors py-2"
                    data-testid="button-mobile-courses"
                  >
                    <span>Courses</span>
                    {isMobileCoursesOpen ? (
                      <ChevronDown className="h-4 w-4" />
                    ) : (
                      <ChevronRight className="h-4 w-4" />
                    )}
                  </button>
                  {isMobileCoursesOpen && (
                    <div className="pl-4 py-2 space-y-2 border-l-2 border-primary-foreground/20">
                      <Link 
                        href="/#courses" 
                        className="flex items-center space-x-2 text-primary-foreground hover:text-[#A8ACB3] transition-colors py-1"
                        data-testid="link-courses-mobile"
                        onClick={() => setIsMobileMenuOpen(false)}
                      >
                        <GraduationCap className="h-4 w-4" />
                        <span>All Courses</span>
                      </Link>
                      <Link 
                        href="/concealed-carry" 
                        className="flex items-center space-x-2 text-primary-foreground hover:text-[#A8ACB3] transition-colors py-1"
                        data-testid="link-concealed-carry-mobile"
                        onClick={() => setIsMobileMenuOpen(false)}
                      >
                        <Shield className="h-4 w-4" />
                        <span>Concealed Carry</span>
                      </Link>
                      <Link 
                        href="/online-concealed-carry" 
                        className="flex items-center space-x-2 text-primary-foreground hover:text-[#A8ACB3] transition-colors py-1"
                        data-testid="link-online-concealed-carry-mobile"
                        onClick={() => setIsMobileMenuOpen(false)}
                      >
                        <Globe className="h-4 w-4" />
                        <span>Online Concealed Carry</span>
                      </Link>
                      <Link 
                        href="/defensive-handgun" 
                        className="flex items-center space-x-2 text-primary-foreground hover:text-[#A8ACB3] transition-colors py-1"
                        data-testid="link-defensive-handgun-mobile"
                        onClick={() => setIsMobileMenuOpen(false)}
                      >
                        <Crosshair className="h-4 w-4" />
                        <span>Defensive Handgun</span>
                      </Link>
                    </div>
                  )}
                </div>
                {/* Mobile Schedule with submenu */}
                <div>
                  <button 
                    onClick={() => setIsMobileScheduleOpen(!isMobileScheduleOpen)}
                    className="flex items-center justify-between w-full text-left text-primary-foreground hover:text-[#A8ACB3] transition-colors py-2"
                    data-testid="button-mobile-schedule"
                  >
                    <span>Schedule It!</span>
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
                        className="flex items-center space-x-2 text-primary-foreground hover:text-[#A8ACB3] transition-colors py-1"
                        data-testid="link-schedule-list-mobile"
                        onClick={() => setIsMobileMenuOpen(false)}
                      >
                        <List className="h-4 w-4" />
                        <span>List View</span>
                      </Link>
                      <Link 
                        href="/schedule-calendar" 
                        className="flex items-center space-x-2 text-primary-foreground hover:text-[#A8ACB3] transition-colors py-1"
                        data-testid="link-schedule-calendar-mobile"
                        onClick={() => setIsMobileMenuOpen(false)}
                      >
                        <Calendar className="h-4 w-4" />
                        <span>Calendar View</span>
                      </Link>
                    </div>
                  )}
                </div>
                <Link href="/online-concealed-carry" className="text-primary-foreground hover:text-[#A8ACB3] transition-colors py-2" data-testid="link-virtual-training-mobile" onClick={() => setIsMobileMenuOpen(false)}>Virtual Training</Link>
                <Link href="/contact" className="text-primary-foreground hover:text-[#A8ACB3] transition-colors py-2" data-testid="link-contact-mobile" onClick={() => setIsMobileMenuOpen(false)}>Contact Us</Link>

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
      </div>

      {/* Main Content */}
      <main>{children}</main>

      {/* Footer */}
      <footer className="bg-primary text-primary-foreground py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-12 gap-8">
            <div className="md:col-span-5">
              <h3 className="text-xl font-bold mb-4">Tactical Advantage</h3>
              <p className="text-primary-foreground/80">
                Results-driven firearms training tailored to the individual student. Traditional, deductive pistolcraft emphasizing fundamentals and quantifiable metrics.
              </p>
            </div>

            <div className="md:col-span-2">
              <h4 className="font-semibold mb-4">Support</h4>
              <div className="space-y-2 text-primary-foreground/80">
                <Link href="/contact" className="block transition-colors" style={{ color: '#e8e9eb' }} data-testid="link-contact-support">Contact Us</Link>
                <Link href="/privacy-policy" className="block transition-colors" style={{ color: '#e8e9eb' }} data-testid="link-privacy-policy">Privacy Policy</Link>
                <Link href="/terms-of-service" className="block transition-colors" style={{ color: '#e8e9eb' }} data-testid="link-terms-of-service">Terms of Service</Link>
                <Link href="/refund-policy" className="block transition-colors" style={{ color: '#e8e9eb' }} data-testid="link-refund-policy">Refund Policy</Link>
              </div>
            </div>

            <div className="md:col-span-2">
              <h4 className="font-semibold mb-4">Quick Links</h4>
              <div className="space-y-2 text-primary-foreground/80">
                <Link href="/schedule-list" className="block transition-colors" style={{ color: '#e8e9eb' }} data-testid="link-footer-upcoming-courses">Upcoming Courses</Link>
                <Link href="/student-portal" className="block transition-colors" style={{ color: '#e8e9eb' }} data-testid="link-footer-student-dashboard">Student Dashboard</Link>
                <a href="#resources" className="block transition-colors" style={{ color: '#e8e9eb' }}>Resources</a>
                <Link href="/store" className="block transition-colors" style={{ color: '#e8e9eb' }} data-testid="link-footer-shop">Shop</Link>
              </div>
            </div>

            <div className="md:col-span-3">
              <h4 className="font-semibold mb-4">Contact</h4>
              <div className="space-y-2 text-primary-foreground/80">
                <div className="flex items-start space-x-2">
                  <span className="text-success">📞</span>
                  <a href="tel:+15059445247" className="transition-colors" style={{ color: '#e8e9eb' }}>(505) 944-5247</a>
                </div>
                <div className="flex items-start space-x-2">
                  <span>✉️</span>
                  <a href="mailto:chris@tacticaladv.com" className="transition-colors" style={{ color: '#e8e9eb' }}>chris@tacticaladv.com</a>
                </div>
                <div className="flex items-start space-x-2">
                  <span className="text-success">📍</span>
                  <span>Albuquerque, New Mexico</span>
                </div>
              </div>
            </div>
          </div>

          <div className="border-t border-primary-foreground/20 mt-8 pt-8 text-center text-primary-foreground/80">
            <p>&copy; {new Date().getFullYear()} Tactical Advantage. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}