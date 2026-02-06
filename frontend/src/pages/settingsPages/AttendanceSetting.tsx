import { Card, CardContent } from "@/components/ui/card";
import { ChevronRight } from "lucide-react";
import { useNavigate } from "react-router-dom";
import MainLayout from "@/components/MainLayout";
import { useGetBusinessQuery, useGetAttendanceTemplatesQuery } from "@/store/api/settingsApi";
import { Loader2 } from "lucide-react";

export default function AttendanceSettings() {
  const navigate = useNavigate();
  const { data: businessData, isLoading: isLoadingBusiness } = useGetBusinessQuery();
  const { data: templatesData, isLoading: isLoadingTemplates } = useGetAttendanceTemplatesQuery();

  const business = businessData?.data?.business;
  const templates = templatesData?.data?.templates || [];

  // Get counts from backend
  const shiftsCount = business?.settings?.attendance?.shifts?.length || 0;
  const templatesCount = templates.length;
  const geofenceEnabled = business?.settings?.attendance?.geofence?.enabled || false;
  const automationRules = business?.settings?.attendance?.automationRules;

  const items = [
    {
      name: "Attendance Templates",
      description: templatesCount > 0 
        ? `${templatesCount} template${templatesCount > 1 ? 's' : ''} configured`
        : "Configure attendance based geolocation, workflows, and more",
    },
    {
      name: "Attendance Geofence Settings",
      description: geofenceEnabled ? "Geofence enabled" : "Location-based attendance",
    },
    {
      name: "Shift Settings",
      description: shiftsCount > 0 
        ? `${shiftsCount} shift${shiftsCount > 1 ? 's' : ''} configured`
        : "Configure work shifts",
    },
    {
      name: "Automation Rules",
      description: automationRules 
        ? "Automation rules configured"
        : "Entry data and automation",
    },
  ];

  if (isLoadingBusiness || isLoadingTemplates) {
    return (
      <MainLayout>
        <main className="p-4">
          <div className="flex items-center justify-center h-64">
            <Loader2 className="w-6 h-6 animate-spin mr-2" />
            <p>Loading attendance settings...</p>
          </div>
        </main>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <main className="p-4">
        <h2 className="text-2xl font-bold mb-4">Attendance Settings</h2>
        <Card className="">
          <CardContent className="p-6">
            <div className="space-y-3">
              {items.map((item, index) => (
                <div
                  key={index}
                  onClick={() => {
                    if (item.name === "Attendance Templates") navigate("/attendance-templates");
                    else if (item.name === "Attendance Geofence Settings") navigate("/attendance-geofence");
                    else if (item.name === "Shift Settings") navigate("/attendance-shifts");
                    else if (item.name === "Automation Rules") navigate("/attendance-automation-rules");
                  }}
                  className="p-4 rounded-lg border hover:bg-muted cursor-pointer flex justify-between items-center"
                >
                  <div>
                    <p className="font-medium">{item.name}</p>
                    {item.description && (
                      <p className="text-sm text-muted-foreground mt-1">
                        {item.description}
                      </p>
                    )}
                  </div>
                  <ChevronRight className="text-muted-foreground" />
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </main>
    </MainLayout>
  );
}
