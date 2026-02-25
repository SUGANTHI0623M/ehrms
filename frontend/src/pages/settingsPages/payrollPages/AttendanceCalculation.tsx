import MainLayout from "@/components/MainLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { useGetBusinessQuery, useUpdateBusinessMutation } from "@/store/api/settingsApi";
import { message } from "antd";
import { useState, useEffect } from "react";
import { ArrowLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";

export default function AttendanceCalculation() {
  const navigate = useNavigate();
  const { data: businessData, isLoading } = useGetBusinessQuery();
  const [updateBusiness, { isLoading: isUpdating }] = useUpdateBusinessMutation();

  const [settings, setSettings] = useState({
    enabled: true,
    calculationMethod: "prorated", // "prorated" | "full" | "custom"
    includeHalfDays: true,
    halfDayMultiplier: 0.5,
    includeLeaves: false,
    leaveTypes: [] as string[],
  });

  useEffect(() => {
    if (businessData?.data?.business?.settings?.payroll?.attendanceCalculation) {
      setSettings({
        ...settings,
        ...businessData.data.business.settings.payroll.attendanceCalculation,
      });
    }
  }, [businessData]);

  const handleSave = async () => {
    try {
      const currentSettings = businessData?.data?.business?.settings || {};
      await updateBusiness({
        settings: {
          ...currentSettings,
          payroll: {
            ...currentSettings.payroll,
            attendanceCalculation: settings,
          },
        },
      }).unwrap();
      message.success("Attendance calculation settings updated successfully");
    } catch (error: any) {
      message.error(error?.data?.error?.message || "Failed to update settings");
    }
  };

  return (
    <MainLayout>
      <main className="p-4">
        <div className="mb-4">
          <Button
            variant="ghost"
            onClick={() => navigate("/payroll-setting")}
            className="mb-4"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Payroll Settings
          </Button>
          <h2 className="text-2xl font-bold">Attendance-Based Calculation</h2>
          <p className="text-muted-foreground mt-1">
            Configure how attendance affects payroll calculations
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Calculation Settings</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Enable Attendance-Based Calculation</Label>
                <p className="text-sm text-muted-foreground">
                  Calculate salary based on present days
                </p>
              </div>
              <Switch
                checked={settings.enabled}
                onCheckedChange={(checked) =>
                  setSettings({ ...settings, enabled: checked })
                }
              />
            </div>

            <div className="space-y-3">
              <Label>Calculation Method</Label>
              <RadioGroup
                value={settings.calculationMethod}
                onValueChange={(value: "prorated" | "full" | "custom") =>
                  setSettings({ ...settings, calculationMethod: value })
                }
              >
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="prorated" id="prorated" />
                  <Label htmlFor="prorated" className="font-normal">
                    Prorated (Salary × Present Days / Working Days)
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="full" id="full" />
                  <Label htmlFor="full" className="font-normal">
                    Full Month
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="custom" id="custom" />
                  <Label htmlFor="custom" className="font-normal">
                    Custom Formula
                  </Label>
                </div>
              </RadioGroup>
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Include Half Days</Label>
                <p className="text-sm text-muted-foreground">
                  Count half days in attendance calculation
                </p>
              </div>
              <Switch
                checked={settings.includeHalfDays}
                onCheckedChange={(checked) =>
                  setSettings({ ...settings, includeHalfDays: checked })
                }
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Include Approved Leaves</Label>
                <p className="text-sm text-muted-foreground">
                  Count approved leave days as present days
                </p>
              </div>
              <Switch
                checked={settings.includeLeaves}
                onCheckedChange={(checked) =>
                  setSettings({ ...settings, includeLeaves: checked })
                }
              />
            </div>

            <div className="flex justify-end pt-4">
              <Button onClick={handleSave} disabled={isUpdating}>
                {isUpdating ? "Saving..." : "Save Changes"}
              </Button>
            </div>
          </CardContent>
        </Card>
      </main>
    </MainLayout>
  );
}

