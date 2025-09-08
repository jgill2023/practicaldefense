import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Clock, Calendar, Users } from "lucide-react";
import type { CourseWithSchedules } from "@shared/schema";

interface CourseCardProps {
  course: CourseWithSchedules;
  onRegister: (course: CourseWithSchedules) => void;
}

export function CourseCard({ course, onRegister }: CourseCardProps) {
  // Find the next available schedule
  const nextSchedule = course.schedules
    .filter(schedule => new Date(schedule.startDate) > new Date())
    .sort((a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime())[0];

  const getCategoryColor = (category: string) => {
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

  const getImageUrl = (category: string) => {
    switch (category.toLowerCase()) {
      case 'concealed':
        return 'https://images.unsplash.com/photo-1593784991095-a205069470b6?ixlib=rb-4.0.3&auto=format&fit=crop&w=400&h=200';
      case 'advanced':
        return 'https://images.unsplash.com/photo-1578662996442-48f60103fc96?ixlib=rb-4.0.3&auto=format&fit=crop&w=400&h=200';
      default:
        return 'https://images.unsplash.com/photo-1544551763-46a013bb70d5?ixlib=rb-4.0.3&auto=format&fit=crop&w=400&h=200';
    }
  };

  return (
    <Card className="overflow-hidden border border-border hover:shadow-xl transition-shadow" data-testid={`course-card-${course.id}`}>
      <img 
        src={course.imageUrl || getImageUrl(course.category)} 
        alt={course.title}
        className="w-full h-48 object-cover"
      />
      <CardContent className="p-6">
        <div className="flex items-center justify-between mb-4">
          <Badge className={getCategoryColor(course.category)} data-testid={`badge-category-${course.id}`}>
            {course.category}
          </Badge>
          <span className="text-2xl font-bold text-primary" data-testid={`text-price-${course.id}`}>
            ${course.price}
          </span>
        </div>
        
        <h3 className="text-xl font-semibold text-card-foreground mb-3" data-testid={`text-title-${course.id}`}>
          {course.title}
        </h3>
        
        <p className="text-muted-foreground mb-4 line-clamp-3" data-testid={`text-description-${course.id}`}>
          {course.description}
        </p>
        
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
                  Next: {new Date(nextSchedule.startDate).toLocaleDateString()}
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
          className="w-full bg-secondary text-secondary-foreground hover:bg-secondary/90"
          onClick={() => onRegister(course)}
          disabled={!nextSchedule}
          data-testid={`button-register-${course.id}`}
        >
          {nextSchedule ? 'Register Now' : 'No Schedules Available'}
        </Button>
      </CardContent>
    </Card>
  );
}
