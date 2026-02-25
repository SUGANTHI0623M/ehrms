import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import MainLayout from "@/components/MainLayout";
import { ArrowLeft, Save } from "lucide-react";
import { useGetBusinessQuery, useUpdateAttendanceSettingsMutation } from "@/store/api/settingsApi";
import { message } from "antd";

export default function AutomationRules() {
  const navigate = useNavigate();
  const { data: businessData, isLoading } = useGetBusinessQuery();
  const [updateSettings, { isLoading: isUpdating }] = useUpdateAttendanceSettingsMutation();

  const business = businessData?.data?.business;
  const automationRules = business?.settings?.attendance?.automationRules || {
    autoMarkAbsent: false,
    autoMarkHalfDay: false,
    allowAttendanceOnWeeklyOff: false,
  };

  const [autoMarkAbsent, setAutoMarkAbsent] = useState(automationRules.autoMarkAbsent || false);
  const [autoMarkHalfDay, setAutoMarkHalfDay] = useState(automationRules.autoMarkHalfDay || false);
  const [allowAttendanceOnWeeklyOff, setAllowAttendanceOnWeeklyOff] = useState(
    automationRules.allowAttendanceOnWeeklyOff || false
  );

  useEffect(() => {
    if (business?.settings?.attendance?.automationRules) {
      const rules = business.settings.attendance.automationRules;
      setAutoMarkAbsent(rules.autoMarkAbsent || false);
      setAutoMarkHalfDay(rules.autoMarkHalfDay || false);
      setAllowAttendanceOnWeeklyOff(rules.allowAttendanceOnWeeklyOff || false);
    }
  }, [business]);

  const handleSave = async () => {
    try {
      await updateSettings({
        automationRules: {
          autoMarkAbsent,
          autoMarkHalfDay,
          allowAttendanceOnWeeklyOff,
        },
      }).unwrap();

      message.success("Automation rules saved successfully");
    } catch (error: any) {
      message.error(error?.data?.error?.message || "Failed to save automation rules");
    }
  };

  if (isLoading) {
    return (
      <MainLayout>
        <main className="p-4 space-y-6">
          <div className="flex items-center justify-center h-64">
            <p>Loading...</p>
          </div>
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
              <h2 className="text-xl md:text-2xl font-bold">Automation Rules</h2>
              <p className="text-sm text-muted-foreground">
                Set rules for late entry, early exit, breaks & overtime based on punch-in and punch-out time.
              </p>
            </div>
          </div>
        </div>

        <Card>
          <CardContent className="p-6 space-y-6">
            <div className="space-y-6">
              <div className="flex items-center justify-between p-4 border rounded-lg">
                <div className="flex-1">
                  <Label htmlFor="auto-mark-absent" className="text-base font-semibold">
                    Auto Mark Absent
                  </Label>
                  <p className="text-sm text-muted-foreground mt-1">
                    Automatically mark employees as absent if they don't punch in by a certain time
                  </p>
                </div>
                <Switch
                  id="auto-mark-absent"
                  checked={autoMarkAbsent}
                  onCheckedChange={setAutoMarkAbsent}
                />
              </div>

              <div className="flex items-center justify-between p-4 border rounded-lg">
                <div className="flex-1">
                  <Label htmlFor="auto-mark-half-day" className="text-base font-semibold">
                    Auto Mark Half Day
                  </Label>
                  <p className="text-sm text-muted-foreground mt-1">
                    Automatically mark employees as half day if they work less than required hours
                  </p>
                </div>
                <Switch
                  id="auto-mark-half-day"
                  checked={autoMarkHalfDay}
                  onCheckedChange={setAutoMarkHalfDay}
                />
              </div>

              <div className="flex items-center justify-between p-4 border rounded-lg">
                <div className="flex-1">
                  <Label htmlFor="allow-weekly-off" className="text-base font-semibold">
                    Allow Attendance on Weekly Off
                  </Label>
                  <p className="text-sm text-muted-foreground mt-1">
                    Allow employees to mark attendance even on weekly off days
                  </p>
                </div>
                <Switch
                  id="allow-weekly-off"
                  checked={allowAttendanceOnWeeklyOff}
                  onCheckedChange={setAllowAttendanceOnWeeklyOff}
                />
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t">
              <Button variant="outline" onClick={() => navigate(-1)}>
                Cancel
              </Button>
              <Button onClick={handleSave} disabled={isUpdating}>
                <Save className="w-4 h-4 mr-2" />
                {isUpdating ? "Saving..." : "Save Rules"}
              </Button>
            </div>
          </CardContent>
        </Card>
      </main>
    </MainLayout>
  );
}
