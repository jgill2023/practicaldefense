import { Switch, Route, useLocation } from "wouter";
import { useEffect } from "react";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useAuth } from "@/hooks/useAuth";
import Landing from "@/pages/landing";
import Login from "@/pages/Login";
import Signup from "@/pages/Signup";
import VerifyEmail from "@/pages/VerifyEmail";
import ResetPassword from "@/pages/ResetPassword";
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
import TheCrucible from "@/pages/the-crucible";
import AppointmentsPage from "@/pages/appointments";
import BookAppointmentPage from "@/pages/book-appointment";
import AdminCreditsPage from "@/pages/admin-credits";
import UserManagementPage from "@/pages/user-management";
import PendingApprovalPage from "@/pages/pending-approval";
import AboutChris from "@/pages/about-chris";
import NotFound from "@/pages/not-found";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertCircle } from "lucide-react";
import { isInstructorOrHigher } from "@/lib/authUtils";

// Assuming ProtectedRouteProps and Alert components are defined elsewhere
// For this example, let's define a placeholder for ProtectedRouteProps
interface ProtectedRouteProps {
  children: React.ReactNode;
  requireInstructor?: boolean;
}

function ProtectedRoute({ children, requireInstructor = false }: ProtectedRouteProps) {
  const { user, isLoading } = useAuth();
  const [location] = useLocation();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    window.location.href = '/login';
    return null;
  }

  if (requireInstructor && !isInstructorOrHigher(user)) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen p-4">
        <Alert variant="destructive" className="max-w-md">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Unauthorized</AlertTitle>
          <AlertDescription>
            You need instructor access to view this page. Redirecting...
          </AlertDescription>
        </Alert>
        {setTimeout(() => {
          window.location.href = '/';
        }, 2000) && null}
      </div>
    );
  }

  return <>{children}</>;
}


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

  // Redirect pending users to approval page except for allowed routes
  if (isAuthenticated && user?.userStatus === 'pending') {
    const allowedPaths = ['/pending-approval', '/contact', '/about-chris', '/privacy-policy', '/terms-of-service', '/refund-policy', '/the-crucible', '/'];
    if (!allowedPaths.includes(location) && location !== '/') {
      window.location.href = '/pending-approval';
      return null;
    }
  }

  return (
    <Switch>
      <Route path="/login" component={Login} />
      <Route path="/signup" component={Signup} />
      <Route path="/verify-email" component={VerifyEmail} />
      <Route path="/reset-password" component={ResetPassword} />
      <Route path="/pending-approval" component={PendingApprovalPage} />
      <Route path="/" component={Landing} />
      <Route path="/store" component={Storefront} />
      <Route path="/cart" component={CartPage} />
      <Route path="/contact" component={ContactPage} />
      <Route path="/about-chris" component={AboutChris} />
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
      <Route path="/course-management" component={CourseManagement} />
      <Route path="/course-forms-management" component={CourseFormsManagement} />
      <Route path="/product-management" component={ProductManagement} />
      <Route path="/promo-codes" component={PromoCodesPage} />
      <Route path="/communications" component={CommunicationsDashboardPage} />
      <Route path="/reports" component={Reports} />
      <Route path="/appointments" component={AppointmentsPage} />
      <Route path="/admin/credits" component={AdminCreditsPage} />
      <Route path="/admin/users" component={UserManagementPage} />
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