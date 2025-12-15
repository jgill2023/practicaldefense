import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Layout } from "@/components/Layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/hooks/useAuth";
import { Calendar, Clock, Users, ChevronRight, BookOpen } from "lucide-react";
import type { CourseWithSchedules, CourseSchedule } from "@shared/schema";
import { formatDateSafe } from "@/lib/dateUtils";
import { PolicyModal } from "@/components/PolicyModal";

export default function Register() {
  const [, setLocation] = useLocation();
  const { isAuthenticated, user } = useAuth();
  const [selectedCourseId, setSelectedCourseId] = useState<string>("");
  const [selectedScheduleId, setSelectedScheduleId] = useState<string>("");
  const [policyModalOpen, setPolicyModalOpen] = useState<'terms' | 'privacy' | 'refund' | null>(null);

  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    smsConsent: false,
    agreeToTerms: false,
  });

  const { data: courses, isLoading } = useQuery<CourseWithSchedules[]>({
    queryKey: ["/api/courses"],
  });

  useEffect(() => {
    if (isAuthenticated && user) {
      setFormData(prev => ({
        ...prev,
        firstName: (user as any)?.firstName || '',
        lastName: (user as any)?.lastName || '',
        email: (user as any)?.email || '',
        phone: (user as any)?.phone || '',
      }));
    }
  }, [isAuthenticated, user]);

  const availableCourses = courses?.filter(course => {
    if (!course.isActive || course.deletedAt || course.status !== 'published') return false;
    
    const hasUpcomingSchedules = course.schedules?.some(schedule => {
      if (schedule.deletedAt || new Date(schedule.startDate) <= new Date()) return false;
      if (schedule.notes?.includes('CANCELLED:')) return false;
      
      const enrollmentCount = schedule.enrollments?.filter((e: any) => 
        e.status === 'confirmed' || e.status === 'pending'
      ).length || 0;
      const actualAvailableSpots = Math.max(0, schedule.maxSpots - enrollmentCount);
      return actualAvailableSpots > 0;
    });
    
    return hasUpcomingSchedules;
  }) || [];

  const selectedCourse = availableCourses.find(c => c.id === selectedCourseId);
  
  const availableSchedules = selectedCourse?.schedules
    .filter(schedule => {
      if (schedule.deletedAt || new Date(schedule.startDate) <= new Date()) return false;
      if (schedule.notes?.includes('CANCELLED:')) return false;
      
      const enrollmentCount = schedule.enrollments?.filter((e: any) => 
        e.status === 'confirmed' || e.status === 'pending'
      ).length || 0;
      const actualAvailableSpots = Math.max(0, schedule.maxSpots - enrollmentCount);
      return actualAvailableSpots > 0;
    })
    .sort((a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime()) || [];

  const selectedSchedule = availableSchedules.find(s => s.id === selectedScheduleId);

  const handleCourseChange = (courseId: string) => {
    setSelectedCourseId(courseId);
    setSelectedScheduleId("");
  };

  const handleProceedToPayment = () => {
    if (!selectedCourse || !selectedSchedule) return;
    
    const courseTitle = encodeURIComponent(selectedCourse.title.replace(/\s+/g, '-').toLowerCase());
    setLocation(`/course-registration/${courseTitle}/${selectedScheduleId}`);
  };

  const canProceed = selectedCourseId && selectedScheduleId && formData.firstName && 
    formData.lastName && formData.email && formData.phone && formData.agreeToTerms;

  if (isLoading) {
    return (
      <Layout>
        <div className="max-w-3xl mx-auto px-4 py-12">
          <div className="animate-pulse space-y-4">
            <div className="h-8 bg-muted rounded w-1/2" />
            <div className="h-4 bg-muted rounded w-3/4" />
            <Card>
              <CardContent className="p-6">
                <div className="space-y-4">
                  <div className="h-10 bg-muted rounded" />
                  <div className="h-10 bg-muted rounded" />
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="max-w-3xl mx-auto px-4 py-12">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-foreground mb-2">Course Registration</h1>
          <p className="text-muted-foreground">Select your course and preferred date to get started</p>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <BookOpen className="mr-2 h-5 w-5" />
                Select Course
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Select value={selectedCourseId} onValueChange={handleCourseChange}>
                <SelectTrigger data-testid="select-course">
                  <SelectValue placeholder="Choose a course" />
                </SelectTrigger>
                <SelectContent>
                  {availableCourses.map((course) => (
                    <SelectItem key={course.id} value={course.id}>
                      <div className="flex items-center justify-between w-full">
                        <span>{course.title}</span>
                        <span className="ml-4 text-muted-foreground">${course.price}</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {selectedCourse && (
                <div className="mt-4 p-4 bg-muted rounded-lg">
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="font-semibold">{selectedCourse.title}</h4>
                    <Badge>{typeof selectedCourse.category === 'string' ? selectedCourse.category : (selectedCourse.category as any)?.name || 'General'}</Badge>
                  </div>
                  <p className="text-sm text-muted-foreground mb-2">{selectedCourse.briefDescription || selectedCourse.description}</p>
                  <div className="flex items-center gap-4 text-sm">
                    <span className="flex items-center">
                      <Clock className="h-4 w-4 mr-1" />
                      {selectedCourse.duration}
                    </span>
                    <span className="font-semibold text-primary">${selectedCourse.price}</span>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {selectedCourseId && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Calendar className="mr-2 h-5 w-5" />
                  Select Date
                </CardTitle>
              </CardHeader>
              <CardContent>
                {availableSchedules.length > 0 ? (
                  <Select value={selectedScheduleId} onValueChange={setSelectedScheduleId}>
                    <SelectTrigger data-testid="select-schedule">
                      <SelectValue placeholder="Choose a date" />
                    </SelectTrigger>
                    <SelectContent>
                      {availableSchedules.map((schedule) => {
                        const enrollmentCount = schedule.enrollments?.filter((e: any) => 
                          e.status === 'confirmed' || e.status === 'pending'
                        ).length || 0;
                        const actualAvailableSpots = Math.max(0, schedule.maxSpots - enrollmentCount);
                        
                        return (
                          <SelectItem key={schedule.id} value={schedule.id}>
                            <div className="flex items-center gap-2">
                              <span>{formatDateSafe(schedule.startDate.toString())}</span>
                              <span className="text-muted-foreground">-</span>
                              <span className="text-muted-foreground">{actualAvailableSpots} spots left</span>
                            </div>
                          </SelectItem>
                        );
                      })}
                    </SelectContent>
                  </Select>
                ) : (
                  <div className="text-center py-4 text-muted-foreground">
                    <Calendar className="mx-auto h-8 w-8 mb-2 opacity-50" />
                    <p>No available dates for this course</p>
                  </div>
                )}

                {selectedSchedule && (
                  <div className="mt-4 p-4 bg-primary/5 border border-primary/20 rounded-lg">
                    <div className="text-sm">
                      <div className="font-medium text-foreground mb-1">Selected Date:</div>
                      <div className="flex items-center text-muted-foreground">
                        <Calendar className="mr-2 h-4 w-4 text-primary" />
                        {formatDateSafe(selectedSchedule.startDate.toString())}
                        {selectedSchedule.startTime && (
                          <span className="ml-2">at {selectedSchedule.startTime.slice(0, 5)}</span>
                        )}
                      </div>
                      {selectedSchedule.location && (
                        <div className="flex items-center text-muted-foreground mt-1">
                          <span className="mr-2">📍</span>
                          {selectedSchedule.location}
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {selectedScheduleId && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Users className="mr-2 h-5 w-5" />
                  Student Information
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="firstName">First Name *</Label>
                    <Input
                      id="firstName"
                      value={formData.firstName}
                      onChange={(e) => setFormData(prev => ({ ...prev, firstName: e.target.value }))}
                      placeholder="John"
                      required
                      data-testid="input-first-name"
                    />
                  </div>
                  <div>
                    <Label htmlFor="lastName">Last Name *</Label>
                    <Input
                      id="lastName"
                      value={formData.lastName}
                      onChange={(e) => setFormData(prev => ({ ...prev, lastName: e.target.value }))}
                      placeholder="Doe"
                      required
                      data-testid="input-last-name"
                    />
                  </div>
                </div>

                <div>
                  <Label htmlFor="email">Email Address *</Label>
                  <Input
                    id="email"
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                    placeholder="john@example.com"
                    required
                    data-testid="input-email"
                  />
                </div>

                <div>
                  <Label htmlFor="phone">Phone Number *</Label>
                  <Input
                    id="phone"
                    type="tel"
                    value={formData.phone}
                    onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))}
                    placeholder="(555) 123-4567"
                    required
                    data-testid="input-phone"
                  />
                </div>
              </CardContent>
            </Card>
          )}

          {selectedScheduleId && (
            <Card>
              <CardContent className="pt-6 space-y-4">
                <div className="flex items-start space-x-3">
                  <Checkbox
                    id="smsConsent"
                    checked={formData.smsConsent}
                    onCheckedChange={(checked) => 
                      setFormData(prev => ({ ...prev, smsConsent: checked === true }))
                    }
                    data-testid="checkbox-sms-consent"
                  />
                  <label htmlFor="smsConsent" className="text-sm text-muted-foreground leading-relaxed cursor-pointer">
                    By checking this box, I consent to receive automated text messages related to my class registration, reminders, and important updates from Apache Solutions. Message & data rates may apply. Reply STOP to unsubscribe or HELP for help.
                  </label>
                </div>

                <div className="flex items-start space-x-3">
                  <Checkbox
                    id="agreeToTerms"
                    checked={formData.agreeToTerms}
                    onCheckedChange={(checked) => 
                      setFormData(prev => ({ ...prev, agreeToTerms: checked === true }))
                    }
                    data-testid="checkbox-agree-terms"
                  />
                  <label htmlFor="agreeToTerms" className="text-sm text-muted-foreground leading-relaxed cursor-pointer">
                    I agree to the{' '}
                    <button
                      type="button"
                      onClick={() => setPolicyModalOpen('terms')}
                      className="text-primary hover:text-primary/80 transition-colors underline"
                    >
                      Terms of Service
                    </button>
                    ,{' '}
                    <button
                      type="button"
                      onClick={() => setPolicyModalOpen('privacy')}
                      className="text-primary hover:text-primary/80 transition-colors underline"
                    >
                      Privacy Policy
                    </button>
                    , and{' '}
                    <button
                      type="button"
                      onClick={() => setPolicyModalOpen('refund')}
                      className="text-primary hover:text-primary/80 transition-colors underline"
                    >
                      Refund Policy
                    </button>
                    .
                  </label>
                </div>
              </CardContent>
            </Card>
          )}

          {selectedScheduleId && (
            <Button
              size="lg"
              className="w-full"
              onClick={handleProceedToPayment}
              disabled={!canProceed}
              data-testid="button-proceed-payment"
            >
              Proceed to Payment
              <ChevronRight className="ml-2 h-4 w-4" />
            </Button>
          )}
        </div>
      </div>

      {policyModalOpen && (
        <PolicyModal 
          isOpen={true} 
          onClose={() => setPolicyModalOpen(null)} 
          type={policyModalOpen}
        />
      )}
    </Layout>
  );
}
