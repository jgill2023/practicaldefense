import { Layout } from "@/components/Layout";
import { useQuery } from "@tanstack/react-query";
import { useParams, Link } from "wouter";
import type { CourseWithSchedules } from "@shared/schema";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { 
  Calendar, 
  Clock, 
  MapPin, 
  DollarSign, 
  Users, 
  Target, 
  BookOpen, 
  ArrowLeft,
  AlertCircle
} from "lucide-react";
import { format } from "date-fns";

function formatDateSafe(dateString: string | Date): string {
  try {
    const date = new Date(dateString);
    if (isNaN(date.getTime())) {
      return "Date TBD";
    }
    return format(date, "EEEE, MMMM d, yyyy");
  } catch {
    return "Date TBD";
  }
}

function formatTime(timeStr: string): string {
  if (!timeStr) return "";
  try {
    const [hours, minutes] = timeStr.split(":");
    const hour = parseInt(hours);
    const ampm = hour >= 12 ? "PM" : "AM";
    const hour12 = hour % 12 || 12;
    return `${hour12}:${minutes} ${ampm}`;
  } catch {
    return timeStr;
  }
}

function getDefaultImageUrl(category: string): string {
  const categoryLower = category?.toLowerCase() || "";
  if (categoryLower.includes("ccw") || categoryLower.includes("concealed")) {
    return "https://images.unsplash.com/photo-1584515933487-779824d29309?w=800&auto=format&fit=crop&q=80";
  }
  if (categoryLower.includes("pistol") || categoryLower.includes("handgun")) {
    return "https://images.unsplash.com/photo-1595590424283-b8f17842773f?w=800&auto=format&fit=crop&q=80";
  }
  if (categoryLower.includes("rifle")) {
    return "https://images.unsplash.com/photo-1595590424283-b8f17842773f?w=800&auto=format&fit=crop&q=80";
  }
  return "https://images.unsplash.com/photo-1584515933487-779824d29309?w=800&auto=format&fit=crop&q=80";
}

