import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { MoreHorizontal, Edit, Archive, Trash2, EyeOff, Eye, Bell, Plus } from "lucide-react";
import { CourseNotificationsModal } from "@/components/CourseNotificationsModal";
import type { CourseWithSchedules } from "@shared/schema";

interface CourseManagementActionsProps {
  course: CourseWithSchedules;
  onEditCourse?: (course: CourseWithSchedules) => void;
  onCreateEvent?: (course: CourseWithSchedules) => void;
}

export function CourseManagementActions({ course, onEditCourse, onCreateEvent }: CourseManagementActionsProps) {
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showArchiveConfirm, setShowArchiveConfirm] = useState(false);
  const [isNotificationsModalOpen, setIsNotificationsModalOpen] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [, setLocation] = useLocation();

  // Archive course mutation
  const archiveCourseMutation = useMutation({
    mutationFn: async (courseId: string) => {
      return await apiRequest("PATCH", `/api/instructor/courses/${courseId}/archive`);
    },
    onSuccess: () => {
      toast({
        title: "Course Archived",
        description: "The course has been archived successfully.",
      });
      // Invalidate all course-related queries to ensure UI updates
      queryClient.invalidateQueries({ queryKey: ["/api/instructor/courses"] });
      queryClient.invalidateQueries({ queryKey: ["/api/instructor/courses-detailed"] });
      queryClient.invalidateQueries({ queryKey: ["/api/instructor/dashboard-stats"] });
      // Force refetch to ensure the archived course appears in the correct tab
      queryClient.refetchQueries({ queryKey: ["/api/instructor/courses-detailed"] });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to archive course. Please try again.",
        variant: "destructive",
      });
    },
  });

  // Delete course mutation (soft delete - moves to deleted tab)
  const deleteCourseMutation = useMutation({
    mutationFn: async (courseId: string) => {
      return await apiRequest("DELETE", `/api/instructor/courses/${courseId}`);
    },
    onSuccess: () => {
      toast({
        title: "Course Deleted",
        description: "The course has been moved to the Deleted tab.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/instructor/courses"] });
      queryClient.invalidateQueries({ queryKey: ["/api/instructor/courses-detailed"] });
      queryClient.invalidateQueries({ queryKey: ["/api/instructor/deleted-courses"] });
      queryClient.invalidateQueries({ queryKey: ["/api/instructor/dashboard-stats"] });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to delete course. Please try again.",
        variant: "destructive",
      });
    },
  });

  // Publish/Unpublish course mutation
  const publishCourseMutation = useMutation({
    mutationFn: async ({ courseId, action }: { courseId: string; action: 'publish' | 'unpublish' }) => {
      return await apiRequest("PATCH", `/api/instructor/courses/${courseId}/${action}`);
    },
    onSuccess: (data, variables) => {
      const action = variables.action === 'publish' ? 'published' : 'unpublished';
      toast({
        title: `Course ${action}`,
        description: `The course has been ${action} successfully.`,
      });
      // Invalidate all course-related queries to ensure UI updates
      queryClient.invalidateQueries({ queryKey: ["/api/instructor/courses"] });
      queryClient.invalidateQueries({ queryKey: ["/api/instructor/courses-detailed"] });
      queryClient.invalidateQueries({ queryKey: ["/api/instructor/dashboard-stats"] });
      // Force refetch to ensure the course appears in the correct tab
      queryClient.refetchQueries({ queryKey: ["/api/instructor/courses-detailed"] });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to update course status. Please try again.",
        variant: "destructive",
      });
    },
  });

  const hasEnrollments = course.schedules?.some(schedule => 
    schedule.enrollments && schedule.enrollments.length > 0
  );

  const hasSchedules = course.schedules && course.schedules.length > 0;

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="sm" data-testid={`button-manage-course-${course.id}`}>
            <MoreHorizontal className="h-4 w-4" />
            <span className="sr-only">Open course management menu</span>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-48">
          <DropdownMenuItem 
            onClick={() => onCreateEvent?.(course)}
            data-testid={`button-create-event-${course.id}`}
          >
            <Plus className="mr-2 h-4 w-4" />
            Create Event
          </DropdownMenuItem>

          <DropdownMenuSeparator />

          <DropdownMenuItem
            onClick={() => {
              if (onEditCourse) {
                onEditCourse(course);
              } else {
                setLocation('/course-edit/' + course.id);
              }
            }}
            data-testid={`button-edit-course-${course.id}`}
          >
            <Edit className="mr-2 h-4 w-4" />
            Edit Course
          </DropdownMenuItem>


          <DropdownMenuItem 
            onClick={() => publishCourseMutation.mutate({ 
              courseId: course.id, 
              action: course.status === 'published' ? 'unpublish' : 'publish' 
            })}
            data-testid={`button-toggle-publish-${course.id}`}
          >
            {course.status === 'published' ? (
              <>
                <EyeOff className="mr-2 h-4 w-4" />
                Unpublish
              </>
            ) : (
              <>
                <Eye className="mr-2 h-4 w-4" />
                Publish
              </>
            )}
          </DropdownMenuItem>

          <DropdownMenuSeparator />

          <DropdownMenuItem 
            onClick={() => setShowArchiveConfirm(true)}
            data-testid={`button-archive-course-${course.id}`}
            className="text-orange-600 focus:text-orange-600"
          >
            <Archive className="mr-2 h-4 w-4" />
            Archive Course
          </DropdownMenuItem>

          <DropdownMenuItem 
            onClick={() => setShowDeleteConfirm(true)}
            disabled={hasSchedules}
            data-testid={`button-delete-course-${course.id}`}
            className="text-red-600 focus:text-red-600 disabled:text-gray-400"
          >
            <Trash2 className="mr-2 h-4 w-4" />
            Delete Course
          </DropdownMenuItem>

          <DropdownMenuSeparator />

          <DropdownMenuItem
            onClick={() => setIsNotificationsModalOpen(true)}
            data-testid={`menuitem-notifications-${course.id}`}
          >
            <Bell className="mr-2 h-4 w-4" />
            Course Notifications
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Archive Confirmation Dialog */}
      <AlertDialog open={showArchiveConfirm} onOpenChange={setShowArchiveConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Archive Course</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to archive "{course.title}"? This will hide the course from students 
              but preserve all data and enrollments. You can reactivate it later.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel data-testid="button-cancel-archive">Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                archiveCourseMutation.mutate(course.id);
                setShowArchiveConfirm(false);
              }}
              className="bg-orange-600 hover:bg-orange-700"
              data-testid="button-confirm-archive"
            >
              Archive Course
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Course</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{course.title}"? 
              The course will be moved to the Deleted tab where you can permanently delete it or restore it later.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel data-testid="button-cancel-delete">Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                deleteCourseMutation.mutate(course.id);
                setShowDeleteConfirm(false);
              }}
              className="bg-red-600 hover:bg-red-700"
              data-testid="button-confirm-delete"
            >
              Delete Course
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Course Notifications Modal */}
      <CourseNotificationsModal
        isOpen={isNotificationsModalOpen}
        onClose={() => setIsNotificationsModalOpen(false)}
        course={course}
      />

    </>
  );
}