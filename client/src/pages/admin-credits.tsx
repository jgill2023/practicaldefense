import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { MessageSquare, Mail, Plus, ShieldCheck } from "lucide-react";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { DashboardLayout } from "@/components/DashboardLayout";
import { useAuth } from "@/hooks/useAuth";

interface Instructor {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  smsCredits: number;
  emailCredits: number;
}

const grantCreditsSchema = z.object({
  smsCredits: z.coerce.number().int().min(0).default(0),
  emailCredits: z.coerce.number().int().min(0).default(0),
  description: z.string().optional(),
}).refine(data => data.smsCredits > 0 || data.emailCredits > 0, {
  message: "At least one credit type must be greater than zero",
  path: ["smsCredits"],
});

type GrantCreditsForm = z.infer<typeof grantCreditsSchema>;

export default function AdminCreditsPage() {
  const { toast } = useToast();
  const { user } = useAuth();
  const [isGrantDialogOpen, setIsGrantDialogOpen] = useState(false);

  const { data: instructors, isLoading } = useQuery<Instructor[]>({
    queryKey: ['/api/admin/credits/instructors'],
  });

  // Get the current user's instructor record, fallback to first instructor
  const mainInstructor = user
    ? instructors?.find(instructor => instructor.id === user.id) || instructors?.[0]
    : instructors?.[0];

  const form = useForm<GrantCreditsForm>({
    resolver: zodResolver(grantCreditsSchema),
    defaultValues: {
      smsCredits: 0,
      emailCredits: 0,
      description: "",
    },
  });

  const grantCreditsMutation = useMutation({
    mutationFn: async (data: GrantCreditsForm & { instructorId: string }) => {
      return apiRequest('POST', '/api/admin/credits/grant', data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/credits/instructors'] });
      toast({
        title: "Credits Added",
        description: "Credits have been successfully added to your account.",
      });
      setIsGrantDialogOpen(false);
      form.reset();
    },
    onError: (error: any) => {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message || "Failed to add credits",
      });
    },
  });

  const handleGrantCredits = (data: GrantCreditsForm) => {
    if (!mainInstructor) return;
    
    grantCreditsMutation.mutate({
      instructorId: mainInstructor.id,
      ...data,
    });
  };

  const openGrantDialog = () => {
    form.reset({
      smsCredits: 0,
      emailCredits: 0,
      description: "Admin credit grant",
    });
    setIsGrantDialogOpen(true);
  };

  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="max-w-4xl mx-auto p-6">
          <div className="animate-pulse space-y-4">
            <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-1/4"></div>
            <div className="h-64 bg-gray-200 dark:bg-gray-700 rounded"></div>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="max-w-4xl mx-auto p-6">
      <div className="mb-6">
        <div className="flex items-center gap-2 mb-2">
          <ShieldCheck className="h-8 w-8 text-primary" />
          <h1 className="text-3xl font-bold tracking-tight">Credit Management</h1>
        </div>
        <p className="text-muted-foreground">
          View and manage messaging credits for your application.
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2 mb-6">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2">
              <MessageSquare className="h-5 w-5 text-blue-600" />
              SMS Credits
            </CardTitle>
            <CardDescription>Text message credits remaining</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-4xl font-bold" data-testid="text-sms-credits">
              {mainInstructor?.smsCredits?.toLocaleString() || 0}
            </div>
            <p className="text-sm text-muted-foreground mt-2">
              {mainInstructor?.smsCredits && mainInstructor.smsCredits <= 10 
                ? "⚠️ Low credits - consider adding more" 
                : "Credits available for SMS notifications"}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2">
              <Mail className="h-5 w-5 text-green-600" />
              Email Credits
            </CardTitle>
            <CardDescription>Email message credits remaining</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-4xl font-bold" data-testid="text-email-credits">
              {mainInstructor?.emailCredits?.toLocaleString() || 0}
            </div>
            <p className="text-sm text-muted-foreground mt-2">
              {mainInstructor?.emailCredits && mainInstructor.emailCredits <= 50 
                ? "⚠️ Low credits - consider adding more" 
                : "Credits available for email notifications"}
            </p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Add Credits</CardTitle>
          <CardDescription>
            Grant additional messaging credits to your application
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button 
            onClick={openGrantDialog}
            data-testid="button-add-credits"
          >
            <Plus className="h-4 w-4 mr-2" />
            Add Credits
          </Button>
        </CardContent>
      </Card>

      <Dialog open={isGrantDialogOpen} onOpenChange={setIsGrantDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Credits</DialogTitle>
            <DialogDescription>
              Add free credits to your application account
            </DialogDescription>
          </DialogHeader>
          
          <Form {...form}>
            <form onSubmit={form.handleSubmit(handleGrantCredits)} className="space-y-4">
              <FormField
                control={form.control}
                name="smsCredits"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>SMS Credits</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        min="0"
                        placeholder="0"
                        {...field}
                        onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                        data-testid="input-sms-credits"
                      />
                    </FormControl>
                    <FormDescription>
                      Number of SMS message credits to add
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="emailCredits"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email Credits</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        min="0"
                        placeholder="0"
                        {...field}
                        onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                        data-testid="input-email-credits"
                      />
                    </FormControl>
                    <FormDescription>
                      Number of email message credits to add
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Description (Optional)</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Reason for adding credits..."
                        {...field}
                        data-testid="input-description"
                      />
                    </FormControl>
                    <FormDescription>
                      Optional note for the audit trail
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="flex justify-end gap-2 pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsGrantDialogOpen(false)}
                  disabled={grantCreditsMutation.isPending}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={grantCreditsMutation.isPending}
                  data-testid="button-submit-grant"
                >
                  {grantCreditsMutation.isPending ? "Adding..." : "Add Credits"}
                </Button>
              </div>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
      </div>
    </DashboardLayout>
  );
}
