import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { DashboardLayout } from "@/components/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { UserPlus, Check, X, Filter, Shield, MoreVertical, Edit, Trash2, KeyRound, Upload, Mail } from "lucide-react";
import type { User } from "@shared/schema";

const createUserSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(8, "Password must be at least 8 characters"),
  firstName: z.string().min(1, "First name is required"),
  lastName: z.string().min(1, "Last name is required"),
  role: z.enum(["student", "instructor", "admin", "superadmin"]),
  userStatus: z.enum(["pending", "active", "suspended", "rejected"]).default("active"),
});

const editUserSchema = z.object({
  email: z.string().email("Invalid email address").optional(),
  firstName: z.string().min(1, "First name is required").optional(),
  lastName: z.string().min(1, "Last name is required").optional(),
  preferredName: z.string().optional(),
  phone: z.string().optional(),
  password: z.string().min(8, "Password must be at least 8 characters").optional().or(z.literal("")),
  role: z.enum(["student", "instructor", "admin", "superadmin"]).optional(),
  userStatus: z.enum(["pending", "active", "suspended", "rejected"]).optional(),
});

type CreateUserForm = z.infer<typeof createUserSchema>;
type EditUserForm = z.infer<typeof editUserSchema>;
type UserWithFlags = User & { hasPassword?: boolean };

