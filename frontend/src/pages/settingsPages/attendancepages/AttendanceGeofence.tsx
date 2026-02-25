import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
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
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import MainLayout from "@/components/MainLayout";
import { ArrowLeft, MapPin, Save, Loader2, Edit, X, Building2, CheckCircle2, XCircle } from "lucide-react";
import { useGetBranchesQuery, useGetBranchGeofenceQuery, useUpdateBranchGeofenceMutation } from "@/store/api/branchApi";
import { getLocationWithAddress } from "@/utils/geocoding";
import { message } from "antd";
import type { Branch } from "@/store/api/branchApi";

interface BranchGeofenceState {
  enabled: boolean;
  latitude: string;
  longitude: string;
  radius: string;
  address: string;
}

export default function AttendanceGeofence() {
  const navigate = useNavigate();
  const { data: branchesData, isLoading: isLoadingBranches, refetch: refetchBranches } = useGetBranchesQuery({});
  const [updateGeofence, { isLoading: isUpdating }] = useUpdateBranchGeofenceMutation();

  const branches = branchesData?.data?.branches || [];
  const [editingBranchId, setEditingBranchId] = useState<string | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isGettingLocation, setIsGettingLocation] = useState(false);

  // Get geofence for editing branch
  const { data: geofenceData, isLoading: isLoadingGeofence, refetch: refetchGeofence } = useGetBranchGeofenceQuery(
    editingBranchId || "",
    { skip: !editingBranchId }
  );

  const editingBranch = branches.find(b => b._id === editingBranchId);
  const geofence = geofenceData?.data?.branch?.geofence || { enabled: false };

  const [formData, setFormData] = useState<BranchGeofenceState>({
    enabled: false,
    latitude: "",
    longitude: "",
    radius: "100",
    address: "",
  });

  const originalValuesRef = useRef<BranchGeofenceState>({
    enabled: false,
    latitude: "",
    longitude: "",
    radius: "100",
    address: "",
  });

  // Initialize form when editing branch changes
  useEffect(() => {
    if (editingBranchId && geofenceData && !isLoadingGeofence) {
      const g = geofenceData.data.branch.geofence;
      const newFormData: BranchGeofenceState = {
        enabled: g?.enabled || false,
        latitude: g?.latitude?.toString() || "",
        longitude: g?.longitude?.toString() || "",
        radius: g?.radius?.toString() || "100",
        address: "",
      };
      setFormData(newFormData);
      originalValuesRef.current = { ...newFormData };
    }
  }, [editingBranchId, geofenceData, isLoadingGeofence]);

  const handleEdit = (branchId: string) => {
    setEditingBranchId(branchId);
    setIsDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setIsDialogOpen(false);
    setEditingBranchId(null);
    setFormData({
      enabled: false,
      latitude: "",
      longitude: "",
      radius: "100",
      address: "",
    });
  };

  const handleCancel = () => {
    setFormData(originalValuesRef.current);
    setFormData(prev => ({ ...prev, address: "" }));
  };

  const handleGetCurrentLocation = async () => {
    setIsGettingLocation(true);
    setFormData(prev => ({ ...prev, address: "" }));

    try {
      const locationData = await getLocationWithAddress({
        enableHighAccuracy: true,
        timeout: 15000,
        maximumAge: 0,
      });

      // Set coordinates
      setFormData(prev => ({
        ...prev,
        latitude: locationData.latitude.toFixed(6),
        longitude: locationData.longitude.toFixed(6),
      }));

      // Set address for display
      const addr = locationData.address || locationData.formattedAddress;
      const hasValidAddress = addr && 
        addr !== "Location captured" && 
        !addr.match(/^-?\d+\.?\d*,\s*-?\d+\.?\d*$/);

      if (!hasValidAddress) {
        // Build address from components
        const addressParts: string[] = [];
        if (locationData.city) addressParts.push(locationData.city);
        if (locationData.state) addressParts.push(locationData.state);
        if (locationData.country) addressParts.push(locationData.country);
        
        const builtAddress = addressParts.length > 0 
          ? addressParts.join(', ')
          : `${locationData.latitude.toFixed(6)}, ${locationData.longitude.toFixed(6)}`;
        
        setFormData(prev => ({ ...prev, address: builtAddress }));
      } else {
        setFormData(prev => ({ ...prev, address: addr }));
      }

      message.success("Location retrieved successfully");
      setIsGettingLocation(false);
    } catch (error: any) {
      message.error(error.message || "Failed to get location");
      setIsGettingLocation(false);
    }
  };

  const handleSave = async () => {
    if (!editingBranchId) {
      message.error("No branch selected");
      return;
    }

    if (formData.enabled) {
      if (!formData.latitude || !formData.longitude || !formData.radius) {
        message.error("Please fill in all geofence details");
        return;
      }

      const lat = parseFloat(formData.latitude);
      const lng = parseFloat(formData.longitude);
      const rad = parseFloat(formData.radius);

      if (isNaN(lat) || isNaN(lng) || isNaN(rad)) {
        message.error("Please enter valid numbers");
        return;
      }

      if (lat < -90 || lat > 90) {
        message.error("Latitude must be between -90 and 90");
        return;
      }

      if (lng < -180 || lng > 180) {
        message.error("Longitude must be between -180 and 180");
        return;
      }

      if (rad <= 0) {
        message.error("Radius must be greater than 0");
        return;
      }
    }

    try {
      await updateGeofence({
        id: editingBranchId,
        geofence: {
          enabled: formData.enabled,
          latitude: formData.enabled ? parseFloat(formData.latitude) : undefined,
          longitude: formData.enabled ? parseFloat(formData.longitude) : undefined,
          radius: formData.enabled ? parseFloat(formData.radius) : undefined,
        },
      }).unwrap();

      // Update original values after successful save
      originalValuesRef.current = { ...formData };

      message.success("Geofence settings saved successfully");
      refetchBranches();
      handleCloseDialog();
    } catch (error: any) {
      message.error(error?.data?.error?.message || "Failed to save geofence settings");
    }
  };

  const getGeofenceStatus = (branch: Branch) => {
    if (!branch.geofence?.enabled) {
      return { status: "disabled", label: "Disabled", icon: XCircle, color: "bg-gray-100 text-gray-600" };
    }
    if (branch.geofence.latitude && branch.geofence.longitude && branch.geofence.radius) {
      return { status: "enabled", label: "Enabled", icon: CheckCircle2, color: "bg-green-100 text-green-700" };
    }
    return { status: "incomplete", label: "Incomplete", icon: XCircle, color: "bg-yellow-100 text-yellow-700" };
  };

  if (isLoadingBranches) {
    return (
      <MainLayout>
        <main className="p-4 space-y-6">
          <div className="flex items-center justify-center h-64">
            <Loader2 className="w-6 h-6 animate-spin mr-2" />
            <p>Loading branches...</p>
          </div>
        </main>
      </MainLayout>
    );
  }

  if (branches.length === 0) {
    return (
      <MainLayout>
        <main className="p-4 space-y-6">
          <div className="flex items-center gap-3">
            <Button size="icon" onClick={() => navigate(-1)}>
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div>
              <h2 className="text-xl md:text-2xl font-bold">Attendance Geofence Settings</h2>
            </div>
          </div>
          <Card>
            <CardContent className="p-6">
              <p className="text-muted-foreground">
                No branches found. Please create a branch first to configure geofence settings.
              </p>
            </CardContent>
          </Card>
        </main>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <main className="p-4 space-y-6">
        <div className="flex flex-col md:flex-row justify-between md:items-center gap-3">
          <div className="flex items-center gap-3">
            <Button size="icon" onClick={() => navigate(-1)}>
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div>
              <h2 className="text-xl md:text-2xl font-bold">Attendance Geofence Settings</h2>
              <p className="text-sm text-muted-foreground">
                Configure geofence settings for each branch. Staff will be checked against their assigned branch's geofence.
              </p>
            </div>
          </div>
        </div>

        <Card>
          <CardContent className="p-6">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Branch Name</TableHead>
                    <TableHead>Branch Code</TableHead>
                    <TableHead>Address</TableHead>
                    <TableHead>Geofence Status</TableHead>
                    <TableHead>Location</TableHead>
                    <TableHead>Radius</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {branches.map((branch) => {
                    const status = getGeofenceStatus(branch);
                    const StatusIcon = status.icon;
                    return (
                      <TableRow key={branch._id}>
                        <TableCell className="font-medium">
                          <div className="flex items-center gap-2">
                            <Building2 className="w-4 h-4 text-muted-foreground" />
                            {branch.branchName}
                            {branch.isHeadOffice && (
                              <Badge variant="outline" className="text-xs">Head Office</Badge>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <code className="text-sm bg-muted px-2 py-1 rounded">{branch.branchCode}</code>
                        </TableCell>
                        <TableCell>
                          <div className="text-sm text-muted-foreground max-w-xs truncate">
                            {branch.address.street}, {branch.address.city}, {branch.address.state}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge className={status.color}>
                            <StatusIcon className="w-3 h-3 mr-1" />
                            {status.label}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {branch.geofence?.enabled && branch.geofence.latitude && branch.geofence.longitude ? (
                            <div className="text-sm">
                              <div>Lat: {branch.geofence.latitude.toFixed(6)}</div>
                              <div>Lng: {branch.geofence.longitude.toFixed(6)}</div>
                            </div>
                          ) : (
                            <span className="text-sm text-muted-foreground">Not set</span>
                          )}
                        </TableCell>
                        <TableCell>
                          {branch.geofence?.enabled && branch.geofence.radius ? (
                            <span className="text-sm">{branch.geofence.radius}m</span>
                          ) : (
                            <span className="text-sm text-muted-foreground">-</span>
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleEdit(branch._id)}
                          >
                            <Edit className="w-4 h-4 mr-2" />
                            Configure
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>

        {/* Edit Dialog */}
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogContent className="max-w-2xl w-[95%] max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                Configure Geofence - {editingBranch?.branchName}
              </DialogTitle>
              <DialogDescription>
                Set up geofence settings for this branch. Employees assigned to this branch will be checked against this location.
              </DialogDescription>
            </DialogHeader>

            {isLoadingGeofence ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-6 h-6 animate-spin mr-2" />
                <p>Loading geofence settings...</p>
              </div>
            ) : (
              <div className="space-y-6 py-4">
                {/* Branch Info */}
                {editingBranch && (
                  <div className="p-4 bg-muted rounded-lg">
                    <div className="flex items-center gap-2 mb-2">
                      <Building2 className="w-4 h-4" />
                      <span className="font-medium">{editingBranch.branchName}</span>
                      {editingBranch.isHeadOffice && (
                        <Badge variant="outline" className="text-xs">Head Office</Badge>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {editingBranch.address.street}, {editingBranch.address.city}, {editingBranch.address.state} {editingBranch.address.pincode}
                    </p>
                  </div>
                )}

                {/* Enable Geofence */}
                <div className="flex items-center justify-between">
                  <div>
                    <Label htmlFor="geofence-enabled" className="text-base font-semibold">
                      Enable Geofence
                    </Label>
                    <p className="text-sm text-muted-foreground mt-1">
                      Require employees assigned to this branch to be within a specific location to mark attendance
                    </p>
                  </div>
                  <Switch
                    id="geofence-enabled"
                    checked={formData.enabled}
                    onCheckedChange={(checked) => setFormData(prev => ({ ...prev, enabled: checked }))}
                  />
                </div>

                {formData.enabled && (
                  <div className="space-y-4 pt-4 border-t">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="latitude">Latitude</Label>
                        <Input
                          id="latitude"
                          type="number"
                          step="any"
                          placeholder="e.g., 12.9716"
                          value={formData.latitude}
                          onChange={(e) => setFormData(prev => ({ ...prev, latitude: e.target.value }))}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="longitude">Longitude</Label>
                        <Input
                          id="longitude"
                          type="number"
                          step="any"
                          placeholder="e.g., 77.5946"
                          value={formData.longitude}
                          onChange={(e) => setFormData(prev => ({ ...prev, longitude: e.target.value }))}
                        />
                      </div>
                    </div>

                    {formData.address && (
                      <div className="p-3 bg-blue-50 dark:bg-blue-950 rounded-lg">
                        <p className="text-sm font-medium text-blue-900 dark:text-blue-100">
                          Current Location Address:
                        </p>
                        <p className="text-sm text-blue-700 dark:text-blue-300 mt-1">
                          {formData.address}
                        </p>
                      </div>
                    )}

                    <div className="space-y-2">
                      <Label htmlFor="radius">Radius (in meters)</Label>
                      <Input
                        id="radius"
                        type="number"
                        placeholder="e.g., 100"
                        value={formData.radius}
                        onChange={(e) => setFormData(prev => ({ ...prev, radius: e.target.value }))}
                      />
                      <p className="text-xs text-muted-foreground">
                        Employees must be within this distance to mark attendance
                      </p>
                    </div>

                    <Button
                      variant="outline"
                      onClick={handleGetCurrentLocation}
                      disabled={isGettingLocation}
                      className="w-full md:w-auto"
                    >
                      {isGettingLocation ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          Getting Location...
                        </>
                      ) : (
                        <>
                          <MapPin className="w-4 h-4 mr-2" />
                          Use Current Location
                        </>
                      )}
                    </Button>
                  </div>
                )}

                {!formData.enabled && (
                  <div className="pt-4 border-t">
                    <p className="text-sm text-muted-foreground">
                      Geofence is currently disabled for this branch. Enable it to set location restrictions for attendance.
                    </p>
                  </div>
                )}

                <div className="flex justify-end gap-3 pt-4 border-t">
                  <Button variant="outline" onClick={handleCloseDialog}>
                    <X className="w-4 h-4 mr-2" />
                    Cancel
                  </Button>
                  <Button onClick={handleSave} disabled={isUpdating}>
                    {isUpdating ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Saving...
                      </>
                    ) : (
                      <>
                        <Save className="w-4 h-4 mr-2" />
                        Save Settings
                      </>
                    )}
                  </Button>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </main>
    </MainLayout>
  );
}
