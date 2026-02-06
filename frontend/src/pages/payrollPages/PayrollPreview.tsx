import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import MainLayout from "@/components/MainLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Separator } from "@/components/ui/separator";
import { ArrowLeft, CheckCircle2, XCircle, FileText, Users, DollarSign } from "lucide-react";
import {
  usePreviewPayrollMutation,
  usePreviewBulkPayrollMutation,
  useGeneratePayrollMutation,
  useBulkGeneratePayrollMutation,
} from "@/store/api/payrollApi";
import { message } from "antd";
import { format } from "date-fns";

const PayrollPreview = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const isBulk = searchParams.get("bulk") === "true";
  const employeeId = searchParams.get("employeeId");
  const month = Number(searchParams.get("month"));
  const year = Number(searchParams.get("year"));

  const [previewData, setPreviewData] = useState<any>(null);
  const [isLoadingPreview, setIsLoadingPreview] = useState(true);

  const [previewPayroll] = usePreviewPayrollMutation();
  const [previewBulkPayroll] = usePreviewBulkPayrollMutation();
  const [generatePayroll, { isLoading: isGenerating }] = useGeneratePayrollMutation();
  const [bulkGeneratePayroll, { isLoading: isBulkGenerating }] = useBulkGeneratePayrollMutation();

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
          result = await previewPayroll({ employeeId, month, year }).unwrap();
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
  }, [isBulk, employeeId, month, year, previewPayroll, previewBulkPayroll, navigate]);

  const handleGenerate = async () => {
    try {
      if (isBulk) {
        const result = await bulkGeneratePayroll({ month, year }).unwrap();
        message.success(
          `Bulk generation completed! Success: ${result.data.results.success}, Failed: ${result.data.results.failed}, Skipped: ${result.data.results.skipped}`
        );
      } else {
        if (!employeeId) return;
        const result = await generatePayroll({ employeeId, month, year }).unwrap();
        message.success(`Payroll generated successfully! Attendance: ${result.data.attendance.attendancePercentage.toFixed(1)}%`);
      }
      navigate("/payroll/management");
    } catch (error: any) {
      message.error(error?.data?.error?.message || "Failed to generate payroll");
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      maximumFractionDigits: 0
    }).format(amount);
  };

  const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

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
        <div className="mx-auto max-w-6xl space-y-6">
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
                      {previewData.employee.name} ({previewData.employee.employeeId})
                    </p>
                  </div>
                )}
              </div>
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
                      <p className="text-sm text-muted-foreground">Gross Salary</p>
                      <p className="text-xl font-bold text-green-600">
                        ₹{formatCurrency(previewData.grossSalary)}
                      </p>
                    </div>
                    <div className="p-4 border rounded-lg">
                      <p className="text-sm text-muted-foreground">Deductions</p>
                      <p className="text-xl font-bold text-red-600">
                        ₹{formatCurrency(previewData.deductions)}
                      </p>
                    </div>
                    <div className="p-4 border rounded-lg bg-primary/5">
                      <p className="text-sm text-muted-foreground">Net Pay</p>
                      <p className="text-xl font-bold text-primary">
                        ₹{formatCurrency(previewData.netPay)}
                      </p>
                    </div>
                  </div>

                  <Separator />

                  {/* Attendance Info */}
                  <div>
                    <h3 className="font-semibold text-lg mb-4">Attendance Information</h3>
                    <div className="grid grid-cols-3 gap-4">
                      <div>
                        <p className="text-sm text-muted-foreground">Working Days</p>
                        <p className="text-lg font-semibold">{previewData.attendance.workingDays}</p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Present Days</p>
                        <p className="text-lg font-semibold">{previewData.attendance.presentDays}</p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Attendance %</p>
                        <p className="text-lg font-semibold">
                          {previewData.attendance.attendancePercentage.toFixed(1)}%
                        </p>
                      </div>
                    </div>
                  </div>

                  <Separator />

                  {/* Components */}
                  <div>
                    <h3 className="font-semibold text-lg mb-4">Salary Components</h3>
                    <div className="space-y-2">
                      {previewData.components?.map((comp: any, idx: number) => (
                        <div
                          key={idx}
                          className="flex items-center justify-between p-3 border rounded-lg"
                        >
                          <div className="flex items-center gap-3">
                            <Badge
                              variant={comp.type === "earning" ? "default" : "destructive"}
                              className="text-xs"
                            >
                              {comp.type}
                            </Badge>
                            <span className="font-medium">{comp.name}</span>
                          </div>
                          <span
                            className={`font-semibold ${
                              comp.type === "earning" ? "text-green-600" : "text-red-600"
                            }`}
                          >
                            {comp.type === "earning" ? "+" : "-"} ₹{formatCurrency(comp.amount)}
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
                      <p className="text-sm text-muted-foreground">Total Employees</p>
                      <p className="text-2xl font-bold">{previewData.summary.totalEmployees}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Total Gross</p>
                      <p className="text-2xl font-bold text-green-600">
                        ₹{formatCurrency(previewData.summary.totalGross)}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Total Deductions</p>
                      <p className="text-2xl font-bold text-red-600">
                        ₹{formatCurrency(previewData.summary.totalDeductions)}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Total Net Pay</p>
                      <p className="text-2xl font-bold text-primary">
                        ₹{formatCurrency(previewData.summary.totalNetPay)}
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
                        <div key={idx} className="flex items-start gap-2 text-sm text-yellow-800">
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
                                  {preview.employee.employeeId} • {preview.employee.designation || "N/A"}
                                </p>
                              </div>
                              <div className="text-right">
                                <p className="text-sm text-muted-foreground">Net Pay</p>
                                <p className="text-xl font-bold text-primary">
                                  ₹{formatCurrency(preview.netPay)}
                                </p>
                              </div>
                            </div>

                            {/* Summary */}
                            <div className="grid grid-cols-3 gap-4">
                              <div>
                                <p className="text-sm text-muted-foreground">Gross</p>
                                <p className="font-semibold text-green-600">
                                  ₹{formatCurrency(preview.grossSalary)}
                                </p>
                              </div>
                              <div>
                                <p className="text-sm text-muted-foreground">Deductions</p>
                                <p className="font-semibold text-red-600">
                                  ₹{formatCurrency(preview.deductions)}
                                </p>
                              </div>
                              <div>
                                <p className="text-sm text-muted-foreground">Attendance</p>
                                <p className="font-semibold">
                                  {preview.attendance.attendancePercentage.toFixed(1)}%
                                </p>
                              </div>
                            </div>

                            {/* Components (Collapsible) */}
                            <details className="mt-2">
                              <summary className="cursor-pointer text-sm font-medium text-muted-foreground hover:text-foreground">
                                View Components ({preview.components?.length || 0})
                              </summary>
                              <div className="mt-3 space-y-2">
                                {preview.components?.map((comp: any, compIdx: number) => (
                                  <div
                                    key={compIdx}
                                    className="flex items-center justify-between p-2 border rounded text-sm"
                                  >
                                    <div className="flex items-center gap-2">
                                      <Badge
                                        variant={comp.type === "earning" ? "default" : "destructive"}
                                        className="text-xs"
                                      >
                                        {comp.type}
                                      </Badge>
                                      <span>{comp.name}</span>
                                    </div>
                                    <span
                                      className={`font-semibold ${
                                        comp.type === "earning" ? "text-green-600" : "text-red-600"
                                      }`}
                                    >
                                      {comp.type === "earning" ? "+" : "-"} ₹{formatCurrency(comp.amount)}
                                    </span>
                                  </div>
                                ))}
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
                  Please review the payroll details above. Once you confirm, the payroll will be generated and cannot be undone.
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