export default function CourseDetail() {
  const { id } = useParams<{ id: string }>();

  const { data: course, isLoading, error } = useQuery<CourseWithSchedules>({
    queryKey: [`/api/courses/${id}`],
    enabled: !!id,
  });

  if (isLoading) {
    return (
      <Layout>
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <Skeleton className="h-8 w-32 mb-6" />
          <div className="grid lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2 space-y-6">
              <Skeleton className="h-64 w-full rounded-lg" />
              <Skeleton className="h-8 w-3/4" />
              <Skeleton className="h-32 w-full" />
            </div>
            <div className="space-y-4">
              <Skeleton className="h-48 w-full rounded-lg" />
              <Skeleton className="h-48 w-full rounded-lg" />
            </div>
          </div>
        </div>
      </Layout>
    );
  }

  if (error || !course) {
    return (
      <Layout>
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <Link href="/schedule-list">
            <Button variant="ghost" className="mb-6" data-testid="button-back">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Courses
            </Button>
          </Link>
          <Card>
            <CardContent className="py-12 text-center">
              <AlertCircle className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h2 className="text-xl font-semibold mb-2">Course Not Found</h2>
              <p className="text-muted-foreground">
                The course you're looking for doesn't exist or has been removed.
              </p>
              <Link href="/schedule-list">
                <Button className="mt-4" data-testid="button-view-all-courses">
                  View All Courses
                </Button>
              </Link>
            </CardContent>
          </Card>
        </div>
      </Layout>
    );
  }

  // Handle category being either a string or an object (from relation)
  const categoryName = typeof course.category === 'string' 
    ? course.category 
    : (course.category as any)?.name || 'Course';
    
  const imageUrl = course.imageUrl && course.imageUrl.trim() !== "" 
    ? course.imageUrl 
    : getDefaultImageUrl(categoryName);

  const now = new Date();
  const upcomingSchedules = course.schedules?.filter(s => new Date(s.startDate) >= now && !s.deletedAt) || [];
  upcomingSchedules.sort((a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime());

  return (
    <Layout>
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Link href="/schedule-list">
          <Button variant="ghost" className="mb-6" data-testid="button-back">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Courses
          </Button>
        </Link>

        <div className="grid lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-6">
            <div className="relative rounded-lg overflow-hidden">
              <img
                src={imageUrl}
                alt={course.title}
                className="w-full h-64 md:h-80 object-cover"
                onError={(e) => {
                  const target = e.target as HTMLImageElement;
                  target.src = getDefaultImageUrl(categoryName);
                }}
                data-testid="img-course"
              />
              <Badge className="absolute top-4 left-4 bg-primary">{categoryName}</Badge>
            </div>

            <div>
              <h1 className="text-3xl md:text-4xl font-bold text-foreground mb-4" data-testid="heading-course-title">
                {course.title}
              </h1>
              {course.briefDescription && (
                <p className="text-lg text-muted-foreground mb-4" data-testid="text-brief-description">
                  {course.briefDescription}
                </p>
              )}
            </div>

            <Card>
              <CardHeader>
                <CardTitle>Course Description</CardTitle>
              </CardHeader>
              <CardContent>
                <div 
                  className="prose dark:prose-invert max-w-none" 
                  dangerouslySetInnerHTML={{ __html: course.description }}
                  data-testid="text-course-description"
                />
              </CardContent>
            </Card>

            {course.prerequisites && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Target className="h-5 w-5" />
                    Prerequisites
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div 
                    className="prose dark:prose-invert max-w-none"
                    dangerouslySetInnerHTML={{ __html: course.prerequisites }}
                    data-testid="text-prerequisites"
                  />
                </CardContent>
              </Card>
            )}
          </div>

          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Course Details</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center gap-3">
                  <DollarSign className="h-5 w-5 text-primary" />
                  <div>
                    <p className="text-sm text-muted-foreground">Price</p>
                    <p className="font-semibold text-lg" data-testid="text-price">${parseFloat(course.price).toFixed(2)}</p>
                  </div>
                </div>
                
                <div className="flex items-center gap-3">
                  <Clock className="h-5 w-5 text-primary" />
                  <div>
                    <p className="text-sm text-muted-foreground">Duration</p>
                    <p className="font-medium" data-testid="text-duration">{course.duration}</p>
                  </div>
                </div>

                {course.classroomTime && (
                  <div className="flex items-center gap-3">
                    <BookOpen className="h-5 w-5 text-primary" />
                    <div>
                      <p className="text-sm text-muted-foreground">Classroom Time</p>
                      <p className="font-medium" data-testid="text-classroom-time">{course.classroomTime}</p>
                    </div>
                  </div>
                )}

                {course.rangeTime && (
                  <div className="flex items-center gap-3">
                    <Target className="h-5 w-5 text-primary" />
                    <div>
                      <p className="text-sm text-muted-foreground">Range Time</p>
                      <p className="font-medium" data-testid="text-range-time">{course.rangeTime}</p>
                    </div>
                  </div>
                )}

                {Number(course.rounds) > 0 && (
                  <div className="flex items-center gap-3">
                    <div className="h-5 w-5 flex items-center justify-center text-primary font-bold text-sm">•</div>
                    <div>
                      <p className="text-sm text-muted-foreground">Rounds Required</p>
                      <p className="font-medium" data-testid="text-rounds">{course.rounds} rounds</p>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Calendar className="h-5 w-5" />
                  Upcoming Sessions
                </CardTitle>
              </CardHeader>
              <CardContent>
                {upcomingSchedules.length === 0 ? (
                  <p className="text-muted-foreground text-center py-4" data-testid="text-no-sessions">
                    No upcoming sessions scheduled. Check back soon!
                  </p>
                ) : (
                  <div className="space-y-4">
                    {upcomingSchedules.map((schedule) => {
                      const enrollmentCount = schedule.enrollments?.filter((e: any) => 
                        e.status === 'confirmed' || e.status === 'pending'
                      ).length || 0;
                      const maxSpots = Number(schedule.maxSpots) || 0;
                      const availableSpots = Math.max(0, maxSpots - enrollmentCount);
                      const isFull = availableSpots === 0;

                      return (
                        <div 
                          key={schedule.id} 
                          className="border rounded-lg p-4 space-y-3"
                          data-testid={`card-schedule-${schedule.id}`}
                        >
                          <div className="flex items-start justify-between">
                            <div>
                              <p className="font-medium" data-testid={`text-schedule-date-${schedule.id}`}>
                                {formatDateSafe(schedule.startDate)}
                              </p>
                              <p className="text-sm text-muted-foreground">
                                {formatTime(schedule.startTime)} - {formatTime(schedule.endTime)}
                              </p>
                            </div>
                            <Badge variant={isFull ? "destructive" : "secondary"} className="text-center">
                              {isFull ? "Full" : `${availableSpots} spots`}
                            </Badge>
                          </div>

                          {schedule.location && (
                            <div className="flex items-center gap-2 text-sm text-muted-foreground">
                              <MapPin className="h-4 w-4" />
                              <span>{schedule.location}</span>
                            </div>
                          )}

                          <Link href={`/course-registration/${schedule.id}`}>
                            <Button 
                              className="w-full" 
                              disabled={isFull}
                              data-testid={`button-register-${schedule.id}`}
                            >
                              {isFull ? "Full - Join Waitlist" : "Register Now"}
                            </Button>
                          </Link>
                        </div>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </Layout>
  );
}
