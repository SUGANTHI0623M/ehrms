import MainLayout from "@/components/MainLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useGetBusinessQuery, useUpdateBusinessMutation } from "@/store/api/settingsApi";
import { message } from "antd";
import { useState, useEffect } from "react";
import { ArrowLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";

export default function PayrollProcessingRules() {
  const navigate = useNavigate();
  const { data: businessData, isLoading } = useGetBusinessQuery();
  const [updateBusiness, { isLoading: isUpdating }] = useUpdateBusinessMutation();

  const [settings, setSettings] = useState({
    autoProcess: false,
    processDate: 1,
    allowManualAdjustments: true,
    requireApproval: false,
    notifyOnCompletion: true,
  });

  useEffect(() => {
    if (businessData?.data?.business?.settings?.payroll?.processingRules) {
      setSettings({
        ...settings,
        ...businessData.data.business.settings.payroll.processingRules,
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
            processingRules: settings,
          },
        },
      }).unwrap();
      message.success("Payroll processing rules updated successfully");
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
          <h2 className="text-2xl font-bold">Payroll Processing Rules</h2>
          <p className="text-muted-foreground mt-1">
            Configure how payroll is processed and automated
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Processing Configuration</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Auto-Process Payroll</Label>
                <p className="text-sm text-muted-foreground">
                  Automatically process payroll on the scheduled date
                </p>
              </div>
              <Switch
                checked={settings.autoProcess}
                onCheckedChange={(checked) =>
                  setSettings({ ...settings, autoProcess: checked })
                }
              />
            </div>

            <div className="space-y-2">
              <Label>Payroll Processing Date</Label>
              <p className="text-sm text-muted-foreground">
                Day of the month when payroll should be processed (1-28)
              </p>
              <Input
                type="number"
                min="1"
                max="28"
                value={settings.processDate}
                onChange={(e) =>
                  setSettings({
                    ...settings,
                    processDate: parseInt(e.target.value) || 1,
                  })
                }
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Allow Manual Adjustments</Label>
                <p className="text-sm text-muted-foreground">
                  Allow HR to manually adjust payroll before processing
                </p>
              </div>
              <Switch
                checked={settings.allowManualAdjustments}
                onCheckedChange={(checked) =>
                  setSettings({ ...settings, allowManualAdjustments: checked })
                }
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Require Approval</Label>
                <p className="text-sm text-muted-foreground">
                  Require manager approval before finalizing payroll
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
                <Label>Notify on Completion</Label>
                <p className="text-sm text-muted-foreground">
                  Send notifications when payroll processing is complete
                </p>
              </div>
              <Switch
                checked={settings.notifyOnCompletion}
                onCheckedChange={(checked) =>
                  setSettings({ ...settings, notifyOnCompletion: checked })
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

