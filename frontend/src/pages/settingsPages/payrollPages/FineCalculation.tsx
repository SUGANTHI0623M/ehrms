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
  customAmountUnit?: 'perMinute' | 'perHour' | 'fixed'; // Unit for custom amount
  applyTo: 'lateArrival' | 'earlyExit' | 'both';
}

/**
 * Generate mathematical formula based on calculation method and fine rules
 * Includes units (minutes/hours) for proper calculation
 */
function generateFormula(calculationMethod: 'shiftBased' | 'custom', fineRules: FineRule[]): string {
  if (calculationMethod === 'shiftBased') {
    return 'Fine = (Daily Salary ÷ Shift Hours) × (Late Minutes ÷ 60). Units: Late Minutes (input) → converted to Hours → multiplied by Hourly Rate. Example: If shift is 9 hours (10 AM - 7 PM), daily salary is ₹1000, hourly rate = ₹111.11/hour. For 60 minutes (1 hour) late: Fine = ₹111.11 × (60 ÷ 60) = ₹111.11';
  }

  // Custom calculation method - generate formula based on rules
  if (fineRules.length === 0) {
    return 'Configure custom fine rules below. You can set fines as multiples of salary, half day, full day, or custom amounts.';
  }

  const formulaParts: string[] = [];
  
  fineRules.forEach((rule, index) => {
    let ruleFormula = '';
    let unitExplanation = '';
    
    // Generate formula based on rule type with explicit units
    switch (rule.type) {
      case '1xSalary':
        ruleFormula = 'Fine = (Daily Salary ÷ Shift Hours) × (Fine Minutes ÷ 60) × 1';
        unitExplanation = 'Fine Minutes (input) → convert to Hours (÷60) → multiply by Hourly Rate × 1';
        break;
      case '2xSalary':
        ruleFormula = 'Fine = (Daily Salary ÷ Shift Hours) × (Fine Minutes ÷ 60) × 2';
        unitExplanation = 'Fine Minutes (input) → convert to Hours (÷60) → multiply by Hourly Rate × 2';
        break;
      case '3xSalary':
        ruleFormula = 'Fine = (Daily Salary ÷ Shift Hours) × (Fine Minutes ÷ 60) × 3';
        unitExplanation = 'Fine Minutes (input) → convert to Hours (÷60) → multiply by Hourly Rate × 3';
        break;
      case 'halfDay':
        ruleFormula = 'Fine = (Daily Salary ÷ Shift Hours) × (Fine Minutes ÷ 60) × 0.5';
        unitExplanation = 'Fine Minutes (input) → convert to Hours (÷60) → multiply by Hourly Rate × 0.5';
        break;
      case 'fullDay':
        ruleFormula = 'Fine = Daily Salary (if Fine Hours ≥ Shift Hours) OR Fine = (Fine Minutes ÷ 60 ÷ Shift Hours) × Daily Salary (if Fine Hours < Shift Hours)';
        unitExplanation = 'Fine Minutes (input) → convert to Hours (÷60) → if ≥ Shift Hours: Full Daily Salary, else: Proportional to (Fine Hours ÷ Shift Hours)';
        break;
      case 'custom':
        if (rule.customAmount) {
          const unit = rule.customAmountUnit || 'perHour';
          if (unit === 'perMinute') {
            ruleFormula = `Fine = ₹${rule.customAmount}/minute × Fine Minutes`;
            unitExplanation = `Fine Minutes (input) → multiply directly by ₹${rule.customAmount}/minute (no conversion needed)`;
          } else if (unit === 'perHour') {
            ruleFormula = `Fine = ₹${rule.customAmount}/hour × (Fine Minutes ÷ 60)`;
            unitExplanation = `Fine Minutes (input) → convert to Hours (÷60) → multiply by ₹${rule.customAmount}/hour`;
          } else { // fixed
            ruleFormula = `Fine = ₹${rule.customAmount} (Fixed Amount)`;
            unitExplanation = `Fixed amount of ₹${rule.customAmount} regardless of time`;
          }
        } else {
          ruleFormula = 'Fine = Custom Amount × Fine Minutes';
          unitExplanation = 'Fine Minutes (input) → multiply by Custom Amount';
        }
        break;
    }

    // Add applyTo information
    let applyToText = '';
    switch (rule.applyTo) {
      case 'lateArrival':
        applyToText = ' (applies to Late Arrival Minutes)';
        break;
      case 'earlyExit':
        applyToText = ' (applies to Early Exit Minutes)';
        break;
      case 'both':
        applyToText = ' (applies to both Late Arrival Minutes and Early Exit Minutes)';
        break;
    }

    if (fineRules.length === 1) {
      formulaParts.push(`${ruleFormula}${applyToText}. ${unitExplanation}`);
    } else {
      formulaParts.push(`Rule ${index + 1}: ${ruleFormula}${applyToText}. ${unitExplanation}`);
    }
  });

  // Join all rules
  return formulaParts.join('. ');
}

