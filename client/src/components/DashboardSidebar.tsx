import { Link, useLocation } from "wouter";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuBadge,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
  SidebarSeparator,
} from "@/components/ui/sidebar";
import { useDashboardNavigation } from "@/hooks/useDashboardNavigation";

export function DashboardSidebar() {
  const [location] = useLocation();
  const navGroups = useDashboardNavigation();

  // Separate the "My Portal" group to render it in the footer
  const mainGroups = navGroups.filter((g) => g.label !== "My Portal");
  const portalGroup = navGroups.find((g) => g.label === "My Portal");

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="lg" asChild>
              <Link href="/instructor-dashboard">
                <div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-[#004149] text-white font-bold text-sm">
                  PD
                </div>
                <div className="grid flex-1 text-left text-sm leading-tight">
                  <span className="truncate font-semibold">Practical Defense</span>
                  <span className="truncate text-xs text-sidebar-foreground/60">Dashboard</span>
                </div>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>

      <SidebarContent>
        {mainGroups.map((group) => (
          <SidebarGroup key={group.label}>
            <SidebarGroupLabel>{group.label}</SidebarGroupLabel>
            <SidebarMenu>
              {group.items.map((item) => {
                const isActive = location === item.href;
                return (
                  <SidebarMenuItem key={item.href}>
                    <SidebarMenuButton
                      asChild
                      isActive={isActive}
                      tooltip={item.label}
                    >
                      {item.external ? (
                        <a href={item.href} target="_blank" rel="noopener noreferrer">
                          <item.icon />
                          <span>{item.label}</span>
                        </a>
                      ) : (
                        <Link href={item.href}>
                          <item.icon />
                          <span>{item.label}</span>
                        </Link>
                      )}
                    </SidebarMenuButton>
                    {item.badge !== undefined && item.badge > 0 && (
                      <SidebarMenuBadge>{item.badge > 99 ? "99+" : item.badge}</SidebarMenuBadge>
                    )}
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroup>
        ))}
      </SidebarContent>

      {portalGroup && (
        <SidebarFooter>
          <SidebarSeparator />
          <SidebarMenu>
            {portalGroup.items.map((item) => {
              const isActive = location === item.href;
              return (
                <SidebarMenuItem key={item.href}>
                  <SidebarMenuButton
                    asChild
                    isActive={isActive}
                    tooltip={item.label}
                  >
                    {item.external ? (
                      <a href={item.href} target="_blank" rel="noopener noreferrer">
                        <item.icon />
                        <span>{item.label}</span>
                      </a>
                    ) : (
                      <Link href={item.href}>
                        <item.icon />
                        <span>{item.label}</span>
                      </Link>
                    )}
                  </SidebarMenuButton>
                </SidebarMenuItem>
              );
            })}
          </SidebarMenu>
        </SidebarFooter>
      )}

      <SidebarRail />
    </Sidebar>
  );
}
