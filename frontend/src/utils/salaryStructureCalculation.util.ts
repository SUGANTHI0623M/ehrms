/**
 * Frontend Salary Structure Calculation Utility
 * All calculations are done dynamically - NO values are stored except base inputs
 */

export interface SalaryStructureInputs {
  // Fixed Salary Components (Monthly)
  basicSalary: number;
  dearnessAllowance?: number;
  houseRentAllowance?: number;
  specialAllowance?: number;
  
  // Employer Contribution Rates (%)
  employerPFRate?: number; // % of Basic
  employerESIRate?: number; // % of Gross Fixed Salary
  
  // Variable Pay Rate (%)
  incentiveRate?: number; // % of Annual Gross Salary
  
  // Benefits Rates and Fixed Values
  gratuityRate?: number; // % of Basic
  statutoryBonusRate?: number; // % of Basic
  medicalInsuranceAmount?: number; // Fixed yearly value
  
  // Allowances
  mobileAllowance?: number;
  mobileAllowanceType?: 'monthly' | 'yearly';
  
  // Employee Deduction Rates (%)
  employeePFRate?: number; // % of Basic
  employeeESIRate?: number; // % of Gross Salary
}

export interface CalculatedSalaryStructure {
  // Monthly Calculations
  monthly: {
    // Fixed Components
    basicSalary: number;
    dearnessAllowance: number;
    houseRentAllowance: number;
    specialAllowance: number;
    grossFixedSalary: number; // basicSalary + DA + HRA + specialAllowance
    
    // Employer Contributions
    employerPF: number; // basicSalary × employerPFRate / 100
    employerESI: number; // grossFixedSalary × employerESIRate / 100
    grossSalary: number; // grossFixedSalary + employerPF + employerESI
    
    // Employee Deductions
    employeePF: number; // basicSalary × employeePFRate / 100
    employeeESI: number; // grossSalary × employeeESIRate / 100
    totalMonthlyDeductions: number; // employeePF + employeeESI
    
    // Net Salary
    netMonthlySalary: number; // grossSalary - totalMonthlyDeductions
  };
  
  // Yearly Calculations
  yearly: {
    annualGrossSalary: number; // grossSalary × 12
    annualIncentive: number; // annualGrossSalary × incentiveRate / 100
    annualGratuity: number; // basicSalary × 12 × gratuityRate / 100
    annualStatutoryBonus: number; // basicSalary × 12 × statutoryBonusRate / 100
    medicalInsuranceAmount: number; // Fixed yearly medical insurance
    totalAnnualBenefits: number; // annualGratuity + annualStatutoryBonus + medicalInsuranceAmount
    annualMobileAllowance: number; // mobileAllowance × 12 (if monthly) or mobileAllowance (if yearly)
    annualNetSalary: number; // netMonthlySalary × 12
  };
  
  // Total CTC (Employer Cost Only)
  totalCTC: number; // annualGrossSalary + annualIncentive + totalAnnualBenefits + annualMobileAllowance
}

/**
 * Calculate complete salary structure from inputs
 * All values are calculated dynamically - no stored totals
 * 
 * VERIFIED FORMULAS (Based on Payroll Standards):
 * 
 * 1. Fixed Gross = Basic + DA + HRA + Special Allowance
 * 2. Gross Salary = Fixed Gross + Employer PF + Employer ESI
 *    - Employer PF = % of Basic
 *    - Employer ESI = % of Fixed Gross
 * 3. Net Salary = Gross Salary - Employee Deductions
 *    - Employee PF = % of Basic
 *    - Employee ESI = % of Gross Salary (NOT Fixed Gross)
 * 4. Annual Gross = Monthly Gross × 12
 * 5. Incentive = % of Annual Gross Salary
 * 6. Benefits = Gratuity + Statutory Bonus + Medical Insurance
 *    - Gratuity = % of (Basic × 12)
 *    - Statutory Bonus = % of (Basic × 12)
 * 7. CTC = Annual Gross + Incentive + Benefits + Allowances
 *    NOTE: Employee deductions are NOT part of CTC
 */
