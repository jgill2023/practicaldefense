import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useQuery } from "@tanstack/react-query";
import { Layout } from "@/components/Layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { BarChart, Users, DollarSign, TrendingUp, Calendar, MessageSquare, AlertTriangle, Download } from "lucide-react";
import type { User } from "@shared/schema";
import { format } from "date-fns";

interface DashboardStats {
  upcomingCourses: number;
  pastCourses: number;
  allStudents: number;
  totalRevenue: number;
  outstandingRevenue: number;
}

export default function Reports() {
  const { user, isAuthenticated } = useAuth();
  const [selectedPeriod, setSelectedPeriod] = useState("30");

  // Fetch dashboard statistics
  const { data: dashboardStats, isLoading: statsLoading } = useQuery<DashboardStats>({
    queryKey: ["/api/instructor/dashboard-stats"],
    enabled: isAuthenticated && (user as User)?.role === 'instructor',
    retry: false,
  });

  if (!isAuthenticated) {
    return <div>Please log in to view reports.</div>;
  }

  if ((user as User)?.role !== 'instructor') {
    return <div>Access denied. Instructor privileges required.</div>;
  }

  const handleExportReport = (type: string) => {
    // TODO: Implement export functionality
    console.log(`Exporting ${type} report for ${selectedPeriod} days`);
  };

  return (
    <Layout>
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-foreground" data-testid="heading-reports">
              Reports & Analytics
            </h1>
            <p className="text-muted-foreground mt-2">
              Comprehensive reports and insights for your training business
            </p>
          </div>
          
          <div className="flex items-center space-x-4">
            <Select value={selectedPeriod} onValueChange={setSelectedPeriod}>
              <SelectTrigger className="w-40" data-testid="select-period">
                <SelectValue placeholder="Select period" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="7">Last 7 days</SelectItem>
                <SelectItem value="30">Last 30 days</SelectItem>
                <SelectItem value="90">Last 90 days</SelectItem>
                <SelectItem value="365">Last 12 months</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <Tabs defaultValue="overview" className="space-y-6">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="overview" data-testid="tab-overview">Overview</TabsTrigger>
            <TabsTrigger value="financial" data-testid="tab-financial">Financial</TabsTrigger>
            <TabsTrigger value="students" data-testid="tab-students">Students</TabsTrigger>
            <TabsTrigger value="communications" data-testid="tab-communications">Communications</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-6">
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Total Courses</CardTitle>
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold" data-testid="stat-total-courses">
                    {statsLoading ? "..." : (dashboardStats?.upcomingCourses ?? 0) + (dashboardStats?.pastCourses ?? 0)}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {dashboardStats?.upcomingCourses ?? 0} upcoming, {dashboardStats?.pastCourses ?? 0} completed
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Total Students</CardTitle>
                  <Users className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold" data-testid="stat-total-students">
                    {statsLoading ? "..." : dashboardStats?.allStudents ?? 0}
                  </div>
                  <p className="text-xs text-muted-foreground">Active enrollments</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
                  <DollarSign className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold" data-testid="stat-total-revenue">
                    {statsLoading ? "..." : `$${dashboardStats?.totalRevenue?.toFixed(2) ?? "0.00"}`}
                  </div>
                  <p className="text-xs text-muted-foreground">Collected payments</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Outstanding</CardTitle>
                  <AlertTriangle className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold" data-testid="stat-outstanding-revenue">
                    {statsLoading ? "..." : `$${dashboardStats?.outstandingRevenue?.toFixed(2) ?? "0.00"}`}
                  </div>
                  <p className="text-xs text-muted-foreground">Pending payments</p>
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  Quick Actions
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={() => handleExportReport('overview')}
                    data-testid="button-export-overview"
                  >
                    <Download className="h-4 w-4 mr-2" />
                    Export Overview
                  </Button>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid gap-4 md:grid-cols-3">
                  <Card className="p-4">
                    <div className="flex items-center space-x-2">
                      <BarChart className="h-5 w-5 text-primary" />
                      <span className="font-medium">Performance Metrics</span>
                    </div>
                    <p className="text-sm text-muted-foreground mt-2">
                      Course completion rates, student satisfaction, and instructor performance
                    </p>
                  </Card>
                  
                  <Card className="p-4">
                    <div className="flex items-center space-x-2">
                      <TrendingUp className="h-5 w-5 text-primary" />
                      <span className="font-medium">Growth Analysis</span>
                    </div>
                    <p className="text-sm text-muted-foreground mt-2">
                      Revenue trends, enrollment growth, and market analysis
                    </p>
                  </Card>
                  
                  <Card className="p-4">
                    <div className="flex items-center space-x-2">
                      <MessageSquare className="h-5 w-5 text-primary" />
                      <span className="font-medium">Communication Stats</span>
                    </div>
                    <p className="text-sm text-muted-foreground mt-2">
                      Email delivery rates, response times, and engagement metrics
                    </p>
                  </Card>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="financial" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  Financial Summary
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={() => handleExportReport('financial')}
                    data-testid="button-export-financial"
                  >
                    <Download className="h-4 w-4 mr-2" />
                    Export Financial Report
                  </Button>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-center py-8 text-muted-foreground">
                  <DollarSign className="h-12 w-12 mx-auto mb-4" />
                  <p>Financial reporting features coming soon.</p>
                  <p className="text-sm mt-2">This will include revenue breakdown, payment status tracking, and financial forecasting.</p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="students" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  Student Analytics
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={() => handleExportReport('students')}
                    data-testid="button-export-students"
                  >
                    <Download className="h-4 w-4 mr-2" />
                    Export Student Report
                  </Button>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-center py-8 text-muted-foreground">
                  <Users className="h-12 w-12 mx-auto mb-4" />
                  <p>Student analytics features coming soon.</p>
                  <p className="text-sm mt-2">This will include enrollment trends, completion rates, and student demographics.</p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="communications" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  Communication Reports
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={() => handleExportReport('communications')}
                    data-testid="button-export-communications"
                  >
                    <Download className="h-4 w-4 mr-2" />
                    Export Communication Report
                  </Button>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-center py-8 text-muted-foreground">
                  <MessageSquare className="h-12 w-12 mx-auto mb-4" />
                  <p>Communication reporting features coming soon.</p>
                  <p className="text-sm mt-2">This will include email delivery rates, SMS statistics, and communication compliance reports.</p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </Layout>
  );
}