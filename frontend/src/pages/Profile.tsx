import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { User, Mail, Phone, Building2, Shield, CheckCircle2, XCircle, Loader2, Key } from "lucide-react";
import MainLayout from "@/components/MainLayout";
import { useGetCurrentUserQuery, useUpdateProfileMutation } from "@/store/api/authApi";
import { useGetRoleConfigurationQuery } from "@/store/api/roleApi";
import { message } from "antd";
import { useAppSelector } from "@/store/hooks";
import { getUserPermissions } from "@/utils/permissionUtils";

const Profile = () => {
  const { data, isLoading, error, refetch } = useGetCurrentUserQuery();
  const [updateProfile, { isLoading: isUpdating }] = useUpdateProfileMutation();
  const currentUser = useAppSelector((state) => state.auth.user);
  const { data: roleConfigData } = useGetRoleConfigurationQuery(undefined, {
    skip: !currentUser,
  });
  
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    phone: "",
  });

  const user = data?.data?.user || currentUser;
  const company = user?.company;

  // Get user permissions
  const userPermissions = user ? getUserPermissions(
    user.role,
    user.roleId as any,
    user.permissions || []
  ) : [];

  // Update form data when user data loads or changes
  useEffect(() => {
    if (user && !isEditing) {
      setFormData({
        name: user.name || "",
        phone: user.phone || "",
      });
    }
  }, [user, isEditing]);

  const handleInputChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleSave = async () => {
    try {
      await updateProfile({
        name: formData.name,
        phone: formData.phone,
      }).unwrap();
      
      message.success("Profile updated successfully");
      setIsEditing(false);
      refetch();
    } catch (error: any) {
      message.error(error?.data?.error?.message || "Failed to update profile");
    }
  };

  const handleCancel = () => {
    if (user) {
      setFormData({
        name: user.name || "",
        phone: user.phone || "",
      });
    }
    setIsEditing(false);
  };

  if (isLoading) {
    return (
      <MainLayout>
        <div className="flex items-center justify-center min-h-[400px]">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      </MainLayout>
    );
  }

  if (error || !user) {
    return (
      <MainLayout>
        <div className="p-6">
          <Card>
            <CardContent className="pt-6">
              <div className="text-center text-destructive">
                <p>Failed to load profile data</p>
                <Button onClick={() => refetch()} className="mt-4">
                  Retry
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="p-6 space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold text-foreground">My Profile</h1>
          {!isEditing && (
            <Button onClick={() => setIsEditing(true)} variant="outline">
              Edit Profile
            </Button>
          )}
        </div>

        {/* Personal Information */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="w-5 h-5" />
              Personal Information
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="name">Name</Label>
                {isEditing ? (
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => handleInputChange("name", e.target.value)}
                    placeholder="Enter your name"
                  />
                ) : (
                  <div className="flex items-center gap-2 p-2 border rounded-md bg-muted/50">
                    <User className="w-4 h-4 text-muted-foreground" />
                    <span>{user.name || "Not provided"}</span>
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <div className="flex items-center gap-2 p-2 border rounded-md bg-muted/50">
                  <Mail className="w-4 h-4 text-muted-foreground" />
                  <span>{user.email}</span>
                </div>
                <p className="text-xs text-muted-foreground">Email cannot be changed</p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="phone">Phone</Label>
                {isEditing ? (
                  <Input
                    id="phone"
                    value={formData.phone}
                    onChange={(e) => handleInputChange("phone", e.target.value)}
                    placeholder="Enter your phone number"
                  />
                ) : (
                  <div className="flex items-center gap-2 p-2 border rounded-md bg-muted/50">
                    <Phone className="w-4 h-4 text-muted-foreground" />
                    <span>{user.phone || "Not provided"}</span>
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <Label>Role</Label>
                <div className="flex items-center gap-2 p-2 border rounded-md bg-muted/50">
                  <Shield className="w-4 h-4 text-muted-foreground" />
                  <Badge variant="secondary">{user.role}</Badge>
                </div>
              </div>
            </div>

            {isEditing && (
              <div className="flex gap-2 pt-4">
                <Button onClick={handleSave} disabled={isUpdating}>
                  {isUpdating ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    "Save Changes"
                  )}
                </Button>
                <Button onClick={handleCancel} variant="outline" disabled={isUpdating}>
                  Cancel
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Account Status */}
        <Card>
          <CardHeader>
            <CardTitle>Account Status</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-3">
              {user.isActive ? (
                <>
                  <CheckCircle2 className="w-5 h-5 text-green-600" />
                  <span className="font-medium">Active</span>
                  <Badge variant="default" className="bg-green-600">
                    Account Active
                  </Badge>
                </>
              ) : (
                <>
                  <XCircle className="w-5 h-5 text-red-600" />
                  <span className="font-medium">Inactive</span>
                  <Badge variant="destructive">Account Deactivated</Badge>
                </>
              )}
            </div>
            {user.lastLogin && (
              <p className="text-sm text-muted-foreground mt-2">
                Last login: {new Date(user.lastLogin).toLocaleString()}
              </p>
            )}
          </CardContent>
        </Card>

        {/* Company Information */}
        {company && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Building2 className="w-5 h-5" />
                Company Information
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label>Company Name</Label>
                  <div className="p-2 border rounded-md bg-muted/50 mt-1">
                    {company.name}
                  </div>
                </div>
                <div>
                  <Label>Company Email</Label>
                  <div className="p-2 border rounded-md bg-muted/50 mt-1">
                    {company.email}
                  </div>
                </div>
                <div>
                  <Label>Company Phone</Label>
                  <div className="p-2 border rounded-md bg-muted/50 mt-1">
                    {company.phone}
                  </div>
                </div>
                <div>
                  <Label>Subscription Plan</Label>
                  <div className="p-2 border rounded-md bg-muted/50 mt-1">
                    <Badge variant="outline" className="capitalize">
                      {company.subscriptionPlan || "Free"}
                    </Badge>
                  </div>
                </div>
                {company.address && (
                  <div className="md:col-span-2">
                    <Label>Address</Label>
                    <div className="p-2 border rounded-md bg-muted/50 mt-1">
                      {[
                        company.address.street,
                        company.address.city,
                        company.address.state,
                        company.address.zipCode,
                        company.address.country,
                      ]
                        .filter(Boolean)
                        .join(", ")}
                    </div>
                  </div>
                )}
              </div>
              <div className="flex items-center gap-2 pt-2">
                {company.isActive ? (
                  <>
                    <CheckCircle2 className="w-4 h-4 text-green-600" />
                    <span className="text-sm text-muted-foreground">Company is active</span>
                  </>
                ) : (
                  <>
                    <XCircle className="w-4 h-4 text-red-600" />
                    <span className="text-sm text-muted-foreground">Company is inactive</span>
                  </>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Super Admin - No Company */}
        {!company && user.role === "Super Admin" && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Building2 className="w-5 h-5" />
                Company Information
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">
                Super Admin accounts are not associated with any company.
              </p>
            </CardContent>
          </Card>
        )}

        {/* Permissions Section */}
        {user && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Key className="w-5 h-5" />
                My Permissions
              </CardTitle>
            </CardHeader>
            <CardContent>
              {user.roleId && (
                <div className="mb-4 p-3 bg-muted/50 rounded-md">
                  <Label className="text-sm font-medium">Custom Role</Label>
                  <div className="mt-1">
                    <Badge variant="secondary">{(user.roleId as any)?.name || 'N/A'}</Badge>
                  </div>
                  {(user.roleId as any)?.description && (
                    <p className="text-sm text-muted-foreground mt-1">
                      {(user.roleId as any).description}
                    </p>
                  )}
                </div>
              )}

              {userPermissions.length > 0 ? (
                <div className="space-y-4">
                  <div className="text-sm text-muted-foreground mb-3">
                    You have access to the following modules and actions:
                  </div>
                  <div className="space-y-3">
                    {userPermissions.map((perm, index) => (
                      <div key={index} className="p-3 border rounded-lg bg-background">
                        <div className="flex items-center justify-between mb-2">
                          <h4 className="font-semibold text-base capitalize">
                            {perm.module.replace(/_/g, ' ')}
                          </h4>
                          <Badge variant="outline" className="text-xs">
                            {perm.actions.length} {perm.actions.length === 1 ? 'action' : 'actions'}
                          </Badge>
                        </div>
                        <div className="flex flex-wrap gap-2 mt-2">
                          {perm.actions.map((action, actionIndex) => (
                            <Badge
                              key={actionIndex}
                              variant="secondary"
                              className="text-xs font-normal"
                            >
                              {action}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="text-center py-8">
                  <Shield className="w-12 h-12 mx-auto text-muted-foreground mb-3" />
                  <p className="text-muted-foreground">
                    {user.role === 'Admin' || user.role === 'Super Admin'
                      ? 'You have full access to all modules (Admin privileges).'
                      : 'No specific permissions assigned. Using default role permissions.'}
                  </p>
                  {user.role !== 'Admin' && user.role !== 'Super Admin' && (
                    <p className="text-sm text-muted-foreground mt-2">
                      Contact your administrator to assign specific permissions.
                    </p>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </MainLayout>
  );
};

export default Profile;

