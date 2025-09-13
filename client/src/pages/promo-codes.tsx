import { useState, useEffect } from "react";
import { useParams } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { Layout } from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Plus, Edit, Trash2, ArrowLeft } from "lucide-react";
import { Link } from "wouter";
import type { PromoCode, CourseWithSchedules } from "@shared/schema";

const promoCodeSchema = z.object({
  code: z.preprocess(
    (val) => typeof val === 'string' ? val.toUpperCase().trim() : val,
    z.string().min(1, "Code is required").max(50, "Code too long").regex(/^[A-Z0-9_-]+$/, "Code must be uppercase letters, numbers, dashes, or underscores only")
  ),
  description: z.string().min(1, "Description is required"),
  type: z.enum(["PERCENT", "FIXED_AMOUNT"]),
  value: z.string().min(1, "Value is required"),
  scopeCourseIds: z.array(z.string()).optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  maxTotalUses: z.string().optional(),
  maxUsesPerUser: z.string().optional(),
  minCartSubtotal: z.string().optional(),
  status: z.enum(["ACTIVE", "SCHEDULED", "PAUSED", "EXPIRED"]).default("ACTIVE"),
});

type PromoCodeFormData = z.infer<typeof promoCodeSchema>;

export default function PromoCodesPage() {
  const { courseId } = useParams<{ courseId?: string }>();
  const { user, isAuthenticated } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingPromoCode, setEditingPromoCode] = useState<PromoCode | null>(null);

  // Fetch course details (only when viewing a specific course)
  const { data: course } = useQuery<CourseWithSchedules>({
    queryKey: ["/api/instructor/courses", courseId],
    enabled: isAuthenticated && !!courseId,
    retry: false,
  });

  // Fetch all courses (for general view and course selection)
  const { data: allCourses = [] } = useQuery<CourseWithSchedules[]>({
    queryKey: ["/api/instructor/courses"],
    enabled: isAuthenticated,
    retry: false,
  });

  // Fetch promo codes (course-specific or all)
  const { data: promoCodes = [], isLoading } = useQuery<PromoCode[]>({
    queryKey: courseId ? ["/api/instructor/coupons", courseId] : ["/api/instructor/coupons"],
    enabled: isAuthenticated,
    retry: false,
  });

  const form = useForm<PromoCodeFormData>({
    resolver: zodResolver(promoCodeSchema),
    defaultValues: {
      code: "",
      description: "",
      type: "PERCENT",
      value: "",
      scopeCourseIds: courseId ? [courseId] : [],
      status: "ACTIVE",
    },
  });

  useEffect(() => {
    if (editingPromoCode) {
      form.reset({
        code: editingPromoCode.code.toUpperCase(),
        description: editingPromoCode.description || "",
        type: editingPromoCode.type as "PERCENT" | "FIXED_AMOUNT",
        value: editingPromoCode.value,
        scopeCourseIds: editingPromoCode.scopeCourseIds || (courseId ? [courseId] : []),
        startDate: editingPromoCode.startDate ? new Date(editingPromoCode.startDate).toISOString().split('T')[0] : "",
        endDate: editingPromoCode.endDate ? new Date(editingPromoCode.endDate).toISOString().split('T')[0] : "",
        maxTotalUses: editingPromoCode.maxTotalUses?.toString() || "",
        maxUsesPerUser: editingPromoCode.maxUsesPerUser?.toString() || "",
        minCartSubtotal: editingPromoCode.minCartSubtotal || "",
        status: editingPromoCode.status as "ACTIVE" | "SCHEDULED" | "PAUSED" | "EXPIRED",
      });
    } else {
      form.reset({
        code: "",
        description: "",
        type: "PERCENT",
        value: "",
        scopeCourseIds: courseId ? [courseId] : [],
        status: "ACTIVE",
      });
    }
  }, [editingPromoCode, form]);

  const createPromoCodeMutation = useMutation({
    mutationFn: async (data: PromoCodeFormData) => {
      const payload = {
        ...data,
        code: data.code.toUpperCase().trim(), // Transform to uppercase
        name: data.description, // Map description to name field required by schema
        scopeCourseIds: courseId ? [courseId] : data.scopeCourseIds || [],
        scopeType: courseId ? 'COURSES' : (data.scopeCourseIds && data.scopeCourseIds.length > 0 ? 'COURSES' : 'GLOBAL'),
        value: parseFloat(data.value),
        startDate: data.startDate || null,
        endDate: data.endDate || null,
        maxTotalUses: data.maxTotalUses ? parseInt(data.maxTotalUses) : null,
        maxUsesPerUser: data.maxUsesPerUser ? parseInt(data.maxUsesPerUser) : null,
        minCartSubtotal: data.minCartSubtotal ? parseFloat(data.minCartSubtotal) : null,
      };
      const response = await apiRequest("POST", "/api/instructor/coupons", payload);
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Promo Code Created",
        description: "The promo code has been created successfully.",
      });
      queryClient.invalidateQueries({ queryKey: courseId ? ["/api/instructor/coupons", courseId] : ["/api/instructor/coupons"] });
      setShowCreateModal(false);
      form.reset();
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create promo code.",
        variant: "destructive",
      });
    },
  });

  const updatePromoCodeMutation = useMutation({
    mutationFn: async (data: PromoCodeFormData) => {
      if (!editingPromoCode) return;
      const payload = {
        ...data,
        code: data.code.toUpperCase().trim(), // Transform to uppercase
        name: data.description, // Map description to name field required by schema
        scopeType: courseId ? 'COURSES' : (data.scopeCourseIds && data.scopeCourseIds.length > 0 ? 'COURSES' : 'GLOBAL'),
        value: parseFloat(data.value),
        startDate: data.startDate || null,
        endDate: data.endDate || null,
        maxTotalUses: data.maxTotalUses ? parseInt(data.maxTotalUses) : null,
        maxUsesPerUser: data.maxUsesPerUser ? parseInt(data.maxUsesPerUser) : null,
        minCartSubtotal: data.minCartSubtotal ? parseFloat(data.minCartSubtotal) : null,
      };
      const response = await apiRequest("PUT", `/api/instructor/coupons/${editingPromoCode.id}`, payload);
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Promo Code Updated",
        description: "The promo code has been updated successfully.",
      });
      queryClient.invalidateQueries({ queryKey: courseId ? ["/api/instructor/coupons", courseId] : ["/api/instructor/coupons"] });
      setEditingPromoCode(null);
      form.reset();
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update promo code.",
        variant: "destructive",
      });
    },
  });

  const deletePromoCodeMutation = useMutation({
    mutationFn: async (promoCodeId: string) => {
      const response = await apiRequest("DELETE", `/api/instructor/coupons/${promoCodeId}`);
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Promo Code Deleted",
        description: "The promo code has been deleted successfully.",
      });
      queryClient.invalidateQueries({ queryKey: courseId ? ["/api/instructor/coupons", courseId] : ["/api/instructor/coupons"] });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to delete promo code.",
        variant: "destructive",
      });
    },
  });

  const handleSubmit = (data: PromoCodeFormData) => {
    if (editingPromoCode) {
      updatePromoCodeMutation.mutate(data);
    } else {
      createPromoCodeMutation.mutate(data);
    }
  };

  if (!isAuthenticated) {
    return <div>Please log in to access this page.</div>;
  }

  return (
    <Layout>
      <div className="container mx-auto py-8 max-w-6xl">
        <div className="flex items-center gap-4 mb-6">
          <Link href={courseId ? "/course-management" : "/instructor-dashboard"}>
            <Button variant="ghost" size="sm" data-testid="button-back-to-courses">
              <ArrowLeft className="h-4 w-4 mr-2" />
              {courseId ? "Back to Courses" : "Back to Dashboard"}
            </Button>
          </Link>
          <div>
            <h1 className="text-3xl font-bold">Promo Codes</h1>
            <p className="text-muted-foreground">
              {courseId ? 
                (course ? `Managing promo codes for "${course.title}"` : "Loading course...") : 
                "Managing all promo codes"
              }
            </p>
          </div>
        </div>

        <div className="flex justify-between items-center mb-6">
          <div className="text-sm text-muted-foreground">
            {promoCodes.length} promo code{promoCodes.length !== 1 ? 's' : ''}
          </div>
          <Dialog open={showCreateModal || !!editingPromoCode} onOpenChange={(open) => {
            if (!open) {
              setShowCreateModal(false);
              setEditingPromoCode(null);
            }
          }}>
            <DialogTrigger asChild>
              <Button onClick={() => setShowCreateModal(true)} data-testid="button-create-promo-code">
                <Plus className="h-4 w-4 mr-2" />
                Create Promo Code
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>
                  {editingPromoCode ? "Edit Promo Code" : "Create New Promo Code"}
                </DialogTitle>
                <DialogDescription>
                  {editingPromoCode ? "Update the promo code details below." : 
                   courseId ? "Create a new promo code for this course." : "Create a new promo code for selected courses."}
                </DialogDescription>
              </DialogHeader>
              <Form {...form}>
                <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="code"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Code</FormLabel>
                          <FormControl>
                            <Input 
                              placeholder="SAVE20" 
                              {...field}
                              onChange={(e) => field.onChange(e.target.value.toUpperCase())}
                              data-testid="input-promo-code" 
                            />
                          </FormControl>
                          <p className="text-xs text-muted-foreground">Use uppercase letters, numbers, dashes, or underscores only</p>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="status"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Status</FormLabel>
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl>
                              <SelectTrigger data-testid="select-promo-status">
                                <SelectValue placeholder="Select status" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="ACTIVE">Active</SelectItem>
                              <SelectItem value="SCHEDULED">Scheduled</SelectItem>
                              <SelectItem value="PAUSED">Paused</SelectItem>
                              <SelectItem value="EXPIRED">Expired</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  <FormField
                    control={form.control}
                    name="description"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Description</FormLabel>
                        <FormControl>
                          <Input placeholder={courseId ? "Save 20% on this course" : "Save 20% on selected courses"} {...field} data-testid="input-promo-description" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  {!courseId && (
                    <FormField
                      control={form.control}
                      name="scopeCourseIds"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Apply to Courses (optional)</FormLabel>
                          <FormControl>
                            <Select
                              onValueChange={(value) => {
                                const currentValues = field.value || [];
                                const newValues = currentValues.includes(value)
                                  ? currentValues.filter(id => id !== value)
                                  : [...currentValues, value];
                                field.onChange(newValues);
                              }}
                              value=""
                            >
                              <SelectTrigger data-testid="select-course-scope">
                                <SelectValue placeholder={`${(field.value || []).length} course(s) selected`} />
                              </SelectTrigger>
                              <SelectContent>
                                {allCourses.map((course) => (
                                  <SelectItem key={course.id} value={course.id}>
                                    {(field.value || []).includes(course.id) ? "✓ " : ""}{course.title}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </FormControl>
                          <FormMessage />
                          <p className="text-sm text-muted-foreground">
                            Leave empty to create a global promo code that applies to all courses
                          </p>
                        </FormItem>
                      )}
                    />
                  )}
                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="type"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Discount Type</FormLabel>
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl>
                              <SelectTrigger data-testid="select-promo-type">
                                <SelectValue placeholder="Select type" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="PERCENT">Percentage</SelectItem>
                              <SelectItem value="FIXED_AMOUNT">Fixed Amount</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="value"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Value</FormLabel>
                          <FormControl>
                            <Input placeholder="20" {...field} data-testid="input-promo-value" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="startDate"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Start Date (optional)</FormLabel>
                          <FormControl>
                            <Input type="date" {...field} data-testid="input-promo-start-date" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="endDate"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>End Date (optional)</FormLabel>
                          <FormControl>
                            <Input type="date" {...field} data-testid="input-promo-end-date" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  <div className="grid grid-cols-3 gap-4">
                    <FormField
                      control={form.control}
                      name="maxTotalUses"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Max Total Uses</FormLabel>
                          <FormControl>
                            <Input type="number" placeholder="100" {...field} data-testid="input-promo-max-total" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="maxUsesPerUser"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Max Uses Per User</FormLabel>
                          <FormControl>
                            <Input type="number" placeholder="1" {...field} data-testid="input-promo-max-per-user" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="minCartSubtotal"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Min Order Amount</FormLabel>
                          <FormControl>
                            <Input placeholder="50.00" {...field} data-testid="input-promo-min-amount" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  <div className="flex justify-end gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => {
                        setShowCreateModal(false);
                        setEditingPromoCode(null);
                      }}
                      data-testid="button-cancel-promo"
                    >
                      Cancel
                    </Button>
                    <Button
                      type="submit"
                      disabled={createPromoCodeMutation.isPending || updatePromoCodeMutation.isPending}
                      data-testid="button-save-promo"
                    >
                      {editingPromoCode ? "Update" : "Create"} Promo Code
                    </Button>
                  </div>
                </form>
              </Form>
            </DialogContent>
          </Dialog>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Promo Codes</CardTitle>
            <CardDescription>
              {courseId ? "Manage promo codes for this course" : "Manage all promo codes across courses"}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="text-center py-8">Loading promo codes...</div>
            ) : promoCodes.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                No promo codes found. Create your first promo code to get started.
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Code</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Value</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Uses</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {promoCodes.map((promoCode) => (
                    <TableRow key={promoCode.id}>
                      <TableCell className="font-mono font-semibold" data-testid={`promo-code-${promoCode.code}`}>
                        {promoCode.code}
                      </TableCell>
                      <TableCell data-testid={`promo-description-${promoCode.code}`}>
                        {promoCode.description || "-"}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">
                          {promoCode.type === "PERCENT" ? "%" : "$"}
                        </Badge>
                      </TableCell>
                      <TableCell data-testid={`promo-value-${promoCode.code}`}>
                        {promoCode.type === "PERCENT" ? `${promoCode.value}%` : `$${promoCode.value}`}
                      </TableCell>
                      <TableCell>
                        <Badge variant={promoCode.status === "ACTIVE" ? "default" : "secondary"}>
                          {promoCode.status}
                        </Badge>
                      </TableCell>
                      <TableCell data-testid={`promo-uses-${promoCode.code}`}>
                        {promoCode.currentUseCount || 0}
                        {promoCode.maxTotalUses ? ` / ${promoCode.maxTotalUses}` : ""}
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setEditingPromoCode(promoCode)}
                            data-testid={`button-edit-promo-${promoCode.code}`}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="text-red-600 hover:text-red-700"
                                data-testid={`button-delete-promo-${promoCode.code}`}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Delete Promo Code</AlertDialogTitle>
                                <AlertDialogDescription>
                                  Are you sure you want to delete the promo code "{promoCode.code}"? This action cannot be undone.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction
                                  onClick={() => deletePromoCodeMutation.mutate(promoCode.id)}
                                  className="bg-red-600 hover:bg-red-700"
                                  data-testid={`button-confirm-delete-promo-${promoCode.code}`}
                                >
                                  Delete
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}