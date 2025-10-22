import { useState, useEffect } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Edit, Trash2, Plus, Palette, ArrowUp, ArrowDown, Save } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import type { Category, InsertCategory } from "@shared/schema";

export function CategoryManagement() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [localCategories, setLocalCategories] = useState<Category[]>([]);
  const [hasUnsavedOrder, setHasUnsavedOrder] = useState(false);
  const [formData, setFormData] = useState<InsertCategory>({
    name: "",
    description: "",
    color: "#3b82f6",
    isActive: true,
    displayOnHome: true, // New field for home page visibility
  });

  const { data: categories = [] } = useQuery<Category[]>({
    queryKey: ['/api/categories'],
  });

  // Sync local categories with fetched categories
  useEffect(() => {
    if (categories.length > 0 || localCategories.length === 0) {
      setLocalCategories(categories);
      setHasUnsavedOrder(false);
    }
  }, [categories, localCategories.length]);

  const createCategoryMutation = useMutation({
    mutationFn: (data: InsertCategory) =>
      apiRequest('POST', '/api/categories', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/categories'] });
      setIsCreateDialogOpen(false);
      resetForm();
      toast({
        title: "Success",
        description: "Category created successfully",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to create category",
        variant: "destructive",
      });
    },
  });

  const updateCategoryMutation = useMutation({
    mutationFn: (data: { id: string; updates: Partial<InsertCategory> }) =>
      apiRequest('PUT', `/api/categories/${data.id}`, data.updates),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/categories'] });
      setEditingCategory(null);
      resetForm();
      toast({
        title: "Success",
        description: "Category updated successfully",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to update category",
        variant: "destructive",
      });
    },
  });

  const deleteCategoryMutation = useMutation({
    mutationFn: (id: string) =>
      apiRequest('DELETE', `/api/categories/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/categories'] });
      toast({
        title: "Success",
        description: "Category deleted successfully",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to delete category",
        variant: "destructive",
      });
    },
  });

  const reorderCategoriesMutation = useMutation({
    mutationFn: (items: { id: string; sortOrder: number }[]) =>
      apiRequest('POST', '/api/categories/reorder', { items }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/categories'] });
      setHasUnsavedOrder(false);
      toast({
        title: "Success",
        description: "Category order saved successfully",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to save category order",
        variant: "destructive",
      });
    },
  });

  const resetForm = () => {
    setFormData({
      name: "",
      description: "",
      color: "#3b82f6",
      isActive: true,
      displayOnHome: true, // Reset new field
    });
  };

  const handleCreateCategory = () => {
    createCategoryMutation.mutate(formData);
  };

  const handleEditCategory = (category: Category) => {
    setEditingCategory(category);
    setFormData({
      name: category.name,
      description: category.description || "",
      color: category.color || "#3b82f6",
      isActive: category.isActive,
      displayOnHome: category.displayOnHome ?? true, // Set new field, default to true if not present
    });
  };

  const handleUpdateCategory = () => {
    if (!editingCategory) return;
    updateCategoryMutation.mutate({
      id: editingCategory.id,
      updates: formData,
    });
  };

  const handleDeleteCategory = (id: string) => {
    if (confirm("Are you sure you want to delete this category? This action cannot be undone.")) {
      deleteCategoryMutation.mutate(id);
    }
  };

  const moveCategory = (index: number, direction: 'up' | 'down') => {
    const newCategories = [...localCategories];
    const targetIndex = direction === 'up' ? index - 1 : index + 1;

    // Swap the categories
    [newCategories[index], newCategories[targetIndex]] = [newCategories[targetIndex], newCategories[index]];

    setLocalCategories(newCategories);
    setHasUnsavedOrder(true);
  };

  const saveOrder = () => {
    // Generate new sort order values (10, 20, 30, etc.)
    const items = localCategories.map((category, index) => ({
      id: category.id,
      sortOrder: (index + 1) * 10
    }));

    reorderCategoriesMutation.mutate(items);
  };

  const toggleDisplayOnHome = (categoryId: string, currentDisplayValue: boolean) => {
    const updatedCategories = localCategories.map(cat => {
      if (cat.id === categoryId) {
        return { ...cat, displayOnHome: !currentDisplayValue };
      }
      return cat;
    });
    setLocalCategories(updatedCategories);
    setHasUnsavedOrder(true); // Treat this as an unsaved change

    // Optimistically update the category
    updateCategoryMutation.mutate({
      id: categoryId,
      updates: { displayOnHome: !currentDisplayValue },
    });
  };


  return (
    <div className="space-y-6">
      {/* Info Banner */}
      <div className="rounded-lg border border-blue-200 bg-blue-50 dark:border-blue-800 dark:bg-blue-950/20 p-4">
        <div className="flex items-start gap-3">
          <div className="flex-shrink-0 mt-0.5">
            <svg className="h-5 w-5 text-blue-600 dark:text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <div className="flex-1">
            <h3 className="text-sm font-semibold text-blue-900 dark:text-blue-100 mb-1">
              Home Page Display Control
            </h3>
            <p className="text-sm text-blue-700 dark:text-blue-300">
              Use the "Show on Home Page" toggle to control which categories and their courses appear on your public-facing home page. 
              Hidden categories will still be accessible through direct links and the schedule pages.
            </p>
          </div>
        </div>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Category Management</CardTitle>
              <CardDescription>
                Manage course categories and control which ones appear on the home page
              </CardDescription>
            </div>
            <div className="flex gap-2">
              {hasUnsavedOrder && (
                <Button
                  onClick={saveOrder}
                  disabled={reorderCategoriesMutation.isPending}
                  variant="default"
                  className="gap-2"
                  data-testid="button-save-order"
                >
                  <Save className="h-4 w-4" />
                  {reorderCategoriesMutation.isPending ? "Saving..." : "Save Order"}
                </Button>
              )}
              <Button
                onClick={() => setIsCreateDialogOpen(true)}
                className="gap-2"
                data-testid="button-create-category"
              >
                <Plus className="h-4 w-4" />
                Add Category
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Order</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead>Color</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-center">Show on Home Page</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {localCategories.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center text-muted-foreground py-8"> {/* Colspan adjusted */}
                      No categories found. Create your first category to get started.
                    </TableCell>
                  </TableRow>
                ) : (
                  localCategories.map((category, index) => (
                    <TableRow key={category.id} data-testid={`row-category-${category.id}`}>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => moveCategory(index, 'up')}
                            disabled={index === 0}
                            data-testid={`button-move-up-${category.id}`}
                          >
                            <ArrowUp className="h-3 w-3" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => moveCategory(index, 'down')}
                            disabled={index === localCategories.length - 1}
                            data-testid={`button-move-down-${category.id}`}
                          >
                            <ArrowDown className="h-3 w-3" />
                          </Button>
                        </div>
                      </TableCell>
                      <TableCell className="font-medium">
                        <div className="flex items-center gap-2">
                          <div
                            className="w-3 h-3 rounded-full border"
                            style={{ backgroundColor: category.color || '#3b82f6' }}
                          />
                          {category.name}
                        </div>
                      </TableCell>
                      <TableCell>
                        <span className="text-sm text-muted-foreground">
                          {category.description || "No description"}
                        </span>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Palette className="h-3 w-3" />
                          <code className="text-xs bg-muted px-1 py-0.5 rounded">
                            {category.color || '#3b82f6'}
                          </code>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant={category.isActive ? "default" : "secondary"}>
                          {category.isActive ? "Active" : "Inactive"}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-center">
                        <div className="flex items-center justify-center gap-2">
                          <Switch
                            checked={category.displayOnHome ?? false}
                            onCheckedChange={() => toggleDisplayOnHome(category.id, category.displayOnHome ?? false)}
                            data-testid={`switch-display-on-home-${category.id}`}
                          />
                          <span className="text-xs text-muted-foreground">
                            {category.displayOnHome ? 'Visible' : 'Hidden'}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleEditCategory(category)}
                            data-testid={`button-edit-category-${category.id}`}
                          >
                            <Edit className="h-3 w-3" />
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleDeleteCategory(category.id)}
                            className="text-red-600 hover:text-red-700"
                            data-testid={`button-delete-category-${category.id}`}
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Create Category Dialog */}
      <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create New Category</DialogTitle>
            <DialogDescription>
              Add a new category to organize your courses better.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="name">Category Name</Label>
              <Input
                id="name"
                placeholder="e.g., Basic Firearms Safety"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                data-testid="input-category-name"
              />
            </div>
            <div>
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                placeholder="Brief description of this category"
                value={formData.description || ''}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                data-testid="input-category-description"
              />
            </div>
            <div>
              <Label htmlFor="color">Category Color</Label>
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  id="color"
                  value={formData.color || '#3b82f6'}
                  onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                  className="w-10 h-10 rounded border cursor-pointer"
                  data-testid="input-category-color"
                />
                <Input
                  value={formData.color || '#3b82f6'}
                  onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                  placeholder="#3b82f6"
                  className="font-mono text-sm"
                />
              </div>
            </div>
            <div> {/* New Field in Create Dialog */}
              <Label htmlFor="displayOnHome">Display on Home Page</Label>
              <Switch
                id="displayOnHome"
                checked={formData.displayOnHome}
                onCheckedChange={(checked) => setFormData({ ...formData, displayOnHome: checked })}
                data-testid="switch-create-display-on-home"
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setIsCreateDialogOpen(false);
                resetForm();
              }}
              data-testid="button-cancel-create"
            >
              Cancel
            </Button>
            <Button
              onClick={handleCreateCategory}
              disabled={createCategoryMutation.isPending || !formData.name.trim()}
              data-testid="button-submit-create"
            >
              {createCategoryMutation.isPending ? "Creating..." : "Create Category"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Category Dialog */}
      <Dialog open={!!editingCategory} onOpenChange={(open) => !open && setEditingCategory(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Category</DialogTitle>
            <DialogDescription>
              Update category information.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="edit-name">Category Name</Label>
              <Input
                id="edit-name"
                placeholder="e.g., Basic Firearms Safety"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                data-testid="input-edit-category-name"
              />
            </div>
            <div>
              <Label htmlFor="edit-description">Description</Label>
              <Textarea
                id="edit-description"
                placeholder="Brief description of this category"
                value={formData.description || ''}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                data-testid="input-edit-category-description"
              />
            </div>
            <div>
              <Label htmlFor="edit-color">Category Color</Label>
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  id="edit-color"
                  value={formData.color || '#3b82f6'}
                  onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                  className="w-10 h-10 rounded border cursor-pointer"
                  data-testid="input-edit-category-color"
                />
                <Input
                  value={formData.color || '#3b82f6'}
                  onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                  placeholder="#3b82f6"
                  className="font-mono text-sm"
                />
              </div>
            </div>
            <div> {/* New Field in Edit Dialog */}
              <Label htmlFor="edit-displayOnHome">Display on Home Page</Label>
              <Switch
                id="edit-displayOnHome"
                checked={formData.displayOnHome}
                onCheckedChange={(checked) => setFormData({ ...formData, displayOnHome: checked })}
                data-testid="switch-edit-display-on-home"
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setEditingCategory(null);
                resetForm();
              }}
              data-testid="button-cancel-edit"
            >
              Cancel
            </Button>
            <Button
              onClick={handleUpdateCategory}
              disabled={updateCategoryMutation.isPending || !formData.name.trim()}
              data-testid="button-submit-edit"
            >
              {updateCategoryMutation.isPending ? "Updating..." : "Update Category"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}