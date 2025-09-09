import { useState } from "react";
import { useLocation, useRoute } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { Layout } from "@/components/Layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { ObjectUploader } from "@/components/ObjectUploader";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Clock, Calendar, User, Upload, DollarSign, FileText } from "lucide-react";
import type { CourseWithSchedules, CourseSchedule } from "@shared/schema";
import type { UploadResult } from '@uppy/core';

export default function CourseRegistration() {
  const [, params] = useRoute("/course-registration/:id");
  const [, setLocation] = useLocation();
  const { isAuthenticated } = useAuth();
  const { toast } = useToast();
  
  const [selectedSchedule, setSelectedSchedule] = useState<CourseSchedule | null>(null);
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    emergencyContact: '',
    specialRequirements: '',
    agreeToTerms: false,
    // Account creation fields (for non-authenticated users)
    password: '',
    confirmPassword: '',
    createAccount: !isAuthenticated, // Default to true if not authenticated
  });
  const [waiverUrl, setWaiverUrl] = useState<string>('');

  const { data: course, isLoading: courseLoading } = useQuery<CourseWithSchedules>({
    queryKey: ["/api/courses", params?.id],
    enabled: !!params?.id,
  });

  const enrollMutation = useMutation({
    mutationFn: async (enrollmentData: any) => {
      const response = await apiRequest("POST", "/api/enrollments", enrollmentData);
      return response.json();
    },
    onSuccess: (enrollment) => {
      toast({
        title: "Registration Initiated",
        description: "Proceeding to payment...",
      });
      setLocation(`/checkout?enrollmentId=${enrollment.id}`);
      queryClient.invalidateQueries({ queryKey: ["/api/student/enrollments"] });
    },
    onError: (error) => {
      toast({
        title: "Registration Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleGetUploadParameters = async () => {
    const response = await apiRequest("POST", "/api/objects/upload");
    const data = await response.json();
    return {
      method: 'PUT' as const,
      url: data.uploadURL,
    };
  };

  const handleUploadComplete = async (result: UploadResult<Record<string, unknown>, Record<string, unknown>>) => {
    if (result.successful && result.successful[0]) {
      const uploadURL = result.successful[0].uploadURL;
      if (uploadURL) {
        try {
          const response = await apiRequest("PUT", "/api/waivers", { waiverURL: uploadURL });
          const data = await response.json();
          setWaiverUrl(data.objectPath);
          toast({
            title: "Waiver Uploaded",
            description: "Your waiver has been successfully uploaded and secured.",
          });
        } catch (error) {
          toast({
            title: "Upload Error",
            description: "Failed to process waiver upload. Please try again.",
            variant: "destructive",
          });
        }
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Account creation validation for non-authenticated users
    if (!isAuthenticated && formData.createAccount) {
      if (!formData.password || formData.password.length < 6) {
        toast({
          title: "Password Required",
          description: "Password must be at least 6 characters long",
          variant: "destructive",
        });
        return;
      }
      
      if (formData.password !== formData.confirmPassword) {
        toast({
          title: "Password Mismatch",
          description: "Passwords do not match",
          variant: "destructive",
        });
        return;
      }
    }

    if (!selectedSchedule) {
      toast({
        title: "Schedule Required",
        description: "Please select a course schedule",
        variant: "destructive",
      });
      return;
    }

    if (!formData.agreeToTerms) {
      toast({
        title: "Terms Required",
        description: "Please agree to the terms and conditions",
        variant: "destructive",
      });
      return;
    }

    if (!waiverUrl) {
      toast({
        title: "Waiver Required",
        description: "Please upload a signed waiver document",
        variant: "destructive",
      });
      return;
    }

    enrollMutation.mutate({
      courseId: params?.id,
      scheduleId: selectedSchedule.id,
      waiverUrl,
      status: 'pending',
      paymentStatus: 'pending',
      // Student information
      studentInfo: {
        firstName: formData.firstName,
        lastName: formData.lastName,
        email: formData.email,
        phone: formData.phone,
        emergencyContact: formData.emergencyContact,
        specialRequirements: formData.specialRequirements,
      },
      // Account creation (for non-authenticated users)
      accountCreation: !isAuthenticated && formData.createAccount ? {
        password: formData.password,
      } : undefined,
    });
  };

  if (courseLoading || !course) {
    return (
      <Layout>
        <div className="max-w-3xl mx-auto px-4 py-12">
          <div className="animate-pulse">
            <div className="h-8 bg-muted rounded w-1/2 mb-4" />
            <div className="h-4 bg-muted rounded w-3/4 mb-8" />
            <Card>
              <CardContent className="p-6">
                <div className="space-y-4">
                  <div className="h-4 bg-muted rounded w-full" />
                  <div className="h-4 bg-muted rounded w-2/3" />
                  <div className="h-4 bg-muted rounded w-1/2" />
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </Layout>
    );
  }

  const availableSchedules = course.schedules.filter(
    schedule => new Date(schedule.startDate) > new Date() && schedule.availableSpots > 0
  );

  return (
    <Layout>
      <div className="max-w-3xl mx-auto px-4 py-12">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-foreground mb-4" data-testid="text-course-title">
            Register for {course.title}
          </h1>
          <p className="text-muted-foreground">{course.description}</p>
        </div>

        {/* Course Summary */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle>Course Information</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-primary mb-1" data-testid="text-course-price">
                  ${course.price}
                </div>
                <div className="text-sm text-muted-foreground">Price</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-accent mb-1" data-testid="text-course-duration">
                  {course.duration}
                </div>
                <div className="text-sm text-muted-foreground">Duration</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-secondary mb-1" data-testid="text-max-students">
                  {course.maxStudents}
                </div>
                <div className="text-sm text-muted-foreground">Max Students</div>
              </div>
              <div className="text-center">
                <Badge className="text-lg px-3 py-1" data-testid="badge-course-category">
                  {course.category}
                </Badge>
              </div>
            </div>
          </CardContent>
        </Card>

        <form onSubmit={handleSubmit} className="space-y-8">
          {/* Schedule Selection */}
          <Card>
            <CardHeader>
              <CardTitle>Select Schedule</CardTitle>
            </CardHeader>
            <CardContent>
              {availableSchedules.length > 0 ? (
                <div className="space-y-4">
                  {availableSchedules.map((schedule) => (
                    <div
                      key={schedule.id}
                      className={`p-4 border rounded-lg cursor-pointer transition-colors ${
                        selectedSchedule?.id === schedule.id
                          ? 'border-primary bg-primary/5'
                          : 'border-border hover:border-primary/50'
                      }`}
                      onClick={() => setSelectedSchedule(schedule)}
                      data-testid={`schedule-option-${schedule.id}`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="space-y-1">
                          <div className="flex items-center text-sm">
                            <Calendar className="mr-2 h-4 w-4 text-accent" />
                            {new Date(schedule.startDate).toLocaleDateString()} - {new Date(schedule.endDate).toLocaleDateString()}
                          </div>
                          {schedule.location && (
                            <div className="flex items-center text-sm text-muted-foreground">
                              <span className="mr-2">📍</span>
                              {schedule.location}
                            </div>
                          )}
                        </div>
                        <div className="text-right">
                          <div className="text-sm font-medium text-success">
                            {schedule.availableSpots} spots left
                          </div>
                          <div className="text-xs text-muted-foreground">
                            Click to select
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <Calendar className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
                  <h3 className="text-lg font-medium text-muted-foreground mb-2">No schedules available</h3>
                  <p className="text-sm text-muted-foreground">Please check back later for new course dates</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Student Information */}
          <Card>
            <CardHeader>
              <CardTitle>Student Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="firstName">First Name *</Label>
                  <Input
                    id="firstName"
                    value={formData.firstName}
                    onChange={(e) => setFormData(prev => ({ ...prev, firstName: e.target.value }))}
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
                  required
                  data-testid="input-phone"
                />
              </div>

              <div>
                <Label htmlFor="emergencyContact">Emergency Contact</Label>
                <Input
                  id="emergencyContact"
                  value={formData.emergencyContact}
                  onChange={(e) => setFormData(prev => ({ ...prev, emergencyContact: e.target.value }))}
                  placeholder="Name and phone number"
                  data-testid="input-emergency-contact"
                />
              </div>

              <div>
                <Label htmlFor="specialRequirements">Special Requirements or Notes</Label>
                <Textarea
                  id="specialRequirements"
                  value={formData.specialRequirements}
                  onChange={(e) => setFormData(prev => ({ ...prev, specialRequirements: e.target.value }))}
                  placeholder="Any special accommodations or requirements"
                  data-testid="textarea-special-requirements"
                />
              </div>
            </CardContent>
          </Card>

          {/* Account Creation (for non-authenticated users) */}
          {!isAuthenticated && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <User className="mr-2 h-5 w-5" />
                  Create Your Account
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-sm text-muted-foreground">
                  Create a secure account to complete your registration and track your training progress.
                </p>
                
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="createAccount"
                    checked={formData.createAccount}
                    onCheckedChange={(checked) => 
                      setFormData(prev => ({ ...prev, createAccount: checked as boolean }))
                    }
                    data-testid="checkbox-create-account"
                  />
                  <Label htmlFor="createAccount" className="text-sm font-medium">
                    Create an account for me (recommended)
                  </Label>
                </div>

                {formData.createAccount && (
                  <div className="space-y-4 pl-6 border-l-2 border-primary/20">
                    <div>
                      <Label htmlFor="password">Password *</Label>
                      <Input
                        id="password"
                        type="password"
                        value={formData.password}
                        onChange={(e) => setFormData(prev => ({ ...prev, password: e.target.value }))}
                        placeholder="Minimum 6 characters"
                        required={formData.createAccount}
                        data-testid="input-password"
                      />
                    </div>
                    <div>
                      <Label htmlFor="confirmPassword">Confirm Password *</Label>
                      <Input
                        id="confirmPassword"
                        type="password"
                        value={formData.confirmPassword}
                        onChange={(e) => setFormData(prev => ({ ...prev, confirmPassword: e.target.value }))}
                        placeholder="Confirm your password"
                        required={formData.createAccount}
                        data-testid="input-confirm-password"
                      />
                    </div>
                    <div className="text-xs text-muted-foreground space-y-1">
                      <p>Benefits of creating an account:</p>
                      <ul className="list-disc list-inside space-y-1 ml-2">
                        <li>Track your training progress</li>
                        <li>View certificates and completion records</li>
                        <li>Receive updates about future courses</li>
                        <li>Faster registration for future courses</li>
                      </ul>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Waiver Upload */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <FileText className="mr-2 h-5 w-5" />
                Digital Waiver Required
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <p className="text-sm text-muted-foreground">
                  Please upload your signed waiver document. Accepted formats: PDF, JPG, PNG (Max 5MB)
                </p>
                
                <div className="border-2 border-dashed border-border rounded-lg p-8 text-center">
                  {waiverUrl ? (
                    <div className="space-y-4">
                      <div className="text-success">
                        <FileText className="mx-auto h-12 w-12 mb-2" />
                        <p className="font-medium">Waiver uploaded successfully!</p>
                        <p className="text-sm text-muted-foreground">Your waiver has been securely stored.</p>
                      </div>
                      <Button 
                        type="button" 
                        variant="outline" 
                        onClick={() => setWaiverUrl('')}
                        data-testid="button-upload-different-waiver"
                      >
                        Upload Different Waiver
                      </Button>
                    </div>
                  ) : (
                    <div>
                      <Upload className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
                      <ObjectUploader
                        maxNumberOfFiles={1}
                        maxFileSize={5242880} // 5MB
                        onGetUploadParameters={handleGetUploadParameters}
                        onComplete={handleUploadComplete}
                        buttonClassName="bg-accent text-accent-foreground hover:bg-accent/90"
                      >
                        <Upload className="mr-2 h-4 w-4" />
                        Choose Waiver File
                      </ObjectUploader>
                      <p className="text-xs text-muted-foreground mt-2">
                        PDF, JPG, PNG up to 5MB
                      </p>
                    </div>
                  )}
                </div>

                <div className="flex items-center space-x-2 text-sm text-success">
                  <FileText className="h-4 w-4" />
                  <span>256-bit SSL encryption - Your documents are secure</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Terms and Conditions */}
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-start space-x-3">
                <Checkbox
                  id="terms"
                  checked={formData.agreeToTerms}
                  onCheckedChange={(checked) => 
                    setFormData(prev => ({ ...prev, agreeToTerms: checked === true }))
                  }
                  data-testid="checkbox-agree-terms"
                />
                <label htmlFor="terms" className="text-sm text-muted-foreground leading-relaxed">
                  I agree to the{' '}
                  <a href="#" className="text-accent hover:text-accent/80 transition-colors">
                    Terms of Service
                  </a>{' '}
                  and{' '}
                  <a href="#" className="text-accent hover:text-accent/80 transition-colors">
                    Privacy Policy
                  </a>
                  . I understand the risks associated with firearms training and accept full responsibility for my participation.
                </label>
              </div>
            </CardContent>
          </Card>

          {/* Submit Button */}
          <Card>
            <CardContent className="pt-6">
              <Button
                type="submit"
                size="lg"
                className="w-full bg-secondary text-secondary-foreground hover:bg-secondary/90"
                disabled={enrollMutation.isPending || !selectedSchedule || !waiverUrl || !formData.agreeToTerms}
                data-testid="button-proceed-payment"
              >
                {enrollMutation.isPending ? (
                  <>
                    <div className="animate-spin w-4 h-4 border-2 border-transparent border-t-current rounded-full mr-2" />
                    Processing...
                  </>
                ) : (
                  <>
                    <DollarSign className="mr-2 h-4 w-4" />
                    Proceed to Payment - ${course.price}
                  </>
                )}
              </Button>
              
              {selectedSchedule && (
                <p className="text-center text-sm text-muted-foreground mt-4">
                  You will be charged ${course.price} for the course on {new Date(selectedSchedule.startDate).toLocaleDateString()}
                </p>
              )}
            </CardContent>
          </Card>
        </form>
      </div>
    </Layout>
  );
}
