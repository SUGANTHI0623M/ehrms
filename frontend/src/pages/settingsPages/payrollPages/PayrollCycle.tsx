import MainLayout from "@/components/MainLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useGetBusinessQuery, useUpdateBusinessMutation } from "@/store/api/settingsApi";
import { message } from "antd";
import { useState, useEffect } from "react";
import { ArrowLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";

export default function PayrollCycle() {
  const navigate = useNavigate();
  const { data: businessData, isLoading } = useGetBusinessQuery();
  const [updateBusiness, { isLoading: isUpdating }] = useUpdateBusinessMutation();

  const [settings, setSettings] = useState({
    cycleType: "monthly", // "monthly" | "biweekly" | "weekly"
    startDate: 1,
    endDate: 30,
    paymentDate: 5,
    cutoffDate: 25,
  });

  useEffect(() => {
    if (businessData?.data?.business?.settings?.payroll?.cycle) {
      setSettings({
        ...settings,
        ...businessData.data.business.settings.payroll.cycle,
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
            cycle: settings,
          },
        },
      }).unwrap();
      message.success("Payroll cycle configuration updated successfully");
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
          <h2 className="text-2xl font-bold">Payroll Cycle Configuration</h2>
          <p className="text-muted-foreground mt-1">
            Configure payroll processing dates and cycles
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Cycle Settings</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <Label>Payroll Cycle Type</Label>
              <Select
                value={settings.cycleType}
                onValueChange={(value: "monthly" | "biweekly" | "weekly") =>
                  setSettings({ ...settings, cycleType: value })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="monthly">Monthly</SelectItem>
                  <SelectItem value="biweekly">Bi-weekly</SelectItem>
                  <SelectItem value="weekly">Weekly</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Cycle Start Date</Label>
                <p className="text-sm text-muted-foreground">Day of month</p>
                <Input
                  type="number"
                  min="1"
                  max="31"
                  value={settings.startDate}
                  onChange={(e) =>
                    setSettings({
                      ...settings,
                      startDate: parseInt(e.target.value) || 1,
                    })
                  }
                />
              </div>

              <div className="space-y-2">
                <Label>Cycle End Date</Label>
                <p className="text-sm text-muted-foreground">Day of month</p>
                <Input
                  type="number"
                  min="1"
                  max="31"
                  value={settings.endDate}
                  onChange={(e) =>
                    setSettings({
                      ...settings,
                      endDate: parseInt(e.target.value) || 30,
                    })
                  }
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Payment Date</Label>
                <p className="text-sm text-muted-foreground">
                  Day of month when salary is paid
                </p>
                <Input
                  type="number"
                  min="1"
                  max="31"
                  value={settings.paymentDate}
                  onChange={(e) =>
                    setSettings({
                      ...settings,
                      paymentDate: parseInt(e.target.value) || 5,
                    })
                  }
                />
              </div>

              <div className="space-y-2">
                <Label>Cutoff Date</Label>
                <p className="text-sm text-muted-foreground">
                  Last day for attendance/data inclusion
                </p>
                <Input
                  type="number"
                  min="1"
                  max="31"
                  value={settings.cutoffDate}
                  onChange={(e) =>
                    setSettings({
                      ...settings,
                      cutoffDate: parseInt(e.target.value) || 25,
                    })
                  }
                />
              </div>
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

