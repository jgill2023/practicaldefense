import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Clock, Calendar, Users, ArrowRight } from "lucide-react";
import type { CourseWithSchedules } from "@shared/schema";
import { formatDateSafe } from "@/lib/dateUtils";
import { useLocation } from "wouter";

interface CourseCardProps {
  course: CourseWithSchedules;
  onRegister: (course: CourseWithSchedules) => void;
}

export function CourseCard({ course, onRegister }: CourseCardProps) {
  const [, setLocation] = useLocation();

  // Find the next available schedule (including full ones for waitlist)
  const nextSchedule = course.schedules
    .filter(schedule => 
      !schedule.deletedAt && 
      new Date(schedule.startDate) > new Date() &&
      !schedule.notes?.includes('CANCELLED:') // Exclude cancelled schedules
    )
    .sort((a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime())[0];

  // Calculate actual available spots based on enrollments
  const enrollmentCount = nextSchedule?.enrollments?.filter((e: any) => 
    e.status === 'confirmed' || e.status === 'pending'
  ).length || 0;
  const maxSpots = nextSchedule ? Number(nextSchedule.maxSpots) || 0 : 0;
  const actualAvailableSpots = nextSchedule ? Math.max(0, maxSpots - enrollmentCount) : 0;

  // Check if schedule is full (for waitlist button)
  const isFull = nextSchedule && actualAvailableSpots === 0;

  const getCategoryColor = (category: string | null) => {
    if (!category) return 'bg-muted/10 text-muted-foreground';
    switch (category.toLowerCase()) {
      case 'basic':
        return 'bg-accent/10 text-accent';
      case 'advanced':
        return 'bg-primary/10 text-primary';
      case 'concealed':
        return 'bg-secondary/10 text-secondary';
      default:
        return 'bg-muted/10 text-muted-foreground';
    }
  };

  // Helper to get fallback image URL based on category
  const getImageUrl = (category: string | null) => {
    if (!category) return 'https://images.unsplash.com/photo-1544551763-46a013bb70d5?ixlib=rb-4.0.3&auto=format&fit=crop&w=400&h=200';

    const categoryLower = category.toLowerCase();

    // Check if category contains keywords
    if (categoryLower.includes('concealed') || categoryLower.includes('ccw') || categoryLower.includes('nm concealed')) {
      return 'https://images.unsplash.com/photo-1593784991095-a205069470b6?ixlib=rb-4.0.3&auto=format&fit=crop&w=400&h=200';
    }

    if (categoryLower.includes('defensive') || categoryLower.includes('handgun')) {
      return 'https://images.unsplash.com/photo-1578662996442-48f60103fc96?ixlib=rb-4.0.3&auto=format&fit=crop&w=400&h=200';
    }

    if (categoryLower.includes('advanced')) {
      return 'https://images.unsplash.com/photo-1578662996442-48f60103fc96?ixlib=rb-4.0.3&auto=format&fit=crop&w=400&h=200';
    }

    // Default fallback
    return 'https://images.unsplash.com/photo-1544551763-46a013bb70d5?ixlib=rb-4.0.3&auto=format&fit=crop&w=400&h=200';
  };

  // Helper to safely get category name (handles both string and object formats)
  const getCategoryName = (): string => {
    if (!course.category) return 'General';
    // If it's a string (old format), return it
    if (typeof course.category === 'string') return course.category || 'General';
    // If it's an object (new format), return the name
    if (typeof course.category === 'object' && 'name' in course.category) {
      return (course.category as any).name as string;
    }
    return 'General';
  };

  // Determine which image to display - prioritize uploaded image
  const displayImageUrl = course.imageUrl && course.imageUrl.trim() !== '' 
    ? course.imageUrl 
    : getImageUrl(getCategoryName());

  const handleCardClick = (e: React.MouseEvent) => {
    console.log('Card clicked!', { course: course.title, hasSchedule: !!nextSchedule });
    // Navigate to course detail page
    setLocation(`/course/${course.id}`);
  };

  return (
    <div className="relative group">
      {/* Background Shadow Layer */}
      <div className="absolute inset-0 bg-gradient-to-br from-[#0A5DB8] to-[#2BB0C7] rounded-lg translate-x-2 -translate-y-2 rotate-2 transition-all duration-200 group-hover:from-[#FD66C5] group-hover:to-[#FBA3F0]" />
      
      {/* Card Layer */}
      <Card 
        className="relative overflow-hidden border-2 border-[hsl(204,27%,16%,0.12)] rounded-lg transition-all duration-200 w-full cursor-pointer" 
        data-testid={`course-card-${course.id}`}
        onClick={handleCardClick}
      >
      <div className="relative w-full h-40 sm:h-48 bg-muted overflow-hidden">
        <img 
          src={displayImageUrl} 
          alt={course.title}
          className="w-full h-full object-cover transition-transform duration-300 hover:scale-105"
          loading="lazy"
          onError={(e) => {
            const target = e.target as HTMLImageElement;
            if (target.src !== getImageUrl(getCategoryName())) {
              target.src = getImageUrl(getCategoryName());
            }
          }}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-[hsl(204,27%,16%,0.4)] to-transparent" />
      </div>
      <CardContent className="p-4 sm:p-6">
        <div className="flex items-center justify-between mb-4">
          <Badge className="bg-[hsl(190,65%,47%,0.15)] text-[hsl(190,65%,40%)] font-heading uppercase tracking-wide text-xs" data-testid={`badge-category-${course.id}`}>
            {getCategoryName()}
          </Badge>
          <span className="text-2xl font-bold text-[hsl(209,90%,38%)] font-heading" data-testid={`text-price-${course.id}`}>
            ${course.price}
          </span>
        </div>

        <h3 className="font-heading text-xl uppercase tracking-wide text-card-foreground mb-3" data-testid={`text-title-${course.id}`}>
          {course.title}
        </h3>

        <div className="space-y-3 mb-6">
          <div className="flex items-center text-sm text-muted-foreground">
            <Clock className="mr-2 h-4 w-4 text-[hsl(209,90%,38%)]" />
            <span data-testid={`text-duration-${course.id}`}>{course.duration}</span>
          </div>

          {nextSchedule ? (
            <>
              <div className="flex items-center text-sm text-muted-foreground">
                <Calendar className="mr-2 h-4 w-4 text-[hsl(190,65%,47%)]" />
                <span data-testid={`text-next-date-${course.id}`}>
                  Next: {formatDateSafe(nextSchedule.startDate.toString())}
                </span>
              </div>
              <div className="flex items-center text-sm text-muted-foreground">
                <Users className="mr-2 h-4 w-4 text-[hsl(44,89%,61%)]" />
                <span data-testid={`text-spots-left-${course.id}`}>
                  {actualAvailableSpots} spots left
                </span>
              </div>
            </>
          ) : (
            <div className="flex items-center text-sm text-muted-foreground">
              <Calendar className="mr-2 h-4 w-4 text-muted-foreground" />
              <span>No upcoming schedules</span>
            </div>
          )}

          <div className="flex items-center text-sm text-muted-foreground">
            <Users className="mr-2 h-4 w-4 text-[hsl(204,27%,16%)]" />
            <span>Instructor: {course.instructor.firstName} {course.instructor.lastName}</span>
          </div>
        </div>

        <Button 
          type="button"
          size="lg" 
          className={`w-full min-h-[44px] font-heading uppercase tracking-wide ${
            isFull 
              ? "bg-transparent border-2 border-[hsl(44,89%,61%)] text-[hsl(44,89%,50%)] hover:bg-[hsl(44,89%,61%)] hover:text-[hsl(204,27%,16%)]" 
              : "bg-[hsl(209,90%,38%)] hover:bg-[hsl(209,90%,30%)] text-white"
          }`}
          onClick={(e) => {
            e.stopPropagation();
            // If course is in "Hosted Courses" category or has a destination URL, redirect externally
            const isHostedCourse = course.category === "Hosted Courses";
            if (isHostedCourse || course.destinationUrl) {
              if (course.destinationUrl) {
                window.open(course.destinationUrl, '_blank', 'noopener,noreferrer');
              }
              return;
            }
            onRegister(course);
          }}
          disabled={!nextSchedule && !(course.category === "Hosted Courses" || course.destinationUrl)}
          data-testid={`button-register-${course.id}`}
        >
          {isFull ? "JOIN WAITLIST" : "REGISTER NOW"}
          <ArrowRight className="ml-2 h-5 w-5" />
        </Button>
      </CardContent>
      </Card>
    </div>
  );
}