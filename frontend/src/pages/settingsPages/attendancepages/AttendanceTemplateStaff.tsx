import { useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import MainLayout from "@/components/MainLayout";
import { ArrowLeft, Users, Shield } from "lucide-react";
import { 
  useGetAttendanceTemplatesQuery
} from "@/store/api/settingsApi";
import { useGetStaffQuery as useGetAllStaffQuery, useToggleStaffTwoFactorMutation } from "@/store/api/staffApi";
import { message } from "antd";

export default function AttendanceTemplateStaff() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  
  const { data: templatesData, isLoading: isTemplateLoading } = useGetAttendanceTemplatesQuery();
  const { data: allStaffData, isLoading: isStaffLoading } = useGetAllStaffQuery({
    limit: 1000,
    page: 1
  });
  const [toggleTwoFactor, { isLoading: isToggling }] = useToggleStaffTwoFactorMutation();

  const templates = templatesData?.data?.templates || [];
  const template = templates.find((t: any) => t._id === id);
  const allStaff = allStaffData?.data?.staff || [];

  // Calculate assigned staff properly - combine from both sources
  // IMPORTANT: This hook must be called before any conditional returns
  // IMPORTANT: Match backend logic exactly:
  // - Include ALL staff from assignedStaff array (even if deactivated)
  // - Include staff from Staff model only if status != 'Deactivated'
  const finalAssignedStaff = useMemo(() => {
    if (!template || !id || !allStaff.length) return [];

    // Get staff IDs from assignedStaff array (backend includes these regardless of status)
    const staffIdsFromArray = new Set(
      (template?.assignedStaff || []).map((staff: any) => {
        const staffId = typeof staff === 'object' && staff !== null 
          ? (staff._id?.toString() || staff._id) 
          : staff?.toString();
        return staffId;
      }).filter(Boolean)
    );

    // Get staff from Staff model where attendanceTemplateId matches (backend excludes deactivated)
    const staffFromField = allStaff.filter((staff: any) => {
      // Exclude deactivated staff to match backend query
      if (staff.status === 'Deactivated') return false;
      
      const templateId = typeof staff.attendanceTemplateId === 'object' 
        ? staff.attendanceTemplateId?._id 
        : staff.attendanceTemplateId;
      return String(templateId) === String(id);
    });

    // Get full staff records from assignedStaff array
    const staffFromArray = Array.from(staffIdsFromArray).map((staffId: string) => {
      return allStaff.find((s: any) => String(s._id) === String(staffId));
    }).filter(Boolean);

    // Combine and deduplicate (match backend logic: include from array even if deactivated)
    const combined = [...staffFromArray, ...staffFromField];
    const uniqueMap = new Map();
    
    combined.forEach((staff: any) => {
      if (!staff) return;
      
      const key = String(staff._id);
      if (!uniqueMap.has(key)) {
        uniqueMap.set(key, staff);
      }
    });
    
    // Filter to show only active staff (exclude deactivated)
    return Array.from(uniqueMap.values()).filter((staff: any) => 
      staff && staff.status !== 'Deactivated'
    );
  }, [template, allStaff, id]);

  const handleToggleTwoFactor = async (staffId: string, currentStatus: boolean) => {
    try {
      await toggleTwoFactor({ staffId, enabled: !currentStatus }).unwrap();
      message.success(`Two-factor authentication ${!currentStatus ? 'enabled' : 'disabled'} successfully`);
    } catch (error: any) {
      message.error(error?.data?.error?.message || 'Failed to toggle two-factor authentication');
    }
  };

  if (isTemplateLoading || isStaffLoading) {
    return (
      <MainLayout>
        <main className="p-4">
          <div className="flex items-center justify-center h-64">
            <p>Loading...</p>
          </div>
        </main>
      </MainLayout>
    );
  }

  if (!template) {
    return (
      <MainLayout>
        <main className="p-4">
          <div className="flex items-center justify-center h-64">
            <p>Attendance template not found</p>
          </div>
        </main>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <main className="p-4 space-y-6">
        <div className="flex items-center gap-3">
          <Button size="icon" onClick={() => navigate(-1)}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div>
            <h2 className="text-xl md:text-2xl font-bold">Assigned Staff</h2>
            <p className="text-sm text-muted-foreground">
              {template.name} - {finalAssignedStaff.length} staff member{finalAssignedStaff.length !== 1 ? 's' : ''}
            </p>
          </div>
        </div>

        <Card>
          <CardContent className="p-6">
            {finalAssignedStaff.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Users className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p>No staff members assigned to this attendance template.</p>
                <p className="text-sm mt-2">Assign staff through their profile or use the assign staff feature.</p>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {finalAssignedStaff.map((staff: any) => {
                    const staffName = typeof staff === 'object' ? (staff.name || 'Unknown') : 'Unknown';
                    const employeeId = typeof staff === 'object' ? (staff.employeeId || 'N/A') : 'N/A';
                    const staffId = typeof staff === 'object' ? staff._id : staff;
                    const twoFactorEnabled = typeof staff === 'object' ? (staff.twoFactorEnabled || false) : false;
                    
                    return (
                      <Card key={staffId} className="p-4 hover:bg-muted/50 transition">
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex-1">
                            <p className="font-semibold">{staffName}</p>
                            <p className="text-sm text-muted-foreground mt-1">
                              Employee ID: {employeeId}
                            </p>
                            <div className="flex items-center gap-2 mt-3">
                              <Shield className="w-4 h-4 text-muted-foreground" />
                              <Label htmlFor={`2fa-${staffId}`} className="text-sm font-normal cursor-pointer">
                                Two-Factor Authentication
                              </Label>
                              <Switch
                                id={`2fa-${staffId}`}
                                checked={twoFactorEnabled}
                                onCheckedChange={() => handleToggleTwoFactor(staffId, twoFactorEnabled)}
                                disabled={isToggling}
                              />
                            </div>
                          </div>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => navigate(`/staff-profile/${staffId}`)}
                          >
                            View Profile
                          </Button>
                        </div>
                      </Card>
                    );
                  })}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </main>
    </MainLayout>
  );
}

