import {
  LayoutDashboard,
  Calendar,
  CalendarDays,
  BarChart3,
  GraduationCap,
  FileText,
  CalendarPlus,
  Users,
  MessageSquare,
  ShoppingBag,
  BadgePercent,
  Gift,
  CreditCard,
  UserCog,
  FileSignature,
  Settings,
  User,
  ExternalLink,
  type LucideIcon,
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useCommunicationCounts } from "@/hooks/useCommunicationCounts";
import { usePendingUsersCount } from "@/hooks/usePendingUsersCount";
import {
  isInstructorOrHigher,
  isAdminOrHigher,
  canCreateAccounts,
} from "@/lib/authUtils";

export interface NavItem {
  label: string;
  href: string;
  icon: LucideIcon;
  badge?: number;
  external?: boolean;
}

export interface NavGroup {
  label: string;
  items: NavItem[];
}

export function useDashboardNavigation(): NavGroup[] {
  const { user } = useAuth();
  const { counts } = useCommunicationCounts();
  const { pendingCount } = usePendingUsersCount();

  const groups: NavGroup[] = [];

  if (isInstructorOrHigher(user)) {
    groups.push({
      label: "Overview",
      items: [
        { label: "Dashboard", href: "/instructor-dashboard", icon: LayoutDashboard },
        { label: "Calendar", href: "/instructor-calendar", icon: Calendar },
        { label: "Schedule", href: "/schedule-calendar", icon: CalendarDays },
        { label: "Reports", href: "/reports", icon: BarChart3 },
      ],
    });

    groups.push({
      label: "Courses",
      items: [
        { label: "Course Manager", href: "/course-management", icon: GraduationCap },
        { label: "Course Forms", href: "/course-forms-management", icon: FileText },
        { label: "Appointments", href: "/appointments", icon: CalendarPlus },
      ],
    });

    groups.push({
      label: "Students",
      items: [
        { label: "Student Directory", href: "/students", icon: Users },
        {
          label: "Communications",
          href: "/communications",
          icon: MessageSquare,
          badge: counts.unread > 0 ? counts.unread : undefined,
        },
      ],
    });
  }

  // Commerce section — mixed visibility
  const commerceItems: NavItem[] = [];
  if (isAdminOrHigher(user)) {
    commerceItems.push({ label: "Products", href: "/product-management", icon: ShoppingBag });
  }
  if (isInstructorOrHigher(user)) {
    commerceItems.push({ label: "Promo Codes", href: "/promo-codes", icon: BadgePercent });
  }
  if (isAdminOrHigher(user)) {
    commerceItems.push(
      { label: "Gift Cards", href: "/gift-card-management", icon: Gift },
      { label: "SMS/Email Credits", href: "/admin/credits", icon: CreditCard },
    );
  }
  if (commerceItems.length > 0) {
    groups.push({ label: "Commerce", items: commerceItems });
  }

  // Admin section
  const adminItems: NavItem[] = [];
  if (canCreateAccounts(user)) {
    adminItems.push({
      label: "User Management",
      href: "/admin/users",
      icon: UserCog,
      badge: pendingCount > 0 ? pendingCount : undefined,
    });
  }
  if (isAdminOrHigher(user)) {
    adminItems.push({ label: "Waivers", href: "/admin/waivers", icon: FileSignature });
  }
  if (adminItems.length > 0) {
    groups.push({ label: "Admin", items: adminItems });
  }

  // Settings
  if (isInstructorOrHigher(user)) {
    groups.push({
      label: "Settings",
      items: [
        { label: "Google Calendar", href: "/settings", icon: Settings },
      ],
    });
  }

  // Always visible for authenticated users
  groups.push({
    label: "My Portal",
    items: [
      { label: "Student Dashboard", href: "/student-portal", icon: User },
      { label: "View Website", href: "/", icon: ExternalLink, external: true },
    ],
  });

  return groups;
}
