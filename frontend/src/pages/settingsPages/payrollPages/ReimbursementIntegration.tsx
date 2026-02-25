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

export default function ReimbursementIntegration() {
  const navigate = useNavigate();
  const { data: businessData, isLoading } = useGetBusinessQuery();
  const [updateBusiness, { isLoading: isUpdating }] = useUpdateBusinessMutation();

  const [settings, setSettings] = useState({
    enabled: true,
    autoInclude: true,
    requireApproval: true,
    includeInGross: true,
    taxDeductible: false,
  });

  useEffect(() => {
    if (businessData?.data?.business?.settings?.payroll?.reimbursement) {
      setSettings({
        ...settings,
        ...businessData.data.business.settings.payroll.reimbursement,
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
            reimbursement: settings,
          },
        },
      }).unwrap();
      message.success("Reimbursement integration settings updated successfully");
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
          <h2 className="text-2xl font-bold">Reimbursement Integration</h2>
          <p className="text-muted-foreground mt-1">
            Configure how expense claims are processed in payroll
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Integration Settings</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Enable Reimbursement Integration</Label>
                <p className="text-sm text-muted-foreground">
                  Include approved expense claims in payroll
                </p>
              </div>
              <Switch
                checked={settings.enabled}
                onCheckedChange={(checked) =>
                  setSettings({ ...settings, enabled: checked })
                }
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Auto-Include Approved Claims</Label>
                <p className="text-sm text-muted-foreground">
                  Automatically add approved claims to payroll
                </p>
              </div>
              <Switch
                checked={settings.autoInclude}
                onCheckedChange={(checked) =>
                  setSettings({ ...settings, autoInclude: checked })
                }
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Require Approval</Label>
                <p className="text-sm text-muted-foreground">
                  Only include claims that have been approved
                </p>
              </div>
              <Switch
                checked={settings.requireApproval}
                onCheckedChange={(checked) =>
                  setSettings({ ...settings, requireApproval: checked })
                }
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Include in Gross Salary</Label>
                <p className="text-sm text-muted-foreground">
                  Add reimbursements to gross salary calculation
                </p>
              </div>
              <Switch
                checked={settings.includeInGross}
                onCheckedChange={(checked) =>
                  setSettings({ ...settings, includeInGross: checked })
                }
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Tax Deductible</Label>
                <p className="text-sm text-muted-foreground">
                  Reimbursements are subject to tax deduction
                </p>
              </div>
              <Switch
                checked={settings.taxDeductible}
                onCheckedChange={(checked) =>
                  setSettings({ ...settings, taxDeductible: checked })
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

