import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
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
import MainLayout from "@/components/MainLayout";
import {
  useGetSubscriptionPlansQuery,
  useGetSubscriptionPlanByIdQuery,
  useCreateSubscriptionPlanMutation,
  useUpdateSubscriptionPlanMutation,
  SubscriptionPlan,
} from "@/store/api/superAdminApi";
import { Plus, Edit, Save, X, Check, AlertTriangle, DollarSign, Users, Zap } from "lucide-react";
import { toast } from "sonner";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { Alert, AlertDescription } from "@/components/ui/alert";

const SubscriptionManagement = () => {
  const [activeTab, setActiveTab] = useState("plans");
  const [editingPlan, setEditingPlan] = useState<SubscriptionPlan | null>(null);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [warnings, setWarnings] = useState<string[]>([]);

  const { data: plansData, isLoading, refetch } = useGetSubscriptionPlansQuery();
  const plans = plansData?.data?.plans || [];

  const [createPlan, { isLoading: isCreating }] = useCreateSubscriptionPlanMutation();
  const [updatePlan, { isLoading: isUpdating }] = useUpdateSubscriptionPlanMutation();

  // Form state
  const [formData, setFormData] = useState<Partial<SubscriptionPlan>>({
    name: "standard",
    displayName: "",
    description: "",
    status: "active",
    monthlyPrice: 0,
    yearlyPrice: 0,
    currency: "USD",
    trialPeriodDays: 14,
    features: {
      recruitment: false,
      performance: false,
      payroll: false,
      lms: false,
      assetManagement: false,
      integrations: false,
      advancedAnalytics: false,
      customRolesPermissions: false,
      maxUsers: 10,
      maxManagers: 2,
      maxJobPostings: 5,
      maxCandidatesPerMonth: 50,
      maxStorage: 5,
      apiRateLimit: 1000,
      whatsappNotificationLimit: 100,
      voiceNotificationLimit: 50,
      support: "basic",
    },
  });

  const handleCreate = async () => {
    try {
      await createPlan(formData as any).unwrap();
      toast.success("Subscription plan created successfully");
      setIsCreateDialogOpen(false);
      resetForm();
      refetch();
    } catch (error: any) {
      toast.error(error?.data?.error?.message || "Failed to create plan");
    }
  };

  const handleUpdate = async () => {
    if (!editingPlan) return;
    try {
      const result = await updatePlan({
        id: editingPlan.id,
        data: formData,
      }).unwrap();
      
      if (result.warnings && result.warnings.length > 0) {
        setWarnings(result.warnings);
        toast.warning("Plan updated with warnings");
      } else {
        toast.success("Plan updated successfully");
      }
      setIsEditDialogOpen(false);
      setEditingPlan(null);
      resetForm();
      refetch();
    } catch (error: any) {
      toast.error(error?.data?.error?.message || "Failed to update plan");
    }
  };

  const openEditDialog = (plan: SubscriptionPlan) => {
    setEditingPlan(plan);
    setFormData({
      ...plan,
      features: { ...plan.features },
    });
    setIsEditDialogOpen(true);
    setWarnings([]);
  };

  const resetForm = () => {
    setFormData({
      name: "standard",
      displayName: "",
      description: "",
      status: "active",
      monthlyPrice: 0,
      yearlyPrice: 0,
      currency: "USD",
      trialPeriodDays: 14,
      features: {
        recruitment: false,
        performance: false,
        payroll: false,
        lms: false,
        assetManagement: false,
        integrations: false,
        advancedAnalytics: false,
        customRolesPermissions: false,
        maxUsers: 10,
        maxManagers: 2,
        maxJobPostings: 5,
        maxCandidatesPerMonth: 50,
        maxStorage: 5,
        apiRateLimit: 1000,
        whatsappNotificationLimit: 100,
        voiceNotificationLimit: 50,
        support: "basic",
      },
    });
  };

  const getStatusBadge = (plan: SubscriptionPlan) => {
    if (plan.status === "active") {
      return <Badge variant="default">Active</Badge>;
    }
    return <Badge variant="secondary">Inactive</Badge>;
  };

  return (
    <MainLayout>
      <main className="p-4">
        <div className="mx-auto space-y-6 max-w-7xl">
          {/* Header */}
          <div className="flex flex-col sm:flex-row justify-between gap-4 items-start sm:items-center">
            <div>
              <h1 className="text-3xl font-bold text-foreground mb-2">
                Subscription Management
              </h1>
              <p className="text-muted-foreground">
                Manage subscription plans, features, and pricing
              </p>
            </div>
            <Button onClick={() => setIsCreateDialogOpen(true)}>
              <Plus className="w-4 h-4 mr-2" />
              Create Plan
            </Button>
          </div>

          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList>
              <TabsTrigger value="plans">All Plans</TabsTrigger>
              <TabsTrigger value="compare">Compare Plans</TabsTrigger>
            </TabsList>

            {/* All Plans Tab */}
            <TabsContent value="plans">
              <Card>
                <CardHeader>
                  <CardTitle>Subscription Plans</CardTitle>
                  <CardDescription>
                    Manage Standard, Medium, and Enterprise plans
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {isLoading ? (
                    <div className="space-y-4">
                      {[...Array(3)].map((_, i) => (
                        <Skeleton key={i} className="h-32" />
                      ))}
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {plans.map((plan) => (
                        <Card key={plan.id} className="border-2">
                          <CardHeader>
                            <div className="flex items-center justify-between">
                              <div>
                                <CardTitle className="text-xl">{plan.displayName}</CardTitle>
                                <CardDescription className="mt-1">
                                  {plan.description || "No description"}
                                </CardDescription>
                              </div>
                              <div className="flex items-center gap-3">
                                {getStatusBadge(plan)}
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => openEditDialog(plan)}
                                >
                                  <Edit className="w-4 h-4 mr-2" />
                                  Edit
                                </Button>
                              </div>
                            </div>
                          </CardHeader>
                          <CardContent>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                              <div>
                                <div className="flex items-center gap-2 mb-2">
                                  <DollarSign className="w-4 h-4 text-muted-foreground" />
                                  <span className="text-sm font-medium">Pricing</span>
                                </div>
                                <div className="space-y-1">
                                  <p className="text-lg font-bold">
                                    ${plan.monthlyPrice}/{plan.currency} per month
                                  </p>
                                  <p className="text-sm text-muted-foreground">
                                    ${plan.yearlyPrice}/{plan.currency} per year
                                  </p>
                                </div>
                              </div>
                              <div>
                                <div className="flex items-center gap-2 mb-2">
                                  <Users className="w-4 h-4 text-muted-foreground" />
                                  <span className="text-sm font-medium">Limits</span>
                                </div>
                                <div className="space-y-1 text-sm">
                                  <p>Max Users: {plan.features.maxUsers}</p>
                                  <p>Max Managers: {plan.features.maxManagers}</p>
                                  <p>Storage: {plan.features.maxStorage} GB</p>
                                </div>
                              </div>
                              <div>
                                <div className="flex items-center gap-2 mb-2">
                                  <Zap className="w-4 h-4 text-muted-foreground" />
                                  <span className="text-sm font-medium">Features</span>
                                </div>
                                <div className="flex flex-wrap gap-1">
                                  {plan.features.recruitment && (
                                    <Badge variant="outline" className="text-xs">
                                      Recruitment
                                    </Badge>
                                  )}
                                  {plan.features.payroll && (
                                    <Badge variant="outline" className="text-xs">
                                      Payroll
                                    </Badge>
                                  )}
                                  {plan.features.performance && (
                                    <Badge variant="outline" className="text-xs">
                                      Performance
                                    </Badge>
                                  )}
                                  {plan.features.lms && (
                                    <Badge variant="outline" className="text-xs">
                                      LMS
                                    </Badge>
                                  )}
                                  {plan.features.advancedAnalytics && (
                                    <Badge variant="outline" className="text-xs">
                                      Analytics
                                    </Badge>
                                  )}
                                </div>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* Compare Plans Tab */}
            <TabsContent value="compare">
              <Card>
                <CardHeader>
                  <CardTitle>Compare Plans</CardTitle>
                  <CardDescription>
                    Side-by-side comparison of all subscription plans
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {isLoading ? (
                    <Skeleton className="h-96" />
                  ) : (
                    <div className="overflow-x-auto">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Feature</TableHead>
                            {plans.map((plan) => (
                              <TableHead key={plan.id} className="text-center">
                                {plan.displayName}
                              </TableHead>
                            ))}
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          <TableRow>
                            <TableCell className="font-medium">Monthly Price</TableCell>
                            {plans.map((plan) => (
                              <TableCell key={plan.id} className="text-center">
                                ${plan.monthlyPrice}
                              </TableCell>
                            ))}
                          </TableRow>
                          <TableRow>
                            <TableCell className="font-medium">Yearly Price</TableCell>
                            {plans.map((plan) => (
                              <TableCell key={plan.id} className="text-center">
                                ${plan.yearlyPrice}
                              </TableCell>
                            ))}
                          </TableRow>
                          <TableRow>
                            <TableCell className="font-medium">Max Users</TableCell>
                            {plans.map((plan) => (
                              <TableCell key={plan.id} className="text-center">
                                {plan.features.maxUsers}
                              </TableCell>
                            ))}
                          </TableRow>
                          <TableRow>
                            <TableCell className="font-medium">Max Managers</TableCell>
                            {plans.map((plan) => (
                              <TableCell key={plan.id} className="text-center">
                                {plan.features.maxManagers}
                              </TableCell>
                            ))}
                          </TableRow>
                          <TableRow>
                            <TableCell className="font-medium">Storage (GB)</TableCell>
                            {plans.map((plan) => (
                              <TableCell key={plan.id} className="text-center">
                                {plan.features.maxStorage}
                              </TableCell>
                            ))}
                          </TableRow>
                          <TableRow>
                            <TableCell className="font-medium">Recruitment</TableCell>
                            {plans.map((plan) => (
                              <TableCell key={plan.id} className="text-center">
                                {plan.features.recruitment ? (
                                  <Check className="w-5 h-5 text-green-600 mx-auto" />
                                ) : (
                                  <X className="w-5 h-5 text-red-600 mx-auto" />
                                )}
                              </TableCell>
                            ))}
                          </TableRow>
                          <TableRow>
                            <TableCell className="font-medium">Payroll</TableCell>
                            {plans.map((plan) => (
                              <TableCell key={plan.id} className="text-center">
                                {plan.features.payroll ? (
                                  <Check className="w-5 h-5 text-green-600 mx-auto" />
                                ) : (
                                  <X className="w-5 h-5 text-red-600 mx-auto" />
                                )}
                              </TableCell>
                            ))}
                          </TableRow>
                          <TableRow>
                            <TableCell className="font-medium">Performance</TableCell>
                            {plans.map((plan) => (
                              <TableCell key={plan.id} className="text-center">
                                {plan.features.performance ? (
                                  <Check className="w-5 h-5 text-green-600 mx-auto" />
                                ) : (
                                  <X className="w-5 h-5 text-red-600 mx-auto" />
                                )}
                              </TableCell>
                            ))}
                          </TableRow>
                          <TableRow>
                            <TableCell className="font-medium">LMS</TableCell>
                            {plans.map((plan) => (
                              <TableCell key={plan.id} className="text-center">
                                {plan.features.lms ? (
                                  <Check className="w-5 h-5 text-green-600 mx-auto" />
                                ) : (
                                  <X className="w-5 h-5 text-red-600 mx-auto" />
                                )}
                              </TableCell>
                            ))}
                          </TableRow>
                          <TableRow>
                            <TableCell className="font-medium">Advanced Analytics</TableCell>
                            {plans.map((plan) => (
                              <TableCell key={plan.id} className="text-center">
                                {plan.features.advancedAnalytics ? (
                                  <Check className="w-5 h-5 text-green-600 mx-auto" />
                                ) : (
                                  <X className="w-5 h-5 text-red-600 mx-auto" />
                                )}
                              </TableCell>
                            ))}
                          </TableRow>
                          <TableRow>
                            <TableCell className="font-medium">Support</TableCell>
                            {plans.map((plan) => (
                              <TableCell key={plan.id} className="text-center">
                                <Badge variant="outline">
                                  {plan.features.support}
                                </Badge>
                              </TableCell>
                            ))}
                          </TableRow>
                        </TableBody>
                      </Table>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </main>

      {/* Create/Edit Dialog */}
      <Dialog
        open={isCreateDialogOpen || isEditDialogOpen}
        onOpenChange={(open) => {
          if (!open) {
            setIsCreateDialogOpen(false);
            setIsEditDialogOpen(false);
            setEditingPlan(null);
            resetForm();
            setWarnings([]);
          }
        }}
      >
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {isEditDialogOpen ? "Edit Subscription Plan" : "Create Subscription Plan"}
            </DialogTitle>
            <DialogDescription>
              {isEditDialogOpen
                ? "Update plan features, pricing, and limits"
                : "Create a new subscription plan"}
            </DialogDescription>
          </DialogHeader>

          {warnings.length > 0 && (
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                <div className="font-semibold mb-2">Impact Warnings:</div>
                <ul className="list-disc list-inside space-y-1">
                  {warnings.map((warning, i) => (
                    <li key={i}>{warning}</li>
                  ))}
                </ul>
              </AlertDescription>
            </Alert>
          )}

          <div className="space-y-6">
            {/* General Info */}
            <div>
              <h3 className="text-lg font-semibold mb-4">General Information</h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="name">Plan Name *</Label>
                  <Select
                    value={formData.name}
                    onValueChange={(value) =>
                      setFormData({ ...formData, name: value as any })
                    }
                    disabled={isEditDialogOpen}
                  >
                    <SelectTrigger id="name">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="standard">Standard</SelectItem>
                      <SelectItem value="medium">Medium</SelectItem>
                      <SelectItem value="enterprise">Enterprise</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="displayName">Display Name *</Label>
                  <Input
                    id="displayName"
                    value={formData.displayName}
                    onChange={(e) =>
                      setFormData({ ...formData, displayName: e.target.value })
                    }
                  />
                </div>
              </div>
              <div className="mt-4">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={formData.description || ""}
                  onChange={(e) =>
                    setFormData({ ...formData, description: e.target.value })
                  }
                  rows={3}
                />
              </div>
              <div className="grid grid-cols-3 gap-4 mt-4">
                <div>
                  <Label htmlFor="status">Status</Label>
                  <Select
                    value={formData.status}
                    onValueChange={(value) =>
                      setFormData({ ...formData, status: value as any })
                    }
                  >
                    <SelectTrigger id="status">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="active">Active</SelectItem>
                      <SelectItem value="inactive">Inactive</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="currency">Currency</Label>
                  <Input
                    id="currency"
                    value={formData.currency}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        currency: e.target.value.toUpperCase(),
                      })
                    }
                  />
                </div>
                <div>
                  <Label htmlFor="trialPeriodDays">Trial Period (Days)</Label>
                  <Input
                    id="trialPeriodDays"
                    type="number"
                    value={formData.trialPeriodDays}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        trialPeriodDays: parseInt(e.target.value) || 0,
                      })
                    }
                  />
                </div>
              </div>
            </div>

            {/* Pricing */}
            <div>
              <h3 className="text-lg font-semibold mb-4">Pricing</h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="monthlyPrice">Monthly Price *</Label>
                  <Input
                    id="monthlyPrice"
                    type="number"
                    step="0.01"
                    value={formData.monthlyPrice}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        monthlyPrice: parseFloat(e.target.value) || 0,
                      })
                    }
                  />
                </div>
                <div>
                  <Label htmlFor="yearlyPrice">Yearly Price *</Label>
                  <Input
                    id="yearlyPrice"
                    type="number"
                    step="0.01"
                    value={formData.yearlyPrice}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        yearlyPrice: parseFloat(e.target.value) || 0,
                      })
                    }
                  />
                </div>
              </div>
            </div>

            {/* Feature Toggles */}
            <div>
              <h3 className="text-lg font-semibold mb-4">Feature Toggles</h3>
              <div className="grid grid-cols-2 gap-4">
                {[
                  { key: "recruitment", label: "Recruitment Module" },
                  { key: "performance", label: "Performance Module" },
                  { key: "payroll", label: "Payroll Module" },
                  { key: "lms", label: "LMS Module" },
                  { key: "assetManagement", label: "Asset Management" },
                  { key: "integrations", label: "Integrations Access" },
                  { key: "advancedAnalytics", label: "Advanced Analytics" },
                  { key: "customRolesPermissions", label: "Custom Roles & Permissions" },
                ].map((feature) => (
                  <div
                    key={feature.key}
                    className="flex items-center justify-between p-3 border rounded-lg"
                  >
                    <Label htmlFor={feature.key}>{feature.label}</Label>
                    <Switch
                      id={feature.key}
                      checked={formData.features?.[feature.key as keyof typeof formData.features] as boolean || false}
                      onCheckedChange={(checked) =>
                        setFormData({
                          ...formData,
                          features: {
                            ...formData.features!,
                            [feature.key]: checked,
                          },
                        })
                      }
                    />
                  </div>
                ))}
              </div>
            </div>

            {/* Usage Limits */}
            <div>
              <h3 className="text-lg font-semibold mb-4">Usage Limits</h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div>
                  <Label htmlFor="maxUsers">Max Users *</Label>
                  <Input
                    id="maxUsers"
                    type="number"
                    value={formData.features?.maxUsers}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        features: {
                          ...formData.features!,
                          maxUsers: parseInt(e.target.value) || 0,
                        },
                      })
                    }
                  />
                </div>
                <div>
                  <Label htmlFor="maxManagers">Max Managers *</Label>
                  <Input
                    id="maxManagers"
                    type="number"
                    value={formData.features?.maxManagers}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        features: {
                          ...formData.features!,
                          maxManagers: parseInt(e.target.value) || 0,
                        },
                      })
                    }
                  />
                </div>
                <div>
                  <Label htmlFor="maxJobPostings">Max Job Postings</Label>
                  <Input
                    id="maxJobPostings"
                    type="number"
                    value={formData.features?.maxJobPostings}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        features: {
                          ...formData.features!,
                          maxJobPostings: parseInt(e.target.value) || 0,
                        },
                      })
                    }
                  />
                </div>
                <div>
                  <Label htmlFor="maxCandidatesPerMonth">Max Candidates/Month</Label>
                  <Input
                    id="maxCandidatesPerMonth"
                    type="number"
                    value={formData.features?.maxCandidatesPerMonth}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        features: {
                          ...formData.features!,
                          maxCandidatesPerMonth: parseInt(e.target.value) || 0,
                        },
                      })
                    }
                  />
                </div>
                <div>
                  <Label htmlFor="maxStorage">Max Storage (GB) *</Label>
                  <Input
                    id="maxStorage"
                    type="number"
                    value={formData.features?.maxStorage}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        features: {
                          ...formData.features!,
                          maxStorage: parseInt(e.target.value) || 0,
                        },
                      })
                    }
                  />
                </div>
                <div>
                  <Label htmlFor="apiRateLimit">API Rate Limit</Label>
                  <Input
                    id="apiRateLimit"
                    type="number"
                    value={formData.features?.apiRateLimit}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        features: {
                          ...formData.features!,
                          apiRateLimit: parseInt(e.target.value) || 0,
                        },
                      })
                    }
                  />
                </div>
                <div>
                  <Label htmlFor="whatsappNotificationLimit">WhatsApp Limit/Month</Label>
                  <Input
                    id="whatsappNotificationLimit"
                    type="number"
                    value={formData.features?.whatsappNotificationLimit}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        features: {
                          ...formData.features!,
                          whatsappNotificationLimit: parseInt(e.target.value) || 0,
                        },
                      })
                    }
                  />
                </div>
                <div>
                  <Label htmlFor="voiceNotificationLimit">Voice Limit/Month</Label>
                  <Input
                    id="voiceNotificationLimit"
                    type="number"
                    value={formData.features?.voiceNotificationLimit}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        features: {
                          ...formData.features!,
                          voiceNotificationLimit: parseInt(e.target.value) || 0,
                        },
                      })
                    }
                  />
                </div>
              </div>
            </div>

            {/* Support Level */}
            <div>
              <h3 className="text-lg font-semibold mb-4">Support Level</h3>
              <Select
                value={formData.features?.support}
                onValueChange={(value) =>
                  setFormData({
                    ...formData,
                    features: {
                      ...formData.features!,
                      support: value as any,
                    },
                  })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="basic">Basic</SelectItem>
                  <SelectItem value="priority">Priority</SelectItem>
                  <SelectItem value="dedicated">Dedicated</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setIsCreateDialogOpen(false);
                setIsEditDialogOpen(false);
                setEditingPlan(null);
                resetForm();
                setWarnings([]);
              }}
            >
              Cancel
            </Button>
            <Button
              onClick={isEditDialogOpen ? handleUpdate : handleCreate}
              disabled={isUpdating || isCreating}
            >
              {isUpdating || isCreating ? "Saving..." : isEditDialogOpen ? "Update Plan" : "Create Plan"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </MainLayout>
  );
};

export default SubscriptionManagement;

