import { useState } from "react";
import { Link, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/hooks/useAuth";
import { useCommunicationCounts } from "@/hooks/useCommunicationCounts";
import { hasInstructorPrivileges, canCreateAccounts, isInstructorOrHigher } from "@/lib/authUtils";
import { usePendingUsersCount } from "@/hooks/usePendingUsersCount";
import {
  NavigationMenu,
  NavigationMenuContent,
  NavigationMenuItem,
  NavigationMenuLink,
  NavigationMenuList,
  NavigationMenuTrigger,
} from "@/components/ui/navigation-menu";
import { Tag, Users, Star, Menu, X, Calendar, List, ChevronDown, ChevronRight, User, Bell, MessageSquare } from "lucide-react";

export function Layout({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, user } = useAuth();
  const [, setLocation] = useLocation();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const { counts } = useCommunicationCounts();
  const { pendingCount } = usePendingUsersCount();



  const handleLogout = async () => {
    try {
      await fetch('/api/auth/logout', {
        method: 'POST',
        credentials: 'include',
      });
      window.location.href = '/login';
    } catch (error) {
      console.error('Logout error:', error);
      window.location.href = '/login';
    }
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
                  {canCreateAccounts(user) && (
                    <Link href="/admin/users" className="text-sm font-medium text-foreground hover:text-primary transition-colors relative" data-testid="link-secondary-user-management">
                      User Management
                      {pendingCount > 0 && (
                        <Badge 
                          variant="destructive" 
                          className="absolute -top-2 -right-2 h-4 w-4 flex items-center justify-center text-xs p-0 min-w-[16px]"
                          data-testid="badge-pending-users-desktop"
                        >
                          {pendingCount > 99 ? '99+' : pendingCount}
                        </Badge>
                      )}
                    </Link>
                  )}
                  {user?.role === 'superadmin' && (
                    <Link href="/admin/credits" className="text-sm font-medium text-foreground hover:text-primary transition-colors" data-testid="link-secondary-admin-credits">
                      Admin Credits
                    </Link>
                  )}
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
                <a href="/" className="text-base text-primary-foreground hover:text-[#A8ACB3] transition-colors" data-testid="link-home" onClick={(e) => {
                  if (window.location.pathname === '/') {
                    e.preventDefault();
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                  }
                }}>Home</a>
                <Link href="/about-chris" className="text-base text-primary-foreground hover:text-[#A8ACB3] transition-colors" data-testid="link-about-chris">About Chris</Link>
                <a href="/#deductive-pistolcraft" className="text-base text-primary-foreground hover:text-[#A8ACB3] transition-colors" onClick={(e) => {
                  if (window.location.pathname === '/') {
                    e.preventDefault();
                    document.getElementById('deductive-pistolcraft')?.scrollIntoView({ behavior: 'smooth' });
                  }
                }} data-testid="link-courses">Courses</a>
                <NavigationMenu>
                  <NavigationMenuList>
                    <NavigationMenuItem>
                      <NavigationMenuTrigger className="bg-transparent text-base text-primary-foreground hover:text-[#A8ACB3] transition-colors">
                        The Schedule
                      </NavigationMenuTrigger>
                      <NavigationMenuContent>
                        <ul className="grid w-[150px] gap-1 p-2">
                          <li>
                            <NavigationMenuLink asChild>
                              <Link href="/schedule-list" className="block select-none rounded-md p-2 text-[14px] leading-none no-underline outline-none transition-colors text-black hover:text-gray-600">
                                List View
                              </Link>
                            </NavigationMenuLink>
                          </li>
                          <li>
                            <NavigationMenuLink asChild>
                              <Link href="/schedule-calendar" className="block select-none rounded-md p-2 text-[14px] leading-none no-underline outline-none transition-colors text-black hover:text-gray-600">
                                Calendar View
                              </Link>
                            </NavigationMenuLink>
                          </li>
                        </ul>
                      </NavigationMenuContent>
                    </NavigationMenuItem>
                  </NavigationMenuList>
                </NavigationMenu>
                <a href="/#appointments" className="text-base text-primary-foreground hover:text-[#A8ACB3] transition-colors" onClick={(e) => {
                  const appointmentsSection = document.getElementById('appointments');
                  if (appointmentsSection && window.location.pathname === '/') {
                    e.preventDefault();
                    const headerHeight = 64; // Main header height
                    const secondaryMenuHeight = isAuthenticated ? 40 : 0; // Secondary menu only shows when logged in
                    // Scroll to appointments section (One-on-One Training is at the top of this section)
                    const yOffset = -(headerHeight + secondaryMenuHeight);
                    const y = appointmentsSection.getBoundingClientRect().top + window.pageYOffset + yOffset;
                    window.scrollTo({ top: y, behavior: 'smooth' });
                  }
                }}>Virtual Training</a>
                <a href="/the-crucible" className="text-base text-primary-foreground hover:text-[#A8ACB3] transition-colors">The Crucible</a>
                <Link href="/contact" className="text-base text-primary-foreground hover:text-[#A8ACB3] transition-colors" data-testid="link-contact">Contact Us</Link>
              </nav>

              {/* Desktop auth buttons */}
              <div className="hidden md:flex items-center space-x-4">
                {!isAuthenticated && (
                  <Button 
                    className="bg-accent text-accent-foreground hover:bg-accent/90"
                    onClick={() => window.location.href = '/login'}
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
                <a href="/" className="text-primary-foreground hover:text-[#A8ACB3] transition-colors py-2" data-testid="link-home-mobile" onClick={(e) => {
                  setIsMobileMenuOpen(false);
                  if (window.location.pathname === '/') {
                    e.preventDefault();
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                  }
                }}>Home</a>
                <Link href="/about-chris" className="text-primary-foreground hover:text-[#A8ACB3] transition-colors py-2" data-testid="link-about-chris-mobile" onClick={() => setIsMobileMenuOpen(false)}>About Chris</Link>
                <a href="/#deductive-pistolcraft" className="text-primary-foreground hover:text-[#A8ACB3] transition-colors py-2" data-testid="link-courses-mobile" onClick={(e) => {
                  setIsMobileMenuOpen(false);
                  if (window.location.pathname === '/') {
                    e.preventDefault();
                    document.getElementById('deductive-pistolcraft')?.scrollIntoView({ behavior: 'smooth' });
                  }
                }}>Courses</a>
                <a href="/the-crucible" className="text-primary-foreground hover:text-[#A8ACB3] transition-colors py-2" data-testid="link-crucible-mobile" onClick={() => setIsMobileMenuOpen(false)}>The Crucible</a>
                <div className="py-2">
                  <div className="text-primary-foreground font-medium mb-2">The Schedule</div>
                  <div className="pl-4 space-y-2">
                    <Link href="/schedule-list" className="block text-primary-foreground hover:text-[#A8ACB3] transition-colors" onClick={() => setIsMobileMenuOpen(false)}>
                      List View
                    </Link>
                    <Link href="/schedule-calendar" className="block text-primary-foreground hover:text-[#A8ACB3] transition-colors" onClick={() => setIsMobileMenuOpen(false)}>
                      Calendar View
                    </Link>
                  </div>
                </div>
                <a href="/#appointments" className="text-primary-foreground hover:text-[#A8ACB3] transition-colors py-2" onClick={(e) => {
                  setIsMobileMenuOpen(false);
                  const appointmentsSection = document.getElementById('appointments');
                  if (appointmentsSection && window.location.pathname === '/') {
                    e.preventDefault();
                    const headerHeight = 64; // Main header height
                    // Scroll up to show Performance Shooting card (approximately 800-900px above on mobile)
                    const yOffset = -(headerHeight + 770);
                    const y = appointmentsSection.getBoundingClientRect().top + window.pageYOffset + yOffset;
                    window.scrollTo({ top: y, behavior: 'smooth' });
                  }
                }}>Virtual Training</a>
                <Link href="/contact" className="text-primary-foreground hover:text-[#A8ACB3] transition-colors py-2" data-testid="link-contact-mobile" onClick={() => setIsMobileMenuOpen(false)}>Contact Us</Link>

                {/* Mobile auth buttons */}
                <div className="border-t border-primary-foreground/20 mt-2 pt-2 space-y-2">
                  {!isAuthenticated ? (
                    <Button 
                      className="w-full bg-accent text-accent-foreground hover:bg-accent/90"
                      onClick={() => window.location.href = '/login'}
                      data-testid="button-login-mobile"
                    >
                      Login
                    </Button>
                  ) : (
                    <div className="space-y-2">
                      {hasInstructorPrivileges(user as any) ? (
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
                          {canCreateAccounts(user as any) && (
                            <Link href="/admin/users" className="block">
                              <Button variant="outline" className="w-full border-primary-foreground text-slate-800 hover:bg-primary-foreground hover:text-primary relative" data-testid="link-user-management-mobile">
                                User Management
                                {pendingCount > 0 && (
                                  <Badge 
                                    variant="destructive" 
                                    className="absolute -top-2 -right-2 h-5 w-5 flex items-center justify-center text-xs p-0 min-w-[20px]"
                                    data-testid="badge-pending-users-mobile"
                                  >
                                    {pendingCount > 99 ? '99+' : pendingCount}
                                  </Badge>
                                )}
                              </Button>
                            </Link>
                          )}
                          {user?.role === 'superadmin' && (
                            <Link href="/admin/credits" className="block">
                              <Button variant="outline" className="w-full border-primary-foreground text-slate-800 hover:bg-primary-foreground hover:text-primary" data-testid="link-admin-credits-mobile">
                                Admin Credits
                              </Button>
                            </Link>
                          )}
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
                <Link href="/the-crucible" className="block transition-colors" style={{ color: '#e8e9eb' }} data-testid="link-footer-crucible">The Crucible</Link>
              </div>
            </div>

            <div className="md:col-span-3">
              <h4 className="font-semibold mb-4">Contact</h4>
              <div className="space-y-2 text-primary-foreground/80">
                <div className="flex items-start space-x-2">
                  <span>✉️</span>
                  <a href="mailto:Chris@TacticalAdv.com" className="transition-colors" style={{ color: '#e8e9eb' }}>Chris@TacticalAdv.com</a>
                </div>
                <div className="flex items-start space-x-2">
                  <span className="text-success">📍</span>
                  <span>Atlanta, Georgia</span>
                </div>
              </div>
            </div>
          </div>

          <div className="border-t border-primary-foreground/20 mt-8 pt-8 text-center text-primary-foreground/80">
            <p>&copy; {new Date().getFullYear()} Tactical Advantage. Powered by InstructorOps</p>
          </div>
        </div>
      </footer>
    </div>
  );
}