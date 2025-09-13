import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Layout } from "@/components/Layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { 
  Tag, 
  Plus, 
  Edit, 
  Trash2, 
  Calendar,
  Users,
  Percent,
  DollarSign,
  ArrowLeft
} from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { Link } from "wouter";
import type { User, CouponWithUsage, InsertCoupon } from "@shared/schema";
import { insertCouponSchema } from "@shared/schema";

export default function PromoCodesPage() {
  const { isAuthenticated, user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingCoupon, setEditingCoupon] = useState<CouponWithUsage | null>(null);

  // Fetch coupons
  const { data: coupons = [], isLoading } = useQuery<any[]>({
    queryKey: ["/api/instructor/coupons"],
    enabled: isAuthenticated && (user as User)?.role === 'instructor',
  });

  // Fetch courses for dropdown
  const { data: courses = [] } = useQuery<any[]>({
    queryKey: ["/api/instructor/courses"],
    enabled: isAuthenticated && (user as User)?.role === 'instructor',
  });

  // Create coupon form
  const createForm = useForm<InsertCoupon>({
    resolver: zodResolver(insertCouponSchema),
    defaultValues: {
      code: "",
      description: "",
      discountType: "percentage",
      discountValue: 10,
      maxUsagePerUser: 1,
      maxUsageTotal: undefined,
      minimumOrderAmount: undefined,
      applicationType: "all_products_and_courses",
      applicableCourseIds: [],
      validFrom: undefined,
      validUntil: undefined,
      isActive: true,
    },
  });

  // Edit coupon form
  const editForm = useForm<InsertCoupon>({
    resolver: zodResolver(insertCouponSchema),
  });

  // Create mutation
  const createMutation = useMutation({
    mutationFn: async (data: InsertCoupon) => {
      const response = await apiRequest("POST", "/api/instructor/coupons", data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/instructor/coupons"] });
      toast({
        title: "Success",
        description: "Promo code created successfully",
      });
      setShowCreateModal(false);
      createForm.reset();
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to create promo code",
        variant: "destructive",
      });
    },
  });

  // Update mutation
  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<InsertCoupon> }) => {
      const response = await apiRequest("PUT", `/api/instructor/coupons/${id}`, data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/instructor/coupons"] });
      toast({
        title: "Success",
        description: "Promo code updated successfully",
      });
      setEditingCoupon(null);
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to update promo code",
        variant: "destructive",
      });
    },
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const response = await apiRequest("DELETE", `/api/instructor/coupons/${id}`);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/instructor/coupons"] });
      toast({
        title: "Success",
        description: "Promo code deleted successfully",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to delete promo code",
        variant: "destructive",
      });
    },
  });

  const handleCreate = (data: InsertCoupon) => {
    createMutation.mutate(data);
  };

  const handleEdit = (coupon: CouponWithUsage) => {
    setEditingCoupon(coupon);
    editForm.reset({
      code: coupon.code,
      description: coupon.description || "",
      discountType: coupon.discountType as "percentage" | "fixed",
      discountValue: parseFloat(coupon.discountValue),
      minimumOrderAmount: coupon.minimumOrderAmount ? parseFloat(coupon.minimumOrderAmount) : undefined,
      maxUsageTotal: coupon.maxUsageTotal || undefined,
      maxUsagePerUser: coupon.maxUsagePerUser,
      validFrom: coupon.validFrom ? new Date(coupon.validFrom) : undefined,
      validUntil: coupon.validUntil ? new Date(coupon.validUntil) : undefined,
      isActive: coupon.isActive,
    });
  };

  const handleUpdate = (data: InsertCoupon) => {
    if (editingCoupon) {
      updateMutation.mutate({ id: editingCoupon.id, data });
    }
  };

  const handleDelete = (id: string) => {
    if (confirm("Are you sure you want to delete this promo code?")) {
      deleteMutation.mutate(id);
    }
  };

  const formatDate = (dateStr: string | Date | null) => {
    if (!dateStr) return "N/A";
    return new Date(dateStr).toLocaleDateString();
  };

  if (!isAuthenticated || (user as User)?.role !== 'instructor') {
    return (
      <Layout>
        <div className="min-h-screen flex items-center justify-center">
          <div className="text-center">
            <h1 className="text-2xl font-bold mb-4">Access Denied</h1>
            <p className="text-muted-foreground">You need instructor access to view this page.</p>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-8">
          <div>
            <div className="flex items-center space-x-4 mb-2">
              <Link href="/course-management">
                <Button variant="ghost" size="sm" data-testid="button-back-to-course-management">
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  Back to Course Management
                </Button>
              </Link>
            </div>
            <h1 className="text-3xl font-bold text-foreground">Promo Codes Management</h1>
            <p className="text-muted-foreground mt-1">
              Create and manage discount codes for your courses
            </p>
          </div>
          <div className="mt-4 sm:mt-0">
            <Dialog open={showCreateModal} onOpenChange={setShowCreateModal}>
              <DialogTrigger asChild>
                <Button className="bg-primary text-primary-foreground hover:bg-primary/90" data-testid="button-create-promo-code">
                  <Plus className="mr-2 h-4 w-4" />
                  Create Promo Code
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl">
                <DialogHeader>
                  <DialogTitle>Create New Promo Code</DialogTitle>
                </DialogHeader>
                <Form {...createForm}>
                  <form onSubmit={createForm.handleSubmit(handleCreate)} className="space-y-6">
                    <div className="grid grid-cols-2 gap-4">
                      <FormField
                        control={createForm.control}
                        name="code"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Promo Code</FormLabel>
                            <FormControl>
                              <Input 
                                placeholder="SAVE20" 
                                {...field} 
                                data-testid="input-promo-code"
                                className="uppercase"
                                onChange={(e) => field.onChange(e.target.value.toUpperCase())}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={createForm.control}
                        name="discountType"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Discount Type</FormLabel>
                            <Select onValueChange={field.onChange} defaultValue={field.value}>
                              <FormControl>
                                <SelectTrigger data-testid="select-discount-type">
                                  <SelectValue placeholder="Select type" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                <SelectItem value="percentage">Percentage (%)</SelectItem>
                                <SelectItem value="fixed">Fixed Amount ($)</SelectItem>
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    <FormField
                      control={createForm.control}
                      name="description"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Description (Optional)</FormLabel>
                          <FormControl>
                            <Textarea 
                              placeholder="Describe what this promo code is for..." 
                              {...field} 
                              value={field.value || ""}
                              data-testid="textarea-description"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={createForm.control}
                      name="applicationType"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Applies To</FormLabel>
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl>
                              <SelectTrigger data-testid="select-application-type">
                                <SelectValue placeholder="Select what this promo code applies to" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="all_products_and_courses">All Products and Courses</SelectItem>
                              <SelectItem value="all_products">All Products</SelectItem>
                              <SelectItem value="all_courses">All Courses</SelectItem>
                              <SelectItem value="specific_items">Specific Courses</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    {createForm.watch("applicationType") === "specific_items" && (
                      <FormField
                        control={createForm.control}
                        name="applicableCourseIds"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Select Courses</FormLabel>
                            <FormControl>
                              <Select 
                                onValueChange={(value) => {
                                  const currentValues = field.value || [];
                                  if (!currentValues.includes(value)) {
                                    field.onChange([...currentValues, value]);
                                  }
                                }}
                              >
                                <SelectTrigger data-testid="select-courses">
                                  <SelectValue placeholder="Select courses this promo code applies to" />
                                </SelectTrigger>
                                <SelectContent>
                                  {courses.map((course: any) => (
                                    <SelectItem key={course.id} value={course.id}>
                                      {course.title}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </FormControl>
                            {field.value && Array.isArray(field.value) && field.value.length > 0 && (
                              <div className="flex flex-wrap gap-2 mt-2">
                                {field.value.map((courseId: string) => {
                                  const course = courses.find((c: any) => c.id === courseId);
                                  return (
                                    <div 
                                      key={courseId} 
                                      className="bg-primary/10 text-primary px-2 py-1 rounded-md text-sm flex items-center gap-1"
                                    >
                                      {course?.title}
                                      <button
                                        type="button"
                                        onClick={() => {
                                          field.onChange(field.value.filter((id: string) => id !== courseId));
                                        }}
                                        className="ml-1 text-primary/60 hover:text-primary"
                                      >
                                        ×
                                      </button>
                                    </div>
                                  );
                                })}
                              </div>
                            )}
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    )}

                    <div className="grid grid-cols-2 gap-4">
                      <FormField
                        control={createForm.control}
                        name="discountValue"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>
                              Discount Value ({createForm.watch("discountType") === "percentage" ? "%" : "$"})
                            </FormLabel>
                            <FormControl>
                              <Input 
                                type="number" 
                                step="0.01"
                                min="0"
                                {...field}
                                onChange={(e) => field.onChange(e.target.value ? parseFloat(e.target.value) : 0)}
                                data-testid="input-discount-value"
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={createForm.control}
                        name="maxUsagePerUser"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Uses Per User</FormLabel>
                            <FormControl>
                              <Input 
                                type="number" 
                                min="1"
                                {...field}
                                onChange={(e) => field.onChange(e.target.value ? parseInt(e.target.value) : 1)}
                                data-testid="input-max-usage-per-user"
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <FormField
                        control={createForm.control}
                        name="minimumOrderAmount"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Minimum Order Amount (Optional)</FormLabel>
                            <FormControl>
                              <Input 
                                type="number" 
                                step="0.01"
                                min="0"
                                placeholder="0.00"
                                value={field.value || ""}
                                onChange={(e) => field.onChange(e.target.value ? parseFloat(e.target.value) : undefined)}
                                data-testid="input-minimum-order"
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={createForm.control}
                        name="maxUsageTotal"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Total Usage Limit (Optional)</FormLabel>
                            <FormControl>
                              <Input 
                                type="number" 
                                min="1"
                                placeholder="Unlimited"
                                value={field.value || ""}
                                onChange={(e) => field.onChange(e.target.value ? parseInt(e.target.value) : undefined)}
                                data-testid="input-max-usage-total"
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <FormField
                        control={createForm.control}
                        name="validFrom"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Valid From (Optional)</FormLabel>
                            <FormControl>
                              <Input 
                                type="datetime-local"
                                value={field.value ? new Date(field.value).toISOString().slice(0, 16) : ""}
                                onChange={(e) => field.onChange(e.target.value ? new Date(e.target.value) : undefined)}
                                data-testid="input-valid-from"
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={createForm.control}
                        name="validUntil"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Valid Until (Optional)</FormLabel>
                            <FormControl>
                              <Input 
                                type="datetime-local"
                                value={field.value ? new Date(field.value).toISOString().slice(0, 16) : ""}
                                onChange={(e) => field.onChange(e.target.value ? new Date(e.target.value) : undefined)}
                                data-testid="input-valid-until"
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    <div className="flex justify-end space-x-4">
                      <Button 
                        type="button" 
                        variant="outline" 
                        onClick={() => setShowCreateModal(false)}
                        data-testid="button-cancel-create"
                      >
                        Cancel
                      </Button>
                      <Button 
                        type="submit" 
                        disabled={createMutation.isPending}
                        data-testid="button-submit-create"
                      >
                        {createMutation.isPending ? "Creating..." : "Create Promo Code"}
                      </Button>
                    </div>
                  </form>
                </Form>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        {/* Promo Codes List */}
        <div className="space-y-6">
          {isLoading ? (
            <div className="flex justify-center py-12">
              <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
            </div>
          ) : coupons.length === 0 ? (
            <Card>
              <CardContent className="text-center py-12">
                <Tag className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <h3 className="text-xl font-semibold mb-2">No Promo Codes Yet</h3>
                <p className="text-muted-foreground mb-6">
                  Create your first promo code to offer discounts to your students.
                </p>
                <Button onClick={() => setShowCreateModal(true)} data-testid="button-create-first-promo">
                  <Plus className="mr-2 h-4 w-4" />
                  Create Your First Promo Code
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-6">
              {coupons.map((coupon: CouponWithUsage) => (
                <Card key={coupon.id} className="p-6">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-4 mb-3">
                        <div className="flex items-center space-x-2">
                          <Badge 
                            variant="secondary" 
                            className="text-lg font-mono px-3 py-1"
                            data-testid={`badge-code-${coupon.code}`}
                          >
                            {coupon.code}
                          </Badge>
                          <Badge 
                            variant={coupon.isActive ? "default" : "secondary"}
                            data-testid={`badge-status-${coupon.code}`}
                          >
                            {coupon.isActive ? "Active" : "Inactive"}
                          </Badge>
                        </div>
                        <div className="flex items-center space-x-4 text-sm text-muted-foreground">
                          <div className="flex items-center space-x-1">
                            {coupon.discountType === "percentage" ? <Percent className="h-4 w-4" /> : <DollarSign className="h-4 w-4" />}
                            <span>
                              {coupon.discountType === "percentage" 
                                ? `${coupon.discountValue}% off` 
                                : `$${coupon.discountValue} off`
                              }
                            </span>
                          </div>
                          <div className="flex items-center space-x-1">
                            <Users className="h-4 w-4" />
                            <span>{coupon.currentUsageCount} uses</span>
                          </div>
                        </div>
                      </div>
                      
                      {coupon.description && (
                        <p className="text-muted-foreground mb-3">{coupon.description}</p>
                      )}
                      
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                        <div>
                          <span className="font-medium">Uses per user:</span>
                          <div>{coupon.maxUsagePerUser}</div>
                        </div>
                        <div>
                          <span className="font-medium">Total limit:</span>
                          <div>{coupon.maxUsageTotal || "Unlimited"}</div>
                        </div>
                        <div>
                          <span className="font-medium">Valid from:</span>
                          <div>{formatDate(coupon.validFrom)}</div>
                        </div>
                        <div>
                          <span className="font-medium">Valid until:</span>
                          <div>{formatDate(coupon.validUntil)}</div>
                        </div>
                      </div>

                      {coupon.minimumOrderAmount && (
                        <div className="mt-2 text-sm">
                          <span className="font-medium">Minimum order:</span> ${coupon.minimumOrderAmount}
                        </div>
                      )}
                    </div>
                    
                    <div className="flex space-x-2">
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => handleEdit(coupon)}
                        data-testid={`button-edit-${coupon.code}`}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => handleDelete(coupon.id)}
                        disabled={deleteMutation.isPending}
                        data-testid={`button-delete-${coupon.code}`}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </div>

        {/* Edit Modal */}
        <Dialog open={!!editingCoupon} onOpenChange={() => setEditingCoupon(null)}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Edit Promo Code</DialogTitle>
            </DialogHeader>
            {editingCoupon && (
              <Form {...editForm}>
                <form onSubmit={editForm.handleSubmit(handleUpdate)} className="space-y-6">
                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={editForm.control}
                      name="code"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Promo Code</FormLabel>
                          <FormControl>
                            <Input 
                              {...field} 
                              data-testid="input-edit-promo-code"
                              className="uppercase"
                              onChange={(e) => field.onChange(e.target.value.toUpperCase())}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={editForm.control}
                      name="discountType"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Discount Type</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl>
                              <SelectTrigger data-testid="select-edit-discount-type">
                                <SelectValue />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="percentage">Percentage (%)</SelectItem>
                              <SelectItem value="fixed">Fixed Amount ($)</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <FormField
                    control={editForm.control}
                    name="description"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Description (Optional)</FormLabel>
                        <FormControl>
                          <Textarea 
                            {...field} 
                            value={field.value || ""}
                            data-testid="textarea-edit-description"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={editForm.control}
                      name="discountValue"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>
                            Discount Value ({editForm.watch("discountType") === "percentage" ? "%" : "$"})
                          </FormLabel>
                          <FormControl>
                            <Input 
                              type="number" 
                              step="0.01"
                              min="0"
                              {...field}
                              onChange={(e) => field.onChange(parseFloat(e.target.value))}
                              data-testid="input-edit-discount-value"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={editForm.control}
                      name="maxUsagePerUser"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Uses Per User</FormLabel>
                          <FormControl>
                            <Input 
                              type="number" 
                              min="1"
                              {...field}
                              onChange={(e) => field.onChange(parseInt(e.target.value))}
                              data-testid="input-edit-max-usage-per-user"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={editForm.control}
                      name="minimumOrderAmount"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Minimum Order Amount (Optional)</FormLabel>
                          <FormControl>
                            <Input 
                              type="number" 
                              step="0.01"
                              min="0"
                              value={field.value || ""}
                              onChange={(e) => field.onChange(e.target.value ? parseFloat(e.target.value) : undefined)}
                              data-testid="input-edit-minimum-order"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={editForm.control}
                      name="maxUsageTotal"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Total Usage Limit (Optional)</FormLabel>
                          <FormControl>
                            <Input 
                              type="number" 
                              min="1"
                              value={field.value || ""}
                              onChange={(e) => field.onChange(e.target.value ? parseInt(e.target.value) : undefined)}
                              data-testid="input-edit-max-usage-total"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={editForm.control}
                      name="validFrom"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Valid From (Optional)</FormLabel>
                          <FormControl>
                            <Input 
                              type="datetime-local"
                              value={field.value ? new Date(field.value).toISOString().slice(0, 16) : ""}
                              onChange={(e) => field.onChange(e.target.value ? new Date(e.target.value) : undefined)}
                              data-testid="input-edit-valid-from"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={editForm.control}
                      name="validUntil"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Valid Until (Optional)</FormLabel>
                          <FormControl>
                            <Input 
                              type="datetime-local"
                              value={field.value ? new Date(field.value).toISOString().slice(0, 16) : ""}
                              onChange={(e) => field.onChange(e.target.value ? new Date(e.target.value) : undefined)}
                              data-testid="input-edit-valid-until"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <FormField
                    control={editForm.control}
                    name="isActive"
                    render={({ field }) => (
                      <FormItem>
                        <div className="flex items-center space-x-2">
                          <input
                            type="checkbox"
                            id="isActive"
                            checked={field.value}
                            onChange={field.onChange}
                            data-testid="checkbox-edit-is-active"
                          />
                          <FormLabel htmlFor="isActive">Active</FormLabel>
                        </div>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="flex justify-end space-x-4">
                    <Button 
                      type="button" 
                      variant="outline" 
                      onClick={() => setEditingCoupon(null)}
                      data-testid="button-cancel-edit"
                    >
                      Cancel
                    </Button>
                    <Button 
                      type="submit" 
                      disabled={updateMutation.isPending}
                      data-testid="button-submit-edit"
                    >
                      {updateMutation.isPending ? "Updating..." : "Update Promo Code"}
                    </Button>
                  </div>
                </form>
              </Form>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </Layout>
  );
}