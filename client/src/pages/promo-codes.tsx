import { useState, useMemo } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Plus, Edit, Trash2, BadgePercent, Calendar, Users, DollarSign, ArrowLeft } from "lucide-react";
import { Link } from "wouter";
import { insertPromoCodeSchema, PromoCodeWithDetails } from "@shared/schema";

// Form schema for promo code creation/editing
const promoCodeFormSchema = insertPromoCodeSchema.omit({
  createdBy: true, // Set server-side based on authenticated user
}).extend({
  value: z.string().min(1, "Value is required"),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  maxTotalUses: z.string().optional(),
  maxUsesPerUser: z.string().optional(),
  minCartSubtotal: z.string().optional(),
  scopeCourseIds: z.array(z.string()).optional(),
  scopeCategoryIds: z.array(z.string()).optional(),
});

type PromoCodeFormData = z.infer<typeof promoCodeFormSchema>;

export default function PromoCodesPage() {
  const { toast } = useToast();
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [editingPromoCode, setEditingPromoCode] = useState<any>(null);

  // Fetch promo codes
  const { data: promoCodes = [], isLoading } = useQuery<PromoCodeWithDetails[]>({
    queryKey: ["/api/instructor/coupons"],
  });

  // Fetch courses and categories for scope selection
  const { data: courses = [] } = useQuery<any[]>({
    queryKey: ["/api/courses"],
  });

  const { data: categories = [] } = useQuery<any[]>({
    queryKey: ["/api/categories"],
  });

  // Create promo code mutation
  const createPromoCodeMutation = useMutation({
    mutationFn: async (data: PromoCodeFormData) => {
      const payload: any = {
        ...data,
        value: parseFloat(data.value),
        // Convert empty strings to null for optional fields
        startDate: data.startDate && data.startDate.trim() ? new Date(data.startDate) : null,
        endDate: data.endDate && data.endDate.trim() ? new Date(data.endDate) : null,
        maxTotalUses: data.maxTotalUses && data.maxTotalUses.trim() ? parseInt(data.maxTotalUses) : null,
        maxUsesPerUser: data.maxUsesPerUser && data.maxUsesPerUser.trim() ? parseInt(data.maxUsesPerUser) : null,
        minCartSubtotal: data.minCartSubtotal && data.minCartSubtotal.trim() ? parseFloat(data.minCartSubtotal) : null,
      };
      
      return apiRequest("POST", "/api/instructor/coupons", payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/instructor/coupons"] });
      setIsCreateDialogOpen(false);
      form.reset();
      toast({
        title: "Success",
        description: "Promo code created successfully!",
      });
    },
    onError: (error: any) => {
      console.error('Error creating promo code:', error);
      toast({
        title: "Error",
        description: error?.message || "Failed to create promo code. Please try again.",
        variant: "destructive",
      });
    },
  });

  // Update promo code mutation
  const updatePromoCodeMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: PromoCodeFormData }) => {
      const payload: any = {
        ...data,
        value: parseFloat(data.value),
        // Convert empty strings to null for optional fields
        startDate: data.startDate && data.startDate.trim() ? new Date(data.startDate) : null,
        endDate: data.endDate && data.endDate.trim() ? new Date(data.endDate) : null,
        maxTotalUses: data.maxTotalUses && data.maxTotalUses.trim() ? parseInt(data.maxTotalUses) : null,
        maxUsesPerUser: data.maxUsesPerUser && data.maxUsesPerUser.trim() ? parseInt(data.maxUsesPerUser) : null,
        minCartSubtotal: data.minCartSubtotal && data.minCartSubtotal.trim() ? parseFloat(data.minCartSubtotal) : null,
      };
      
      return apiRequest("PUT", `/api/instructor/coupons/${id}`, payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/instructor/coupons"] });
      setEditingPromoCode(null);
      toast({
        title: "Success",
        description: "Promo code updated successfully!",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to update promo code. Please try again.",
        variant: "destructive",
      });
    },
  });

  // Delete promo code mutation
  const deletePromoCodeMutation = useMutation({
    mutationFn: async (id: string) => {
      return apiRequest("DELETE", `/api/instructor/coupons/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/instructor/coupons"] });
      toast({
        title: "Success",
        description: "Promo code deleted successfully!",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to delete promo code. Please try again.",
        variant: "destructive",
      });
    },
  });

  const form = useForm<PromoCodeFormData>({
    resolver: zodResolver(promoCodeFormSchema),
    defaultValues: {
      code: "",
      name: "",
      description: "",
      type: "PERCENT",
      value: "",
      scopeType: "GLOBAL",
      status: "ACTIVE",
      stackingPolicy: "EXCLUSIVE",
      applyToTax: false,
      applyToShipping: false,
      firstPurchaseOnly: false,
      newCustomersOnly: false,
      maxUsesPerUser: "1",
      maxTotalUses: "",
      minCartSubtotal: "0.00",
      startDate: "",
      endDate: "",
      scopeCourseIds: [],
      scopeCategoryIds: [],
    },
  });

  const onSubmit = async (data: PromoCodeFormData) => {
    // Validate that value is a valid number
    const valueNum = parseFloat(data.value);
    if (isNaN(valueNum) || valueNum < 0) {
      toast({
        title: "Invalid Value",
        description: "Please enter a valid discount value",
        variant: "destructive",
      });
      return;
    }

    try {
      if (editingPromoCode) {
        await updatePromoCodeMutation.mutateAsync({ id: editingPromoCode.id, data });
      } else {
        await createPromoCodeMutation.mutateAsync(data);
      }
    } catch (error) {
      console.error('Mutation error:', error);
    }
  };

  const handleEdit = (promoCode: any) => {
    setEditingPromoCode(promoCode);
    form.reset({
      ...promoCode,
      value: promoCode.value.toString(),
      maxTotalUses: promoCode.maxTotalUses?.toString() || "",
      maxUsesPerUser: promoCode.maxUsesPerUser?.toString() || "",
      minCartSubtotal: promoCode.minCartSubtotal?.toString() || "",
      startDate: promoCode.startDate ? new Date(promoCode.startDate).toISOString().split('T')[0] : "",
      endDate: promoCode.endDate ? new Date(promoCode.endDate).toISOString().split('T')[0] : "",
      scopeCourseIds: promoCode.scopeCourseIds || [],
      scopeCategoryIds: promoCode.scopeCategoryIds || [],
    });
  };

  const handleCloseDialog = () => {
    setIsCreateDialogOpen(false);
    setEditingPromoCode(null);
    form.reset();
  };

  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case "ACTIVE":
        return "default";
      case "SCHEDULED":
        return "secondary";
      case "PAUSED":
        return "outline";
      case "EXPIRED":
        return "destructive";
      default:
        return "secondary";
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-8">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <div className="flex items-center gap-4 mb-4">
            <Link href="/course-management">
              <Button variant="ghost" size="sm" data-testid="button-back">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Course Management
              </Button>
            </Link>
          </div>
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-bold text-foreground mb-2">Manage Promo Codes</h1>
              <p className="text-muted-foreground">Create and manage discount codes for your courses</p>
            </div>
            <Dialog open={isCreateDialogOpen || !!editingPromoCode} onOpenChange={(open) => {
              if (!open) {
                handleCloseDialog();
              } else if (!editingPromoCode) {
                setIsCreateDialogOpen(true);
              }
            }}>
              <DialogTrigger asChild>
                <Button 
                  onClick={() => setIsCreateDialogOpen(true)}
                  data-testid="button-create-promo"
                >
                  <Plus className="mr-2 h-4 w-4" />
                  Create Promo Code
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>
                    {editingPromoCode ? "Edit Promo Code" : "Create New Promo Code"}
                  </DialogTitle>
                  <DialogDescription>
                    {editingPromoCode 
                      ? "Update your promo code details below"
                      : "Create a new promo code to offer discounts on your courses"
                    }
                  </DialogDescription>
                </DialogHeader>
                <Form {...form}>
                  <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="code"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Promo Code *</FormLabel>
                            <FormControl>
                              <Input 
                                placeholder="SAVE20" 
                                {...field} 
                                value={field.value?.toUpperCase() || ""}
                                onChange={(e) => field.onChange(e.target.value.toUpperCase())}
                                data-testid="input-promo-code"
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="name"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Name *</FormLabel>
                            <FormControl>
                              <Input placeholder="20% Off Sale" {...field} data-testid="input-promo-name" />
                            </FormControl>
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
                            <Textarea 
                              placeholder="Brief description of this promo code"
                              {...field} 
                              value={field.value || ""}
                              data-testid="input-promo-description"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <div className="grid grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="type"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Discount Type *</FormLabel>
                            <Select onValueChange={field.onChange} value={field.value} data-testid="select-discount-type">
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder="Select type" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                <SelectItem value="PERCENT">Percentage (%)</SelectItem>
                                <SelectItem value="FIXED_AMOUNT">Fixed Amount ($)</SelectItem>
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
                            <FormLabel>Discount Value *</FormLabel>
                            <FormControl>
                              <Input 
                                type="number" 
                                placeholder="20" 
                                {...field} 
                                data-testid="input-discount-value"
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    {/* Scope Selection */}
                    <FormField
                      control={form.control}
                      name="scopeType"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Scope *</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value} data-testid="select-scope-type">
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select scope" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="GLOBAL">All Courses (Sitewide)</SelectItem>
                              <SelectItem value="COURSES">Specific Courses</SelectItem>
                              <SelectItem value="CATEGORIES">Specific Categories</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    {/* Specific Courses Selection */}
                    {form.watch("scopeType") === "COURSES" && (
                      <FormField
                        control={form.control}
                        name="scopeCourseIds"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Select Courses</FormLabel>
                            <FormControl>
                              <ScrollArea className="h-32 w-full border rounded-md p-3">
                                <div className="space-y-2">
                                  {courses.map((course: any) => (
                                    <div key={course.id} className="flex items-center space-x-2">
                                      <Checkbox
                                        id={`course-${course.id}`}
                                        checked={field.value?.includes(course.id) || false}
                                        onCheckedChange={(checked: boolean) => {
                                          const currentValues = field.value || [];
                                          if (checked) {
                                            field.onChange([...currentValues, course.id]);
                                          } else {
                                            field.onChange(currentValues.filter((id: string) => id !== course.id));
                                          }
                                        }}
                                        data-testid={`checkbox-course-${course.id}`}
                                      />
                                      <label
                                        htmlFor={`course-${course.id}`}
                                        className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                                      >
                                        {course.title}
                                      </label>
                                    </div>
                                  ))}
                                </div>
                              </ScrollArea>
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    )}

                    {/* Specific Categories Selection */}
                    {form.watch("scopeType") === "CATEGORIES" && (
                      <FormField
                        control={form.control}
                        name="scopeCategoryIds"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Select Categories</FormLabel>
                            <FormControl>
                              <ScrollArea className="h-32 w-full border rounded-md p-3">
                                <div className="space-y-2">
                                  {categories.map((category: any) => (
                                    <div key={category.id} className="flex items-center space-x-2">
                                      <Checkbox
                                        id={`category-${category.id}`}
                                        checked={field.value?.includes(category.id) || false}
                                        onCheckedChange={(checked: boolean) => {
                                          const currentValues = field.value || [];
                                          if (checked) {
                                            field.onChange([...currentValues, category.id]);
                                          } else {
                                            field.onChange(currentValues.filter((id: string) => id !== category.id));
                                          }
                                        }}
                                        data-testid={`checkbox-category-${category.id}`}
                                      />
                                      <label
                                        htmlFor={`category-${category.id}`}
                                        className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                                      >
                                        {category.name}
                                      </label>
                                    </div>
                                  ))}
                                </div>
                              </ScrollArea>
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    )}

                    <div className="grid grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="startDate"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Start Date</FormLabel>
                            <FormControl>
                              <Input type="date" {...field} data-testid="input-start-date" />
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
                            <FormLabel>End Date</FormLabel>
                            <FormControl>
                              <Input type="date" {...field} data-testid="input-end-date" />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="maxTotalUses"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Max Total Uses</FormLabel>
                            <FormControl>
                              <Input 
                                type="number" 
                                placeholder="Unlimited" 
                                {...field}
                                value={field.value || ""}
                                data-testid="input-max-total-uses"
                              />
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
                              <Input 
                                type="number" 
                                placeholder="1" 
                                {...field}
                                value={field.value || ""}
                                data-testid="input-max-uses-per-user"
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    <FormField
                      control={form.control}
                      name="minCartSubtotal"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Minimum Order Amount</FormLabel>
                          <FormControl>
                            <Input 
                              type="number" 
                              placeholder="0" 
                              {...field}
                              value={field.value || ""}
                              data-testid="input-min-cart-subtotal"
                            />
                          </FormControl>
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
                          <Select onValueChange={field.onChange} value={field.value} data-testid="select-status">
                            <FormControl>
                              <SelectTrigger>
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

                    <DialogFooter>
                      <Button type="button" variant="outline" onClick={handleCloseDialog} data-testid="button-cancel">
                        Cancel
                      </Button>
                      <Button 
                        type="submit" 
                        disabled={createPromoCodeMutation.isPending || updatePromoCodeMutation.isPending}
                        data-testid="button-save-promo"
                      >
                        {editingPromoCode ? "Update Promo Code" : "Create Promo Code"}
                      </Button>
                    </DialogFooter>
                  </form>
                </Form>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        {promoCodes.length === 0 ? (
          <Card>
            <CardContent className="text-center py-8">
              <BadgePercent className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium mb-2">No promo codes yet</h3>
              <p className="text-muted-foreground mb-4">
                Create your first promo code to start offering discounts on your courses.
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4">
            {promoCodes.map((promoCode: any) => (
              <Card key={promoCode.id} data-testid={`card-promo-${promoCode.id}`}>
                <CardHeader className="pb-4">
                  <div className="flex justify-between items-start">
                    <div>
                      <CardTitle className="flex items-center gap-2">
                        <Badge variant="secondary" className="text-sm font-mono">
                          {promoCode.code}
                        </Badge>
                        <Badge variant={getStatusBadgeVariant(promoCode.status)}>
                          {promoCode.status}
                        </Badge>
                      </CardTitle>
                      <CardDescription className="mt-1">
                        {promoCode.name}
                      </CardDescription>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleEdit(promoCode)}
                        data-testid={`button-edit-${promoCode.id}`}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button
                            variant="destructive"
                            size="sm"
                            data-testid={`button-delete-${promoCode.id}`}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Delete Promo Code</AlertDialogTitle>
                            <AlertDialogDescription>
                              Are you sure you want to delete "{promoCode.code}"? This action cannot be undone.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel data-testid={`button-cancel-delete-${promoCode.id}`}>Cancel</AlertDialogCancel>
                            <AlertDialogAction
                              onClick={() => deletePromoCodeMutation.mutate(promoCode.id)}
                              data-testid={`button-confirm-delete-${promoCode.id}`}
                            >
                              Delete
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  {promoCode.description && (
                    <p className="text-muted-foreground mb-4">{promoCode.description}</p>
                  )}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                    <div className="flex items-center gap-2">
                      <DollarSign className="h-4 w-4 text-muted-foreground" />
                      <span>
                        {promoCode.type === "PERCENT" ? `${promoCode.value}%` : `$${promoCode.value}`}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Users className="h-4 w-4 text-muted-foreground" />
                      <span>
                        {promoCode.currentUseCount || 0} / {promoCode.maxTotalUses || "∞"} uses
                      </span>
                    </div>
                    {promoCode.startDate && (
                      <div className="flex items-center gap-2">
                        <Calendar className="h-4 w-4 text-muted-foreground" />
                        <span>Starts {new Date(promoCode.startDate).toLocaleDateString()}</span>
                      </div>
                    )}
                    {promoCode.endDate && (
                      <div className="flex items-center gap-2">
                        <Calendar className="h-4 w-4 text-muted-foreground" />
                        <span>Ends {new Date(promoCode.endDate).toLocaleDateString()}</span>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}