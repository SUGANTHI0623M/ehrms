import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
} from "@/components/ui/dialog";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import MainLayout from "@/components/MainLayout";
import {
  useGetCompaniesQuery,
  useGetCompanyByIdQuery,
  useCreateCompanyMutation,
  useUpdateCompanyMutation,
  useDeleteCompanyMutation,
  useSuspendCompanyMutation,
  useResumeCompanyMutation,
  useActivateCompanyMutation,
  useDeactivateCompanyMutation,
  useResetTrialMutation,
  useGetSubscriptionPlansQuery,
  Company,
} from "@/store/api/superAdminApi";
import { Search, Plus, Edit, Trash2, Ban, CheckCircle, XCircle, Play, Info, Eye, RotateCcw } from "lucide-react";
import { toast } from "sonner";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { Alert, AlertDescription } from "@/components/ui/alert";

const ManageCompanies = () => {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [planFilter, setPlanFilter] = useState("");
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isDeactivateDialogOpen, setIsDeactivateDialogOpen] = useState(false);
  const [isSuspendDialogOpen, setIsSuspendDialogOpen] = useState(false);
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false);
  const [isResetTrialDialogOpen, setIsResetTrialDialogOpen] = useState(false);
  const [selectedCompany, setSelectedCompany] = useState<Company | null>(null);
  const [viewCompanyId, setViewCompanyId] = useState<string | null>(null);
  const [suspendReason, setSuspendReason] = useState("");
  const [trialDays, setTrialDays] = useState("14");

  const { data, isLoading, refetch } = useGetCompaniesQuery({
    page,
    limit: 10,
    search,
    status: statusFilter,
    plan: planFilter,
  });

  const { data: plansData } = useGetSubscriptionPlansQuery();
  const plans = plansData?.data?.plans || [];

  const [createCompany, { isLoading: isCreating }] = useCreateCompanyMutation();
  const [updateCompany, { isLoading: isUpdating }] = useUpdateCompanyMutation();
  const [deleteCompany, { isLoading: isDeleting }] = useDeleteCompanyMutation();
  const [suspendCompany, { isLoading: isSuspending }] = useSuspendCompanyMutation();
  const [resumeCompany, { isLoading: isResuming }] = useResumeCompanyMutation();
  const [activateCompany, { isLoading: isActivating }] = useActivateCompanyMutation();
  const [deactivateCompany, { isLoading: isDeactivating }] = useDeactivateCompanyMutation();
  const [resetTrial, { isLoading: isResettingTrial }] = useResetTrialMutation();

  // Fetch company details for view
  const { data: viewCompanyData, isLoading: isLoadingViewCompany } = useGetCompanyByIdQuery(
    viewCompanyId || "",
    { skip: !viewCompanyId || !isViewDialogOpen }
  );

  // Form state
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    address: {
      street: "",
      city: "",
      state: "",
      zipCode: "",
      country: "India",
    },
    subscriptionPlan: "free",
    subscriptionPlanId: "",
  });

  const handleCreate = async () => {
    try {
      const result = await createCompany({
        ...formData,
        subscriptionPlanId: formData.subscriptionPlanId || undefined,
      }).unwrap();
      toast.success(result.message || "Company created successfully");
      setIsCreateDialogOpen(false);
      resetForm();
      refetch();
    } catch (error: any) {
      toast.error(error?.data?.error?.message || "Failed to create company");
    }
  };

  const handleUpdate = async () => {
    if (!selectedCompany) return;
    try {
      await updateCompany({
        id: selectedCompany.id,
        data: formData,
      }).unwrap();
      toast.success("Company updated successfully");
      setIsEditDialogOpen(false);
      setSelectedCompany(null);
      resetForm();
      refetch();
    } catch (error: any) {
      toast.error(error?.data?.error?.message || "Failed to update company");
    }
  };

  const handleDelete = async () => {
    if (!selectedCompany) return;
    try {
      await deleteCompany(selectedCompany.id).unwrap();
      toast.success("Company deleted successfully");
      setIsDeleteDialogOpen(false);
      setSelectedCompany(null);
      refetch();
    } catch (error: any) {
      toast.error(error?.data?.error?.message || "Failed to delete company");
    }
  };

  const handleSuspend = async () => {
    if (!selectedCompany) return;
    try {
      await suspendCompany({
        id: selectedCompany.id,
        reason: suspendReason,
      }).unwrap();
      toast.success("Company suspended successfully");
      setIsSuspendDialogOpen(false);
      setSelectedCompany(null);
      setSuspendReason("");
      refetch();
    } catch (error: any) {
      toast.error(error?.data?.error?.message || "Failed to suspend company");
    }
  };

  const handleResume = async (company: Company) => {
    try {
      await resumeCompany(company.id).unwrap();
      toast.success("Company access resumed successfully");
      refetch();
    } catch (error: any) {
      toast.error(error?.data?.error?.message || "Failed to resume company");
    }
  };

  const handleActivate = async (company: Company) => {
    try {
      await activateCompany(company.id).unwrap();
      toast.success("Company activated successfully");
      refetch();
    } catch (error: any) {
      toast.error(error?.data?.error?.message || "Failed to activate company");
    }
  };

  const handleDeactivate = async () => {
    if (!selectedCompany) return;
    try {
      await deactivateCompany(selectedCompany.id).unwrap();
      toast.success("Company deactivated successfully");
      setIsDeactivateDialogOpen(false);
      setSelectedCompany(null);
      refetch();
    } catch (error: any) {
      toast.error(error?.data?.error?.message || "Failed to deactivate company");
    }
  };

  const handleView = (company: Company) => {
    setViewCompanyId(company.id);
    setIsViewDialogOpen(true);
  };

  const handleResetTrial = async () => {
    if (!selectedCompany) return;
    try {
      await resetTrial({
        id: selectedCompany.id,
        days: parseInt(trialDays) || 14,
      }).unwrap();
      toast.success("Trial reset successfully");
      setIsResetTrialDialogOpen(false);
      setSelectedCompany(null);
      setTrialDays("14");
      refetch();
    } catch (error: any) {
      toast.error(error?.data?.error?.message || "Failed to reset trial");
    }
  };

  const resetForm = () => {
    setFormData({
      name: "",
      email: "",
      phone: "",
      address: {
        street: "",
        city: "",
        state: "",
        zipCode: "",
        country: "India",
      },
      subscriptionPlan: "free",
      subscriptionPlanId: "",
    });
  };

  const openEditDialog = (company: Company) => {
    setSelectedCompany(company);
    setFormData({
      name: company.name,
      email: company.email,
      phone: company.phone,
      address: company.address || {
        street: "",
        city: "",
        state: "",
        zipCode: "",
        country: "India",
      },
      subscriptionPlan: company.subscriptionPlan || "free",
      subscriptionPlanId: company.subscriptionPlanId || "",
    });
    setIsEditDialogOpen(true);
  };

  const getStatusBadge = (company: Company) => {
    if (company.isSuspended) {
      return <Badge variant="destructive">Suspended</Badge>;
    }
    if (!company.isActive) {
      return <Badge variant="secondary">Inactive</Badge>;
    }
    const statusMap: Record<string, { variant: "default" | "secondary" | "destructive" | "outline"; label: string }> = {
      active: { variant: "default", label: "Active" },
      trial: { variant: "outline", label: "Trial" },
      expired: { variant: "destructive", label: "Expired" },
      cancelled: { variant: "secondary", label: "Cancelled" },
    };
    const status = statusMap[company.subscriptionStatus] || statusMap.active;
    return <Badge variant={status.variant}>{status.label}</Badge>;
  };

  return (
    <MainLayout>
      <main className="p-4">
        <div className="mx-auto space-y-6">
          {/* Header */}
          <div className="flex flex-col sm:flex-row justify-between gap-4 items-start sm:items-center">
            <div>
              <h1 className="text-3xl font-bold text-foreground mb-2">
                Manage Companies
              </h1>
              <p className="text-muted-foreground">
                Manage all companies on the platform
              </p>
            </div>
            <Button onClick={() => setIsCreateDialogOpen(true)}>
              <Plus className="w-4 h-4 mr-2" />
              Create Company
            </Button>
          </div>

          {/* Filters */}
          <Card>
            <CardContent className="pt-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <Label htmlFor="search">Search</Label>
                  <div className="relative">
                    <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="search"
                      placeholder="Search by name or email..."
                      value={search}
                      onChange={(e) => {
                        setSearch(e.target.value);
                        setPage(1);
                      }}
                      className="pl-8"
                    />
                  </div>
                </div>
                <div>
                  <Label htmlFor="status">Status</Label>
                  <Select
                    value={statusFilter || "all"}
                    onValueChange={(value) => {
                      setStatusFilter(value === "all" ? "" : value);
                      setPage(1);
                    }}
                  >
                    <SelectTrigger id="status">
                      <SelectValue placeholder="All statuses" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All statuses</SelectItem>
                      <SelectItem value="active">Active</SelectItem>
                      <SelectItem value="inactive">Inactive</SelectItem>
                      <SelectItem value="suspended">Suspended</SelectItem>
                      <SelectItem value="expired">Expired</SelectItem>
                      <SelectItem value="trial">Trial</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="plan">Plan</Label>
                  <Select
                    value={planFilter || "all"}
                    onValueChange={(value) => {
                      setPlanFilter(value === "all" ? "" : value);
                      setPage(1);
                    }}
                  >
                    <SelectTrigger id="plan">
                      <SelectValue placeholder="All plans" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All plans</SelectItem>
                      <SelectItem value="free">Free</SelectItem>
                      <SelectItem value="basic">Basic</SelectItem>
                      <SelectItem value="premium">Premium</SelectItem>
                      <SelectItem value="enterprise">Enterprise</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Table */}
          <Card>
            <CardHeader>
              <CardTitle>Companies</CardTitle>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="space-y-2">
                  {[...Array(5)].map((_, i) => (
                    <Skeleton key={i} className="h-16 w-full" />
                  ))}
                </div>
              ) : (
                <>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Name</TableHead>
                        <TableHead>Email</TableHead>
                        <TableHead>Plan</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Users</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {data?.data?.companies?.map((company) => (
                        <TableRow key={company.id}>
                          <TableCell className="font-medium">
                            {company.name}
                          </TableCell>
                          <TableCell>{company.email}</TableCell>
                          <TableCell>
                            <Badge variant="outline">
                              {company.subscriptionPlan || "free"}
                            </Badge>
                          </TableCell>
                          <TableCell>{getStatusBadge(company)}</TableCell>
                          <TableCell>
                            {company.usage ? (
                              <div className="text-sm">
                                <div>Admins: {company.usage.currentAdmins || 0} / {company.userLimits?.maxAdmins || 0}</div>
                                <div>Recruiters: {company.usage.currentRecruiters || 0} / {company.userLimits?.maxRecruiters || 0}</div>
                                <div>Managers: {company.usage.currentManagers || 0} / {company.userLimits?.maxManagers || 0}</div>
                              </div>
                            ) : (
                              <span className="text-muted-foreground">N/A</span>
                            )}
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleView(company)}
                                title="View Company Details"
                              >
                                <Eye className="w-4 h-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => openEditDialog(company)}
                                title="Edit Company"
                              >
                                <Edit className="w-4 h-4" />
                              </Button>
                              {company.isSuspended ? (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleResume(company)}
                                  disabled={isResuming}
                                >
                                  <Play className="w-4 h-4 text-green-600" />
                                </Button>
                              ) : (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => {
                                    setSelectedCompany(company);
                                    setIsSuspendDialogOpen(true);
                                  }}
                                >
                                  <Ban className="w-4 h-4 text-orange-600" />
                                </Button>
                              )}
                              {company.isActive ? (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => {
                                    setSelectedCompany(company);
                                    setIsDeactivateDialogOpen(true);
                                  }}
                                  title="Deactivate Company"
                                >
                                  <XCircle className="w-4 h-4 text-orange-600" />
                                </Button>
                              ) : (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleActivate(company)}
                                  disabled={isActivating}
                                >
                                  <CheckCircle className="w-4 h-4 text-green-600" />
                                </Button>
                              )}
                              {company.subscriptionStatus === 'trial' && (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => {
                                    setSelectedCompany(company);
                                    setIsResetTrialDialogOpen(true);
                                  }}
                                  title="Reset Trial"
                                >
                                  <RotateCcw className="w-4 h-4 text-blue-600" />
                                </Button>
                              )}
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => {
                                  setSelectedCompany(company);
                                  setIsDeleteDialogOpen(true);
                                }}
                                title="Delete Company"
                              >
                                <Trash2 className="w-4 h-4 text-red-600" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>

                  {/* Pagination */}
                  {data?.data?.pagination && (
                    <div className="flex items-center justify-between mt-4">
                      <p className="text-sm text-muted-foreground">
                        Showing {((page - 1) * 10) + 1} to{" "}
                        {Math.min(page * 10, data.data.pagination.total)} of{" "}
                        {data.data.pagination.total} companies
                      </p>
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setPage((p) => Math.max(1, p - 1))}
                          disabled={page === 1}
                        >
                          Previous
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setPage((p) => p + 1)}
                          disabled={page >= data.data.pagination.pages}
                        >
                          Next
                        </Button>
                      </div>
                    </div>
                  )}
                </>
              )}
            </CardContent>
          </Card>
        </div>
      </main>

      {/* Create Dialog */}
      <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Create Company</DialogTitle>
            <DialogDescription>
              Create a new company account on the platform
            </DialogDescription>
          </DialogHeader>
          <Alert className="mb-4">
            <Info className="h-4 w-4" />
            <AlertDescription>
              <strong>Admin Credentials:</strong> The email address you provide will automatically become the Admin login email. Admin credentials will be sent to the registered email address.
            </AlertDescription>
          </Alert>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="name">Company Name *</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) =>
                    setFormData({ ...formData, name: e.target.value })
                  }
                />
              </div>
              <div>
                <Label htmlFor="email">Admin Email *</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="admin@company.com"
                  value={formData.email}
                  onChange={(e) =>
                    setFormData({ ...formData, email: e.target.value })
                  }
                />
                <p className="text-xs text-muted-foreground mt-1">
                  This email will be used as the Admin login email
                </p>
              </div>
            </div>
            <div>
              <Label htmlFor="phone">Phone *</Label>
              <Input
                id="phone"
                value={formData.phone}
                onChange={(e) =>
                  setFormData({ ...formData, phone: e.target.value })
                }
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="street">Street</Label>
                <Input
                  id="street"
                  value={formData.address.street}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      address: { ...formData.address, street: e.target.value },
                    })
                  }
                />
              </div>
              <div>
                <Label htmlFor="city">City</Label>
                <Input
                  id="city"
                  value={formData.address.city}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      address: { ...formData.address, city: e.target.value },
                    })
                  }
                />
              </div>
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div>
                <Label htmlFor="state">State</Label>
                <Input
                  id="state"
                  value={formData.address.state}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      address: { ...formData.address, state: e.target.value },
                    })
                  }
                />
              </div>
              <div>
                <Label htmlFor="zipCode">Zip Code</Label>
                <Input
                  id="zipCode"
                  value={formData.address.zipCode}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      address: { ...formData.address, zipCode: e.target.value },
                    })
                  }
                />
              </div>
              <div>
                <Label htmlFor="country">Country</Label>
                <Input
                  id="country"
                  value={formData.address.country}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      address: { ...formData.address, country: e.target.value },
                    })
                  }
                />
              </div>
            </div>
            <div>
              <Label htmlFor="subscriptionPlan">Subscription Plan</Label>
              <Select
                value={formData.subscriptionPlan}
                onValueChange={(value) =>
                  setFormData({ ...formData, subscriptionPlan: value })
                }
              >
                <SelectTrigger id="subscriptionPlan">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {plans.map((plan) => (
                    <SelectItem key={plan.id} value={plan.name}>
                      {plan.displayName} - ${plan.monthlyPrice || (plan as any).price || 0}/{plan.currency || 'USD'}/mo
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setIsCreateDialogOpen(false);
                resetForm();
              }}
            >
              Cancel
            </Button>
            <Button onClick={handleCreate} disabled={isCreating}>
              {isCreating ? "Creating..." : "Create Company"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Company</DialogTitle>
            <DialogDescription>
              Update company information
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="edit-name">Company Name *</Label>
                <Input
                  id="edit-name"
                  value={formData.name}
                  onChange={(e) =>
                    setFormData({ ...formData, name: e.target.value })
                  }
                />
              </div>
              <div>
                <Label htmlFor="edit-email">Email *</Label>
                <Input
                  id="edit-email"
                  type="email"
                  value={formData.email}
                  onChange={(e) =>
                    setFormData({ ...formData, email: e.target.value })
                  }
                />
              </div>
            </div>
            <div>
              <Label htmlFor="edit-phone">Phone *</Label>
              <Input
                id="edit-phone"
                value={formData.phone}
                onChange={(e) =>
                  setFormData({ ...formData, phone: e.target.value })
                }
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="edit-street">Street</Label>
                <Input
                  id="edit-street"
                  value={formData.address.street}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      address: { ...formData.address, street: e.target.value },
                    })
                  }
                />
              </div>
              <div>
                <Label htmlFor="edit-city">City</Label>
                <Input
                  id="edit-city"
                  value={formData.address.city}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      address: { ...formData.address, city: e.target.value },
                    })
                  }
                />
              </div>
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div>
                <Label htmlFor="edit-state">State</Label>
                <Input
                  id="edit-state"
                  value={formData.address.state}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      address: { ...formData.address, state: e.target.value },
                    })
                  }
                />
              </div>
              <div>
                <Label htmlFor="edit-zipCode">Zip Code</Label>
                <Input
                  id="edit-zipCode"
                  value={formData.address.zipCode}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      address: { ...formData.address, zipCode: e.target.value },
                    })
                  }
                />
              </div>
              <div>
                <Label htmlFor="edit-country">Country</Label>
                <Input
                  id="edit-country"
                  value={formData.address.country}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      address: { ...formData.address, country: e.target.value },
                    })
                  }
                />
              </div>
            </div>
            <div>
              <Label htmlFor="edit-subscriptionPlan">Subscription Plan</Label>
              <Select
                value={formData.subscriptionPlan}
                onValueChange={(value) =>
                  setFormData({ ...formData, subscriptionPlan: value })
                }
              >
                <SelectTrigger id="edit-subscriptionPlan">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {plans.map((plan) => (
                    <SelectItem key={plan.id} value={plan.name}>
                      {plan.displayName} - ${plan.monthlyPrice || (plan as any).price || 0}/{plan.currency || 'USD'}/mo
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setIsEditDialogOpen(false);
                setSelectedCompany(null);
                resetForm();
              }}
            >
              Cancel
            </Button>
            <Button onClick={handleUpdate} disabled={isUpdating}>
              {isUpdating ? "Updating..." : "Update Company"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Dialog */}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Company?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete the company "{selectedCompany?.name}" and all related data.
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={isDeleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isDeleting ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Deactivate Dialog */}
      <AlertDialog open={isDeactivateDialogOpen} onOpenChange={setIsDeactivateDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Deactivate Company?</AlertDialogTitle>
            <AlertDialogDescription>
              This will deactivate the company "{selectedCompany?.name}". Users will not be able to log in.
              This action can be reversed.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeactivate}
              disabled={isDeactivating}
              className="bg-orange-600 text-white hover:bg-orange-700"
            >
              {isDeactivating ? "Deactivating..." : "Deactivate"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Suspend Dialog */}
      <Dialog open={isSuspendDialogOpen} onOpenChange={setIsSuspendDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Suspend Company</DialogTitle>
            <DialogDescription>
              Suspend access for "{selectedCompany?.name}". Provide a reason for suspension.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="suspend-reason">Reason</Label>
              <Textarea
                id="suspend-reason"
                value={suspendReason}
                onChange={(e) => setSuspendReason(e.target.value)}
                placeholder="Enter reason for suspension..."
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setIsSuspendDialogOpen(false);
                setSelectedCompany(null);
                setSuspendReason("");
              }}
            >
              Cancel
            </Button>
            <Button
              onClick={handleSuspend}
              disabled={isSuspending || !suspendReason.trim()}
              className="bg-orange-600 hover:bg-orange-700"
            >
              {isSuspending ? "Suspending..." : "Suspend Company"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* View Dialog (Read-Only) */}
      <Dialog open={isViewDialogOpen} onOpenChange={setIsViewDialogOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Company Details</DialogTitle>
            <DialogDescription>
              View company information (Read-only)
            </DialogDescription>
          </DialogHeader>
          {isLoadingViewCompany ? (
            <div className="space-y-4">
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-full" />
            </div>
          ) : viewCompanyData?.data?.company ? (
            <div className="space-y-6">
              {/* Company Info */}
              <div>
                <h3 className="text-lg font-semibold mb-3">Company Information</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-muted-foreground">Company Name</Label>
                    <p className="font-medium">{viewCompanyData.data.company.companyName || viewCompanyData.data.company.name}</p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">Email</Label>
                    <p className="font-medium">{viewCompanyData.data.company.companyEmail || viewCompanyData.data.company.email}</p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">Company ID</Label>
                    <p className="font-medium text-sm">{viewCompanyData.data.company.companyId || viewCompanyData.data.company.id}</p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">Created Date</Label>
                    <p className="font-medium">{new Date(viewCompanyData.data.company.createdAt).toLocaleDateString()}</p>
                  </div>
                </div>
              </div>

              {/* Subscription */}
              <div>
                <h3 className="text-lg font-semibold mb-3">Subscription</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-muted-foreground">Plan Type</Label>
                    <p className="font-medium">{viewCompanyData.data.company.planType || 'trial'}</p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">Subscription Status</Label>
                    <Badge variant={viewCompanyData.data.company.subscriptionStatus === 'active' ? 'default' : 'outline'}>
                      {viewCompanyData.data.company.subscriptionStatus}
                    </Badge>
                  </div>
                  {viewCompanyData.data.company.trial && (
                    <>
                      <div>
                        <Label className="text-muted-foreground">Trial Start Date</Label>
                        <p className="font-medium">
                          {viewCompanyData.data.company.trial.trialStartDate
                            ? new Date(viewCompanyData.data.company.trial.trialStartDate).toLocaleDateString()
                            : 'N/A'}
                        </p>
                      </div>
                      <div>
                        <Label className="text-muted-foreground">Trial End Date</Label>
                        <p className="font-medium">
                          {viewCompanyData.data.company.trial.trialEndDate
                            ? new Date(viewCompanyData.data.company.trial.trialEndDate).toLocaleDateString()
                            : 'N/A'}
                        </p>
                      </div>
                    </>
                  )}
                </div>
              </div>

              {/* User Limits */}
              <div>
                <h3 className="text-lg font-semibold mb-3">User Limits</h3>
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <Label className="text-muted-foreground">Max Admins</Label>
                    <p className="font-medium">{viewCompanyData.data.company.userLimits?.maxAdmins || 0}</p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">Max Recruiters</Label>
                    <p className="font-medium">{viewCompanyData.data.company.userLimits?.maxRecruiters || 0}</p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">Max Managers</Label>
                    <p className="font-medium">{viewCompanyData.data.company.userLimits?.maxManagers || 0}</p>
                  </div>
                </div>
              </div>

              {/* Usage */}
              <div>
                <h3 className="text-lg font-semibold mb-3">Current Usage</h3>
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <Label className="text-muted-foreground">Current Admins</Label>
                    <p className="font-medium">
                      {viewCompanyData.data.company.usage?.currentAdmins || 0} / {viewCompanyData.data.company.userLimits?.maxAdmins || 0}
                    </p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">Current Recruiters</Label>
                    <p className="font-medium">
                      {viewCompanyData.data.company.usage?.currentRecruiters || 0} / {viewCompanyData.data.company.userLimits?.maxRecruiters || 0}
                    </p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">Current Managers</Label>
                    <p className="font-medium">
                      {viewCompanyData.data.company.usage?.currentManagers || 0} / {viewCompanyData.data.company.userLimits?.maxManagers || 0}
                    </p>
                  </div>
                </div>
              </div>

              {/* Flags */}
              <div>
                <h3 className="text-lg font-semibold mb-3">Status Flags</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-muted-foreground">Is Active</Label>
                    <Badge variant={viewCompanyData.data.company.isActive ? 'default' : 'secondary'}>
                      {viewCompanyData.data.company.isActive ? 'Yes' : 'No'}
                    </Badge>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">Is Trial</Label>
                    <Badge variant={viewCompanyData.data.company.isTrial ? 'outline' : 'secondary'}>
                      {viewCompanyData.data.company.isTrial ? 'Yes' : 'No'}
                    </Badge>
                  </div>
                </div>
              </div>

              {/* Audit Info */}
              {(viewCompanyData.data.company.createdBy || viewCompanyData.data.company.updatedBy) && (
                <div>
                  <h3 className="text-lg font-semibold mb-3">Audit Information</h3>
                  <div className="grid grid-cols-2 gap-4">
                    {viewCompanyData.data.company.createdBy && (
                      <div>
                        <Label className="text-muted-foreground">Created By</Label>
                        <p className="font-medium">
                          {viewCompanyData.data.company.createdBy.name} ({viewCompanyData.data.company.createdBy.email})
                        </p>
                      </div>
                    )}
                    {viewCompanyData.data.company.updatedBy && (
                      <div>
                        <Label className="text-muted-foreground">Last Updated By</Label>
                        <p className="font-medium">
                          {viewCompanyData.data.company.updatedBy.name} ({viewCompanyData.data.company.updatedBy.email})
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <Alert>
              <AlertDescription>Failed to load company details</AlertDescription>
            </Alert>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => {
              setIsViewDialogOpen(false);
              setViewCompanyId(null);
            }}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reset Trial Dialog */}
      <Dialog open={isResetTrialDialogOpen} onOpenChange={setIsResetTrialDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reset Trial</DialogTitle>
            <DialogDescription>
              Reset trial period for "{selectedCompany?.name}". Extend the trial end date.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="trial-days">Extend Trial By (Days)</Label>
              <Input
                id="trial-days"
                type="number"
                min="1"
                value={trialDays}
                onChange={(e) => setTrialDays(e.target.value)}
                placeholder="14"
              />
              <p className="text-xs text-muted-foreground mt-1">
                Trial will be extended from today by the specified number of days
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setIsResetTrialDialogOpen(false);
                setSelectedCompany(null);
                setTrialDays("14");
              }}
            >
              Cancel
            </Button>
            <Button
              onClick={handleResetTrial}
              disabled={isResettingTrial || !trialDays || parseInt(trialDays) <= 0}
              className="bg-blue-600 hover:bg-blue-700"
            >
              {isResettingTrial ? "Resetting..." : "Reset Trial"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </MainLayout>
  );
};

export default ManageCompanies;

