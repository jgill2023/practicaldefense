import { DashboardLayout } from "@/components/DashboardLayout";
import { useParams } from "wouter";
import { useQuery } from "@tanstack/react-query";
import type { CourseWithSchedules } from "@shared/schema";
import { EditCourseForm } from "@/components/EditCourseForm";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function CourseEditPage() {
  const { courseId } = useParams<{ courseId: string }>();

  const { data: courses, isLoading } = useQuery<CourseWithSchedules[]>({
    queryKey: ['/api/instructor/courses'],
  });

  const course = courses?.find(c => String(c.id) === courseId);

  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center py-20">
          <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
        </div>
      </DashboardLayout>
    );
  }

  if (!course) {
    return (
      <DashboardLayout>
        <div className="text-center py-20">
          <p className="text-muted-foreground">Course not found</p>
          <Button variant="ghost" onClick={() => window.history.back()} className="mt-4">
            <ArrowLeft className="h-4 w-4 mr-2" /> Back to Courses
          </Button>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="max-w-5xl mx-auto">
        <Button variant="ghost" onClick={() => window.history.back()} className="mb-4">
          <ArrowLeft className="h-4 w-4 mr-2" /> Back to Courses
        </Button>
        <EditCourseForm
          course={course}
          isOpen={true}
          onClose={() => window.history.back()}
        />
      </div>
    </DashboardLayout>
  );
}
