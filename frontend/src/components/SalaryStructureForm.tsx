import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Save, Calculator, DollarSign, TrendingUp, Gift, CreditCard, Edit, Eye, X } from "lucide-react";
import { useUpdateSalaryStructureMutation } from "@/store/api/staffApi";
import { calculateSalaryStructure, formatCurrency, type SalaryStructureInputs, type CalculatedSalaryStructure } from "@/utils/salaryStructureCalculation.util";
import { message } from "antd";
import { Staff } from "@/store/api/staffApi";

interface SalaryStructureFormProps {
  staffId: string;
  staff?: Staff;
  onSave?: () => void;
}

const SalaryStructureForm = ({ staffId, staff, onSave }: SalaryStructureFormProps) => {
  const [updateSalaryStructure, { isLoading: isUpdating }] = useUpdateSalaryStructureMutation();
  const [isEditing, setIsEditing] = useState(false);
  
  const [formData, setFormData] = useState<SalaryStructureInputs>({
    basicSalary: 0,
    dearnessAllowance: 0,
    houseRentAllowance: 0,
    specialAllowance: 0,
    employerPFRate: 13,
    employerESIRate: 3.25,
    incentiveRate: 0,
    gratuityRate: 4.81,
    statutoryBonusRate: 8.33,
    medicalInsuranceAmount: 0,
    mobileAllowance: 0,
    mobileAllowanceType: 'monthly',
    employeePFRate: 12,
    employeeESIRate: 0.75,
  });

  const [calculatedSalary, setCalculatedSalary] = useState<CalculatedSalaryStructure | null>(null);

  // Load existing salary data
  useEffect(() => {
    if (staff?.salary) {
      const salary = staff.salary as any;
      const basicSalary = salary.basicSalary ?? 0;
      setFormData({
        basicSalary: basicSalary,
        // Auto-calculate DA and HRA based on basic salary (50% and 20% respectively)
        dearnessAllowance: basicSalary > 0 ? (basicSalary * 0.5) : (salary.dearnessAllowance ?? 0),
        houseRentAllowance: basicSalary > 0 ? (basicSalary * 0.2) : (salary.houseRentAllowance ?? 0),
        specialAllowance: salary.specialAllowance ?? 0,
        employerPFRate: salary.employerPFRate ?? 13,
        employerESIRate: salary.employerESIRate ?? 3.25,
        incentiveRate: salary.incentiveRate ?? 0,
        gratuityRate: salary.gratuityRate ?? 4.81,
        statutoryBonusRate: salary.statutoryBonusRate ?? 8.33,
        medicalInsuranceAmount: salary.medicalInsuranceAmount ?? 0,
        mobileAllowance: salary.mobileAllowance ?? 0,
        mobileAllowanceType: salary.mobileAllowanceType || 'monthly',
        employeePFRate: salary.employeePFRate ?? 12,
        employeeESIRate: salary.employeeESIRate ?? 0.75,
      });
    }
    // Set editing mode to false when staff data changes
    setIsEditing(false);
  }, [staff?.salary]);

  // Calculate salary whenever form data changes
  useEffect(() => {
    if (formData.basicSalary > 0) {
      const calculated = calculateSalaryStructure(formData);
      setCalculatedSalary(calculated);
    }
  }, [formData]);

  const handleInputChange = (field: keyof SalaryStructureInputs, value: string | number) => {
    setFormData(prev => {
      let newValue: number;
      if (typeof value === 'string') {
        // Handle empty string - allow it during typing, will be converted to 0 on blur
        if (value === '' || value === '-') {
          // During typing, keep as is (will be handled on blur)
          // For now, set to 0 to allow clearing the field
          newValue = 0;
        } else {
          const parsed = parseFloat(value);
          newValue = isNaN(parsed) ? (prev[field] ?? 0) : parsed;
        }
      } else {
        newValue = value ?? 0;
      }
      
      const updatedData = {
        ...prev,
        [field]: newValue
      };
      
      // Auto-calculate DA and HRA when basic salary changes
      if (field === 'basicSalary' && newValue > 0) {
        updatedData.dearnessAllowance = newValue * 0.5; // DA = 50% of basic
        updatedData.houseRentAllowance = newValue * 0.2; // HRA = 20% of basic
      }
      
      return updatedData;
    });
  };

  const handleSave = async () => {
    // Ensure basicSalary is provided and greater than 0
    if (!formData.basicSalary || formData.basicSalary <= 0) {
      message.error('Basic Salary is required and must be greater than 0');
      return;
    }

    // Ensure all fields are numbers (convert null/undefined to 0 for proper calculations)
    const salaryData: SalaryStructureInputs = {
      basicSalary: formData.basicSalary ?? 0,
      dearnessAllowance: formData.dearnessAllowance ?? 0,
      houseRentAllowance: formData.houseRentAllowance ?? 0,
      specialAllowance: formData.specialAllowance ?? 0,
      employerPFRate: formData.employerPFRate ?? 13,
      employerESIRate: formData.employerESIRate ?? 3.25,
      incentiveRate: formData.incentiveRate ?? 0,
      gratuityRate: formData.gratuityRate ?? 4.81,
      statutoryBonusRate: formData.statutoryBonusRate ?? 8.33,
      medicalInsuranceAmount: formData.medicalInsuranceAmount ?? 0,
      mobileAllowance: formData.mobileAllowance ?? 0,
      mobileAllowanceType: formData.mobileAllowanceType || 'monthly',
      employeePFRate: formData.employeePFRate ?? 12,
      employeeESIRate: formData.employeeESIRate ?? 0.75,
    };

    try {
      await updateSalaryStructure({
        staffId,
        salary: salaryData
      }).unwrap();

      message.success('Salary structure saved successfully!');
      setIsEditing(false);
      onSave?.();
    } catch (error: any) {
      message.error(error?.data?.error?.message || 'Failed to save salary structure');
    }
  };

  const handleCancel = () => {
    // Reload form data from staff
    if (staff?.salary) {
      const salary = staff.salary as any;
      const basicSalary = salary.basicSalary ?? 0;
      setFormData({
        basicSalary: basicSalary,
        // Auto-calculate DA and HRA based on basic salary (50% and 20% respectively)
        dearnessAllowance: basicSalary > 0 ? (basicSalary * 0.5) : (salary.dearnessAllowance ?? 0),
        houseRentAllowance: basicSalary > 0 ? (basicSalary * 0.2) : (salary.houseRentAllowance ?? 0),
        specialAllowance: salary.specialAllowance ?? 0,
        employerPFRate: salary.employerPFRate ?? 13,
        employerESIRate: salary.employerESIRate ?? 3.25,
        incentiveRate: salary.incentiveRate ?? 0,
        gratuityRate: salary.gratuityRate ?? 4.81,
        statutoryBonusRate: salary.statutoryBonusRate ?? 8.33,
        medicalInsuranceAmount: salary.medicalInsuranceAmount ?? 0,
        mobileAllowance: salary.mobileAllowance ?? 0,
        mobileAllowanceType: salary.mobileAllowanceType || 'monthly',
        employeePFRate: salary.employeePFRate ?? 12,
        employeeESIRate: salary.employeeESIRate ?? 0.75,
      });
    }
    setIsEditing(false);
  };

  // Calculate salary for preview
  const previewSalary = formData.basicSalary > 0 ? calculateSalaryStructure(formData) : null;

  return (
    <div className="space-y-6">
      {/* View Mode - Show calculated salary (ONLY when not editing) */}
      {!isEditing && previewSalary && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Eye className="w-5 h-5" />
                  Salary Structure Overview
                </CardTitle>
                <CardDescription>
                  Current salary structure configuration and calculated values
                </CardDescription>
              </div>
              <Button onClick={() => setIsEditing(true)} variant="outline">
                <Edit className="w-4 h-4 mr-2" />
                Edit Structure
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Compensation Structure Table - Matching Image Format */}
            <div className="overflow-x-auto">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="border-b-2 border-gray-300">
                    <th className="text-left p-3 font-semibold">Component</th>
                    <th className="text-right p-3 font-semibold">Per Month</th>
                    <th className="text-right p-3 font-semibold">Per Year</th>
                  </tr>
                </thead>
                <tbody>
                  {/* (A) Fixed Components */}
                  <tr className="bg-gray-50 dark:bg-gray-900">
                    <td colSpan={3} className="p-2 font-bold text-lg">(A) Fixed Components</td>
                  </tr>
                  <tr className="border-b">
                    <td className="p-3">Basic</td>
                    <td className="p-3 text-right">{formatCurrency(previewSalary.monthly.basicSalary)}</td>
                    <td className="p-3 text-right">{formatCurrency(previewSalary.monthly.basicSalary * 12)}</td>
                  </tr>
                  <tr className="border-b">
                    <td className="p-3">DA (Dearness Allowance)</td>
                    <td className="p-3 text-right">{formatCurrency(previewSalary.monthly.dearnessAllowance)}</td>
                    <td className="p-3 text-right">{formatCurrency(previewSalary.monthly.dearnessAllowance * 12)}</td>
                  </tr>
                  <tr className="border-b">
                    <td className="p-3">HRA (House Rent Allowance)</td>
                    <td className="p-3 text-right">{formatCurrency(previewSalary.monthly.houseRentAllowance)}</td>
                    <td className="p-3 text-right">{formatCurrency(previewSalary.monthly.houseRentAllowance * 12)}</td>
                  </tr>
                  <tr className="border-b">
                    <td className="p-3">Special Allowances</td>
                    <td className="p-3 text-right">{formatCurrency(previewSalary.monthly.specialAllowance)}</td>
                    <td className="p-3 text-right">{formatCurrency(previewSalary.monthly.specialAllowance * 12)}</td>
                  </tr>
                  <tr className="border-b">
                    <td className="p-3">ESI (Employer) {formData.employerESIRate ?? 0}%</td>
                    <td className="p-3 text-right">{formatCurrency(previewSalary.monthly.employerESI)}</td>
                    <td className="p-3 text-right">{formatCurrency(previewSalary.monthly.employerESI * 12)}</td>
                  </tr>
                  <tr className="border-b">
                    <td className="p-3">PF (Employer) {formData.employerPFRate ?? 0}%</td>
                    <td className="p-3 text-right">{formatCurrency(previewSalary.monthly.employerPF)}</td>
                    <td className="p-3 text-right">{formatCurrency(previewSalary.monthly.employerPF * 12)}</td>
                  </tr>
                  <tr className="border-b-2 border-gray-400 bg-blue-50 dark:bg-blue-950 font-bold">
                    <td className="p-3">Gross Salary</td>
                    <td className="p-3 text-right">{formatCurrency(previewSalary.monthly.grossSalary)}</td>
                    <td className="p-3 text-right">{formatCurrency(previewSalary.yearly.annualGrossSalary)}</td>
                  </tr>

                  {/* (B) Variables (Performance based) */}
                  <tr className="bg-gray-50 dark:bg-gray-900">
                    <td colSpan={3} className="p-2 font-bold text-lg">(B) Variables (Performance based)</td>
                  </tr>
                  <tr className="border-b-2 border-gray-400">
                    <td className="p-3">*Incentive ({formData.incentiveRate ?? 0}%)</td>
                    <td className="p-3 text-right">-</td>
                    <td className="p-3 text-right">{formatCurrency(previewSalary.yearly.annualIncentive)}</td>
                  </tr>

                  {/* (C) Benefits (Yearly) */}
                  <tr className="bg-gray-50 dark:bg-gray-900">
                    <td colSpan={3} className="p-2 font-bold text-lg">(C) Benefits (Yearly)</td>
                  </tr>
                  <tr className="border-b">
                    <td className="p-3">Medical Insurance</td>
                    <td className="p-3 text-right">-</td>
                    <td className="p-3 text-right">{formatCurrency((formData.medicalInsuranceAmount ?? 0))}</td>
                  </tr>
                  <tr className="border-b">
                    <td className="p-3">Gratuity ({formData.gratuityRate ?? 0}%)</td>
                    <td className="p-3 text-right">-</td>
                    <td className="p-3 text-right">{formatCurrency(previewSalary.yearly.annualGratuity)}</td>
                  </tr>
                  <tr className="border-b">
                    <td className="p-3">Statutory Bonus ({formData.statutoryBonusRate ?? 0}%)</td>
                    <td className="p-3 text-right">-</td>
                    <td className="p-3 text-right">{formatCurrency(previewSalary.yearly.annualStatutoryBonus)}</td>
                  </tr>
                  <tr className="border-b-2 border-gray-400 bg-blue-50 dark:bg-blue-950 font-bold">
                    <td className="p-3">Total Benefits (C)</td>
                    <td className="p-3 text-right">-</td>
                    <td className="p-3 text-right">{formatCurrency(previewSalary.yearly.totalAnnualBenefits)}</td>
                  </tr>

                  {/* (D) Allowances */}
                  <tr className="bg-gray-50 dark:bg-gray-900">
                    <td colSpan={3} className="p-2 font-bold text-lg">(D) Allowances</td>
                  </tr>
                  <tr className="border-b-2 border-gray-400">
                    <td className="p-3">Mobile Allowances</td>
                    <td className="p-3 text-right">
                      {formData.mobileAllowanceType === 'monthly' 
                        ? formatCurrency(formData.mobileAllowance ?? 0)
                        : '-'}
                    </td>
                    <td className="p-3 text-right">{formatCurrency(previewSalary.yearly.annualMobileAllowance)}</td>
                  </tr>

                  {/* Employee Deductions */}
                  <tr className="bg-gray-50 dark:bg-gray-900">
                    <td colSpan={3} className="p-2 font-bold text-lg">Employee Deductions</td>
                  </tr>
                  <tr className="border-b">
                    <td className="p-3">Employee contribution to PF ({formData.employeePFRate ?? 0}%)</td>
                    <td className="p-3 text-right">{formatCurrency(previewSalary.monthly.employeePF)}</td>
                    <td className="p-3 text-right">{formatCurrency(previewSalary.monthly.employeePF * 12)}</td>
                  </tr>
                  <tr className="border-b">
                    <td className="p-3">Employee contribution to ESI ({formData.employeeESIRate ?? 0}%)</td>
                    <td className="p-3 text-right">{formatCurrency(previewSalary.monthly.employeeESI)}</td>
                    <td className="p-3 text-right">{formatCurrency(previewSalary.monthly.employeeESI * 12)}</td>
                  </tr>
                  <tr className="border-b-2 border-gray-400 bg-red-50 dark:bg-red-950 font-bold">
                    <td className="p-3">Total Deductions</td>
                    <td className="p-3 text-right">{formatCurrency(previewSalary.monthly.totalMonthlyDeductions)}</td>
                    <td className="p-3 text-right">{formatCurrency(previewSalary.monthly.totalMonthlyDeductions * 12)}</td>
                  </tr>

                  {/* Net Salary */}
                  <tr className="bg-gray-50 dark:bg-gray-900">
                    <td colSpan={3} className="p-2 font-bold text-lg">Net Salary</td>
                  </tr>
                  <tr className="border-b-2 border-gray-400 bg-green-50 dark:bg-green-950 font-bold">
                    <td className="p-3">Net Salary per month</td>
                    <td className="p-3 text-right">{formatCurrency(previewSalary.monthly.netMonthlySalary)}</td>
                    <td className="p-3 text-right">{formatCurrency(previewSalary.yearly.annualNetSalary)}</td>
                  </tr>

                  {/* Total CTC */}
                  <tr className="bg-gray-50 dark:bg-gray-900">
                    <td colSpan={3} className="p-2 font-bold text-lg">Total CTC (A+B+C+D)</td>
                  </tr>
                  <tr className="border-b-2 border-gray-400 bg-blue-100 dark:bg-blue-900 font-bold text-lg">
                    <td className="p-3">Total CTC (A+B+C+D)</td>
                    <td className="p-3 text-right">-</td>
                    <td className="p-3 text-right">{formatCurrency(previewSalary.totalCTC)}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Edit Mode - Show Form with Real-time Preview */}
      {isEditing && (
        <>
          {/* Real-time Calculated Structure Table */}
          {calculatedSalary && formData.basicSalary > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Calculator className="w-5 h-5" />
                  Real-time Salary Structure Preview
                </CardTitle>
                <CardDescription>
                  This table updates automatically as you enter values below
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full border-collapse">
                    <thead>
                      <tr className="border-b-2 border-gray-300">
                        <th className="text-left p-3 font-semibold">Component</th>
                        <th className="text-right p-3 font-semibold">Per Month</th>
                        <th className="text-right p-3 font-semibold">Per Year</th>
                      </tr>
                    </thead>
                    <tbody>
                      {/* (A) Fixed Components */}
                      <tr className="bg-gray-50 dark:bg-gray-900">
                        <td colSpan={3} className="p-2 font-bold text-lg">(A) Fixed Components</td>
                      </tr>
                      <tr className="border-b">
                        <td className="p-3">Basic</td>
                        <td className="p-3 text-right">{formatCurrency(calculatedSalary.monthly.basicSalary)}</td>
                        <td className="p-3 text-right">{formatCurrency(calculatedSalary.monthly.basicSalary * 12)}</td>
                      </tr>
                      <tr className="border-b">
                        <td className="p-3">DA (Dearness Allowance)</td>
                        <td className="p-3 text-right">{formatCurrency(calculatedSalary.monthly.dearnessAllowance)}</td>
                        <td className="p-3 text-right">{formatCurrency(calculatedSalary.monthly.dearnessAllowance * 12)}</td>
                      </tr>
                      <tr className="border-b">
                        <td className="p-3">HRA (House Rent Allowance)</td>
                        <td className="p-3 text-right">{formatCurrency(calculatedSalary.monthly.houseRentAllowance)}</td>
                        <td className="p-3 text-right">{formatCurrency(calculatedSalary.monthly.houseRentAllowance * 12)}</td>
                      </tr>
                      <tr className="border-b">
                        <td className="p-3">Special Allowances</td>
                        <td className="p-3 text-right">{formatCurrency(calculatedSalary.monthly.specialAllowance)}</td>
                        <td className="p-3 text-right">{formatCurrency(calculatedSalary.monthly.specialAllowance * 12)}</td>
                      </tr>
                      <tr className="border-b">
                        <td className="p-3">ESI (Employer) {formData.employerESIRate ?? 0}%</td>
                        <td className="p-3 text-right">{formatCurrency(calculatedSalary.monthly.employerESI)}</td>
                        <td className="p-3 text-right">{formatCurrency(calculatedSalary.monthly.employerESI * 12)}</td>
                      </tr>
                      <tr className="border-b">
                        <td className="p-3">PF (Employer) {formData.employerPFRate ?? 0}%</td>
                        <td className="p-3 text-right">{formatCurrency(calculatedSalary.monthly.employerPF)}</td>
                        <td className="p-3 text-right">{formatCurrency(calculatedSalary.monthly.employerPF * 12)}</td>
                      </tr>
                      <tr className="border-b-2 border-gray-400 bg-blue-50 dark:bg-blue-950 font-bold">
                        <td className="p-3">Gross Salary</td>
                        <td className="p-3 text-right">{formatCurrency(calculatedSalary.monthly.grossSalary)}</td>
                        <td className="p-3 text-right">{formatCurrency(calculatedSalary.yearly.annualGrossSalary)}</td>
                      </tr>

                      {/* (B) Variables (Performance based) */}
                      <tr className="bg-gray-50 dark:bg-gray-900">
                        <td colSpan={3} className="p-2 font-bold text-lg">(B) Variables (Performance based)</td>
                      </tr>
                      <tr className="border-b-2 border-gray-400">
                        <td className="p-3">*Incentive ({formData.incentiveRate ?? 0}%)</td>
                        <td className="p-3 text-right">-</td>
                        <td className="p-3 text-right">{formatCurrency(calculatedSalary.yearly.annualIncentive)}</td>
                      </tr>

                      {/* (C) Benefits (Yearly) */}
                      <tr className="bg-gray-50 dark:bg-gray-900">
                        <td colSpan={3} className="p-2 font-bold text-lg">(C) Benefits (Yearly)</td>
                      </tr>
                      <tr className="border-b">
                        <td className="p-3">Medical Insurance</td>
                        <td className="p-3 text-right">-</td>
                        <td className="p-3 text-right">{formatCurrency(formData.medicalInsuranceAmount ?? 0)}</td>
                      </tr>
                      <tr className="border-b">
                        <td className="p-3">Gratuity ({formData.gratuityRate ?? 0}%)</td>
                        <td className="p-3 text-right">-</td>
                        <td className="p-3 text-right">{formatCurrency(calculatedSalary.yearly.annualGratuity)}</td>
                      </tr>
                      <tr className="border-b">
                        <td className="p-3">Statutory Bonus ({formData.statutoryBonusRate ?? 0}%)</td>
                        <td className="p-3 text-right">-</td>
                        <td className="p-3 text-right">{formatCurrency(calculatedSalary.yearly.annualStatutoryBonus)}</td>
                      </tr>
                      <tr className="border-b-2 border-gray-400 bg-blue-50 dark:bg-blue-950 font-bold">
                        <td className="p-3">Total Benefits (C)</td>
                        <td className="p-3 text-right">-</td>
                        <td className="p-3 text-right">{formatCurrency(calculatedSalary.yearly.totalAnnualBenefits)}</td>
                      </tr>

                      {/* (D) Allowances */}
                      <tr className="bg-gray-50 dark:bg-gray-900">
                        <td colSpan={3} className="p-2 font-bold text-lg">(D) Allowances</td>
                      </tr>
                      <tr className="border-b-2 border-gray-400">
                        <td className="p-3">Mobile Allowances</td>
                        <td className="p-3 text-right">
                          {formData.mobileAllowanceType === 'monthly' 
                            ? formatCurrency(formData.mobileAllowance ?? 0)
                            : '-'}
                        </td>
                        <td className="p-3 text-right">{formatCurrency(calculatedSalary.yearly.annualMobileAllowance)}</td>
                      </tr>

                      {/* Employee Deductions */}
                      <tr className="bg-gray-50 dark:bg-gray-900">
                        <td colSpan={3} className="p-2 font-bold text-lg">Employee Deductions</td>
                      </tr>
                      <tr className="border-b">
                        <td className="p-3">Employee contribution to PF ({formData.employeePFRate ?? 0}%)</td>
                        <td className="p-3 text-right">{formatCurrency(calculatedSalary.monthly.employeePF)}</td>
                        <td className="p-3 text-right">{formatCurrency(calculatedSalary.monthly.employeePF * 12)}</td>
                      </tr>
                      <tr className="border-b">
                        <td className="p-3">Employee contribution to ESI ({formData.employeeESIRate ?? 0}%)</td>
                        <td className="p-3 text-right">{formatCurrency(calculatedSalary.monthly.employeeESI)}</td>
                        <td className="p-3 text-right">{formatCurrency(calculatedSalary.monthly.employeeESI * 12)}</td>
                      </tr>
                      <tr className="border-b-2 border-gray-400 bg-red-50 dark:bg-red-950 font-bold">
                        <td className="p-3">Total Deductions</td>
                        <td className="p-3 text-right">{formatCurrency(calculatedSalary.monthly.totalMonthlyDeductions)}</td>
                        <td className="p-3 text-right">{formatCurrency(calculatedSalary.monthly.totalMonthlyDeductions * 12)}</td>
                      </tr>

                      {/* Net Salary */}
                      <tr className="bg-gray-50 dark:bg-gray-900">
                        <td colSpan={3} className="p-2 font-bold text-lg">Net Salary</td>
                      </tr>
                      <tr className="border-b-2 border-gray-400 bg-green-50 dark:bg-green-950 font-bold">
                        <td className="p-3">Net Salary per month</td>
                        <td className="p-3 text-right">{formatCurrency(calculatedSalary.monthly.netMonthlySalary)}</td>
                        <td className="p-3 text-right">{formatCurrency(calculatedSalary.yearly.annualNetSalary)}</td>
                      </tr>

                      {/* Total CTC */}
                      <tr className="bg-gray-50 dark:bg-gray-900">
                        <td colSpan={3} className="p-2 font-bold text-lg">Total CTC (A+B+C+D)</td>
                      </tr>
                      <tr className="border-b-2 border-gray-400 bg-blue-100 dark:bg-blue-900 font-bold text-lg">
                        <td className="p-3">Total CTC (A+B+C+D)</td>
                        <td className="p-3 text-right">-</td>
                        <td className="p-3 text-right">{formatCurrency(calculatedSalary.totalCTC)}</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Edit Form */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <Edit className="w-5 h-5" />
                    Edit Salary Structure Configuration
                  </CardTitle>
                  <CardDescription>
                    Enter salary components and rates. The table above updates automatically.
                  </CardDescription>
                </div>
                <Button onClick={handleCancel} variant="outline">
                  <X className="w-4 h-4 mr-2" />
                  Cancel
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
            {/* Fixed Salary Components */}
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <h3 className="text-lg font-semibold">Fixed Salary Components (Monthly)</h3>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="basicSalary">
                    Basic Salary <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="basicSalary"
                    type="number"
                    value={formData.basicSalary !== undefined && formData.basicSalary !== null ? formData.basicSalary : ''}
                    onChange={(e) => handleInputChange('basicSalary', e.target.value)}
                    placeholder="e.g., 11690"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="dearnessAllowance">Dearness Allowance (DA)</Label>
                  <Input
                    id="dearnessAllowance"
                    type="number"
                    value={formData.dearnessAllowance !== undefined && formData.dearnessAllowance !== null ? formData.dearnessAllowance : ''}
                    onChange={(e) => handleInputChange('dearnessAllowance', e.target.value)}
                    placeholder="Auto-calculated: 50% of Basic"
                  />
                  <p className="text-xs text-muted-foreground">
                    Auto-calculated as 50% of Basic Salary (can be manually adjusted)
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="houseRentAllowance">House Rent Allowance (HRA)</Label>
                  <Input
                    id="houseRentAllowance"
                    type="number"
                    value={formData.houseRentAllowance !== undefined && formData.houseRentAllowance !== null ? formData.houseRentAllowance : ''}
                    onChange={(e) => handleInputChange('houseRentAllowance', e.target.value)}
                    placeholder="Auto-calculated: 20% of Basic"
                  />
                  <p className="text-xs text-muted-foreground">
                    Auto-calculated as 20% of Basic Salary (can be manually adjusted)
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="specialAllowance">Special Allowance</Label>
                  <Input
                    id="specialAllowance"
                    type="number"
                    value={formData.specialAllowance !== undefined && formData.specialAllowance !== null ? formData.specialAllowance : ''}
                    onChange={(e) => handleInputChange('specialAllowance', e.target.value)}
                    placeholder="e.g., 0"
                  />
                </div>
              </div>
            </div>

            <Separator />

            {/* Employer Contributions */}
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <h3 className="text-lg font-semibold">Employer Contributions (Rates)</h3>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="employerPFRate">
                    Employer PF Rate (% of Basic)
                  </Label>
                  <Input
                    id="employerPFRate"
                    type="number"
                    step="0.01"
                    value={formData.employerPFRate !== undefined && formData.employerPFRate !== null ? formData.employerPFRate : ''}
                    onChange={(e) => handleInputChange('employerPFRate', e.target.value)}
                    placeholder="e.g., 13"
                  />
                  <p className="text-xs text-muted-foreground">
                    Standard: 13% of Basic Salary
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="employerESIRate">
                    Employer ESI Rate (% of Gross Fixed)
                  </Label>
                  <Input
                    id="employerESIRate"
                    type="number"
                    step="0.01"
                    value={formData.employerESIRate !== undefined && formData.employerESIRate !== null ? formData.employerESIRate : ''}
                    onChange={(e) => handleInputChange('employerESIRate', e.target.value)}
                    placeholder="e.g., 3.25"
                  />
                  <p className="text-xs text-muted-foreground">
                    Standard: 3.25% of Gross Fixed Salary
                  </p>
                </div>
              </div>
            </div>

            <Separator />

            {/* Variable Pay */}
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <h3 className="text-lg font-semibold">Variable Pay (Performance Based)</h3>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="incentiveRate">
                    Incentive Rate (% of Annual Gross)
                  </Label>
                  <Input
                    id="incentiveRate"
                    type="number"
                    step="0.01"
                    value={formData.incentiveRate !== undefined && formData.incentiveRate !== null ? formData.incentiveRate : ''}
                    onChange={(e) => handleInputChange('incentiveRate', e.target.value)}
                    placeholder="e.g., 5.25"
                  />
                </div>
              </div>
            </div>

            <Separator />

            {/* Benefits */}
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <h3 className="text-lg font-semibold">Benefits (Yearly)</h3>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="gratuityRate">
                    Gratuity Rate (% of Basic)
                  </Label>
                  <Input
                    id="gratuityRate"
                    type="number"
                    step="0.01"
                    value={formData.gratuityRate !== undefined && formData.gratuityRate !== null ? formData.gratuityRate : ''}
                    onChange={(e) => handleInputChange('gratuityRate', e.target.value)}
                    placeholder="e.g., 4.81"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="statutoryBonusRate">
                    Statutory Bonus Rate (% of Basic)
                  </Label>
                  <Input
                    id="statutoryBonusRate"
                    type="number"
                    step="0.01"
                    value={formData.statutoryBonusRate !== undefined && formData.statutoryBonusRate !== null ? formData.statutoryBonusRate : ''}
                    onChange={(e) => handleInputChange('statutoryBonusRate', e.target.value)}
                    placeholder="e.g., 8.33"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="medicalInsuranceAmount">
                    Medical Insurance Amount (Yearly)
                  </Label>
                  <Input
                    id="medicalInsuranceAmount"
                    type="number"
                    value={formData.medicalInsuranceAmount !== undefined && formData.medicalInsuranceAmount !== null ? formData.medicalInsuranceAmount : ''}
                    onChange={(e) => handleInputChange('medicalInsuranceAmount', e.target.value)}
                    placeholder="e.g., 5000"
                  />
                </div>
              </div>
            </div>

            <Separator />

            {/* Allowances */}
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <h3 className="text-lg font-semibold">Allowances (Optional)</h3>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="mobileAllowance">Mobile Allowance</Label>
                  <Input
                    id="mobileAllowance"
                    type="number"
                    value={formData.mobileAllowance !== undefined && formData.mobileAllowance !== null ? formData.mobileAllowance : ''}
                    onChange={(e) => handleInputChange('mobileAllowance', e.target.value)}
                    placeholder="e.g., 0"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="mobileAllowanceType">Mobile Allowance Type</Label>
                  <select
                    id="mobileAllowanceType"
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                    value={formData.mobileAllowanceType || 'monthly'}
                    onChange={(e) => handleInputChange('mobileAllowanceType', e.target.value)}
                  >
                    <option value="monthly">Monthly</option>
                    <option value="yearly">Yearly</option>
                  </select>
                </div>
              </div>
            </div>

            <Separator />

            {/* Employee Deductions */}
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <h3 className="text-lg font-semibold">Employee Deductions (Rates)</h3>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="employeePFRate">
                    Employee PF Rate (% of Basic)
                  </Label>
                  <Input
                    id="employeePFRate"
                    type="number"
                    step="0.01"
                    value={formData.employeePFRate !== undefined && formData.employeePFRate !== null ? formData.employeePFRate : ''}
                    onChange={(e) => handleInputChange('employeePFRate', e.target.value)}
                    placeholder="e.g., 12"
                  />
                  <p className="text-xs text-muted-foreground">
                    Standard: 12% of Basic Salary
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="employeeESIRate">
                    Employee ESI Rate (% of Gross Salary)
                  </Label>
                  <Input
                    id="employeeESIRate"
                    type="number"
                    step="0.01"
                    value={formData.employeeESIRate !== undefined && formData.employeeESIRate !== null ? formData.employeeESIRate : ''}
                    onChange={(e) => handleInputChange('employeeESIRate', e.target.value)}
                    placeholder="e.g., 0.75"
                  />
                  <p className="text-xs text-muted-foreground">
                    Standard: 0.75% of Gross Salary
                  </p>
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-4">
              <Button
                onClick={handleCancel}
                variant="outline"
                disabled={isUpdating}
              >
                <X className="w-4 h-4 mr-2" />
                Cancel
              </Button>
              <Button
                onClick={handleSave}
                disabled={isUpdating || !formData.basicSalary || formData.basicSalary <= 0}
                className="min-w-[120px]"
              >
                <Save className="w-4 h-4 mr-2" />
                {isUpdating ? 'Saving...' : 'Save Structure'}
              </Button>
            </div>
          </CardContent>
        </Card>
        </>
      )}

      {/* Show form if no salary structure exists yet */}
      {!isEditing && !previewSalary && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <DollarSign className="w-5 h-5" />
              Salary Structure Configuration
            </CardTitle>
            <CardDescription>
              No salary structure configured yet. Click "Create Structure" to set up the salary details.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={() => setIsEditing(true)}>
              <Edit className="w-4 h-4 mr-2" />
              Create Structure
            </Button>
          </CardContent>
        </Card>
      )}

    </div>
  );
};

export default SalaryStructureForm;

