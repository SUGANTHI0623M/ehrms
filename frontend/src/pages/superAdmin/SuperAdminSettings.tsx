import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent } from "@/components/ui/tabs";
import MainLayout from "@/components/MainLayout";
import {
  useGetPlatformSettingsQuery,
  useUpdatePlatformSettingsMutation,
  useGetSubscriptionPlansQuery,
  useCreateSubscriptionPlanMutation,
  useUpdateSubscriptionPlanMutation,
  useGetAuditLogsQuery,
} from "@/store/api/superAdminApi";
import { toast } from "sonner";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { format } from "date-fns";
import { useNavigate, useSearchParams } from "react-router-dom";

const SuperAdminSettings = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  
  // Valid tab values that match TabsContent values
  const validTabs = ["general", "subscriptions", "subscription", "security", "billing", "audit"];
  
  // Normalize tab value and ensure it's valid
  const getValidTab = (tab: string | null): string => {
    if (tab && validTabs.includes(tab)) {
      return tab;
    }
    return "general"; // Default fallback
  };
  
  // Get active tab from URL, default to "general"
  const activeTab = getValidTab(searchParams.get("tab"));
  
  // Update URL when tab changes (for sidebar sync)
  const setActiveTab = (tab: string) => {
    const validTab = getValidTab(tab);
    if (validTab !== activeTab) {
      setSearchParams({ tab: validTab }, { replace: true });
    }
  };
  
  // Ensure default tab is set on mount if no tab param exists or is invalid
  useEffect(() => {
    const currentTab = searchParams.get("tab");
    const validTab = getValidTab(currentTab);
    if (currentTab !== validTab) {
      setSearchParams({ tab: validTab }, { replace: true });
    }
  }, []);

  const { data: settingsData, isLoading: isLoadingSettings } = useGetPlatformSettingsQuery();
  const { data: plansData, isLoading: isLoadingPlans } = useGetSubscriptionPlansQuery();
  const { data: auditLogsData, isLoading: isLoadingLogs } = useGetAuditLogsQuery({
    page: 1,
    limit: 50,
  });

  const [updateSettings, { isLoading: isUpdatingSettings }] = useUpdatePlatformSettingsMutation();
  const [createPlan, { isLoading: isCreatingPlan }] = useCreateSubscriptionPlanMutation();
  const [updatePlan, { isLoading: isUpdatingPlan }] = useUpdateSubscriptionPlanMutation();

  const settings = settingsData?.data?.settings;
  const plans = plansData?.data?.plans || [];
  const logs = auditLogsData?.data?.logs || [];

  // Form states
  const [generalSettings, setGeneralSettings] = useState({
    platformName: "",
    defaultTimezone: "",
    defaultLocale: "",
  });
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);

  const [subscriptionSettings, setSubscriptionSettings] = useState({
    gracePeriodDays: 0,
    autoRenewal: false,
    trialPeriodDays: 0,
  });

  const [securitySettings, setSecuritySettings] = useState({
    passwordPolicy: {
      minLength: 8,
      requireUppercase: true,
      requireLowercase: true,
      requireNumbers: true,
      requireSpecialChars: true,
      expiryDays: 90,
    },
    sessionTimeout: 480,
    loginRateLimit: {
      maxAttempts: 5,
      windowMinutes: 15,
    },
    apiRateLimit: {
      maxRequests: 1000,
      windowMinutes: 15,
    },
  });

  const [billingSettings, setBillingSettings] = useState({
    currency: "USD",
    taxRate: 0,
    invoicePrefix: "INV",
  });

  // Initialize form when settings load
  useEffect(() => {
    if (settings) {
      setGeneralSettings({
        platformName: settings.general?.platformName || "",
        defaultTimezone: settings.general?.defaultTimezone || "",
        defaultLocale: settings.general?.defaultLocale || "",
      });
      if (settings.general?.platformLogo) {
        const logo = settings.general.platformLogo;
        setLogoPreview(logo.startsWith('http') || logo.startsWith('/') 
          ? logo 
          : `${import.meta.env.VITE_API_URL?.replace('/api', '') || 'http://localhost:8000'}${logo}`
        );
      }
      setSubscriptionSettings({
        gracePeriodDays: settings.subscription?.gracePeriodDays || 7,
        autoRenewal: settings.subscription?.autoRenewal || false,
        trialPeriodDays: settings.subscription?.trialPeriodDays || 14,
      });
    setSecuritySettings({
      passwordPolicy: settings.security?.passwordPolicy || securitySettings.passwordPolicy,
      sessionTimeout: settings.security?.sessionTimeout || 480,
      loginRateLimit: settings.security?.loginRateLimit || securitySettings.loginRateLimit,
      apiRateLimit: settings.security?.apiRateLimit || securitySettings.apiRateLimit,
    });
    setBillingSettings({
      currency: settings.billing?.currency || "USD",
      taxRate: settings.billing?.taxRate || 0,
      invoicePrefix: settings.billing?.invoicePrefix || "INV",
    });
    }
  }, [settings]);

  const handleSaveGeneral = async () => {
    try {
      await updateSettings({
        data: {
          general: generalSettings,
        },
        logoFile: logoFile || undefined,
      }).unwrap();
      toast.success("General settings updated successfully");
      setLogoFile(null); // Clear logo file after successful upload
    } catch (error: any) {
      toast.error(error?.data?.error?.message || "Failed to update settings");
    }
  };

  const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setLogoFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setLogoPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSaveSubscription = async () => {
    try {
      await updateSettings({
        subscription: subscriptionSettings,
      }).unwrap();
      toast.success("Subscription settings updated successfully");
    } catch (error: any) {
      toast.error(error?.data?.error?.message || "Failed to update settings");
    }
  };

  const handleSaveSecurity = async () => {
    try {
      await updateSettings({
        security: securitySettings,
      }).unwrap();
      toast.success("Security settings updated successfully");
    } catch (error: any) {
      toast.error(error?.data?.error?.message || "Failed to update settings");
    }
  };

  const handleSaveBilling = async () => {
    try {
      await updateSettings({
        billing: billingSettings,
      }).unwrap();
      toast.success("Billing settings updated successfully");
    } catch (error: any) {
      toast.error(error?.data?.error?.message || "Failed to update settings");
    }
  };

  return (
    <MainLayout>
      <main className="p-4">
        <div className="mx-auto space-y-6 max-w-6xl">
          {/* Header */}
          <div>
            <h1 className="text-3xl font-bold text-foreground mb-2">
              Platform Settings
            </h1>
            <p className="text-muted-foreground">
              Configure platform-wide settings and preferences
            </p>
          </div>

          <Tabs value={activeTab} onValueChange={setActiveTab}>
            {/* Subscriptions Management */}
            <TabsContent value="subscriptions">
              <Card>
                <CardHeader>
                  <CardTitle>Subscription Plans Management</CardTitle>
                  <CardDescription>
                    Create, edit, and manage subscription plans (Standard, Medium, Enterprise)
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <p className="text-sm text-muted-foreground">
                      Manage subscription plans with configurable features, limits, and pricing.
                      Assign plans to companies and control access to platform modules.
                    </p>
                    <Button onClick={() => navigate("/super-admin/subscriptions")}>
                      Open Subscription Management
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* General Settings */}
            <TabsContent value="general">
              <Card>
                <CardHeader>
                  <CardTitle>General Settings</CardTitle>
                  <CardDescription>
                    Configure platform name, timezone, and locale
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {isLoadingSettings ? (
                    <Skeleton className="h-32" />
                  ) : (
                    <>
                      <div>
                        <Label htmlFor="platformName">Platform Name</Label>
                        <Input
                          id="platformName"
                          value={generalSettings.platformName}
                          onChange={(e) =>
                            setGeneralSettings({
                              ...generalSettings,
                              platformName: e.target.value,
                            })
                          }
                        />
                      </div>
                      <div>
                        <Label htmlFor="defaultTimezone">Default Timezone</Label>
                        <Input
                          id="defaultTimezone"
                          value={generalSettings.defaultTimezone}
                          onChange={(e) =>
                            setGeneralSettings({
                              ...generalSettings,
                              defaultTimezone: e.target.value,
                            })
                          }
                          placeholder="e.g., Asia/Kolkata"
                        />
                      </div>
                      <div>
                        <Label htmlFor="defaultLocale">Default Locale</Label>
                        <Input
                          id="defaultLocale"
                          value={generalSettings.defaultLocale}
                          onChange={(e) =>
                            setGeneralSettings({
                              ...generalSettings,
                              defaultLocale: e.target.value,
                            })
                          }
                          placeholder="e.g., en-IN"
                        />
                      </div>
                      <div>
                        <Label htmlFor="platformLogo">Platform Logo</Label>
                        <div className="space-y-2">
                          {logoPreview && (
                            <div className="flex items-center gap-4">
                              <img
                                src={logoPreview}
                                alt="Platform logo"
                                className="h-20 w-auto object-contain border rounded"
                              />
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={() => {
                                  setLogoFile(null);
                                  setLogoPreview(settings?.general?.platformLogo 
                                    ? (settings.general.platformLogo.startsWith('http') || settings.general.platformLogo.startsWith('/') 
                                        ? settings.general.platformLogo 
                                        : `${import.meta.env.VITE_API_URL?.replace('/api', '') || 'http://localhost:8000'}${settings.general.platformLogo}`)
                                    : null
                                  );
                                }}
                              >
                                Remove
                              </Button>
                            </div>
                          )}
                          <Input
                            id="platformLogo"
                            type="file"
                            accept="image/jpeg,image/jpg,image/png,image/svg+xml"
                            onChange={handleLogoChange}
                          />
                          <p className="text-xs text-muted-foreground">
                            Upload a platform logo (JPG, PNG, or SVG, max 5MB). This will be displayed on login and register pages.
                          </p>
                        </div>
                      </div>
                      <Button
                        onClick={handleSaveGeneral}
                        disabled={isUpdatingSettings}
                      >
                        {isUpdatingSettings ? "Saving..." : "Save Changes"}
                      </Button>
                    </>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* Subscription Settings */}
            <TabsContent value="subscription">
              <div className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle>Subscription Configuration</CardTitle>
                    <CardDescription>
                      Configure subscription defaults and trial periods
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {isLoadingSettings ? (
                      <Skeleton className="h-32" />
                    ) : (
                      <>
                        <div>
                          <Label htmlFor="gracePeriodDays">Grace Period (Days)</Label>
                          <Input
                            id="gracePeriodDays"
                            type="number"
                            value={subscriptionSettings.gracePeriodDays}
                            onChange={(e) =>
                              setSubscriptionSettings({
                                ...subscriptionSettings,
                                gracePeriodDays: parseInt(e.target.value) || 0,
                              })
                            }
                          />
                        </div>
                        <div>
                          <Label htmlFor="trialPeriodDays">Trial Period (Days)</Label>
                          <Input
                            id="trialPeriodDays"
                            type="number"
                            value={subscriptionSettings.trialPeriodDays}
                            onChange={(e) =>
                              setSubscriptionSettings({
                                ...subscriptionSettings,
                                trialPeriodDays: parseInt(e.target.value) || 0,
                              })
                            }
                          />
                        </div>
                        <div className="flex items-center justify-between">
                          <div>
                            <Label htmlFor="autoRenewal">Auto Renewal</Label>
                            <p className="text-sm text-muted-foreground">
                              Automatically renew subscriptions
                            </p>
                          </div>
                          <Switch
                            id="autoRenewal"
                            checked={subscriptionSettings.autoRenewal}
                            onCheckedChange={(checked) =>
                              setSubscriptionSettings({
                                ...subscriptionSettings,
                                autoRenewal: checked,
                              })
                            }
                          />
                        </div>
                        <Button
                          onClick={handleSaveSubscription}
                          disabled={isUpdatingSettings}
                        >
                          {isUpdatingSettings ? "Saving..." : "Save Changes"}
                        </Button>
                      </>
                    )}
                  </CardContent>
                </Card>

                {/* Subscription Plans */}
                <Card>
                  <CardHeader>
                    <CardTitle>Subscription Plans</CardTitle>
                    <CardDescription>
                      Manage subscription plans and pricing
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    {isLoadingPlans ? (
                      <Skeleton className="h-32" />
                    ) : (
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Plan</TableHead>
                            <TableHead>Price</TableHead>
                            <TableHead>Max Users</TableHead>
                            <TableHead>Status</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {plans.map((plan) => (
                            <TableRow key={plan.id}>
                              <TableCell className="font-medium">
                                {plan.displayName}
                              </TableCell>
                              <TableCell>
                                ${plan.price}/{plan.billingCycle === 'monthly' ? 'mo' : 'yr'}
                              </TableCell>
                              <TableCell>{plan.features.maxUsers}</TableCell>
                              <TableCell>
                                <Badge
                                  variant={plan.isActive ? "default" : "secondary"}
                                >
                                  {plan.isActive ? "Active" : "Inactive"}
                                </Badge>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    )}
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            {/* Security Settings */}
            <TabsContent value="security">
              <Card>
                <CardHeader>
                  <CardTitle>Security Settings</CardTitle>
                  <CardDescription>
                    Configure password policies, session timeouts, and rate limits
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  {isLoadingSettings ? (
                    <Skeleton className="h-32" />
                  ) : (
                    <>
                      <div>
                        <h3 className="text-lg font-semibold mb-4">Password Policy</h3>
                        <div className="space-y-4">
                          <div>
                            <Label htmlFor="minLength">Minimum Length</Label>
                            <Input
                              id="minLength"
                              type="number"
                              value={securitySettings.passwordPolicy.minLength}
                              onChange={(e) =>
                                setSecuritySettings({
                                  ...securitySettings,
                                  passwordPolicy: {
                                    ...securitySettings.passwordPolicy,
                                    minLength: parseInt(e.target.value) || 8,
                                  },
                                })
                              }
                            />
                          </div>
                          <div className="space-y-2">
                            <div className="flex items-center justify-between">
                              <Label htmlFor="requireUppercase">Require Uppercase</Label>
                              <Switch
                                id="requireUppercase"
                                checked={securitySettings.passwordPolicy.requireUppercase}
                                onCheckedChange={(checked) =>
                                  setSecuritySettings({
                                    ...securitySettings,
                                    passwordPolicy: {
                                      ...securitySettings.passwordPolicy,
                                      requireUppercase: checked,
                                    },
                                  })
                                }
                              />
                            </div>
                            <div className="flex items-center justify-between">
                              <Label htmlFor="requireLowercase">Require Lowercase</Label>
                              <Switch
                                id="requireLowercase"
                                checked={securitySettings.passwordPolicy.requireLowercase}
                                onCheckedChange={(checked) =>
                                  setSecuritySettings({
                                    ...securitySettings,
                                    passwordPolicy: {
                                      ...securitySettings.passwordPolicy,
                                      requireLowercase: checked,
                                    },
                                  })
                                }
                              />
                            </div>
                            <div className="flex items-center justify-between">
                              <Label htmlFor="requireNumbers">Require Numbers</Label>
                              <Switch
                                id="requireNumbers"
                                checked={securitySettings.passwordPolicy.requireNumbers}
                                onCheckedChange={(checked) =>
                                  setSecuritySettings({
                                    ...securitySettings,
                                    passwordPolicy: {
                                      ...securitySettings.passwordPolicy,
                                      requireNumbers: checked,
                                    },
                                  })
                                }
                              />
                            </div>
                            <div className="flex items-center justify-between">
                              <Label htmlFor="requireSpecialChars">Require Special Characters</Label>
                              <Switch
                                id="requireSpecialChars"
                                checked={securitySettings.passwordPolicy.requireSpecialChars}
                                onCheckedChange={(checked) =>
                                  setSecuritySettings({
                                    ...securitySettings,
                                    passwordPolicy: {
                                      ...securitySettings.passwordPolicy,
                                      requireSpecialChars: checked,
                                    },
                                  })
                                }
                              />
                            </div>
                          </div>
                          <div>
                            <Label htmlFor="expiryDays">Password Expiry (Days)</Label>
                            <Input
                              id="expiryDays"
                              type="number"
                              value={securitySettings.passwordPolicy.expiryDays}
                              onChange={(e) =>
                                setSecuritySettings({
                                  ...securitySettings,
                                  passwordPolicy: {
                                    ...securitySettings.passwordPolicy,
                                    expiryDays: parseInt(e.target.value) || 90,
                                  },
                                })
                              }
                            />
                          </div>
                        </div>
                      </div>

                      <div>
                        <h3 className="text-lg font-semibold mb-4">Session & Rate Limits</h3>
                        <div className="space-y-4">
                          <div>
                            <Label htmlFor="sessionTimeout">Session Timeout (Minutes)</Label>
                            <Input
                              id="sessionTimeout"
                              type="number"
                              value={securitySettings.sessionTimeout}
                              onChange={(e) =>
                                setSecuritySettings({
                                  ...securitySettings,
                                  sessionTimeout: parseInt(e.target.value) || 480,
                                })
                              }
                            />
                          </div>
                          <div className="grid grid-cols-2 gap-4">
                            <div>
                              <Label htmlFor="loginMaxAttempts">Login Max Attempts</Label>
                              <Input
                                id="loginMaxAttempts"
                                type="number"
                                value={securitySettings.loginRateLimit.maxAttempts}
                                onChange={(e) =>
                                  setSecuritySettings({
                                    ...securitySettings,
                                    loginRateLimit: {
                                      ...securitySettings.loginRateLimit,
                                      maxAttempts: parseInt(e.target.value) || 5,
                                    },
                                  })
                                }
                              />
                            </div>
                            <div>
                              <Label htmlFor="loginWindow">Login Window (Minutes)</Label>
                              <Input
                                id="loginWindow"
                                type="number"
                                value={securitySettings.loginRateLimit.windowMinutes}
                                onChange={(e) =>
                                  setSecuritySettings({
                                    ...securitySettings,
                                    loginRateLimit: {
                                      ...securitySettings.loginRateLimit,
                                      windowMinutes: parseInt(e.target.value) || 15,
                                    },
                                  })
                                }
                              />
                            </div>
                          </div>
                          <div className="grid grid-cols-2 gap-4">
                            <div>
                              <Label htmlFor="apiMaxRequests">API Max Requests</Label>
                              <Input
                                id="apiMaxRequests"
                                type="number"
                                value={securitySettings.apiRateLimit.maxRequests}
                                onChange={(e) =>
                                  setSecuritySettings({
                                    ...securitySettings,
                                    apiRateLimit: {
                                      ...securitySettings.apiRateLimit,
                                      maxRequests: parseInt(e.target.value) || 1000,
                                    },
                                  })
                                }
                              />
                            </div>
                            <div>
                              <Label htmlFor="apiWindow">API Window (Minutes)</Label>
                              <Input
                                id="apiWindow"
                                type="number"
                                value={securitySettings.apiRateLimit.windowMinutes}
                                onChange={(e) =>
                                  setSecuritySettings({
                                    ...securitySettings,
                                    apiRateLimit: {
                                      ...securitySettings.apiRateLimit,
                                      windowMinutes: parseInt(e.target.value) || 15,
                                    },
                                  })
                                }
                              />
                            </div>
                          </div>
                        </div>
                      </div>

                      <Button
                        onClick={handleSaveSecurity}
                        disabled={isUpdatingSettings}
                      >
                        {isUpdatingSettings ? "Saving..." : "Save Changes"}
                      </Button>
                    </>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* Billing Settings */}
            <TabsContent value="billing">
              <Card>
                <CardHeader>
                  <CardTitle>Billing Settings</CardTitle>
                  <CardDescription>
                    Configure billing currency, tax rates, and invoice settings
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {isLoadingSettings ? (
                    <Skeleton className="h-32" />
                  ) : (
                    <>
                      <div>
                        <Label htmlFor="currency">Currency</Label>
                        <Input
                          id="currency"
                          value={billingSettings.currency}
                          onChange={(e) =>
                            setBillingSettings({
                              ...billingSettings,
                              currency: e.target.value.toUpperCase(),
                            })
                          }
                        />
                      </div>
                      <div>
                        <Label htmlFor="taxRate">Tax Rate (%)</Label>
                        <Input
                          id="taxRate"
                          type="number"
                          value={billingSettings.taxRate}
                          onChange={(e) =>
                            setBillingSettings({
                              ...billingSettings,
                              taxRate: parseFloat(e.target.value) || 0,
                            })
                          }
                        />
                      </div>
                      <div>
                        <Label htmlFor="invoicePrefix">Invoice Prefix</Label>
                        <Input
                          id="invoicePrefix"
                          value={billingSettings.invoicePrefix}
                          onChange={(e) =>
                            setBillingSettings({
                              ...billingSettings,
                              invoicePrefix: e.target.value.toUpperCase(),
                            })
                          }
                        />
                      </div>
                      <Button
                        onClick={handleSaveBilling}
                        disabled={isUpdatingSettings}
                      >
                        {isUpdatingSettings ? "Saving..." : "Save Changes"}
                      </Button>
                    </>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* Audit Logs */}
            <TabsContent value="audit">
              <Card>
                <CardHeader>
                  <CardTitle>Audit Logs</CardTitle>
                  <CardDescription>
                    View platform-wide audit logs and activity
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {isLoadingLogs ? (
                    <Skeleton className="h-32" />
                  ) : (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Action</TableHead>
                          <TableHead>Entity</TableHead>
                          <TableHead>Performed By</TableHead>
                          <TableHead>Date</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {logs.map((log) => (
                          <TableRow key={log.id}>
                            <TableCell>
                              <Badge variant="outline">{log.action}</Badge>
                            </TableCell>
                            <TableCell>{log.entityType}</TableCell>
                            <TableCell>
                              {log.performedBy?.name || log.performedBy?.email || "N/A"}
                            </TableCell>
                            <TableCell>
                              {format(new Date(log.createdAt), "MMM dd, yyyy HH:mm")}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </main>
    </MainLayout>
  );
};

export default SuperAdminSettings;

