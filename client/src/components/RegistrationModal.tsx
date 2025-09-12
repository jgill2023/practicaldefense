import { useState } from "react";
import { useLocation } from "wouter";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { Calendar, Clock, Users, DollarSign, X } from "lucide-react";
import type { CourseWithSchedules } from "@shared/schema";
import { formatDateSafe } from "@/lib/dateUtils";

interface RegistrationModalProps {
  course: CourseWithSchedules;
  onClose: () => void;
}

export function RegistrationModal({ course, onClose }: RegistrationModalProps) {
  const { isAuthenticated } = useAuth();
  const { toast } = useToast();
  const [, setLocation] = useLocation();

  // Find the next available schedule
  const nextSchedule = course.schedules
    .filter(schedule => !schedule.deletedAt && new Date(schedule.startDate) > new Date())
    .sort((a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime())[0];

  const handleRegister = () => {
    // Navigate directly to registration page (no authentication required)
    setLocation(`/course-registration/${course.id}`);
    onClose();
  };

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto" data-testid="modal-registration">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle className="text-2xl font-bold text-card-foreground">
              Course Registration
            </DialogTitle>
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={onClose}
              data-testid="button-close-modal"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </DialogHeader>
        
        <div className="space-y-6">
          {/* Course Summary */}
          <div className="bg-muted p-4 rounded-lg">
            <h4 className="font-semibold text-card-foreground mb-2" data-testid="text-modal-course-title">
              {course.title}
            </h4>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-muted-foreground">Category:</span>
                <Badge className="ml-2" data-testid="badge-modal-category">
                  {typeof course.category === 'string' ? course.category : 
                   (course.category && typeof course.category === 'object' && 'name' in course.category) 
                     ? (course.category as any).name || 'General' 
                     : 'General'}
                </Badge>
              </div>
              <div>
                <span className="text-muted-foreground">Duration:</span>
                <span className="ml-2 font-medium" data-testid="text-modal-duration">{course.duration}</span>
              </div>
              <div>
                <span className="text-muted-foreground">Price:</span>
                <span className="ml-2 font-medium text-primary" data-testid="text-modal-price">${course.price}</span>
              </div>
              <div>
                <span className="text-muted-foreground">Instructor:</span>
                <span className="ml-2 font-medium" data-testid="text-modal-instructor">
                  {course.instructor.firstName} {course.instructor.lastName}
                </span>
              </div>
            </div>
          </div>

          {/* Course Description */}
          <div>
            <h5 className="font-semibold text-card-foreground mb-2">Course Description</h5>
            <div 
              className="text-muted-foreground" 
              data-testid="text-modal-description"
              dangerouslySetInnerHTML={{ __html: course.description }}
            />
          </div>

          {/* Next Schedule Info */}
          {nextSchedule ? (
            <div className="bg-accent/10 p-4 rounded-lg border border-accent/20">
              <h5 className="font-semibold text-accent mb-3">Next Available Class</h5>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div className="flex items-center">
                  <Calendar className="mr-2 h-4 w-4 text-accent" />
                  <div>
                    <div className="font-medium" data-testid="text-modal-start-date">
                      {formatDateSafe(nextSchedule.startDate)}
                    </div>
                    <div className="text-muted-foreground text-xs">Start Date</div>
                  </div>
                </div>
                <div className="flex items-center">
                  <Clock className="mr-2 h-4 w-4 text-accent" />
                  <div>
                    <div className="font-medium">
                      {new Date(nextSchedule.startDate).toLocaleTimeString([], { 
                        hour: '2-digit', 
                        minute: '2-digit' 
                      })}
                    </div>
                    <div className="text-muted-foreground text-xs">Start Time</div>
                  </div>
                </div>
                <div className="flex items-center">
                  <Users className="mr-2 h-4 w-4 text-accent" />
                  <div>
                    <div className="font-medium text-accent" data-testid="text-modal-spots">
                      {nextSchedule.availableSpots} spots left
                    </div>
                    <div className="text-muted-foreground text-xs">Available</div>
                  </div>
                </div>
                {nextSchedule.location && (
                  <div className="flex items-center">
                    <span className="mr-2">📍</span>
                    <div>
                      <div className="font-medium" data-testid="text-modal-location">
                        {nextSchedule.location}
                      </div>
                      <div className="text-muted-foreground text-xs">Location</div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="bg-muted p-4 rounded-lg text-center">
              <Calendar className="mx-auto h-8 w-8 text-muted-foreground mb-2" />
              <h5 className="font-semibold text-muted-foreground mb-1">No Upcoming Schedules</h5>
              <p className="text-sm text-muted-foreground">Check back later for new class dates</p>
            </div>
          )}

          {/* Registration Process Info */}
          <div className="space-y-3">
            <h5 className="font-semibold text-card-foreground">Registration Process</h5>
            <div className="space-y-2 text-sm text-muted-foreground">
              <div className="flex items-center">
                <div className="w-2 h-2 bg-accent rounded-full mr-3"></div>
                Complete registration form with personal information
              </div>
              <div className="flex items-center">
                <div className="w-2 h-2 bg-accent rounded-full mr-3"></div>
                Secure payment processing via Stripe
              </div>
              <div className="flex items-center">
                <div className="w-2 h-2 bg-accent rounded-full mr-3"></div>
                Instant confirmation and access to student portal
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-4 pt-4 border-t">
            <Button 
              variant="outline" 
              onClick={onClose}
              className="flex-1"
              data-testid="button-modal-cancel"
            >
              Cancel
            </Button>
            <Button
              onClick={handleRegister}
              disabled={!nextSchedule}
              className="flex-1 bg-secondary text-secondary-foreground hover:bg-secondary/90"
              data-testid="button-modal-proceed"
            >
              <DollarSign className="mr-2 h-4 w-4" />
              {nextSchedule ? `Proceed to Registration - $${course.price}` : 'No Schedules Available'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
