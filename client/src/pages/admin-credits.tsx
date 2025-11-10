import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { MessageSquare, Mail, Plus, ShieldCheck } from "lucide-react";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";

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
  const [selectedInstructor, setSelectedInstructor] = useState<Instructor | null>(null);
  const [isGrantDialogOpen, setIsGrantDialogOpen] = useState(false);

  const { data: instructors, isLoading } = useQuery<Instructor[]>({
    queryKey: ['/api/admin/credits/instructors'],
  });

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
      return apiRequest(`/api/admin/credits/grant`, {
        method: 'POST',
        body: JSON.stringify(data),
        headers: { 'Content-Type': 'application/json' },
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/credits/instructors'] });
      toast({
        title: "Credits Granted",
        description: "Credits have been successfully added to the instructor's account.",
      });
      setIsGrantDialogOpen(false);
      form.reset();
    },
    onError: (error: any) => {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message || "Failed to grant credits",
      });
    },
  });

  const handleGrantCredits = (data: GrantCreditsForm) => {
    if (!selectedInstructor) return;
    
    grantCreditsMutation.mutate({
      instructorId: selectedInstructor.id,
      ...data,
    });
  };

  const openGrantDialog = (instructor: Instructor) => {
    setSelectedInstructor(instructor);
    form.reset({
      smsCredits: 0,
      emailCredits: 0,
      description: `Admin credit grant for ${instructor.firstName} ${instructor.lastName}`,
    });
    setIsGrantDialogOpen(true);
  };

  if (isLoading) {
    return (
      <div className="max-w-7xl mx-auto p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-1/4"></div>
          <div className="h-64 bg-gray-200 dark:bg-gray-700 rounded"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto p-6">
      <div className="mb-6">
        <div className="flex items-center gap-2 mb-2">
          <ShieldCheck className="h-8 w-8 text-primary" />
          <h1 className="text-3xl font-bold tracking-tight">Admin Credit Management</h1>
        </div>
        <p className="text-muted-foreground">
          Grant free credits to instructors for SMS and Email messaging.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Instructors</CardTitle>
          <CardDescription>
            View and manage credit balances for all instructors
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Instructor</TableHead>
                <TableHead>Email</TableHead>
                <TableHead className="text-center">
                  <div className="flex items-center justify-center gap-1">
                    <MessageSquare className="h-4 w-4" />
                    SMS Credits
                  </div>
                </TableHead>
                <TableHead className="text-center">
                  <div className="flex items-center justify-center gap-1">
                    <Mail className="h-4 w-4" />
                    Email Credits
                  </div>
                </TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {instructors && instructors.length > 0 ? (
                instructors.map((instructor) => (
                  <TableRow key={instructor.id}>
                    <TableCell className="font-medium">
                      {instructor.firstName} {instructor.lastName}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {instructor.email}
                    </TableCell>
                    <TableCell className="text-center">
                      <Badge
                        variant={
                          instructor.smsCredits <= 10
                            ? "destructive"
                            : instructor.smsCredits <= 50
                            ? "outline"
                            : "default"
                        }
                      >
                        {instructor.smsCredits.toLocaleString()}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-center">
                      <Badge
                        variant={
                          instructor.emailCredits <= 50
                            ? "destructive"
                            : instructor.emailCredits <= 200
                            ? "outline"
                            : "default"
                        }
                      >
                        {instructor.emailCredits.toLocaleString()}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        size="sm"
                        onClick={() => openGrantDialog(instructor)}
                        data-testid={`button-grant-credits-${instructor.id}`}
                      >
                        <Plus className="h-4 w-4 mr-1" />
                        Grant Credits
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                    No instructors found
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={isGrantDialogOpen} onOpenChange={setIsGrantDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Grant Credits</DialogTitle>
            <DialogDescription>
              Add free credits to {selectedInstructor?.firstName} {selectedInstructor?.lastName}'s account
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
                      Number of SMS message credits to grant
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
                      Number of email message credits to grant
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
                        placeholder="Reason for granting credits..."
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
                  {grantCreditsMutation.isPending ? "Granting..." : "Grant Credits"}
                </Button>
              </div>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
