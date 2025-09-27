import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Bell, CheckCircle } from "lucide-react";

// Form validation schema
const notificationFormSchema = z.object({
  firstName: z.string().min(1, "First name is required"),
  lastName: z.string().min(1, "Last name is required"),
  email: z.string().email("Please enter a valid email address"),
  phone: z.string().optional(),
});

type NotificationFormData = z.infer<typeof notificationFormSchema>;

interface CourseNotificationModalProps {
  isOpen: boolean;
  onClose: () => void;
  courseType: string;
  courseCategory: string;
}

export function CourseNotificationModal({
  isOpen,
  onClose,
  courseType,
  courseCategory,
}: CourseNotificationModalProps) {
  const [isSubmitted, setIsSubmitted] = useState(false);
  const { toast } = useToast();

  const form = useForm<NotificationFormData>({
    resolver: zodResolver(notificationFormSchema),
    defaultValues: {
      firstName: "",
      lastName: "",
      email: "",
      phone: "",
    },
  });

  const notificationMutation = useMutation({
    mutationFn: async (data: NotificationFormData) => {
      return apiRequest(
        "POST",
        "/api/course-notifications",
        {
          ...data,
          courseType,
          courseCategory,
        }
      );
    },
    onSuccess: () => {
      setIsSubmitted(true);
      toast({
        title: "Notification Request Submitted",
        description: "We'll notify you when this course becomes available!",
      });
    },
    onError: (error) => {
      console.error("Error submitting notification request:", error);
      toast({
        title: "Error",
        description: "Failed to submit notification request. Please try again.",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: NotificationFormData) => {
    notificationMutation.mutate(data);
  };

  const handleClose = () => {
    setIsSubmitted(false);
    form.reset();
    onClose();
  };

  if (!isOpen) return null;

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {isSubmitted ? (
              <>
                <CheckCircle className="h-5 w-5 text-green-500" />
                Request Submitted!
              </>
            ) : (
              <>
                <Bell className="h-5 w-5" />
                Get Notified About Upcoming Courses
              </>
            )}
          </DialogTitle>
          <DialogDescription>
            {isSubmitted ? (
              "Thank you! We'll email you as soon as we schedule new sessions for this course."
            ) : (
              `Enter your information below and we'll notify you when we schedule new ${courseType} sessions.`
            )}
          </DialogDescription>
        </DialogHeader>

        {isSubmitted ? (
          <div className="flex flex-col items-center space-y-4 py-4">
            <CheckCircle className="h-12 w-12 text-green-500" />
            <p className="text-center text-sm text-muted-foreground">
              You've been added to our notification list for <strong>{courseType}</strong> courses.
            </p>
            <Button onClick={handleClose} className="w-full" data-testid="button-close-success">
              Close
            </Button>
          </div>
        ) : (
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="firstName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>First Name</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="John"
                          {...field}
                          data-testid="input-firstName"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="lastName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Last Name</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="Doe"
                          {...field}
                          data-testid="input-lastName"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email Address</FormLabel>
                    <FormControl>
                      <Input
                        type="email"
                        placeholder="john.doe@example.com"
                        {...field}
                        data-testid="input-email"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="phone"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Phone Number (Optional)</FormLabel>
                    <FormControl>
                      <Input
                        type="tel"
                        placeholder="(555) 123-4567"
                        {...field}
                        data-testid="input-phone"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="flex space-x-2 pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleClose}
                  className="flex-1"
                  data-testid="button-cancel"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={notificationMutation.isPending}
                  className="flex-1"
                  data-testid="button-submit-notification"
                >
                  {notificationMutation.isPending ? "Submitting..." : "Notify Me"}
                </Button>
              </div>
            </form>
          </Form>
        )}
      </DialogContent>
    </Dialog>
  );
}