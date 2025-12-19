import { useState } from "react";
import { Link, useLocation } from "wouter";
import santaGiftCardImage from "@assets/Apache_Santa_1765822664317.png";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/hooks/useAuth";
import { useCommunicationCounts } from "@/hooks/useCommunicationCounts";
import { hasInstructorPrivileges, canCreateAccounts, isInstructorOrHigher } from "@/lib/authUtils";
import { usePendingUsersCount } from "@/hooks/usePendingUsersCount";
import { useCart } from "@/components/shopping-cart";
import { ShoppingCartComponent } from "@/components/shopping-cart";
import { useQuery } from "@tanstack/react-query";
import type { CourseWithSchedules } from "@shared/schema";
import {
  NavigationMenu,
  NavigationMenuContent,
  NavigationMenuItem,
  NavigationMenuLink,
  NavigationMenuList,
  NavigationMenuTrigger,
} from "@/components/ui/navigation-menu";
import { Tag, Users, Star, Menu, X, Calendar, List, ChevronDown, ChevronRight, User, Bell, MessageSquare, Settings, BookOpen, ShoppingCart } from "lucide-react";
import { SiFacebook, SiInstagram, SiYoutube, SiGoogle } from "react-icons/si";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSub,
  DropdownMenuSubTrigger,
  DropdownMenuSubContent,
} from "@/components/ui/dropdown-menu";

interface LayoutProps {
  children: React.ReactNode;
  headerColor?: string;
}