export function calculateSalaryStructure(inputs: SalaryStructureInputs): CalculatedSalaryStructure {
  // ============================================
  // STEP 1: Fixed Monthly Components
  // ============================================
  const basicSalary = inputs.basicSalary ?? 0;
  const dearnessAllowance = inputs.dearnessAllowance ?? 0;
  const houseRentAllowance = inputs.houseRentAllowance ?? 0;
  const specialAllowance = inputs.specialAllowance ?? 0;
  
  // Gross Fixed Salary (Before Employer Contributions)
  const grossFixedSalary = basicSalary + dearnessAllowance + houseRentAllowance + specialAllowance;
  
  // ============================================
  // STEP 2: Employer Contributions (Part of Gross Salary & CTC)
  // ============================================
  // Employer PF = % of Basic Salary
  const employerPF = (inputs.employerPFRate ?? 0) 
    ? (basicSalary * (inputs.employerPFRate ?? 0) / 100)
    : 0;
  
  // Employer ESI = % of Gross Fixed Salary (NOT Gross Salary)
  const employerESI = (inputs.employerESIRate ?? 0) 
    ? (grossFixedSalary * (inputs.employerESIRate ?? 0) / 100)
    : 0;
  
  // Gross Salary (Monthly) = Fixed Gross + Employer Contributions
  // This is the employer's monthly cost
  const grossSalary = grossFixedSalary + employerPF + employerESI;
  
  // ============================================
  // STEP 3: Employee Deductions (NOT part of CTC)
  // ============================================
  // Employee PF = % of Basic Salary
  const employeePF = (inputs.employeePFRate ?? 0) 
    ? (basicSalary * (inputs.employeePFRate ?? 0) / 100)
    : 0;
  
  // Employee ESI = % of Gross Salary (NOT Fixed Gross)
  // IMPORTANT: This is calculated on Gross Salary, not Gross Fixed
  const employeeESI = (inputs.employeeESIRate ?? 0) 
    ? (grossSalary * (inputs.employeeESIRate ?? 0) / 100)
    : 0;
  
  const totalMonthlyDeductions = employeePF + employeeESI;
  
  // ============================================
  // STEP 4: Net Salary (Take-Home Pay)
  // ============================================
  // Net Monthly Salary = Gross Salary - Employee Deductions
  const netMonthlySalary = grossSalary - totalMonthlyDeductions;
  
  // ============================================
  // STEP 5: Yearly Calculations
  // ============================================
  // Annual Gross Salary = Monthly Gross × 12
  const annualGrossSalary = grossSalary * 12;
  
  // Variable Pay: Incentive = % of Annual Gross Salary
  const annualIncentive = (inputs.incentiveRate ?? 0) 
    ? (annualGrossSalary * (inputs.incentiveRate ?? 0) / 100)
    : 0;
  
  // Benefits (Yearly - Employer Cost)
  // Gratuity = % of (Basic × 12)
  const annualGratuity = (inputs.gratuityRate ?? 0) 
    ? (basicSalary * 12 * (inputs.gratuityRate ?? 0) / 100)
    : 0;
  
  // Statutory Bonus = % of (Basic × 12)
  const annualStatutoryBonus = (inputs.statutoryBonusRate ?? 0) 
    ? (basicSalary * 12 * (inputs.statutoryBonusRate ?? 0) / 100)
    : 0;
  
  // Medical Insurance (Fixed yearly amount)
  const medicalInsuranceAmount = inputs.medicalInsuranceAmount ?? 0;
  
  // Total Annual Benefits
  const totalAnnualBenefits = annualGratuity + annualStatutoryBonus + medicalInsuranceAmount;
  
  // Mobile Allowance (Annual)
  const annualMobileAllowance = (inputs.mobileAllowance ?? 0) 
    ? (inputs.mobileAllowanceType === 'yearly' 
      ? (inputs.mobileAllowance ?? 0)
      : (inputs.mobileAllowance ?? 0) * 12)
    : 0;
  
  // Annual Net Salary = Monthly Net × 12
  const annualNetSalary = netMonthlySalary * 12;
  
  // ============================================
  // STEP 6: Total CTC (Cost to Company)
  // ============================================
  // CTC = Annual Gross + Incentive + Benefits + Allowances
  // IMPORTANT: Employee deductions are NOT included in CTC
  const totalCTC = annualGrossSalary + annualIncentive + totalAnnualBenefits + annualMobileAllowance;
  
  return {
    monthly: {
      basicSalary,
      dearnessAllowance,
      houseRentAllowance,
      specialAllowance,
      grossFixedSalary,
      employerPF,
      employerESI,
      grossSalary,
      employeePF,
      employeeESI,
      totalMonthlyDeductions,
      netMonthlySalary,
    },
    yearly: {
      annualGrossSalary,
      annualIncentive,
      annualGratuity,
      annualStatutoryBonus,
      medicalInsuranceAmount,
      totalAnnualBenefits,
      annualMobileAllowance,
      annualNetSalary,
    },
    totalCTC,
  };
}

/**
 * Calculate prorated salary based on working days and attendance
 */
export function calculateProratedSalary(
  calculatedSalary: CalculatedSalaryStructure,
  workingDays: number,
  presentDays: number
): {
  proratedGrossSalary: number;
  proratedDeductions: number;
  proratedNetSalary: number;
  attendancePercentage: number;
} {
  if (workingDays === 0) {
    return {
      proratedGrossSalary: 0,
      proratedDeductions: 0,
      proratedNetSalary: 0,
      attendancePercentage: 0,
    };
  }
  
  const attendancePercentage = (presentDays / workingDays) * 100;
  const prorationFactor = presentDays / workingDays;
  
  // Prorate gross salary (based on fixed components + employer contributions)
  const proratedGrossSalary = calculatedSalary.monthly.grossSalary * prorationFactor;
  
  // Prorate deductions
  const proratedDeductions = calculatedSalary.monthly.totalMonthlyDeductions * prorationFactor;
  
  // Prorated net salary
  const proratedNetSalary = proratedGrossSalary - proratedDeductions;
  
  return {
    proratedGrossSalary,
    proratedDeductions,
    proratedNetSalary,
    attendancePercentage,
  };
}

/**
 * Format currency (INR)
 */
export function formatCurrency(amount: number): string {
  return `₹ ${amount.toLocaleString('en-IN', { 
    minimumFractionDigits: 2, 
    maximumFractionDigits: 2 
  })}`;
}