export default function FineCalculation() {
  const navigate = useNavigate();
  const { data: businessData, isLoading } = useGetBusinessQuery();
  const [updateBusiness, { isLoading: isUpdating }] = useUpdateBusinessMutation();

  const [settings, setSettings] = useState({
    enabled: false,
    applyFines: true,
    calculationMethod: 'shiftBased' as 'shiftBased' | 'custom',
    formula: 'Fine = (Daily Salary ÷ Shift Hours) × (Late Minutes ÷ 60). Units: Late Minutes (input) → converted to Hours → multiplied by Hourly Rate. Example: If shift is 9 hours (10 AM - 7 PM), daily salary is ₹1000, hourly rate = ₹111.11/hour. For 60 minutes (1 hour) late: Fine = ₹111.11 × (60 ÷ 60) = ₹111.11',
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
      
      // Generate formula based on calculation method and rules
      // Always regenerate formula to ensure it matches current rules
      const formula = generateFormula(calculationMethod, fineCalc.fineRules || []);
      
      setSettings({
        enabled: fineCalc.enabled || false,
        applyFines: fineCalc.applyFines !== false,
        calculationMethod: calculationMethod as 'shiftBased' | 'custom',
        formula: formula,
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
    const newRules = [
      ...settings.fineRules,
      { type: '1xSalary', applyTo: 'lateArrival', customAmountUnit: 'perHour' },
    ];
    const newFormula = generateFormula(settings.calculationMethod, newRules);
    setSettings({
      ...settings,
      fineRules: newRules,
      formula: newFormula,
    });
  };

  const removeFineRule = (index: number) => {
    const newRules = settings.fineRules.filter((_, i) => i !== index);
    const newFormula = generateFormula(settings.calculationMethod, newRules);
    setSettings({
      ...settings,
      fineRules: newRules,
      formula: newFormula,
    });
  };

  const updateFineRule = (index: number, updates: Partial<FineRule>) => {
    const newRules = [...settings.fineRules];
    newRules[index] = { ...newRules[index], ...updates };
    const newFormula = generateFormula(settings.calculationMethod, newRules);
    setSettings({ ...settings, fineRules: newRules, formula: newFormula });
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
                    onValueChange={(value: 'shiftBased' | 'custom') => {
                      // Generate formula based on calculation method and current rules
                      const newFormula = generateFormula(value, settings.fineRules);
                      setSettings({ ...settings, calculationMethod: value, formula: newFormula });
                    }}
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
                  <p className="text-sm text-muted-foreground whitespace-pre-line">
                    {settings.formula || (settings.calculationMethod === 'shiftBased' 
                      ? "Fine = (Daily Salary ÷ Shift Hours) × (Late Minutes ÷ 60). Units: Late Minutes (input) → converted to Hours → multiplied by Hourly Rate. Example: If shift is 9 hours (10 AM - 7 PM), daily salary is ₹1000, hourly rate = ₹111.11/hour. For 60 minutes (1 hour) late: Fine = ₹111.11 × (60 ÷ 60) = ₹111.11"
                      : "Configure custom fine rules below. You can set fines as multiples of salary, half day, full day, or custom amounts.")}
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
                                <>
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
                                  <div className="space-y-2">
                                    <Label>Amount Unit</Label>
                                    <Select
                                      value={rule.customAmountUnit || 'perHour'}
                                      onValueChange={(value: 'perMinute' | 'perHour' | 'fixed') =>
                                        updateFineRule(index, {
                                          customAmountUnit: value,
                                        })
                                      }
                                    >
                                      <SelectTrigger>
                                        <SelectValue />
                                      </SelectTrigger>
                                      <SelectContent>
                                        <SelectItem value="perMinute">Per Minute (₹/min)</SelectItem>
                                        <SelectItem value="perHour">Per Hour (₹/hour)</SelectItem>
                                        <SelectItem value="fixed">Fixed Amount (One-time)</SelectItem>
                                      </SelectContent>
                                    </Select>
                                    <p className="text-xs text-muted-foreground">
                                      {rule.customAmountUnit === 'perMinute' && 'Fine = Amount × Fine Minutes (no conversion)'}
                                      {rule.customAmountUnit === 'perHour' && 'Fine = Amount × (Fine Minutes ÷ 60) (converts to hours)'}
                                      {rule.customAmountUnit === 'fixed' && 'Fine = Fixed Amount (regardless of time)'}
                                    </p>
                                  </div>
                                </>
                              )}

                              <div className="text-sm text-muted-foreground bg-muted p-3 rounded">
                                <p className="font-medium mb-1">Rule Description:</p>
                                <p>
                                  {rule.type === '1xSalary' && 'Fine = 1 × Daily Salary'}
                                  {rule.type === '2xSalary' && 'Fine = 2 × Daily Salary'}
                                  {rule.type === '3xSalary' && 'Fine = 3 × Daily Salary'}
                                  {rule.type === 'halfDay' && 'Fine = 0.5 × Daily Salary'}
                                  {rule.type === 'fullDay' && 'Fine = 1 × Daily Salary'}
                                  {rule.type === 'custom' && (
                                    rule.customAmountUnit === 'perMinute' 
                                      ? `Fine = ₹${rule.customAmount || 0}/minute × Fine Minutes`
                                      : rule.customAmountUnit === 'perHour'
                                      ? `Fine = ₹${rule.customAmount || 0}/hour × (Fine Minutes ÷ 60)`
                                      : `Fine = ₹${rule.customAmount || 0} (Fixed Amount)`
                                  )}
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
