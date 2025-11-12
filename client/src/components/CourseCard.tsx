import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Clock, Calendar, Users, ArrowRight } from "lucide-react";
import type { CourseWithSchedules } from "@shared/schema";
import { formatDateSafe } from "@/lib/dateUtils";

interface CourseCardProps {
  course: CourseWithSchedules;
  onRegister: (course: CourseWithSchedules) => void;
}

export function CourseCard({ course, onRegister }: CourseCardProps) {

  // Find the next available schedule with available spots
  const nextSchedule = course.schedules
    .filter(schedule => 
      !schedule.deletedAt && 
      new Date(schedule.startDate) > new Date() &&
      schedule.availableSpots > 0
    )
    .sort((a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime())[0];

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
    if (!nextSchedule) return;
    onRegister(course);
  };

  return (
    <Card 
      className="overflow-hidden border border-border md:hover:shadow-xl transition-shadow w-full cursor-pointer active:shadow-2xl" 
      data-testid={`course-card-${course.id}`}
      onClick={handleCardClick}
    >
      <div className="relative w-full h-40 sm:h-48 bg-muted">
        <img 
          src={displayImageUrl} 
          alt={course.title}
          className="w-full h-full object-cover"
          loading="lazy"
          onError={(e) => {
            const target = e.target as HTMLImageElement;
            // If the uploaded image fails to load, fall back to category-based image
            if (target.src !== getImageUrl(getCategoryName())) {
              target.src = getImageUrl(getCategoryName());
            }
          }}
        />
      </div>
      <CardContent className="p-4 sm:p-6">
        <div className="flex items-center justify-between mb-4">
          <Badge className={getCategoryColor(getCategoryName())} data-testid={`badge-category-${course.id}`}>
            {getCategoryName()}
          </Badge>
          <span className="text-2xl font-bold text-primary" data-testid={`text-price-${course.id}`}>
            ${course.price}
          </span>
        </div>

        <h3 className="text-xl font-semibold text-card-foreground mb-3" data-testid={`text-title-${course.id}`}>
          {course.title}
        </h3>


        <div className="space-y-3 mb-6">
          <div className="flex items-center text-sm text-muted-foreground">
            <Clock className="mr-2 h-4 w-4 text-accent" />
            <span data-testid={`text-duration-${course.id}`}>{course.duration}</span>
          </div>

          {nextSchedule ? (
            <>
              <div className="flex items-center text-sm text-muted-foreground">
                <Calendar className="mr-2 h-4 w-4 text-accent" />
                <span data-testid={`text-next-date-${course.id}`}>
                  Next: {formatDateSafe(nextSchedule.startDate.toString())}
                </span>
              </div>
              <div className="flex items-center text-sm text-muted-foreground">
                <Users className="mr-2 h-4 w-4 text-accent" />
                <span data-testid={`text-spots-left-${course.id}`}>
                  {nextSchedule.availableSpots} spots left
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
            <Users className="mr-2 h-4 w-4 text-accent" />
            <span>Instructor: {course.instructor.firstName} {course.instructor.lastName}</span>
          </div>
        </div>

        <Button 
          type="button"
          size="lg" 
          className="w-full register-button min-h-[44px] rounded-none"
          onClick={(e) => {
            e.stopPropagation();
            onRegister(course);
          }}
          disabled={!nextSchedule}
          data-testid={`button-register-${course.id}`}
        >
          REGISTER NOW
          <ArrowRight className="ml-2 h-5 w-5" />
        </Button>
      </CardContent>
    </Card>
  );
}