export default function UserManagementPage() {
  const { toast } = useToast();
  const { user: currentUser } = useAuth();
  const isSuperAdmin = currentUser?.role === 'superadmin';
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [roleFilter, setRoleFilter] = useState<string>("all");
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [rejectDialogOpen, setRejectDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [rejectReason, setRejectReason] = useState("");
  const [deleteConfirmText, setDeleteConfirmText] = useState("");
  const [importDialogOpen, setImportDialogOpen] = useState(false);
  const [importFile, setImportFile] = useState<File | null>(null);
  const [importPreview, setImportPreview] = useState<any>(null);
  const [importStep, setImportStep] = useState<"upload" | "mapping" | "preview" | "importing" | "done">("upload");
  const [importResults, setImportResults] = useState<any>(null);
  const [headerScan, setHeaderScan] = useState<any>(null);
  const [columnMap, setColumnMap] = useState<Record<string, string>>({});

  const form = useForm<CreateUserForm>({
    resolver: zodResolver(createUserSchema),
    defaultValues: {
      email: "",
      password: "",
      firstName: "",
      lastName: "",
      role: "student",
      userStatus: "active",
    },
  });

  const editForm = useForm<EditUserForm>({
    resolver: zodResolver(editUserSchema),
    defaultValues: {
      email: "",
      firstName: "",
      lastName: "",
      preferredName: "",
      phone: "",
      password: "",
      role: "student",
      userStatus: "active",
    },
  });

  const { data: users = [], isLoading } = useQuery<UserWithFlags[]>({
    queryKey: ["/api/admin/users"],
  });

  const createUserMutation = useMutation({
    mutationFn: async (data: CreateUserForm) => {
      return await apiRequest("POST", "/api/admin/users", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/users"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/users/pending/count"] });
      setCreateDialogOpen(false);
      form.reset();
      toast({
        title: "User created",
        description: "The user account has been created successfully",
      });
    },
    onError: (error: any) => {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message || "Failed to create user",
      });
    },
  });

  const approveUserMutation = useMutation({
    mutationFn: async (userId: string) => {
      return await apiRequest("PATCH", `/api/admin/users/${userId}/approve`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/users"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/users/pending/count"] });
      toast({
        title: "User approved",
        description: "The user account has been activated",
      });
    },
    onError: (error: any) => {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message || "Failed to approve user",
      });
    },
  });

  const rejectUserMutation = useMutation({
    mutationFn: async ({ userId, reason }: { userId: string; reason: string }) => {
      return await apiRequest("PATCH", `/api/admin/users/${userId}/reject`, { reason });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/users"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/users/pending/count"] });
      setRejectDialogOpen(false);
      setRejectReason("");
      setSelectedUserId(null);
      toast({
        title: "User rejected",
        description: "The user account has been rejected",
      });
    },
    onError: (error: any) => {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message || "Failed to reject user",
      });
    },
  });

  const editUserMutation = useMutation({
    mutationFn: async ({ userId, data }: { userId: string; data: EditUserForm }) => {
      return await apiRequest("PATCH", `/api/admin/users/${userId}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/users"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/users/pending/count"] });
      setEditDialogOpen(false);
      setSelectedUser(null);
      editForm.reset();
      toast({
        title: "User updated",
        description: "The user account has been updated successfully",
      });
    },
    onError: (error: any) => {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message || "Failed to update user",
      });
    },
  });

  const deleteUserMutation = useMutation({
    mutationFn: async (userId: string) => {
      return await apiRequest("DELETE", `/api/admin/users/${userId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/users"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/users/pending/count"] });
      setDeleteDialogOpen(false);
      setSelectedUser(null);
      setDeleteConfirmText("");
      toast({
        title: "User deleted",
        description: "The user account has been permanently deleted",
      });
    },
    onError: (error: any) => {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message || "Failed to delete user",
      });
    },
  });

  const passwordResetMutation = useMutation({
    mutationFn: async (userId: string) => {
      return await apiRequest("POST", `/api/admin/users/${userId}/reset-password`);
    },
    onSuccess: () => {
      toast({
        title: "Password reset email sent",
        description: "A password reset link has been sent to the user's email address",
      });
    },
    onError: (error: any) => {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message || "Failed to send password reset",
      });
    },
  });

  const importPreviewMutation = useMutation({
    mutationFn: async ({ file, mappings }: { file: File; mappings?: Record<string, string> }) => {
      const formData = new FormData();
      formData.append("file", file);
      if (mappings) {
        formData.append("columnMap", JSON.stringify(mappings));
      }
      const res = await fetch("/api/admin/import-students/preview", {
        method: "POST",
        body: formData,
        credentials: "include",
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({ message: "Upload failed" }));
        throw new Error(err.message || "Upload failed");
      }
      return res.json();
    },
    onSuccess: (data) => {
      if (data.mode === "headerScan") {
        setHeaderScan(data);
        const autoMap: Record<string, string> = {};
        for (const s of data.suggestions) {
          if (s.suggestedField) {
            autoMap[s.suggestedField] = s.csvHeader;
          }
        }
        setColumnMap(autoMap);
        setImportStep("mapping");
      } else {
        setImportPreview(data);
        setImportStep("preview");
      }
    },
    onError: (error: any) => {
      toast({
        variant: "destructive",
        title: "Import Preview Failed",
        description: error.message || "Failed to preview import file",
      });
    },
  });

  const importConfirmMutation = useMutation({
    mutationFn: async (rows: any[]) => {
      const res = await apiRequest("POST", "/api/admin/import-students/confirm", { rows });
      return res.json();
    },
    onSuccess: (data) => {
      setImportResults(data);
      setImportStep("done");
      queryClient.invalidateQueries({ queryKey: ["/api/admin/users"] });
      toast({
        title: "Import Complete",
        description: `Successfully imported students`,
      });
    },
    onError: (error: any) => {
      toast({
        variant: "destructive",
        title: "Import Failed",
        description: error.message || "Failed to import students",
      });
      setImportStep("preview");
    },
  });

  const sendWelcomeEmailMutation = useMutation({
    mutationFn: async (userId: string) => {
      return await apiRequest("POST", `/api/admin/import-students/welcome-email/${userId}`);
    },
    onSuccess: () => {
      toast({
        title: "Welcome email sent",
        description: "The welcome email has been sent successfully",
      });
    },
    onError: (error: any) => {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message || "Failed to send welcome email",
      });
    },
  });

  const bulkWelcomeEmailMutation = useMutation({
    mutationFn: async (userIds: string[]) => {
      const res = await apiRequest("POST", "/api/admin/import-students/welcome-emails/bulk", { userIds });
      return res.json();
    },
    onSuccess: (data) => {
      toast({
        title: "Bulk welcome emails sent",
        description: `Sent: ${data.sent ?? 0}, Failed: ${data.failed ?? 0}`,
      });
    },
    onError: (error: any) => {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message || "Failed to send bulk welcome emails",
      });
    },
  });

  const handleEditUser = (user: User) => {
    setSelectedUser(user);
    editForm.reset({
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      preferredName: user.preferredName || "",
      phone: user.phone || "",
      password: "",
      role: user.role,
      userStatus: user.userStatus,
    });
    setEditDialogOpen(true);
  };

  const handleDeleteUser = (user: User) => {
    setSelectedUser(user);
    setDeleteConfirmText("");
    setDeleteDialogOpen(true);
  };

  const onEditSubmit = (data: EditUserForm) => {
    if (selectedUser) {
      editUserMutation.mutate({ userId: selectedUser.id, data });
    }
  };

  const filteredUsers = users.filter((user) => {
    if (statusFilter !== "all" && user.userStatus !== statusFilter) return false;
    if (roleFilter !== "all" && user.role !== roleFilter) return false;
    return true;
  });

  const pendingCount = users.filter((u) => u.userStatus === "pending").length;

  const getStatusBadge = (status: string) => {
    const variants: Record<string, any> = {
      active: "default",
      pending: "secondary",
      suspended: "destructive",
      rejected: "outline",
    };
    return (
      <Badge variant={variants[status] || "default"} data-testid={`badge-status-${status}`}>
        {status}
      </Badge>
    );
  };

  const getRoleBadge = (role: string) => {
    const colors: Record<string, string> = {
      superadmin: "bg-red-500 text-white hover:bg-red-600",
      admin: "bg-blue-500 text-white hover:bg-blue-600",
      instructor: "bg-green-500 text-white hover:bg-green-600",
      student: "bg-gray-500 text-white hover:bg-gray-600",
    };
    return (
      <Badge className={colors[role]} data-testid={`badge-role-${role}`}>
        {role === "superadmin" && <Shield className="w-3 h-3 mr-1" />}
        {role}
      </Badge>
    );
  };

  const onSubmit = (data: CreateUserForm) => {
    createUserMutation.mutate(data);
  };

  return (
    <DashboardLayout>
      <div className="max-w-7xl mx-auto p-6">
        <div className="mb-6 flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold" data-testid="heading-user-management">
              User Management
            </h1>
            <p className="text-muted-foreground mt-2">
              Manage user accounts, roles, and permissions
            </p>
          </div>
          <div className="flex gap-2">
            <Button onClick={() => { setImportDialogOpen(true); setImportStep("upload"); setImportFile(null); setImportPreview(null); setImportResults(null); setHeaderScan(null); setColumnMap({}); }}>
              <Upload className="w-4 h-4 mr-2" />
              Import Students
            </Button>
            <Button
              onClick={() => {
                const studentIds = users
                  .filter(u => u.role === "student" && !u.hasPassword)
                  .map(u => u.id);
                if (studentIds.length === 0) {
                  toast({ title: "No eligible students", description: "All students already have passwords set." });
                  return;
                }
                if (confirm(`Send welcome emails to ${studentIds.length} students without passwords?`)) {
                  bulkWelcomeEmailMutation.mutate(studentIds);
                }
              }}
              disabled={bulkWelcomeEmailMutation.isPending}
            >
              <Mail className="w-4 h-4 mr-2" />
              {bulkWelcomeEmailMutation.isPending ? "Sending..." : "Send Welcome Emails"}
            </Button>
          <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
            <DialogTrigger asChild>
              <Button data-testid="button-create-user">
                <UserPlus className="w-4 h-4 mr-2" />
                Create User
              </Button>
            </DialogTrigger>
            <DialogContent data-testid="dialog-create-user">
              <DialogHeader>
                <DialogTitle>Create New User</DialogTitle>
                <DialogDescription>
                  Manually create a user account. Users created with "active" status can log in immediately.
                </DialogDescription>
              </DialogHeader>
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                  <FormField
                    control={form.control}
                    name="email"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Email</FormLabel>
                        <FormControl>
                          <Input {...field} type="email" placeholder="user@example.com" data-testid="input-email" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="password"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Default Password</FormLabel>
                        <FormControl>
                          <Input {...field} type="password" placeholder="Enter default password" data-testid="input-password" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="firstName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>First Name</FormLabel>
                        <FormControl>
                          <Input {...field} placeholder="John" data-testid="input-firstName" />
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
                          <Input {...field} placeholder="Doe" data-testid="input-lastName" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="role"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Role</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger data-testid="select-role">
                              <SelectValue placeholder="Select a role" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="student">Student</SelectItem>
                            <SelectItem value="instructor">Instructor</SelectItem>
                            <SelectItem value="admin">Admin</SelectItem>
                            {isSuperAdmin && <SelectItem value="superadmin">Super Admin</SelectItem>}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="userStatus"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Initial Status</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger data-testid="select-status">
                              <SelectValue placeholder="Select status" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="active">Active (can login immediately)</SelectItem>
                            <SelectItem value="pending">Pending (requires approval)</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <DialogFooter>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setCreateDialogOpen(false)}
                      data-testid="button-cancel"
                    >
                      Cancel
                    </Button>
                    <Button type="submit" disabled={createUserMutation.isPending} data-testid="button-submit">
                      {createUserMutation.isPending ? "Creating..." : "Create User"}
                    </Button>
                  </DialogFooter>
                </form>
              </Form>
            </DialogContent>
          </Dialog>
          </div>
        </div>

        <Card>
          <CardHeader>
            <div className="flex justify-between items-center">
              <div>
                <CardTitle>Users</CardTitle>
                <CardDescription>
                  {filteredUsers.length} total users
                  {pendingCount > 0 && (
                    <Badge variant="secondary" className="ml-2" data-testid="badge-pending-count">
                      {pendingCount} pending
                    </Badge>
                  )}
                </CardDescription>
              </div>
              <div className="flex gap-2">
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-[140px]" data-testid="filter-status">
                    <Filter className="w-4 h-4 mr-2" />
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Status</SelectItem>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="suspended">Suspended</SelectItem>
                    <SelectItem value="rejected">Rejected</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={roleFilter} onValueChange={setRoleFilter}>
                  <SelectTrigger className="w-[140px]" data-testid="filter-role">
                    <Filter className="w-4 h-4 mr-2" />
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Roles</SelectItem>
                    <SelectItem value="student">Student</SelectItem>
                    <SelectItem value="instructor">Instructor</SelectItem>
                    <SelectItem value="admin">Admin</SelectItem>
                    {isSuperAdmin && <SelectItem value="superadmin">Super Admin</SelectItem>}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="text-center py-8" data-testid="loading-users">Loading users...</div>
            ) : filteredUsers.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground" data-testid="no-users">
                No users found matching the current filters
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Created</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredUsers.map((user) => (
                    <TableRow key={user.id} data-testid={`row-user-${user.id}`}>
                      <TableCell className="font-medium">
                        {user.firstName} {user.lastName}
                        {user.preferredName && (
                          <span className="text-sm text-muted-foreground ml-1">
                            ({user.preferredName})
                          </span>
                        )}
                      </TableCell>
                      <TableCell>{user.email}</TableCell>
                      <TableCell>{getRoleBadge(user.role)}</TableCell>
                      <TableCell>{getStatusBadge(user.userStatus)}</TableCell>
                      <TableCell>
                        {new Date(user.createdAt).toLocaleDateString()}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex gap-2 justify-end items-center">
                          {user.userStatus === "pending" && (
                            <>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => approveUserMutation.mutate(user.id)}
                                disabled={approveUserMutation.isPending}
                                data-testid={`button-approve-${user.id}`}
                              >
                                <Check className="w-4 h-4 mr-1" />
                                Approve
                              </Button>
                              <Button
                                size="sm"
                                variant="destructive"
                                onClick={() => {
                                  setSelectedUserId(user.id);
                                  setRejectDialogOpen(true);
                                }}
                                disabled={rejectUserMutation.isPending}
                                data-testid={`button-reject-${user.id}`}
                              >
                                <X className="w-4 h-4 mr-1" />
                                Reject
                              </Button>
                            </>
                          )}
                          {user.userStatus === "rejected" && user.statusReason && (
                            <span className="text-sm text-muted-foreground mr-2" data-testid={`reason-${user.id}`}>
                              {user.statusReason}
                            </span>
                          )}
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="sm" data-testid={`button-actions-${user.id}`}>
                                <MoreVertical className="w-4 h-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuLabel>Actions</DropdownMenuLabel>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem onClick={() => handleEditUser(user)} data-testid={`action-edit-${user.id}`}>
                                <Edit className="w-4 h-4 mr-2" />
                                Edit User
                              </DropdownMenuItem>
                              <DropdownMenuItem 
                                onClick={() => passwordResetMutation.mutate(user.id)}
                                data-testid={`action-reset-${user.id}`}
                              >
                                <KeyRound className="w-4 h-4 mr-2" />
                                Send Password Reset
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={() => sendWelcomeEmailMutation.mutate(user.id)}
                              >
                                <Mail className="w-4 h-4 mr-2" />
                                Send Welcome Email
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem 
                                onClick={() => handleDeleteUser(user)}
                                className="focus:text-destructive text-[#ff0000]"
                                data-testid={`action-delete-${user.id}`}
                              >
                                <Trash2 className="w-4 h-4 mr-2" />
                                Delete User
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        {/* Reject Dialog */}
        <Dialog open={rejectDialogOpen} onOpenChange={setRejectDialogOpen}>
          <DialogContent data-testid="dialog-reject-user">
            <DialogHeader>
              <DialogTitle>Reject User Application</DialogTitle>
              <DialogDescription>
                Please provide a reason for rejecting this user account. This will be visible to the user.
              </DialogDescription>
            </DialogHeader>
            <div className="py-4">
              <Textarea
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                placeholder="Enter reason for rejection..."
                className="min-h-[100px]"
                data-testid="input-reject-reason"
              />
            </div>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => {
                  setRejectDialogOpen(false);
                  setRejectReason("");
                  setSelectedUserId(null);
                }}
                data-testid="button-cancel-reject"
              >
                Cancel
              </Button>
              <Button
                variant="destructive"
                onClick={() => {
                  if (selectedUserId) {
                    rejectUserMutation.mutate({ userId: selectedUserId, reason: rejectReason });
                  }
                }}
                disabled={rejectUserMutation.isPending || !rejectReason.trim()}
                data-testid="button-confirm-reject"
              >
                {rejectUserMutation.isPending ? "Rejecting..." : "Reject User"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Edit User Dialog */}
        <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
          <DialogContent className="max-h-[90vh] overflow-y-auto" data-testid="dialog-edit-user">
            <DialogHeader>
              <DialogTitle>Edit User</DialogTitle>
              <DialogDescription>
                Update user information, role, and account status
              </DialogDescription>
            </DialogHeader>
            <Form {...editForm}>
              <form onSubmit={editForm.handleSubmit(onEditSubmit)} className="space-y-4">
                <FormField
                  control={editForm.control}
                  name="firstName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>First Name</FormLabel>
                      <FormControl>
                        <Input {...field} data-testid="input-edit-firstname" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={editForm.control}
                  name="lastName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Last Name</FormLabel>
                      <FormControl>
                        <Input {...field} data-testid="input-edit-lastname" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={editForm.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Email</FormLabel>
                      <FormControl>
                        <Input {...field} type="email" data-testid="input-edit-email" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={editForm.control}
                  name="phone"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Phone (optional)</FormLabel>
                      <FormControl>
                        <Input {...field} data-testid="input-edit-phone" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={editForm.control}
                  name="password"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>New Password (optional)</FormLabel>
                      <FormControl>
                        <Input {...field} type="password" placeholder="Leave blank to keep current password" data-testid="input-edit-password" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={editForm.control}
                  name="role"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Role</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger data-testid="select-edit-role">
                            <SelectValue />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="student">Student</SelectItem>
                          <SelectItem value="instructor">Instructor</SelectItem>
                          <SelectItem value="admin">Admin</SelectItem>
                          {isSuperAdmin && <SelectItem value="superadmin">Super Admin</SelectItem>}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={editForm.control}
                  name="userStatus"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Account Status</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger data-testid="select-edit-status">
                            <SelectValue />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="active">Active</SelectItem>
                          <SelectItem value="pending">Pending</SelectItem>
                          <SelectItem value="suspended">Suspended</SelectItem>
                          <SelectItem value="rejected">Rejected</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <DialogFooter>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setEditDialogOpen(false)}
                    data-testid="button-cancel-edit"
                  >
                    Cancel
                  </Button>
                  <Button type="submit" disabled={editUserMutation.isPending} data-testid="button-save-edit">
                    {editUserMutation.isPending ? "Saving..." : "Save Changes"}
                  </Button>
                </DialogFooter>
              </form>
            </Form>
          </DialogContent>
        </Dialog>

        {/* Delete User Dialog */}
        <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
          <AlertDialogContent data-testid="dialog-delete-user">
            <AlertDialogHeader>
              <AlertDialogTitle>Delete User Account</AlertDialogTitle>
              <AlertDialogDescription>
                This will permanently delete <strong>{selectedUser?.firstName} {selectedUser?.lastName}</strong> ({selectedUser?.email}) 
                and all associated data. This action cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <div className="py-4">
              <p className="text-sm text-muted-foreground mb-2">
                To confirm deletion, please type <strong>DELETE</strong> below:
              </p>
              <Input
                value={deleteConfirmText}
                onChange={(e) => setDeleteConfirmText(e.target.value)}
                placeholder="Type DELETE to confirm"
                className="font-mono"
                data-testid="input-delete-confirm"
              />
            </div>
            <AlertDialogFooter>
              <AlertDialogCancel 
                onClick={() => {
                  setDeleteDialogOpen(false);
                  setDeleteConfirmText("");
                  setSelectedUser(null);
                }}
                data-testid="button-cancel-delete"
              >
                Cancel
              </AlertDialogCancel>
              <AlertDialogAction
                onClick={() => {
                  if (selectedUser && deleteConfirmText === "DELETE") {
                    deleteUserMutation.mutate(selectedUser.id);
                  }
                }}
                disabled={deleteConfirmText !== "DELETE" || deleteUserMutation.isPending}
                className="!bg-[#ff0000] hover:!bg-[#ff0000]/90 !text-white font-semibold"
                data-testid="button-confirm-delete"
              >
                {deleteUserMutation.isPending ? "Deleting..." : "Delete User"}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* Import Students Dialog */}
        <Dialog open={importDialogOpen} onOpenChange={(open) => {
          if (!open && importStep === "importing") return; // prevent closing during import
          setImportDialogOpen(open);
        }}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Import Students</DialogTitle>
              <DialogDescription>
                Upload a CSV file to import students and enroll them in courses
              </DialogDescription>
            </DialogHeader>

            {/* Step 1: Upload */}
            {importStep === "upload" && (
              <div className="space-y-4 py-4">
                <div className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-8 text-center">
                  <Upload className="w-10 h-10 mx-auto mb-4 text-muted-foreground" />
                  <p className="text-sm text-muted-foreground mb-4">
                    Upload a CSV file with columns: firstName, lastName, email, phone, course
                  </p>
                  <Input
                    type="file"
                    accept=".csv"
                    onChange={(e) => setImportFile(e.target.files?.[0] || null)}
                    className="max-w-xs mx-auto"
                  />
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setImportDialogOpen(false)}>
                    Cancel
                  </Button>
                  <Button
                    onClick={() => {
                      if (importFile) {
                        importPreviewMutation.mutate({ file: importFile });
                      }
                    }}
                    disabled={!importFile || importPreviewMutation.isPending}
                  >
                    {importPreviewMutation.isPending ? "Processing..." : "Upload & Map Columns"}
                  </Button>
                </DialogFooter>
              </div>
            )}

            {/* Step 2: Column Mapping */}
            {importStep === "mapping" && headerScan && (
              <div className="space-y-4 py-4">
                <p className="text-sm text-muted-foreground">
                  Map your CSV columns to the system fields below. Name and Email are required.
                </p>

                {headerScan.sampleRows?.length > 0 && (
                  <div className="border rounded-md overflow-x-auto max-h-32">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          {headerScan.csvHeaders.map((h: string) => (
                            <TableHead key={h} className="text-xs whitespace-nowrap">{h}</TableHead>
                          ))}
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {headerScan.sampleRows.map((row: Record<string, string>, i: number) => (
                          <TableRow key={i}>
                            {headerScan.csvHeaders.map((h: string) => (
                              <TableCell key={h} className="text-xs whitespace-nowrap">{row[h] || ""}</TableCell>
                            ))}
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}

                <div className="space-y-3">
                  {headerScan.systemFields.map((field: { key: string; label: string; required: boolean }) => (
                    <div key={field.key} className="flex items-center gap-3">
                      <div className="w-44 text-sm font-medium">
                        {field.label}
                        {field.required && <span className="text-red-500 ml-1">*</span>}
                      </div>
                      <Select
                        value={columnMap[field.key] || "__none__"}
                        onValueChange={(value) => {
                          setColumnMap((prev) => {
                            const next = { ...prev };
                            if (value === "__none__") {
                              delete next[field.key];
                            } else {
                              for (const k of Object.keys(next)) {
                                if (next[k] === value) delete next[k];
                              }
                              next[field.key] = value;
                            }
                            return next;
                          });
                        }}
                      >
                        <SelectTrigger className="w-56">
                          <SelectValue placeholder="-- Skip --" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="__none__">-- Skip --</SelectItem>
                          {headerScan.csvHeaders.map((h: string) => (
                            <SelectItem key={h} value={h}>{h}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      {headerScan.suggestions.find(
                        (s: any) => s.suggestedField === field.key
                      ) && columnMap[field.key] === headerScan.suggestions.find(
                        (s: any) => s.suggestedField === field.key
                      )?.csvHeader && (
                        <Badge variant="secondary" className="text-xs">Auto</Badge>
                      )}
                    </div>
                  ))}
                </div>

                {(!columnMap["name"] || !columnMap["email"]) && (
                  <p className="text-sm text-red-600">
                    You must map both Name and Email to proceed.
                  </p>
                )}

                <DialogFooter>
                  <Button variant="outline" onClick={() => { setImportStep("upload"); setHeaderScan(null); setColumnMap({}); }}>
                    Back
                  </Button>
                  <Button
                    onClick={() => {
                      if (importFile) {
                        importPreviewMutation.mutate({ file: importFile, mappings: columnMap });
                      }
                    }}
                    disabled={!columnMap["name"] || !columnMap["email"] || importPreviewMutation.isPending}
                  >
                    {importPreviewMutation.isPending ? "Processing..." : "Preview Import"}
                  </Button>
                </DialogFooter>
              </div>
            )}

            {/* Step 3: Preview */}
            {importStep === "preview" && importPreview && (
              <div className="space-y-4 py-4">
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                  <Card>
                    <CardContent className="p-3 text-center">
                      <div className="text-2xl font-bold">{importPreview.totalRows}</div>
                      <div className="text-xs text-muted-foreground">Total Rows</div>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="p-3 text-center">
                      <div className="text-2xl font-bold">{importPreview.uniqueStudents}</div>
                      <div className="text-xs text-muted-foreground">Unique Students</div>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="p-3 text-center">
                      <div className="text-2xl font-bold text-green-600">{importPreview.validRows}</div>
                      <div className="text-xs text-muted-foreground">Valid</div>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="p-3 text-center">
                      <div className="text-2xl font-bold text-red-600">{importPreview.errorCount ?? 0}</div>
                      <div className="text-xs text-muted-foreground">Errors</div>
                    </CardContent>
                  </Card>
                </div>

                {/* Course matching status */}
                {importPreview.courseMatches && importPreview.courseMatches.length > 0 && (
                  <div>
                    <h4 className="font-medium mb-2">Course Matching</h4>
                    <div className="space-y-1">
                      {importPreview.courseMatches.map((match: any, i: number) => (
                        <div key={i} className="flex items-center gap-2 text-sm">
                          {match.matched ? (
                            <Badge variant="default" className="bg-green-600">Matched</Badge>
                          ) : (
                            <Badge variant="destructive">Not Found</Badge>
                          )}
                          <span>{match.csvCourse}</span>
                          {match.matched && (
                            <span className="text-muted-foreground">-&gt; {match.matchedName}</span>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Error rows */}
                {importPreview.errors && importPreview.errors.length > 0 && (
                  <div>
                    <h4 className="font-medium mb-2 text-red-600">Errors</h4>
                    <div className="space-y-1 max-h-40 overflow-y-auto">
                      {importPreview.errors.map((err: any, i: number) => (
                        <div key={i} className="text-sm text-red-600">
                          Row {err.row}: {err.message}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Warning rows */}
                {importPreview.warnings && importPreview.warnings.length > 0 && (
                  <div>
                    <h4 className="font-medium mb-2 text-yellow-600">Warnings</h4>
                    <div className="space-y-1 max-h-40 overflow-y-auto">
                      {importPreview.warnings.map((warn: any, i: number) => (
                        <div key={i} className="text-sm text-yellow-600">
                          Row {warn.row}: {warn.message}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <DialogFooter>
                  <Button variant="outline" onClick={() => { setImportStep("mapping"); setImportPreview(null); }}>
                    Back
                  </Button>
                  <Button
                    onClick={() => {
                      setImportStep("importing");
                      importConfirmMutation.mutate(importPreview.rows);
                    }}
                    disabled={!importPreview.validRows || importPreview.validRows === 0}
                  >
                    Confirm Import ({importPreview.validRows} students)
                  </Button>
                </DialogFooter>
              </div>
            )}

            {/* Step 3: Importing */}
            {importStep === "importing" && (
              <div className="py-12 text-center">
                <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full mx-auto mb-4"></div>
                <p className="text-muted-foreground">Importing students... Please wait.</p>
              </div>
            )}

            {/* Step 4: Done */}
            {importStep === "done" && importResults && (
              <div className="space-y-4 py-4">
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                  <Card>
                    <CardContent className="p-3 text-center">
                      <div className="text-2xl font-bold text-green-600">{importResults.usersCreated ?? 0}</div>
                      <div className="text-xs text-muted-foreground">Users Created</div>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="p-3 text-center">
                      <div className="text-2xl font-bold">{importResults.existingUsers ?? 0}</div>
                      <div className="text-xs text-muted-foreground">Existing Users</div>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="p-3 text-center">
                      <div className="text-2xl font-bold text-blue-600">{importResults.enrollments ?? 0}</div>
                      <div className="text-xs text-muted-foreground">Enrollments</div>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="p-3 text-center">
                      <div className="text-2xl font-bold text-purple-600">{importResults.onlineEnrollments ?? 0}</div>
                      <div className="text-xs text-muted-foreground">Online Enrollments</div>
                    </CardContent>
                  </Card>
                </div>

                {/* Errors list */}
                {importResults.errors && importResults.errors.length > 0 && (
                  <div>
                    <h4 className="font-medium mb-2 text-red-600">Errors During Import</h4>
                    <div className="space-y-1 max-h-40 overflow-y-auto">
                      {importResults.errors.map((err: any, i: number) => (
                        <div key={i} className="text-sm text-red-600">
                          {err.email || `Row ${err.row}`}: {err.message}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <DialogFooter>
                  <Button onClick={() => setImportDialogOpen(false)}>
                    Done
                  </Button>
                </DialogFooter>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}
