import MainLayout from "@/components/MainLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useGetBusinessQuery, useUpdateBusinessMutation } from "@/store/api/settingsApi";
import { message } from "antd";
import { useState, useEffect } from "react";
import { ArrowLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";

export default function DeductionRules() {
  const navigate = useNavigate();
  const { data: businessData, isLoading } = useGetBusinessQuery();
  const [updateBusiness, { isLoading: isUpdating }] = useUpdateBusinessMutation();

  const [settings, setSettings] = useState({
    autoCalculatePF: true,
    autoCalculateESI: true,
    autoCalculateTax: false,
    applyLateFines: true,
    applyAbsentDeductions: true,
    minimumSalaryForPF: 15000,
    minimumSalaryForESI: 21000,
  });

  useEffect(() => {
    if (businessData?.data?.business?.settings?.payroll?.deductions) {
      setSettings({
        ...settings,
        ...businessData.data.business.settings.payroll.deductions,
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
            deductions: settings,
          },
        },
      }).unwrap();
      message.success("Deduction rules updated successfully");
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
          <h2 className="text-2xl font-bold">Deduction Rules</h2>
          <p className="text-muted-foreground mt-1">
            Configure automatic deduction calculations
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Deduction Configuration</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Auto-Calculate PF</Label>
                <p className="text-sm text-muted-foreground">
                  Automatically calculate Provident Fund deductions
                </p>
              </div>
              <Switch
                checked={settings.autoCalculatePF}
                onCheckedChange={(checked) =>
                  setSettings({ ...settings, autoCalculatePF: checked })
                }
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Auto-Calculate ESI</Label>
                <p className="text-sm text-muted-foreground">
                  Automatically calculate Employee State Insurance
                </p>
              </div>
              <Switch
                checked={settings.autoCalculateESI}
                onCheckedChange={(checked) =>
                  setSettings({ ...settings, autoCalculateESI: checked })
                }
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Auto-Calculate Tax</Label>
                <p className="text-sm text-muted-foreground">
                  Automatically calculate income tax (TDS)
                </p>
              </div>
              <Switch
                checked={settings.autoCalculateTax}
                onCheckedChange={(checked) =>
                  setSettings({ ...settings, autoCalculateTax: checked })
                }
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Apply Late Fines</Label>
                <p className="text-sm text-muted-foreground">
                  Deduct fines for late attendance
                </p>
              </div>
              <Switch
                checked={settings.applyLateFines}
                onCheckedChange={(checked) =>
                  setSettings({ ...settings, applyLateFines: checked })
                }
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Apply Absent Deductions</Label>
                <p className="text-sm text-muted-foreground">
                  Deduct salary for absent days
                </p>
              </div>
              <Switch
                checked={settings.applyAbsentDeductions}
                onCheckedChange={(checked) =>
                  setSettings({ ...settings, applyAbsentDeductions: checked })
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

