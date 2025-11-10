import { Switch, Route, useLocation } from "wouter";
import { useEffect } from "react";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useAuth } from "@/hooks/useAuth";
import Landing from "@/pages/landing";
import InstructorDashboard from "@/pages/instructor-dashboard";
import CourseManagement from "@/pages/course-management";
import CourseFormsManagement from "@/pages/course-forms-management";
import ProductManagement from "@/pages/product-management";
import Storefront from "@/pages/storefront";
import CartPage from "@/pages/cart";
import StudentPortal from "@/pages/student-portal";
import { StudentsPage } from "@/pages/StudentsPage";
import CourseRegistration from "@/pages/course-registration";
import Checkout from "@/pages/checkout";
import PromoCodesPage from "@/pages/promo-codes";
import CommunicationsDashboardPage from "@/pages/communications-dashboard";
import Reports from "@/pages/reports";
import ScheduleList from "@/pages/schedule-list";
import ScheduleCalendar from "@/pages/schedule-calendar";
import ContactPage from "@/pages/contact";
import PrivacyPolicyPage from "@/pages/privacy-policy";
import TermsOfServicePage from "@/pages/terms-of-service";
import RefundPolicyPage from "@/pages/refund-policy";
import OnboardingPage from "@/pages/onboarding";
import TheCrucible from "@/pages/the-crucible";
import AppointmentsPage from "@/pages/appointments";
import BookAppointmentPage from "@/pages/book-appointment";
import NotFound from "@/pages/not-found";

function Router() {
  const { isAuthenticated, isLoading, user } = useAuth();
  const [location] = useLocation();

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [location]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <Switch>
      <Route path="/" component={Landing} />
      <Route path="/store" component={Storefront} />
      <Route path="/cart" component={CartPage} />
      <Route path="/contact" component={ContactPage} />
      <Route path="/course-registration/:id" component={CourseRegistration} />
      <Route path="/checkout" component={Checkout} />
      <Route path="/schedule-list" component={ScheduleList} />
      <Route path="/schedule-calendar" component={ScheduleCalendar} />
      <Route path="/privacy-policy" component={PrivacyPolicyPage} />
      <Route path="/terms-of-service" component={TermsOfServicePage} />
      <Route path="/refund-policy" component={RefundPolicyPage} />
      <Route path="/the-crucible" component={TheCrucible} />
      <Route path="/book-appointment/:instructorId" component={BookAppointmentPage} />
      <Route path="/instructor-dashboard" component={InstructorDashboard} />
      <Route path="/onboarding" component={OnboardingPage} />
      <Route path="/course-management" component={CourseManagement} />
      <Route path="/course-forms-management" component={CourseFormsManagement} />
      <Route path="/product-management" component={ProductManagement} />
      <Route path="/promo-codes" component={PromoCodesPage} />
      <Route path="/communications" component={CommunicationsDashboardPage} />
      <Route path="/reports" component={Reports} />
      <Route path="/appointments" component={AppointmentsPage} />
      <Route path="/student-portal" component={StudentPortal} />
      <Route path="/students" component={StudentsPage} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Router />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;