export function Layout({ children, headerColor }: LayoutProps) {
  const { isAuthenticated, user } = useAuth();
  const [, setLocation] = useLocation();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isMobileSettingsOpen, setIsMobileSettingsOpen] = useState(false);
  const [isMobileCoursesOpen, setIsMobileCoursesOpen] = useState(false);
  const { counts } = useCommunicationCounts();
  const { pendingCount } = usePendingUsersCount();
  const { itemCount } = useCart();

  const { data: coursesData } = useQuery<CourseWithSchedules[]>({
    queryKey: ['/api/courses'],
  });

  const activeCourses = coursesData?.filter((c: CourseWithSchedules) => c.isActive && !c.deletedAt) || [];



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
          <div className="hidden md:block bg-[hsl(210,20%,96%)] dark:bg-[hsl(204,27%,12%)] border-b border-[hsl(210,15%,85%)]">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
              <div className="flex items-center justify-end h-10">
                <nav className="flex items-center space-x-6">
                  {isInstructorOrHigher(user) && (
                    <>
                      <Link href="/instructor-dashboard" className="text-sm font-medium text-foreground hover:text-[#FD66C5] transition-colors" data-testid="link-secondary-dashboard">
                        Dashboard
                      </Link>
                      <Link href="/instructor-calendar" className="text-sm font-medium text-foreground hover:text-[#FD66C5] transition-colors flex items-center gap-1" data-testid="link-secondary-calendar">
                        <Calendar className="h-3 w-3" />
                        Calendar
                      </Link>
                      <Link href="/students" className="text-sm font-medium text-foreground hover:text-[#FD66C5] transition-colors" data-testid="link-secondary-students">
                        Students
                      </Link>
                      <Link href="/communications" className="text-sm font-medium text-foreground hover:text-[#FD66C5] transition-colors relative" data-testid="link-secondary-communication">
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
                      <Link href="/product-management" className="text-sm font-medium text-foreground hover:text-[#FD66C5] transition-colors" data-testid="link-secondary-products">
                        Products
                      </Link>
                    </>
                  )}
                  <Link href="/student-resources" className="text-sm font-medium text-foreground hover:text-[#FD66C5] transition-colors" data-testid="link-secondary-student-resources">
                    Student Resources
                  </Link>
                  {isInstructorOrHigher(user) && (
                    <DropdownMenu>
                      <DropdownMenuTrigger className="text-sm font-medium text-foreground hover:text-[#FD66C5] transition-colors flex items-center gap-1" data-testid="dropdown-settings">
                        <Settings className="h-4 w-4" />
                        Settings
                        <ChevronDown className="h-3 w-3" />
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-48">
                        <DropdownMenuItem asChild>
                          <Link href="/settings" className="w-full cursor-pointer" data-testid="link-settings-google-calendar">
                            Google Calendar
                          </Link>
                        </DropdownMenuItem>
                        <DropdownMenuItem asChild>
                          <Link href="/stripe-connect" className="w-full cursor-pointer" data-testid="link-settings-payment">
                            Payment Settings
                          </Link>
                        </DropdownMenuItem>
                        <DropdownMenuItem asChild>
                          <Link href="/gift-card-management" className="w-full cursor-pointer" data-testid="link-settings-gift-cards">
                            Gift Card Admin
                          </Link>
                        </DropdownMenuItem>
                        {canCreateAccounts(user) && (
                          <DropdownMenuItem asChild>
                            <Link href="/admin/users" className="w-full cursor-pointer relative" data-testid="link-settings-user-management">
                              User Management
                              {pendingCount > 0 && (
                                <Badge 
                                  variant="destructive" 
                                  className="ml-2 h-4 w-4 flex items-center justify-center text-xs p-0 min-w-[16px]"
                                  data-testid="badge-pending-users-desktop"
                                >
                                  {pendingCount > 99 ? '99+' : pendingCount}
                                </Badge>
                              )}
                            </Link>
                          </DropdownMenuItem>
                        )}
                        <DropdownMenuItem asChild>
                          <Link href="/student-portal" className="w-full cursor-pointer" data-testid="link-settings-student-dashboard">
                            Student Dashboard
                          </Link>
                        </DropdownMenuItem>
                        <DropdownMenuItem asChild>
                          <Link href="/reports" className="w-full cursor-pointer" data-testid="link-settings-reports">
                            Reports
                          </Link>
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  )}
                  {user?.role === 'superadmin' && (
                    <Link href="/admin/credits" className="text-sm font-medium text-foreground hover:text-[#FD66C5] transition-colors" data-testid="link-secondary-admin-credits">
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
        <header className="shadow-lg" style={{ backgroundColor: headerColor || '#5170FF' }}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            {/* Company logo aligned to the left */}
            <div className="flex-shrink-0">
              <Link href="/" data-testid="link-home" className="flex items-center gap-2">
              </Link>
            </div>

            {/* Navigation centered, auth buttons on right */}
            <div className="flex justify-between items-center flex-1">
              <nav className="hidden md:flex items-center justify-center flex-1 space-x-8">
                <a href="/" className="text-base text-white hover:text-[#FD66C5] transition-colors font-medium" data-testid="link-home" onClick={(e) => {
                  if (window.location.pathname === '/') {
                    e.preventDefault();
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                  }
                }}>Home</a>
                <Link href="/about" className="text-base text-white hover:text-[#FD66C5] transition-colors font-medium" data-testid="link-about">About Us</Link>
                <NavigationMenu>
                  <NavigationMenuList>
                    <NavigationMenuItem>
                      <NavigationMenuTrigger className="bg-transparent text-base text-white hover:text-[#FD66C5] hover:bg-transparent focus:bg-transparent data-[state=open]:bg-transparent" data-testid="dropdown-courses">
                        Courses
                      </NavigationMenuTrigger>
                      <NavigationMenuContent className="min-w-[600px]">
                        <div className="p-4">
                          <NavigationMenuLink asChild>
                            <Link href="/schedule-list" className="flex items-center gap-2 px-3 py-2 rounded-md hover:bg-[#5170FF]/20 cursor-pointer font-medium bg-[#5170ff] text-[#ffffff]" data-testid="link-upcoming-events">
                              <Calendar className="h-4 w-4" />
                              Upcoming Courses
                            </Link>
                          </NavigationMenuLink>
                          <div className="mt-3 pt-3 border-t">
                            <p className="px-3 py-1 text-sm font-medium text-muted-foreground flex items-center gap-2 mb-2">
                              <BookOpen className="h-4 w-4" />
                              Course Offerings
                            </p>
                            {activeCourses.length > 0 ? (
                              <div className="grid grid-cols-3 gap-3">
                                {activeCourses.map((course) => (
                                  <NavigationMenuLink key={course.id} asChild>
                                    <Link 
                                      href={`/course/${course.id}`} 
                                      className="block px-3 py-3 rounded-md hover:bg-accent cursor-pointer text-sm pt-[4px] pb-[4px] pl-[4px] pr-[4px]"
                                      data-testid={`link-course-${course.id}`}
                                    >
                                      {course.title}
                                    </Link>
                                  </NavigationMenuLink>
                                ))}
                              </div>
                            ) : (
                              <p className="px-3 py-2 text-sm text-muted-foreground">No courses available</p>
                            )}
                          </div>
                        </div>
                      </NavigationMenuContent>
                    </NavigationMenuItem>
                  </NavigationMenuList>
                </NavigationMenu>
                <Link href="/articles" className="text-base text-white hover:text-[#FD66C5] transition-colors font-medium" data-testid="link-articles">Articles</Link>
                <Link href="/merch" className="text-base text-white hover:text-[#FD66C5] transition-colors font-medium" data-testid="link-merch">Store</Link>
                <Link href="/gift-cards" className="text-base text-white hover:text-[#FD66C5] transition-colors font-medium" data-testid="link-gift-cards">Gift Cards</Link>
                <a href="/#appointments" className="text-base text-white hover:text-[#FD66C5] transition-colors font-medium" onClick={(e) => {
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
                }}>One/One Training</a>
                <Link href="/a-girl-and-a-gun" className="text-base text-white hover:text-[#FD66C5] transition-colors font-medium" data-testid="link-agag">A Girl & A Gun</Link>
                <Link href="/contact" className="text-base text-white hover:text-[#FD66C5] transition-colors font-medium" data-testid="link-contact">Contact Us</Link>
              </nav>

              {/* Desktop auth buttons */}
              <div className="hidden md:flex items-center space-x-4">
                <ShoppingCartComponent 
                  trigger={
                    <button className="relative text-white hover:text-[#FD66C5] transition-colors" data-testid="button-shopping-cart">
                      <ShoppingCart className="h-6 w-6" />
                      {itemCount > 0 && (
                        <Badge 
                          variant="destructive" 
                          className="absolute -top-2 -right-2 h-5 w-5 flex items-center justify-center text-xs p-0 min-w-[20px]"
                          data-testid="badge-cart-count"
                        >
                          {itemCount > 99 ? '99+' : itemCount}
                        </Badge>
                      )}
                    </button>
                  } 
                />
                {!isAuthenticated && (
                  <Button 
                    variant="accent"
                    className="bg-[#FD66C5]"
                    onClick={() => window.location.href = '/login'}
                    data-testid="button-login"
                  >
                    Login
                  </Button>
                )}
              </div>

              {/* Mobile menu button */}
              <button 
                className="md:hidden text-white"
                onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                data-testid="button-mobile-menu"
              >
                {isMobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
              </button>
            </div>
          </div>

          {/* Mobile menu */}
          {isMobileMenuOpen && (
            <div className="md:hidden border-t border-white/20 py-4 max-h-[calc(100vh-64px)] overflow-y-auto">
              <nav className="flex flex-col space-y-2">
                <a href="/" className="text-white hover:text-[#FD66C5] transition-colors py-2 font-medium" data-testid="link-home-mobile" onClick={(e) => {
                  setIsMobileMenuOpen(false);
                  if (window.location.pathname === '/') {
                    e.preventDefault();
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                  }
                }}>Home</a>
                <Link href="/about" className="text-white hover:text-[#FD66C5] transition-colors py-2 font-medium" data-testid="link-about-mobile" onClick={() => setIsMobileMenuOpen(false)}>About Us</Link>
                <Link href="/articles" className="text-white hover:text-[#FD66C5] transition-colors py-2 font-medium" data-testid="link-articles-mobile" onClick={() => setIsMobileMenuOpen(false)}>Articles</Link>
                <div className="py-2">
                  <button 
                    className="text-white hover:text-[#FD66C5] transition-colors font-medium flex items-center justify-between w-full"
                    onClick={() => setIsMobileCoursesOpen(!isMobileCoursesOpen)}
                    data-testid="button-courses-mobile"
                  >
                    <span>Courses</span>
                    {isMobileCoursesOpen ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                  </button>
                  {isMobileCoursesOpen && (
                    <div className="pl-4 mt-2 space-y-2">
                      <Link href="/schedule-list" className="block text-white/80 hover:text-[#FD66C5] transition-colors flex items-center gap-2" data-testid="link-upcoming-events-mobile" onClick={() => setIsMobileMenuOpen(false)}>
                        <Calendar className="h-4 w-4" />
                        Upcoming Events
                      </Link>
                      <div className="text-white/60 text-sm font-medium pt-2">Course Offerings:</div>
                      {activeCourses.length > 0 ? (
                        activeCourses.map((course) => (
                          <Link 
                            key={course.id}
                            href={`/course/${course.id}`} 
                            className="block text-white/80 hover:text-[#FD66C5] transition-colors pl-2" 
                            data-testid={`link-course-mobile-${course.id}`}
                            onClick={() => setIsMobileMenuOpen(false)}
                          >
                            {course.title}
                          </Link>
                        ))
                      ) : (
                        <span className="text-white/40 text-sm pl-2">No courses available</span>
                      )}
                    </div>
                  )}
                </div>
                <Link href="/merch" className="text-white hover:text-[#FD66C5] transition-colors py-2 font-medium" data-testid="link-merch-mobile" onClick={() => setIsMobileMenuOpen(false)}>Store</Link>
                <Link href="/gift-cards" className="text-white hover:text-[#FD66C5] transition-colors py-2 font-medium" data-testid="link-gift-cards-mobile" onClick={() => setIsMobileMenuOpen(false)}>Gift Cards</Link>
                <a href="/#appointments" className="text-white hover:text-[#FD66C5] transition-colors py-2 font-medium" onClick={(e) => {
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
                }}>One/One Training</a>
                <Link href="/a-girl-and-a-gun" className="text-white hover:text-[#FD66C5] transition-colors py-2 font-medium" data-testid="link-agag-mobile" onClick={() => setIsMobileMenuOpen(false)}>A Girl & A Gun</Link>
                <Link href="/contact" className="text-white hover:text-[#FD66C5] transition-colors py-2 font-medium" data-testid="link-contact-mobile" onClick={() => setIsMobileMenuOpen(false)}>Contact Us</Link>

                {/* Mobile auth buttons */}
                <div className="border-t border-white/20 mt-2 pt-2 space-y-2">
                  {!isAuthenticated ? (
                    <Button 
                      variant="accent"
                      className="w-full"
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
                            <Button variant="outline" className="w-full border-primary-foreground text-slate-800 hover:bg-primary-foreground hover:text-[#FD66C5]" data-testid="link-instructor-dashboard-mobile">
                              Dashboard
                            </Button>
                          </Link>
                          <Link href="/instructor-calendar" className="block">
                            <Button variant="outline" className="w-full border-primary-foreground text-slate-800 hover:bg-primary-foreground hover:text-[#FD66C5]" data-testid="link-instructor-calendar-mobile">
                              <Calendar className="h-4 w-4 mr-2" />
                              Calendar
                            </Button>
                          </Link>
                          <Link href="/students" className="block">
                            <Button variant="outline" className="w-full border-primary-foreground text-slate-800 hover:bg-primary-foreground hover:text-[#FD66C5]" data-testid="link-students-mobile">
                              Students
                            </Button>
                          </Link>
                          <Link href="/communications" className="block">
                            <Button variant="outline" className="w-full border-primary-foreground text-slate-800 hover:bg-primary-foreground hover:text-[#FD66C5] relative" data-testid="link-communications-mobile">
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
                          <Link href="/product-management" className="block">
                            <Button variant="outline" className="w-full border-primary-foreground text-slate-800 hover:bg-primary-foreground hover:text-[#FD66C5]" data-testid="link-products-mobile">
                              Products
                            </Button>
                          </Link>
                          <Link href="/student-resources" className="block">
                            <Button variant="outline" className="w-full border-primary-foreground text-slate-800 hover:bg-primary-foreground hover:text-[#FD66C5]" data-testid="link-student-resources-instructor-mobile">
                              Student Resources
                            </Button>
                          </Link>
                          <div className="space-y-1">
                            <Button 
                              variant="outline" 
                              className="w-full border-primary-foreground text-slate-800 hover:bg-primary-foreground hover:text-[#FD66C5] flex items-center justify-between"
                              onClick={() => setIsMobileSettingsOpen(!isMobileSettingsOpen)}
                              data-testid="button-settings-submenu-mobile"
                            >
                              <span className="flex items-center gap-2">
                                <Settings className="h-4 w-4" />
                                Settings
                              </span>
                              {isMobileSettingsOpen ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                            </Button>
                            {isMobileSettingsOpen && (
                              <div className="pl-4 space-y-1">
                                <Link href="/settings" className="block" onClick={() => setIsMobileMenuOpen(false)}>
                                  <Button variant="ghost" className="w-full justify-start text-white hover:text-[#FD66C5] hover:bg-transparent" data-testid="link-google-calendar-mobile">
                                    Google Calendar
                                  </Button>
                                </Link>
                                <Link href="/stripe-connect" className="block" onClick={() => setIsMobileMenuOpen(false)}>
                                  <Button variant="ghost" className="w-full justify-start text-white hover:text-[#FD66C5] hover:bg-transparent" data-testid="link-payment-settings-mobile">
                                    Payment Settings
                                  </Button>
                                </Link>
                                <Link href="/gift-card-management" className="block" onClick={() => setIsMobileMenuOpen(false)}>
                                  <Button variant="ghost" className="w-full justify-start text-white hover:text-[#FD66C5] hover:bg-transparent" data-testid="link-gift-card-admin-mobile">
                                    Gift Card Admin
                                  </Button>
                                </Link>
                                {canCreateAccounts(user as any) && (
                                  <Link href="/admin/users" className="block" onClick={() => setIsMobileMenuOpen(false)}>
                                    <Button variant="ghost" className="w-full justify-start text-white hover:text-[#FD66C5] hover:bg-transparent relative" data-testid="link-user-management-mobile">
                                      User Management
                                      {pendingCount > 0 && (
                                        <Badge 
                                          variant="destructive" 
                                          className="ml-2 h-4 w-4 flex items-center justify-center text-xs p-0 min-w-[16px]"
                                          data-testid="badge-pending-users-mobile"
                                        >
                                          {pendingCount > 99 ? '99+' : pendingCount}
                                        </Badge>
                                      )}
                                    </Button>
                                  </Link>
                                )}
                                <Link href="/student-portal" className="block" onClick={() => setIsMobileMenuOpen(false)}>
                                  <Button variant="ghost" className="w-full justify-start text-white hover:text-[#FD66C5] hover:bg-transparent" data-testid="link-student-dashboard-mobile">
                                    Student Dashboard
                                  </Button>
                                </Link>
                                <Link href="/reports" className="block" onClick={() => setIsMobileMenuOpen(false)}>
                                  <Button variant="ghost" className="w-full justify-start text-white hover:text-[#FD66C5] hover:bg-transparent" data-testid="link-reports-mobile">
                                    Reports
                                  </Button>
                                </Link>
                              </div>
                            )}
                          </div>
                          {user?.role === 'superadmin' && (
                            <Link href="/admin/credits" className="block">
                              <Button variant="outline" className="w-full border-primary-foreground text-slate-800 hover:bg-primary-foreground hover:text-[#FD66C5]" data-testid="link-admin-credits-mobile">
                                Admin Credits
                              </Button>
                            </Link>
                          )}
                        </>
                      ) : (
                        <>
                          <Link href="/student-portal" className="block">
                            <Button variant="outline" className="w-full border-primary-foreground text-slate-800 hover:bg-primary-foreground hover:text-[#FD66C5]" data-testid="link-student-portal-mobile">
                              My Portal
                            </Button>
                          </Link>
                          <Link href="/student-resources" className="block">
                            <Button variant="outline" className="w-full border-primary-foreground text-slate-800 hover:bg-primary-foreground hover:text-[#FD66C5]" data-testid="link-student-resources-mobile">
                              Student Resources
                            </Button>
                          </Link>
                        </>
                      )}
                      <Button 
                        variant="outline" 
                        className="w-full border-primary-foreground text-slate-800 hover:bg-primary-foreground hover:text-[#FD66C5]"
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
      <footer className="bg-[hsl(204,27%,16%)] text-white py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-12 gap-8">
            <div className="md:col-span-5">
              <h3 className="text-xl font-bold mb-4 font-heading uppercase tracking-wide">
                Apache Solutions
              </h3>
              <p className="text-white/80">We are known for meeting the student at their current skill level, while pushing them to the next level. Our one-on-one training sessions are dedicated training sessions tailored to the individual student.</p>
            </div>

            <div className="md:col-span-2">
              <h4 className="font-semibold mb-4 text-[#34B8FE]">Support</h4>
              <div className="space-y-2">
                <Link href="/contact" className="block text-white/80 hover:text-[#FD66C5] transition-colors" data-testid="link-contact-support">Contact Us</Link>
                <Link href="/privacy-policy" className="block text-white/80 hover:text-[#FD66C5] transition-colors" data-testid="link-privacy-policy">Privacy Policy</Link>
                <Link href="/terms-of-service" className="block text-white/80 hover:text-[#FD66C5] transition-colors" data-testid="link-terms-of-service">Terms of Service</Link>
                <Link href="/refund-policy" className="block text-white/80 hover:text-[#FD66C5] transition-colors" data-testid="link-refund-policy">Refund Policy</Link>
              </div>
            </div>

            <div className="md:col-span-2">
              <h4 className="font-semibold mb-4 text-[#34B8FE]">Quick Links</h4>
              <div className="space-y-2">
                <Link href="/schedule-list" className="block text-white/80 hover:text-[#FD66C5] transition-colors" data-testid="link-footer-upcoming-courses">Upcoming Courses</Link>
                <Link href="/student-portal" className="block text-white/80 hover:text-[#FD66C5] transition-colors" data-testid="link-footer-student-dashboard">Student Dashboard</Link>
                <a href="#resources" className="block text-white/80 hover:text-[#FD66C5] transition-colors">Resources</a>
              </div>
            </div>

            <div className="md:col-span-3">
              <h4 className="font-semibold mb-4 text-[#34B8FE]">Contact</h4>
              <div className="space-y-2 text-white/80">
                <div className="flex items-start space-x-2">
                  <span>✉️</span>
                  <a href="mailto:Info@ApacheNC.com" className="hover:text-[#FD66C5] transition-colors">Info@ApacheNC.com</a>
                </div>
                <div className="flex items-start space-x-2">
                  <span>📍</span>
                  <span>Yadkinville, NC</span>
                </div>
              </div>
              <div className="mt-6">
                <h4 className="font-semibold mb-3 text-[#34B8FE]">Follow Us</h4>
                <div className="flex items-center gap-4">
                  <a 
                    href="https://www.facebook.com/ApacheSolutionsLLC" 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="text-white/80 hover:text-[#FD66C5] transition-colors"
                    data-testid="link-social-facebook"
                  >
                    <SiFacebook className="h-6 w-6" />
                  </a>
                  <a 
                    href="https://www.instagram.com/apachesolutionsllc/" 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="text-white/80 hover:text-[#FD66C5] transition-colors"
                    data-testid="link-social-instagram"
                  >
                    <SiInstagram className="h-6 w-6" />
                  </a>
                  <a 
                    href="https://www.youtube.com/channel/UCAFrVq3vmAQdCWGBlSohkCw" 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="text-white/80 hover:text-[#FD66C5] transition-colors"
                    data-testid="link-social-youtube"
                  >
                    <SiYoutube className="h-6 w-6" />
                  </a>
                  <a 
                    href="https://www.google.com/maps/place//data=!4m3!3m2!1s0x8853d3abcfe118c9:0x443e0b064a5777b5!12e1?source=g.page.m.ad._" 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="text-white/80 hover:text-[#FD66C5] transition-colors"
                    data-testid="link-social-google"
                  >
                    <SiGoogle className="h-6 w-6" />
                  </a>
                </div>
              </div>
            </div>
          </div>

          <div className="border-t border-white/20 mt-8 pt-8 text-white/70">
            <div className="flex flex-col md:flex-row justify-between items-center gap-4">
              <p style={{ fontFamily: 'League Gothic, sans-serif' }} className="text-left text-lg">&copy; {new Date().getFullYear()} Apache Solutions</p>
              <p className="text-center md:absolute md:left-1/2 md:transform md:-translate-x-1/2">Built and Powered by <a href="https://instructorops.com" target="_blank" rel="noopener noreferrer" className="text-[#34B8FE] font-bold hover:text-[#FD66C5] transition-colors underline">InstructorOps</a></p>
              <div className="hidden md:block"></div>
            </div>
          </div>
        </div>
      </footer>

      {/* Floating Gift Card Button */}
      <Link href="/gift-cards">
        <img 
          src={santaGiftCardImage} 
          alt="Get Your Gift Card!" 
          className="fixed bottom-6 right-6 z-50 w-32 cursor-pointer transition-all duration-200 drop-shadow-lg hover:drop-shadow-[0_0_10px_#FD66C5] hover:brightness-110"
          data-testid="button-floating-gift-card"
        />
      </Link>
    </div>
  );
}

export default Layout;