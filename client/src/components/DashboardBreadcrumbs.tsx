import { Link, useLocation } from "wouter";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";

const routeLabels: Record<string, string> = {
  "/instructor-dashboard": "Dashboard",
  "/instructor-calendar": "Calendar",
  "/schedule-calendar": "Schedule",
  "/reports": "Reports",
  "/course-management": "Course Manager",
  "/course-forms-management": "Course Forms",
  "/appointments": "Appointments",
  "/students": "Student Directory",
  "/communications": "Communications",
  "/product-management": "Products",
  "/promo-codes": "Promo Codes",
  "/gift-card-management": "Gift Cards",
  "/admin/credits": "SMS/Email Credits",
  "/admin/waivers": "Waivers",
  "/admin/users": "User Management",
  "/settings": "Google Calendar",
  "/student-portal": "Student Dashboard",
  "/roster": "Roster",
  "/course-edit": "Edit Course",
  "/payment-details": "Payment Details",
};

// Map routes to their parent group for breadcrumb hierarchy
const routeParents: Record<string, { label: string; href: string }> = {
  "/course-forms-management": { label: "Course Manager", href: "/course-management" },
  "/roster": { label: "Student Directory", href: "/students" },
  "/course-edit": { label: "Course Manager", href: "/course-management" },
  "/payment-details": { label: "Student Directory", href: "/students" },
};

export function DashboardBreadcrumbs() {
  const [location] = useLocation();

  // Find the label for the current route, handling dynamic segments
  const basePath = location.replace(/\/[^/]+$/, ""); // strip last segment for dynamic routes
  const currentLabel = routeLabels[location] || routeLabels[basePath] || "Page";
  const parent = routeParents[location] || routeParents[basePath];

  return (
    <Breadcrumb>
      <BreadcrumbList>
        <BreadcrumbItem>
          <BreadcrumbLink asChild>
            <Link href="/instructor-dashboard">Dashboard</Link>
          </BreadcrumbLink>
        </BreadcrumbItem>

        {parent && location !== "/instructor-dashboard" && (
          <>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbLink asChild>
                <Link href={parent.href}>{parent.label}</Link>
              </BreadcrumbLink>
            </BreadcrumbItem>
          </>
        )}

        {location !== "/instructor-dashboard" && (
          <>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbPage>{currentLabel}</BreadcrumbPage>
            </BreadcrumbItem>
          </>
        )}
      </BreadcrumbList>
    </Breadcrumb>
  );
}
