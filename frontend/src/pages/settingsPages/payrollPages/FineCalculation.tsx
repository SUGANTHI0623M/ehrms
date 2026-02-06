import MainLayout from "@/components/MainLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useGetBusinessQuery, useUpdateBusinessMutation } from "@/store/api/settingsApi";
import { message } from "antd";
import { useState, useEffect } from "react";
import { ArrowLeft, Plus, Trash2 } from "lucide-react";
import { useNavigate } from "react-router-dom";

interface FineRule {
  type: '1xSalary' | '2xSalary' | '3xSalary' | 'halfDay' | 'fullDay' | 'custom';
  customAmount?: number;
  applyTo: 'lateArrival' | 'earlyExit' | 'both';
}

export default function FineCalculation() {
  const navigate = useNavigate();
  const { data: businessData, isLoading } = useGetBusinessQuery();
  const [updateBusiness, { isLoading: isUpdating }] = useUpdateBusinessMutation();

  const [settings, setSettings] = useState({
    enabled: false,
    applyFines: true,
    calculationMethod: 'shiftBased' as 'shiftBased' | 'custom',
    fineRules: [] as FineRule[],
  });

  useEffect(() => {
    if (businessData?.data?.business?.settings?.payroll?.fineCalculation) {
      const fineCalc = businessData.data.business.settings.payroll.fineCalculation;
      // Convert 'fixedPerHour' to 'shiftBased' for backward compatibility
      let calculationMethod = fineCalc.calculationMethod || 'shiftBased';
      if (calculationMethod === 'fixedPerHour') {
        calculationMethod = 'shiftBased';
      }
      setSettings({
        enabled: fineCalc.enabled || false,
        applyFines: fineCalc.applyFines !== false,
        calculationMethod: calculationMethod as 'shiftBased' | 'custom',
        fineRules: fineCalc.fineRules || [],
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
            fineCalculation: settings,
          },
        },
      }).unwrap();
      message.success("Fine calculation settings updated successfully");
    } catch (error: any) {
      message.error(error?.data?.error?.message || "Failed to update settings");
    }
  };

  const addFineRule = () => {
    setSettings({
      ...settings,
      fineRules: [
        ...settings.fineRules,
        { type: '1xSalary', applyTo: 'lateArrival' },
      ],
    });
  };

  const removeFineRule = (index: number) => {
    setSettings({
      ...settings,
      fineRules: settings.fineRules.filter((_, i) => i !== index),
    });
  };

  const updateFineRule = (index: number, updates: Partial<FineRule>) => {
    const newRules = [...settings.fineRules];
    newRules[index] = { ...newRules[index], ...updates };
    setSettings({ ...settings, fineRules: newRules });
  };

  if (isLoading) {
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

  return (
    <MainLayout>
      <main className="p-4 space-y-6">
        <div className="mb-4">
          <Button
            variant="ghost"
            onClick={() => navigate("/payroll-setting")}
            className="mb-4"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Payroll Settings
          </Button>
          <h2 className="text-2xl font-bold">Fine Calculation Settings</h2>
          <p className="text-muted-foreground mt-1">
            Configure how fines are calculated and applied in payroll based on attendance
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Fine Calculation Configuration</CardTitle>
            <CardDescription>
              Enable and configure automatic fine calculation for late arrivals and early exits
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Enable Fine Calculation</Label>
                <p className="text-sm text-muted-foreground">
                  Automatically calculate fines from attendance records
                </p>
              </div>
              <Switch
                checked={settings.enabled}
                onCheckedChange={(checked) =>
                  setSettings({ ...settings, enabled: checked })
                }
              />
            </div>

            {settings.enabled && (
              <>
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Apply Fines in Payroll</Label>
                    <p className="text-sm text-muted-foreground">
                      Deduct calculated fines from employee payroll
                    </p>
                  </div>
                  <Switch
                    checked={settings.applyFines}
                    onCheckedChange={(checked) =>
                      setSettings({ ...settings, applyFines: checked })
                    }
                  />
                </div>

                <div className="space-y-2">
                  <Label>Calculation Method</Label>
                  <Select
                    value={settings.calculationMethod}
                    onValueChange={(value: 'shiftBased' | 'custom') =>
                      setSettings({ ...settings, calculationMethod: value })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="shiftBased">
                        Shift-Based (Daily Salary ÷ Shift Hours × Late Hours)
                      </SelectItem>
                      <SelectItem value="custom">
                        Custom Rules (Configure below)
                      </SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="text-sm text-muted-foreground">
                    {settings.calculationMethod === 'shiftBased' && 
                      "Fine = (Daily Salary ÷ Shift Hours) × Late Hours. Example: If shift is 9 hours (10 AM - 7 PM) and daily salary is ₹1000, hourly rate is ₹111.11. For 1 hour late, fine = ₹111.11"}
                    {settings.calculationMethod === 'custom' && 
                      "Configure custom fine rules below. You can set fines as multiples of salary, half day, full day, or custom amounts."}
                  </p>
                </div>

                {settings.calculationMethod === 'custom' && (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <Label>Fine Rules</Label>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={addFineRule}
                      >
                        <Plus className="w-4 h-4 mr-2" />
                        Add Rule
                      </Button>
                    </div>

                    {settings.fineRules.length === 0 ? (
                      <div className="text-center py-8 text-muted-foreground border rounded-lg">
                        <p>No fine rules configured. Click "Add Rule" to create one.</p>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        {settings.fineRules.map((rule, index) => (
                          <Card key={index}>
                            <CardContent className="p-4 space-y-4">
                              <div className="flex items-center justify-between">
                                <h4 className="font-medium">Fine Rule {index + 1}</h4>
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => removeFineRule(index)}
                                >
                                  <Trash2 className="w-4 h-4 text-destructive" />
                                </Button>
                              </div>

                              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="space-y-2">
                                  <Label>Fine Type</Label>
                                  <Select
                                    value={rule.type}
                                    onValueChange={(value: FineRule['type']) =>
                                      updateFineRule(index, { type: value })
                                    }
                                  >
                                    <SelectTrigger>
                                      <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                      <SelectItem value="1xSalary">1x Daily Salary</SelectItem>
                                      <SelectItem value="2xSalary">2x Daily Salary</SelectItem>
                                      <SelectItem value="3xSalary">3x Daily Salary</SelectItem>
                                      <SelectItem value="halfDay">Half Day Salary</SelectItem>
                                      <SelectItem value="fullDay">Full Day Salary</SelectItem>
                                      <SelectItem value="custom">Custom Amount</SelectItem>
                                    </SelectContent>
                                  </Select>
                                </div>

                                <div className="space-y-2">
                                  <Label>Apply To</Label>
                                  <Select
                                    value={rule.applyTo}
                                    onValueChange={(value: FineRule['applyTo']) =>
                                      updateFineRule(index, { applyTo: value })
                                    }
                                  >
                                    <SelectTrigger>
                                      <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                      <SelectItem value="lateArrival">Late Arrival</SelectItem>
                                      <SelectItem value="earlyExit">Early Exit</SelectItem>
                                      <SelectItem value="both">Both</SelectItem>
                                    </SelectContent>
                                  </Select>
                                </div>
                              </div>

                              {rule.type === 'custom' && (
                                <div className="space-y-2">
                                  <Label>Custom Amount (₹)</Label>
                                  <Input
                                    type="number"
                                    min="0"
                                    step="0.01"
                                    placeholder="Enter custom fine amount"
                                    value={rule.customAmount || ''}
                                    onChange={(e) =>
                                      updateFineRule(index, {
                                        customAmount: Number(e.target.value) || 0,
                                      })
                                    }
                                  />
                                </div>
                              )}

                              <div className="text-sm text-muted-foreground bg-muted p-3 rounded">
                                <p className="font-medium mb-1">Rule Description:</p>
                                <p>
                                  {rule.type === '1xSalary' && 'Fine = 1 × Daily Salary'}
                                  {rule.type === '2xSalary' && 'Fine = 2 × Daily Salary'}
                                  {rule.type === '3xSalary' && 'Fine = 3 × Daily Salary'}
                                  {rule.type === 'halfDay' && 'Fine = 0.5 × Daily Salary'}
                                  {rule.type === 'fullDay' && 'Fine = 1 × Daily Salary'}
                                  {rule.type === 'custom' && `Fine = ₹${rule.customAmount || 0} (Fixed Amount)`}
                                  {rule.applyTo === 'lateArrival' && ' - Applied to late arrivals only'}
                                  {rule.applyTo === 'earlyExit' && ' - Applied to early exits only'}
                                  {rule.applyTo === 'both' && ' - Applied to both late arrivals and early exits'}
                                </p>
                              </div>
                            </CardContent>
                          </Card>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </>
            )}

            <div className="flex justify-end pt-4 border-t">
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
