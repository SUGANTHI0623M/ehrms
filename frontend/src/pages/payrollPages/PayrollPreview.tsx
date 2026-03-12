import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import MainLayout from "@/components/MainLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Separator } from "@/components/ui/separator";
import {
  ArrowLeft,
  CheckCircle2,
  XCircle,
  FileText,
  Users,
  DollarSign,
} from "lucide-react";
import {
  usePreviewPayrollMutation,
  usePreviewBulkPayrollMutation,
  useGeneratePayrollMutation,
  useBulkGeneratePayrollMutation,
} from "@/store/api/payrollApi";
import { useGetLoansQuery } from "@/store/api/loanApi";
import { useGetReimbursementsQuery } from "@/store/api/reimbursementApi";
import { message } from "antd";
import { format } from "date-fns";
import { formatINR } from "@/utils/currencyUtils";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const PayrollPreview = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const isBulk = searchParams.get("bulk") === "true";
  const employeeId = searchParams.get("employeeId");
  const month = Number(searchParams.get("month"));
  const year = Number(searchParams.get("year"));

  const [previewData, setPreviewData] = useState<any>(null);
  const [isLoadingPreview, setIsLoadingPreview] = useState(true);
  const [includeLoanEMI, setIncludeLoanEMI] = useState<boolean>(false);
  const [selectedExpenseClaims, setSelectedExpenseClaims] = useState<string[]>([]);
  const [expensePaymentCycle, setExpensePaymentCycle] = useState<'current' | 'previous' | 'next'>('current');

  const [previewPayroll] = usePreviewPayrollMutation();
  const [previewBulkPayroll] = usePreviewBulkPayrollMutation();
  const [generatePayroll, { isLoading: isGenerating }] =
    useGeneratePayrollMutation();
  const [bulkGeneratePayroll, { isLoading: isBulkGenerating }] =
    useBulkGeneratePayrollMutation();

  // Fetch employee loans to check if they have approved/active loans
  // Fetch all loans for the employee (not filtering by status) to check for both Approved and Active
  const { data: loansData } = useGetLoansQuery(
    { employeeId: employeeId || "", limit: 100 },
    { skip: !employeeId || isBulk }
  );
  
  const hasApprovedLoans = loansData?.data?.loans?.some(
    (loan: any) => (loan.status === 'Approved' || loan.status === 'Active') && loan.remainingAmount > 0
  ) || false;

  // Fetch approved expense claims
  const { data: expenseClaimsData } = useGetReimbursementsQuery(
    { employeeId: employeeId || "", status: "Approved", limit: 100 },
    { skip: !employeeId || isBulk }
  );
  
  const approvedExpenseClaims = expenseClaimsData?.data?.reimbursements?.filter(
    (claim: any) => claim.status === 'Approved' && !claim.processedInPayroll
  ) || [];

  useEffect(() => {
    const fetchPreview = async () => {
      if (!month || !year) {
        message.error("Month and year are required");
        navigate("/payroll/management");
        return;
      }

      try {
        setIsLoadingPreview(true);
        let result;
        if (isBulk) {
          result = await previewBulkPayroll({ month, year }).unwrap();
        } else {
          if (!employeeId) {
            message.error("Employee ID is required");
            navigate("/payroll/management");
            return;
          }
          // Explicitly pass includeLoanEMI as boolean to ensure backend receives it correctly
          const previewPayload: any = { 
            employeeId, 
            month, 
            year, 
            includeLoanEMI: Boolean(includeLoanEMI) // Ensure it's always a boolean
          };
          console.log('[PayrollPreview] Fetching preview with:', previewPayload);
          result = await previewPayroll(previewPayload).unwrap();
          console.log('[PayrollPreview] Preview data received:', {
            components: result.data.preview.components?.length,
            deductions: result.data.preview.deductions,
            loanEMIComponents: result.data.preview.components?.filter((c: any) => c.name?.includes('Loan EMI')),
            allComponents: result.data.preview.components?.map((c: any) => ({ name: c.name, type: c.type, amount: c.amount }))
          });
        }
        setPreviewData(result.data.preview);
      } catch (error: any) {
        message.error(error?.data?.error?.message || "Failed to load preview");
        navigate("/payroll/management");
      } finally {
        setIsLoadingPreview(false);
      }
    };

    fetchPreview();
  }, [
    isBulk,
    employeeId,
    month,
    year,
    includeLoanEMI,
    previewPayroll,
    previewBulkPayroll,
    navigate,
  ]);

  const handleGenerate = async () => {
    try {
      if (isBulk) {
        const result = await bulkGeneratePayroll({ month, year }).unwrap();
        message.success(
          `Bulk generation completed! Success: ${result.data.results.success}, Failed: ${result.data.results.failed}, Skipped: ${result.data.results.skipped}`,
        );
      } else {
        if (!employeeId) return;
        const result = await generatePayroll({
          employeeId,
          month,
          year,
          includeLoanEMI,
          selectedExpenseClaims: selectedExpenseClaims.length > 0 ? selectedExpenseClaims : undefined,
          expensePaymentCycle: selectedExpenseClaims.length > 0 ? expensePaymentCycle : undefined,
        }).unwrap();
        message.success(
          `Payroll generated successfully! Attendance: ${result.data.attendance.attendancePercentage.toFixed(1)}%`,
        );
      }
      navigate("/payroll/management");
    } catch (error: any) {
      message.error(
        error?.data?.error?.message || "Failed to generate payroll",
      );
    }
  };

  const monthNames = [
    "January",
    "February",
    "March",
    "April",
    "May",
    "June",
    "July",
    "August",
    "September",
    "October",
    "November",
    "December",
  ];

  if (isLoadingPreview) {
    return (
      <MainLayout>
        <main className="p-4">
          <div className="mx-auto max-w-6xl">
            <div className="text-center py-8">Loading preview...</div>
          </div>
        </main>
      </MainLayout>
    );
  }

  if (!previewData) {
    return (
      <MainLayout>
        <main className="p-4">
          <div className="mx-auto max-w-6xl">
            <div className="text-center py-8 text-muted-foreground">
              No preview data available
            </div>
          </div>
        </main>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <main className="p-4">
        <div className="space-y-6">
          {/* Header */}
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => navigate("/payroll/management")}
              >
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back
              </Button>
              <h1 className="text-3xl font-bold text-foreground">
                {isBulk ? "Bulk Payroll Preview" : "Payroll Preview"}
              </h1>
            </div>
          </div>

          {/* Period Info */}
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Period</p>
                  <p className="text-lg font-semibold">
                    {monthNames[month - 1]} {year}
                  </p>
                </div>
                {!isBulk && previewData.employee && (
                  <div>
                    <p className="text-sm text-muted-foreground">Employee</p>
                    <p className="text-lg font-semibold">
                      {previewData.employee.name} (
                      {previewData.employee.employeeId})
                    </p>
                  </div>
                )}
              </div>
              
              {/* Payroll Options Section - Loan EMI and Expense Claims */}
              {!isBulk && (hasApprovedLoans || approvedExpenseClaims.length > 0) && (
                <div className="mt-4 pt-4 border-t">
                  <div className="space-y-4">
                    <div>
                      <h3 className="text-sm font-semibold mb-2">Payroll Options</h3>
                      <p className="text-xs text-muted-foreground mb-4">
                        You can include both loan EMI deductions and expense claims in this payroll
                      </p>
                    </div>

                    {/* Loan EMI Deduction Option */}
                    {hasApprovedLoans && (
                      <div className="p-3 border rounded-lg bg-blue-50/50 dark:bg-blue-950/20">
                        <div className="flex items-center space-x-2">
                          <Checkbox
                            id="includeLoanEMI"
                            checked={includeLoanEMI}
                            onCheckedChange={(checked) => {
                              const newValue = checked === true;
                              console.log('[PayrollPreview] includeLoanEMI checkbox changed:', { checked, newValue });
                              setIncludeLoanEMI(newValue);
                            }}
                          />
                          <Label
                            htmlFor="includeLoanEMI"
                            className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer flex-1"
                          >
                            Include Loan EMI Deduction
                          </Label>
                        </div>
                        <p className="text-xs text-muted-foreground mt-1 ml-6">
                          Active loan EMI amounts will be deducted from the employee's salary for this payroll period
                        </p>
                      </div>
                    )}

                    {/* Expense Claims Option */}
                    {approvedExpenseClaims.length > 0 && (
                      <div className="p-3 border rounded-lg bg-green-50/50 dark:bg-green-950/20">
                        <div className="space-y-3">
                          <div>
                            <Label className="text-sm font-medium">Include Expense Claims</Label>
                            <p className="text-xs text-muted-foreground mt-1">
                              Select approved expense claims to add to this payroll
                            </p>
                          </div>
                          <div className="space-y-2 max-h-60 overflow-y-auto">
                            {approvedExpenseClaims.map((claim: any) => (
                              <div key={claim._id} className="flex items-center space-x-2 p-2 border rounded bg-white dark:bg-gray-900">
                                <Checkbox
                                  id={`claim-${claim._id}`}
                                  checked={selectedExpenseClaims.includes(claim._id)}
                                  onCheckedChange={(checked) => {
                                    if (checked) {
                                      setSelectedExpenseClaims([...selectedExpenseClaims, claim._id]);
                                    } else {
                                      setSelectedExpenseClaims(selectedExpenseClaims.filter((id) => id !== claim._id));
                                    }
                                  }}
                                />
                                <Label
                                  htmlFor={`claim-${claim._id}`}
                                  className="flex-1 text-sm cursor-pointer"
                                >
                                  <div className="flex justify-between items-center">
                                    <span>{claim.type} - {claim.description}</span>
                                    <span className="font-semibold  ">{formatINR(claim.amount)}</span>
                                  </div>
                                  <span className="text-xs text-muted-foreground">
                                    {format(new Date(claim.date), "MMM dd, yyyy")}
                                  </span>
                                </Label>
                              </div>
                            ))}
                          </div>
                          {selectedExpenseClaims.length > 0 && (
                            <div className="space-y-2 pt-2 border-t">
                              <Label className="text-sm font-medium">Payment Cycle</Label>
                              <Select
                                value={expensePaymentCycle}
                                onValueChange={(value: 'current' | 'previous' | 'next') => setExpensePaymentCycle(value)}
                              >
                                <SelectTrigger>
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="current">Current Month Payroll</SelectItem>
                                  <SelectItem value="previous">Previous Month Payroll</SelectItem>
                                  <SelectItem value="next">Next Pay Cycle</SelectItem>
                                </SelectContent>
                              </Select>
                              <p className="text-xs text-muted-foreground">
                                Choose when to pay the selected expense claims
                              </p>
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Single Payroll Preview */}
          {!isBulk && (
            <>
              <Card>
                <CardHeader>
                  <CardTitle>Payroll Details</CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  {/* Summary */}
                  <div className="grid grid-cols-3 gap-4">
                    <div className="p-4 border rounded-lg">
                      <p className="text-sm text-muted-foreground">
                        Gross Salary
                      </p>
                      <p className="text-xl font-bold text-[#efaa1f]">
                        {formatINR(previewData.grossSalary)}
                      </p>
                    </div>
                    <div className="p-4 border rounded-lg">
                      <p className="text-sm text-muted-foreground">
                        Deductions
                      </p>
                      <p className="text-xl font-bold   ">
                        {formatINR(previewData.deductions)}
                      </p>
                    </div>
                    <div className="p-4 border rounded-lg bg-primary/5">
                      <p className="text-sm text-muted-foreground">Net Pay</p>
                      <p className="text-xl font-bold text-primary">
                        {formatINR(previewData.netPay)}
                      </p>
                      {previewData.attendance && (
                        <p className="text-xs text-muted-foreground mt-1">
                          {previewData.attendance.presentDays % 1 === 0
                            ? previewData.attendance.presentDays
                            : previewData.attendance.presentDays.toFixed(
                                1,
                              )}{" "}
                          days / {previewData.attendance.workingDays} days
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Salary Calculation Breakdown */}
                  {previewData.attendance && (
                    <div className="mt-4 p-4 bg-muted/30 rounded-lg">
                      <h4 className="font-semibold text-sm mb-2">
                        Calculation Breakdown
                      </h4>
                      <div className="space-y-1 text-xs">
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">
                            Present Days:
                          </span>
                          <span className="font-medium">
                            {previewData.attendance.presentDays % 1 === 0
                              ? previewData.attendance.presentDays
                              : previewData.attendance.presentDays.toFixed(1)}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">
                            Working Days:
                          </span>
                          <span className="font-medium">
                            {previewData.attendance.workingDays}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">
                            Attendance %:
                          </span>
                          <span className="font-medium">
                            {previewData.attendance.attendancePercentage.toFixed(
                              2,
                            )}
                            %
                          </span>
                        </div>
                        {previewData.attendance.fullDayPresent !==
                          undefined && (
                          <>
                            <div className="flex justify-between mt-2 pt-2 border-t">
                              <span className="text-muted-foreground">
                                Full Day Present:
                              </span>
                              <span className="font-medium text-[#efaa1f]">
                                {previewData.attendance.fullDayPresent || 0}
                              </span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-muted-foreground">
                                Half Day Present:
                              </span>
                              <span className="font-medium text-blue-600">
                                {previewData.attendance.halfDayPresent || 0}
                              </span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-muted-foreground">
                                Full Day Leaves:
                              </span>
                              <span className="font-medium ">
                                {previewData.attendance.fullDayLeaves || 0}
                              </span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-muted-foreground">
                                Half Day Leaves:
                              </span>
                              <span className="font-medium ">
                                {previewData.attendance.halfDayLeaves || 0}
                              </span>
                            </div>
                          </>
                        )}
                        {previewData.attendance.fineAmount > 0 && (
                          <div className="flex justify-between    mt-2 pt-2 border-t">
                            <span>Fine Deduction:</span>
                            <span className="font-medium">
                              -{formatINR(
                                previewData.attendance.fineAmount,
                              )}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  <Separator />

                  {/* Attendance Info */}
                  <div>
                    <h3 className="font-semibold text-lg mb-4">
                      Attendance Information
                    </h3>
                    <div className="grid grid-cols-3 gap-4 mb-4">
                      <div>
                        <p className="text-sm text-muted-foreground">
                          Working Days
                        </p>
                        <p className="text-lg font-semibold">
                          {previewData.attendance.workingDays}
                        </p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">
                          Present Days
                        </p>
                        <p className="text-lg font-semibold">
                          {previewData.attendance.presentDays % 1 === 0
                            ? previewData.attendance.presentDays
                            : previewData.attendance.presentDays.toFixed(1)}
                        </p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">
                          Attendance %
                        </p>
                        <p className="text-lg font-semibold">
                          {previewData.attendance.attendancePercentage.toFixed(
                            1,
                          )}
                          %
                        </p>
                      </div>
                    </div>
                    {/* Detailed Breakdown */}
                    {(previewData.attendance.fullDayPresent ||
                      previewData.attendance.halfDayPresent ||
                      previewData.attendance.fullDayLeaves ||
                      previewData.attendance.halfDayLeaves) && (
                      <div className="mt-4 pt-4 border-t">
                        <p className="text-sm font-medium text-muted-foreground mb-3">
                          Attendance Breakdown
                        </p>
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
                          {previewData.attendance.fullDayPresent > 0 && (
                            <div className="p-2 bg-[#fffbeb] dark:bg-[#78350f] rounded">
                              <div className="text-xs text-muted-foreground">
                                Full Day Present
                              </div>
                              <div className="font-semibold text-[#efaa1f]">
                                {previewData.attendance.fullDayPresent}
                              </div>
                            </div>
                          )}
                          {previewData.attendance.halfDayPresent > 0 && (
                            <div className="p-2 bg-blue-50 dark:bg-blue-950 rounded">
                              <div className="text-xs text-muted-foreground">
                                Half Day Present
                              </div>
                              <div className="font-semibold text-blue-600">
                                {previewData.attendance.halfDayPresent}
                              </div>
                            </div>
                          )}
                          {previewData.attendance.fullDayLeaves > 0 && (
                            <div className="p-2 bg-purple-50 dark:bg-purple-950 rounded">
                              <div className="text-xs text-muted-foreground">
                                Full Day Leaves
                              </div>
                              <div className="font-semibold ">
                                {previewData.attendance.fullDayLeaves}
                              </div>
                            </div>
                          )}
                          {previewData.attendance.halfDayLeaves > 0 && (
                            <div className="p-2 bg-orange-50 dark:bg-orange-950 rounded">
                              <div className="text-xs text-muted-foreground">
                                Half Day Leaves
                              </div>
                              <div className="font-semibold ">
                                {previewData.attendance.halfDayLeaves}
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>

                  <Separator />

                  {/* Components */}
                  <div>
                    <h3 className="font-semibold text-lg mb-4">
                      Salary Components
                    </h3>
                    <div className="space-y-2">
                      {previewData.components?.map((comp: any, idx: number) => (
                        <div
                          key={idx}
                          className="flex items-center justify-between p-3 border rounded-lg"
                        >
                          <div className="flex items-center gap-3">
                            <Badge
                              variant={
                                comp.type === "earning"
                                  ? "default"
                                  : "destructive"
                              }
                              className="text-xs"
                            >
                              {comp.type}
                            </Badge>
                            <span className="font-medium">{comp.name}</span>
                          </div>
                          <span
                            className={`font-semibold ${
                              comp.type === "earning"
                                ? "text-[#efaa1f]"
                                : "  "
                            }`}
                          >
                            {comp.type === "earning" ? "+" : "-"} {formatINR(comp.amount)}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </>
          )}

          {/* Bulk Payroll Preview */}
          {isBulk && (
            <>
              {/* Summary Card */}
              <Card className="bg-gradient-to-br from-primary/10 to-primary/5 border-primary/20">
                <CardHeader>
                  <CardTitle>Summary</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-4 gap-4">
                    <div>
                      <p className="text-sm text-muted-foreground">
                        Total Employees
                      </p>
                      <p className="text-2xl font-bold">
                        {previewData.summary.totalEmployees}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">
                        Total Gross
                      </p>
                      <p className="text-2xl font-bold text-[#efaa1f]">
                        {formatINR(previewData.summary.totalGross)}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">
                        Total Deductions
                      </p>
                      <p className="text-2xl font-bold   ">
                        {formatINR(previewData.summary.totalDeductions)}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">
                        Total Net Pay
                      </p>
                      <p className="text-2xl font-bold text-primary">
                        {formatINR(previewData.summary.totalNetPay)}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Errors */}
              {previewData.errors && previewData.errors.length > 0 && (
                <Card className="border-yellow-200 bg-yellow-50">
                  <CardHeader>
                    <CardTitle className="text-yellow-800">Warnings</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      {previewData.errors.map((error: string, idx: number) => (
                        <div
                          key={idx}
                          className="flex items-start gap-2 text-sm text-yellow-800"
                        >
                          <XCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
                          <span>{error}</span>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Employee List */}
              <Card>
                <CardHeader>
                  <CardTitle>Employee Payroll Details</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4 max-h-[600px] overflow-y-auto">
                    {previewData.previews?.map((preview: any, idx: number) => (
                      <Card key={idx} className="border">
                        <CardContent className="pt-6">
                          <div className="space-y-4">
                            {/* Employee Header */}
                            <div className="flex items-center justify-between pb-2 border-b">
                              <div>
                                <p className="font-semibold text-lg">
                                  {preview.employee.name}
                                </p>
                                <p className="text-sm text-muted-foreground">
                                  {preview.employee.employeeId} •{" "}
                                  {preview.employee.designation || "N/A"}
                                </p>
                              </div>
                              <div className="text-right">
                                <p className="text-sm text-muted-foreground">
                                  Net Pay
                                </p>
                                <p className="text-xl font-bold text-primary">
                                  {formatINR(preview.netPay)}
                                </p>
                              </div>
                            </div>

                            {/* Summary */}
                            <div className="grid grid-cols-3 gap-4">
                              <div>
                                <p className="text-sm text-muted-foreground">
                                  Gross
                                </p>
                                <p className="font-semibold text-[#efaa1f]">
                                  {formatINR(preview.grossSalary)}
                                </p>
                              </div>
                              <div>
                                <p className="text-sm text-muted-foreground">
                                  Deductions
                                </p>
                                <p className="font-semibold   ">
                                  {formatINR(preview.deductions)}
                                </p>
                              </div>
                              <div>
                                <p className="text-sm text-muted-foreground">
                                  Attendance
                                </p>
                                <p className="font-semibold">
                                  {preview.attendance.attendancePercentage.toFixed(
                                    1,
                                  )}
                                  %
                                </p>
                              </div>
                            </div>

                            {/* Components (Collapsible) */}
                            <details className="mt-2">
                              <summary className="cursor-pointer text-sm font-medium text-muted-foreground hover:text-foreground">
                                View Components (
                                {preview.components?.length || 0})
                              </summary>
                              <div className="mt-3 space-y-2">
                                {preview.components?.map(
                                  (comp: any, compIdx: number) => (
                                    <div
                                      key={compIdx}
                                      className="flex items-center justify-between p-2 border rounded text-sm"
                                    >
                                      <div className="flex items-center gap-2">
                                        <Badge
                                          variant={
                                            comp.type === "earning"
                                              ? "default"
                                              : "destructive"
                                          }
                                          className="text-xs"
                                        >
                                          {comp.type}
                                        </Badge>
                                        <span>{comp.name}</span>
                                      </div>
                                      <span
                                        className={`font-semibold ${
                                          comp.type === "earning"
                                            ? "text-[#efaa1f]"
                                            : "  "
                                        }`}
                                      >
                                        {comp.type === "earning" ? "+" : "-"} {formatINR(comp.amount)}
                                      </span>
                                    </div>
                                  ),
                                )}
                              </div>
                            </details>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </>
          )}

          {/* Action Card */}
          <Card>
            <CardHeader>
              <CardTitle>Confirm & Generate</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <Alert>
                <AlertDescription>
                  Please review the payroll details above. Once you confirm, the
                  payroll will be generated and cannot be undone.
                </AlertDescription>
              </Alert>

              <div className="flex gap-2 pt-4">
                <Button
                  variant="outline"
                  onClick={() => navigate("/payroll/management")}
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleGenerate}
                  disabled={isGenerating || isBulkGenerating}
                  className="flex-1"
                >
                  {isGenerating || isBulkGenerating ? (
                    "Generating..."
                  ) : (
                    <>
                      <CheckCircle2 className="mr-2 h-4 w-4" />
                      {isBulk ? "Generate All Payrolls" : "Generate Payroll"}
                    </>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </main>
    </MainLayout>
  );
};

export default PayrollPreview;
